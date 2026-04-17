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
        self.assertEqual(data["featureCount"], 2)


if __name__ == "__main__":
    unittest.main()
