export class EnemyManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.enemies = [];
    this.projectiles = [];
    this.spawnTimer = 0;
    this.spawnInterval = 480; // 8초(60fps) 후 첫 엘프 등장
    this.worldX = 0;
  }

  update(scrollSpeed, groundY, slowFactor = 1) {
    this.worldX += scrollSpeed;
    this.spawnTimer++;

    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this._spawnElf(groundY);
    }

    for (const elf of this.enemies) {
      if (elf.dead) continue;
      elf.screenX = elf.worldX - this.worldX;
      elf.bobOffset = Math.sin(Date.now() / 400 + elf.phase) * 7;

      elf.shootTimer += slowFactor; // 슬로우 중엔 발사 타이머도 느리게
      if (elf.shootTimer >= elf.shootInterval &&
          elf.screenX > 60 && elf.screenX < this.canvas.width - 30) {
        elf.shootTimer = 0;
        this._shoot(elf, groundY, slowFactor);
      }
    }

    for (const p of this.projectiles) {
      p.x += p.vx * slowFactor; // 화살 속도에 슬로우 적용
      p.y += p.vy * slowFactor;
    }

    this.enemies = this.enemies.filter(
      e => !e.dead && e.screenX > -100 && e.screenX < this.canvas.width + 300
    );
    this.projectiles = this.projectiles.filter(
      p => !p.destroyed &&
        p.x > -60 && p.x < this.canvas.width + 60 &&
        p.y < this.canvas.height + 60
    );
  }

  _spawnElf(groundY) {
    this.enemies.push({
      worldX: this.worldX + this.canvas.width + 60 + Math.random() * 80,
      screenX: this.canvas.width + 60,
      y: groundY - 140 - Math.random() * 60,
      w: 48, h: 48,
      hp: 2,
      dead: false,
      shootTimer: 40 + Math.floor(Math.random() * 40),
      shootInterval: 100 + Math.floor(Math.random() * 60),
      phase: Math.random() * Math.PI * 2,
      bobOffset: 0,
      hitFlash: 0,
    });
  }

  _shoot(elf, groundY, slowFactor = 1) {
    const sx = elf.screenX + elf.w / 2;
    const sy = elf.y + elf.h / 2 + elf.bobOffset;
    // 플레이어 중심을 향해 화살 조준
    const targetX = 148;
    const targetY = groundY - 60;
    const dx = targetX - sx;
    const dy = targetY - sy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = 6;

    this.projectiles.push({
      x: sx, y: sy,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
      w: 48, h: 38,
      destroyed: false,
    });
  }

  // 플레이어가 화살에 맞았는지 체크
  checkPlayerHit(playerBounds) {
    const hits = [];
    for (const p of this.projectiles) {
      if (p.destroyed) continue;
      if (p.x < playerBounds.x + playerBounds.w &&
          p.x + p.w > playerBounds.x &&
          p.y < playerBounds.y + playerBounds.h &&
          p.y + p.h > playerBounds.y) {
        p.destroyed = true;
        hits.push(p);
      }
    }
    return hits;
  }

  // 플레이어 미사일이 엘프에 맞았는지 체크, 처치 시 반환
  checkBulletHits(bullets) {
    const killed = [];
    for (const bullet of bullets) {
      if (bullet.destroyed) continue;
      for (const elf of this.enemies) {
        if (elf.dead) continue;
        if (bullet.x < elf.screenX + elf.w &&
            bullet.x + bullet.w > elf.screenX &&
            bullet.y < elf.y + elf.bobOffset + elf.h &&
            bullet.y + bullet.h > elf.y + elf.bobOffset) {
          bullet.destroyed = true;
          elf.hp--;
          elf.hitFlash = 12;
          if (elf.hp <= 0) {
            elf.dead = true;
            killed.push({ x: elf.screenX + elf.w / 2, y: elf.y + elf.bobOffset, score: 50 });
          }
          break;
        }
      }
    }
    return killed;
  }

  reset() {
    this.enemies = [];
    this.projectiles = [];
    this.spawnTimer = 0;
    this.worldX = 0;
  }

  draw(ctx) {
    ctx.save();

    // 화살 그리기
    for (const p of this.projectiles) {
      if (p.destroyed) continue;
      ctx.save();
      ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
      ctx.rotate(Math.atan2(p.vy, p.vx));
      ctx.font = '42px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🏹', 0, 0);
      ctx.restore();
    }

    // 엘프 그리기
    for (const elf of this.enemies) {
      if (elf.dead) continue;
      const drawY = elf.y + elf.bobOffset;

      if (elf.hitFlash > 0) {
        ctx.globalAlpha = elf.hitFlash % 4 < 2 ? 0.3 : 1;
        elf.hitFlash--;
      } else {
        ctx.globalAlpha = 1;
      }

      // 엘프 (왼쪽 방향으로 플립)
      ctx.save();
      ctx.translate(elf.screenX + elf.w / 2, 0);
      ctx.scale(-1, 1);
      ctx.font = `${elf.w}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.shadowColor = '#2ecc71';
      ctx.shadowBlur = 12;
      ctx.fillText('🧝', 0, drawY);
      ctx.restore();

      ctx.globalAlpha = 1;

      // HP 바
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(elf.screenX, drawY - 10, elf.w, 5);
      ctx.fillStyle = elf.hp >= 2 ? '#2ecc71' : '#e74c3c';
      ctx.fillRect(elf.screenX, drawY - 10, elf.w * (elf.hp / 2), 5);
    }

    ctx.restore();
  }
}
