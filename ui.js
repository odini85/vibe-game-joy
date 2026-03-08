export class UI {
  constructor(canvas) {
    this.canvas = canvas;
    this.popups = [];
    this.clearCutsceneStart = 0;
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

  drawHUD(
    ctx,
    score,
    hp,
    maxHp,
    distance,
    speedBoost = false,
    currentStage = 1,
    totalStages = 7,
    weaponLabel = '',
    weaponSeconds = 0,
    shieldSeconds = 0,
    springSeconds = 0,
    bossBattleActive = false,
    bossTargetRemaining = 0
  ) {
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

    if (weaponLabel && weaponSeconds > 0) {
      ctx.save();
      ctx.font = 'bold 16px "Nunito", sans-serif';
      ctx.fillStyle = '#ffe066';
      ctx.shadowColor = '#ffe066';
      ctx.shadowBlur = 10;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'center';
      ctx.fillText(`${weaponLabel} x3  ${weaponSeconds}s`, this.canvas.width / 2, pad + 30);
      ctx.restore();
    }

    if (shieldSeconds > 0 || springSeconds > 0) {
      const shieldTxt = shieldSeconds > 0 ? `🛡️ 방어 ${shieldSeconds}s` : '';
      const springTxt = springSeconds > 0 ? `👠 2단점프 ${springSeconds}s` : '';
      const modeTxt = [shieldTxt, springTxt].filter(Boolean).join('   ');
      ctx.save();
      ctx.font = 'bold 14px "Nunito", sans-serif';
      ctx.fillStyle = '#9ad0ff';
      ctx.shadowColor = '#9ad0ff';
      ctx.shadowBlur = 8;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'center';
      ctx.fillText(modeTxt, this.canvas.width / 2, pad + (weaponLabel && weaponSeconds > 0 ? 50 : 30));
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

    // Stage indicator (right side)
    ctx.save();
    ctx.font = 'bold 16px "Nunito", sans-serif';
    ctx.fillStyle = '#a8edea';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    const stageText = bossBattleActive
      ? `현재 스테이지 ${currentStage}/${totalStages} (보스전)`
      : `현재 스테이지 ${currentStage}/${totalStages}`;
    ctx.fillText(stageText, this.canvas.width - pad, pad + 42);
    if (!bossBattleActive) {
      ctx.font = '13px "Nunito", sans-serif';
      ctx.fillStyle = '#fff4a3';
      ctx.fillText(`보스까지 ${Math.max(0, Math.floor(bossTargetRemaining))}점`, this.canvas.width - pad, pad + 62);
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
    ctx.fillText('🍎 과일=체력 회복   🪙 코인=점수   👟 신발=엘프 화살 둔화', this.canvas.width / 2, this.canvas.height / 2 + 22);
    ctx.fillText('👠 빨간신발=2단점프   🛡️ 파란방패=30초 무적방어', this.canvas.width / 2, this.canvas.height / 2 + 60);
    ctx.fillText('🍄 버섯=-50%  ⚠️ 낭떠러지=점프  🧝 엘프=Space로 처치!', this.canvas.width / 2, this.canvas.height / 2 + 92);
    ctx.fillText('🔥💧⚡🚀 무기: 엘프 처치 시 드랍, 획득하면 무기 교체!', this.canvas.width / 2, this.canvas.height / 2 + 124);

    if (Math.floor(Date.now() / 500) % 2 === 0) {
      ctx.font = 'bold 26px "Nunito", sans-serif';
      ctx.fillStyle = '#FFD700';
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 16;
      ctx.fillText('[ ENTER 또는 클릭하여 시작 ]', this.canvas.width / 2, this.canvas.height / 2 + 152);
    }
    ctx.restore();
  }

  drawGameOver(ctx, score, distance, bestScore, allStagesCleared = false, rankings = []) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    const now = Date.now();

    if (allStagesCleared) {
      if (this.clearCutsceneStart === 0) this.clearCutsceneStart = now;
    } else {
      this.clearCutsceneStart = 0;
    }

    const cutsceneElapsed = allStagesCleared ? now - this.clearCutsceneStart : 0;
    const isClearCutscene = allStagesCleared && cutsceneElapsed < 2800;

    if (allStagesCleared) {
      const t = cutsceneElapsed / 1000;

      // Finale cutscene: jumping cat + stars (about 2.8s).
      ctx.save();
      ctx.fillStyle = 'rgba(116, 235, 213, 0.10)';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      const jump = Math.max(0, Math.sin(t * 8)) * 34;
      const catY = cy - 152 - jump;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#ffd34d';
      ctx.shadowBlur = 24;
      ctx.font = '90px serif';
      ctx.fillText('🐱', cx, catY);

      for (let i = 0; i < 12; i++) {
        const a = t * 3.2 + i * 0.55;
        const r = 70 + ((i % 4) * 26);
        const sx = cx + Math.cos(a) * r;
        const sy = catY + Math.sin(a * 1.3) * (24 + (i % 3) * 10);
        ctx.font = `${20 + (i % 3) * 6}px serif`;
        ctx.globalAlpha = 0.45 + 0.45 * Math.abs(Math.sin(t * 5 + i));
        ctx.fillText(i % 2 === 0 ? '✨' : '⭐', sx, sy);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    ctx.font = 'bold 48px "Nunito", sans-serif';
    ctx.fillStyle = allStagesCleared ? '#74ebd5' : '#ff6b6b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = allStagesCleared ? '#74ebd5' : '#ff6b6b';
    ctx.shadowBlur = 20;
    ctx.fillText(allStagesCleared ? '🎉 게임 클리어!' : '💔 게임 오버!', cx, cy - 90);

    ctx.shadowBlur = 0;
    ctx.font = '26px "Nunito", sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(`점수: 🪙 ${score}`, cx, cy - 20);
    ctx.fillText(`거리: 📍 ${Math.floor(distance)}m`, cx, cy + 24);

    ctx.font = '20px "Nunito", sans-serif';
    ctx.fillStyle = '#FFD700';
    ctx.fillText(`최고기록: 🪙 ${bestScore}`, cx, cy + 66);

    if (allStagesCleared) {
      ctx.font = 'bold 22px "Nunito", sans-serif';
      ctx.fillStyle = '#74ebd5';
      ctx.shadowColor = '#74ebd5';
      ctx.shadowBlur = 12;
      ctx.fillText(`축하합니다 '냥이의 모험'을 모두 클리어 하셨습니다!`, cx, cy + 98);
      ctx.shadowBlur = 0;
    }

    if (!isClearCutscene && Math.floor(Date.now() / 500) % 2 === 0) {
      ctx.font = 'bold 24px "Nunito", sans-serif';
      ctx.fillStyle = '#a8edea';
      ctx.shadowColor = '#a8edea';
      ctx.shadowBlur = 12;
      ctx.fillText('[ ENTER 또는 클릭하여 다시 시작 ]', cx, allStagesCleared ? cy + 138 : cy + 118);
    }

    // Top 10 ranking panel
    ctx.save();
    const panelX = this.canvas.width - 270;
    const panelY = 22;
    const panelW = 248;
    const panelH = 260;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 14);
    ctx.fill();

    ctx.font = 'bold 18px "Nunito", sans-serif';
    ctx.fillStyle = '#ffe066';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('TOP 10 RANKING', panelX + 12, panelY + 10);

    ctx.font = '14px "Nunito", sans-serif';
    ctx.fillStyle = '#fff';
    const top = rankings.slice(0, 10);
    for (let i = 0; i < 10; i++) {
      const r = top[i];
      const lineY = panelY + 40 + i * 20;
      const rankLabel = `${i + 1}.`;
      const scoreLabel = r ? `${r.score}점` : '-';
      const nameLabel = r ? String(r.name || '익명') : '-';
      const shortName = nameLabel.length > 10 ? `${nameLabel.slice(0, 9)}…` : nameLabel;
      ctx.fillText(rankLabel, panelX + 12, lineY);
      ctx.fillText(shortName, panelX + 40, lineY);
      ctx.textAlign = 'right';
      ctx.fillText(scoreLabel, panelX + panelW - 14, lineY);
      ctx.textAlign = 'left';
    }
    ctx.restore();
    ctx.restore();
  }

  drawStageClear(ctx, stageNo, score, distance, bestScore) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.58)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;

    ctx.font = 'bold 48px "Nunito", sans-serif';
    ctx.fillStyle = '#74ebd5';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#74ebd5';
    ctx.shadowBlur = 22;
    ctx.fillText(`🎉 ${stageNo}스테이지 클리어!`, cx, cy - 92);

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
      const prompt = stageNo >= 7
        ? '[ ENTER 또는 클릭하여 새 게임 시작 ]'
        : '[ ENTER 또는 클릭하여 다음 스테이지 ]';
      ctx.fillText(prompt, cx, cy + 118);
    }
    ctx.restore();
  }

  drawBossIntro(ctx, stageNo, bossInfo, introTimer = 0) {
    const t = Math.min(1, Math.max(0, introTimer / 150));
    const alpha = 0.25 + (1 - t) * 0.55;
    const cx = this.canvas.width / 2;
    const topY = 26;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(0,0,0,0.56)';
    ctx.beginPath();
    ctx.roundRect(120, topY, this.canvas.width - 240, 96, 14);
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#f1c40f';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#ffe066';
    ctx.font = 'bold 22px "Nunito", sans-serif';
    ctx.fillText(`STAGE ${stageNo} BOSS ${bossInfo.emoji || ''}`, cx, topY + 28);

    ctx.shadowBlur = 8;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px "Nunito", sans-serif';
    ctx.fillText(bossInfo.name || 'Boss', cx, topY + 56);

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#a8edea';
    ctx.font = '14px "Nunito", sans-serif';
    ctx.fillText(`♪ BGM: ${bossInfo.bgm || 'Boss Theme'}`, cx, topY + 80);
    ctx.restore();
  }

  drawPaused(ctx) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 52px "Nunito", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#a8edea';
    ctx.shadowBlur = 16;
    ctx.fillText('⏸ 일시정지', this.canvas.width / 2, this.canvas.height / 2 - 20);
    ctx.shadowBlur = 0;
    ctx.font = '20px "Nunito", sans-serif';
    ctx.fillStyle = '#a8edea';
    ctx.fillText('ESC를 누르면 다시 계속됩니다', this.canvas.width / 2, this.canvas.height / 2 + 28);
    ctx.restore();
  }
}
