const PianoModule = (() => {
  const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const WHITE_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

  const KEY_LABELS = {
    'a': 'A', 'w': 'W', 's': 'S', 'e': 'E', 'd': 'D',
    'f': 'F', 't': 'T', 'g': 'G', 'y': 'Y', 'h': 'H',
    'u': 'U', 'j': 'J', 'k': 'K'
  };

  function buildKeyboardMap(baseOct) {
    return {
      'a': { note: 'C', octave: baseOct },
      'w': { note: 'C#', octave: baseOct },
      's': { note: 'D', octave: baseOct },
      'e': { note: 'D#', octave: baseOct },
      'd': { note: 'E', octave: baseOct },
      'f': { note: 'F', octave: baseOct },
      't': { note: 'F#', octave: baseOct },
      'g': { note: 'G', octave: baseOct },
      'y': { note: 'G#', octave: baseOct },
      'h': { note: 'A', octave: baseOct },
      'u': { note: 'A#', octave: baseOct },
      'j': { note: 'B', octave: baseOct },
      'k': { note: 'C', octave: baseOct + 1 }
    };
  }

  function getBaseOctave() {
    if (typeof GlobalSettingsModule !== 'undefined') return GlobalSettingsModule.getKeyOctave();
    return 4;
  }

  function getHoldVolume() {
    return typeof GlobalSettingsModule !== 'undefined' ? GlobalSettingsModule.getVolume() : 0.3;
  }

  function noteToMidi(note, octave) {
    const idx = NOTES.indexOf(note);
    if (idx < 0) return 60;
    return (octave + 1) * 12 + idx;
  }

  let keyboardMap = buildKeyboardMap(4);
  const heldKeyCodes = new Set();
  const heldMouseMidis = new Set();

  function refreshKeyboardMap() {
    keyboardMap = buildKeyboardMap(getBaseOctave());
    buildKeyboard();
  }

  function init() {
    refreshKeyboardMap();
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mouseup', handleWindowMouseUp);
    window.addEventListener('blur', releaseAllHolds);
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.dataset.tab !== 'piano') releaseAllHolds();
      });
    });
    window.addEventListener('globalsettingschange', (e) => {
      if (e.detail && e.detail.keyOctave != null) refreshKeyboardMap();
    });
  }

  function buildKeyboard() {
    const keyboard = document.getElementById('pianoKeyboard');
    keyboard.innerHTML = '';

    const startOctave = 2;
    const endOctave = 6;
    const whiteWidth = 50;
    const blackWidth = 32;

    const whiteKeysFragment = document.createDocumentFragment();
    const blackKeysFragment = document.createDocumentFragment();

    let totalWhiteKeys = 0;

    for (let octave = startOctave; octave <= endOctave; octave++) {
      for (let i = 0; i < 12; i++) {
        const note = NOTES[i];
        const isBlack = note.includes('#');

        if (octave === endOctave && note !== 'C') continue;

        if (isBlack) {
          const key = document.createElement('div');
          key.className = 'key black';
          key.dataset.note = note;
          key.dataset.octave = octave;
          key.dataset.fullNote = note + octave;
          key.style.position = 'absolute';
          key.style.width = `${blackWidth}px`;
          key.style.height = '130px';

          const whiteKeysBeforeInOctave = WHITE_NOTES.indexOf(note) - (note === 'C#' || note === 'D#' ? 1 : 0);
          const octaveWhiteOffset = (octave - startOctave) * 7 + whiteKeysBeforeInOctave;
          const leftPos = octaveWhiteOffset * whiteWidth + whiteWidth - Math.floor(blackWidth / 2);
          key.style.left = `${leftPos}px`;

          const mapEntry = Object.entries(keyboardMap).find(([k, v]) => v.note === note && v.octave === octave);
          if (mapEntry) {
            key.textContent = KEY_LABELS[mapEntry[0]];
          }

          key.addEventListener('mousedown', (e) => {
            e.preventDefault();
            pressKeyElement(key);
          });
          key.addEventListener('mouseup', () => releaseKeyElement(key));
          key.addEventListener('mouseleave', () => releaseKeyElement(key));
          blackKeysFragment.appendChild(key);
        } else {
          const key = document.createElement('div');
          key.className = 'key white';
          key.dataset.note = note;
          key.dataset.octave = octave;
          key.dataset.fullNote = note + octave;
          key.style.width = `${whiteWidth}px`;
          key.style.height = '200px';

          const mapEntry = Object.entries(keyboardMap).find(([k, v]) => v.note === note && v.octave === octave);
          if (mapEntry) {
            key.textContent = KEY_LABELS[mapEntry[0]];
          }

          key.addEventListener('mousedown', (e) => {
            e.preventDefault();
            pressKeyElement(key);
          });
          key.addEventListener('mouseup', () => releaseKeyElement(key));
          key.addEventListener('mouseleave', () => releaseKeyElement(key));
          whiteKeysFragment.appendChild(key);
          totalWhiteKeys++;
        }
      }
    }

    keyboard.appendChild(whiteKeysFragment);
    keyboard.appendChild(blackKeysFragment);
    keyboard.style.width = `${totalWhiteKeys * whiteWidth}px`;
  }

  function pressKeyElement(keyElement) {
    const note = keyElement.dataset.note;
    const octave = parseInt(keyElement.dataset.octave, 10);
    const midi = noteToMidi(note, octave);
    if (heldMouseMidis.has(midi)) return;

    heldMouseMidis.add(midi);
    AudioEngine.startNoteHold(midi, getHoldVolume());
    updateCurrentNote(keyElement.dataset.fullNote);
    keyElement.classList.add('active');
  }

  function releaseKeyElement(keyElement) {
    const note = keyElement.dataset.note;
    const octave = parseInt(keyElement.dataset.octave, 10);
    const midi = noteToMidi(note, octave);
    if (!heldMouseMidis.has(midi)) return;

    heldMouseMidis.delete(midi);
    AudioEngine.stopNoteHold(midi);
    keyElement.classList.remove('active');
  }

  function releaseAllHolds() {
    heldKeyCodes.forEach((keyCode) => {
      const mapping = keyboardMap[keyCode];
      if (mapping) AudioEngine.stopNoteHold(noteToMidi(mapping.note, mapping.octave));
    });
    heldKeyCodes.clear();
    heldMouseMidis.forEach((midi) => AudioEngine.stopNoteHold(midi));
    heldMouseMidis.clear();
    document.querySelectorAll('#pianoKeyboard .key.active').forEach((k) => k.classList.remove('active'));
  }

  function handleWindowMouseUp() {
    if (!isActive() || heldMouseMidis.size === 0) return;
    const midis = [...heldMouseMidis];
    midis.forEach((midi) => {
      heldMouseMidis.delete(midi);
      AudioEngine.stopNoteHold(midi);
      const { note, octave } = AudioEngine.midiToNoteOctave(midi);
      const key = document.querySelector(`#pianoKeyboard .key[data-note="${note}"][data-octave="${octave}"]`);
      if (key) key.classList.remove('active');
    });
  }

  function updateCurrentNote(fullNote) {
    const display = document.querySelector('#piano .current-note');
    if (display) {
      display.textContent = `🎵 ${fullNote}`;
    }
  }

  function isActive() {
    const panel = document.getElementById('piano');
    return panel && panel.classList.contains('active');
  }

  function handleKeyDown(e) {
    if (e.repeat) return;
    if (!isActive()) return;
    const keyCode = e.key.toLowerCase();
    const mapping = keyboardMap[keyCode];
    if (!mapping) return;

    e.preventDefault();
    if (heldKeyCodes.has(keyCode)) return;
    heldKeyCodes.add(keyCode);

    const midi = noteToMidi(mapping.note, mapping.octave);
    AudioEngine.startNoteHold(midi, getHoldVolume());
    updateCurrentNote(mapping.note + mapping.octave);

    const key = document.querySelector(`#pianoKeyboard .key[data-note="${mapping.note}"][data-octave="${mapping.octave}"]`);
    if (key) key.classList.add('active');
  }

  function handleKeyUp(e) {
    const keyCode = e.key.toLowerCase();
    const mapping = keyboardMap[keyCode];
    if (!mapping || !heldKeyCodes.has(keyCode)) return;

    heldKeyCodes.delete(keyCode);
    AudioEngine.stopNoteHold(noteToMidi(mapping.note, mapping.octave));

    if (!isActive()) return;
    const key = document.querySelector(`#pianoKeyboard .key[data-note="${mapping.note}"][data-octave="${mapping.octave}"]`);
    if (key) key.classList.remove('active');
  }

  const activeMidiKeys = new Set();

  function handleMidi(midi, velocity, isOn) {
    if (isOn) {
      if (activeMidiKeys.has(midi)) return;
      activeMidiKeys.add(midi);
      const { note, octave } = AudioEngine.midiToNoteOctave(midi);
      const vol = Math.min(1, (velocity || 64) / 127) * 0.28 + 0.12;
      AudioEngine.startNoteHold(midi, vol);

      if (isActive()) {
        const key = document.querySelector(`.key[data-note="${note}"][data-octave="${octave}"]`);
        if (key) key.classList.add('active');
        updateCurrentNote(note + octave);
      }
    } else {
      activeMidiKeys.delete(midi);
      AudioEngine.stopNoteHold(midi);
      const { note, octave } = AudioEngine.midiToNoteOctave(midi);
      const key = document.querySelector(`.key[data-note="${note}"][data-octave="${octave}"]`);
      if (key) key.classList.remove('active');
    }
  }

  function highlightNote(note, octave, duration = 1000) {
    const key = document.querySelector(`#pianoKeyboard .key[data-note="${note}"][data-octave="${octave}"]`);
    const midi = noteToMidi(note, octave);
    AudioEngine.startNoteHold(midi, getHoldVolume());
    if (key) key.classList.add('active');
    updateCurrentNote(note + octave);
    setTimeout(() => {
      AudioEngine.stopNoteHold(midi);
      if (key) key.classList.remove('active');
    }, duration);
  }

  return { init, highlightNote, handleMidi };
})();
