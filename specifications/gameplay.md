# Gameplay

- Gameplay starts with a speed and level value that the player selects on the [level select scene](scenes.md). Level controls how many random blocks are placed initially, and speed determines how quickly the pieces fall.
- Gameplay occurs on the scene [gameplay scene](scenes.md)
- The game area holds 32x32 pixel blocks - accomodating 10 blocks wide and 20 blocks high
- When gameplay starts, based on the value for "level", a number of [starting blocks](blocks.md) are randomly placed around the bottom of the game area. These should be randomly placed towards the lower area of the gameplay area so there is room for players to manuver new falling pieces.
- In addition to the starting blocks, 3 [bomb blocks](blocks.md) (exactly 1 red, 1 green, and 1 blue bomb block) are also randomly placed on the bottom 2 rows of the gameplay area. This creates a challenge where players need to clear their way down to the bombs as a way to finish.
- A piece (as defined in [pieces.md](pieces.md)) is made up of different blocks of random color (red, green, blue). Pieces are randomly selected by the available pieces defined in [pieces.md](pieces.md)

## Clearing all blocks

- When all blocks are cleared from the board, the "level" is completed and increases by 1. The game then continues with a newly generated gameplay area at the new level.
- **If all bomb blocks have been destroyed but other blocks remain on the board, all remaining blocks are automatically destroyed, ending the level.** This gives players a satisfying end-of-level effect once they've cleared all the bombs.
- Progressing from one level to another doesn't reset game score.

## Falling pieces

- The game info display shows the next piece, the piece is randomly seleted from the list of pieces defined in [pieces.md](pieces.md).
- When a piece enters the gameplay area is start to drop from the top of the gameplay area and moves at the rate specified by the "speed" value, moving one block at a time downward.
- Falling pieces cannot move outside of the gameplay area
- Pieces cannot move through other blocks
- Eventually, when the piece cannot move down further, it is "placed" meaning the blocks become part of the gameplay area and checks occur to see if 3 or more of the same colors align horizontally or vertically. After placing a block, the next game piece enters from the top and a new "next piece" is randomly determined.
- Some pieces have "loose" blocks, this is when blocks of a piece float feely with no adjecent piece on the top, bottom, left, or right. Although the piece falls as one entire unit, when it gets placed if there are loose blocks, those can continue to fall and be placed before the next piece appears.
- Only one falling piece can be at play ay once.

## Piece rotation

- The player can rotate the falling piece. Rotation is 90-degrees.
- When a piece rotate it cannot overlap other blocks or pass outside the edge of the gameplay area

## Score
- Each time a single block is removed, the player is awarded 10 points
- If more than 3 blocks of the same colors are aligned, the player gets and extra 10 points.
- Clearing the board is worth 100 points.

## Controls

- Falling pieces can be manuvered by the player. They can move left or right based on pressing left/right arrow keys.
- Pressing the UP key "rotates" the block (see piece rotation)
- Pressing the DOWN key moves the piece down faster, disregarding the speed governed by the speed value.

## Game info display 

- The game info display shows gameplay information on the right side of the gameplay scene. From the top down the information displayed is:
    - "Next": shows the next piece that will drop into the gameplay area
    - "Score": shows the score value
    - "Level": shows the level value
    - "Speed": shows the speed value

## Game Over

- If a new piece cannot move down because the game area is obstructed (such as if pieces pile all the way to the top) then the game is over.
- Music stops
- Large text appears over gameplay area indicating "GAME OVER!"
- Under the text, the final score is displayed
- Under the score is the text "Press ENTER to Continue"
- Pressing enter returns them to the level select scene

## Sound effects

- MP3 music, based on user selection is played in the background during gameplay
- There are some generated "beep" sound effects that play during gameplay:
    - When a piece rotates, a chirp sound plays
    - When a blpieceock is placed a small collision sound plays
    - When a block is destroied, a zap sound effect plays
    - When a bomb is destroied, a retro boom sound effect plays
    - When game over, a sad series of beeps play.