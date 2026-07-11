// ============================================
// Resonance RTS — Game Configuration
// Стиль: Battle City / Танчики — маленькая карта, крупные спрайты
// ============================================

const CFG = {
    // Map — компактная карта
    TILE: 24,          // крупнее тайл
    MAP_COLS: 34,
    MAP_ROWS: 34,
    get MAP_W() { return this.MAP_COLS * this.TILE; },  // 816px
    get MAP_H() { return this.MAP_ROWS * this.TILE; },  // 816px

    // Типы тайлов
    TILE_EMPTY: 0,
    TILE_BRICK: 1,
    TILE_STEEL: 2,
    TILE_WATER: 3,
    TILE_TREES: 4,
    TILE_ICE: 5,

    // Income
    BASE_INCOME: 10,
    INCOME_INTERVAL: 5000,
    OIL_INCOME: 5,
    OIL_PRODUCE: 1,
    START_MONEY: 100,
    START_OIL: 0,
    START_METAL: 0,

    // Population limits per barracks level
    POP_LIMITS: [0, 10, 50, 200],

    // Building costs (factory auto-builds at base level 3)
    BUILDING_COSTS: {
        barracks: { money: 50, oil: 0, metal: 0 },
        market:   { money: 80, oil: 0, metal: 0 },
        tower:    { money: 100, oil: 0, metal: 0 },
    },

    BARRACKS_UPGRADE: [200, 700],
    BASE_UPGRADE: [300, 600],

    TOWER_UPGRADE: [
        { money: 150, oil: 0, metal: 8 },
        { money: 300, oil: 5, metal: 15 },
    ],

    TOWER_STATS: [
        { name: 'Пулемёт. башня', hp: 250, damage: 15, range: 96,  attackSpeed: 700,  color: '#a0a0a0', aoe: 20, infantryBonus: 1.5 },
        { name: 'Ракетн. башня',  hp: 350, damage: 35, range: 144, attackSpeed: 1000, color: '#c0a030', aoe: 36, infantryBonus: 2.0 },
        { name: 'Артил. башня',   hp: 500, damage: 70, range: 216, attackSpeed: 1800, color: '#e04040', aoe: 56, infantryBonus: 2.5 },
    ],

    MARKET_PRICES: {
        oil:   { buyPrice: 20, sellPrice: 15, amount: 5 },
        metal: { buyPrice: 30, sellPrice: 22, amount: 5 },
    },

    // Oil derrick upgrade system
    DERRICK_UPGRADE: [
        // level 1 → 2
        { money: 80, oil: 0, metal: 3 },
        // level 2 → 3
        { money: 200, oil: 5, metal: 8 },
    ],
    // Stats per level: income ($), oil production, metal production
    DERRICK_STATS: [
        { name: 'Вышка I',   income: 5, oil: 1, metal: 0 },
        { name: 'Вышка II',  income: 10, oil: 2, metal: 1 },
        { name: 'Вышка III', income: 15, oil: 4, metal: 2 },
    ],

    // Building sizes (в тайлах)
    BUILDING_TILES: 2,   // 2x2 = 48px
    BASE_TILES: 3,       // 3x3 = 72px
    TOWER_TILES: 2,      // 2x2 = 48px
    get BUILDING_SIZE() { return this.BUILDING_TILES * this.TILE; },
    get BASE_SIZE() { return this.BASE_TILES * this.TILE; },
    get TOWER_SIZE() { return this.TOWER_TILES * this.TILE; },

    // Unit definitions — крупные спрайты, дистанции для маленькой карты
    UNITS: {
        mercenary: {
            name: 'Наёмник',
            hp: 80, damage: 10, range: 72, speed: 1.5,
            attackSpeed: 1000, cost: 15, oil: 0, metal: 0,
            pop: 5, trainTime: 3000,
            source: 'base', minLevel: 1,
            color: '#8BC34A', size: 10,
        },
        sniper: {
            name: 'Снайпер',
            hp: 50, damage: 30, range: 144, speed: 1.2,
            attackSpeed: 2000, cost: 35, oil: 0, metal: 0,
            pop: 5, trainTime: 5000,
            source: 'base', minLevel: 2,
            color: '#64B5F6', size: 10,
        },
        rocketeer: {
            name: 'Ракетомётчик',
            hp: 70, damage: 40, range: 108, speed: 1.0,
            attackSpeed: 2500, cost: 55, oil: 2, metal: 0,
            pop: 5, trainTime: 6000,
            source: 'base', minLevel: 3,
            color: '#FF7043', size: 10,
        },
        tank: {
            name: 'Танк',
            hp: 300, damage: 25, range: 84, speed: 1.4,
            attackSpeed: 1500, cost: 90, oil: 0, metal: 5,
            pop: 12, trainTime: 8000,
            source: 'factory', minLevel: 1,
            color: '#78909C', size: 11, isVehicle: true,
        },
        mlrs: {
            name: 'РСЗО',
            hp: 100, damage: 45, range: 180, speed: 0.7,
            attackSpeed: 4500, cost: 140, oil: 3, metal: 8,
            pop: 13, trainTime: 10000,
            source: 'factory', minLevel: 1,
            color: '#AB47BC', size: 11, isVehicle: true, aoe: 60,
        },
        artillery: {
            name: 'Артиллерия',
            hp: 100, damage: 80, range: 400, speed: 0.5,
            attackSpeed: 5000, cost: 180, oil: 5, metal: 10,
            pop: 15, trainTime: 12000,
            source: 'factory', minLevel: 1,
            color: '#8D6E63', size: 12, isVehicle: true, aoe: 48,
            buildingDmgMult: 9, vehicleDmgMult: 9,
        },
    },

    // Oil derrick capture
    CAPTURE_RADIUS: 48,
    CAPTURE_TIME: 3000,

    // Player colors
    PLAYER_COLORS: [
        '#39e639', '#e63939', '#3993e6',
        '#e6a539', '#b039e6', '#39d4d4',
    ],
    PLAYER_NAMES: ['Игрок', 'Красный', 'Синий', 'Оранж', 'Фиолет', 'Бирюза'],

    // Camera
    CAM_SPEED: 5,
    CAM_EDGE: 20,
    ZOOM_MIN: 0.8,
    ZOOM_MAX: 3.0,
    ZOOM_STEP: 0.2,
    DEFAULT_ZOOM: 1.2,

    // Starting positions (для 34x34 карты, тайл 24px)
    START_POSITIONS: [
        { x: 4 * 24 + 36,  y: 4 * 24 + 36 },    // верх-лево
        { x: 28 * 24 + 36, y: 28 * 24 + 36 },    // низ-право
        { x: 28 * 24 + 36, y: 4 * 24 + 36 },     // верх-право
        { x: 4 * 24 + 36,  y: 28 * 24 + 36 },    // низ-лево
        { x: 16 * 24 + 36, y: 3 * 24 + 36 },     // верх-центр
        { x: 16 * 24 + 36, y: 30 * 24 + 36 },    // низ-центр
    ],
};
