# Spider Solitaire

A web-based Spider Solitaire game built with vanilla JavaScript and HTML5 Canvas.

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm

### Installation

1. Install dependencies:
```bash
npm install
```

### Running the Game

Start the development server:
```bash
npm run dev
```

The game will automatically open in your browser at `http://localhost:3000`

### Building for Production

Build the game for production:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## How to Play

1. Drag cards to build descending sequences (K, Q, J, 10, 9, 8, 7, 6, 5, 4, 3, 2, A)
2. Click the stock pile (top-left) to deal 10 new cards when needed
3. Complete sequences of 13 cards (K to A) are automatically removed
4. Win by completing all 8 sequences
5. Click "New Game" to restart

## Game Rules

- You can only move face-up cards
- Cards must be in descending order to be moved together
- You can place cards on empty columns or on cards one rank higher
- Complete sequences (K down to A) are automatically removed
- Deal 10 new cards from the stock when you need more cards



