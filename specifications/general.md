# General info

## Synopsis
"RGBlox" is a falling-block puzzle game based on classic games like Tetris, Tetris 2, Dr.Mario, and Puyo-Puyo. During gameplay, players manuver falling pieces within a play area. A piece is made up of 4 randomly colored (reg, green, or blue) blocks. When a block lands, if three blocks in a row (horiztonally or vertically) are the same color - they disappear.

There is a special block type called a bomb. If a bomb is removed from the gameplay area it also destroies all blocks on that color. The ultimate objective is to clear the gameplay area of all blocks & bombs.

## General Game Details
- Game uses phaser javascript game library to provide a web-based experience. Phaser handles concerns like collision detection, animation, scene layout, etc.
- Scenes cover the major gameplay areas and are defined in [scenes.md](scenes.md)
- Upon starting, the user (also refered to as player) starts on a Title Screen (title scene)
- The primary gameplay occurs in the gameplay scene.
- The scenes are designed as 16:9 to give a console-like experience