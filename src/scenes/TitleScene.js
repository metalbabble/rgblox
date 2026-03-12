import { audioManager } from '../AudioManager.js';
import { musicManager } from '../MusicManager.js';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TitleScene' });
  }

  preload() {
    this.load.image('title_bg', 'img/game/title_bg.png');
    this.load.image('logo', 'img/game/logo.png');
  }

  create() {
    musicManager.stop();
    audioManager.resume();

    const W = this.scale.width;
    const H = this.scale.height;

    // Background
    const bg = this.add.image(W / 2, H / 2, 'title_bg');
    bg.setDisplaySize(W, H);

    // Logo — upper area
    const logo = this.add.image(W / 2, 170, 'logo');
    // Scale logo to fit nicely, max width 500
    const maxW = 500;
    if (logo.width > maxW) {
      logo.setScale(maxW / logo.width);
    }

    // Instructions text block
    const instrText =
      'Welcome to RGBlox!\n\n' +
      'Use the arrow keys to maneuver the falling pieces.\n' +
      'Align three or more of the same color to eliminate blocks.\n' +
      'Bomb blocks destroy all blocks of the same color.\n' +
      'The objective is to clear the stage of all blocks!\n\n' +
      'Press ENTER to start!';

    this.add.text(W / 2, 390, instrText, {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 700 },
      lineSpacing: 6,
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5, 0.5);

    // Copyright
    this.add.text(W / 2, H - 30, 'Copyright 2026 metalbabble.com', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#aaaaaa',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5, 0.5);

    // Blinking "Press ENTER" indicator
    const enterText = this.add.text(W / 2, 565, '▶  Press ENTER to start!  ◀', {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#ffff00',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5, 0.5);

    this.tweens.add({
      targets: enterText,
      alpha: 0,
      duration: 600,
      ease: 'Linear',
      yoyo: true,
      repeat: -1
    });

    // Enter key
    const enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    enterKey.once('down', () => {
      audioManager.playMenuBeep();
      this.scene.start('LevelSelectScene');
    });
  }
}
