# Scenes

## Title Screen Scene
- The game starts on this scene
- The background of this scene uses [/img/game/title_bg.png](/img/game/title_bg.png)
- The logo of the game appears on the upper area of the scene, centered. Image of logo is [/img/game/logo.png](/img/game/logo.png) 
- Pressing enter key proceeds to the level select scene
- Under the logo is centered text with the following contents:

    Welcome to RGBlox! Directions: Use the arrow keys to manuver the falling blocks. Align three or more colors to eliminate blocks. Bomb blocks destory all blocks of the same color. The objective of the game is to clear the stage of all blocks!

    Press ENTER to start!

    Copyright 2026 metalbabble.com

## Level Select Scene
- The intention of this screen is for the user to select their starting difficulty (level, speed) along with a desired background music
- Background of scene uses [/img/game/levelselect.png](/img/game/levelselect.png). It is tiled and slowly scrolls diagonally up/left.
- At the top of the scene is the text "Game Settings"
- Under that game settings heading is a label for "Starting level" and a dropdown menu with numbers 1-9, defaulting at 1
- Under that is the setting for speed. The label says "Speed" with a dropdown containing: slow, medium, fast. These slow/medium/fast coorispond to the speed setting the blocks fall at.
- Under that is a setting for music. The label says "Music" with a dropdown containing "Type 1", "Type 2", "Type 3", and "None". Default value is "Type 1". When one of these is selected start playing the mp3 file in the [/music](/music/) directory. (there is type1.mp3, type2.mp3, and type3.mp3 that coorispond with each setting. None=no music) Music plays as soon as it's chosen from the menu and continues through the gameplay scene until gameover is reached.
- Below all of these options are two buttons: "Return to Title" and "Start Game". Return to title stops the music and returns the title scene. Start game, as the name implies starts a new game and proceeds to the gameplay scene.

## Gameplay Scene
- Background uses [/img/game/gameplay.png](/img/game/gameplay.png) (static, does not move)
- This is the primary area where gameplay occurs
- There is a gameplay area where the blocks and falling pieces are interact, this is displayed in the left area of the scene.
- The gameplay area has a background image from the folder [/img/bg/](/img/bg/). A file is selected coorisponding to the level. For example, level 1 is "bg1.png", level 2 is "b2.png". (The files are consistantly named bgX.png, where X is the level number)
- The right area of the screen shows a game info display, see: [gameplay.md](gameplay.md)