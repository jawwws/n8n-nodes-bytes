# Jawwws Bytes for n8n

Community node for Jawwws Bytes.

## Setup

Create an API key under **Workspace Settings > Developer API** in Bytes and
add it as a **Jawwws Bytes API** credential in n8n.

Once published, install `@jawwws/n8n-nodes-bytes` using the Community Nodes
settings in a supported self-hosted n8n instance.

## Operations

- Links: create, find, get, list, update, archive, add/remove tag and get QR.
- Tags: list.
- Activity Groups: list and resolve.

QR files are available as PNG, SVG or PDF.

## Development

```sh
npm ci
npm run check
npm audit --omit=dev
npm pack --dry-run
```

## Documentation

- [Bytes Developer API](https://developer.jaww.ws/developer-api/)
- [Bytes](https://bytes.jawwws.com/)

## Licence

MIT. See [LICENSE.md](LICENSE.md).
