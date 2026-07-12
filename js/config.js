// ============ CONFIG ============
const CFG = {
    // World
    WORLD_W: 3000,
    WORLD_H: 3000,
    TILE: 48,

    // Player
    PLAYER_SPEED: 150,
    PLAYER_HP: 100,
    PLAYER_RADIUS: 12,
    MAGNET_BASE: 50,
    XP_PER_LEVEL: [10, 20, 35, 50, 70, 90, 115, 140, 170, 200], // repeats last

    // Enemies
    SPAWN_INTERVAL: 1200,   // ms base
    SPAWN_MIN_DIST: 350,    // from player
    SPAWN_MAX_DIST: 500,
    ENEMY_BASE_HP: 15,
    ENEMY_BASE_SPEED: 55,
    ENEMY_BASE_DMG: 8,
    ENEMY_BASE_XP: 3,
    DIFFICULTY_SCALE: 0.08, // per elapsed minute
    MAX_ENEMIES: 200,

    // Boss
    BOSS_INTERVAL: 60,      // seconds
    BOSS_HP_MULT: 25,
    BOSS_DMG_MULT: 3,
    BOSS_SPEED_MULT: 0.6,
    BOSS_XP_MULT: 20,
    BOSS_RADIUS: 28,

    // Gems
    GEM_RADIUS: 5,
    GEM_MAGNET_SPEED: 400,

    // Touch
    JOY_RADIUS: 55,
    JOY_DEAD: 10,

    // Upgrade
    UPGRADE_CHOICES: 3
};

const ST = { MENU: 0, PLAY: 1, UPGRADE: 2, OVER: 3 };
