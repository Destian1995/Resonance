// ============ CONFIG ============
const CFG = {
    HEX_R: 30,
    GRID_RINGS: 7,
    BUILD_TIME: 7,
    WAVE_MAX: 20,
    BOSS_EVERY: 5,
    CORE_HP: 150,
    START_GOLD: 100,
    GOLD_PER_KILL: 3,
    GOLD_PER_WAVE: 25,
    ENEMY_BASE_HP: 18,
    ENEMY_BASE_SPD: 40,
    ENEMY_BASE_DMG: 5,
    // Spells (global abilities on cooldown)
    SPELL_SLOTS: 3,
    // Touch
    BTN_SZ: 52
};
const ST = { MENU:0, BUILD:1, WAVE:2, UPGRADE:3, WIN:4, OVER:5 };
const HEX_DIR = [[1,0],[-1,0],[0,1],[0,-1],[1,-1],[-1,1]];
