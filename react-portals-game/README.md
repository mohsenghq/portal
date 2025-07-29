# Lost Dogs: Portals Clone - React Version

This is a React and Tailwind CSS version of the Lost Dogs: Portals Clone game.

## How to Run

1. Make sure you have Node.js installed
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser to `http://localhost:3000`

## How to Play

- **Objective**: Hunt and kill all three bosses: Light Mage, Dark Mage, and Golem
- **Click tiles** to reveal them and battle monsters
- **Health potions** (green bottle icon) restore you to full health
- **Numbers** on tiles show total damage from adjacent monsters
- **Flag mode** (flag button) lets you mark suspicious tiles
- **Eye monster** hides numbers around it until defeated

## Game Features

- 7x11 grid with minesweeper-style mechanics
- Monster tracking panel showing remaining enemies
- Boss progression with health upgrades
- Floating damage/healing text animations
- Win/lose conditions with game over modal

## Tech Stack

- React 18
- Tailwind CSS
- Vite
- Custom game logic hooks