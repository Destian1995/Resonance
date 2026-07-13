// ============ CONFIG ============
const CFG = {
    // Hex grid
    HEX_R: 28,           // hex radius (center to vertex)
    GRID_RINGS: 8,       // rings around center = map size
    // Phases
    BUILD_TIME: 20,      // seconds of day (build phase)
    WAVE_MAX: 20,        // waves to win
    BOSS_EVERY: 5,
    // Core
    CORE_HP: 100,
    // Hero
    HERO_SPEED: 160,
    HERO_RADIUS: 10,
    HERO_DMG: 12,
    HERO_ATTACK_RANGE: 80,
    HERO_ATTACK_CD: 400,
    // Economy
    START_GOLD: 80,
    GOLD_PER_KILL: 3,
    GOLD_PER_WAVE: 20,
    // Enemies
    ENEMY_BASE_HP: 20,
    ENEMY_BASE_SPD: 45,
    ENEMY_BASE_DMG: 5,
    SPAWN_EDGE_DIST: 10, // hex rings from center to spawn
    // Meta
    COINS_PER_WAVE: 2,
    // Touch
    JOY_R: 50,
    JOY_DEAD: 8,
    BTN_SZ: 48
};
const ST = { MENU:0, BUILD:1, WAVE:2, UPGRADE:3, WIN:4, OVER:5 };
// Hex directions (pointy-top)
const HEX_DIR = [[1,0],[-1,0],[0,1],[0,-1],[1,-1],[-1,1]];
