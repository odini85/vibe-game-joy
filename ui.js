export class UI {
  constructor(canvas) {
    this.canvas = canvas;
    this.popups = [];
  }

  addPopup(x, y, text, color = '#FFD700') {
    this.popups.push({ x, y, text, color, life: 60, maxLife: 60 });
  }

  updatePopups() {
    this.popups = this.popups.filter(p => p.life > 0);
    for (const p of this.popups) {
      p.life--;
      p.y -= 1.2;
    }
  }

  drawHUD(ctx, score, hp, maxHp, distance, speedBoost = false) {
    const pad = 16;
    const numHearts = maxHp / 2; // maxHp=6 -> 3 hearts

    // Panel background
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.beginPath();
    ctx.roundRect(pad, pad, 220, 68, 16);
    ctx.fill();
    ctx.restore();

    // Score
    ctx.save();
    ctx.font = 'bold 22px "Nunito", sans-serif';
    ctx.fillStyle = '#FFD700';
    ctx.textBaseline = 'top';
    ctx.fillText(`🪙 ${score}`, pad + 14, pad + 10);
    ctx.restore();

    // Distance
    ctx.save();
    ctx.font = '15px "Nunito", sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'top';
    ctx.fillText(`📍 ${Math.floor(distance)}m`, pad + 14, pad + 38);
    ctx.restore();

    // Speed boost indicator
    if (speedBoost) {
      ctx.save();
      ctx.font = 'bold 16px "Nunito", sans-serif';
      ctx.fillStyle = '#74ebd5';
      ctx.shadowColor = '#74ebd5';
      ctx.shadowBlur = 10;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'center';
      ctx.fillText('👟 SLOW!', this.canvas.width / 2, pad + 10);
      ctx.restore();
    }

    // HP hearts: i=0 is rightmost (depletes first), i=numHearts-1 is leftmost
    // heartVal = min(max(hp - (numHearts-1-i)*2, 0), 2)
    //   2 = full heart, 1 = half heart, 0 = empty
    ctx.save();
    ctx.textBaseline = 'top';
    ctx.font = '22px serif';
    for (let i = 0; i < numHearts; i++) {
      const hx = this.canvas.width - pad - 30 - (numHearts - 1 - i) * 34;
      const hy = pad + 10;
      const heartVal = Math.min(Math.max(hp - (numHearts - 1 - i) * 2, 0), 2);

      if (heartVal >= 2) {
        ctx.fillText('❤️', hx, hy);
      } else if (heartVal === 1) {
        // Left half: red
        ctx.save();
        ctx.beginPath();
        ctx.rect(hx, hy, 11, 24);
        ctx.clip();
        ctx.fillText('❤️', hx, hy);
        ctx.restore();
        // Right half: empty
        ctx.save();
        ctx.beginPath();
        ctx.rect(hx + 11, hy, 13, 24);
        ctx.clip();
        ctx.fillText('🖤', hx, hy);
        ctx.restore();
      } else {
        ctx.fillText('🖤', hx, hy);
      }
    }
    ctx.restore();
  }

  drawPopups(ctx) {
    for (const p of this.popups) {
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 20px "Nunito", sans-serif';
      ctx.fillStyle = p.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fillText(p.text, p.x, p.y);
      ctx.restore();
    }
  }

  drawStartScreen(ctx) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.52)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.font = 'bold 54px "Nunito", sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#fc5c7d';
    ctx.shadowBlur = 30;
    ctx.fillText('🐱 냥이의 대모험', this.canvas.width / 2, this.canvas.height / 2 - 90);

    ctx.shadowBlur = 0;
    ctx.font = '20px "Nunito", sans-serif';
    ctx.fillStyle = '#ffe';
    ctx.fillText('← → 방향키로 이동   |   ↑ 점프   |   Space 공격 ✨', this.canvas.width / 2, this.canvas.height / 2 - 18);
    ctx.fillText('🍎 과일 = 체력 50% 회복   🪙 코인 = 점수   👟 신발 = 슬로우 모드', this.canvas.width / 2, this.canvas.height / 2 + 22);
    ctx.fillText('🍄 버섯=-50%  ⚠️ 낭떠러지=점프  🧝 엘프=Space로 처치!', this.canvas.width / 2, this.canvas.height / 2 + 60);

    if (Math.floor(Date.now() / 500) % 2 === 0) {
      ctx.font = 'bold 26px "Nunito", sans-serif';
      ctx.fillStyle = '#FFD700';
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 16;
      ctx.fillText('[ ENTER 또는 클릭하여 시작 ]', this.canvas.width / 2, this.canvas.height / 2 + 112);
    }
    ctx.restore();
  }

  drawGameOver(ctx, score, distance, bestScore) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;

    ctx.font = 'bold 48px "Nunito", sans-serif';
    ctx.fillStyle = '#ff6b6b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ff6b6b';
    ctx.shadowBlur = 20;
    ctx.fillText('💔 게임 오버!', cx, cy - 90);

    ctx.shadowBlur = 0;
    ctx.font = '26px "Nunito", sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(`점수: 🪙 ${score}`, cx, cy - 20);
    ctx.fillText(`거리: 📍 ${Math.floor(distance)}m`, cx, cy + 24);

    ctx.font = '20px "Nunito", sans-serif';
    ctx.fillStyle = '#FFD700';
    ctx.fillText(`최고기록: 🪙 ${bestScore}`, cx, cy + 66);

    if (Math.floor(Date.now() / 500) % 2 === 0) {
      ctx.font = 'bold 24px "Nunito", sans-serif';
      ctx.fillStyle = '#a8edea';
      ctx.shadowColor = '#a8edea';
      ctx.shadowBlur = 12;
      ctx.fillText('[ ENTER 또는 클릭하여 다시 시작 ]', cx, cy + 118);
    }
    ctx.restore();
  }
}
