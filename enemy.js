import { BALANCE, getBossConfig } from './balance.js';

export class EnemyManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.enemies = [];
    this.projectiles = [];
    this.spawnTimer = 0;
    this.spawnInterval = BALANCE.enemy.baseSpawnInterval;
    this.worldX = 0;
    this.bossMode = false;
    this.stageBoss = null;
  }

  update(scrollSpeed, groundY, arrowSlowFactor = 1, stageLevel = 1, reducedMode = false) {
    this.worldX += scrollSpeed;
    this.spawnTimer++;
    const level = Math.max(1, Math.min(stageLevel, 7));
    const spawnScale = 1 / (1 + (level - 1) * BALANCE.enemy.spawnScalePerStage);
    const currentSpawnInterval = this.spawnInterval * spawnScale * (reducedMode ? 1.35 : 1);

    if (!this.bossMode) {
      if (this.spawnTimer >= currentSpawnInterval) {
        this.spawnTimer = 0;
        this._spawnElf(groundY, level);
      }

      for (const elf of this.enemies) {
        if (elf.dead) continue;
        elf.screenX = elf.worldX - this.worldX;
        elf.bobOffset = Math.sin(Date.now() / 400 + elf.phase) * 7;

        elf.shootTimer += 1;
        if (elf.shootTimer >= elf.shootInterval &&
            elf.screenX > 60 && elf.screenX < this.canvas.width - 30) {
          elf.shootTimer = 0;
          this._shoot(elf, groundY, level);
        }
      }
    } else if (this.stageBoss && !this.stageBoss.dead) {
      const boss = this.stageBoss;
      boss.bobOffset = Math.sin(Date.now() / 380) * 8;
      boss.shootTimer++;
      const hpRatio = boss.hp / boss.maxHp;
      const stagePressure = Math.max(0.65, 1 - (boss.stageNo - 1) * 0.05);
      boss.shootInterval = Math.max(
        36,
        Math.floor((hpRatio < 0.3 ? boss.baseShootInterval * 0.72 : hpRatio < 0.6 ? boss.baseShootInterval * 0.88 : boss.baseShootInterval) * stagePressure)
      );
      if (boss.shootTimer >= boss.shootInterval) {
        boss.shootTimer = 0;
        this._shootBossProjectile(boss, groundY, 0);
        const extra = hpRatio < 0.25 ? 2 : hpRatio < 0.55 ? 1 : 0;
        for (let i = 1; i <= extra; i++) {
          const spread = boss.spread * i;
          this._shootBossProjectile(boss, groundY, -spread);
          this._shootBossProjectile(boss, groundY, spread);
        }
      }
    }

    for (const p of this.projectiles) {
      const slowScale = p.applySlow ? arrowSlowFactor : 1;
      p.x += p.vx * slowScale;
      p.y += p.vy * slowScale;
    }

    if (!this.bossMode) {
      this.enemies = this.enemies.filter(
        e => !e.dead && e.screenX > -100 && e.screenX < this.canvas.width + 300
      );
    }
    this.projectiles = this.projectiles.filter(
      p => !p.destroyed &&
        p.x > -60 && p.x < this.canvas.width + 60 &&
        p.y < this.canvas.height + 60
    );
  }

  _spawnElf(groundY, stageLevel = 1) {
    const level = Math.max(1, Math.min(stageLevel, 7));
    const hp = level >= 6 ? 4 : level >= 4 ? 3 : 2;
    this.enemies.push({
      worldX: this.worldX + this.canvas.width + 40 + Math.random() * 60,
      screenX: this.canvas.width + 60,
      y: groundY - 140 - Math.random() * 60,
      w: 48, h: 48,
      hp,
      maxHp: hp,
      dead: false,
      shootTimer: 20 + Math.floor(Math.random() * 30),
      shootInterval: Math.max(
        BALANCE.enemy.minShootInterval,
        BALANCE.enemy.shootIntervalBase - (level - 1) * BALANCE.enemy.shootIntervalStageDelta
      ) + Math.floor(Math.random() * 55),
      phase: Math.random() * Math.PI * 2,
      bobOffset: 0,
      hitFlash: 0,
    });
  }

  _shoot(elf, groundY, stageLevel = 1) {
    const level = Math.max(1, Math.min(stageLevel, 7));
    const sx = elf.screenX + elf.w / 2;
    const sy = elf.y + elf.h / 2 + elf.bobOffset;
    // 플레이어 중심을 향해 화살 조준
    const targetX = 148;
    const targetY = groundY - 60;
    const dx = targetX - sx;
    const dy = targetY - sy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = BALANCE.enemy.arrowBaseSpeed + level * BALANCE.enemy.arrowSpeedPerStage;

    this.projectiles.push({
      x: sx, y: sy,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
      w: 48, h: 38,
      icon: '🏹',
      applySlow: true,
      destroyed: false,
    });
  }

  _shootBossProjectile(boss, groundY, spread = 0) {
    const sx = boss.x + boss.w * 0.2;
    const sy = boss.y + boss.h * 0.45 + boss.bobOffset;
    const targetX = 148;
    const targetY = groundY - 60;
    const dx = targetX - sx;
    const dy = targetY - sy;
    const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const speed = boss.projectileSpeed;
    const baseVx = (dx / dist) * speed;
    const baseVy = (dy / dist) * speed + 0.03;
    const cos = Math.cos(spread);
    const sin = Math.sin(spread);

    this.projectiles.push({
      x: sx,
      y: sy,
      vx: baseVx * cos - baseVy * sin,
      vy: baseVx * sin + baseVy * cos,
      w: 38,
      h: 32,
      icon: boss.projectileIcon,
      applySlow: false,
      destroyed: false,
    });
  }

  activateStageBoss(stageNo, groundY) {
    const clamped = Math.max(1, Math.min(stageNo, 7));
    const cfg = getBossConfig(clamped);

    this.bossMode = true;
    this.enemies = [];
    this.projectiles = [];
    this.spawnTimer = 0;
    this.stageBoss = {
      stageNo: clamped,
      x: this.canvas.width - 220,
      y: groundY - 170,
      w: 110,
      h: 110,
      hp: cfg.hp,
      maxHp: cfg.hp,
      shootTimer: 0,
      shootInterval: cfg.shoot,
      baseShootInterval: cfg.shoot,
      projectileIcon: cfg.icon,
      projectileSpeed: cfg.speed,
      spread: cfg.spread,
      emoji: cfg.emoji,
      name: cfg.name,
      bgm: cfg.bgm,
      bobOffset: 0,
      dead: false,
      hitFlash: 0,
    };
  }

  getBossInfo(stageNo = null) {
    const st = stageNo ?? (this.stageBoss ? this.stageBoss.stageNo : 1);
    return getBossConfig(st);
  }

  getCurrentBossInfo() {
    if (!this.stageBoss || this.stageBoss.dead) return null;
    return {
      stageNo: this.stageBoss.stageNo,
      name: this.stageBoss.name,
      emoji: this.stageBoss.emoji,
      bgm: this.stageBoss.bgm,
      hp: this.stageBoss.hp,
      maxHp: this.stageBoss.maxHp,
    };
  }

  isStageBossMode() { return this.bossMode && !!this.stageBoss && !this.stageBoss.dead; }

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
    let bossDefeated = false;

    if (this.bossMode && this.stageBoss && !this.stageBoss.dead) {
      const boss = this.stageBoss;
      const bossTop = boss.y + boss.bobOffset;
      for (const bullet of bullets) {
        if (bullet.destroyed) continue;
        if (bullet.x < boss.x + boss.w &&
            bullet.x + bullet.w > boss.x &&
            bullet.y < bossTop + boss.h &&
            bullet.y + bullet.h > bossTop) {
          bullet.destroyed = true;
          boss.hp--;
          boss.hitFlash = 8;
          if (boss.hp <= 0) {
            boss.dead = true;
            bossDefeated = true;
            killed.push({ x: boss.x + boss.w / 2, y: bossTop, score: 180 + boss.stageNo * 50, isBoss: true });
            break;
          }
        }
      }
      return { killed, bossDefeated, bossStage: boss.stageNo };
    }

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
    return { killed, bossDefeated, bossStage: 0 };
  }

  reset() {
    this.enemies = [];
    this.projectiles = [];
    this.spawnTimer = 0;
    this.worldX = 0;
    this.bossMode = false;
    this.stageBoss = null;
  }

  draw(ctx) {
    ctx.save();

    // 발사체 그리기
    for (const p of this.projectiles) {
      if (p.destroyed) continue;
      ctx.save();
      ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
      ctx.rotate(Math.atan2(p.vy, p.vx));
      ctx.font = '42px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.icon || '🏹', 0, 0);
      ctx.restore();
    }

    if (this.bossMode && this.stageBoss && !this.stageBoss.dead) {
      const boss = this.stageBoss;
      const drawY = boss.y + boss.bobOffset;

      if (boss.hitFlash > 0) {
        ctx.globalAlpha = boss.hitFlash % 4 < 2 ? 0.45 : 1;
        boss.hitFlash--;
      } else {
        ctx.globalAlpha = 1;
      }

      ctx.font = `${boss.w}px serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.shadowColor = '#f39c12';
      ctx.shadowBlur = 16;
      ctx.fillText(boss.emoji || '🐒', boss.x, drawY);
      ctx.globalAlpha = 1;

      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(boss.x, drawY - 14, boss.w, 8);
      ctx.fillStyle = '#f1c40f';
      ctx.fillRect(boss.x, drawY - 14, boss.w * (boss.hp / boss.maxHp), 8);
      ctx.restore();
      return;
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
      ctx.fillRect(elf.screenX, drawY - 10, elf.w * (elf.hp / elf.maxHp), 5);
    }

    ctx.restore();
  }
}
