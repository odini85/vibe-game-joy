import { Player } from './player.js';
import { Background } from './background.js';
import { ObstacleManager } from './obstacle.js';
import { ItemManager } from './item.js';
import { EnemyManager } from './enemy.js';
import { UI } from './ui.js';

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
const STATE = { START: 'start', PLAYING: 'playing', GAMEOVER: 'gameover' };
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
}
init();

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
  if (e.code === 'Enter') {
    if (state === STATE.START || state === STATE.GAMEOVER) startGame();
  }
  if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

canvas.addEventListener('click', () => {
  if (state === STATE.START || state === STATE.GAMEOVER) startGame();
});

// Touch support
let touchStartX = 0;
canvas.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
  if (state !== STATE.PLAYING) startGame();
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
  state = STATE.PLAYING;
}

function endGame() {
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('bestScore', bestScore);
  }
  state = STATE.GAMEOVER;
}

function shootBullet() {
  if (shootCooldown > 0) return;
  shootCooldown = 18;
  const bx = player.direction === 1
    ? player.x + player.width
    : player.x - 48;
  playerBullets.push({
    x: bx,
    y: player.y + player.height / 2 - 24,
    vx: 10 * player.direction,
    w: 48, h: 44,
    destroyed: false,
  });
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

  const slowFactor = player.slowModeTimer > 0 ? 0.5 : 1;
  const currentSpeed = dir !== 0 ? scrollSpeed * dir * slowFactor : 0;
  if (currentSpeed !== 0) distance += Math.abs(currentSpeed) * 0.04;

  if (currentSpeed !== 0) bg.scroll(-currentSpeed);

  obstacles.update(currentSpeed, bg.groundY);
  items.update(currentSpeed, bg.groundY);
  enemies.update(currentSpeed, bg.groundY, slowFactor);

  player.update(keys, bg.groundY, obstacles.getPits());

  // Shoot cooldown
  if (shootCooldown > 0) shootCooldown--;

  // Move player bullets
  for (const b of playerBullets) b.x += b.vx;
  playerBullets = playerBullets.filter(b => !b.destroyed && b.x > -60 && b.x < canvas.width + 60);

  // Player bullets vs elves
  const killed = enemies.checkBulletHits(playerBullets);
  for (const k of killed) {
    score += k.score;
    ui.addPopup(k.x, k.y - 10, `+${k.score} 🧝`, '#2ecc71');
  }

  // Elf arrows vs player
  const arrowHits = enemies.checkPlayerHit(player.getBounds());
  for (const _ of arrowHits) {
    if (player.getHit(2)) {
      ui.addPopup(player.x + 28, player.y - 20, '화살! -❤️', '#ff6b6b');
      if (!player.alive) { endGame(); return; }
    }
  }

  // Pit fell check
  if (player.fellInPit) {
    player.fellInPit = false;
    const hit = player.getHit(2);
    if (hit) {
      ui.addPopup(player.x + 28, bg.groundY - 60, '낭떠러지! -❤️', '#ff6b6b');
    }
    player.respawn(bg.groundY);
    if (!player.alive) { endGame(); return; }
  }

  // Obstacle collision
  const pb = player.getBounds();
  for (const obs of obstacles.getBoundsAll()) {
    if (checkCollision(pb, obs)) {
      const amount = obs.ref.type === 'mushroom' ? 3 : 2;
      if (player.getHit(amount)) {
        const msg = obs.ref.type === 'mushroom' ? '보라버섯! -50% 🍄' : '앗! 💥';
        ui.addPopup(player.x + 28, player.y - 20, msg, '#ff6b6b');
        if (!player.alive) { endGame(); return; }
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
      player.activateSlowMode(300);
      ui.addPopup(c.x + 20, c.y, '슬로우! 👟', '#74ebd5');
    }
  }

  ui.updatePopups();
}

function drawBullets(ctx) {
  ctx.save();
  ctx.textBaseline = 'middle';
  for (const b of playerBullets) {
    if (b.destroyed) continue;
    ctx.font = '44px serif';
    if (b.vx > 0) {
      ctx.fillText('✨', b.x, b.y + b.h / 2);
    } else {
      ctx.save();
      ctx.translate(b.x + b.w / 2, b.y + b.h / 2);
      ctx.scale(-1, 1);
      ctx.fillText('✨', 0, 0);
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
    ui.drawHUD(ctx, score, player.hp, player.maxHp, distance, player.slowModeTimer > 0);
    ui.drawPopups(ctx);
  } else if (state === STATE.START) {
    ui.drawStartScreen(ctx);
  } else if (state === STATE.GAMEOVER) {
    ui.drawGameOver(ctx, score, distance, bestScore);
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
