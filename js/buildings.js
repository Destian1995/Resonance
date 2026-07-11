// ============================================
// Buildings — pixel art + tower auto-attack
// ============================================

class Building {
    constructor(type, x, y, playerId) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.playerId = playerId;
        this.level = 1;
        this.size = this.getSize();
        this.hp = this.getMaxHp();
        this.maxHp = this.hp;
        this.built = true;
        this.trainQueue = [];
        this.trainProgress = 0;
        this.producing = null;
        this.produceTimer = 0;
        this.selected = false;
        this.dead = false;
        this.rallyX = x + this.size / 2;
        this.rallyY = y + this.size + 12;

        // Tower combat
        this.attackCooldown = 0;
        this.attackTarget = null;
        this.towerAngle = 0;
    }

    getSize() {
        if (this.type === 'base') return CFG.BASE_SIZE;
        if (this.type === 'tower') return CFG.TOWER_SIZE;
        return CFG.BUILDING_SIZE;
    }

    getMaxHp() {
        if (this.type === 'tower') {
            return CFG.TOWER_STATS[this.level - 1].hp;
        }
        const base = { base: 500, barracks: 200, market: 150, factory: 300 };
        return (base[this.type] || 200) + (this.level - 1) * 100;
    }

    getCenterX() { return this.x + this.size / 2; }
    getCenterY() { return this.y + this.size / 2; }

    canUpgrade() {
        if (this.type === 'barracks') return this.level < 3;
        if (this.type === 'base') return this.level < 3;
        if (this.type === 'tower') return this.level < 3;
        return false;
    }

    getUpgradeCost() {
        if (this.type === 'barracks') return CFG.BARRACKS_UPGRADE[this.level - 1] || 0;
        if (this.type === 'base') return CFG.BASE_UPGRADE[this.level - 1] || 0;
        if (this.type === 'tower') return CFG.TOWER_UPGRADE[this.level - 1] || { money: 0 };
        return 0;
    }

    upgrade() {
        this.level++;
        this.maxHp = this.getMaxHp();
        this.hp = this.maxHp;
    }

    getLevelName() {
        if (this.type === 'barracks') return ['Казармы', 'Жилище', 'Небоскрёб'][this.level - 1];
        if (this.type === 'base') return ['База I', 'База II', 'База III'][this.level - 1];
        if (this.type === 'market') return 'Рынок';
        if (this.type === 'factory') return 'Завод';
        if (this.type === 'tower') return CFG.TOWER_STATS[this.level - 1].name;
        return this.type;
    }

    getPopLimit() {
        if (this.type === 'barracks') return CFG.POP_LIMITS[this.level] || 0;
        return 0;
    }

    getTowerStats() {
        if (this.type !== 'tower') return null;
        return CFG.TOWER_STATS[this.level - 1];
    }

    getAvailableUnits(playerSpec) {
        const spec = playerSpec || 'armor';
        const specCfg = CFG.SPECS[spec];
        const units = [];

        if (this.type === 'base') {
            for (const [key, def] of Object.entries(CFG.UNITS)) {
                if (def.source !== 'base' || this.level < def.minLevel) continue;
                // No spec restriction = available to all (mercenary)
                if (!def.spec) { units.push(key); continue; }
                // Check if this spec allows this unit
                if (specCfg && (specCfg.specUnits.includes(key) || specCfg.baseUnits.includes(key))) {
                    units.push(key);
                }
            }
        } else if (this.type === 'factory') {
            for (const [key, def] of Object.entries(CFG.UNITS)) {
                if (def.source !== 'factory') continue;
                if (!def.spec) { units.push(key); continue; }
                if (specCfg && specCfg.factoryUnits.includes(key)) {
                    units.push(key);
                }
            }
        }
        return units;
    }

    addToQueue(unitType) {
        this.trainQueue.push(unitType);
    }

    update(dt, player, allUnits, allBuildings) {
        if (this.dead) return null;

        // Training
        if (this.trainQueue.length > 0) {
            const unitType = this.trainQueue[0];
            const def = CFG.UNITS[unitType];
            this.trainProgress += dt * 1000;
            if (this.trainProgress >= def.trainTime) {
                this.trainProgress = 0;
                this.trainQueue.shift();
                return {
                    type: unitType,
                    x: this.rallyX + Utils.rand(-8, 8),
                    y: this.rallyY + Utils.rand(-4, 4),
                    playerId: this.playerId,
                };
            }
        }

        // Tower auto-attack
        if (this.type === 'tower') {
            this.updateTower(dt, allUnits, allBuildings);
        }

        return null;
    }

    updateTower(dt, allUnits, allBuildings) {
        const stats = this.getTowerStats();
        if (!stats) return;

        this.attackCooldown = Math.max(0, this.attackCooldown - dt * 1000);

        // Clean dead target
        if (this.attackTarget && (this.attackTarget.dead || this.attackTarget.hp <= 0)) {
            this.attackTarget = null;
        }

        // Find target
        if (!this.attackTarget) {
            let nearest = null;
            let nearestDist = stats.range;
            const cx = this.getCenterX();
            const cy = this.getCenterY();

            for (const u of allUnits) {
                if (u.dead || u.playerId === this.playerId) continue;
                const d = Utils.dist(cx, cy, u.x, u.y);
                if (d < nearestDist) { nearestDist = d; nearest = u; }
            }
            this.attackTarget = nearest;
        }

        if (!this.attackTarget) return;

        const tx = this.attackTarget.getCenterX ? this.attackTarget.getCenterX() : this.attackTarget.x;
        const ty = this.attackTarget.getCenterY ? this.attackTarget.getCenterY() : this.attackTarget.y;
        const cx = this.getCenterX();
        const cy = this.getCenterY();
        const dist = Utils.dist(cx, cy, tx, ty);

        if (dist > stats.range * 1.2) {
            this.attackTarget = null;
            return;
        }

        this.towerAngle = Utils.angle(cx, cy, tx, ty);

        if (this.attackCooldown <= 0) {
            this.attackCooldown = stats.attackSpeed;
            const color = CFG.PLAYER_COLORS[this.playerId];
            const target = this.attackTarget;
            const aoe = stats.aoe || 20;
            const damage = stats.damage;
            const infantryBonus = stats.infantryBonus || 1;
            const playerId = this.playerId;
            const level = this.level;

            Particles.muzzleFlash(cx, cy, this.towerAngle, color);
            Camera.shake(level >= 3 ? 4 : level >= 2 ? 2 : 1);
            Sound.play(level >= 3 ? 'bigExplosion' : 'shoot');

            // Большой снаряд для башен 2+ уровня
            const isBig = level >= 2;
            const speed = level >= 3 ? 200 : level >= 2 ? 250 : 300;

            Particles.addProjectile(cx, cy, tx, ty, color, speed, (hx, hy) => {
                // Ударная волна при попадании — ВСЕГДА
                Particles.towerImpact(hx, hy, aoe, color);

                // Урон основной цели
                if (target && !target.dead) {
                    // Бонус урона по пехоте (не технике)
                    const isInfantry = target.isVehicle === undefined || !target.isVehicle;
                    const finalDmg = isInfantry ? Math.floor(damage * infantryBonus) : damage;
                    target.takeDamage(finalDmg);
                }

                // AOE урон всем врагам в радиусе
                const units = Game.getAllUnits();
                for (const u of units) {
                    if (u === target || u.dead || u.playerId === playerId) continue;
                    const d = Utils.dist(hx, hy, u.x, u.y);
                    if (d < aoe) {
                        const falloff = 1 - (d / aoe);
                        const isInf = !u.isVehicle;
                        const aoeDmg = Math.floor(damage * falloff * 0.6 * (isInf ? infantryBonus : 1));
                        u.takeDamage(aoeDmg);
                        Particles.hit(u.x, u.y, '#f80');
                    }
                }

                // Разрушение кирпичей в зоне взрыва
                const tileR = aoe / CFG.TILE;
                for (let dr = -Math.ceil(tileR); dr <= Math.ceil(tileR); dr++) {
                    for (let dc = -Math.ceil(tileR); dc <= Math.ceil(tileR); dc++) {
                        const tile = GameMap.worldToTile(hx + dc * CFG.TILE, hy + dr * CFG.TILE);
                        GameMap.damageTile(tile.r, tile.c);
                    }
                }
            }, isBig);
        }
    }

    takeDamage(dmg) {
        this.hp -= dmg;
        if (this.hp <= 0) { this.hp = 0; this.dead = true; }
    }

    draw(ctx, playerColor) {
        if (this.dead) return;
        const s = this.size;
        const cx = this.x, cy = this.y;
        const mx = cx + s/2, my = cy + s/2;

        // Neon glow под зданием
        ctx.shadowColor = playerColor;
        ctx.shadowBlur = 10;
        ctx.fillStyle = playerColor;
        ctx.globalAlpha = 0.08;
        ctx.beginPath(); ctx.arc(mx, my, s * 0.6, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;

        // Selection
        if (this.selected) {
            ctx.shadowColor = '#ff0';
            ctx.shadowBlur = 15;
            ctx.strokeStyle = '#ff0';
            ctx.lineWidth = 2;
            ctx.strokeRect(cx - 2, cy - 2, s + 4, s + 4);
            ctx.shadowBlur = 0;

            if (this.type === 'tower') {
                const stats = this.getTowerStats();
                ctx.strokeStyle = 'rgba(255,80,80,0.2)';
                ctx.shadowColor = '#f44';
                ctx.shadowBlur = 8;
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.arc(mx, my, stats.range, 0, Math.PI*2); ctx.stroke();
                ctx.shadowBlur = 0;
            }
        }

        // Тёмное основание
        ctx.fillStyle = '#0d0d18';
        ctx.fillRect(cx+1, cy+1, s-2, s-2);

        // Неоновый контур здания
        ctx.shadowColor = playerColor;
        ctx.shadowBlur = 6;
        ctx.strokeStyle = playerColor;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx, cy, s, s);
        ctx.shadowBlur = 0;

        // Внутренняя графика по типу
        switch (this.type) {
            case 'base': this.drawBase(ctx, cx, cy, s, playerColor); break;
            case 'barracks': this.drawBarracks(ctx, cx, cy, s, playerColor); break;
            case 'market': this.drawMarket(ctx, cx, cy, s, playerColor); break;
            case 'factory': this.drawFactory(ctx, cx, cy, s, playerColor); break;
            case 'tower': this.drawTower(ctx, cx, cy, s, playerColor); break;
        }

        // HP bar — неоновый
        if (this.hp < this.maxHp) {
            const barW = s, ratio = this.hp / this.maxHp;
            const hpColor = ratio > 0.5 ? '#0f0' : ratio > 0.25 ? '#ff0' : '#f00';
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(cx, cy - 6, barW, 4);
            ctx.shadowColor = hpColor;
            ctx.shadowBlur = 4;
            ctx.fillStyle = hpColor;
            ctx.fillRect(cx, cy - 6, Math.floor(barW * ratio), 4);
            ctx.shadowBlur = 0;
        }

        // Train bar — неоновый
        if (this.trainQueue.length > 0) {
            const def = CFG.UNITS[this.trainQueue[0]];
            const progress = this.trainProgress / def.trainTime;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(cx+2, cy+s-5, s-4, 4);
            ctx.shadowColor = '#0ff';
            ctx.shadowBlur = 4;
            ctx.fillStyle = '#0ff';
            ctx.fillRect(cx+2, cy+s-5, Math.floor((s-4)*progress), 4);
            ctx.shadowBlur = 0;
        }
    }

    drawBase(ctx, x, y, s, color) {
        // Центральная иконка — крест
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.4;
        ctx.fillRect(x+s/2-2, y+4, 4, s-8);
        ctx.fillRect(x+4, y+s/2-2, s-8, 4);
        ctx.globalAlpha = 1;
        // Угловые точки
        const cs = Math.floor(s * 0.15);
        ctx.shadowColor = color; ctx.shadowBlur = 4;
        ctx.fillStyle = color;
        ctx.fillRect(x+2, y+2, cs, cs); ctx.fillRect(x+s-2-cs, y+2, cs, cs);
        ctx.fillRect(x+2, y+s-2-cs, cs, cs); ctx.fillRect(x+s-2-cs, y+s-2-cs, cs, cs);
        ctx.shadowBlur = 0;
        // Центр
        ctx.beginPath(); ctx.arc(x+s/2, y+s/2, s*0.15, 0, Math.PI*2);
        ctx.fillStyle = color; ctx.fill();
        // Уровень
        ctx.fillStyle = '#ff0';
        for (let i = 0; i < this.level; i++) ctx.fillRect(x+s/2-(this.level*3)+i*6, y+s-6, 4, 3);
    }

    drawBarracks(ctx, x, y, s, color) {
        // Окна — светящиеся точки
        ctx.shadowColor = '#88ccff'; ctx.shadowBlur = 5;
        ctx.fillStyle = '#88ccff';
        const winS = Math.max(3, Math.floor(s*0.1));
        const gap = Math.floor(s*0.25);
        for (let i = 0; i < this.level + 1; i++) {
            for (let j = 0; j < 2; j++) {
                ctx.fillRect(x+gap+j*(s-2*gap-winS), y+gap+i*gap, winS, winS);
            }
        }
        ctx.shadowBlur = 0;
        // Крыша
        ctx.fillStyle = color; ctx.fillRect(x+2, y+2, s-4, 3);
    }

    drawMarket(ctx, x, y, s, color) {
        // Неоновый $ символ
        ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 8;
        ctx.fillStyle = '#ffaa00';
        ctx.font = 'bold ' + Math.floor(s*0.4) + 'px Arial';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('$', x+s/2, y+s/2);
        ctx.shadowBlur = 0;
        // Нефть и металл точки
        ctx.fillStyle = '#f80'; ctx.beginPath(); ctx.arc(x+s*0.3, y+s*0.75, 3, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#aaa'; ctx.beginPath(); ctx.arc(x+s*0.7, y+s*0.75, 3, 0, Math.PI*2); ctx.fill();
    }

    drawFactory(ctx, x, y, s, color) {
        // Трубы — неоновые
        ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 4;
        ctx.fillStyle = '#444';
        ctx.fillRect(x+4, y-2, 5, 8); ctx.fillRect(x+s-9, y-2, 5, 8);
        // Дым
        const t = (Date.now() * 0.004) % 6;
        ctx.fillStyle = 'rgba(200,100,50,0.4)';
        ctx.beginPath(); ctx.arc(x+6, y-4-t, 3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(x+s-7, y-5-t*0.8, 2, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
        // Шестерёнка
        ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5;
        const gx = x+s/2, gy = y+s/2;
        const gr = s * 0.2;
        ctx.beginPath(); ctx.arc(gx, gy, gr, 0, Math.PI*2); ctx.stroke();
        const teeth = 6;
        for (let i = 0; i < teeth; i++) {
            const a = (Math.PI*2/teeth)*i + Date.now()*0.002;
            ctx.fillStyle = '#666';
            ctx.fillRect(gx+Math.cos(a)*gr-1, gy+Math.sin(a)*gr-1, 3, 3);
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, s, s);
    }

    drawTower(ctx, x, y, s, color) {
        const stats = this.getTowerStats();
        const tColor = stats.color;

        // Base platform
        const mx = x + s/2, my = y + s/2;

        // Центральный неоновый круг
        ctx.shadowColor = tColor;
        ctx.shadowBlur = 8 + this.level * 4;
        ctx.strokeStyle = tColor;
        ctx.lineWidth = 1.5 + this.level * 0.5;
        ctx.beginPath(); ctx.arc(mx, my, s*0.3 + this.level*2, 0, Math.PI*2); ctx.stroke();
        ctx.shadowBlur = 0;

        // Внутренний circle
        ctx.fillStyle = tColor;
        ctx.globalAlpha = 0.2;
        ctx.beginPath(); ctx.arc(mx, my, s*0.25, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;

        // Вращающийся ствол — неоновый
        ctx.save();
        ctx.translate(mx, my);
        ctx.rotate(this.towerAngle);
        const barrelLen = s*0.4 + this.level*4;
        ctx.shadowColor = tColor;
        ctx.shadowBlur = 6;
        ctx.strokeStyle = tColor;
        ctx.lineWidth = 2 + this.level;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(barrelLen, 0); ctx.stroke();
        // Muzzle glow
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(barrelLen, 0, 2 + this.level, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();

        // Level dots
        for (let i = 0; i < this.level; i++) {
            ctx.fillStyle = '#ff0';
            ctx.shadowColor = '#ff0'; ctx.shadowBlur = 4;
            ctx.beginPath(); ctx.arc(mx - (this.level-1)*4 + i*8, y+s-4, 2, 0, Math.PI*2); ctx.fill();
        }
        ctx.shadowBlur = 0;
    }

    containsPoint(px, py) {
        return px >= this.x && px <= this.x + this.size &&
               py >= this.y && py <= this.y + this.size;
    }
}

const Buildings = {
    getBuildPositions(baseX, baseY) {
        const s = CFG.BUILDING_SIZE;
        const bs = CFG.BASE_SIZE;
        const gap = 4;
        const positions = [];
        positions.push({ x: baseX + bs + gap, y: baseY });
        positions.push({ x: baseX + bs + gap, y: baseY + s + gap });
        positions.push({ x: baseX + bs + gap, y: baseY - s - gap });
        positions.push({ x: baseX - s - gap, y: baseY });
        positions.push({ x: baseX - s - gap, y: baseY + s + gap });
        positions.push({ x: baseX - s - gap, y: baseY - s - gap });
        positions.push({ x: baseX, y: baseY + bs + gap });
        positions.push({ x: baseX + s + gap, y: baseY + bs + gap });
        positions.push({ x: baseX, y: baseY - s - gap });
        return positions;
    },

    canPlace(x, y, existingBuildings, size = CFG.BUILDING_SIZE) {
        for (const b of existingBuildings) {
            if (b.dead) continue;
            if (Utils.rectsOverlap(x, y, size, size, b.x, b.y, b.size, b.size)) return false;
        }
        if (x < CFG.TILE || y < CFG.TILE ||
            x + size > CFG.MAP_W - CFG.TILE ||
            y + size > CFG.MAP_H - CFG.TILE) return false;
        const t = CFG.TILE;
        for (let r = Math.floor(y / t); r < Math.ceil((y + size) / t); r++) {
            for (let c = Math.floor(x / t); c < Math.ceil((x + size) / t); c++) {
                const tile = GameMap.getTile(r, c);
                if (tile !== CFG.TILE_EMPTY && tile !== CFG.TILE_ICE) return false;
            }
        }
        return true;
    },
};
