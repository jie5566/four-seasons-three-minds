// Four Seasons — a generative score, composed live with the Web Audio API (no audio files).
//
// v2. Each season has a real chord progression with smooth voice leading, played on a
// soft "felt" piano. On top sits a melody built from one four-note motif shared by every
// season. The melody is remembered: each time the progression comes round, it is played
// again, varied a little, or left out to breathe, so the ear has something to hold on to.
// Two arrangements are available:
//   'piano'   — intimate felt piano with small seasonal colours (harp, birds, celesta, wind)
//   'strings' — the same piano carried on a warm string section
// A slow "breath" curve shapes density and loudness over each minute or so.

const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const chance = p => Math.random() < p;

// Voicings are semitones above the key root; the first note is the chord's bass.
const SEASONS = [
  { // Spring — D major. Light, rising broken chords; harp and birdsong.
    name: 'spring', root: 50, bpm: 76, scale: [0, 2, 4, 6, 7, 9, 11], gain: 1.0,
    chords: [[0, 7, 14, 16], [5, 12, 16, 21], [-3, 7, 12, 16], [-5, 7, 11, 14]],
    accomp: 'rise', mel: [[0, 3, 4, 6, 8, 12], [0, 2, 4, 8, 10], [0, 3, 4, 6, 8], [0, 4, 8]],
    melLo: 74, melHi: 88, contour: [1, 1, -1, 1], orn: { harp: 0.35, birds: true },
  },
  { // Summer — F major. Warm, syncopated, fuller; the strings swell.
    name: 'summer', root: 53, bpm: 84, scale: [0, 2, 4, 5, 7, 9, 11], gain: 0.95,
    chords: [[0, 7, 11, 16], [4, 11, 14, 19], [5, 12, 16, 21], [7, 14, 17, 19]],
    accomp: 'pulse', mel: [[0, 3, 6, 8, 11], [2, 4, 6, 8, 12], [0, 3, 6, 8, 11], [0, 6, 8]],
    melLo: 72, melHi: 86, contour: [1, -1, 1, 1], orn: { shimmer: true }, warm: 1.3,
  },
  { // Autumn — A minor. Slower, notes falling one by one; wind through leaves.
    name: 'autumn', root: 57, bpm: 64, scale: [0, 2, 3, 5, 7, 8, 10], gain: 1.0,
    chords: [[0, 7, 10, 15], [-4, 3, 7, 12], [3, 10, 14, 19], [-2, 5, 10, 14]],
    accomp: 'fall', mel: [[0, 4, 8, 10, 12], [0, 6, 8], [0, 4, 6, 8, 12], [0, 8]],
    melLo: 69, melHi: 84, contour: [-1, -1, 1, -1], orn: { wind: 0.045 },
  },
  { // Winter — E minor. Sparse, long silences, celesta doubling, snow wind.
    name: 'winter', root: 52, bpm: 56, scale: [0, 2, 3, 5, 7, 8, 10], gain: 1.25,
    chords: [[0, 7, 14, 15], [-4, 3, 7, 12], [5, 12, 15, 20], [-5, 2, 5, 10]],
    accomp: 'sparse', mel: [[0, 8], [4, 12], [0, 6, 8], [0]],
    melLo: 76, melHi: 90, contour: [1, -1, -1, 1], orn: { celesta: true, wind: 0.06 },
  },
];

const STEPS = 16; // eighth notes per chord (two bars of 4/4)

export class SeasonMusic {
  constructor(style = 'piano') {
    this.style = style;
    this.ctx = null;
    this.season = 0;
    this.layer = null;
    this.muted = true;
    this.lastSparkle = 0;
  }

  start() {
    if (!this.ctx) this._build();
    this.ctx.resume();
    this.muted = false;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(1, t, 0.8);
    if (!this.layer) this._startLayer(this.season);
  }
  stop() {
    if (!this.ctx) return;
    this.muted = true;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(0, t, 0.4);
  }
  toggle() { this.muted ? this.start() : this.stop(); return !this.muted; }

  setSeason(i) {
    if (i === this.season && this.layer) return;
    this.season = i;
    if (!this.ctx || !this.layer) return;
    this._endLayer(this.layer, 3.5);
    this._startLayer(i);
  }

  setStyle(style) {
    if (style === this.style) return;
    this.style = style;
    if (this.ctx && this.layer) { this._endLayer(this.layer, 2.5); this._startLayer(this.season); }
  }

  // a soft extra note when the visitor stirs the breeze; strength 0..1
  sparkle(strength = 0.5) {
    if (!this.ctx || this.muted || !this.layer) return;
    const now = this.ctx.currentTime;
    if (now - this.lastSparkle < 0.25) return;
    this.lastSparkle = now;
    const L = this.layer, c = L.s.chords[L.chordIdx % 4];
    const m = L.s.root + c[1 + Math.floor(Math.random() * 3)] + 24;
    this._celesta(L, m, now + 0.01, 0.1 + 0.12 * strength, L.orn);
  }

  // ───────────────────────── graph ─────────────────────────
  _build() {
    const ctx = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = ctx.createGain(); this.master.gain.value = 0;
    const comp = this.comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 2.5; comp.attack.value = 0.03; comp.release.value = 0.5;
    const out = ctx.createGain(); out.gain.value = 1.2;
    this.master.connect(comp).connect(out).connect(ctx.destination);
    this.out = out;

    // hall: generated impulse, short pre-delay
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this._impulse(6, 2.4);
    const pre = ctx.createDelay(0.2); pre.delayTime.value = 0.025;
    this.revIn = ctx.createGain();
    const wet = ctx.createGain(); wet.gain.value = 0.62;
    this.revIn.connect(pre).connect(this.reverb).connect(wet).connect(this.master);

    // soft ping-pong echo for the melody
    this.delIn = ctx.createGain();
    const merger = ctx.createChannelMerger(2);
    const dl = ctx.createDelay(2), dr = ctx.createDelay(2);
    const fb = ctx.createGain(); fb.gain.value = 0.32;
    const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 2600;
    this.delIn.connect(tone).connect(dl);
    dl.connect(dr); dr.connect(fb).connect(dl);
    dl.connect(merger, 0, 0); dr.connect(merger, 0, 1);
    const dwet = ctx.createGain(); dwet.gain.value = 0.5;
    merger.connect(dwet).connect(this.master);
    dwet.connect(this.revIn);
    this.delays = [dl, dr];

    this.noise = this._noiseBuffer(4);
  }

  _impulse(seconds, decay) {
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / len;
        const k = 0.5 - 0.42 * t; // gets darker as it decays, like a real room
        lp += k * ((Math.random() * 2 - 1) - lp);
        d[i] = lp * Math.pow(1 - t, decay) * (i < 300 ? i / 300 : 1);
      }
    }
    return buf;
  }
  _noiseBuffer(seconds) {
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // ───────────────────────── layers ─────────────────────────
  _bus(L, dry, rev, del = 0) {
    const ctx = this.ctx, b = ctx.createGain();
    const d = ctx.createGain(); d.gain.value = dry; b.connect(d).connect(L.out);
    const r = ctx.createGain(); r.gain.value = rev; b.connect(r).connect(L.rev);
    if (del) { const e = ctx.createGain(); e.gain.value = del; b.connect(e).connect(L.del); }
    return b;
  }

  _startLayer(i) {
    const ctx = this.ctx, s = SEASONS[i], t = ctx.currentTime;
    const strings = this.style === 'strings';
    const L = { s, alive: true, nodes: [], persist: [], timers: [], strings };
    // fade-able outputs
    L.out = ctx.createGain(); L.rev = ctx.createGain(); L.del = ctx.createGain();
    for (const g of [L.out, L.rev, L.del]) { g.gain.value = 0; g.gain.setTargetAtTime(s.gain, t + 0.2, 1.2); }
    L.out.connect(this.master); L.rev.connect(this.revIn); L.del.connect(this.delIn);

    L.piano = this._bus(L, 0.75, 0.5);
    L.melody = this._bus(L, 0.85, 0.5, 0.16);
    L.pad = this._bus(L, 0.55, 0.85);
    L.orn = this._bus(L, 0.45, 0.9, 0.1);

    const beat = 60 / s.bpm;
    this.delays[0].delayTime.setTargetAtTime(beat * 0.75, t, 0.5);
    this.delays[1].delayTime.setTargetAtTime(beat * 0.75, t, 0.5);

    Object.assign(L, {
      step: 0, chordIdx: 0, cycle: 0, next: t + 0.6, t0: t,
      phrase: null, play: null, prevMel: s.melLo + 5,
    });
    this.layer = L;
    if (s.orn.wind) this._wind(L, s.orn.wind);
    const tick = () => { if (L.alive) this._schedule(L); };
    L.timers.push(setInterval(tick, 50));
    tick();
  }

  _endLayer(L, fade) {
    L.alive = false;
    L.timers.forEach(clearInterval);
    const t = this.ctx.currentTime;
    for (const g of [L.out, L.rev, L.del]) {
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0, t + fade);
    }
    setTimeout(() => {
      [...L.nodes, ...L.persist].forEach(n => { try { n.stop(); } catch (e) {} });
      [L.out, L.rev, L.del].forEach(g => g.disconnect());
    }, (fade + 0.6) * 1000);
  }

  // 0..1, rises and falls over roughly a minute
  _breath(L, t) {
    const x = t - L.t0;
    return clamp(0.55 + 0.25 * Math.sin(x * 0.11 - 1.2) + 0.12 * Math.sin(x * 0.047 + 0.7) + 0.08 * Math.sin(x * 0.023 + 3), 0, 1);
  }

  _schedule(L) {
    const ctx = this.ctx, s = L.s, ahead = ctx.currentTime + 0.3;
    while (L.next < ahead) {
      const t = L.next, br = this._breath(L, t);
      const step = L.step, ci = L.chordIdx % 4, chord = s.chords[ci];

      if (step === 0) {
        if (ci === 0) this._newCycle(L, br);
        const len = (60 / s.bpm) * STEPS / 2;
        this._bass(L, chord, t, len, br);
        this._pad(L, chord, t, len, br);
        if (s.orn.harp && ci === 0 && L.cycle > 0 && chance(s.orn.harp)) this._harpGliss(L, t + len * 0.5);
        if (s.orn.birds && chance(0.4)) this._bird(L, t + rand(0.5, len));
        if (s.orn.shimmer && chance(0.6)) this._celesta(L, s.root + chord[1 + Math.floor(Math.random() * 3)] + 36, t + rand(1, len), 0.045, L.orn);
      }
      this._accomp(L, chord, step, t, br);
      const ev = L.play && L.play[ci * STEPS + step];
      if (ev) {
        const at = t + rand(-0.01, 0.015) + (step === 0 ? 0.02 : 0); // a touch of rubato
        const v = ev.v * (0.75 + 0.4 * br);
        this._piano(L, ev.m, at, v, L.melody, 0.15);
        if (s.orn.celesta && ev.first) this._celesta(L, ev.m + 12, at + 0.01, v * 0.5, L.orn);
        L.prevMel = ev.m;
      }

      // advance, with a slow tempo breath (±3%) so it never feels quantised
      const beat = 60 / (s.bpm * (0.985 + 0.03 * br));
      const swing = s.accomp === 'pulse' ? (step % 2 === 0 ? 1.08 : 0.92) : 1;
      L.next += beat / 2 * swing;
      L.step = (step + 1) % STEPS;
      if (L.step === 0) L.chordIdx++;
    }
  }

  // ── melody memory: compose once, then repeat / vary / rest ──
  _newCycle(L, br) {
    const s = L.s;
    if (L.cycle === 0) {                                   // harmony first; the theme enters halfway
      L.phrase = this._compose(L);
      L.play = Object.fromEntries(Object.entries(L.phrase).filter(([k]) => +k >= 2 * STEPS));
    }
    else {
      const r = Math.random();
      if (br < 0.3 && r < 0.6) L.play = null;              // breathe out
      else if (r < 0.45) L.play = L.phrase;                // the theme again
      else if (r < 0.85) L.play = this._vary(L, L.phrase); // the theme, changed a little
      else { L.phrase = this._compose(L); L.play = L.phrase; } // a new theme
    }
    L.cycle++;
  }

  _scaleNotes(s, lo, hi) {
    const out = [];
    for (let m = lo; m <= hi; m++) if (s.scale.includes(((m - s.root) % 12 + 12) % 12)) out.push(m);
    return out;
  }

  _compose(L) {
    const s = L.s, notes = this._scaleNotes(s, s.melLo, s.melHi);
    const ev = {};
    let cur = L.prevMel;
    s.mel.forEach((rhythm, ci) => {
      const chord = s.chords[ci];
      const tones = notes.filter(m => chord.some(c => ((m - s.root - c) % 12 + 12) % 12 === 0));
      rhythm.forEach((st, k) => {
        let m;
        if (k === 0) { // strong beat: nearest chord tone, nudged by the motif's contour
          const dir = s.contour[ci];
          const cand = tones.filter(x => dir > 0 ? x >= cur - 1 : x <= cur + 1);
          const pool = cand.length ? cand : tones;
          m = pool.reduce((a, b) => Math.abs(b - cur - dir * 2) < Math.abs(a - cur - dir * 2) ? b : a);
        } else { // weak beats: step through the scale, mostly following the contour
          const idx = notes.indexOf(cur);
          const dir = chance(0.75) ? s.contour[(ci + k) % 4] : -s.contour[(ci + k) % 4];
          const j = clamp(idx + dir * (chance(0.8) ? 1 : 2), 0, notes.length - 1);
          m = notes[idx < 0 ? 0 : j];
        }
        // final note of the phrase settles on a chord tone
        if (ci === 3 && k === rhythm.length - 1) m = tones.reduce((a, b) => Math.abs(b - cur) < Math.abs(a - cur) ? b : a);
        ev[ci * STEPS + st] = { m, v: k === 0 ? 0.5 : 0.36, first: k === 0 };
        cur = m;
      });
    });
    return ev;
  }

  _vary(L, phrase) {
    const s = L.s, notes = this._scaleNotes(s, s.melLo - 2, s.melHi + 2);
    const out = {};
    const keys = Object.keys(phrase).map(Number);
    const change = new Set([keys[1 + Math.floor(Math.random() * (keys.length - 1))], keys[1 + Math.floor(Math.random() * (keys.length - 1))]]);
    for (const k of keys) {
      const e = phrase[k];
      if (change.has(k) && !e.first) {
        const i = notes.indexOf(e.m);
        out[k] = { ...e, m: notes[clamp(i + (chance(0.5) ? 1 : -1), 0, notes.length - 1)] ?? e.m };
      } else if (!e.first && chance(0.12)) {
        continue; // drop a passing note
      } else out[k] = e;
    }
    return out;
  }

  // ── accompaniment patterns ──
  _accomp(L, chord, step, t, br) {
    const s = L.s, r = s.root, soft = L.strings ? 0.75 : 1;
    const v = (x) => x * soft * (0.7 + 0.5 * br);
    const up = chord.slice(1).map(c => r + c);
    const play = (m, vel, pan) => this._piano(L, m, t + rand(0, 0.012), v(vel), L.piano, pan);
    switch (s.accomp) {
      case 'rise': { // gentle rising eighths across two octaves
        const seq = [up[0], up[1], up[2], up[0] + 12, up[1] + 12, up[2] + 12, up[1] + 12, up[0] + 12];
        if (step % 2 === 1 || br > 0.55) if (!chance(0.18)) play(seq[step % 8], step % 4 === 0 ? 0.26 : 0.18);
        break;
      }
      case 'pulse': { // syncopated warm chords
        const hits = { 0: 1, 3: 0.7, 6: 0.85, 8: 0.9, 11: 0.7, 14: 0.6 };
        if (hits[step] && !(step > 8 && br < 0.35)) up.forEach((m, i) => play(m, 0.13 * hits[step] * (i === 2 ? 0.8 : 1)));
        break;
      }
      case 'fall': { // slow descending arpeggio, one note per beat
        if (step % 2 === 0) {
          const seq = [up[2] + 12, up[1] + 12, up[0] + 12, up[2], up[1], up[0], up[1], up[2]];
          if (!chance(0.15)) play(seq[(step / 2) % 8], step % 8 === 0 ? 0.27 : 0.2);
        }
        break;
      }
      case 'sparse': { // a few notes, far apart
        if (step === 0) play(up[1], 0.24);
        if (step === 6 && chance(0.7)) play(up[2] + 12, 0.17);
        if (step === 11 && chance(0.45)) play(up[0] + 12, 0.15);
        break;
      }
    }
  }

  // ───────────────────────── instruments ─────────────────────────
  _piano(L, midi, t, vel, bus, pan = null) {
    const ctx = this.ctx, f = mtof(midi);
    const p = ctx.createStereoPanner();
    p.pan.value = pan ?? clamp((midi - 62) / 40, -0.55, 0.55);
    p.connect(bus);
    const decay = clamp(7.5 * Math.pow(220 / f, 0.5), 1.4, 9);
    // felt: a lowpass that closes as the note decays
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.4;
    const open = Math.min(9000, f * (2.5 + vel * 9));
    lp.frequency.setValueAtTime(open, t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(f * 1.2, 200), t + Math.min(decay, 2.5));
    lp.connect(p);
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(vel * 0.5, t + 0.006);
    amp.gain.exponentialRampToValueAtTime(vel * 0.22, t + 0.25);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    amp.connect(lp);
    const B = 0.00035; // string stiffness: partials sit slightly sharp, as on a real piano
    for (let n = 1; n <= 6; n++) {
      const fn = f * n * Math.sqrt(1 + B * n * n);
      if (fn > 14000) break;
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = fn;
      o.detune.value = rand(-2, 2);
      const g = ctx.createGain();
      const a = 1 / Math.pow(n, 1.35) * (n === 2 ? 0.8 : 1);
      g.gain.setValueAtTime(a, t);
      g.gain.exponentialRampToValueAtTime(a * 0.02, t + decay / (1 + 0.7 * (n - 1)));
      o.connect(g).connect(amp);
      o.start(t); o.stop(t + decay + 0.05);
      L.nodes.push(o);
    }
    // the felt hammer: a tiny, soft thump of noise
    const h = ctx.createBufferSource(); h.buffer = this.noise;
    const hb = ctx.createBiquadFilter(); hb.type = 'bandpass'; hb.frequency.value = Math.min(4000, f * 3); hb.Q.value = 1.2;
    const hg = ctx.createGain();
    hg.gain.setValueAtTime(vel * 0.05, t); hg.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
    h.connect(hb).connect(hg).connect(p);
    h.start(t, Math.random() * 3, 0.05);
    L.nodes.push(h);
    this._trim(L);
  }

  _celesta(L, midi, t, vel, bus) {
    const ctx = this.ctx, f = mtof(midi);
    const p = ctx.createStereoPanner(); p.pan.value = rand(-0.5, 0.5); p.connect(bus);
    for (const [r, g, d] of [[1, 1, 3.2], [3.01, 0.2, 1.2], [4.98, 0.06, 0.5]]) {
      if (f * r > 15000) continue;
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * r;
      const gn = ctx.createGain();
      gn.gain.setValueAtTime(0.0001, t);
      gn.gain.exponentialRampToValueAtTime(vel * g * 0.4, t + 0.004);
      gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(gn).connect(p); o.start(t); o.stop(t + d + 0.05);
      L.nodes.push(o);
    }
  }

  _harp(L, midi, t, vel) {
    const ctx = this.ctx, f = mtof(midi);
    const p = ctx.createStereoPanner(); p.pan.value = clamp((midi - 70) / 30, -0.7, 0.7); p.connect(L.orn);
    for (const [r, g, d, w] of [[1, 1, 2.4, 'triangle'], [2, 0.3, 1.1, 'sine']]) {
      const o = ctx.createOscillator(); o.type = w; o.frequency.value = f * r;
      const gn = ctx.createGain();
      gn.gain.setValueAtTime(0.0001, t);
      gn.gain.exponentialRampToValueAtTime(vel * g * 0.35, t + 0.003);
      gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(gn).connect(p); o.start(t); o.stop(t + d + 0.05);
      L.nodes.push(o);
    }
  }

  _harpGliss(L, t) {
    const s = L.s, notes = this._scaleNotes(s, s.root + 14, s.root + 38);
    const n = 7 + Math.floor(Math.random() * 5);
    for (let i = 0; i < n; i++) this._harp(L, notes[Math.min(i, notes.length - 1)], t + i * 0.055, 0.12 + i * 0.008);
  }

  _bass(L, chord, t, len, br) {
    const ctx = this.ctx, s = L.s, m = s.root + chord[0] - 12;
    // a low piano note on the change, plus a quiet sine underneath for warmth
    this._piano(L, m, t, 0.22 * (0.75 + 0.35 * br), L.piano, -0.2);
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = mtof(m);
    const g = ctx.createGain(), lvl = 0.02 * (s.warm || 1);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(lvl, t + 1.5);
    g.gain.setValueAtTime(lvl, t + len - 0.3);
    g.gain.linearRampToValueAtTime(0.0001, t + len + 1.5);
    o.connect(g).connect(L.pad);
    o.start(t); o.stop(t + len + 1.6);
    L.nodes.push(o);
  }

  // a string section (or, in the piano arrangement, a faint bowed halo)
  _pad(L, chord, t, len, br) {
    const ctx = this.ctx, s = L.s;
    const level = (L.strings ? 0.085 : 0.028) * (s.warm || 1) * (0.6 + 0.6 * br);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 140;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.5;
    const cut = L.strings ? 2000 : 1300;
    lp.frequency.setValueAtTime(cut * 0.55, t);
    lp.frequency.linearRampToValueAtTime(cut, t + len * 0.6);
    lp.frequency.linearRampToValueAtTime(cut * 0.6, t + len + 3);
    const g = ctx.createGain();
    const atk = Math.min(2.6, len * 0.3), rel = 3.5;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(level, t + atk);
    g.gain.setValueAtTime(level, t + len - 0.2);
    g.gain.linearRampToValueAtTime(0.0001, t + len + rel);
    hp.connect(lp).connect(g).connect(L.pad);
    // vibrato that arrives late, as a player would add it
    const lfo = ctx.createOscillator(); lfo.frequency.value = rand(4.6, 5.4);
    const depth = ctx.createGain(); depth.gain.setValueAtTime(0, t); depth.gain.linearRampToValueAtTime(5, t + atk + 0.6);
    lfo.connect(depth); lfo.start(t); lfo.stop(t + len + rel + 0.1); L.nodes.push(lfo);
    chord.slice(1).forEach(c => {
      const f = mtof(s.root + c + (L.strings ? 0 : 12));
      for (const det of [-9, 0, 8]) {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det + rand(-2, 2);
        depth.connect(o.detune);
        const og = ctx.createGain(); og.gain.value = 0.2;
        o.connect(og).connect(hp);
        o.start(t + rand(0, 0.15)); o.stop(t + len + rel + 0.1);
        L.nodes.push(o);
      }
    });
    if (L.strings) { // cellos on the bass note
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(s.root + chord[0] - 12);
      depth.connect(o.detune);
      const og = ctx.createGain(); og.gain.value = 0.22;
      const clp = ctx.createBiquadFilter(); clp.type = 'lowpass'; clp.frequency.value = 700;
      o.connect(og).connect(clp).connect(g);
      o.start(t); o.stop(t + len + rel + 0.1); L.nodes.push(o);
    }
  }

  _bird(L, t) {
    const ctx = this.ctx, n = 2 + Math.floor(Math.random() * 3), pan = rand(-0.8, 0.8), base = rand(2800, 3800);
    for (let i = 0; i < n; i++) {
      const at = t + i * rand(0.09, 0.15);
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(base * rand(0.9, 1.05), at);
      o.frequency.exponentialRampToValueAtTime(base * rand(1.25, 1.5), at + 0.06);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.012, at + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.08);
      const p = ctx.createStereoPanner(); p.pan.value = pan;
      o.connect(g).connect(p).connect(L.orn); o.start(at); o.stop(at + 0.12);
      L.nodes.push(o);
    }
  }

  _wind(L, amount) {
    const ctx = this.ctx, s = L.s;
    const src = ctx.createBufferSource(); src.buffer = this.noise; src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.7;
    bp.frequency.value = s.name === 'winter' ? 500 : 800;
    const g = ctx.createGain(); g.gain.value = 0;
    const p = ctx.createStereoPanner();
    src.connect(bp).connect(g).connect(p).connect(L.out);
    src.start();
    L.persist.push(src);
    const drift = () => {
      if (!L.alive) return;
      const t = ctx.currentTime, br = this._breath(L, t);
      bp.frequency.setTargetAtTime(rand(280, s.name === 'winter' ? 850 : 1300), t, 2.5);
      g.gain.setTargetAtTime(amount * rand(0.3, 1) * (0.4 + br), t, 2.5);
      p.pan.setTargetAtTime(rand(-0.6, 0.6), t, 3);
    };
    drift();
    L.timers.push(setInterval(drift, 3000));
  }

  _trim(L) { if (L.nodes.length > 600) L.nodes = L.nodes.slice(-300); }
}
