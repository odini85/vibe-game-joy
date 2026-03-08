export class Background {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Parallax layers: [offsetX, speed multiplier, elements[]]
    this.layers = [
      { offsetX: 0, speed: 0.2, items: this._genClouds(canvas) },
      { offsetX: 0, speed: 0.5, items: this._genTrees(canvas) },
      { offsetX: 0, speed: 1.0, items: this._genGround(canvas) },
    ];

    this.scrollX = 0;
    this.tileW = canvas.width * 2;
  }

  _genClouds(canvas) {
    const clouds = [];
    for (let i = 0; i < 8; i++) {
      clouds.push({
        x: Math.random() * canvas.width * 2,
        y: 40 + Math.random() * 100,
        emoji: '☁️',
        size: 32 + Math.random() * 24,
      });
    }
    return clouds;
  }

  _genTrees(canvas) {
    const trees = [];
    const emojis = ['🌲', '🌳', '🌵', '🎋', '🌴'];
    for (let i = 0; i < 14; i++) {
      trees.push({
        x: i * (canvas.width * 2 / 14) + Math.random() * 60,
        y: canvas.height - 160,
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
        size: 44 + Math.random() * 20,
      });
    }
    return trees;
  }

  _genGround(canvas) {
    // Decorative flowers on ground
    const flowers = [];
    const emojis = ['🌸', '🌼', '🍄', '🌿', '🪨'];
    for (let i = 0; i < 20; i++) {
      flowers.push({
        x: i * (canvas.width * 2 / 20) + Math.random() * 40,
        y: canvas.height - 118,
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
        size: 22,
      });
    }
    return flowers;
  }

  scroll(direction) {
    this.scrollX += direction;
  }

  drawSky(ctx) {
    // Gradient sky
    const grad = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    grad.addColorStop(0, '#a8edea');
    grad.addColorStop(0.6, '#fed6e3');
    grad.addColorStop(1, '#f9f3b0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawGround(ctx) {
    const groundY = this.canvas.height - 120;
    // Ground fill
    const ggrad = ctx.createLinearGradient(0, groundY, 0, this.canvas.height);
    ggrad.addColorStop(0, '#7ec850');
    ggrad.addColorStop(0.15, '#5aaf2a');
    ggrad.addColorStop(1, '#3d7a1a');
    ctx.fillStyle = ggrad;
    ctx.fillRect(0, groundY, this.canvas.width, this.canvas.height - groundY);

    // Ground top strip
    ctx.fillStyle = '#a8e063';
    ctx.fillRect(0, groundY, this.canvas.width, 14);
  }

  draw(ctx) {
    this.drawSky(ctx);

    // Draw parallax layers
    for (const layer of this.layers) {
      const ox = ((-this.scrollX * layer.speed) % this.tileW + this.tileW * 2) % this.tileW;

      ctx.save();
      ctx.font = `serif`;
      ctx.textBaseline = 'top';
      for (const item of layer.items) {
        let drawX = (item.x - ox + this.tileW * 2) % this.tileW;
        // Draw twice for seamless loop
        for (let rep = 0; rep < 2; rep++) {
          const fx = drawX + rep * this.tileW - this.tileW / 2;
          if (fx > -80 && fx < this.canvas.width + 80) {
            ctx.font = `${item.size}px serif`;
            ctx.fillText(item.emoji, fx, item.y);
          }
        }
      }
      ctx.restore();
    }

    this.drawGround(ctx);
  }

  get groundY() {
    return this.canvas.height - 120;
  }
}
