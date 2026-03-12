class AudioManager {
  constructor() {
    this.ctx = null;
  }

  _init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Resume context after a user gesture (required by browsers)
  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  _playTone(startFreq, endFreq, type, duration, volume = 0.3) {
    this._init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
    if (endFreq !== startFreq) {
      osc.frequency.linearRampToValueAtTime(endFreq, this.ctx.currentTime + duration);
    }
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + duration);
  }

  _playNoise(durationSec, cutoffStart, cutoffEnd, volume = 0.4) {
    this._init();
    const bufferSize = Math.floor(this.ctx.sampleRate * durationSec);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoffStart, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(cutoffEnd, this.ctx.currentTime + durationSec);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + durationSec);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    source.start();
  }

  // Short ascending chirp when piece rotates
  playChirp() {
    this._playTone(440, 880, 'sine', 0.08, 0.25);
  }

  // Short thud when piece is placed
  playCollision() {
    this._playNoise(0.1, 200, 80, 0.3);
    this._playTone(120, 80, 'sine', 0.1, 0.2);
  }

  // Descending zap when a block is destroyed
  playZap() {
    this._playTone(800, 150, 'square', 0.12, 0.2);
  }

  // Low boom when a bomb is destroyed
  playBoom() {
    this._playNoise(0.5, 400, 40, 0.6);
    this._playTone(80, 30, 'sawtooth', 0.4, 0.5);
  }

  // Sad descending scale on game over
  playGameOver() {
    this._init();
    const notes = [523, 494, 440, 392, 349, 294, 262]; // C5 → C4 descending
    notes.forEach((freq, i) => {
      const t = this.ctx.currentTime + i * 0.18;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.start(t);
      osc.stop(t + 0.15);
    });
  }

  // Short beep for UI navigation
  playMenuBeep() {
    this._playTone(660, 660, 'sine', 0.06, 0.15);
  }

  // Happy ascending jingle when level is completed
  playLevelComplete() {
    this._init();
    // Happy ascending arpeggio: C5, E5, G5, C6
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const t = this.ctx.currentTime + i * 0.1;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }
}

export const audioManager = new AudioManager();
