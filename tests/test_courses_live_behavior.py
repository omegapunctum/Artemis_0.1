import json
import subprocess
import textwrap
import unittest


class CoursesLiveBehaviorTests(unittest.TestCase):
    def run_node_json(self, script: str):
        result = subprocess.run(
            ["node", "--input-type=module", "-e", script],
            capture_output=True,
            text=True,
            check=True,
        )
        return json.loads(result.stdout.strip())

    def test_load_courses_returns_courses_and_uses_cache(self):
        script = textwrap.dedent(
            """
            globalThis.window = { setTimeout, clearTimeout };
            globalThis.document = { getElementById: () => null };
            globalThis.__fetchCount = 0;
            globalThis.fetch = async () => {
              globalThis.__fetchCount += 1;
              return {
                ok: true,
                status: 200,
                headers: { get: () => null },
                json: async () => ({
                  courses: [
                    { id: 'c1', title: 'Course 1', steps: [{ feature_id: 'f1' }] },
                    { id: 'c2', title: 'Course 2', steps: [] }
                  ]
                })
              };
            };

            const { loadCourses } = await import('./js/data.js');
            const first = await loadCourses();
            const second = await loadCourses();

            console.log(JSON.stringify({
              firstCount: first.courses.length,
              secondCount: second.courses.length,
              firstCourseKeys: Object.keys(first.courses[0]).sort(),
              fetchCount: globalThis.__fetchCount
            }));
            """
        )
        data = self.run_node_json(script)
        self.assertEqual(data["firstCount"], 2)
        self.assertEqual(data["secondCount"], 2)
        self.assertIn("id", data["firstCourseKeys"])
        self.assertIn("title", data["firstCourseKeys"])
        self.assertIn("steps", data["firstCourseKeys"])
        self.assertEqual(data["fetchCount"], 1, "loadCourses should use in-memory cache for repeated calls")

    def test_courses_state_select_and_step_boundaries(self):
        script = textwrap.dedent(
            """
            const { createCoursesState, selectCourse, moveCourseStep } = await import('./js/state.js');
            const state = createCoursesState([
              { id: 'course-a', steps: [{}, {}, {}] },
              { id: 'course-b', steps: [{}] }
            ]);

            selectCourse(state, 'course-a');
            moveCourseStep(state, +1);
            moveCourseStep(state, +1);
            moveCourseStep(state, +1); // clamp at upper bound
            const afterForward = state.selectedCourseStepIndex;

            moveCourseStep(state, -1);
            moveCourseStep(state, -1);
            moveCourseStep(state, -1); // clamp at lower bound
            const afterBackward = state.selectedCourseStepIndex;

            selectCourse(state, 'course-b');
            const switchedCourse = state.selectedCourseId;
            const switchedStep = state.selectedCourseStepIndex;

            console.log(JSON.stringify({ afterForward, afterBackward, switchedCourse, switchedStep }));
            """
        )
        data = self.run_node_json(script)
        self.assertEqual(data["afterForward"], 2)
        self.assertEqual(data["afterBackward"], 0)
        self.assertEqual(data["switchedCourse"], "course-b")
        self.assertEqual(data["switchedStep"], 0)

    def test_live_recent_features_order_and_limit(self):
        script = textwrap.dedent(
            """
            globalThis.window = { setTimeout, clearTimeout };
            globalThis.document = { getElementById: () => null };
            const { getRecentFeatures } = await import('./js/data.js');

            const fc = {
              type: 'FeatureCollection',
              features: [
                { properties: { name_ru: 'from-date-start', date_start: '2001' } },
                { properties: { name_ru: 'from-updated', updated_at: '2024-01-02T00:00:00Z' } },
                { properties: { name_ru: 'from-created-old', created_at: '2024-01-01T00:00:00Z' } },
                { properties: { name_ru: 'from-created-new', created_at: '2025-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' } },
                { properties: { name_ru: 'undated' } }
              ]
            };

            const top3 = getRecentFeatures(3, fc).map((f) => f.properties.name_ru);
            const repeatTop3 = getRecentFeatures(3, fc).map((f) => f.properties.name_ru);

            console.log(JSON.stringify({ top3, repeatTop3, sameOrder: JSON.stringify(top3) === JSON.stringify(repeatTop3) }));
            """
        )
        data = self.run_node_json(script)
        self.assertEqual(len(data["top3"]), 3)
        self.assertEqual(data["top3"][0], "from-created-new")
        self.assertEqual(data["top3"][1], "from-updated")
        self.assertEqual(data["top3"][2], "from-created-old")
        self.assertTrue(data["sameOrder"], "Same input must produce stable recent ordering")


if __name__ == "__main__":
    unittest.main()
