import { BALANCE } from './balance.js';

export class Player {
  constructor(canvas) {
    this.canvas = canvas;
    this.width = 64;
    this.height = 64;
    this.x = 120;
    this.y = canvas.height - 160;
    this.vy = 0;
    this.gravity = 0.6;
    this.jumpForce = -14;
    this.isGrounded = false;
    this.maxJumps = 1;
    this.jumpCount = 0;
    this.direction = 1;
    this.moving = false;

    // Animation (walk bob)
    this.frame = 0;
    this.frameTick = 0;
    this.frameDelay = 6;
    this.totalFrames = 4;

    // HP: 0~6 (3 hearts, each heart = 2 HP)
    this.hp = 6;
    this.maxHp = 6;
    this.invincible = 0;
    this.alive = true;
    this.fellInPit = false;

    // Slow mode (shoe item)
    this.slowModeTimer = 0;
    this.springModeTimer = 0;
    this.shieldTimer = 0;

    // Images
    this.imgRight = new Image();
    this.imgRight.src = 'cat_right.png';
    this.imgLeft = new Image();
    this.imgLeft.src = 'cat_left.png';
  }

  jump() {
    if (this.jumpCount < this.maxJumps) {
      this.vy = this.jumpForce;
      this.isGrounded = false;
      this.jumpCount++;
    }
  }

  update(keys, groundY, pits = []) {
    if (!this.alive) return;

    this.moving = false;
    if (keys['ArrowRight']) { this.direction = 1; this.moving = true; }
    if (keys['ArrowLeft']) { this.direction = -1; this.moving = true; }

    if (this.slowModeTimer > 0) this.slowModeTimer--;
    if (this.shieldTimer > 0) this.shieldTimer--;
    if (this.springModeTimer > 0) {
      this.springModeTimer--;
      this.maxJumps = 2;
    } else {
      this.maxJumps = 1;
    }

    this.vy += this.gravity;
    this.y += this.vy;

    const midX = this.x + this.width / 2;
    const inPit = pits.some(p => midX > p.screenX && midX < p.screenX + p.w);

    if (!inPit && this.y >= groundY - this.height) {
      this.y = groundY - this.height;
      this.vy = 0;
      this.isGrounded = true;
      this.jumpCount = 0;
    } else {
      this.isGrounded = false;
      if (inPit && this.y > this.canvas.height + 50) {
        this.fellInPit = true;
      }
    }

    if (this.moving && this.isGrounded) {
      this.frameTick++;
      if (this.frameTick >= this.frameDelay) {
        this.frameTick = 0;
        this.frame = (this.frame + 1) % this.totalFrames;
      }
    } else {
      this.frame = 0;
    }

    if (this.invincible > 0) this.invincible--;
  }

  // amount: 2 = 목숨1개(~33%), 3 = 50%
  getHit(amount = 2) {
    if (this.invincible > 0) return false;
    if (this.shieldTimer > 0) {
      this.invincible = BALANCE.defense.shieldParryInvincibleFrames;
      return false;
    }
    this.hp = Math.max(0, this.hp - amount);
    this.invincible = BALANCE.player.hitInvincibleFrames;
    if (this.hp <= 0) this.alive = false;
    return true;
  }

  // amount: 3 = 50% 회복
  heal(amount) {
    this.hp = Math.min(this.hp + amount, this.maxHp);
  }

  activateSlowMode(duration = 300) {
    this.slowModeTimer = duration;
  }

  activateSpringMode(duration = 300) {
    this.springModeTimer = duration;
    this.maxJumps = 2;
  }

  activateShield(duration = BALANCE.defense.shieldDurationFrames) {
    this.shieldTimer = Math.max(this.shieldTimer, duration);
  }

  respawn(groundY) {
    this.y = groundY - this.height;
    this.vy = 0;
    this.isGrounded = true;
    this.jumpCount = 0;
    this.fellInPit = false;
    if (this.invincible <= 0) this.invincible = BALANCE.player.respawnInvincibleFrames;
  }

  getBounds() {
    return { x: this.x + 8, y: this.y + 8, w: this.width - 16, h: this.height - 8 };
  }

  draw(ctx) {
    if (!this.alive) return;
    const blink = this.invincible > 0 && Math.floor(this.invincible / 6) % 2 === 0;
    if (blink) return;

    // Walking bob: 이동 중일 때 살짝 위아래로 움직임
    const bob = (this.moving && this.isGrounded)
      ? Math.sin(this.frame * Math.PI / 2) * 3
      : 0;

    // 점프 중엔 살짝 기울기
    const tilt = !this.isGrounded ? (this.vy < 0 ? -0.15 : 0.1) : 0;

    const img = this.direction === -1 ? this.imgLeft : this.imgRight;
    const drawX = this.x;
    const drawY = this.y + bob;

    ctx.save();

    if (this.slowModeTimer > 0) {
      ctx.shadowColor = '#74ebd5';
      ctx.shadowBlur = 22;
    }
    if (this.shieldTimer > 0) {
      ctx.shadowColor = '#6ec6ff';
      ctx.shadowBlur = 18;
    }

    if (tilt !== 0) {
      ctx.translate(drawX + this.width / 2, drawY + this.height / 2);
      ctx.rotate(tilt);
      ctx.drawImage(img, -this.width / 2, -this.height / 2, this.width, this.height);
    } else {
      ctx.drawImage(img, drawX, drawY, this.width, this.height);
    }

    ctx.restore();
  }
}
