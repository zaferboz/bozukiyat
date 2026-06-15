# Example Songs

Each example is its own JSON file in this folder. The app loads them via `manifest.json`.

## Using them

1. **Run the app from a local static server** — browsers block `fetch()` on `file://` URLs.
   - VS Code **Live Server** extension, or
   - From the project root: `npm run serve` (opens at http://localhost:8765)
2. Open **Compose → Example Songs → Load Example**, or **Scales → Example songs → Open in Compose**.
3. Use **⬆ Import** to load any `.json` file manually, or **⬇ Export** to save your own.

## Adding or editing songs

1. Add or edit a `.json` file in this folder.
2. Run `npm run rebuild-manifest` to refresh `manifest.json` and `js/songs-bundle.js` (or append filenames manually).

The bundled `js/songs-bundle.js` lets examples work even when opening the HTML file directly (`file://`). With a local server, songs load from `songs/*.json` instead.

## Song format

```json
{
  "title": "Song name",
  "group": "Category",
  "scale": "nihavent",
  "root": "A",
  "bpm": 100,
  "clef": "treble",
  "timeSig": { "num": 4, "den": 4 },
  "tracks": [
    {
      "instrument": "piano",
      "strumPattern": "dudu",
      "notes": [
        { "letter": "E", "octave": 4, "value": 4, "acc": 0 }
      ]
    },
    {
      "instrument": "drums",
      "notes": [ { "drum": "kick", "value": 4 } ]
    }
  ]
}
```

- `scale` / `root`: optional — links the song to a scale/makam on the Scales tab.
- `value`: `1` whole, `2` half, `4` quarter, `8` eighth.
- `acc`: `-1` flat, `0` natural, `1` sharp.
- Rest: `{ "rest": true, "value": 4 }`.

## Files

See `manifest.json` for the full list (36+ songs: classical, modes, Turkish makams).
