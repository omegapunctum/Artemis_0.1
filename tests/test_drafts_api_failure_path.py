import json
import subprocess
import textwrap
import unittest


class DraftsApiFailurePathTests(unittest.TestCase):
    def run_node_json(self, script: str):
        result = subprocess.run(
            ["node", "--input-type=module", "-e", script],
            capture_output=True,
            text=True,
            check=True,
        )
        return json.loads(result.stdout.strip())

    def test_request_draft_api_http_error_propagates_without_legacy_fallback(self):
        script = textwrap.dedent(
            """
            import fs from 'node:fs';

            const source = fs.readFileSync('./js/ui.ugc.js', 'utf8');
            const match = source.match(/async function requestDraftApi\\(path, options, fallbackMessage\\) {[\\s\\S]*?\\n}/);
            if (!match) throw new Error('requestDraftApi not found in js/ui.ugc.js');

            const callTrace = [];
            const response = {
              ok: false,
              status: 500,
              json: async () => ({ error: 'server exploded', request_id: 'rid-500' })
            };

            const fetchWithAuth = async (path, options) => {
              callTrace.push({ type: 'fetchWithAuth', path, method: options?.method || 'GET' });
              return response;
            };

            const buildApiError = async (resp, fallbackMessage) => {
              callTrace.push({ type: 'buildApiError', fallbackMessage, status: resp.status });
              const err = new Error('server exploded (Request ID: rid-500)');
              err.status = resp.status;
              err.payload = await resp.json();
              err.fromBuildApiError = true;
              return err;
            };

            const requestDraftApi = new Function(
              'fetchWithAuth',
              'buildApiError',
              `${match[0]}\\nreturn requestDraftApi;`
            )(fetchWithAuth, buildApiError);

            let thrown = null;
            try {
              await requestDraftApi('/api/drafts/my', { method: 'GET' }, 'Failed to load drafts.');
            } catch (error) {
              thrown = {
                message: error.message,
                status: error.status,
                payload: error.payload,
                fromBuildApiError: Boolean(error.fromBuildApiError)
              };
            }

            const fetchCalls = callTrace.filter((item) => item.type === 'fetchWithAuth');
            const triedLegacy = fetchCalls.some((item) => /^\\/drafts(\\/|$)/.test(String(item.path)));

            console.log(JSON.stringify({
              callTrace,
              fetchCallCount: fetchCalls.length,
              triedLegacy,
              thrown
            }));
            """
        )

        data = self.run_node_json(script)
        self.assertEqual(data["fetchCallCount"], 1, "requestDraftApi should perform exactly one call on error")
        self.assertFalse(data["triedLegacy"], "legacy /drafts/* fallback must not be attempted")
        self.assertTrue(data["thrown"]["fromBuildApiError"], "error must come from buildApiError pipeline")
        self.assertEqual(data["thrown"]["status"], 500, "HTTP status must be preserved")
        self.assertEqual(data["thrown"]["payload"], {"error": "server exploded", "request_id": "rid-500"})

    def test_request_draft_api_network_error_bubbles_without_retry_or_path_fallback(self):
        script = textwrap.dedent(
            """
            import fs from 'node:fs';

            const source = fs.readFileSync('./js/ui.ugc.js', 'utf8');
            const match = source.match(/async function requestDraftApi\\(path, options, fallbackMessage\\) {[\\s\\S]*?\\n}/);
            if (!match) throw new Error('requestDraftApi not found in js/ui.ugc.js');

            const callTrace = [];
            const networkError = new Error('Network down');
            networkError.code = 'ECONNRESET';

            const fetchWithAuth = async (path, options) => {
              callTrace.push({ type: 'fetchWithAuth', path, method: options?.method || 'GET' });
              throw networkError;
            };

            const buildApiError = async () => {
              callTrace.push({ type: 'buildApiError' });
              throw new Error('buildApiError must not be called for raw network failures');
            };

            const requestDraftApi = new Function(
              'fetchWithAuth',
              'buildApiError',
              `${match[0]}\\nreturn requestDraftApi;`
            )(fetchWithAuth, buildApiError);

            let thrown = null;
            try {
              await requestDraftApi('/api/drafts/42', { method: 'DELETE' }, 'Failed to delete draft.');
            } catch (error) {
              thrown = { message: error.message, code: error.code };
            }

            const fetchCalls = callTrace.filter((item) => item.type === 'fetchWithAuth');
            const buildApiErrorCalls = callTrace.filter((item) => item.type === 'buildApiError');
            const triedLegacy = fetchCalls.some((item) => /^\\/drafts(\\/|$)/.test(String(item.path)));

            console.log(JSON.stringify({
              fetchCallCount: fetchCalls.length,
              buildApiErrorCallCount: buildApiErrorCalls.length,
              triedLegacy,
              thrown
            }));
            """
        )

        data = self.run_node_json(script)
        self.assertEqual(data["fetchCallCount"], 1, "network failure should not trigger retries")
        self.assertEqual(data["buildApiErrorCallCount"], 0, "network throw should bubble unchanged")
        self.assertFalse(data["triedLegacy"], "legacy /drafts/* fallback must not be attempted")
        self.assertEqual(data["thrown"]["message"], "Network down")
        self.assertEqual(data["thrown"]["code"], "ECONNRESET")


if __name__ == "__main__":
    unittest.main()
