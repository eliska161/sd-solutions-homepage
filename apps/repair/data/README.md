# Device lookup data

## `tac-index.json.gz`

Compact TAC (first 8 digits of IMEI) → `[brand, specs]` index built from
[MoazEb/tac-database](https://github.com/MoazEb/tac-database) (`tac_full.csv`).

Rebuild:

```bash
npm run data:tac
```

## `apple-device-options.json`

Per-generation color + storage options for Apple devices, built from
[pbakondy/ios-device-list](https://github.com/pbakondy/ios-device-list).
Loaded from disk at runtime (no `require('ios-device-list')` in production).

Rebuild:

```bash
npm run data:apple
```
