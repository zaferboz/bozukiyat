const GuitarModule = (() => {
  const STRING_NAMES = ['E', 'B', 'G', 'D', 'A', 'E'];
  const STRING_OCTAVES = [4, 3, 3, 3, 2, 2];
  const FRETS = 15;

  function init() {
    buildFretboard();
    document.getElementById('guitarStringSelect').addEventListener('change', buildFretboard);
  }

  function buildFretboard() {
    const fretboard = document.getElementById('fretboard');
    fretboard.innerHTML = '';
    const selectedValue = document.getElementById('guitarStringSelect').value;
    const selectedString = selectedValue === 'all' ? 'all' : parseInt(selectedValue, 10);

    const table = document.createElement('div');
    table.className = 'fretboard-table';

    for (let stringIndex = 0; stringIndex < 6; stringIndex++) {
      if (selectedString !== 'all' && stringIndex !== selectedString) continue;

      const row = document.createElement('div');
      row.className = 'string-row';

      const nut = document.createElement('div');
      nut.className = 'nut';
      row.appendChild(nut);

      const openString = document.createElement('div');
      openString.className = 'fret-cell';
      openString.dataset.string = stringIndex;
      openString.dataset.fret = 'open';

      const openNote = STRING_NAMES[stringIndex];
      const openOctave = STRING_OCTAVES[stringIndex];
      openString.dataset.note = openNote;
      openString.dataset.octave = openOctave;

      const openLabel = document.createElement('span');
      openLabel.className = 'fret-label';
      openLabel.textContent = openNote;
      openString.appendChild(openLabel);

      openString.addEventListener('click', () => playFretNote(openString));
      row.appendChild(openString);

      for (let fret = 0; fret <= FRETS; fret++) {
        if (fret === 0) continue;

        const cell = document.createElement('div');
        cell.className = 'fret-cell';
        cell.dataset.string = stringIndex;
        cell.dataset.fret = fret;

        const noteInfo = getNoteAtFret(stringIndex, fret);
        cell.dataset.note = noteInfo.note;
        cell.dataset.octave = noteInfo.octave;

        const label = document.createElement('span');
        label.className = 'fret-label';
        label.textContent = noteInfo.note;
        cell.appendChild(label);

        if ([3, 5, 7, 9, 12, 15].includes(fret)) {
          const marker = document.createElement('div');
          marker.className = 'fret-marker';
          const size = [12, 15].includes(fret) ? 20 : 14;
          marker.style.width = `${size}px`;
          marker.style.height = `${size}px`;
          cell.appendChild(marker);
        }

        cell.addEventListener('click', () => playFretNote(cell));
        row.appendChild(cell);

        if (fret === 3 || fret === 5 || fret === 7 || fret === 9 || fret === 12 || fret === 15) {
          const fretNum = document.createElement('span');
          fretNum.className = 'fret-number';
          fretNum.textContent = fret;
          cell.appendChild(fretNum);
        }
      }

      table.appendChild(row);
    }

    fretboard.appendChild(table);
  }

  function getNoteAtFret(stringIndex, fret) {
    const openNote = STRING_NAMES[stringIndex];
    const openOctave = STRING_OCTAVES[stringIndex];

    const noteIndex = AudioEngine.noteNames.indexOf(openNote);
    const totalSemitones = noteIndex + fret;

    const octaveShift = Math.floor(totalSemitones / 12);
    const newNoteIndex = totalSemitones % 12;
    const note = AudioEngine.noteNames[newNoteIndex];
    const octave = openOctave + octaveShift;

    return { note, octave };
  }

  function playFretNote(cell) {
    const note = cell.dataset.note;
    const octave = parseInt(cell.dataset.octave, 10);
    const vol = typeof GlobalSettingsModule !== 'undefined' ? GlobalSettingsModule.getVolume() : 0.32;

    AudioEngine.playGuitarNote(note, octave, 1.8, { brightness: 0.5, decay: 0.996, cutoff: 4500, volume: vol });

    document.querySelectorAll('.fret-cell.active').forEach(el => el.classList.remove('active'));
    cell.classList.add('active');

    const label = document.querySelector('#guitar .current-note');
    if (label) {
      const fretDisplay = cell.dataset.fret === 'open' ? 'Open String' : `Fret ${cell.dataset.fret}`;
      label.textContent = `🎸 ${note}${octave} - ${fretDisplay}`;
    }
  }

  return { init };
})();
