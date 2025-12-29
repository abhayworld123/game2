import { initGame, canDrag, canDrop, checkComplete, dealStock, checkWin } from './engine.js';
import { Renderer } from './renderer.js';
import { CONFIG } from './config.js';
import { animate } from 'motion';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const restartBtn = document.getElementById('restart');
const assistModeBtn = document.getElementById('assist-mode');

let state, renderer;
let loopRunning = false;
let assistMode = false;
let activeAnimations = [];

// Fixed logical resolution
const LOGICAL_WIDTH = 1200;
const LOGICAL_HEIGHT = 820;

function setupCanvas() {
  // Internal resolution is always fixed
  canvas.width = LOGICAL_WIDTH;
  canvas.height = LOGICAL_HEIGHT;
  
  // Apply background colors from config
  document.body.style.backgroundColor = CONFIG.backgroundColor;
}

setupCanvas();

function startGame() {
  state = initGame();
  activeAnimations = [];
}

// Initialize renderer with config and state immediately
renderer = new Renderer(ctx, CONFIG);
state = initGame();

restartBtn.addEventListener('click', () => {
  startGame();
});

assistModeBtn.addEventListener('click', () => {
  assistMode = !assistMode;
  assistModeBtn.textContent = `Assist Mode: ${assistMode ? 'ON' : 'OFF'}`;
  assistModeBtn.classList.toggle('active', assistMode);
});

function getMouse(e) {
  const r = canvas.getBoundingClientRect();
  
  // Get event coordinates (works for mouse and touch)
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  
  // Map from screen (CSS pixels) to logical (1200x820)
  return { 
    x: (clientX - r.left) * (LOGICAL_WIDTH / r.width), 
    y: (clientY - r.top) * (LOGICAL_HEIGHT / r.height) 
  };
}

function calculateValidDrops(card, fromColumnIndex) {
  const validDrops = [];
  state.tableau.forEach((col, ci) => {
    if (ci !== fromColumnIndex && canDrop(card, col)) {
      validDrops.push(ci);
    }
  });
  return validDrops;
}

function handleSequenceComplete(completedSequence, columnIndex) {
  state.completed++;
  
  // Get source position (before removal, cards were at the end of the column)
  const sourceX = renderer.offsetX + columnIndex * renderer.gapX;
  const col = state.tableau[columnIndex];
  // Calculate Y position where the sequence was (now removed, so use current length)
  const sourceY = renderer.offsetY + col.length * renderer.gapY;
  
  // Get target position (completed sequences area)
  const targetX = renderer.completedX;
  const targetY = renderer.completedY + (state.completedSequences.length * 15);
  
  // Create animation
  const animation = {
    type: 'sequenceComplete',
    cards: completedSequence,
    columnIndex: columnIndex,
    startX: sourceX,
    startY: sourceY,
    targetX: targetX,
    targetY: targetY,
    progress: 0,
    duration: 800,
    startTime: performance.now()
  };
  
  activeAnimations.push(animation);
  
  // Animation will be updated in the render loop
}

function animateStockDeal() {
  // Simple animation for stock dealing - cards appear with a fade-in effect
  // This is handled in the render loop by checking if cards are newly dealt
  state.stockDealAnimation = {
    startTime: performance.now(),
    duration: 300
  };
}

function handleStart(e) {
  // Only prevent default for touch to avoid breaking mouse events
  if (e.type === 'touchstart') e.preventDefault();
  if (!state || checkWin(state)) return;
  
  const { x, y } = getMouse(e);

  // Check if clicking on stock pile
  if (x > renderer.stockX && x < renderer.stockX + renderer.cardW && 
      y > renderer.stockY && y < renderer.stockY + renderer.cardH && 
      state.stock.length > 0) {
    
    const hasEmptyColumn = state.tableau.some(col => col.length === 0);
    if (hasEmptyColumn) return;

    if (dealStock(state)) {
      // Animate stock dealing
      animateStockDeal();
      
      state.tableau.forEach((col, colIndex) => {
        const completed = checkComplete(col);
        if (completed) {
          handleSequenceComplete(completed, colIndex);
        } else if (col.length) {
          col[col.length - 1].faceUp = true;
        }
      });
    }
    return;
  }

  state.tableau.forEach((col, ci) => {
    for (let i = col.length - 1; i >= 0; i--) {
      const cx = renderer.offsetX + ci * renderer.gapX;
      const cy = renderer.offsetY + i * renderer.gapY;

      if (
        x > cx && x < cx + renderer.cardW &&
        y > cy && y < cy + renderer.cardH &&
        col[i].faceUp &&
        canDrag(col, i)
      ) {
        const cards = col.slice(i);
        const validDrops = assistMode ? calculateValidDrops(cards[0], ci) : [];
        state.dragging = {
          cards: col.splice(i),
          from: ci,
          cardOffsetX: x - cx,
          cardOffsetY: y - cy,
          x: cx,
          y: cy,
          validDrops
        };
        return;
      }
    }
  });
}

function handleMove(e) {
  if (!state.dragging) return;
  if (e.type === 'touchmove') e.preventDefault();
  
  const { x, y } = getMouse(e);
  state.dragging.x = x - state.dragging.cardOffsetX;
  state.dragging.y = y - state.dragging.cardOffsetY;
}

function handleEnd(e) {
  if (!state.dragging) return;
  
  const fromColumnIndex = state.dragging.from;
  const cards = state.dragging.cards;
  const cardX = state.dragging.x + renderer.cardW / 2;

  let dropped = false;
  
  for (let ci = 0; ci < state.tableau.length; ci++) {
    if (ci === fromColumnIndex) continue;

    const col = state.tableau[ci];
    const cx = renderer.offsetX + ci * renderer.gapX;
    
    // Check if card center is over the column area
    if (cardX > cx && cardX < cx + renderer.cardW) {
      if (canDrop(cards[0], col)) {
        // Add cards to column
        col.push(...cards);
        const completed = checkComplete(col);
        
        if (completed) {
          // Sequence completed - will be animated by handleSequenceComplete
          handleSequenceComplete(completed, ci);
        } else {
          // Animate card drop
          const dropAnimation = {
            type: 'cardDrop',
            cards: cards,
            startX: state.dragging.x,
            startY: state.dragging.y,
            targetX: renderer.offsetX + ci * renderer.gapX,
            targetY: renderer.offsetY + (col.length - cards.length) * renderer.gapY,
            progress: 0,
            duration: 300,
            startTime: performance.now(),
            targetColumn: ci
          };
          activeAnimations.push(dropAnimation);
          
          if (col.length) {
            col[col.length - 1].faceUp = true;
          }
        }
        dropped = true;
        break;
      }
    }
  }

  if (!dropped) {
    // Return cards to original position with animation
    const returnAnimation = {
      type: 'cardReturn',
      cards: cards,
      startX: state.dragging.x,
      startY: state.dragging.y,
      targetX: renderer.offsetX + fromColumnIndex * renderer.gapX,
      targetY: renderer.offsetY + state.tableau[fromColumnIndex].length * renderer.gapY,
      progress: 0,
      duration: 200,
      startTime: performance.now(),
      targetColumn: fromColumnIndex
    };
    activeAnimations.push(returnAnimation);
    state.tableau[fromColumnIndex].push(...cards);
  } else {
    const src = state.tableau[fromColumnIndex];
    if (src && src.length && !src[src.length - 1].faceUp) {
      src[src.length - 1].faceUp = true;
    }
  }

  state.dragging = null;
}

canvas.addEventListener('mousedown', handleStart);
canvas.addEventListener('mousemove', handleMove);
canvas.addEventListener('mouseup', handleEnd);

canvas.addEventListener('touchstart', handleStart, { passive: false });
canvas.addEventListener('touchmove', handleMove, { passive: false });
canvas.addEventListener('touchend', handleEnd, { passive: false });

// Pre-create gradient for performance
const canvasGradient = ctx.createRadialGradient(
  LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2, 0,
  LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2, Math.max(LOGICAL_WIDTH, LOGICAL_HEIGHT)
);
canvasGradient.addColorStop(0, CONFIG.canvasGradient.start);
canvasGradient.addColorStop(1, CONFIG.canvasGradient.end);

function loop() {
  loopRunning = true;
  try {
    if (!state || !renderer) {
      requestAnimationFrame(loop);
      return;
    }
    
    ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    ctx.fillStyle = canvasGradient;
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    
    // Update animations
    const currentTime = performance.now();
    const completedAnimations = [];
    
    activeAnimations.forEach((anim, index) => {
      const elapsed = currentTime - anim.startTime;
      anim.progress = Math.min(elapsed / anim.duration, 1);
      
      if (anim.progress >= 1) {
        if (anim.type === 'sequenceComplete') {
          // Animation complete - add to completed sequences
          state.completedSequences.push(anim.cards);
          
          // Flip top card of source column if it exists
          const src = state.tableau[anim.columnIndex];
          if (src && src.length && !src[src.length - 1].faceUp) {
            src[src.length - 1].faceUp = true;
          }
        } else if (anim.type === 'cardDrop' || anim.type === 'cardReturn') {
          // Card drop/return animation complete - nothing special needed
          // Cards are already in the correct column
        }
        completedAnimations.push(index);
      }
    });
    
    // Remove completed animations (in reverse order to maintain indices)
    completedAnimations.reverse().forEach(index => {
      activeAnimations.splice(index, 1);
    });
    
    renderer.drawStock(state.stock.length);
    
    // Draw tableau, but skip cards that are being animated
    const animatingCards = new Map();
    activeAnimations.forEach(anim => {
      if (anim.type === 'cardDrop' || anim.type === 'cardReturn') {
        const col = anim.targetColumn;
        if (!animatingCards.has(col)) {
          animatingCards.set(col, anim.cards.length);
        }
      }
    });
    
    renderer.drawTableau(state.tableau, animatingCards);
    
    if (state.dragging && assistMode && state.dragging.validDrops) {
      renderer.drawValidDropHighlights(state.dragging.validDrops);
    }
    
    // Draw active animations
    activeAnimations.forEach(anim => {
      if (anim.type === 'sequenceComplete') {
        renderer.drawAnimatedSequence(anim);
      } else if (anim.type === 'cardDrop' || anim.type === 'cardReturn') {
        renderer.drawAnimatedCards(anim);
      }
    });
    
    renderer.drawCompletedSequences(state.completedSequences);
    if (state.dragging) renderer.drawDragging(state.dragging);
    if (checkWin(state)) {
      renderer.drawWinMessage();
    }
  } catch (error) {
    console.error('Error in game loop:', error);
  }
  requestAnimationFrame(loop);
}

loop();
