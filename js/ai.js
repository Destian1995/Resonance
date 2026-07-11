// ============================================
// AI Controller — with towers and market
// ============================================

const AI = {
    timers: {},
    states: {},

    init(players) {
        for (const p of players) {
            if (p.isHuman) continue;
            this.timers[p.id] = { think: 0, build: 0, train: 0, attack: 0, expand: 0, market: 0 };
            this.states[p.id] = {
                phase: 'eco',
                difficulty: 0.7 + Math.random() * 0.3,
            };
        }
    },

    update(dt, players, allUnits, allBuildings) {
        for (const p of players) {
            if (p.isHuman || !p.alive) continue;
            this.updatePlayer(dt, p, players, allUnits, allBuildings);
        }
    },

    updatePlayer(dt, player, allPlayers, allUnits, allBuildings) {
        const t = this.timers[player.id];
        const state = this.states[player.id];

        t.think += dt; t.build += dt; t.train += dt;
        t.attack += dt; t.expand += dt; t.market += dt;

        if (t.think > 2) { t.think = 0; this.decidePhase(player, state, allPlayers); }
        if (t.build > 3 / state.difficulty) { t.build = 0; this.doBuild(player, state); }
        if (t.train > 2 / state.difficulty) { t.train = 0; this.doTrain(player, state); }
        if (t.attack > 4 / state.difficulty) { t.attack = 0; this.doAttack(player, state, allPlayers, allUnits, allBuildings); }
        if (t.expand > 8) { t.expand = 0; this.doExpand(player, state); }
        if (t.market > 6) { t.market = 0; this.doMarket(player, state); }
    },

    decidePhase(player, state, allPlayers) {
        const unitCount = player.units.filter(u => !u.dead).length;
        const hasBarracks = player.hasBuilding('barracks');

        if (!hasBarracks) state.phase = 'eco';
        else if (unitCount < 3) state.phase = 'eco';
        else if (unitCount >= 8 || player.money > 500) state.phase = 'attack';
        else state.phase = 'military';
    },

    doBuild(player, state) {
        const base = player.base;
        if (!base || base.dead) return;

        const positions = Buildings.getBuildPositions(base.x, base.y);

        // Barracks first
        if (!player.hasBuilding('barracks') && player.canAfford(CFG.BUILDING_COSTS.barracks)) {
            for (const pos of positions) {
                if (Buildings.canPlace(pos.x, pos.y, player.buildings)) {
                    player.buildStructure('barracks', pos.x, pos.y);
                    return;
                }
            }
        }

        // Upgrade barracks
        const barracks = player.getBuildingOfType('barracks');
        if (barracks && barracks.canUpgrade()) {
            const cost = barracks.getUpgradeCost();
            if (player.canAfford(cost) && player.money > 200) {
                player.upgradeBuilding(barracks);
                return;
            }
        }

        // Build tower (defensive)
        const towerCount = player.getBuildingsOfType('tower').length;
        if (towerCount < 2 && player.canAfford(CFG.BUILDING_COSTS.tower) && player.money > 200) {
            // Try positions around base, including further out
            const towerPositions = this.getTowerPositions(base);
            for (const pos of towerPositions) {
                if (Buildings.canPlace(pos.x, pos.y, player.buildings, CFG.TOWER_SIZE)) {
                    player.buildStructure('tower', pos.x, pos.y);
                    return;
                }
            }
        }

        // Upgrade towers
        const towers = player.getBuildingsOfType('tower');
        for (const tower of towers) {
            if (tower.canUpgrade()) {
                const cost = tower.getUpgradeCost();
                if (player.canAfford(cost) && player.money > 300) {
                    player.upgradeBuilding(tower);
                    return;
                }
            }
        }

        // Build market
        if (!player.hasBuilding('market') && player.canAfford(CFG.BUILDING_COSTS.market) && player.money > 200) {
            for (const pos of positions) {
                if (Buildings.canPlace(pos.x, pos.y, player.buildings)) {
                    player.buildStructure('market', pos.x, pos.y);
                    return;
                }
            }
        }

        // Upgrade base (factory auto-builds at level 3)
        if (base.canUpgrade() && player.canAfford(base.getUpgradeCost()) && player.money > 400) {
            player.upgradeBuilding(base);
            return;
        }

        // Upgrade owned oil derricks
        const derricks = GameMap.getPlayerDerricks(player.id);
        for (const d of derricks) {
            if (GameMap.canUpgradeDerrick(d)) {
                const cost = GameMap.getDerrickUpgradeCost(d);
                if (player.canAfford(cost) && player.money > 200) {
                    player.upgradeDerrick(d);
                    return;
                }
            }
        }
    },

    getTowerPositions(base) {
        const bx = base.x;
        const by = base.y;
        const bs = base.size;
        const ts = CFG.TOWER_SIZE;
        const gap = 8;
        return [
            { x: bx - ts - gap, y: by - ts - gap },
            { x: bx + bs + gap, y: by - ts - gap },
            { x: bx - ts - gap, y: by + bs + gap },
            { x: bx + bs + gap, y: by + bs + gap },
            { x: bx + bs / 2 - ts / 2, y: by - ts - gap * 3 },
            { x: bx + bs / 2 - ts / 2, y: by + bs + gap * 3 },
        ];
    },

    doMarket(player, state) {
        if (!player.hasBuilding('market')) return;

        // Buy metal if we need it for factory units or towers
        if (player.metal < 5 && player.money > 150) {
            player.marketBuy('metal');
        }

        // Sell excess oil for money
        if (player.oil > 15 && player.money < 200) {
            player.marketSell('oil');
        }

        // Buy oil if needed for rockets
        if (player.oil < 3 && player.money > 200 && player.getBaseLevel() >= 3) {
            player.marketBuy('oil');
        }
    },

    doTrain(player, state) {
        const base = player.base;
        if (!base || base.dead) return;

        const popLeft = player.getPopLimit() - player.getCurrentPop();
        if (popLeft < 5) return;

        const availableUnits = base.getAvailableUnits(player.spec);
        if (availableUnits.length > 0 && base.trainQueue.length < 3) {
            const unitType = availableUnits[availableUnits.length - 1];
            const def = CFG.UNITS[unitType];
            const cost = { money: def.cost, oil: def.oil || 0, metal: def.metal || 0 };
            if (player.canAfford(cost)) {
                player.trainUnit(unitType, base);
            }
        }

        const factory = player.getBuildingOfType('factory');
        if (factory && factory.trainQueue.length < 2 && popLeft >= 12) {
            const factoryUnits = factory.getAvailableUnits(player.spec);
            if (factoryUnits.length > 0) {
                const unitType = factoryUnits[Utils.randInt(0, factoryUnits.length - 1)];
                const def = CFG.UNITS[unitType];
                const cost = { money: def.cost, oil: def.oil || 0, metal: def.metal || 0 };
                if (player.canAfford(cost) && player.money > def.cost + 50) {
                    player.trainUnit(unitType, factory);
                }
            }
        }
    },

    doAttack(player, state, allPlayers, allUnits, allBuildings) {
        if (state.phase !== 'attack') {
            const idleUnits = player.units.filter(u => !u.dead && !u.moveTarget && !u.attackTarget);
            for (const u of idleUnits) {
                const bx = player.base.getCenterX();
                const by = player.base.getCenterY();
                u.moveTo(bx + Utils.rand(-80, 80), by + Utils.rand(-80, 80));
            }
            return;
        }

        let targetPlayer = null;
        let minStrength = Infinity;
        for (const p of allPlayers) {
            if (p.id === player.id || !p.alive) continue;
            const strength = p.units.filter(u => !u.dead).length;
            if (strength < minStrength) { minStrength = strength; targetPlayer = p; }
        }

        if (!targetPlayer) return;

        const tx = targetPlayer.base.getCenterX();
        const ty = targetPlayer.base.getCenterY();
        for (const u of player.units) {
            if (u.dead) continue;
            u.attackMove(tx + Utils.rand(-30, 30), ty + Utils.rand(-30, 30));
        }
    },

    doExpand(player, state) {
        const bx = player.base.getCenterX();
        const by = player.base.getCenterY();

        let nearestDerrick = null;
        let nearestDist = Infinity;
        for (const d of GameMap.oilDerricks) {
            if (d.owner === player.id) continue;
            const dist = Utils.dist(bx, by, d.x, d.y);
            if (dist < nearestDist) { nearestDist = dist; nearestDerrick = d; }
        }

        if (!nearestDerrick) return;

        let sent = 0;
        for (const u of player.units) {
            if (u.dead || u.moveTarget || u.attackTarget) continue;
            u.moveTo(nearestDerrick.x + Utils.rand(-15, 15), nearestDerrick.y + Utils.rand(-15, 15));
            sent++;
            if (sent >= 3) break;
        }
    },
};
