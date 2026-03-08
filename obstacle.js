export class ObstacleManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.obstacles = [];
    this.spawnTimer = 0;
    this.spawnInterval = 80;
    this.pitTimer = 0;
    this.pitInterval = 600; // 낭떠러지는 10초마다 가끔 등장
    this.worldX = 0;

    this.obstacleTypes = [
      { emoji: '🪨', type: 'rock',      w: 44, h: 40, ground: true },
      { emoji: '🌵', type: 'cactus',    w: 36, h: 56, ground: true },
      { emoji: '🪵', type: 'log',       w: 50, h: 32, ground: true },
      { emoji: '⚡', type: 'lightning', w: 40, h: 40, ground: false, floatY: -80 },
      { emoji: '🔥', type: 'fire',      w: 40, h: 44, ground: true },
      { emoji: '🍄', type: 'mushroom',  w: 44, h: 44, ground: true },
      { emoji: '🍄', type: 'mushroom',  w: 44, h: 44, ground: true }, // double weight
    ];

    this._preSpawn();
  }

  _preSpawn() {
    const groundY = this.canvas.height - 120;
    // 시작부터 화면 전반에 장애물 배치
    const positions = [320, 520, 720, 880];
    for (const sx of positions) {
      const type = this.obstacleTypes[Math.floor(Math.random() * this.obstacleTypes.length)];
      const y = type.ground ? groundY - type.h : groundY + (type.floatY || -80);
      this.obstacles.push({ ...type, worldX: sx, screenX: sx, y });
    }
  }

  update(scrollSpeed, groundY) {
    this.worldX += scrollSpeed;
    this.spawnTimer++;
    this.pitTimer++;

    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this._spawn(groundY);
      if (this.spawnInterval > 70) this.spawnInterval -= 0.3;
    }

    if (this.pitTimer >= this.pitInterval) {
      this.pitTimer = 0;
      this._spawnPit(groundY);
    }

    for (const obs of this.obstacles) {
      obs.screenX = obs.worldX - this.worldX;
    }

    this.obstacles = this.obstacles.filter(o => o.screenX > -200 && o.screenX < this.canvas.width + 200);
  }

  _spawn(groundY) {
    const type = this.obstacleTypes[Math.floor(Math.random() * this.obstacleTypes.length)];
    const y = type.ground
      ? groundY - type.h
      : groundY + (type.floatY || -80);

    this.obstacles.push({
      ...type,
      worldX: this.worldX + this.canvas.width + 80 + Math.random() * 100,
      screenX: this.canvas.width + 80,
      y,
    });
  }

  _spawnPit(groundY) {
    const w = 110 + Math.random() * 60;
    this.obstacles.push({
      type: 'pit',
      worldX: this.worldX + this.canvas.width + 80,
      screenX: this.canvas.width + 80,
      w,
      h: this.canvas.height - groundY + 20,
      y: groundY,
    });
  }

  reset() {
    this.obstacles = [];
    this.spawnTimer = 0;
    this.spawnInterval = 80;
    this.pitTimer = 0;
    this.worldX = 0;
  }

  getPits() {
    return this.obstacles.filter(o => o.type === 'pit');
  }

  getBoundsAll() {
    return this.obstacles
      .filter(o => o.type !== 'pit')
      .map(o => ({
        x: o.screenX + 6,
        y: o.y + 6,
        w: o.w - 12,
        h: o.h - 12,
        ref: o,
      }));
  }

  drawPits(ctx, groundY) {
    ctx.save();
    for (const obs of this.obstacles) {
      if (obs.type !== 'pit') continue;

      // Dark hole overwriting ground
      const grad = ctx.createLinearGradient(0, groundY, 0, this.canvas.height);
      grad.addColorStop(0, '#1a0800');
      grad.addColorStop(1, '#000');
      ctx.fillStyle = grad;
      ctx.fillRect(obs.screenX, groundY, obs.w, this.canvas.height - groundY);

      // Warning above pit
      ctx.font = '22px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('⚠️', obs.screenX + obs.w / 2, groundY - 34);
    }
    ctx.restore();
  }

  draw(ctx) {
    ctx.save();
    ctx.textBaseline = 'top';
    for (const obs of this.obstacles) {
      if (obs.type === 'pit') continue;
      if (obs.type === 'mushroom') {
        ctx.shadowColor = '#9B59B6';
        ctx.shadowBlur = 14;
      }
      ctx.font = `${obs.w}px serif`;
      ctx.fillText(obs.emoji, obs.screenX, obs.y);
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }
}
