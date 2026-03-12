import { audioManager } from '../AudioManager.js';
import { musicManager } from '../MusicManager.js';

const MUSIC_KEYS = ['type1', 'type2', 'type3'];

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LevelSelectScene' });
  }

  preload() {
    this.load.image('levelselect', 'img/game/levelselect.png');
    this.load.audio('type1', 'music/type1.mp3');
    this.load.audio('type2', 'music/type2.mp3');
    this.load.audio('type3', 'music/type3.mp3');
  }

  create() {
    audioManager.resume();

    const W = this.scale.width;
    const H = this.scale.height;

    // Scrolling tiled background
    this.bg = this.add.tileSprite(W / 2, H / 2, W, H, 'levelselect');

    // Settings state
    this.settings = {
      level: { values: [1,2,3,4,5,6,7,8,9], index: 0 },
      speed: { values: ['Slow', 'Medium', 'Fast'], index: 0 },
      music: { values: ['Type 1', 'Type 2', 'Type 3', 'None'], index: 0 }
    };
    this.settingKeys = ['level', 'speed', 'music'];

    // Rows: 0=level, 1=speed, 2=music, 3=return button, 4=start button
    this.cursorRow = 0;
    this.totalRows = 5;

    this._buildUI(W, H);
    this._setupKeys();

    // Start playing default music (Type 1)
    musicManager.play(this, 'type1');
  }

  _buildUI(W, H) {
    const panelX = W / 2;
    const startY = 120;
    const textOffsetY = 20; // Offset to shift text down within panel
    const rowH = 80;

    // Title
    this.add.text(panelX, startY - 50, 'Game Settings', {
      fontFamily: 'monospace',
      fontSize: '40px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5, 0.5);

    // Panel background
    const panelW = 600;
    const panelH = 440;
    const panelY = startY + rowH * 2 + 10;
    const panel = this.add.graphics();
    panel.fillStyle(0x000000, 0.8);
    panel.fillRoundedRect(panelX - panelW / 2, startY - 10, panelW, panelH, 12);
    panel.lineStyle(2, 0x4488ff, 0.8);
    panel.strokeRoundedRect(panelX - panelW / 2, startY - 10, panelW, panelH, 12);

    // Cursor arrow
    this.cursorArrow = this.add.text(panelX - 250, startY + textOffsetY, '▶', {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#ffff00'
    }).setOrigin(0.5, 0.5);

    // Setting rows
    const labels = ['Starting Level', 'Speed', 'Music'];
    this.valueTexts = [];

    labels.forEach((label, i) => {
      const y = startY + textOffsetY + i * rowH;
      this.add.text(panelX - 180, y, label + ':', {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#cccccc'
      }).setOrigin(0, 0.5);

      this.add.text(panelX + 60, y, '◀', {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#aaaaaa'
      }).setOrigin(0.5, 0.5);

      const valText = this.add.text(panelX + 130, y, '', {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#ffffff'
      }).setOrigin(0.5, 0.5);
      this.valueTexts.push(valText);

      this.add.text(panelX + 200, y, '▶', {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#aaaaaa'
      }).setOrigin(0.5, 0.5);
    });

    // Button rows
    const btnY0 = startY + textOffsetY + 3 * rowH + 20;
    const btnY1 = startY + textOffsetY + 4 * rowH + 20;

    this.btnReturnBg = this.add.graphics();
    this.btnStartBg = this.add.graphics();

    this.btnReturnText = this.add.text(panelX, btnY0, 'Return to Title', {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5, 0.5);

    this.btnStartText = this.add.text(panelX, btnY1, 'Start Game', {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#00ff88',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5, 0.5);

    this.rowYPositions = [
      startY + textOffsetY,
      startY + textOffsetY + rowH,
      startY + textOffsetY + 2 * rowH,
      btnY0,
      btnY1
    ];

    this._refreshValues();
    this._moveCursor(0);
  }

  _refreshValues() {
    this.settingKeys.forEach((key, i) => {
      const s = this.settings[key];
      this.valueTexts[i].setText(String(s.values[s.index]));
    });
  }

  _moveCursor(newRow) {
    this.cursorRow = newRow;
    const y = this.rowYPositions[newRow];
    this.cursorArrow.setY(y);
    audioManager.playMenuBeep();
  }

  _changeValue(dir) {
    if (this.cursorRow >= this.settingKeys.length) return;
    const key = this.settingKeys[this.cursorRow];
    const s = this.settings[key];
    s.index = (s.index + dir + s.values.length) % s.values.length;
    this._refreshValues();

    // Update music if music row changed
    if (key === 'music') {
      const val = s.values[s.index];
      if (val === 'None') {
        musicManager.stop();
      } else {
        const musicKey = MUSIC_KEYS[s.index];
        musicManager.play(this, musicKey);
      }
    }
  }

  _activate() {
    if (this.cursorRow === 3) {
      // Return to Title
      musicManager.stop();
      audioManager.playMenuBeep();
      this.scene.start('TitleScene');
    } else if (this.cursorRow === 4) {
      // Start Game
      audioManager.playMenuBeep();
      const level = this.settings.level.values[this.settings.level.index];
      const speed = this.settings.speed.values[this.settings.speed.index].toLowerCase();
      const musicIdx = this.settings.music.index;
      const musicType = musicIdx < 3 ? MUSIC_KEYS[musicIdx] : 'none';

      this.scene.start('GameplayScene', { level, speed, musicType });
    }
  }

  _setupKeys() {
    const cursors = this.input.keyboard.createCursorKeys();
    const enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

    // Debounce: only act on key-just-pressed
    this.cursors = cursors;
    this.enterKey = enterKey;
    this.keyRepeatTimer = 0;
    this.keyRepeatDelay = 150;
  }

  update(time, delta) {
    // Scroll background diagonally up-left
    this.bg.tilePositionX -= 0.4;
    this.bg.tilePositionY -= 0.4;

    // Key handling
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
      this._moveCursor((this.cursorRow - 1 + this.totalRows) % this.totalRows);
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
      this._moveCursor((this.cursorRow + 1) % this.totalRows);
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.left)) {
      this._changeValue(-1);
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.right)) {
      this._changeValue(1);
    }
    if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this._activate();
    }
  }
}
