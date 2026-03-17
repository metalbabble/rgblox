import { audioManager } from '../AudioManager.js';
import { musicManager } from '../MusicManager.js';

const BLOCK_SIZE = 32;
const GRID_COLS = 10;
const GRID_ROWS = 20;
const GRID_X = 80;   // screen x of grid left edge
const GRID_Y = 40;   // screen y of grid top edge
const MAX_BG_LEVEL = 9; // highest bg image available

const SPEEDS = { slow: 800, medium: 500, fast: 200 };
const COLORS = ['red', 'green', 'blue'];

// ─── Piece helpers ───────────────────────────────────────────────────────────

function rotateCW(shape, colors) {
  const rows = shape.length;
  const cols = shape[0].length;
  const newShape = [];
  const newColors = [];
  for (let c = 0; c < cols; c++) {
    newShape.push([]);
    newColors.push([]);
    for (let r = rows - 1; r >= 0; r--) {
      newShape[c].push(shape[r][c]);
      newColors[c].push(colors[r][c]);
    }
  }
  return { shape: newShape, colors: newColors };
}

function randomColor() {
  return COLORS[Math.floor(Math.random() * 3)];
}

function buildColors(shape) {
  return shape.map(row => row.map(cell => (cell === 1 ? randomColor() : null)));
}

// ─── Scene ───────────────────────────────────────────────────────────────────

export class GameplayScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameplayScene' });
  }

  init(data) {
    this.startLevel = data.level || 1;
    this.speedName  = data.speed || 'slow';
    this.musicType  = data.musicType || 'none';
    this.touchMode  = data.touchMode || false;
  }

  preload() {
    ['red', 'green', 'blue'].forEach(c => {
      this.load.image(c,           `img/block/${c}.png`);
      this.load.image(`${c}-start`, `img/block/${c}-start.png`);
      this.load.image(`${c}-bomb`,  `img/block/${c}-bomb.png`);
    });

    this.load.image('gameplay', 'img/game/gameplay.png');
    for (let i = 1; i <= MAX_BG_LEVEL; i++) {
      this.load.image(`bg${i}`, `img/bg/bg${i}.png`);
    }

    this.load.json('pieces', 'pieces.json');

    this.load.audio('type1', 'music/type1.mp3');
    this.load.audio('type2', 'music/type2.mp3');
    this.load.audio('type3', 'music/type3.mp3');
  }

  create() {
    audioManager.resume();

    const W = this.scale.width;
    const H = this.scale.height;

    if (this.musicType !== 'none') {
      musicManager.play(this, this.musicType);
    }

    this.add.image(W / 2, H / 2, 'gameplay').setDisplaySize(W, H);

    this.levelBgImage = this.add.image(
      GRID_X + (GRID_COLS * BLOCK_SIZE) / 2,
      GRID_Y + (GRID_ROWS * BLOCK_SIZE) / 2,
      `bg${Math.min(this.startLevel, MAX_BG_LEVEL)}`
    ).setDisplaySize(GRID_COLS * BLOCK_SIZE, GRID_ROWS * BLOCK_SIZE);

    const border = this.add.graphics();
    border.lineStyle(2, 0xffffff, 0.5);
    border.strokeRect(GRID_X, GRID_Y, GRID_COLS * BLOCK_SIZE, GRID_ROWS * BLOCK_SIZE);

    const pg = this.add.graphics();
    pg.fillStyle(0xffffff);
    pg.fillRect(0, 0, 6, 6);
    pg.generateTexture('particle', 6, 6);
    pg.destroy();

    this.currentLevel   = this.startLevel;
    this.score          = 0;
    this.isGameOver     = false;
    this.isProcessing   = false;
    this.pieceData      = this.cache.json.get('pieces').pieces;

    this.sprites        = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(null));
    this.grid           = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(null));
    this.pieceSprites   = [];
    this.previewSprites = [];
    this.fragmentPieces = [];  // { shape, colors, gridX, gridY, sprites, dropTimer }

    this.cursors       = this.input.keyboard.createCursorKeys();
    this.enterKey      = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.moveTimer     = 0;
    this.fastDropTimer = 0;

    // Touch button states
    this.touchLeftDown   = false;
    this.touchRightDown  = false;
    this.touchDownDown   = false;
    this.touchRotateJust = false;

    this._buildInfoPanel();
    this._buildGameOverOverlay();
    if (this.touchMode) this._buildTouchButtons();

    this.dropTimer = null;
    this._initLevel();
  }

  // ── Level init ──────────────────────────────────────────────────────────────

  _initLevel() {
    this._clearFragments();

    const bgKey = `bg${Math.min(this.currentLevel, MAX_BG_LEVEL)}`;
    this.levelBgImage.setTexture(bgKey)
      .setDisplaySize(GRID_COLS * BLOCK_SIZE, GRID_ROWS * BLOCK_SIZE);

    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        this._clearCell(r, c);
      }
    }

    const bombColors = ['red', 'green', 'blue'];
    const bombPositions = this._randomPositions(GRID_ROWS - 2, GRID_ROWS - 1, 3);
    bombColors.forEach((color, i) => {
      const [r, c] = bombPositions[i];
      this._setCell(r, c, { color, blockType: 'bomb' });
    });

    const numBlocks = Math.round(5 + (this.currentLevel - 1) * 35 / 8);
    const available = [];
    for (let r = 8; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (this.grid[r][c] === null) available.push([r, c]);
      }
    }
    Phaser.Utils.Array.Shuffle(available);
    const take = Math.min(numBlocks, available.length);
    for (let i = 0; i < take; i++) {
      const [r, c] = available[i];
      this._setCell(r, c, { color: randomColor(), blockType: 'start' });
    }

    this.nextPieceData = this._generatePiece();
    this._updatePreview();
    this._spawnPiece();
    this._updateInfoText();
  }

  _clearFragments() {
    for (const frag of this.fragmentPieces) {
      if (frag.dropTimer) { frag.dropTimer.remove(); frag.dropTimer = null; }
      frag.sprites.forEach(s => s.destroy());
      frag.sprites = [];
    }
    this.fragmentPieces = [];
  }

  _randomPositions(minRow, maxRow, count) {
    const occupied = new Set();
    const result = [];
    while (result.length < count) {
      const r = Phaser.Math.Between(minRow, maxRow);
      const c = Phaser.Math.Between(0, GRID_COLS - 1);
      const key = `${r},${c}`;
      if (!occupied.has(key)) {
        occupied.add(key);
        result.push([r, c]);
      }
    }
    return result;
  }

  // ── Grid cell management ────────────────────────────────────────────────────

  _setCell(r, c, data) {
    this._clearCell(r, c);
    this.grid[r][c] = data;
    if (data) {
      const x = GRID_X + c * BLOCK_SIZE + BLOCK_SIZE / 2;
      const y = GRID_Y + r * BLOCK_SIZE + BLOCK_SIZE / 2;
      const key = data.blockType === 'normal'
        ? data.color
        : `${data.color}-${data.blockType}`;
      this.sprites[r][c] = this.add.image(x, y, key).setDisplaySize(BLOCK_SIZE, BLOCK_SIZE);
    }
  }

  _clearCell(r, c) {
    if (this.sprites[r][c]) {
      this.sprites[r][c].destroy();
      this.sprites[r][c] = null;
    }
    this.grid[r][c] = null;
  }

  // ── Piece generation ────────────────────────────────────────────────────────

  _generatePiece() {
    const def = this.pieceData[Math.floor(Math.random() * this.pieceData.length)];
    const shape = def.shape.map(row => [...row]);
    return { shape, colors: buildColors(shape) };
  }

  // ── Piece spawning ──────────────────────────────────────────────────────────

  _spawnPiece() {
    if (this.dropTimer) { this.dropTimer.remove(); this.dropTimer = null; }

    const p = this.nextPieceData;
    const gridX = Math.floor((GRID_COLS - p.shape[0].length) / 2);
    const gridY = 0;

    this.activePiece = { shape: p.shape, colors: p.colors, gridX, gridY };

    if (!this._isValidPos(p.shape, gridX, gridY)) {
      this._triggerGameOver();
      return;
    }

    this.nextPieceData = this._generatePiece();
    this._updatePreview();
    this._refreshPieceSprites();

    const interval = SPEEDS[this.speedName] || 500;
    this.dropTimer = this.time.addEvent({
      delay: interval,
      callback: this._stepDown,
      callbackScope: this,
      loop: true
    });
  }

  // ── Movement / rotation ──────────────────────────────────────────────────────

  // excludeFrag: pass a fragment to exclude its own cells from the obstacle check
  // when validating that fragment's movement.
  _isValidPos(shape, gridX, gridY, excludeFrag = null) {
    const fragOccupied = new Set();
    for (const frag of this.fragmentPieces) {
      if (frag === excludeFrag) continue;
      for (let r = 0; r < frag.shape.length; r++) {
        for (let c = 0; c < frag.shape[r].length; c++) {
          if (frag.shape[r][c] === 1) {
            fragOccupied.add(`${frag.gridY + r},${frag.gridX + c}`);
          }
        }
      }
    }

    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] !== 1) continue;
        const gr = gridY + r;
        const gc = gridX + c;
        if (gr < 0 || gr >= GRID_ROWS || gc < 0 || gc >= GRID_COLS) return false;
        if (this.grid[gr][gc] !== null) return false;
        if (fragOccupied.has(`${gr},${gc}`)) return false;
      }
    }
    return true;
  }

  _stepDown() {
    if (!this.activePiece || this.isGameOver || this.isProcessing) return;
    const { shape, gridX, gridY } = this.activePiece;
    if (this._isValidPos(shape, gridX, gridY + 1)) {
      this.activePiece.gridY += 1;
      this._refreshPieceSprites();
    } else {
      this._placePiece();
    }
  }

  _moveLeft() {
    if (!this.activePiece || this.isProcessing) return;
    const { shape, gridX, gridY } = this.activePiece;
    if (this._isValidPos(shape, gridX - 1, gridY)) {
      this.activePiece.gridX -= 1;
      this._refreshPieceSprites();
    }
  }

  _moveRight() {
    if (!this.activePiece || this.isProcessing) return;
    const { shape, gridX, gridY } = this.activePiece;
    if (this._isValidPos(shape, gridX + 1, gridY)) {
      this.activePiece.gridX += 1;
      this._refreshPieceSprites();
    }
  }

  _rotatePiece() {
    if (!this.activePiece || this.isProcessing) return;
    const { shape, colors, gridX, gridY } = this.activePiece;
    const { shape: ns, colors: nc } = rotateCW(shape, colors);
    const offsets = [0, -1, 1, -2, 2];
    for (const off of offsets) {
      if (this._isValidPos(ns, gridX + off, gridY)) {
        this.activePiece.shape  = ns;
        this.activePiece.colors = nc;
        this.activePiece.gridX  = gridX + off;
        this._refreshPieceSprites();
        audioManager.playChirp();
        return;
      }
    }
  }

  // ── Fragment piece movement ──────────────────────────────────────────────────

  _moveFragmentsLeft() {
    for (const frag of this.fragmentPieces) {
      if (this._isValidPos(frag.shape, frag.gridX - 1, frag.gridY, frag)) {
        frag.gridX -= 1;
        this._refreshFragmentSprites(frag);
      }
    }
  }

  _moveFragmentsRight() {
    for (const frag of this.fragmentPieces) {
      if (this._isValidPos(frag.shape, frag.gridX + 1, frag.gridY, frag)) {
        frag.gridX += 1;
        this._refreshFragmentSprites(frag);
      }
    }
  }

  _rotateFragments() {
    for (const frag of this.fragmentPieces) {
      const { shape: ns, colors: nc } = rotateCW(frag.shape, frag.colors);
      const offsets = [0, -1, 1, -2, 2];
      for (const off of offsets) {
        if (this._isValidPos(ns, frag.gridX + off, frag.gridY, frag)) {
          frag.shape  = ns;
          frag.colors = nc;
          frag.gridX  = frag.gridX + off;
          this._refreshFragmentSprites(frag);
          audioManager.playChirp();
          break;
        }
      }
    }
  }

  _stepFragmentsDown() {
    // Snapshot the array so landing a fragment mid-iteration doesn't skip others
    for (const frag of [...this.fragmentPieces]) {
      this._stepFragmentDown(frag);
    }
  }

  _stepFragmentDown(frag) {
    if (this.isProcessing || this.isGameOver) return;
    if (this._isValidPos(frag.shape, frag.gridX, frag.gridY + 1, frag)) {
      frag.gridY += 1;
      this._refreshFragmentSprites(frag);
    } else {
      this._landFragment(frag);
    }
  }

  _landFragment(frag) {
    if (frag.dropTimer) { frag.dropTimer.remove(); frag.dropTimer = null; }

    const { shape, colors, gridX, gridY } = frag;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] === 1) {
          this._setCell(gridY + r, gridX + c, { color: colors[r][c], blockType: 'normal' });
        }
      }
    }

    frag.sprites.forEach(s => s.destroy());
    frag.sprites = [];
    this.fragmentPieces = this.fragmentPieces.filter(f => f !== frag);

    audioManager.playCollision();

    if (this.fragmentPieces.length === 0) {
      this.isProcessing = true;
      this._processBoard();
    }
  }

  // ── Piece placement ──────────────────────────────────────────────────────────

  _placePiece() {
    if (this.dropTimer) { this.dropTimer.remove(); this.dropTimer = null; }

    const { shape, colors, gridX, gridY } = this.activePiece;

    // Build a color map and list of all cells being placed
    const colorMap = {};
    const placedCells = [];
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] === 1) {
          const gr = gridY + r;
          const gc = gridX + c;
          colorMap[`${gr},${gc}`] = colors[r][c];
          placedCells.push({ r: gr, c: gc });
        }
      }
    }

    // Stamp all blocks onto the grid
    for (const { r, c } of placedCells) {
      this._setCell(r, c, { color: colorMap[`${r},${c}`], blockType: 'normal' });
    }

    // Destroy active piece sprites
    this.pieceSprites.forEach(s => s.destroy());
    this.pieceSprites = [];
    this.activePiece = null;

    audioManager.playCollision();

    // Find connected groups within the placed cells and detect which are floating
    const groups = this._getConnectedGroups(placedCells);
    const newFragments = [];

    for (const group of groups) {
      if (!this._isGroupSupported(group)) {
        // Lift this group off the grid — it becomes a player-controlled fragment
        for (const { r, c } of group) {
          if (this.sprites[r][c]) { this.sprites[r][c].destroy(); this.sprites[r][c] = null; }
          this.grid[r][c] = null;
        }
        newFragments.push(this._cellsToFragmentPiece(group, colorMap));
      }
    }

    if (newFragments.length > 0) {
      this.fragmentPieces = newFragments;
      const interval = SPEEDS[this.speedName] || 500;
      for (const frag of this.fragmentPieces) {
        this._refreshFragmentSprites(frag);
        frag.dropTimer = this.time.addEvent({
          delay: interval,
          callback: () => this._stepFragmentDown(frag),
          loop: true
        });
      }
      // isProcessing stays false — player controls the fragments until they land
    } else {
      this.isProcessing = true;
      this._processBoard();
    }
  }

  // ── Connected segment utilities ──────────────────────────────────────────────

  // BFS flood-fill: returns array of connected groups (each group is an array of {r,c}).
  _getConnectedGroups(cells) {
    const cellSet = new Set(cells.map(({ r, c }) => `${r},${c}`));
    const visited = new Set();
    const groups = [];

    for (const pos of cells) {
      const key = `${pos.r},${pos.c}`;
      if (visited.has(key)) continue;

      const group = [];
      const queue = [pos];
      visited.add(key);

      while (queue.length > 0) {
        const { r, c } = queue.shift();
        group.push({ r, c });
        for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          const nr = r + dr;
          const nc = c + dc;
          const nk = `${nr},${nc}`;
          if (cellSet.has(nk) && !visited.has(nk)) {
            visited.add(nk);
            queue.push({ r: nr, c: nc });
          }
        }
      }
      groups.push(group);
    }
    return groups;
  }

  // A group is supported if any cell is at the bottom row or has a non-group
  // block directly below it. Starter blocks and bombs are never considered
  // for group movement so they always count as solid support.
  _isGroupSupported(groupCells) {
    const groupSet = new Set(groupCells.map(({ r, c }) => `${r},${c}`));
    for (const { r, c } of groupCells) {
      if (r >= GRID_ROWS - 1) return true;
      const below = this.grid[r + 1][c];
      if (below !== null && !groupSet.has(`${r + 1},${c}`)) return true;
    }
    return false;
  }

  // Converts a list of {r,c} cells (with a colorMap) into a fragment piece object.
  _cellsToFragmentPiece(cells, colorMap) {
    const minR = Math.min(...cells.map(({ r }) => r));
    const maxR = Math.max(...cells.map(({ r }) => r));
    const minC = Math.min(...cells.map(({ c }) => c));
    const maxC = Math.max(...cells.map(({ c }) => c));

    const rows = maxR - minR + 1;
    const cols = maxC - minC + 1;
    const shape  = Array.from({ length: rows }, () => Array(cols).fill(0));
    const colors = Array.from({ length: rows }, () => Array(cols).fill(null));

    for (const { r, c } of cells) {
      shape[r - minR][c - minC] = 1;
      colors[r - minR][c - minC] = colorMap[`${r},${c}`];
    }

    return { shape, colors, gridX: minC, gridY: minR, sprites: [], dropTimer: null };
  }

  _refreshFragmentSprites(frag) {
    frag.sprites.forEach(s => s.destroy());
    frag.sprites = [];
    const { shape, colors, gridX, gridY } = frag;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] === 1) {
          const x = GRID_X + (gridX + c) * BLOCK_SIZE + BLOCK_SIZE / 2;
          const y = GRID_Y + (gridY + r) * BLOCK_SIZE + BLOCK_SIZE / 2;
          frag.sprites.push(
            this.add.image(x, y, colors[r][c]).setDisplaySize(BLOCK_SIZE, BLOCK_SIZE)
          );
        }
      }
    }
  }

  // ── Board processing ─────────────────────────────────────────────────────────

  _processBoard() {
    this._applyConnectedGravity();
    this._checkMatchesLoop();
  }

  // Drops every unsupported connected group of normal blocks as a unit.
  // Starter blocks and bombs are anchored and never fall.
  _applyConnectedGravity() {
    let changed = true;
    while (changed) {
      changed = false;

      const normalCells = [];
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          if (this.grid[r][c] && this.grid[r][c].blockType === 'normal') {
            normalCells.push({ r, c });
          }
        }
      }
      if (normalCells.length === 0) break;

      const groups = this._getConnectedGroups(normalCells);

      // Process groups with the lowest cells first so upper groups fall into
      // vacated space rather than landing on top of still-moving lower groups.
      groups.sort((a, b) => {
        const aMax = Math.max(...a.map(({ r }) => r));
        const bMax = Math.max(...b.map(({ r }) => r));
        return bMax - aMax;
      });

      for (const group of groups) {
        if (this._isGroupSupported(group)) continue;
        // Move the whole group down 1 row, bottom cells first to avoid overwriting
        const sorted = [...group].sort((a, b) => b.r - a.r);
        for (const { r, c } of sorted) {
          const cell = this.grid[r][c];
          this._clearCell(r, c);
          this._setCell(r + 1, c, cell);
        }
        changed = true;
      }
    }
  }

  _checkMatchesLoop() {
    const { cells, bonus } = this._findMatches();
    if (cells.length === 0) {
      this._afterClearingDone();
      return;
    }

    cells.forEach(({ r, c }) => {
      if (this.sprites[r][c]) {
        this.tweens.add({
          targets: this.sprites[r][c],
          alpha: 0.2,
          duration: 80,
          yoyo: true,
          repeat: 1
        });
      }
    });

    this.time.delayedCall(200, () => {
      let bombTriggered = false;
      cells.forEach(({ r, c }) => {
        const cell = this.grid[r][c];
        if (cell && cell.blockType === 'bomb') {
          bombTriggered = true;
          audioManager.playBoom();
        }
      });
      if (!bombTriggered) audioManager.playZap();

      cells.forEach(({ r, c }) => {
        this._spawnParticles(
          GRID_X + c * BLOCK_SIZE + BLOCK_SIZE / 2,
          GRID_Y + r * BLOCK_SIZE + BLOCK_SIZE / 2,
          this.grid[r][c] ? this.grid[r][c].color : 'red'
        );
        this._clearCell(r, c);
      });

      this.score += cells.length * 10 + bonus;
      this._updateInfoText();

      this.time.delayedCall(150, () => {
        this._applyConnectedGravity();
        this.time.delayedCall(100, () => {
          this._checkMatchesLoop();
        });
      });
    });
  }

  _afterClearingDone() {
    if (this._isBoardEmpty()) {
      this.score += 100;
      this._updateInfoText();
      this.currentLevel++;
      audioManager.playLevelComplete();
      this.time.delayedCall(600, () => {
        this._initLevel();
        this.isProcessing = false;
      });
    } else if (!this._hasBombsOnBoard()) {
      this._clearAllRemainingBlocks();
    } else {
      this.isProcessing = false;
      this._spawnPiece();
    }
  }

  // ── Match finding ────────────────────────────────────────────────────────────

  _findMatches() {
    const toRemove = new Set();
    let bonus = 0;

    // Horizontal runs
    for (let r = 0; r < GRID_ROWS; r++) {
      let c = 0;
      while (c < GRID_COLS) {
        if (!this.grid[r][c]) { c++; continue; }
        const color = this.grid[r][c].color;
        let end = c + 1;
        while (end < GRID_COLS && this.grid[r][end] && this.grid[r][end].color === color) end++;
        const len = end - c;
        if (len >= 3) {
          for (let i = c; i < end; i++) toRemove.add(`${r},${i}`);
          if (len > 3) bonus += 10;
        }
        c = end;
      }
    }

    // Vertical runs
    for (let c = 0; c < GRID_COLS; c++) {
      let r = 0;
      while (r < GRID_ROWS) {
        if (!this.grid[r][c]) { r++; continue; }
        const color = this.grid[r][c].color;
        let end = r + 1;
        while (end < GRID_ROWS && this.grid[end][c] && this.grid[end][c].color === color) end++;
        const len = end - r;
        if (len >= 3) {
          for (let i = r; i < end; i++) toRemove.add(`${i},${c}`);
          if (len > 3) bonus += 10;
        }
        r = end;
      }
    }

    // Expand for bombs: matching a bomb clears all blocks of that color
    const bombColors = new Set();
    for (const key of toRemove) {
      const [rr, cc] = key.split(',').map(Number);
      if (this.grid[rr][cc] && this.grid[rr][cc].blockType === 'bomb') {
        bombColors.add(this.grid[rr][cc].color);
      }
    }
    for (const bColor of bombColors) {
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          if (this.grid[r][c] && this.grid[r][c].color === bColor) {
            toRemove.add(`${r},${c}`);
          }
        }
      }
    }

    const cells = [...toRemove].map(k => {
      const [r, c] = k.split(',').map(Number);
      return { r, c };
    });
    return { cells, bonus };
  }

  _isBoardEmpty() {
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (this.grid[r][c] !== null) return false;
      }
    }
    return true;
  }

  _hasBombsOnBoard() {
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (this.grid[r][c] !== null && this.grid[r][c].blockType === 'bomb') return true;
      }
    }
    return false;
  }

  _clearAllRemainingBlocks() {
    const remainingBlocks = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        if (this.grid[r][c] !== null) remainingBlocks.push({ r, c });
      }
    }

    if (remainingBlocks.length === 0) {
      this.score += 100;
      this._updateInfoText();
      this.currentLevel++;
      audioManager.playLevelComplete();
      this.time.delayedCall(600, () => {
        this._initLevel();
        this.isProcessing = false;
      });
      return;
    }

    audioManager.playZap();
    remainingBlocks.forEach(({ r, c }) => {
      if (this.sprites[r][c]) {
        this.tweens.add({
          targets: this.sprites[r][c],
          alpha: 0.2,
          duration: 80,
          yoyo: true,
          repeat: 2
        });
      }
    });

    this.time.delayedCall(300, () => {
      remainingBlocks.forEach(({ r, c }) => {
        this._spawnParticles(
          GRID_X + c * BLOCK_SIZE + BLOCK_SIZE / 2,
          GRID_Y + r * BLOCK_SIZE + BLOCK_SIZE / 2,
          this.grid[r][c] ? this.grid[r][c].color : 'red'
        );
        this._clearCell(r, c);
      });
      this.score += remainingBlocks.length * 10 + 100;
      this._updateInfoText();
      this.currentLevel++;
      audioManager.playLevelComplete();
      this.time.delayedCall(600, () => {
        this._initLevel();
        this.isProcessing = false;
      });
    });
  }

  // ── Particle effects ─────────────────────────────────────────────────────────

  _spawnParticles(x, y, color) {
    const tintMap = { red: 0xff3333, green: 0x33ff33, blue: 0x3399ff };
    const tint = tintMap[color] || 0xffffff;
    const emitter = this.add.particles(x, y, 'particle', {
      speed: { min: 40, max: 130 },
      scale: { start: 1.2, end: 0 },
      lifespan: 450,
      gravityY: 250,
      tint,
      quantity: 10,
      emitting: false
    });
    emitter.explode(10);
    this.time.delayedCall(600, () => emitter.destroy());
  }

  // ── Falling piece sprites ────────────────────────────────────────────────────

  _refreshPieceSprites() {
    this.pieceSprites.forEach(s => s.destroy());
    this.pieceSprites = [];
    if (!this.activePiece) return;

    const { shape, colors, gridX, gridY } = this.activePiece;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c] === 1) {
          const x = GRID_X + (gridX + c) * BLOCK_SIZE + BLOCK_SIZE / 2;
          const y = GRID_Y + (gridY + r) * BLOCK_SIZE + BLOCK_SIZE / 2;
          this.pieceSprites.push(
            this.add.image(x, y, colors[r][c]).setDisplaySize(BLOCK_SIZE, BLOCK_SIZE)
          );
        }
      }
    }
  }

  // ── Preview ──────────────────────────────────────────────────────────────────

  _updatePreview() {
    this.previewSprites.forEach(s => s.destroy());
    this.previewSprites = [];
    if (!this.nextPieceData) return;

    const { shape, colors } = this.nextPieceData;
    const previewX = 555;
    const previewY = 120;
    const bs = 28;

    const cols = shape[0].length;
    const rows = shape.length;
    const offsetX = previewX - (cols * bs) / 2;
    const offsetY = previewY - (rows * bs) / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (shape[r][c] === 1) {
          const x = offsetX + c * bs + bs / 2;
          const y = offsetY + r * bs + bs / 2;
          this.previewSprites.push(
            this.add.image(x, y, colors[r][c]).setDisplaySize(bs, bs)
          );
        }
      }
    }
  }

  // ── Touch buttons ─────────────────────────────────────────────────────────────

  _buildTouchButtons() {
    const cx = 870;   // diamond center X (right side, clear of info panel)
    const cy = 510;   // diamond center Y
    const gap = 82;   // distance from center to each button center
    const r = 47;     // button radius
    const depth = 500;

    const btnColor = 0x1a3a6a;
    const btnAlpha = 0.85;
    const iconStyle = {
      fontFamily: 'monospace',
      fontSize: '34px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2
    };

    // Subtle background panel
    const bg = this.add.graphics().setDepth(depth - 1);
    bg.fillStyle(0x000000, 0.35);
    bg.fillRoundedRect(cx - gap - r - 10, cy - gap - r - 10, (gap + r + 10) * 2, (gap + r + 10) * 2, 20);

    const makeBtn = (x, y, icon, onDown, onUp) => {
      const circle = this.add.circle(x, y, r, btnColor, btnAlpha).setDepth(depth).setInteractive();
      this.add.text(x, y, icon, iconStyle).setOrigin(0.5, 0.5).setDepth(depth + 1);
      circle.on('pointerdown',  onDown);
      circle.on('pointerup',    onUp);
      circle.on('pointerover',  () => circle.setFillStyle(0x2255aa, btnAlpha));
      circle.on('pointerout',   () => { circle.setFillStyle(btnColor, btnAlpha); onUp(); });
      return circle;
    };

    // Top: Rotate (↻)
    makeBtn(cx, cy - gap, '↻',
      () => { this.touchRotateJust = true; },
      () => {}
    );

    // Left: Move left
    makeBtn(cx - gap, cy, '←',
      () => { this.touchLeftDown = true; },
      () => { this.touchLeftDown = false; }
    );

    // Right: Move right
    makeBtn(cx + gap, cy, '→',
      () => { this.touchRightDown = true; },
      () => { this.touchRightDown = false; }
    );

    // Bottom: Fast drop (↓)
    makeBtn(cx, cy + gap, '↓',
      () => { this.touchDownDown = true; },
      () => { this.touchDownDown = false; }
    );
  }

  // ── Info panel ───────────────────────────────────────────────────────────────

  _buildInfoPanel() {
    const infoCenterX = 555;
    const panelWidth = 180;
    const panelX = infoCenterX - panelWidth / 2;
    const panelPadding = 20;
    const panelY = GRID_Y;
    const lastElementY = 544;
    const panelHeight = lastElementY - panelY + panelPadding;

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.6);
    bg.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 8);

    const labelStyle = {
      fontFamily: 'monospace', fontSize: '18px', color: '#aaaaaa'
    };
    const valueStyle = {
      fontFamily: 'monospace', fontSize: '26px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 2
    };

    this.add.text(infoCenterX, 60, 'NEXT', labelStyle).setOrigin(0.5, 0.5);
    const prevBg = this.add.graphics();
    prevBg.lineStyle(1, 0x444466, 1);
    prevBg.strokeRect(infoCenterX - 60, 75, 120, 100);

    this.add.text(infoCenterX, 210, 'SCORE', labelStyle).setOrigin(0.5, 0.5);
    this.scoreText = this.add.text(infoCenterX, 240, '0', valueStyle).setOrigin(0.5, 0.5);

    this.add.text(infoCenterX, 295, 'LEVEL', labelStyle).setOrigin(0.5, 0.5);
    this.levelText = this.add.text(infoCenterX, 325, '1', valueStyle).setOrigin(0.5, 0.5);

    this.add.text(infoCenterX, 380, 'SPEED', labelStyle).setOrigin(0.5, 0.5);
    this.speedText = this.add.text(infoCenterX, 410, this.speedName.toUpperCase(), valueStyle).setOrigin(0.5, 0.5);

    const hintStyle = { fontFamily: 'monospace', fontSize: '14px', color: '#666688' };
    this.add.text(infoCenterX, 500, '← → Move', hintStyle).setOrigin(0.5, 0.5);
    this.add.text(infoCenterX, 522, '↑ Rotate', hintStyle).setOrigin(0.5, 0.5);
    this.add.text(infoCenterX, 544, '↓ Fast drop', hintStyle).setOrigin(0.5, 0.5);
  }

  _updateInfoText() {
    this.scoreText.setText(String(this.score));
    this.levelText.setText(String(this.currentLevel));
    this.speedText.setText(this.speedName.toUpperCase());
  }

  // ── Game over ────────────────────────────────────────────────────────────────

  _buildGameOverOverlay() {
    const cx = GRID_X + (GRID_COLS * BLOCK_SIZE) / 2;
    const cy = GRID_Y + (GRID_ROWS * BLOCK_SIZE) / 2;

    this.goOverlay = this.add.graphics();
    this.goOverlay.fillStyle(0x000000, 0.75);
    this.goOverlay.fillRect(GRID_X, GRID_Y, GRID_COLS * BLOCK_SIZE, GRID_ROWS * BLOCK_SIZE);
    this.goOverlay.setVisible(false).setDepth(1000);

    this.goTitle = this.add.text(cx, cy - 60, 'GAME OVER!', {
      fontFamily: 'monospace', fontSize: '36px', color: '#ff4444',
      stroke: '#000000', strokeThickness: 4
    }).setOrigin(0.5, 0.5).setVisible(false).setDepth(1001);

    this.goScoreText = this.add.text(cx, cy, 'Score: 0', {
      fontFamily: 'monospace', fontSize: '24px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 2
    }).setOrigin(0.5, 0.5).setVisible(false).setDepth(1001);

    const goPromptText = this.touchMode ? 'Tap or press ENTER to Continue' : 'Press ENTER to Continue';
    this.goPrompt = this.add.text(cx, cy + 55, goPromptText, {
      fontFamily: 'monospace', fontSize: '20px', color: '#ffff00',
      stroke: '#000000', strokeThickness: 2
    }).setOrigin(0.5, 0.5).setVisible(false).setDepth(1001);
  }

  _triggerGameOver() {
    if (this.isGameOver) return;
    this.isGameOver = true;

    if (this.dropTimer) { this.dropTimer.remove(); this.dropTimer = null; }
    this._clearFragments();

    musicManager.stop();
    audioManager.playGameOver();

    this.goOverlay.setVisible(true);
    this.goTitle.setVisible(true);
    this.goScoreText.setText(`Score: ${this.score}`).setVisible(true);
    this.goPrompt.setVisible(true);

    if (this.touchMode) {
      this.touchGameOverTapped = false;
      this.input.once('pointerdown', () => { this.touchGameOverTapped = true; });
    }

    this.tweens.add({
      targets: this.goPrompt,
      alpha: 0,
      duration: 500,
      ease: 'Linear',
      yoyo: true,
      repeat: -1
    });
  }

  // ── Update loop ──────────────────────────────────────────────────────────────

  update(_time, delta) {
    if (this.isGameOver) {
      if (Phaser.Input.Keyboard.JustDown(this.enterKey) || this.touchGameOverTapped) {
        this.touchGameOverTapped = false;
        this.scene.start('LevelSelectScene', { touchMode: this.touchMode });
      }
      return;
    }

    if (this.isProcessing) return;

    const hasActivePiece = !!this.activePiece;
    const hasFragments   = this.fragmentPieces.length > 0;
    if (!hasActivePiece && !hasFragments) return;

    // Lateral movement with repeat delay
    this.moveTimer -= delta;
    if (this.moveTimer <= 0) {
      if (this.cursors.left.isDown || this.touchLeftDown) {
        if (hasActivePiece) this._moveLeft();
        if (hasFragments)   this._moveFragmentsLeft();
        this.moveTimer = 120;
      } else if (this.cursors.right.isDown || this.touchRightDown) {
        if (hasActivePiece) this._moveRight();
        if (hasFragments)   this._moveFragmentsRight();
        this.moveTimer = 120;
      } else {
        this.moveTimer = 0;
      }
    }

    // Rotation (just-pressed)
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up) || this.touchRotateJust) {
      this.touchRotateJust = false;
      if (hasActivePiece) this._rotatePiece();
      if (hasFragments)   this._rotateFragments();
    }

    // Fast drop
    if (this.cursors.down.isDown || this.touchDownDown) {
      this.fastDropTimer -= delta;
      if (this.fastDropTimer <= 0) {
        if (hasActivePiece) this._stepDown();
        if (hasFragments)   this._stepFragmentsDown();
        this.fastDropTimer = 50;
      }
    } else {
      this.fastDropTimer = 0;
    }
  }
}
