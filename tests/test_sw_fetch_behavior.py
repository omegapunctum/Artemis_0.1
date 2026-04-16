import json
import subprocess
import textwrap
import unittest


class ServiceWorkerFetchBehaviorTests(unittest.TestCase):
    def run_node_json(self, script: str):
        result = subprocess.run(
            ["node", "--input-type=module", "-e", script],
            capture_output=True,
            text=True,
            check=True,
        )
        output = result.stdout.strip().splitlines()
        return json.loads(output[-1])

    def test_private_and_auth_requests_use_network_only_without_cache_writes(self):
        script = textwrap.dedent(
            """
            import fs from 'node:fs';
            import vm from 'node:vm';

            const listeners = {};
            const metrics = {
              openCalls: 0,
              matchCalls: 0,
              putCalls: 0,
              fetchCalls: []
            };

            const cache = {
              async match() {
                metrics.matchCalls += 1;
                return undefined;
              },
              async put() {
                metrics.putCalls += 1;
              }
            };

            globalThis.caches = {
              async open() {
                metrics.openCalls += 1;
                return cache;
              },
              async match() {
                metrics.matchCalls += 1;
                return undefined;
              },
              async keys() {
                return [];
              },
              async delete() {
                return true;
              }
            };

            globalThis.fetch = async (request) => {
              const url = request instanceof Request ? request.url : String(request);
              metrics.fetchCalls.push(url);
              return new Response(JSON.stringify({ ok: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
              });
            };

            globalThis.self = {
              location: { origin: 'https://example.test' },
              registration: { scope: 'https://example.test/' },
              clients: { claim: async () => {}, matchAll: async () => [] },
              skipWaiting: async () => {},
              addEventListener(type, handler) { listeners[type] = handler; }
            };

            const source = fs.readFileSync('./sw.js', 'utf8');
            vm.runInThisContext(source, { filename: 'sw.js' });

            const fetchHandler = listeners.fetch;
            const runScenario = async (request) => {
              const before = {
                openCalls: metrics.openCalls,
                matchCalls: metrics.matchCalls,
                putCalls: metrics.putCalls,
                fetchCalls: metrics.fetchCalls.length,
              };

              const event = {
                request,
                respondWith(promise) {
                  this.responsePromise = Promise.resolve(promise);
                }
              };

              fetchHandler(event);
              const response = await event.responsePromise;

              return {
                status: response.status,
                openDelta: metrics.openCalls - before.openCalls,
                matchDelta: metrics.matchCalls - before.matchCalls,
                putDelta: metrics.putCalls - before.putCalls,
                fetchDelta: metrics.fetchCalls.length - before.fetchCalls,
              };
            };

            const apiAuth = await runScenario(new Request('https://example.test/api/auth/login'));
            const apiMe = await runScenario(new Request('https://example.test/api/me'));
            const apiDrafts = await runScenario(new Request('https://example.test/api/drafts'));
            const authHeader = await runScenario(new Request('https://example.test/data/features.geojson', {
              headers: { Authorization: 'Bearer token' }
            }));
            const nonGetPrivate = await runScenario(new Request('https://example.test/api/uploads', {
              method: 'POST',
              body: JSON.stringify({ any: true }),
              headers: { 'Content-Type': 'application/json' }
            }));

            console.log(JSON.stringify({ apiAuth, apiMe, apiDrafts, authHeader, nonGetPrivate }));
            """
        )
        data = self.run_node_json(script)

        for key in ("apiAuth", "apiMe", "apiDrafts", "authHeader", "nonGetPrivate"):
            case = data[key]
            self.assertEqual(case["status"], 200)
            self.assertEqual(case["fetchDelta"], 1, f"{key} must use network fetch")
            self.assertEqual(case["openDelta"], 0, f"{key} must bypass cache.open")
            self.assertEqual(case["matchDelta"], 0, f"{key} must bypass cache.match")
            self.assertEqual(case["putDelta"], 0, f"{key} must never write to cache")

    def test_data_no_store_response_is_not_written_to_cache(self):
        script = textwrap.dedent(
            """
            import fs from 'node:fs';
            import vm from 'node:vm';

            const listeners = {};
            const metrics = { putCalls: 0 };

            const cache = {
              async match() {
                return undefined;
              },
              async put() {
                metrics.putCalls += 1;
              }
            };

            globalThis.caches = {
              async open() {
                return cache;
              },
              async match() {
                return undefined;
              },
              async keys() {
                return [];
              },
              async delete() {
                return true;
              }
            };

            globalThis.fetch = async () => {
              return new Response(JSON.stringify({ features: [] }), {
                status: 200,
                headers: {
                  'Content-Type': 'application/json',
                  'Cache-Control': 'no-store, private'
                }
              });
            };

            globalThis.self = {
              location: { origin: 'https://example.test' },
              registration: { scope: 'https://example.test/' },
              clients: { claim: async () => {}, matchAll: async () => [] },
              skipWaiting: async () => {},
              addEventListener(type, handler) { listeners[type] = handler; }
            };

            const source = fs.readFileSync('./sw.js', 'utf8');
            vm.runInThisContext(source, { filename: 'sw.js' });

            const request = new Request('https://example.test/data/features.geojson');
            const event = {
              request,
              respondWith(promise) {
                this.responsePromise = Promise.resolve(promise);
              }
            };

            listeners.fetch(event);
            const response = await event.responsePromise;

            console.log(JSON.stringify({ status: response.status, putCalls: metrics.putCalls }));
            """
        )
        data = self.run_node_json(script)

        self.assertEqual(data["status"], 200)
        self.assertEqual(data["putCalls"], 0, "no-store/private data responses must not be cached")


if __name__ == "__main__":
    unittest.main()
