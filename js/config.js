// ============ CONFIG ============
const CFG = {
    WORLD_W: 2400,
    WORLD_H: 2400,
    TILE: 40,

    PLAYER_SPEED: 150,
    PLAYER_HP: 100,
    PLAYER_RADIUS: 12,
    MAGNET_BASE: 50,
    XP_PER_LEVEL: [10,20,35,50,70,90,115,140,170,200],

    SPAWN_INTERVAL: 1200,
    SPAWN_MIN_DIST: 350,
    SPAWN_MAX_DIST: 500,
    ENEMY_BASE_HP: 15,
    ENEMY_BASE_SPEED: 55,
    ENEMY_BASE_DMG: 8,
    ENEMY_BASE_XP: 3,
    DIFFICULTY_SCALE: 0.08,
    MAX_ENEMIES: 200,

    BOSS_INTERVAL: 60,
    BOSS_HP_MULT: 25,
    BOSS_DMG_MULT: 3,
    BOSS_SPEED_MULT: 0.6,
    BOSS_XP_MULT: 20,
    BOSS_RADIUS: 28,

    GEM_RADIUS: 5,
    GEM_MAGNET_SPEED: 400,

    JOY_RADIUS: 55,
    JOY_DEAD: 10,
    UPGRADE_CHOICES: 3,

    // Day/Night cycle: full cycle = 120s (60 day + 60 night)
    DAY_CYCLE: 120,
    NIGHT_SPAWN_MULT: 1.8,    // enemies spawn faster at night
    NIGHT_DMG_MULT: 1.3,      // enemies hit harder at night
    NIGHT_SPEED_MULT: 1.15,   // enemies move faster at night

    // Biome change every 2 minutes
    BIOME_INTERVAL: 120
};

const ST = { MENU:0, PLAY:1, UPGRADE:2, OVER:3 };
