export class ItemManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.items = [];
    this.spawnTimer = 0;
    this.spawnInterval = 110;
    this.worldX = 0;

    this.itemTypes = [
      { emoji: '🍎', type: 'fruit', score: 0, w: 34, h: 34, color: '#ff6b6b', weight: 3 },
      { emoji: '🍊', type: 'fruit', score: 0, w: 34, h: 34, color: '#FFA500', weight: 2 },
      { emoji: '🍇', type: 'fruit', score: 0, w: 34, h: 34, color: '#9B59B6', weight: 2 },
      { emoji: '🪙', type: 'coin',  score: 10, w: 36, h: 36, color: '#FFD700', weight: 5 },
      { emoji: '💰', type: 'coin',  score: 30, w: 36, h: 36, color: '#FFD700', weight: 1 },
      { emoji: '🌟', type: 'coin',  score: 20, w: 38, h: 38, color: '#f7971e', weight: 2 },
      { emoji: '👟', type: 'shoe',  score: 0,  w: 36, h: 36, color: '#a8edea', weight: 1 },
      { emoji: '👠', type: 'red_shoe', score: 0, w: 36, h: 36, color: '#ff6b6b', weight: 1 },
      { emoji: '🛡️', type: 'blue_shield', score: 0, w: 38, h: 38, color: '#6ec6ff', weight: 1 },
    ];

    this.weaponTypes = [
      { emoji: '🔥', type: 'weapon', weaponType: 'fire',     score: 0, w: 38, h: 38, color: '#ff9a3c' },
      { emoji: '💧', type: 'weapon', weaponType: 'water',    score: 0, w: 38, h: 38, color: '#6ec6ff' },
      { emoji: '⚡', type: 'weapon', weaponType: 'electric', score: 0, w: 38, h: 38, color: '#ffe066' },
      { emoji: '🚀', type: 'weapon', weaponType: 'missile',  score: 0, w: 38, h: 38, color: '#f8f9fa' },
    ];

    // Build weighted array for random selection
    this._weighted = [];
    for (const t of this.itemTypes) {
      for (let i = 0; i < t.weight; i++) this._weighted.push(t);
    }

    this._preSpawn();
  }

  _preSpawn() {
    const groundY = this.canvas.height - 120;
    const heights = [groundY - 60, groundY - 120, groundY - 180];
    const positions = [280, 450, 630, 800];
    for (const sx of positions) {
      const type = this._weighted[Math.floor(Math.random() * this._weighted.length)];
      const y = heights[Math.floor(Math.random() * heights.length)];
      this.items.push({
        ...type,
        worldX: sx,
        screenX: sx,
        y,
        floatOffset: 0,
        phase: Math.random() * Math.PI * 2,
        collected: false,
      });
    }
  }

  update(scrollSpeed, groundY) {
    this.worldX += scrollSpeed;
    this.spawnTimer++;

    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this._spawn(groundY);
    }

    for (const item of this.items) {
      item.screenX = item.worldX - this.worldX;
      item.floatOffset = Math.sin(Date.now() / 300 + item.phase) * 8;
    }

    this.items = this.items.filter(i => !i.collected && i.screenX > -60 && i.screenX < this.canvas.width + 100);
  }

  _spawn(groundY) {
    const type = this._weighted[Math.floor(Math.random() * this._weighted.length)];
    const heights = [groundY - 60, groundY - 120, groundY - 180];
    const y = heights[Math.floor(Math.random() * heights.length)];

    this.items.push({
      ...type,
      worldX: this.worldX + this.canvas.width + 20 + Math.random() * 80,
      screenX: this.canvas.width + 20,
      y,
      floatOffset: 0,
      phase: Math.random() * Math.PI * 2,
      collected: false,
    });
  }

  dropWeaponAt(screenX, y) {
    const type = this.weaponTypes[Math.floor(Math.random() * this.weaponTypes.length)];
    this.items.push({
      ...type,
      worldX: this.worldX + screenX,
      screenX,
      y: Math.max(60, y),
      floatOffset: 0,
      phase: Math.random() * Math.PI * 2,
      collected: false,
    });
  }

  collect(playerBounds) {
    const collected = [];

    for (const item of this.items) {
      if (item.collected) continue;
      const ib = {
        x: item.screenX + 4,
        y: item.y + item.floatOffset + 4,
        w: item.w - 8,
        h: item.h - 8,
      };

      if (
        playerBounds.x < ib.x + ib.w &&
        playerBounds.x + playerBounds.w > ib.x &&
        playerBounds.y < ib.y + ib.h &&
        playerBounds.y + playerBounds.h > ib.y
      ) {
        item.collected = true;
        collected.push({
          x: item.screenX,
          y: item.y,
          emoji: item.emoji,
          score: item.score,
          type: item.type,
          weaponType: item.weaponType || null,
        });
      }
    }

    return { collected };
  }

  reset() {
    this.items = [];
    this.spawnTimer = 0;
    this.worldX = 0;
  }

  draw(ctx) {
    ctx.save();
    ctx.textBaseline = 'top';
    for (const item of this.items) {
      if (item.collected) continue;
      const drawY = item.y + item.floatOffset;
      ctx.shadowColor = item.color;
      ctx.shadowBlur = 14;
      ctx.font = `${item.w}px serif`;
      ctx.fillText(item.emoji, item.screenX, drawY);
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }
}
