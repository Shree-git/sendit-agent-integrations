import importlib.util
import json
import pathlib
import subprocess
import sys
import unittest

SCRIPT = pathlib.Path(__file__).resolve().parents[1] / 'scripts' / 'grok_api.py'
spec = importlib.util.spec_from_file_location('grok_api', SCRIPT)
api = importlib.util.module_from_spec(spec)
spec.loader.exec_module(api)

class GrokContractTests(unittest.TestCase):
    def test_responses_contract_and_read_only_defaults(self):
        request = api.build_request('List accounts', 'sk_live_fixture')
        self.assertEqual(request['tools'][0]['type'], 'mcp')
        self.assertEqual(request['tools'][0]['server_url'], api.DEFAULT_MCP_URL)
        self.assertEqual(request['tools'][0]['allowed_tools'], list(api.READ_ONLY_TOOLS))
        self.assertNotIn('require_approval', request['tools'][0])
        self.assertNotIn('mcp_servers', request)

    def test_write_scope_requires_explicit_authorization(self):
        with self.assertRaises(ValueError):
            api.build_request('Publish', 'key', write_tools=('publish_content',))
        with self.assertRaises(ValueError):
            api.build_request('Delete', 'key', write_tools=('delete_post',), approve_writes=True)
        request = api.build_request('Publish', 'key', write_tools=('publish_content',), approve_writes=True)
        self.assertIn('publish_content', request['tools'][0]['allowed_tools'])

    def test_public_urls_and_credentials(self):
        for url in ('http://example.com/mcp', 'https://localhost/mcp', 'https://127.0.0.1/mcp', 'https://10.1.1.1/mcp', 'https://example.com/mcp?key=secret'):
            with self.assertRaises(ValueError): api.validate_mcp_url(url)
        with self.assertRaises(ValueError): api.build_request('List', 'bad\r\nkey')

    def test_dry_run_redacts_without_changing_request(self):
        request = api.build_request('List', 'secret')
        self.assertNotIn('secret', json.dumps(api.redact_request(request)))
        self.assertIn('secret', json.dumps(request))
        result = subprocess.run([sys.executable, str(SCRIPT), '--dry-run'], text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout)['tools'][0]['allowed_tools'], list(api.READ_ONLY_TOOLS))

    def test_smoke_needs_tool_evidence_and_rejects_failure(self):
        with self.assertRaises(RuntimeError): api.verify_smoke({'output': [{'type': 'message'}]})
        call = {'type': 'mcp_call', 'name': 'list_connected_accounts', 'output': {'content': [{'type': 'text', 'text': '{"success":true,"accounts":[]}'}]}}
        api.verify_smoke({'output': [call]})
        for output in ({'isError': True}, {'success': False}, {'content': [{'type': 'text', 'text': '{"success":false}'}]}):
            with self.assertRaises(RuntimeError): api.verify_smoke({'output': [{**call, 'output': output}]})
        with self.assertRaises(RuntimeError): api.verify_smoke({'output': [call, {**call, 'name': 'publish_content'}]})

    def test_plugin_manifest_assets_and_oauth_endpoint_exist(self):
        root = SCRIPT.parents[1]
        manifest = json.loads((root / '.cursor-plugin' / 'plugin.json').read_text())
        self.assertTrue((root / manifest['logo']).is_file())
        mcp = json.loads((root / 'mcp.json').read_text())
        self.assertEqual(mcp['mcpServers']['sendit']['url'], api.DEFAULT_MCP_URL)
        self.assertNotIn('headers', mcp['mcpServers']['sendit'])

if __name__ == '__main__': unittest.main()
