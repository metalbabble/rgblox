// Manages background music across scene transitions.
// Music objects added via scene.sound (which references game.sound) persist
// across scene changes, so we just keep a reference here.

class MusicManager {
  constructor() {
    this.currentMusic = null;
    this.currentType = 'none';
  }

  play(scene, type) {
    if (type === this.currentType && this.currentMusic && this.currentMusic.isPlaying) {
      return; // Already playing the right track
    }
    this.stop();
    this.currentType = type;
    if (type && type !== 'none') {
      this.currentMusic = scene.sound.add(type, { loop: true, volume: 0.6 });
      this.currentMusic.play();
    }
  }

  stop() {
    if (this.currentMusic) {
      this.currentMusic.stop();
      this.currentMusic.destroy();
      this.currentMusic = null;
    }
    this.currentType = 'none';
  }

  isPlaying() {
    return this.currentMusic && this.currentMusic.isPlaying;
  }
}

export const musicManager = new MusicManager();
