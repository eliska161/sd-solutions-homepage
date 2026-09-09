# Device lookup data

## `tac-index.json.gz`

Compact TAC (first 8 digits of IMEI) → `[brand, specs]` index built from
[MoazEb/tac-database](https://github.com/MoazEb/tac-database) (`tac_full.csv`).

Rebuild:

```bash
node scripts/build-tac-index.mjs
```

## Apple supplement

Runtime enrichment for Apple devices uses the npm package
[`ios-device-list`](https://github.com/pbakondy/ios-device-list)
(colors, storage options, identifiers).
