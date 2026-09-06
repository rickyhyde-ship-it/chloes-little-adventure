import { narrationClips, musicPath } from './audio-manifest.js';

const MUSIC_LEVEL = 0.17;
const DUCKED_LEVEL = 0.045;

export class AudioManager {
  constructor() {
    Object.assign(this, { enabled: true, started: false, context: null,
      voiceTicket: 0, musicTicket: 0, narration: null, music: null,
      musicWanted: false, musicOffset: 0, musicLoading: false });
    this.bytes = new Map(); this.buffers = new Map();
    this.effects = new Set(); this.pauseReasons = new Set();
  }

  unlock() {
    this.started = true;
    try {
      if (!this.context) {
        const Context = window.AudioContext || window.webkitAudioContext;
        if (!Context) return;
        this.context = new Context();
        this.master = this.context.createGain();
        this.voiceGain = this.context.createGain();
        this.musicGain = this.context.createGain();
        this.effectGain = this.context.createGain();
        this.voiceGain.gain.value = 0.95;
        this.musicGain.gain.value = 0;
        this.effectGain.gain.value = 0.65;
        this.master.gain.value = this.enabled ? 1 : 0;
        for (const gain of [this.voiceGain, this.musicGain, this.effectGain]) gain.connect(this.master);
        this.master.connect(this.context.destination);
      }
      if (!this.pauseReasons.size) this.context.resume().catch(() => {});
      if (this.musicWanted && this.enabled) this.startMusic();
    } catch { /* Visual gameplay remains available without audio hardware. */ }
  }

  fetchBytes(path) {
    if (!this.bytes.has(path)) {
      const request = fetch(path).then(response => {
        if (!response.ok) throw new Error('Audio unavailable');
        return response.arrayBuffer();
      }).catch(() => { this.bytes.delete(path); return null; });
      this.bytes.set(path, request);
    }
    return this.bytes.get(path);
  }

  async buffer(path) {
    if (!this.context) return null;
    if (!this.buffers.has(path)) {
      this.buffers.set(path, this.fetchBytes(path).then(bytes => bytes
        ? this.context.decodeAudioData(bytes.slice(0)) : null).catch(() => null));
    }
    return this.buffers.get(path);
  }

  preload(paths = [...Object.values(narrationClips), musicPath]) {
    // Fetching files is silent; the AudioContext is created only after a tap.
    paths.forEach(path => this.fetchBytes(path));
  }

  fade(gain, level, seconds = 0.18) {
    if (!gain || !this.context) return;
    const now = this.context.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(level, now + seconds);
  }

  cancelNarration() {
    this.voiceTicket++;
    if (this.narration) {
      const voice = this.narration;
      this.narration = null;
      try { voice.source.stop(); } catch {}
      voice.resolve(false);
    }
    this.fade(this.musicGain, MUSIC_LEVEL, 0.35);
  }

  say(text) {
    // Never fall back to a device's robotic speech-synthesis voice.
    const path = narrationClips[text];
    return path ? this.playFile(path) : Promise.resolve(false);
  }

  async playFile(path, channel = 'narration') {
    if (!path || !this.enabled || !this.started || !this.context) return false;
    if (channel !== 'narration') return this.playEffectFile(path);
    this.cancelNarration();
    const ticket = this.voiceTicket;
    const buffer = await this.buffer(path);
    if (!buffer || ticket !== this.voiceTicket || !this.enabled) return false;
    return new Promise(resolve => {
      const source = this.context.createBufferSource();
      source.buffer = buffer; source.connect(this.voiceGain);
      this.narration = { source, resolve, path };
      this.fade(this.musicGain, DUCKED_LEVEL, 0.12);
      source.onended = () => {
        source.disconnect();
        if (ticket === this.voiceTicket) {
          this.narration = null;
          this.fade(this.musicGain, MUSIC_LEVEL, 0.45);
        }
        resolve(true);
      };
      try { source.start(); } catch { this.narration = null; resolve(false); }
    });
  }

  async startMusic() {
    this.musicWanted = true;
    if (!this.enabled || !this.context || this.music || this.musicLoading) return;
    const ticket = ++this.musicTicket;
    this.musicLoading = true;
    const buffer = await this.buffer(musicPath);
    if (ticket !== this.musicTicket) return;
    this.musicLoading = false;
    if (!buffer || !this.musicWanted || !this.enabled) return;
    const source = this.context.createBufferSource();
    source.buffer = buffer; source.loop = true; source.connect(this.musicGain);
    const offset = this.musicOffset % buffer.duration;
    this.music = { source, start: this.context.currentTime, offset, duration: buffer.duration };
    source.onended = () => source.disconnect();
    this.fade(this.musicGain, this.narration ? DUCKED_LEVEL : MUSIC_LEVEL, 0.8);
    try { source.start(0, offset); } catch { this.music = null; }
  }

  stopMusic(reset = false) {
    this.musicTicket++; this.musicLoading = false;
    if (this.music) {
      const music = this.music;
      this.musicOffset = (this.context.currentTime - music.start + music.offset) % music.duration;
      this.music = null;
      try { music.source.stop(); } catch {}
    }
    if (reset) this.musicOffset = 0;
    this.fade(this.musicGain, 0, 0.05);
  }

  setPaused(reason, paused) {
    if (paused) this.pauseReasons.add(reason); else this.pauseReasons.delete(reason);
    if (this.context) this.context[this.pauseReasons.size ? 'suspend' : 'resume']().catch(() => {});
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.master) this.master.gain.value = this.enabled ? 1 : 0;
    if (!this.enabled) { this.cancelNarration(); this.stopMusic(); this.stopEffects(); }
    else this.unlock();
    return this.enabled;
  }

  stopEffects() {
    this.effects.forEach(source => { try { source.stop(); } catch {} });
    this.effects.clear();
  }

  stop() {
    this.musicWanted = false;
    this.cancelNarration(); this.stopMusic(true); this.stopEffects();
  }

  effect(kind = 'success') {
    if (!this.enabled || !this.context || this.pauseReasons.size) return;
    try {
      const notes = kind === 'tap' ? [440] : kind === 'munch' ? [240, 320] : [523, 659, 784];
      notes.forEach((frequency, i) => {
        const source = this.context.createOscillator(), gain = this.context.createGain();
        const start = this.context.currentTime + i * 0.13;
        source.type = 'sine'; source.frequency.value = frequency;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.035, start + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
        source.connect(gain); gain.connect(this.effectGain); this.effects.add(source);
        source.onended = () => { this.effects.delete(source); source.disconnect(); gain.disconnect(); };
        source.start(start); source.stop(start + 0.32);
      });
    } catch {}
  }

  async playEffectFile(path) {
    const ticket = this.voiceTicket, buffer = await this.buffer(path);
    if (!buffer || !this.enabled || ticket !== this.voiceTicket) return false;
    const source = this.context.createBufferSource();
    source.buffer = buffer; source.connect(this.effectGain); this.effects.add(source);
    source.onended = () => { this.effects.delete(source); source.disconnect(); };
    try { source.start(); return true; } catch { this.effects.delete(source); return false; }
  }
}

export const audio = new AudioManager();
