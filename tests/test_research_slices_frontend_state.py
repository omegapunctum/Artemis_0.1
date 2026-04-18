import json
import subprocess
import textwrap
import unittest


class ResearchSlicesFrontendStateTests(unittest.TestCase):
    def run_node_json(self, script: str):
        result = subprocess.run(
            ["node", "--input-type=module", "-e", script],
            capture_output=True,
            text=True,
            check=True,
        )
        return json.loads(result.stdout.strip())

    def test_build_research_slice_payload_from_runtime_context(self):
        script = textwrap.dedent(
            """
            globalThis.window = {
              location: { hostname: 'localhost' },
              ARTEMIS_API_BASE: '/api',
              dispatchEvent: () => {},
              addEventListener: () => {},
              setTimeout,
              clearTimeout,
            };
            globalThis.document = { querySelector: () => null };
            globalThis.CustomEvent = class { constructor(name, options) { this.name = name; this.detail = options?.detail; } };

            const { buildResearchSlicePayload } = await import('./js/research_slices.js');

            const payload = buildResearchSlicePayload({
              title: '  Slice A  ',
              description: '  Context  ',
              selectedFeatureId: 'recA',
              timeRange: { start: 1500, end: 1700, mode: 'range' },
              map: {
                getCenter: () => ({ lng: 12.5, lat: 41.9 }),
                getZoom: () => 6.2,
              },
              enabledLayerIds: ['renaissance_italy', 'renaissance_italy', 'baroque_monarchies'],
              activeQuickLayerIds: ['renaissance_italy']
            });

            console.log(JSON.stringify(payload));
            """
        )
        data = self.run_node_json(script)

        self.assertEqual(data["title"], "Slice A")
        self.assertEqual(data["description"], "Context")
        self.assertEqual(data["feature_refs"], [{"feature_id": "recA"}])
        self.assertEqual(data["time_range"], {"start": 1500, "end": 1700, "mode": "range"})
        self.assertEqual(data["view_state"]["center"], [12.5, 41.9])
        self.assertEqual(data["view_state"]["selected_feature_id"], "recA")
        self.assertEqual(data["view_state"]["enabled_layer_ids"], ["renaissance_italy", "baroque_monarchies"])
        self.assertEqual(data["annotations"], [])

    def test_build_research_slice_payload_with_multi_feature_selection(self):
        script = textwrap.dedent(
            """
            globalThis.window = {
              location: { hostname: 'localhost' },
              ARTEMIS_API_BASE: '/api',
              dispatchEvent: () => {},
              addEventListener: () => {},
              setTimeout,
              clearTimeout,
            };
            globalThis.document = { querySelector: () => null };
            globalThis.CustomEvent = class { constructor(name, options) { this.name = name; this.detail = options?.detail; } };

            const { buildResearchSlicePayload } = await import('./js/research_slices.js');

            const payload = buildResearchSlicePayload({
              title: 'Slice Multi',
              description: '',
              selectedFeatureId: 'recB',
              selectedFeatureIds: ['recA', 'recB', 'recA', '  ', null],
              timeRange: { start: 1500, end: 1700, mode: 'range' },
              map: {
                getCenter: () => ({ lng: 12.5, lat: 41.9 }),
                getZoom: () => 6.2,
              }
            });

            console.log(JSON.stringify(payload));
            """
        )
        data = self.run_node_json(script)

        self.assertEqual(data["feature_refs"], [{"feature_id": "recA"}, {"feature_id": "recB"}])
        self.assertEqual(data["view_state"]["selected_feature_id"], "recB")
        self.assertEqual(data["annotations"], [])

    def test_build_research_slice_payload_with_inline_annotations(self):
        script = textwrap.dedent(
            """
            globalThis.window = {
              location: { hostname: 'localhost' },
              ARTEMIS_API_BASE: '/api',
              dispatchEvent: () => {},
              addEventListener: () => {},
              setTimeout,
              clearTimeout,
            };
            globalThis.document = { querySelector: () => null };
            globalThis.CustomEvent = class { constructor(name, options) { this.name = name; this.detail = options?.detail; } };

            const { buildResearchSlicePayload } = await import('./js/research_slices.js');

            const payload = buildResearchSlicePayload({
              title: 'Slice Annotations',
              selectedFeatureId: 'recA',
              timeRange: { start: 1500, end: 1700, mode: 'range' },
              map: {
                getCenter: () => ({ lng: 12.5, lat: 41.9 }),
                getZoom: () => 6.2,
              },
              annotationInputs: {
                fact: '  known fact  ',
                interpretation: '   ',
                hypothesis: ' possible relation '
              }
            });

            console.log(JSON.stringify(payload));
            """
        )
        data = self.run_node_json(script)

        self.assertEqual(len(data["annotations"]), 2)
        self.assertEqual(data["annotations"][0]["type"], "fact")
        self.assertEqual(data["annotations"][0]["text"], "known fact")
        self.assertTrue(data["annotations"][0]["id"].startswith("ann-"))
        self.assertEqual(data["annotations"][1]["type"], "hypothesis")
        self.assertEqual(data["annotations"][1]["text"], "possible relation")
        self.assertNotIn("feature_id", data["annotations"][0])

    def test_normalize_slice_for_restore(self):
        script = textwrap.dedent(
            """
            globalThis.window = {
              location: { hostname: 'localhost' },
              ARTEMIS_API_BASE: '/api',
              dispatchEvent: () => {},
              addEventListener: () => {},
              setTimeout,
              clearTimeout,
            };
            globalThis.document = { querySelector: () => null };
            globalThis.CustomEvent = class { constructor(name, options) { this.name = name; this.detail = options?.detail; } };

            const { normalizeSliceForRestore } = await import('./js/research_slices.js');

            const normalized = normalizeSliceForRestore({
              id: 'slice-1',
              title: 'Slice',
              feature_refs: [{ feature_id: 'recA' }, { feature_id: 'recB' }],
              time_range: { start: 1600, end: 1650, mode: 'point' },
              view_state: {
                center: [10, 20],
                zoom: 8,
                enabled_layer_ids: ['a', 'b'],
                active_quick_layer_ids: ['a'],
                selected_feature_id: 'recA'
              }
            });

            console.log(JSON.stringify(normalized));
            """
        )
        data = self.run_node_json(script)

        self.assertEqual(data["id"], "slice-1")
        self.assertEqual(data["mode"], "point")
        self.assertEqual(data["start"], 1600)
        self.assertEqual(data["end"], 1650)
        self.assertEqual(data["center"], [10, 20])
        self.assertEqual(data["zoom"], 8)
        self.assertEqual(data["selectedFeatureId"], "recA")
        self.assertEqual(data["featureIds"], ["recA", "recB"])
        self.assertEqual(data["featureCount"], 2)

    def test_normalize_slice_for_restore_backward_compat_single_feature(self):
        script = textwrap.dedent(
            """
            globalThis.window = {
              location: { hostname: 'localhost' },
              ARTEMIS_API_BASE: '/api',
              dispatchEvent: () => {},
              addEventListener: () => {},
              setTimeout,
              clearTimeout,
            };
            globalThis.document = { querySelector: () => null };
            globalThis.CustomEvent = class { constructor(name, options) { this.name = name; this.detail = options?.detail; } };

            const { normalizeSliceForRestore } = await import('./js/research_slices.js');

            const normalized = normalizeSliceForRestore({
              id: 'slice-legacy',
              title: 'Legacy',
              feature_refs: [{ feature_id: 'recLegacy' }],
              time_range: { start: 1600, end: 1650, mode: 'range' },
              view_state: {
                center: [10, 20],
                zoom: 8
              }
            });

            console.log(JSON.stringify(normalized));
            """
        )
        data = self.run_node_json(script)
        self.assertEqual(data["featureIds"], ["recLegacy"])
        self.assertEqual(data["selectedFeatureId"], "recLegacy")

    def test_build_slice_annotation_display_plan_grouping(self):
        script = textwrap.dedent(
            """
            globalThis.window = {
              location: { hostname: 'localhost' },
              ARTEMIS_API_BASE: '/api',
              dispatchEvent: () => {},
              addEventListener: () => {},
              setTimeout,
              clearTimeout,
            };
            globalThis.document = { querySelector: () => null };
            globalThis.CustomEvent = class { constructor(name, options) { this.name = name; this.detail = options?.detail; } };

            const { buildSliceAnnotationDisplayPlan } = await import('./js/research_slices.js');
            const plan = buildSliceAnnotationDisplayPlan({
              annotations: [
                { id: '1', type: 'fact', text: 'Fact A' },
                { id: '2', type: 'interpretation', text: 'Interpretation A' },
                { id: '3', type: 'hypothesis', text: 'Hypothesis A' }
              ]
            });
            console.log(JSON.stringify(plan));
            """
        )
        data = self.run_node_json(script)
        self.assertEqual(data["count"], 3)
        self.assertEqual([group["type"] for group in data["groups"]], ["fact", "interpretation", "hypothesis"])

    def test_build_slice_annotation_display_plan_filters_empty_and_invalid(self):
        script = textwrap.dedent(
            """
            globalThis.window = {
              location: { hostname: 'localhost' },
              ARTEMIS_API_BASE: '/api',
              dispatchEvent: () => {},
              addEventListener: () => {},
              setTimeout,
              clearTimeout,
            };
            globalThis.document = { querySelector: () => null };
            globalThis.CustomEvent = class { constructor(name, options) { this.name = name; this.detail = options?.detail; } };

            const { buildSliceAnnotationDisplayPlan } = await import('./js/research_slices.js');
            const plan = buildSliceAnnotationDisplayPlan({
              annotations: [
                { id: '1', type: 'fact', text: '   ' },
                { id: '2', type: 'unknown', text: 'Unknown' },
                { id: '3', type: 'hypothesis', text: '  H1  ' }
              ]
            });
            console.log(JSON.stringify(plan));
            """
        )
        data = self.run_node_json(script)
        self.assertEqual(data["count"], 1)
        self.assertEqual(len(data["groups"]), 1)
        self.assertEqual(data["groups"][0]["type"], "hypothesis")
        self.assertEqual(data["groups"][0]["items"][0]["text"], "H1")

    def test_build_slice_list_meta_summary_full(self):
        script = textwrap.dedent(
            """
            globalThis.window = {
              location: { hostname: 'localhost' },
              ARTEMIS_API_BASE: '/api',
              dispatchEvent: () => {},
              addEventListener: () => {},
              setTimeout,
              clearTimeout,
            };
            globalThis.document = { querySelector: () => null };
            globalThis.CustomEvent = class { constructor(name, options) { this.name = name; this.detail = options?.detail; } };

            const { buildSliceListMetaSummary } = await import('./js/research_slices.js');
            const summary = buildSliceListMetaSummary({
              feature_count: 3,
              annotation_count: 2,
              time_range: { start: 1600, end: 1650, mode: 'range' },
              updated_at: '2026-04-17T12:00:00Z'
            });
            console.log(JSON.stringify({ summary }));
            """
        )
        data = self.run_node_json(script)
        self.assertEqual(data["summary"], "3 объектов · ann: 2 · 1600–1650 · 2026-04-17")

    def test_build_slice_list_meta_summary_fallbacks(self):
        script = textwrap.dedent(
            """
            globalThis.window = {
              location: { hostname: 'localhost' },
              ARTEMIS_API_BASE: '/api',
              dispatchEvent: () => {},
              addEventListener: () => {},
              setTimeout,
              clearTimeout,
            };
            globalThis.document = { querySelector: () => null };
            globalThis.CustomEvent = class { constructor(name, options) { this.name = name; this.detail = options?.detail; } };

            const { buildSliceListMetaSummary } = await import('./js/research_slices.js');
            const summary = buildSliceListMetaSummary({
              feature_count: null,
              annotation_count: undefined,
              created_at: '2026-04-18T00:00:00Z'
            });
            const emptySummary = buildSliceListMetaSummary({});
            console.log(JSON.stringify({ summary, emptySummary }));
            """
        )
        data = self.run_node_json(script)
        self.assertEqual(data["summary"], "2026-04-18")
        self.assertEqual(data["emptySummary"], "")

    def test_build_story_payload_requires_two_slices(self):
        script = textwrap.dedent(
            """
            globalThis.window = {
              location: { hostname: 'localhost' },
              ARTEMIS_API_BASE: '/api',
              dispatchEvent: () => {},
              addEventListener: () => {},
              setTimeout,
              clearTimeout,
            };
            globalThis.document = { querySelector: () => null };
            globalThis.CustomEvent = class { constructor(name, options) { this.name = name; this.detail = options?.detail; } };

            const { buildStoryPayload } = await import('./js/stories.js');

            let errorMessage = '';
            try {
              buildStoryPayload({ title: 'Story', sliceIds: ['slice-1'] });
            } catch (error) {
              errorMessage = String(error?.message || '');
            }

            const payload = buildStoryPayload({
              title: '  Story A  ',
              description: '  Route  ',
              sliceIds: ['slice-1', 'slice-2', 'slice-1']
            });

            console.log(JSON.stringify({ errorMessage, payload }));
            """
        )
        data = self.run_node_json(script)
        self.assertIn("at least 2 slices", data["errorMessage"])
        self.assertEqual(data["payload"]["title"], "Story A")
        self.assertEqual(data["payload"]["description"], "Route")
        self.assertEqual(data["payload"]["slice_ids"], ["slice-1", "slice-2"])

    def test_story_step_navigation_helpers(self):
        script = textwrap.dedent(
            """
            globalThis.window = {
              location: { hostname: 'localhost' },
              ARTEMIS_API_BASE: '/api',
              dispatchEvent: () => {},
              addEventListener: () => {},
              setTimeout,
              clearTimeout,
            };
            globalThis.document = { querySelector: () => null };
            globalThis.CustomEvent = class { constructor(name, options) { this.name = name; this.detail = options?.detail; } };

            const { clampStoryStepIndex, resolveStoryStepSliceId } = await import('./js/stories.js');
            const story = { slice_ids: ['s1', 's2', 's3'] };

            const clampedNegative = clampStoryStepIndex(story, -2);
            const clampedLarge = clampStoryStepIndex(story, 99);
            const resolvedMid = resolveStoryStepSliceId(story, 1);
            const resolvedLarge = resolveStoryStepSliceId(story, 99);

            console.log(JSON.stringify({ clampedNegative, clampedLarge, resolvedMid, resolvedLarge }));
            """
        )
        data = self.run_node_json(script)
        self.assertEqual(data["clampedNegative"], 0)
        self.assertEqual(data["clampedLarge"], 2)
        self.assertEqual(data["resolvedMid"], "s2")
        self.assertEqual(data["resolvedLarge"], "s3")


    def test_build_course_payload_requires_one_story(self):
        script = textwrap.dedent(
            """
            globalThis.window = {
              location: { hostname: 'localhost' },
              ARTEMIS_API_BASE: '/api',
              dispatchEvent: () => {},
              addEventListener: () => {},
              setTimeout,
              clearTimeout,
            };
            globalThis.document = { querySelector: () => null };
            globalThis.CustomEvent = class { constructor(name, options) { this.name = name; this.detail = options?.detail; } };

            const { buildCoursePayload } = await import('./js/courses_runtime.js');

            let errorMessage = '';
            try {
              buildCoursePayload({ title: 'Course', storyIds: [] });
            } catch (error) {
              errorMessage = String(error?.message || '');
            }

            const payload = buildCoursePayload({
              title: '  Course A  ',
              description: '  Path  ',
              storyIds: ['story-1', 'story-2', 'story-1']
            });

            console.log(JSON.stringify({ errorMessage, payload }));
            """
        )
        data = self.run_node_json(script)
        self.assertIn("at least 1 story", data["errorMessage"])
        self.assertEqual(data["payload"]["title"], "Course A")
        self.assertEqual(data["payload"]["description"], "Path")
        self.assertEqual(data["payload"]["story_ids"], ["story-1", "story-2"])

    def test_course_step_navigation_helpers(self):
        script = textwrap.dedent(
            """
            globalThis.window = {
              location: { hostname: 'localhost' },
              ARTEMIS_API_BASE: '/api',
              dispatchEvent: () => {},
              addEventListener: () => {},
              setTimeout,
              clearTimeout,
            };
            globalThis.document = { querySelector: () => null };
            globalThis.CustomEvent = class { constructor(name, options) { this.name = name; this.detail = options?.detail; } };

            const { clampCourseStepIndex, resolveCourseStepStoryId } = await import('./js/courses_runtime.js');
            const course = { story_ids: ['st1', 'st2', 'st3'] };

            const clampedNegative = clampCourseStepIndex(course, -2);
            const clampedLarge = clampCourseStepIndex(course, 99);
            const resolvedMid = resolveCourseStepStoryId(course, 1);
            const resolvedLarge = resolveCourseStepStoryId(course, 99);

            console.log(JSON.stringify({ clampedNegative, clampedLarge, resolvedMid, resolvedLarge }));
            """
        )
        data = self.run_node_json(script)
        self.assertEqual(data["clampedNegative"], 0)
        self.assertEqual(data["clampedLarge"], 2)
        self.assertEqual(data["resolvedMid"], "st2")
        self.assertEqual(data["resolvedLarge"], "st3")



    def test_build_explain_context_from_runtime(self):
        script = textwrap.dedent(
            """
            globalThis.window = {
              location: { hostname: 'localhost' },
              ARTEMIS_API_BASE: '/api',
              dispatchEvent: () => {},
              addEventListener: () => {},
              setTimeout,
              clearTimeout,
            };
            globalThis.document = { querySelector: () => null };
            globalThis.CustomEvent = class { constructor(name, options) { this.name = name; this.detail = options?.detail; } };

            const { buildExplainContextFromRuntime } = await import('./js/explain_context.js');
            const payload = buildExplainContextFromRuntime({
              scope: 'course',
              courseId: 'c-1',
              storyId: 's-1',
              sliceId: 'sl-1',
              featureIds: ['f1', 'f2', 'f1'],
              timeRange: { start: 1500, end: 1600, mode: 'range' },
              viewState: { center: [10, 20], zoom: 5 },
              annotations: [{ id: 'a1', type: 'fact', text: 'note' }]
            });
            console.log(JSON.stringify(payload));
            """
        )
        data = self.run_node_json(script)
        self.assertEqual(data["scope"], "course")
        self.assertEqual(data["course_id"], "c-1")
        self.assertEqual(data["story_id"], "s-1")
        self.assertEqual(data["slice_id"], "sl-1")
        self.assertEqual(data["feature_ids"], ["f1", "f2"])
        self.assertEqual(data["time_range"]["start"], 1500)



if __name__ == "__main__":
    unittest.main()
