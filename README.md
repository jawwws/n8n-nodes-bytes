# Jawwws Bytes for n8n

Community node for Jawwws Bytes, a cross-medium engagement measurement platform. Create and manage measurable Links, add Tags, work with Activity Groups, and retrieve governed Link QR files through the supported Bytes Developer API.

**npm:** https://www.npmjs.com/package/@jawwws/n8n-nodes-bytes  
**Source:** https://github.com/jawwws/n8n-nodes-bytes  
**Release:** `0.1.0` (published 25 October 2026)

## Availability

The npm package can be installed as an **unverified community node** in supported self-hosted n8n instances. It has been installed and smoke-tested with the Bytes Developer API. **It is not yet verified by n8n**, and installation on n8n Cloud or verified in-editor discovery is not claimed.

## Install

1. In a supported self-hosted n8n instance, sign in as an owner or administrator.
2. Open **Settings > Community Nodes > Install**.
3. Enter `@jawwws/n8n-nodes-bytes`, review n8n's community-node notice and install.
4. Add the **Jawwws Bytes** node to a workflow.

## Connect your Bytes workspace

1. In [Bytes](https://app.jaww.ws), select a workspace and open **Workspace Settings > Developer API**.
2. Create a workspace API key and copy it when shown.
3. Create a **Jawwws Bytes API** credential in n8n and paste the key into the protected **Workspace API Key** field.
4. Save/test the credential, then choose it from the Jawwws Bytes node.

Never put a key into an ordinary node field, an exported workflow, a screenshot or a log. The credential only accesses its Bytes workspace. Revoke short-lived QA keys when finished.

## Operations

- **Link:** Create, Find, Get, List, Update, Archive, Add Tag, Remove Tag and Get QR.
- **Tag:** List.
- **Activity Group:** List and Resolve by public ID or slug.

Get QR returns the Bytes-governed standard QR as n8n binary output in **PNG, SVG or PDF**. PNG accepts an optional raster-size target; the actual width may differ slightly because complete QR modules are preserved. The returned filename and MIME type are passed to downstream file-aware nodes.

The node uses only the documented public `/api/v1/*` API. It does not use Bytes Admin/session routes or implement native Bytes push triggers. It does not provide Link-click, Analytics or Offline Engagement event triggers, or unrestricted QR styling. Standard Bytes workspace access, plan limits, validation, rate limits and safety rules apply.

## Importable examples

These workflows were imported and exercised in a local self-hosted n8n QA instance using the published `0.1.0` package. Both exports are **inactive** and contain no credentials or pinned execution data.

- [Google Sheets new row to Bytes Link](examples/google-sheets-to-link.json): configure a Google Sheets trigger, select a test spreadsheet with `destination_url` and `title` columns, connect a Bytes credential, and run on test data. Leave polling inactive until deliberately enabled.
- [Existing Bytes Link to QR PNG](examples/link-to-qr-file.json): replace the public Link ID placeholder and connect the Bytes credential. Run manually and use **Get QR > Binary > data**. The optional local file-write node is disabled by default and needs an explicitly writable directory if enabled.

In n8n, create a workflow and use the workflow menu **Import from File**. Do not publish workflows containing real customer data, credentials or execution snapshots.

## Development

The public package source uses n8n's maintained community-node toolchain. From a clean checkout:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run check
npm pack --dry-run --ignore-scripts
```

## Documentation and support

- [Bytes Developer API](https://developer.jaww.ws/developer-api/)
- [Bytes](https://bytes.jawwws.com/)
- [Public source and issues](https://github.com/jawwws/n8n-nodes-bytes)

MIT. See [LICENSE.md](LICENSE.md).
