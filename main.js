import { Player } from './player.js';
import { Background } from './background.js';
import { ObstacleManager } from './obstacle.js';
import { ItemManager } from './item.js';
import { EnemyManager } from './enemy.js';
import { UI } from './ui.js';
import { BALANCE, STAGE_SCORE_REQUIREMENTS, getWeaponConfig } from './balance.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Responsive canvas
function resize() {
  const maxW = 900, maxH = 480;
  const scale = Math.min(window.innerWidth / maxW, window.innerHeight / maxH, 1);
  canvas.style.width = `${maxW * scale}px`;
  canvas.style.height = `${maxH * scale}px`;
}
resize();
window.addEventListener('resize', resize);

// Game state
const STATE = { START: 'start', PLAYING: 'playing', PAUSED: 'paused', STAGE_CLEAR: 'stage_clear', GAMEOVER: 'gameover' };
const RANKING_KEY = 'scoreRankingTop10';
let state = STATE.START;
let score = 0;
let bestScore = parseInt(localStorage.getItem('bestScore') || '0');
let distance = 0;
let scrollSpeed = 3;
const MAX_SPEED = 7;
let speedTimer = 0;

let player, bg, obstacles, items, enemies, ui;
let playerBullets = [];
let shootCooldown = 0;
let bgmAudio = null;
let bgmEnabled = true;
let currentBgmTrack = null;
let activeWeaponType = null;
let weaponTimer = 0;
let burstShotsRemaining = 0;
let burstInterval = 0;
let burstDirection = 1;
let lastClearedStage = 0;
let clearedStages = new Set();
let stageStartScore = 0;
let stageTargetScore = STAGE_SCORE_REQUIREMENTS[0];
let allStagesCleared = false;
let bossBattleActive = false;
let currentBossStage = 0;
let rankings = loadRankings();
let bossIntroTimer = 0;
let bossIntroInfo = null;

function loadRankings() {
  try {
    const raw = localStorage.getItem(RANKING_KEY);
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    return list
      .filter(r => r && Number.isFinite(r.score))
      .map(r => ({
        score: Math.floor(r.score),
        at: Number(r.at) || Date.now(),
        name: typeof r.name === 'string' && r.name.trim() ? r.name.trim() : '익명',
      }))
      .sort((a, b) => b.score - a.score || b.at - a.at)
      .slice(0, 10);
  } catch {
    return [];
  }
}

function saveRankings() {
  localStorage.setItem(RANKING_KEY, JSON.stringify(rankings.slice(0, 10)));
}

function normalizeRankingName(input) {
  if (typeof input !== 'string') return null;
  const name = input.trim().replace(/\s+/g, ' ');
  if (!name) return null;
  if (name.length < 2 || name.length > 12) return null;
  if (!/^[\p{L}\p{N} _-]+$/u.test(name)) return null;
  return name;
}

function isRankingEligible(newScore) {
  if (rankings.length < 10) return true;
  const cutoff = rankings[rankings.length - 1];
  return newScore > cutoff.score;
}

function askRankingName(newScore) {
  if (typeof window === 'undefined' || typeof window.prompt !== 'function') return '익명';
  const saved = localStorage.getItem('lastPlayerName') || '';
  const message =
    `TOP 10 랭킹 진입! (${newScore}점)\n` +
    `이름을 입력하세요. (2~12자, 한글/영문/숫자/공백/_/-)`;

  for (let attempt = 0; attempt < 3; attempt++) {
    const input = window.prompt(message, saved);
    if (input === null) break;
    const normalized = normalizeRankingName(input);
    if (normalized) {
      localStorage.setItem('lastPlayerName', normalized);
      return normalized;
    }
  }
  return '익명';
}

function recordRanking(newScore, name = '익명') {
  rankings.push({ score: Math.floor(newScore), at: Date.now(), name });
  rankings.sort((a, b) => b.score - a.score || b.at - a.at);
  rankings = rankings.slice(0, 10);
  saveRankings();
}

function init() {
  player = new Player(canvas);
  bg = new Background(canvas);
  obstacles = new ObstacleManager(canvas);
  items = new ItemManager(canvas);
  enemies = new EnemyManager(canvas);
  ui = new UI(canvas);
  score = 0;
  distance = 0;
  scrollSpeed = 3;
  speedTimer = 0;
  playerBullets = [];
  shootCooldown = 0;
  activeWeaponType = null;
  weaponTimer = 0;
  burstShotsRemaining = 0;
  burstInterval = 0;
  burstDirection = 1;
  lastClearedStage = 0;
  clearedStages = new Set();
  stageStartScore = 0;
  stageTargetScore = STAGE_SCORE_REQUIREMENTS[0];
  allStagesCleared = false;
  bossBattleActive = false;
  currentBossStage = 0;
  bossIntroTimer = 0;
  bossIntroInfo = null;
}
init();

function getBgmSrc(track = 'normal') {
  return track === 'boss' ? 'bgm_boss.wav' : 'bgm.wav';
}

function initBgm(track = 'normal') {
  const src = getBgmSrc(track);
  if (bgmAudio && currentBgmTrack === track) return;
  if (bgmAudio) {
    bgmAudio.pause();
    bgmAudio = null;
  }
  bgmAudio = new Audio(src);
  bgmAudio.loop = true;
  bgmAudio.volume = 0.25;
  bgmAudio.preload = 'auto';
  currentBgmTrack = track;
  bgmAudio.addEventListener('error', () => {
    // Keep game running even if bgm file is missing.
    bgmEnabled = false;
  });
}

function playBgm(track = 'normal') {
  initBgm(track);
  if (!bgmEnabled || !bgmAudio) return;
  bgmAudio.play().catch(() => {});
}

function stopBgm() {
  if (!bgmAudio) return;
  bgmAudio.pause();
  bgmAudio.currentTime = 0;
}

function syncBgmForBattle() {
  if (state !== STATE.PLAYING || !bgmEnabled) return;
  const target = bossBattleActive ? 'boss' : 'normal';
  if (currentBgmTrack !== target) playBgm(target);
}

// Input
const keys = {};
window.addEventListener('keydown', e => {
  keys[e.code] = true;

  if (e.code === 'ArrowUp') {
    e.preventDefault();
    if (state === STATE.PLAYING) player.jump();
  }
  if (e.code === 'Space') {
    e.preventDefault();
    if (state === STATE.PLAYING) shootBullet();
  }
  if (e.code === 'Escape') {
    e.preventDefault();
    if (state === STATE.PLAYING) state = STATE.PAUSED;
    else if (state === STATE.PAUSED) state = STATE.PLAYING;
  }
  if (e.code === 'Enter') {
    if (state === STATE.START || state === STATE.GAMEOVER) startGame();
    else if (state === STATE.STAGE_CLEAR) continueFromClear();
  }
  if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

canvas.addEventListener('click', () => {
  if (state === STATE.START || state === STATE.GAMEOVER) startGame();
  else if (state === STATE.STAGE_CLEAR) continueFromClear();
});

// Touch support
let touchStartX = 0;
canvas.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
  if (state === STATE.START || state === STATE.GAMEOVER) startGame();
  else if (state === STATE.STAGE_CLEAR) continueFromClear();
}, { passive: true });
canvas.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) < 10 && state === STATE.PLAYING) player.jump();
}, { passive: true });
canvas.addEventListener('touchmove', e => {
  const dx = e.touches[0].clientX - touchStartX;
  if (dx > 20) { keys['ArrowRight'] = true; keys['ArrowLeft'] = false; }
  else if (dx < -20) { keys['ArrowLeft'] = true; keys['ArrowRight'] = false; }
}, { passive: true });
canvas.addEventListener('touchcancel', () => {
  keys['ArrowLeft'] = false; keys['ArrowRight'] = false;
}, { passive: true });

function startGame() {
  init();
  playBgm('normal');
  state = STATE.PLAYING;
}

function endGame(isAllClear = false) {
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('bestScore', bestScore);
  }
  const rankName = isRankingEligible(score) ? askRankingName(score) : null;
  if (rankName) recordRanking(score, rankName);
  allStagesCleared = isAllClear;
  stopBgm();
  state = STATE.GAMEOVER;
}

function clearStage(stageNo) {
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('bestScore', bestScore);
  }
  lastClearedStage = stageNo;
  clearedStages.add(stageNo);
  state = STATE.STAGE_CLEAR;
}

function continueFromClear() {
  // 다음 스테이지 진입: 월드/엔티티는 리셋하되 점수/거리/기록은 유지
  const carryScore = score;
  const carryDistance = distance;
  const carryBest = bestScore;
  const carryClearedStages = new Set(clearedStages);
  const carryLastClearedStage = lastClearedStage;
  const carryStageStartScore = score;
  const nextStage = Math.min(carryLastClearedStage + 1, STAGE_SCORE_REQUIREMENTS.length);
  const carryStageTargetScore = carryStageStartScore + STAGE_SCORE_REQUIREMENTS[nextStage - 1];
  const carryWeaponType = activeWeaponType;
  const carryWeaponTimer = weaponTimer;

  init();
  score = carryScore;
  distance = carryDistance;
  bestScore = carryBest;
  clearedStages = carryClearedStages;
  lastClearedStage = carryLastClearedStage;
  stageStartScore = carryStageStartScore;
  stageTargetScore = carryStageTargetScore;
  activeWeaponType = carryWeaponType;
  weaponTimer = carryWeaponTimer;

  playBgm('normal');
  state = STATE.PLAYING;
}

function spawnPlayerBullet(direction, weaponType = null) {
  const cfg = getWeaponConfig(weaponType);
  const bx = direction === 1 ? player.x + player.width : player.x - 48;
  const speed = cfg ? cfg.speed : 10;
  const w = cfg ? cfg.w : 48;
  const h = cfg ? cfg.h : 44;
  const icon = cfg ? cfg.icon : '✨';
  const color = cfg ? cfg.color : '#ffffff';

  playerBullets.push({
    x: bx,
    y: player.y + player.height / 2 - h / 2,
    vx: speed * direction,
    w,
    h,
    icon,
    color,
    destroyed: false,
  });
}

function activateWeapon(weaponType) {
  activeWeaponType = weaponType;
  weaponTimer = BALANCE.weapon.durationFrames;
  burstShotsRemaining = 0;
  burstInterval = 0;
}

function shootBullet() {
  if (shootCooldown > 0) return;
  const direction = player.direction === 0 ? burstDirection : player.direction;
  burstDirection = direction;

  if (activeWeaponType && weaponTimer > 0) {
    spawnPlayerBullet(direction, activeWeaponType);
    burstShotsRemaining = BALANCE.weapon.burstShots - 1;
    burstInterval = BALANCE.weapon.burstIntervalFrames;
    shootCooldown = BALANCE.weapon.weaponCooldownFrames;
    return;
  }

  shootCooldown = BALANCE.weapon.normalCooldownFrames;
  spawnPlayerBullet(direction);
}

// Collision check (AABB)
function checkCollision(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Game loop
function update() {
  if (state !== STATE.PLAYING) return;

  let dir = 0;
  if (keys['ArrowRight']) dir = 1;
  if (keys['ArrowLeft']) dir = -1;

  // Speed increase over time
  speedTimer++;
  if (speedTimer % 300 === 0 && scrollSpeed < MAX_SPEED) {
    scrollSpeed += 0.3;
  }

  const arrowSlowFactor = player.slowModeTimer > 0 ? 0.5 : 1;
  const currentSpeed = dir !== 0 ? scrollSpeed * dir : 0;
  if (currentSpeed !== 0) distance += Math.abs(currentSpeed) * 0.04;

  if (currentSpeed !== 0) bg.scroll(-currentSpeed);

  const currentStage = Math.min(lastClearedStage + 1, STAGE_SCORE_REQUIREMENTS.length);
  const reducedObstacles = bossBattleActive;
  obstacles.update(currentSpeed, bg.groundY, currentStage, reducedObstacles);
  items.update(currentSpeed, bg.groundY);
  enemies.update(currentSpeed, bg.groundY, arrowSlowFactor, currentStage, bossBattleActive);
  syncBgmForBattle();

  player.update(keys, bg.groundY, obstacles.getPits());

  // Shoot cooldown
  if (shootCooldown > 0) shootCooldown--;

  if (weaponTimer > 0) {
    weaponTimer--;
    if (weaponTimer <= 0) {
      activeWeaponType = null;
      burstShotsRemaining = 0;
      burstInterval = 0;
    }
  }

  if (burstShotsRemaining > 0) {
    if (burstInterval > 0) {
      burstInterval--;
    } else {
      spawnPlayerBullet(burstDirection, activeWeaponType);
      burstShotsRemaining--;
      burstInterval = BALANCE.weapon.burstIntervalFrames;
    }
  }

  // Move player bullets
  for (const b of playerBullets) b.x += b.vx;
  playerBullets = playerBullets.filter(b => !b.destroyed && b.x > -60 && b.x < canvas.width + 60);

  // Player bullets vs elves
  const hitResult = enemies.checkBulletHits(playerBullets);
  const killed = hitResult.killed;
  for (const k of killed) {
    score += k.score;
    const tag = k.isBoss ? '🐒' : '🧝';
    ui.addPopup(k.x, k.y - 10, `+${k.score} ${tag}`, '#2ecc71');
    if (!k.isBoss) {
      const shouldDrop = Math.random() < BALANCE.weapon.dropChanceFromElf || !activeWeaponType;
      if (shouldDrop) {
        items.dropWeaponAt(k.x, k.y - 16);
        ui.addPopup(k.x, k.y - 34, '무기 드랍! 🎁', '#ffe066');
      }
    }
  }

  if (hitResult.bossDefeated) {
    const defeatedStage = hitResult.bossStage || currentBossStage || currentStage;
    bossBattleActive = false;
    currentBossStage = 0;
    score += BALANCE.boss.baseClearBonus + defeatedStage * BALANCE.boss.clearBonusPerStage;

    if (defeatedStage >= STAGE_SCORE_REQUIREMENTS.length) {
      endGame(true);
      return;
    }
    clearStage(defeatedStage);
    return;
  }

  // Elf arrows vs player
  const arrowHits = enemies.checkPlayerHit(player.getBounds());
  for (const _ of arrowHits) {
    const prevShield = player.shieldTimer;
    if (player.getHit(3)) {
      ui.addPopup(player.x + 28, player.y - 20, '화살! -❤️', '#ff6b6b');
      if (!player.alive) { endGame(); return; }
    } else if (prevShield > 0) {
      ui.addPopup(player.x + 28, player.y - 20, '방패 방어! 🛡️', '#6ec6ff');
    }
  }

  // Pit fell check
  if (player.fellInPit) {
    player.fellInPit = false;
    const prevShield = player.shieldTimer;
    const hit = player.getHit(4);
    if (hit) {
      ui.addPopup(player.x + 28, bg.groundY - 60, '낭떠러지! -❤️', '#ff6b6b');
    } else if (prevShield > 0) {
      ui.addPopup(player.x + 28, bg.groundY - 60, '방패 방어! 🛡️', '#6ec6ff');
    }
    player.respawn(bg.groundY);
    if (!player.alive) { endGame(); return; }
  }

  // Obstacle collision
  const pb = player.getBounds();
  for (const obs of obstacles.getBoundsAll()) {
    if (checkCollision(pb, obs)) {
      const amount = obs.ref.type === 'mushroom' ? 5 : 3;
      const prevShield = player.shieldTimer;
      if (player.getHit(amount)) {
        const msg = obs.ref.type === 'mushroom' ? '보라버섯! -50% 🍄' : '앗! 💥';
        ui.addPopup(player.x + 28, player.y - 20, msg, '#ff6b6b');
        if (!player.alive) { endGame(); return; }
      } else if (prevShield > 0) {
        ui.addPopup(player.x + 28, player.y - 20, '방패 방어! 🛡️', '#6ec6ff');
      }
    }
  }

  // Item collection
  const { collected } = items.collect(player.getBounds());
  for (const c of collected) {
    if (c.type === 'fruit') {
      player.heal(3);
      ui.addPopup(c.x + 20, c.y, '+50% ❤️', '#ff6b6b');
    } else if (c.type === 'coin') {
      score += c.score;
      ui.addPopup(c.x + 20, c.y, `+${c.score} ${c.emoji}`, '#FFD700');
    } else if (c.type === 'shoe') {
      player.activateSlowMode(BALANCE.defense.arrowSlowDurationFrames);
      ui.addPopup(c.x + 20, c.y, '화살 둔화! 👟', '#74ebd5');
    } else if (c.type === 'red_shoe') {
      player.activateSpringMode(BALANCE.defense.springDurationFrames);
      ui.addPopup(c.x + 20, c.y, '스프링 2단 점프! 👠', '#ff6b6b');
    } else if (c.type === 'blue_shield') {
      player.activateShield(BALANCE.defense.shieldDurationFrames);
      ui.addPopup(c.x + 20, c.y, '방패 30초! 🛡️', '#6ec6ff');
    } else if (c.type === 'weapon' && c.weaponType) {
      activateWeapon(c.weaponType);
      const cfg = getWeaponConfig(c.weaponType);
      ui.addPopup(c.x + 20, c.y, `${cfg ? cfg.label : '특수'} 무기 30초!`, cfg ? cfg.color : '#ffffff');
    }
  }

  if (!bossBattleActive) {
    const nextStage = lastClearedStage + 1;
    if (nextStage <= STAGE_SCORE_REQUIREMENTS.length && score >= stageTargetScore) {
      bossBattleActive = true;
      currentBossStage = nextStage;
      enemies.activateStageBoss(nextStage, bg.groundY);
      bossIntroInfo = enemies.getBossInfo(nextStage);
      bossIntroTimer = 150;
      obstacles.obstacles = [];
      playBgm('boss');
      ui.addPopup(canvas.width / 2, 90, `목표 달성! STAGE ${nextStage} 보스 등장!`, '#f1c40f');
      return;
    }
  }

  ui.updatePopups();

  if (bossIntroTimer > 0) bossIntroTimer--;
}

function drawBullets(ctx) {
  ctx.save();
  ctx.textBaseline = 'middle';
  for (const b of playerBullets) {
    if (b.destroyed) continue;
    ctx.font = `${Math.max(34, b.h)}px serif`;
    ctx.fillStyle = b.color || '#fff';
    if (b.vx > 0) {
      ctx.fillText(b.icon || '✨', b.x, b.y + b.h / 2);
    } else {
      ctx.save();
      ctx.translate(b.x + b.w / 2, b.y + b.h / 2);
      ctx.scale(-1, 1);
      ctx.fillText(b.icon || '✨', 0, 0);
      ctx.restore();
    }
  }
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  bg.draw(ctx);
  obstacles.drawPits(ctx, bg.groundY);
  items.draw(ctx);
  obstacles.draw(ctx);
  enemies.draw(ctx);
  drawBullets(ctx);
  player.draw(ctx);

  if (state === STATE.PLAYING) {
    const currentStage = Math.min(lastClearedStage + 1, STAGE_SCORE_REQUIREMENTS.length);
    const weaponCfg = activeWeaponType ? getWeaponConfig(activeWeaponType) : null;
    const bossTargetRemaining = bossBattleActive ? 0 : Math.max(0, stageTargetScore - score);
    ui.drawHUD(
      ctx,
      score,
      player.hp,
      player.maxHp,
      distance,
      player.slowModeTimer > 0,
      currentStage,
      STAGE_SCORE_REQUIREMENTS.length,
      weaponCfg ? `${weaponCfg.icon} ${weaponCfg.label}` : '',
      Math.ceil(weaponTimer / 60),
      Math.ceil(player.shieldTimer / 60),
      Math.ceil(player.springModeTimer / 60),
      bossBattleActive,
      bossTargetRemaining
    );
    ui.drawPopups(ctx);
    if (bossBattleActive && bossIntroTimer > 0 && bossIntroInfo) {
      ui.drawBossIntro(ctx, currentBossStage, bossIntroInfo, bossIntroTimer);
    }
  } else if (state === STATE.START) {
    ui.drawStartScreen(ctx);
  } else if (state === STATE.STAGE_CLEAR) {
    ui.drawStageClear(ctx, lastClearedStage, score, distance, bestScore);
  } else if (state === STATE.PAUSED) {
    ui.drawPaused(ctx);
  } else if (state === STATE.GAMEOVER) {
    ui.drawGameOver(ctx, score, distance, bestScore, allStagesCleared, rankings);
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
