// ============================================
// Player State Management — with resources
// ============================================

class Player {
    constructor(id, name, isHuman, startX, startY) {
        this.id = id;
        this.name = name;
        this.isHuman = isHuman;
        this.color = CFG.PLAYER_COLORS[id];
        this.money = CFG.START_MONEY;
        this.oil = CFG.START_OIL;
        this.metal = CFG.START_METAL;
        this.alive = true;

        this.buildings = [];
        this.base = new Building('base', startX - CFG.BASE_SIZE / 2, startY - CFG.BASE_SIZE / 2, id);
        this.buildings.push(this.base);

        this.units = [];
        this.incomeTimer = 0;
        this.totalPop = 0;
        this.maxPop = 0;
        this.buildMode = null;

        // Statistics
        this.stats = {
            unitsProduced: 0,
            unitsLost: 0,
            killsInfantry: 0,
            killsVehicle: 0,
            killsBuilding: 0,
            damageDealt: 0,
            damageReceived: 0,
            moneyEarned: 0,
            moneySpent: 0,
            buildingsBuilt: 0,
            derricksOwned: 0,
            upgradesDone: 0,
        };
    }

    getPopLimit() {
        let limit = 0;
        for (const b of this.buildings) {
            if (!b.dead) limit += b.getPopLimit();
        }
        return limit;
    }

    getCurrentPop() {
        let pop = 0;
        for (const u of this.units) {
            if (!u.dead) pop += u.pop;
        }
        return pop;
    }

    getIncome() {
        return CFG.BASE_INCOME + GameMap.getPlayerDerrickIncome(this.id);
    }

    getOilProduction() {
        return GameMap.getPlayerDerrickOil(this.id);
    }

    getMetalProduction() {
        return GameMap.getPlayerDerrickMetal(this.id);
    }

    canAfford(cost) {
        if (typeof cost === 'number') return this.money >= cost;
        return this.money >= (cost.money || 0) &&
               this.oil >= (cost.oil || 0) &&
               this.metal >= (cost.metal || 0);
    }

    spend(cost) {
        if (typeof cost === 'number') { this.money -= cost; this.stats.moneySpent += cost; return; }
        const m = cost.money || 0;
        this.money -= m;
        this.oil -= (cost.oil || 0);
        this.metal -= (cost.metal || 0);
        this.stats.moneySpent += m;
    }

    hasBuilding(type) {
        return this.buildings.some(b => b.type === type && !b.dead);
    }

    getBuildingOfType(type) {
        return this.buildings.find(b => b.type === type && !b.dead);
    }

    getBuildingsOfType(type) {
        return this.buildings.filter(b => b.type === type && !b.dead);
    }

    getBaseLevel() {
        return this.base && !this.base.dead ? this.base.level : 0;
    }

    update(dt) {
        if (!this.alive) return;

        if (this.base.dead) {
            this.alive = false;
            for (const u of this.units) u.dead = true;
            for (const b of this.buildings) b.dead = true;
            return;
        }

        // Income + resource production
        this.incomeTimer += dt * 1000;
        if (this.incomeTimer >= CFG.INCOME_INTERVAL) {
            this.incomeTimer -= CFG.INCOME_INTERVAL;
            const inc = this.getIncome();
            this.money += inc;
            this.oil += this.getOilProduction();
            this.metal += this.getMetalProduction();
            this.stats.moneyEarned += inc;
            this.stats.derricksOwned = GameMap.getPlayerDerrickCount(this.id);
        }

        // Auto-build factory when base reaches level 3
        if (this.base.level >= 3 && !this.hasBuilding('factory')) {
            this.autoPlaceFactory();
        }

        // Update buildings (training, market, towers)
        const allUnits = Game.getAllUnits();
        const allBuildings = Game.getAllBuildings();

        for (const b of this.buildings) {
            const result = b.update(dt, this, allUnits, allBuildings);
            if (result) {
                const pop = this.getCurrentPop();
                const limit = this.getPopLimit();
                const def = CFG.UNITS[result.type];
                if (pop + def.pop <= limit) {
                    const unit = new Unit(result.type, result.x, result.y, this.id);
                    this.units.push(unit);
                    this.stats.unitsProduced++;
                }
            }
        }

        // Count losses
        for (const u of this.units) {
            if (u.dead && !u._countedLoss) {
                u._countedLoss = true;
                this.stats.unitsLost++;
            }
        }
        this.units = this.units.filter(u => !u.dead);
        this.totalPop = this.getCurrentPop();
        this.maxPop = this.getPopLimit();
    }

    trainUnit(unitType, building) {
        const def = CFG.UNITS[unitType];
        if (!def) return false;

        const cost = { money: def.cost, oil: def.oil || 0, metal: def.metal || 0 };
        if (!this.canAfford(cost)) return false;

        const queuedPop = building.trainQueue.reduce((sum, t) => sum + CFG.UNITS[t].pop, 0);
        if (this.getCurrentPop() + queuedPop + def.pop > this.getPopLimit()) return false;

        this.spend(cost);
        building.addToQueue(unitType);
        return true;
    }

    buildStructure(type, x, y) {
        const cost = CFG.BUILDING_COSTS[type];
        if (!cost || !this.canAfford(cost)) return false;

        const size = type === 'tower' ? CFG.TOWER_SIZE : CFG.BUILDING_SIZE;
        if (!Buildings.canPlace(x, y, this.buildings, size)) return false;

        this.spend(cost);
        const building = new Building(type, x, y, this.id);
        this.buildings.push(building);
        this.stats.buildingsBuilt++;
        if (this.isHuman) Sound.play('build');
        return true;
    }

    upgradeBuilding(building) {
        if (!building.canUpgrade()) return false;
        const cost = building.getUpgradeCost();
        if (!this.canAfford(cost)) return false;

        this.spend(cost);
        building.upgrade();
        this.stats.upgradesDone++;
        if (this.isHuman) Sound.play('upgrade');
        return true;
    }

    autoPlaceFactory() {
        const positions = Buildings.getBuildPositions(this.base.x, this.base.y);
        for (const pos of positions) {
            if (Buildings.canPlace(pos.x, pos.y, this.buildings)) {
                const factory = new Building('factory', pos.x, pos.y, this.id);
                this.buildings.push(factory);
                UI.showMessage('Завод построен автоматически!');
                return;
            }
        }
    }

    upgradeDerrick(derrick) {
        if (!GameMap.canUpgradeDerrick(derrick)) return false;
        if (derrick.owner !== this.id) return false;
        const cost = GameMap.getDerrickUpgradeCost(derrick);
        if (!cost || !this.canAfford(cost)) return false;
        this.spend(cost);
        GameMap.upgradeDerrick(derrick);
        return true;
    }

    // Market buy/sell
    marketBuy(resource) {
        const info = CFG.MARKET_PRICES[resource];
        if (!info || this.money < info.buyPrice) return false;
        this.money -= info.buyPrice;
        this[resource] += info.amount;
        return true;
    }

    marketSell(resource) {
        const info = CFG.MARKET_PRICES[resource];
        if (!info || this[resource] < info.amount) return false;
        this[resource] -= info.amount;
        this.money += info.sellPrice;
        return true;
    }

    drawBuildings(ctx) {
        for (const b of this.buildings) b.draw(ctx, this.color);
    }

    drawUnits(ctx) {
        for (const u of this.units) u.draw(ctx, this.color);
    }

    deselectAll() {
        for (const b of this.buildings) b.selected = false;
        for (const u of this.units) u.selected = false;
    }
}
