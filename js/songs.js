// Example songs live in songs/*.json (see songs/manifest.json).
// songs-bundle.js is the offline fallback when fetch is unavailable (file://).
// Run from a local static server (npm run serve or Live Server) to load JSON directly.

var EXAMPLE_SONGS = [];
let _loadPromise = null;

function songsBaseUrl() {
  return new URL('songs/', window.location.href);
}

function applyExampleSongs(songs) {
  EXAMPLE_SONGS = songs;
  window.dispatchEvent(new CustomEvent('examplesongsloaded', { detail: { count: songs.length } }));
  return songs;
}

function loadFromBundle() {
  if (typeof SONGS_BUNDLE !== 'undefined' && Array.isArray(SONGS_BUNDLE) && SONGS_BUNDLE.length) {
    return Promise.resolve(SONGS_BUNDLE.slice());
  }
  return Promise.resolve([]);
}

function loadFromServer() {
  const base = songsBaseUrl();
  return fetch(new URL('manifest.json', base))
    .then((r) => {
      if (!r.ok) throw new Error(`manifest ${r.status}`);
      return r.json();
    })
    .then((manifest) => {
      const files = manifest.files || [];
      return Promise.allSettled(
        files.map((file) =>
          fetch(new URL(encodeURI(file), base)).then((res) => {
            if (!res.ok) throw new Error(`${file} ${res.status}`);
            return res.json();
          })
        )
      ).then((results) => {
        const songs = [];
        results.forEach((result, i) => {
          if (result.status === 'fulfilled') songs.push(result.value);
          else console.warn('Skipped example song:', files[i], result.reason);
        });
        if (!songs.length) throw new Error('no songs loaded from server');
        return songs;
      });
    });
}

function loadExampleSongs() {
  if (_loadPromise) return _loadPromise;
  _loadPromise = loadFromServer()
    .catch((err) => {
      console.warn('Could not load example songs from songs/ — using bundled fallback:', err);
      return loadFromBundle();
    })
    .then((songs) => {
      if (!songs.length) {
        console.warn('No example songs available. Use Live Server or npm run serve.');
      }
      return applyExampleSongs(songs);
    });
  return _loadPromise;
}

function songsForScale(scaleKey) {
  return EXAMPLE_SONGS.filter((s) => {
    if (!s.scale) return false;
    if (Array.isArray(s.scale)) return s.scale.includes(scaleKey);
    return s.scale === scaleKey;
  });
}

function whenExampleSongsReady(fn) {
  return loadExampleSongs().then(fn);
}
