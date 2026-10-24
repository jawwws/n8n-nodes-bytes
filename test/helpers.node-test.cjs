const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const genericSource = fs.readFileSync(
	path.join(__dirname, '..', 'nodes', 'JawwwsBytes', 'GenericFunctions.ts'),
	'utf8',
);
const nodeSource = fs.readFileSync(
	path.join(__dirname, '..', 'nodes', 'JawwwsBytes', 'JawwwsBytes.node.ts'),
	'utf8',
);
const credentialSource = fs.readFileSync(
	path.join(__dirname, '..', 'credentials', 'JawwwsBytesApi.credentials.ts'),
	'utf8',
);
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));

test('package follows the n8n community naming and dependency boundary', () => {
	assert.match(packageJson.name, /^@jawwws\/n8n-nodes-/);
	assert.ok(packageJson.keywords.includes('n8n-community-node-package'));
	assert.equal(packageJson.license, 'MIT');
	assert.equal(packageJson.dependencies, undefined);
	assert.equal(packageJson.n8n.strict, true);
});

test('credential uses Bearer authentication and never exposes the key in node parameters', () => {
	assert.match(credentialSource, /Authorization: '=Bearer \{\{\$credentials\.apiKey\}\}'/);
	assert.match(credentialSource, /typeOptions: \{ password: true \}/);
	assert.doesNotMatch(nodeSource, /name: 'apiKey'/);
});

test('node uses only the public Bytes Developer API boundary', () => {
	assert.match(genericSource, /https:\/\/api\.jaww\.ws\/api\/v1/);
	assert.doesNotMatch(genericSource + nodeSource, /\/api\/(?!v1)/);
	assert.doesNotMatch(genericSource + nodeSource, /admin|session-auth/i);
});

test('QR retrieval uses governed API binary output instead of generating a QR locally', () => {
	assert.match(nodeSource, /\/links\/\$\{encodeURIComponent\(linkId\)\}\/qr/);
	assert.match(genericSource, /encoding: 'arraybuffer'/);
	assert.match(nodeSource, /prepareBinaryData/);
	assert.doesNotMatch(nodeSource + genericSource, /qrcode|qr-code|canvas|sharp/i);
});

test('v1 deliberately contains no native trigger', () => {
	assert.doesNotMatch(nodeSource, /webhookMethods|trigger\(/);
	assert.equal(packageJson.n8n.nodes.length, 1);
});
