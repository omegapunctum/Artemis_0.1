import os
import unittest

from fastapi import HTTPException
from pathlib import Path
from unittest.mock import patch

DB_PATH = Path('artemis_auth.db')
if DB_PATH.exists():
    DB_PATH.unlink()

os.environ.setdefault('MODERATOR_EMAILS', 'moderator@example.com,moderator2@example.com')
os.environ.setdefault('AIRTABLE_TOKEN', 'test-token')
os.environ.setdefault('AIRTABLE_BASE', 'base123')
os.environ.setdefault('AIRTABLE_TABLE', 'Features')

from app.auth.service import SessionLocal, User, init_db as init_auth_db  # noqa: E402
from app.drafts.schemas import DraftResponse  # noqa: E402
from app.drafts.service import Draft, create_draft, get_user_draft, init_db as init_drafts_db  # noqa: E402
from app.moderation.service import (  # noqa: E402
    PUBLISH_STATUS_FAILED,
    PUBLISH_STATUS_PUBLISHED,
    approve_draft,
    build_airtable_fields,
    is_moderator,
    list_review_drafts,
    reject_draft,
    submit_draft_for_review,
)

init_auth_db()
init_drafts_db()


class ModerationFlowTests(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()

    def tearDown(self):
        self.db.close()
        cleanup = SessionLocal()
        try:
            cleanup.query(Draft).delete()
            cleanup.query(User).delete()
            cleanup.commit()
        finally:
            cleanup.close()

    def make_user(self, email: str, is_admin: bool = False) -> User:
        user = User(email=email, password_hash='hash', is_admin=is_admin)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def test_submit_queue_approve_flow(self):
        user = self.make_user('user@example.com')
        moderator = self.make_user('moderator@example.com')

        draft = create_draft(
            self.db,
            user,
            'Test point',
            'UGC draft',
            {'type': 'Point', 'coordinates': [37.6173, 55.7558]},
        )
        self.assertEqual(draft.status, 'draft')

        draft = submit_draft_for_review(self.db, get_user_draft(self.db, draft.id, user))
        self.assertEqual(draft.status, 'review')
        self.assertTrue(is_moderator(moderator))

        queue = list_review_drafts(self.db)
        self.assertEqual([item.id for item in queue], [draft.id])

        with patch('app.moderation.service.find_existing_airtable_feature', return_value=None), patch(
            'app.moderation.service.create_airtable_feature'
        ) as create_airtable_mock:
            create_airtable_mock.return_value = {'id': 'rec123'}
            draft = approve_draft(self.db, draft)

        self.assertEqual(draft.status, 'approved')
        self.assertEqual(draft.publish_status, PUBLISH_STATUS_PUBLISHED)
        self.assertEqual(draft.airtable_record_id, 'rec123')
        payload = build_airtable_fields(draft)
        self.assertEqual(payload['name_ru'], 'Test point')
        self.assertEqual(payload['source_url'], 'UGC')
        self.assertEqual(payload['source_license'], 'CC BY')
        self.assertEqual(payload['longitude'], 37.6173)
        self.assertEqual(payload['latitude'], 55.7558)
        self.assertEqual(payload['external_id'], f'draft:{draft.id}')

        with patch('app.moderation.service.create_airtable_feature') as create_airtable_mock:
            approved_again = approve_draft(self.db, draft)

        self.assertEqual(approved_again.id, draft.id)
        self.assertEqual(approved_again.airtable_record_id, 'rec123')
        create_airtable_mock.assert_not_called()

    def test_approve_uses_existing_airtable_record_without_duplicate_publish(self):
        user = self.make_user('existing@example.com')
        draft = create_draft(self.db, user, 'Existing', 'Desc', None)
        draft = submit_draft_for_review(self.db, draft)
        result_context = {}

        with patch('app.moderation.service.find_existing_airtable_feature', return_value={'id': 'rec-existing'}), patch(
            'app.moderation.service.create_airtable_feature'
        ) as create_airtable_mock:
            approved = approve_draft(self.db, draft, result_context=result_context)

        self.assertEqual(approved.status, 'approved')
        self.assertEqual(approved.publish_status, PUBLISH_STATUS_PUBLISHED)
        self.assertEqual(approved.airtable_record_id, 'rec-existing')
        self.assertEqual(result_context['result'], 'published_skipped_duplicate')
        create_airtable_mock.assert_not_called()

    def test_reapprove_already_published_returns_stable_result(self):
        user = self.make_user('stable@example.com')
        draft = create_draft(self.db, user, 'Stable', 'Desc', None)
        draft = submit_draft_for_review(self.db, draft)

        with patch('app.moderation.service.find_existing_airtable_feature', return_value={'id': 'rec-stable'}):
            approved = approve_draft(self.db, draft)

        self.assertEqual(approved.publish_status, PUBLISH_STATUS_PUBLISHED)
        result_context = {}
        approved_again = approve_draft(self.db, approved, result_context=result_context)

        self.assertEqual(approved_again.id, approved.id)
        self.assertEqual(result_context['result'], 'approved_already_published')

    def test_failed_publish_marks_draft_failed_without_approving(self):
        user = self.make_user('failed@example.com')
        draft = create_draft(self.db, user, 'Failure', 'Desc', None)
        draft = submit_draft_for_review(self.db, draft)

        with patch('app.moderation.service.find_existing_airtable_feature', return_value=None), patch(
            'app.moderation.service.create_airtable_feature', side_effect=HTTPException(status_code=502, detail='boom')
        ):
            with self.assertRaises(Exception):
                approve_draft(self.db, draft)

        refreshed = self.db.query(Draft).filter(Draft.id == draft.id).first()
        self.assertEqual(refreshed.status, 'review')
        self.assertEqual(refreshed.publish_status, PUBLISH_STATUS_FAILED)
        self.assertIsNone(refreshed.airtable_record_id)

    def test_reject_requires_review_status(self):
        user = self.make_user('user2@example.com')
        moderator = self.make_user('moderator2@example.com')
        self.assertTrue(is_moderator(moderator))

        draft = create_draft(self.db, user, 'Draft', 'Desc', None)
        with self.assertRaises(Exception):
            reject_draft(self.db, draft)

        draft = submit_draft_for_review(self.db, draft)
        draft = reject_draft(self.db, draft)
        self.assertEqual(draft.status, 'rejected')

    def test_build_airtable_fields_without_point_coordinates(self):
        user = self.make_user('admin@example.com', is_admin=True)
        self.assertTrue(is_moderator(user))

        draft = Draft(
            user_id=user.id,
            title='Area feature',
            description='Polygon draft',
            geometry={'type': 'Polygon', 'coordinates': []},
            image_url='/uploads/example.png',
            status='review',
        )
        payload = build_airtable_fields(draft)
        self.assertIsNone(payload['longitude'])
        self.assertIsNone(payload['latitude'])
        self.assertEqual(payload['image_url'], '/uploads/example.png')
        self.assertEqual(payload['layer_id'], 'ugc')
        self.assertEqual(payload['external_id'], 'draft:None')

    def test_draft_response_schema_includes_status(self):
        payload = DraftResponse.model_validate(
            {
                'id': 1,
                'title': 'Title',
                'description': 'Desc',
                'geometry': None,
                'image_url': None,
                'status': 'draft',
                'publish_status': 'pending',
                'airtable_record_id': None,
                'published_at': None,
                'created_at': '2026-03-22T00:00:00',
                'updated_at': '2026-03-22T00:00:00',
            }
        )
        self.assertEqual(payload.status, 'draft')


if __name__ == '__main__':
    unittest.main()
