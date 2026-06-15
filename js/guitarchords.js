const GuitarChordsModule = (() => {
  // Strings ordered low E (6th) -> high E (1st) to match diagram rows (top -> bottom).
  const OPEN_MIDI = [40, 45, 50, 55, 59, 64];                // E2 A2 D3 G3 B3 E4
  const OPEN_PC = OPEN_MIDI.map(m => m % 12);                // [4,9,2,7,11,4]
  const STRING_LABEL = ['6 E', '5 A', '4 D', '3 G', '2 B', '1 e'];
  const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const ROOT_STRING_KEYS = { 0: 'gc.str6th', 1: 'gc.str5th', 2: 'gc.str4th' };

  function rootStringLabel(s) {
    return I18n.t(ROOT_STRING_KEYS[s] || '');
  }

  // CAGED-style movable shapes per quality, keyed by root-string index (0=6th,1=5th,2=4th).
  // off: fret offset from the root fret (-9 = muted). barre: [from,to] strings the index bars.
  const SHAPES = {
    major: {
      0: { off: [0, 2, 2, 1, 0, 0], fin: [1, 3, 4, 2, 1, 1], barre: [0, 5] },
      1: { off: [-9, 0, 2, 2, 2, 0], fin: [0, 1, 2, 3, 4, 1], barre: [1, 5] },
      2: { off: [-9, -9, 0, 2, 3, 2], fin: [0, 0, 1, 2, 4, 3] }
    },
    minor: {
      0: { off: [0, 2, 2, 0, 0, 0], fin: [1, 3, 4, 1, 1, 1], barre: [0, 5] },
      1: { off: [-9, 0, 2, 2, 1, 0], fin: [0, 1, 3, 4, 2, 1], barre: [1, 5] },
      2: { off: [-9, -9, 0, 2, 3, 1], fin: [0, 0, 1, 3, 4, 2] }
    },
    dom7: {
      0: { off: [0, 2, 0, 1, 0, 0], fin: [1, 3, 1, 2, 1, 1], barre: [0, 5] },
      1: { off: [-9, 0, 2, 0, 2, 0], fin: [0, 1, 3, 1, 4, 1], barre: [1, 5] },
      2: { off: [-9, -9, 0, 2, 1, 2], fin: [0, 0, 1, 3, 2, 4] }
    },
    maj7: {
      0: { off: [0, 2, 1, 1, 0, 0], fin: [1, 4, 2, 3, 1, 1], barre: [0, 5] },
      1: { off: [-9, 0, 2, 1, 2, 0], fin: [0, 1, 3, 2, 4, 1] },
      2: { off: [-9, -9, 0, 2, 2, 2], fin: [0, 0, 1, 2, 3, 4] }
    },
    min7: {
      0: { off: [0, 2, 0, 0, 0, 0], fin: [1, 3, 1, 1, 1, 1], barre: [0, 5] },
      1: { off: [-9, 0, 2, 0, 1, 0], fin: [0, 1, 3, 1, 2, 1], barre: [1, 5] },
      2: { off: [-9, -9, 0, 2, 1, 1], fin: [0, 0, 1, 3, 1, 1] }
    },
    maj6: {
      1: { off: [-9, 0, 2, 2, 2, 2], fin: [0, 1, 2, 3, 4, 1], barre: [4, 5] },
      2: { off: [-9, -9, 0, 2, 0, 2], fin: [0, 0, 1, 3, 0, 4] }
    },
    min6: {
      1: { off: [-9, 0, 2, 2, 1, 2], fin: [0, 1, 3, 4, 2, 4] },
      2: { off: [-9, -9, 0, 2, 0, 1], fin: [0, 0, 1, 3, 0, 2] }
    },
    dom9: {
      1: { off: [-9, 0, -1, 0, 0, 0], fin: [0, 2, 1, 3, 3, 3], barre: [3, 5] }
    },
    add9: {
      1: { off: [-9, 0, 2, 4, 2, 0], fin: [0, 1, 2, 4, 3, 1] }
    },
    sus2: {
      1: { off: [-9, 0, 2, 2, 0, 0], fin: [0, 1, 3, 4, 1, 1], barre: [1, 5] },
      2: { off: [-9, -9, 0, 2, 3, 0], fin: [0, 0, 1, 2, 4, 1] }
    },
    sus4: {
      0: { off: [0, 2, 2, 2, 0, 0], fin: [1, 3, 4, 4, 1, 1], barre: [0, 5] },
      1: { off: [-9, 0, 2, 2, 3, 0], fin: [0, 1, 2, 3, 4, 1] },
      2: { off: [-9, -9, 0, 2, 3, 3], fin: [0, 0, 1, 2, 3, 4] }
    },
    power5: {
      0: { off: [0, 2, 2, -9, -9, -9], fin: [1, 3, 4, 0, 0, 0] },
      1: { off: [-9, 0, 2, 2, -9, -9], fin: [0, 1, 3, 4, 0, 0] },
      2: { off: [-9, -9, 0, 2, 3, -9], fin: [0, 0, 1, 3, 4, 0] }
    },
    dim7: {
      1: { off: [-9, 0, 1, -1, 1, -9], fin: [0, 1, 3, 2, 4, 0] }
    }
  };

  const SUFFIX = {
    major: '', minor: 'm', maj6: '6', min6: 'm6', dom7: '7', min7: 'm7',
    maj7: 'maj7', minMaj7: 'm(maj7)', dom9: '9', min9: 'm9',
    add9: 'add9', minAdd9: 'm(add9)', sus2: 'sus2', sus4: 'sus4',
    power5: '5', dim7: 'dim7'
  };

  // Maps to the Karplus-Strong pluck engine: brightness (filter blend),
  // decay (string sustain), cutoff (tone), duration and volume.
  const TONES = {
    folk:    { brightness: 0.50, decay: 0.996, cutoff: 4500, dur: 1.9, vol: 0.30 },
    steel:   { brightness: 0.62, decay: 0.995, cutoff: 6500, dur: 1.7, vol: 0.28 },
    classic: { brightness: 0.42, decay: 0.992, cutoff: 2800, dur: 2.1, vol: 0.34 },
    nylon:   { brightness: 0.38, decay: 0.990, cutoff: 2200, dur: 2.2, vol: 0.36 },
    rock:    { brightness: 0.56, decay: 0.998, cutoff: 3900, dur: 2.4, vol: 0.26 }
  };

  let base = 'major';
  let modifier = 'triad';
  let rootString = 0;
  let currentTone = 'folk';
  let currentFret = 0;

  function init() {
    document.querySelectorAll('#gcBaseToggle .toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        base = btn.dataset.base;
        document.querySelectorAll('#gcBaseToggle .toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        refresh();
      });
    });
    document.getElementById('gcModifier').addEventListener('change', (e) => {
      modifier = e.target.value;
      refresh();
    });
    document.getElementById('gcRootString').addEventListener('change', (e) => {
      rootString = parseInt(e.target.value, 10);
      renderGrid();
      renderNeck();
    });
    document.getElementById('gcGuitarType').addEventListener('change', (e) => {
      currentTone = e.target.value;
    });
    document.getElementById('gcFretSlider').addEventListener('input', (e) => {
      currentFret = parseInt(e.target.value, 10);
      document.getElementById('gcFretValue').textContent = currentFret;
      renderNeck();
    });
    document.getElementById('gcNeckPlay').addEventListener('click', () => {
      const chord = buildChord(currentFret);
      if (chord) playChord(chord, true);
    });

    refresh();
  }

  function quality() {
    const m = modifier;
    if (m === '5') return 'power5';
    if (m === 'dim') return 'dim7';
    if (m === 'sus2') return 'sus2';
    if (m === 'sus4') return 'sus4';
    if (m === 'triad') return base;
    if (m === '6') return base === 'major' ? 'maj6' : 'min6';
    if (m === '7') return base === 'major' ? 'dom7' : 'min7';
    if (m === 'maj7') return base === 'major' ? 'maj7' : 'minMaj7';
    if (m === '9') return base === 'major' ? 'dom9' : 'min9';
    if (m === 'add9') return base === 'major' ? 'add9' : 'minAdd9';
    return base;
  }

  function availableStrings() {
    const shapes = SHAPES[quality()] || {};
    return Object.keys(shapes).map(Number).sort();
  }

  function neededMin(shape) {
    const valid = shape.off.filter(o => o > -9);
    const min = Math.min(...valid);
    return min < 0 ? -min : 0;
  }

  function buildChord(fret) {
    const q = quality();
    const shape = (SHAPES[q] || {})[rootString];
    if (!shape) return null;
    if (fret < neededMin(shape)) return null;

    const frets = shape.off.map(o => (o <= -9 ? -1 : fret + o));
    const rootPc = (OPEN_PC[rootString] + fret) % 12;
    const name = NAMES[rootPc] + SUFFIX[q];
    const chord = { name, frets, fingers: shape.fin };
    if (shape.barre && fret > 0) chord.barre = { fret, from: shape.barre[0], to: shape.barre[1] };
    return chord;
  }

  // Lowest playable fret for a given root note on the current string/shape.
  function fretForRoot(rootName) {
    const q = quality();
    const shape = (SHAPES[q] || {})[rootString];
    if (!shape) return null;
    const rootPc = ROOTS.indexOf(rootName);
    let f = ((rootPc - OPEN_PC[rootString]) % 12 + 12) % 12;
    const min = neededMin(shape);
    while (f < min) f += 12;
    return f;
  }

  function refresh() {
    // Rebuild root-string options for the current quality.
    const avail = availableStrings();
    const select = document.getElementById('gcRootString');
    select.innerHTML = '';
    if (avail.length === 0) {
      rootString = 0;
    } else {
      if (!avail.includes(rootString)) rootString = avail[0];
      avail.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = rootStringLabel(s);
        if (s === rootString) opt.selected = true;
        select.appendChild(opt);
      });
    }
    const cFret = fretForRoot('C');
    if (cFret !== null) currentFret = cFret;
    renderGrid();
    renderNeck();
  }

  function renderGrid() {
    const grid = document.getElementById('gcGrid');
    const detail = document.getElementById('gcDetail');
    grid.innerHTML = '';

    const q = quality();
    if (!SHAPES[q] || !SHAPES[q][rootString]) {
      grid.innerHTML = `<p class="scale-description">${I18n.t('gc.noShape', { chord: `${base} + ${modifier}` })}</p>`;
      detail.innerHTML = '';
      return;
    }

    ROOTS.forEach(rootName => {
      const f = fretForRoot(rootName);
      const chord = buildChord(f);
      if (!chord) return;
      const card = document.createElement('div');
      card.className = 'gc-card';
      card.appendChild(makeDiagram(chord, 1));
      const label = document.createElement('div');
      label.className = 'gc-name';
      label.textContent = chord.name;
      card.appendChild(label);
      card.addEventListener('click', () => {
        showDetail(chord);
        currentFret = f;
        syncSlider();
        renderNeck();
      });
      grid.appendChild(card);
    });

    showDetail(buildChord(fretForRoot('C')));
  }

  function syncSlider() {
    const slider = document.getElementById('gcFretSlider');
    const shape = (SHAPES[quality()] || {})[rootString];
    const min = shape ? neededMin(shape) : 0;
    slider.min = min;
    if (currentFret < min) currentFret = min;
    slider.value = currentFret;
    document.getElementById('gcFretValue').textContent = currentFret;
  }

  function showDetail(chord) {
    const detail = document.getElementById('gcDetail');
    detail.innerHTML = '';
    if (!chord) return;
    detail.appendChild(makeDiagram(chord, 2.1));

    const info = document.createElement('div');
    info.className = 'gc-info';
    const title = document.createElement('h3');
    title.className = 'gc-detail-title';
    title.textContent = chord.name;
    info.appendChild(title);

    const how = document.createElement('p');
    how.className = 'scale-description';
    how.innerHTML = fingeringText(chord);
    info.appendChild(how);

    const btnRow = document.createElement('div');
    btnRow.className = 'gc-btn-row';
    const strum = document.createElement('button');
    strum.className = 'play-btn';
    strum.textContent = I18n.t('gc.strum');
    strum.addEventListener('click', () => playChord(chord, true));
    const block = document.createElement('button');
    block.className = 'play-btn';
    block.textContent = I18n.t('gc.allTogether');
    block.addEventListener('click', () => playChord(chord, false));
    btnRow.appendChild(strum);
    btnRow.appendChild(block);
    info.appendChild(btnRow);

    detail.appendChild(info);
  }

  function fingeringText(chord) {
    const names = ['6th (low E)', '5th (A)', '4th (D)', '3rd (G)', '2nd (B)', '1st (high E)'];
    const fingerNames = { 1: 'index', 2: 'middle', 3: 'ring', 4: 'pinky' };
    const parts = [];
    if (chord.barre) parts.push(`<strong>Barre:</strong> index finger flat across fret ${chord.barre.fret}.`);
    for (let s = 0; s < 6; s++) {
      const f = chord.frets[s];
      if (f === -1) parts.push(`${names[s]}: <em>mute (don't play)</em>`);
      else if (f === 0) parts.push(`${names[s]}: <em>open</em>`);
      else {
        const fin = chord.fingers[s];
        parts.push(`${names[s]}: fret ${f}${fin && fingerNames[fin] ? ` (${fingerNames[fin]})` : ''}`);
      }
    }
    return parts.join('<br>');
  }

  function getWindow(chord, minFrets) {
    const fretted = chord.frets.filter(f => f > 0);
    if (fretted.length === 0) return { start: 1, count: minFrets || 4 };
    const min = Math.min(...fretted), max = Math.max(...fretted);
    if (max <= (minFrets || 4)) return { start: 1, count: minFrets || 4 };
    return { start: min, count: Math.max(minFrets || 4, max - min + 1) };
  }

  function makeDiagram(chord, scale) {
    const ns = 'http://www.w3.org/2000/svg';
    const stringGap = 15 * scale;
    const fretGap = 24 * scale;
    const leftPad = 26 * scale;
    const topPad = 16 * scale;
    const win = getWindow(chord, 4);
    const width = leftPad + win.count * fretGap + 14 * scale;
    const height = topPad + 5 * stringGap + 22 * scale;

    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('class', 'gc-diagram');

    const rowY = s => topPad + s * stringGap;
    const fretX = f => leftPad + f * fretGap;

    if (win.start === 1) {
      const nut = document.createElementNS(ns, 'rect');
      nut.setAttribute('x', leftPad - 3); nut.setAttribute('y', rowY(0));
      nut.setAttribute('width', 4 * scale); nut.setAttribute('height', stringGap * 5);
      nut.setAttribute('fill', '#f1f5f9');
      svg.appendChild(nut);
    } else {
      const t = document.createElementNS(ns, 'text');
      t.setAttribute('x', leftPad + fretGap * 0.5); t.setAttribute('y', rowY(0) - 5 * scale);
      t.setAttribute('fill', '#94a3b8'); t.setAttribute('font-size', 9 * scale);
      t.setAttribute('text-anchor', 'middle');
      t.textContent = win.start + 'fr';
      svg.appendChild(t);
    }

    for (let f = 0; f <= win.count; f++) {
      const x = fretX(f);
      const line = document.createElementNS(ns, 'line');
      line.setAttribute('x1', x); line.setAttribute('y1', rowY(0));
      line.setAttribute('x2', x); line.setAttribute('y2', rowY(5));
      line.setAttribute('stroke', '#64748b'); line.setAttribute('stroke-width', 1);
      svg.appendChild(line);
    }
    for (let s = 0; s < 6; s++) {
      const y = rowY(s);
      const line = document.createElementNS(ns, 'line');
      line.setAttribute('x1', fretX(0)); line.setAttribute('y1', y);
      line.setAttribute('x2', fretX(win.count)); line.setAttribute('y2', y);
      line.setAttribute('stroke', '#64748b');
      line.setAttribute('stroke-width', s === 0 ? 2 : Math.max(0.6, 1.2 - s * 0.12));
      svg.appendChild(line);

      const lbl = document.createElementNS(ns, 'text');
      lbl.setAttribute('x', 4 * scale); lbl.setAttribute('y', y + 3.5 * scale);
      lbl.setAttribute('fill', '#94a3b8'); lbl.setAttribute('font-size', 8 * scale);
      lbl.textContent = STRING_LABEL[s];
      svg.appendChild(lbl);
    }

    for (let s = 0; s < 6; s++) {
      const f = chord.frets[s];
      const y = rowY(s);
      if (f === 0) {
        const o = document.createElementNS(ns, 'circle');
        o.setAttribute('cx', leftPad - 11 * scale); o.setAttribute('cy', y); o.setAttribute('r', 4 * scale);
        o.setAttribute('fill', 'none'); o.setAttribute('stroke', '#10b981'); o.setAttribute('stroke-width', 1.5);
        svg.appendChild(o);
      } else if (f === -1) {
        const t = document.createElementNS(ns, 'text');
        t.setAttribute('x', leftPad - 11 * scale); t.setAttribute('y', y + 3.5 * scale);
        t.setAttribute('fill', '#ef4444'); t.setAttribute('font-size', 11 * scale); t.setAttribute('text-anchor', 'middle');
        t.textContent = '×';
        svg.appendChild(t);
      }
    }

    if (chord.barre) {
      const rel = chord.barre.fret - win.start + 1;
      const x = fretX(rel - 0.5);
      const rect = document.createElementNS(ns, 'rect');
      rect.setAttribute('x', x - 5 * scale); rect.setAttribute('y', rowY(chord.barre.from) - 5 * scale);
      rect.setAttribute('width', 10 * scale);
      rect.setAttribute('height', (chord.barre.to - chord.barre.from) * stringGap + 10 * scale);
      rect.setAttribute('rx', 5 * scale); rect.setAttribute('fill', '#6366f1');
      svg.appendChild(rect);
    }

    for (let s = 0; s < 6; s++) {
      const f = chord.frets[s];
      if (f > 0) {
        const rel = f - win.start + 1;
        const x = fretX(rel - 0.5);
        const y = rowY(s);
        const dot = document.createElementNS(ns, 'circle');
        dot.setAttribute('cx', x); dot.setAttribute('cy', y); dot.setAttribute('r', 6 * scale); dot.setAttribute('fill', '#6366f1');
        svg.appendChild(dot);
        const fin = chord.fingers[s];
        if (fin) {
          const t = document.createElementNS(ns, 'text');
          t.setAttribute('x', x); t.setAttribute('y', y + 3.3 * scale);
          t.setAttribute('fill', '#fff'); t.setAttribute('font-size', 8 * scale);
          t.setAttribute('text-anchor', 'middle'); t.setAttribute('font-weight', 'bold');
          t.textContent = fin;
          svg.appendChild(t);
        }
      }
    }

    for (let f = 1; f <= win.count; f++) {
      const t = document.createElementNS(ns, 'text');
      t.setAttribute('x', fretX(f - 0.5)); t.setAttribute('y', rowY(5) + 16 * scale);
      t.setAttribute('fill', '#64748b'); t.setAttribute('font-size', 8 * scale); t.setAttribute('text-anchor', 'middle');
      t.textContent = win.start + f - 1;
      svg.appendChild(t);
    }

    return svg;
  }

  function renderNeck() {
    const chord = buildChord(currentFret);
    const nameEl = document.getElementById('gcNeckName');
    const neck = document.getElementById('gcNeck');
    syncSlider();
    if (!chord) {
      nameEl.textContent = '';
      neck.innerHTML = '';
      return;
    }
    nameEl.textContent = `${chord.name}  —  ${I18n.t('gc.rootOn')} ${rootStringLabel(rootString)}, ${I18n.t('gc.fret')} ${currentFret}`;
    neck.innerHTML = '';
    neck.appendChild(makeNeck(chord));
  }

  function makeNeck(chord) {
    const ns = 'http://www.w3.org/2000/svg';
    const FRETS = 15;
    const stringGap = 18;
    const fretGap = 44;
    const leftPad = 34;
    const topPad = 22;
    const width = leftPad + FRETS * fretGap + 16;
    const height = topPad + 5 * stringGap + 24;

    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', width); svg.setAttribute('height', height);
    svg.setAttribute('class', 'gc-neck-svg');

    const rowY = s => topPad + s * stringGap;
    const fretX = f => leftPad + f * fretGap;

    const nut = document.createElementNS(ns, 'rect');
    nut.setAttribute('x', leftPad - 4); nut.setAttribute('y', rowY(0));
    nut.setAttribute('width', 5); nut.setAttribute('height', stringGap * 5); nut.setAttribute('fill', '#f1f5f9');
    svg.appendChild(nut);

    for (let f = 0; f <= FRETS; f++) {
      const x = fretX(f);
      const line = document.createElementNS(ns, 'line');
      line.setAttribute('x1', x); line.setAttribute('y1', rowY(0)); line.setAttribute('x2', x); line.setAttribute('y2', rowY(5));
      line.setAttribute('stroke', '#64748b'); line.setAttribute('stroke-width', 1);
      svg.appendChild(line);
      if (f >= 1) {
        const t = document.createElementNS(ns, 'text');
        t.setAttribute('x', fretX(f - 0.5)); t.setAttribute('y', rowY(5) + 16);
        t.setAttribute('fill', '#64748b'); t.setAttribute('font-size', 9); t.setAttribute('text-anchor', 'middle');
        t.textContent = f;
        svg.appendChild(t);
      }
    }
    [3, 5, 7, 9, 12, 15].forEach(f => {
      const m = document.createElementNS(ns, 'circle');
      m.setAttribute('cx', fretX(f - 0.5)); m.setAttribute('cy', topPad - 8); m.setAttribute('r', 3); m.setAttribute('fill', '#475569');
      svg.appendChild(m);
    });

    for (let s = 0; s < 6; s++) {
      const y = rowY(s);
      const line = document.createElementNS(ns, 'line');
      line.setAttribute('x1', fretX(0)); line.setAttribute('y1', y); line.setAttribute('x2', fretX(FRETS)); line.setAttribute('y2', y);
      line.setAttribute('stroke', '#94a3b8'); line.setAttribute('stroke-width', Math.max(0.7, 2 - s * 0.18));
      svg.appendChild(line);
      const lbl = document.createElementNS(ns, 'text');
      lbl.setAttribute('x', 4); lbl.setAttribute('y', y + 3.5);
      lbl.setAttribute('fill', '#94a3b8'); lbl.setAttribute('font-size', 9);
      lbl.textContent = STRING_LABEL[s];
      svg.appendChild(lbl);
    }

    for (let s = 0; s < 6; s++) {
      const f = chord.frets[s];
      const y = rowY(s);
      if (f === 0) {
        const o = document.createElementNS(ns, 'circle');
        o.setAttribute('cx', leftPad - 14); o.setAttribute('cy', y); o.setAttribute('r', 5);
        o.setAttribute('fill', 'none'); o.setAttribute('stroke', '#10b981'); o.setAttribute('stroke-width', 2);
        svg.appendChild(o);
      } else if (f === -1) {
        const t = document.createElementNS(ns, 'text');
        t.setAttribute('x', leftPad - 14); t.setAttribute('y', y + 4);
        t.setAttribute('fill', '#ef4444'); t.setAttribute('font-size', 13); t.setAttribute('text-anchor', 'middle');
        t.textContent = '×';
        svg.appendChild(t);
      }
    }

    if (chord.barre) {
      const x = fretX(chord.barre.fret - 0.5);
      const rect = document.createElementNS(ns, 'rect');
      rect.setAttribute('x', x - 6); rect.setAttribute('y', rowY(chord.barre.from) - 6);
      rect.setAttribute('width', 12);
      rect.setAttribute('height', (chord.barre.to - chord.barre.from) * stringGap + 12);
      rect.setAttribute('rx', 6); rect.setAttribute('fill', 'rgba(236,72,153,0.85)');
      svg.appendChild(rect);
    }

    for (let s = 0; s < 6; s++) {
      const f = chord.frets[s];
      if (f > 0) {
        const x = fretX(f - 0.5);
        const y = rowY(s);
        const dot = document.createElementNS(ns, 'circle');
        dot.setAttribute('cx', x); dot.setAttribute('cy', y); dot.setAttribute('r', 8); dot.setAttribute('fill', '#ec4899');
        svg.appendChild(dot);
        const fin = chord.fingers[s];
        if (fin) {
          const t = document.createElementNS(ns, 'text');
          t.setAttribute('x', x); t.setAttribute('y', y + 3.5);
          t.setAttribute('fill', '#fff'); t.setAttribute('font-size', 10); t.setAttribute('text-anchor', 'middle'); t.setAttribute('font-weight', 'bold');
          t.textContent = fin;
          svg.appendChild(t);
        }
      }
    }

    return svg;
  }

  function midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function playChord(chord, strum) {
    const ctx = AudioEngine.getContext();
    const tone = TONES[currentTone];
    const gVol = typeof GlobalSettingsModule !== 'undefined' ? GlobalSettingsModule.getVolume() / 0.35 : 1;
    const midis = [];
    for (let s = 0; s < 6; s++) {
      if (chord.frets[s] >= 0) midis.push(OPEN_MIDI[s] + chord.frets[s]);
    }
    midis.forEach((midi, i) => {
      const when = ctx.currentTime + (strum ? i * 0.05 : 0);
      AudioEngine.playPluck(midiToFreq(midi), tone.dur, tone.vol * gVol, {
        brightness: tone.brightness, decay: tone.decay, cutoff: tone.cutoff
      }, when);
    });
  }

  function onLangChange() {
    refresh();
  }

  return { init, onLangChange };
})();
