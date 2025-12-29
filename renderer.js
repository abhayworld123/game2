export class Renderer {
  constructor(ctx, config) {
    this.ctx = ctx;
    this.config = config || { cardBack: 'cardBack_blue1.png' };
    this.cardImages = {}; // Cache for loaded card images
    this.updateDimensions();
  }

  // Use a fixed coordinate system (1200x820)
  updateDimensions() {
    // Card dimensions in our 1200x820 logical coordinate system
    this.cardW = 100; 
    this.cardH = 145;
    this.gapX = 110;
    this.gapY = 30;
    this.offsetX = 50;
    this.offsetY = 120;
    
    // Stock pile position
    this.stockX = 50;
    this.stockY = 20;
    
    // Completed sequences area (top right)
    this.completedX = 1050;
    this.completedY = 20;
  }

  // Get the image path for a card
  getCardImagePath(card) {
    if (!card.faceUp) {
      // Card back from config
      return `./assets/Cards/${this.config.cardBack}`;
    }
    
    // Face card - map suit and rank to filename
    const suitMap = {
      'S': 'Spades',
      'H': 'Hearts',
      'D': 'Diamonds',
      'C': 'Clubs'
    };
    
    const suit = suitMap[card.suit] || 'Spades';
    const rank = card.rank;
    
    return `./assets/Cards/card${suit}${rank}.png`;
  }

  // Load a card image (lazy loading)
  loadCardImage(card) {
    const path = this.getCardImagePath(card);
    
    if (this.cardImages[path]) {
      return this.cardImages[path];
    }
    
    const img = new Image();
    img.src = path;
    this.cardImages[path] = img;
    return img;
  }

  drawCard(card, x, y) {
    try {
      const img = this.loadCardImage(card);
      
      if (img.complete && img.naturalWidth > 0) {
        this.ctx.drawImage(
          img,
          x, y,
          this.cardW, this.cardH
        );
        return;
      }
      
      // Fallback: draw rectangle while image loads
      this.ctx.fillStyle = card.faceUp ? '#ffffff' : '#1e40af';
      this.ctx.fillRect(x, y, this.cardW, this.cardH);
      this.ctx.strokeStyle = '#000000';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(x, y, this.cardW, this.cardH);
      
      if (card.faceUp) {
        this.ctx.fillStyle = '#000000';
        this.ctx.font = `bold 18px sans-serif`;
        this.ctx.fillText(card.rank, x + 10, y + 25);
      }
    } catch (error) {
      console.error('Error drawing card:', error);
    }
  }

  drawTableau(tableau, animatingCards = new Map()) {
    // Draw tableau, skipping cards that are being animated
    tableau.forEach((col, i) => {
      const skipCount = animatingCards.get(i) || 0;
      col.forEach((card, j) => {
        // Skip the last N cards if they're being animated
        if (j < col.length - skipCount) {
          this.drawCard(card, this.offsetX + i * this.gapX, this.offsetY + j * this.gapY);
        }
      });
    });
  }

  drawStock(stockCount) {
    if (stockCount > 0) {
      try {
        const backCard = { faceUp: false, suit: 'S', rank: 'A' };
        const img = this.loadCardImage(backCard);
        
        if (img.complete && img.naturalWidth > 0) {
          this.ctx.drawImage(
            img,
            this.stockX, this.stockY,
            this.cardW, this.cardH
          );
        } else {
          this.ctx.fillStyle = '#1e40af';
          this.ctx.fillRect(this.stockX, this.stockY, this.cardW, this.cardH);
        }
      } catch (error) {}
      
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = `bold 16px sans-serif`;
      this.ctx.fillText(stockCount.toString(), this.stockX + 10, this.stockY + 30);
    }
  }

  drawWinMessage() {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, 1200, 820);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = `bold 48px sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText('You Win!', 600, 410);
    this.ctx.font = `24px sans-serif`;
    this.ctx.fillText('Refresh to play again', 600, 460);
    this.ctx.textAlign = 'left';
  }

  drawDragging(drag) {
    drag.cards.forEach((c, i) => {
      this.drawCard(c, drag.x, drag.y + i * this.gapY);
    });
  }

  drawValidDropHighlights(validColumns) {
    validColumns.forEach(columnIndex => {
      const x = this.offsetX + columnIndex * this.gapX;
      const y = this.offsetY;
      const height = 820 - y; // Full height from tableau start to bottom
      
      // Draw semi-transparent green highlight
      this.ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
      this.ctx.fillRect(x, y, this.cardW, height);
      
      // Draw border to make it more visible
      this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.6)';
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(x, y, this.cardW, height);
    });
  }

  drawAnimatedSequence(animation) {
    // Use easing function for smooth animation
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
    const easedProgress = easeOutCubic(animation.progress);
    
    const currentX = animation.startX + (animation.targetX - animation.startX) * easedProgress;
    const currentY = animation.startY + (animation.targetY - animation.startY) * easedProgress;
    
    // Draw cards with slight scale effect
    const scale = 0.8 + (0.2 * (1 - easedProgress));
    const scaledW = this.cardW * scale;
    const scaledH = this.cardH * scale;
    const offsetX = (this.cardW - scaledW) / 2;
    const offsetY = (this.cardH - scaledH) / 2;
    
    animation.cards.forEach((card, i) => {
      const cardY = currentY + i * this.gapY * scale;
      const img = this.loadCardImage(card);
      
      if (img.complete && img.naturalWidth > 0) {
        this.ctx.drawImage(
          img,
          currentX + offsetX, cardY + offsetY,
          scaledW, scaledH
        );
      } else {
        // Fallback
        this.ctx.fillStyle = card.faceUp ? '#ffffff' : '#1e40af';
        this.ctx.fillRect(currentX + offsetX, cardY + offsetY, scaledW, scaledH);
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(currentX + offsetX, cardY + offsetY, scaledW, scaledH);
      }
    });
  }

  drawAnimatedCards(animation) {
    // Use easing function for smooth animation
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
    const easedProgress = easeOutCubic(animation.progress);
    
    const currentX = animation.startX + (animation.targetX - animation.startX) * easedProgress;
    const currentY = animation.startY + (animation.targetY - animation.startY) * easedProgress;
    
    animation.cards.forEach((card, i) => {
      const cardY = currentY + i * this.gapY;
      this.drawCard(card, currentX, cardY);
    });
  }

  drawCompletedSequences(completedSequences) {
    if (completedSequences.length === 0) return;
    
    // Draw background area for completed sequences
    const areaHeight = Math.min(completedSequences.length * 15 + 40, 250);
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.fillRect(this.completedX - 10, this.completedY - 25, this.cardW * 0.6 + 20, areaHeight);
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(this.completedX - 10, this.completedY - 25, this.cardW * 0.6 + 20, areaHeight);
    
    // Draw label
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 14px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`Completed: ${completedSequences.length}/8`, this.completedX + (this.cardW * 0.6) / 2, this.completedY - 10);
    this.ctx.textAlign = 'left';
    
    // Draw each completed sequence as a stacked pile
    completedSequences.forEach((sequence, index) => {
      const x = this.completedX;
      const y = this.completedY + index * 15;
      
      // Draw only the top card of each sequence (K card)
      const topCard = sequence[0]; // First card is K (bottom of sequence)
      const img = this.loadCardImage(topCard);
      
      if (img.complete && img.naturalWidth > 0) {
        // Draw with slight offset for stacked effect
        const offset = index * 2;
        this.ctx.drawImage(
          img,
          x + offset, y + offset,
          this.cardW * 0.6, this.cardH * 0.6
        );
      } else {
        // Fallback
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(x + index * 2, y + index * 2, this.cardW * 0.6, this.cardH * 0.6);
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x + index * 2, y + index * 2, this.cardW * 0.6, this.cardH * 0.6);
      }
    });
  }
}
