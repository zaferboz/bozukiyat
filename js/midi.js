const MidiModule = (() => {
  const STORAGE_KEY = 'boz_midi_input';
  const NATURAL_PC = { 0: 'C', 2: 'D', 4: 'E', 5: 'F', 7: 'G', 9: 'A', 11: 'B' };

  let access = null;
  let activeInput = null;
  let connected = false;

  function supported() {
    return typeof navigator !== 'undefined' && !!navigator.requestMIDIAccess;
  }

  function setStatus(text, ok) {
    const el = document.getElementById('midiStatus');
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('midi-ok', !!ok);
    el.classList.toggle('midi-err', ok === false);
  }

  function populateInputs() {
    const sel = document.getElementById('midiInputSelect');
    if (!sel || !access) return;
    const prev = localStorage.getItem(STORAGE_KEY) || sel.value;
    sel.innerHTML = '';
    const inputs = [...access.inputs.values()];
    if (inputs.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = I18n.t('midi.noDevices');
      sel.appendChild(opt);
      sel.disabled = true;
      return;
    }
    inputs.forEach(input => {
      const opt = document.createElement('option');
      opt.value = input.id;
      opt.textContent = input.name || input.id;
      sel.appendChild(opt);
    });
    sel.disabled = false;
    sel.hidden = false;
    const match = inputs.find(i => i.id === prev);
    sel.value = match ? match.id : inputs[0].id;
    bindInput(sel.value);
  }

  function bindInput(id) {
    if (activeInput) {
      activeInput.onmidimessage = null;
      activeInput = null;
    }
    if (!access || !id) return;
    const input = access.inputs.get(id);
    if (!input) return;
    activeInput = input;
    localStorage.setItem(STORAGE_KEY, id);
    input.onmidimessage = handleMessage;
    setStatus(I18n.t('midi.connected', { name: input.name || 'MIDI' }), true);
  }

  function handleMessage(e) {
    const data = e.data;
    if (!data || data.length < 2) return;
    const status = data[0] & 0xf0;
    const note = data[1];
    const velocity = data.length > 2 ? data[2] : 0;

    const noteOn = status === 0x90 && velocity > 0;
    const noteOff = status === 0x80 || (status === 0x90 && velocity === 0);
    if (!noteOn && !noteOff) return;

    AudioEngine.getContext();

    const activeTab = document.querySelector('.tab-panel.active')?.id;

    if (noteOn) {
      if (activeTab === 'composer' && typeof ComposerModule !== 'undefined' && ComposerModule.handleMidi) {
        ComposerModule.handleMidi(note, velocity, true);
        return;
      }
      if (activeTab === 'sheetmusic') {
        const prog = document.getElementById('trainingProgram')?.value || 'notes-learn';
        if (prog.startsWith('notes-') && typeof SheetMusicModule !== 'undefined' && SheetMusicModule.handleMidi) {
          SheetMusicModule.handleMidi(note, velocity);
          return;
        }
        if (prog.startsWith('ear-') && typeof EarTrainingModule !== 'undefined' && EarTrainingModule.handleMidi) {
          EarTrainingModule.handleMidi(note);
          return;
        }
      }
      if (typeof PianoModule !== 'undefined' && PianoModule.handleMidi) {
        PianoModule.handleMidi(note, velocity, true);
      }
    } else if (noteOff) {
      if (activeTab === 'composer' && typeof ComposerModule !== 'undefined' && ComposerModule.handleMidi) {
        ComposerModule.handleMidi(note, velocity, false);
        return;
      }
      if (typeof PianoModule !== 'undefined' && PianoModule.handleMidi) {
        PianoModule.handleMidi(note, velocity, false);
      }
    }
  }

  async function connect() {
    if (!supported()) {
      setStatus(I18n.t('midi.unsupported'), false);
      return;
    }
    const btn = document.getElementById('midiConnectBtn');
    try {
      if (btn) btn.disabled = true;
      access = await navigator.requestMIDIAccess({ sysex: false });
      connected = true;
      access.onstatechange = () => populateInputs();
      populateInputs();
      if (btn) {
        btn.classList.add('active');
        btn.textContent = I18n.t('midi.connectedBtn');
      }
    } catch (err) {
      connected = false;
      setStatus(I18n.t('midi.denied'), false);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function init() {
    const btn = document.getElementById('midiConnectBtn');
    const sel = document.getElementById('midiInputSelect');
    if (!btn) return;

    if (!supported()) {
      setStatus(I18n.t('midi.unsupported'), false);
      btn.disabled = true;
      return;
    }

    setStatus(I18n.t('midi.disconnected'), null);
    btn.addEventListener('click', () => {
      if (!connected) connect();
      else populateInputs();
    });
    if (sel) {
      sel.addEventListener('change', e => bindInput(e.target.value));
    }
  }

  function onLangChange() {
    if (!connected) setStatus(I18n.t('midi.disconnected'), null);
    else if (activeInput) setStatus(I18n.t('midi.connected', { name: activeInput.name || 'MIDI' }), true);
    populateInputs();
    const btn = document.getElementById('midiConnectBtn');
    if (btn && connected) btn.textContent = I18n.t('midi.connectedBtn');
  }

  return { init, onLangChange, supported };
})();
