export const STAGE_SCORE_REQUIREMENTS = [250, 300, 350, 400, 450, 500, 550];

export const BALANCE = {
  weapon: {
    durationFrames: 8 * 60,
    burstShots: 3,
    burstIntervalFrames: 7,
    normalCooldownFrames: 20,
    weaponCooldownFrames: 24,
    dropChanceFromElf: 0.3,
  },
  defense: {
    arrowSlowDurationFrames: 2 * 60,
    springDurationFrames: Math.floor(2.5 * 60),
    shieldDurationFrames: 4 * 60,
    shieldParryInvincibleFrames: 12,
  },
  player: {
    hitInvincibleFrames: 45,
    respawnInvincibleFrames: 60,
  },
  enemy: {
    baseSpawnInterval: 220,
    spawnScalePerStage: 0.35,
    minShootInterval: 55,
    shootIntervalBase: 130,
    shootIntervalStageDelta: 16,
    arrowBaseSpeed: 6.4,
    arrowSpeedPerStage: 0.35,
  },
  boss: {
    baseClearBonus: 120,
    clearBonusPerStage: 30,
    configs: [
      { name: '숲의 수호 멧돼지', emoji: '🐗', hp: 16, shoot: 62, icon: '🪵', speed: 5.8, spread: 0.18, bgm: 'Forest Clash' },
      { name: '빙결 늑대', emoji: '🐺', hp: 19, shoot: 58, icon: '🧊', speed: 6.1, spread: 0.20, bgm: 'Frozen Fang' },
      { name: '바위 고릴라', emoji: '🦍', hp: 22, shoot: 54, icon: '🪨', speed: 6.4, spread: 0.22, bgm: 'Stone Beat' },
      { name: '폭주 코뿔소', emoji: '🦏', hp: 25, shoot: 50, icon: '💨', speed: 6.8, spread: 0.24, bgm: 'Rhino Rush' },
      { name: '화염 드래곤', emoji: '🐉', hp: 29, shoot: 46, icon: '🔥', speed: 7.2, spread: 0.26, bgm: 'Inferno Sky' },
      { name: '뇌전 도깨비', emoji: '👹', hp: 34, shoot: 42, icon: '⚡', speed: 7.6, spread: 0.28, bgm: 'Thunder Mask' },
      { name: '최종 보스 원숭이왕', emoji: '🐒', hp: 40, shoot: 38, icon: '🍌', speed: 8.0, spread: 0.30, bgm: 'Final Banana' },
    ],
  },
};

export function getWeaponConfig(weaponType) {
  const map = {
    fire: { icon: '🔥', speed: 9.2, w: 40, h: 34, color: '#ff9a3c', label: '불' },
    water: { icon: '💧', speed: 8.0, w: 38, h: 34, color: '#6ec6ff', label: '물' },
    electric: { icon: '⚡', speed: 9.8, w: 40, h: 34, color: '#ffe066', label: '전기' },
    missile: { icon: '🚀', speed: 7.4, w: 44, h: 36, color: '#f8f9fa', label: '미사일' },
  };
  return map[weaponType] || null;
}

export function getBossConfig(stageNo) {
  const idx = Math.max(1, Math.min(stageNo, BALANCE.boss.configs.length)) - 1;
  return BALANCE.boss.configs[idx];
}
