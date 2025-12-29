export const SUIT = 'S';
export const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

export function createDeck() {
  const deck = [];
  for (let d = 0; d < 8; d++) {
    for (const rank of RANKS) {
      deck.push({ suit: SUIT, rank, faceUp: false });
    }
  }
  return shuffle(deck);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function initGame() {
  const deck = createDeck();
  const tableau = Array.from({ length: 10 }, () => []);

  for (let col = 0; col < 10; col++) {
    const count = col < 4 ? 6 : 5;
    for (let i = 0; i < count; i++) {
      const card = deck.pop();
      card.faceUp = i === count - 1;
      tableau[col].push(card);
    }
  }

  return {
    tableau,
    stock: deck,
    dragging: null,
    completed: 0,
    completedSequences: []
  };
}

export function canDrag(stack, index) {
  // Can only drag if the card at index is face up
  if (!stack[index].faceUp) return false;
  
  // Check if all cards from index to end are in descending sequence and face up
  for (let i = index; i < stack.length - 1; i++) {
    if (!stack[i + 1].faceUp) return false;
    const currentRank = RANKS.indexOf(stack[i].rank);
    const nextRank = RANKS.indexOf(stack[i + 1].rank);
    if (currentRank !== nextRank + 1) return false;
  }
  return true;
}

export function canDrop(card, targetStack) {
  if (!targetStack.length) return true;
  const top = targetStack[targetStack.length - 1];
  return (
    RANKS.indexOf(top.rank) === RANKS.indexOf(card.rank) + 1
  );
}

export function checkComplete(stack) {
  if (stack.length < 13) return null;
  // Check if last 13 cards form a complete sequence (K down to A)
  // Top card (index length-1) should be A, bottom card (index length-13) should be K
  for (let i = 0; i < 13; i++) {
    const cardIndex = stack.length - 1 - i;
    if (stack[cardIndex].rank !== RANKS[i]) {
      return null;
    }
  }
  // Extract the complete sequence before removing
  const completedSequence = stack.slice(stack.length - 13);
  // Remove the complete sequence
  stack.splice(stack.length - 13, 13);
  return completedSequence;
}

export function dealStock(state) {
  if (state.stock.length === 0) return false;
  
  // Deal one card to each tableau column
  for (let i = 0; i < 10; i++) {
    if (state.stock.length > 0) {
      const card = state.stock.pop();
      card.faceUp = true;
      state.tableau[i].push(card);
    }
  }
  return true;
}

export function checkWin(state) {
  return state.completed === 8 && state.stock.length === 0;
}
