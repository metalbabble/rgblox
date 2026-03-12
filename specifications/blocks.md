# Types of blocks

A block is a 32x32 sprite. All blocks are either red, green, or blue. All blocks can be removed if 3 of the same color line up horizontally or vertically.

The graphics representing blocks are in the [img/block](/img/block/) folder.

When a block is removed, a particle effect occurs where there is a burst of pixels of the same color as the block was.

There are a few types of blocks...

## Blocks that make up pieces

This type of block is what pieces are composed of. Thse use the image files: red.png, green.png, and blue.png (for red, green, and blue blocks respectively) 

## Blocks that start in the play area (starting blocks)

The gameplay starts with some blocks randomly placed in the play area. These use image files: red-start.png, green-start.png, and blue-start.png (for reg, green, and blue starting blocks respectively)

## Bomb blocks

The gameplay starts with exactly 3 bomb blocks, one of each color (red, green, and blue). These behave like other blocks, but when one is destroied it causes all other blocks OF THE SAME COLOR to also be destroied. The graphics for bomb blocks are red-bomb.png, green-bomb.png, and blue-bomb.png (for red, green, and blue blocks respectively.)