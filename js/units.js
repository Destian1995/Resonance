// ============================================
// Units — pixel art: humans, tanks, cannon, MLRS
// ============================================

class Unit {
    constructor(type, x, y, playerId) {
        const def = CFG.UNITS[type];
        this.type = type;
        this.x = x;
        this.y = y;
        this.playerId = playerId;
        this.hp = def.hp;
        this.maxHp = def.hp;
        this.damage = def.damage;
        this.range = def.range;
        this.speed = def.speed * 50;
        this.attackSpeed = def.attackSpeed;
        this.pop = def.pop;
        this.color = def.color;
        this.size = def.size;
        this.isVehicle = def.isVehicle || false;
        this.aoe = def.aoe || 0;

        this.targetX = x;
        this.targetY = y;
        this.moveTarget = null;
        this.attackTarget = null;
        this.attackCooldown = 0;
        this.selected = false;
        this.dead = false;
        this.angle = 0;
        this.dir8 = 2;     // 8 directions: 0=up,1=upR,2=right,3=downR,4=down,5=downL,6=left,7=upL
        this.facingLeft = false; // for walk: only left/right flip
        this.isAttacking = false;

        this.animTimer = 0;
        this.animFrame = 0;
        this.hitFlash = 0;
        this.walkCycle = 0;

        // Veterancy
        this.xp = 0;
        this.rank = 0; // 0=recruit, 1=veteran, 2=elite
    }

    moveTo(tx, ty) {
        this.moveTarget = { x: tx, y: ty };
        this.attackTarget = null;
    }

    attackMove(tx, ty) {
        this.moveTarget = { x: tx, y: ty };
    }

    setAttackTarget(target) {
        this.attackTarget = target;
        this.moveTarget = null;
    }

    update(dt, allUnits, allBuildings) {
        if (this.dead) return;

        this.animTimer += dt;
        if (this.hitFlash > 0) this.hitFlash -= dt;
        this.attackCooldown = Math.max(0, this.attackCooldown - dt * 1000);

        if (!this.attackTarget && !this.moveTarget) {
            this.attackTarget = this.findNearestEnemy(allUnits, allBuildings);
        }

        if (this.attackTarget) {
            if (this.attackTarget.dead || this.attackTarget.hp <= 0) {
                this.attackTarget = null;
            }
        }

        if (this.attackTarget) {
            const tx = this.attackTarget.getCenterX ? this.attackTarget.getCenterX() : this.attackTarget.x;
            const ty = this.attackTarget.getCenterY ? this.attackTarget.getCenterY() : this.attackTarget.y;
            const dist = Utils.dist(this.x, this.y, tx, ty);

            if (dist <= this.range) {
                this.angle = Utils.angle(this.x, this.y, tx, ty);
                this.updateDir();
                this.isAttacking = true;
                if (this.attackCooldown <= 0) {
                    this.performAttack(tx, ty);
                    this.attackCooldown = this.attackSpeed;
                }
            } else {
                this.isAttacking = false;
                this.moveToward(tx, ty, dt);
            }
        } else if (this.moveTarget) {
            this.isAttacking = false;
            const dist = Utils.dist(this.x, this.y, this.moveTarget.x, this.moveTarget.y);
            if (dist < 5) {
                this.moveTarget = null;
            } else {
                this.moveToward(this.moveTarget.x, this.moveTarget.y, dt);
                const enemy = this.findNearestEnemy(allUnits, allBuildings);
                if (enemy) {
                    const ex = enemy.getCenterX ? enemy.getCenterX() : enemy.x;
                    const ey = enemy.getCenterY ? enemy.getCenterY() : enemy.y;
                    if (Utils.dist(this.x, this.y, ex, ey) <= this.range) {
                        this.attackTarget = enemy;
                    }
                }
            }
        }

        this.separate(allUnits, dt);
    }

    updateDir() {
        // 8-direction from angle (for combat)
        let a = this.angle;
        if (a < 0) a += Math.PI * 2;
        // 0=up, 1=upR, 2=right, 3=downR, 4=down, 5=downL, 6=left, 7=upL
        this.dir8 = Math.round(a / (Math.PI / 4)) % 8;
        // Remap: atan2 0=right, we want 0=up
        // atan2: 0=right, PI/2=down, PI=left, -PI/2=up
        // So: right=0→2, downR=1→3, down=2→4, downL=3→5, left=4→6, upL=5→7, up=6→0, upR=7→1
        const remap = [2, 3, 4, 5, 6, 7, 0, 1];
        this.dir8 = remap[Math.round(a / (Math.PI / 4)) % 8];

        // Facing for infantry walk — only left or right
        this.facingLeft = (a > Math.PI / 2 && a < Math.PI * 3 / 2);

        // Facing for vehicle walk — 4 directions
        // Determine dominant axis
        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);
        if (Math.abs(cos) > Math.abs(sin)) {
            this.walkDir4 = cos > 0 ? 1 : 3; // right or left
        } else {
            this.walkDir4 = sin > 0 ? 2 : 0; // down or up
        }
    }

    moveToward(tx, ty, dt) {
        const angle = Utils.angle(this.x, this.y, tx, ty);
        this.angle = angle;
        this.updateDir();

        const moved = this.speed * dt;
        let nx = this.x + Math.cos(angle) * moved;
        let ny = this.y + Math.sin(angle) * moved;

        this.walkCycle += dt * 10;
        this.animFrame = Math.floor(this.animTimer * 8) % 2;

        if (GameMap.isPassable(nx, ny, this.size - 2)) {
            this.x = nx;
            this.y = ny;
        } else {
            if (GameMap.isPassable(nx, this.y, this.size - 2)) this.x = nx;
            else if (GameMap.isPassable(this.x, ny, this.size - 2)) this.y = ny;
        }

        this.x = Utils.clamp(this.x, this.size, CFG.MAP_W - this.size);
        this.y = Utils.clamp(this.y, this.size, CFG.MAP_H - this.size);
    }

    separate(allUnits, dt) {
        const sepDist = this.size * 2.2;
        let sx = 0, sy = 0;
        for (const other of allUnits) {
            if (other === this || other.dead) continue;
            const d = Utils.dist(this.x, this.y, other.x, other.y);
            if (d < sepDist && d > 0) {
                const force = (sepDist - d) / sepDist;
                sx += (this.x - other.x) / d * force;
                sy += (this.y - other.y) / d * force;
            }
        }
        const nx = this.x + sx * 25 * dt;
        const ny = this.y + sy * 25 * dt;
        if (GameMap.isPassable(nx, ny, this.size - 2)) {
            this.x = nx;
            this.y = ny;
        }
    }

    findNearestEnemy(allUnits, allBuildings) {
        let nearest = null;
        let nearestDist = this.range * 1.3;
        for (const u of allUnits) {
            if (u.dead || u.playerId === this.playerId) continue;
            const d = Utils.dist(this.x, this.y, u.x, u.y);
            if (d < nearestDist) { nearestDist = d; nearest = u; }
        }
        for (const b of allBuildings) {
            if (b.dead || b.playerId === this.playerId) continue;
            const d = Utils.dist(this.x, this.y, b.getCenterX(), b.getCenterY());
            if (d < nearestDist) { nearestDist = d; nearest = b; }
        }
        return nearest;
    }

    performAttack(tx, ty) {
        const targetObj = this.attackTarget;
        const color = CFG.PLAYER_COLORS[this.playerId];
        const pid = this.playerId;
        Particles.muzzleFlash(this.x, this.y, this.angle, color);

        const def = CFG.UNITS[this.type] || {};
        const isMLRS = this.type === 'mlrs';
        const isBigGun = this.isVehicle && this.aoe > 0;

        // Sound
        if (isMLRS) Sound.play('salvo');
        else if (isBigGun) Sound.play('bigExplosion');
        else Sound.play('shoot');

        // Saboteur: double shot + chance to throw grenade
        if (def.doubleShot) {
            // Second bullet offset
            Particles.addProjectile(this.x, this.y, tx + Utils.rand(-8, 8), ty + Utils.rand(-8, 8), color, 260, (hx, hy) => {
                if (targetObj && !targetObj.dead) {
                    targetObj.takeDamage(this.damage, pid);
                    Particles.hit(hx, hy, '#ff0');
                }
            });
        }
        if (def.grenadeChance && Math.random() < def.grenadeChance) {
            // Grenade!
            const gx = tx + Utils.rand(-20, 20), gy = ty + Utils.rand(-20, 20);
            Sound.play('explosion');
            Particles.addProjectile(this.x, this.y, gx, gy, '#0f0', 150, (hx, hy) => {
                Particles.shockwave(hx, hy, def.grenadeAoe || 30, '#0f0', 0.3);
                Particles.explosion(hx, hy, '#0f0', 12);
                Camera.shake(2);
                const units = Game.getAllUnits();
                for (const u of units) {
                    if (u.dead || u.playerId === pid) continue;
                    const d = Utils.dist(hx, hy, u.x, u.y);
                    if (d < (def.grenadeAoe || 30)) {
                        u.takeDamage(Math.floor((def.grenadeDmg || 35) * (1 - d / (def.grenadeAoe || 30))), pid);
                    }
                }
            }, true);
        }

        // РСЗО — залп из нескольких ракет
        if (isMLRS) {
            const rocketCount = 5;
            Camera.shake(4);
            for (let r = 0; r < rocketCount; r++) {
                const ox = Utils.rand(-this.aoe * 0.8, this.aoe * 0.8);
                const oy = Utils.rand(-this.aoe * 0.8, this.aoe * 0.8);
                const rtx = tx + ox, rty = ty + oy;
                const delay = r * 80;
                setTimeout(() => {
                    Particles.muzzleFlash(this.x, this.y, this.angle + Utils.rand(-0.3, 0.3), color);
                    Particles.addProjectile(this.x, this.y, rtx, rty, color, Utils.rand(140, 200), (hx, hy) => {
                        Particles.shockwave(hx, hy, this.aoe * 0.6, '#f80', 0.25);
                        Particles.explosion(hx, hy, '#f80', 10);
                        Particles.smoke(hx, hy, 3);
                        Camera.shake(2);
                        // Damage all enemies in blast
                        const units = Game.getAllUnits();
                        for (const u of units) {
                            if (u.dead || u.playerId === pid) continue;
                            const d = Utils.dist(hx, hy, u.x, u.y);
                            if (d < this.aoe * 0.7) {
                                const falloff = 1 - d / (this.aoe * 0.7);
                                const dmg = Math.floor(this.damage * 0.5 * falloff * (u.isVehicle ? 0.5 : 2.0));
                                u.takeDamage(dmg, pid);
                            }
                        }
                        // Damage buildings
                        const blds = Game.getAllBuildings();
                        for (const b of blds) {
                            if (b.dead || b.playerId === pid) continue;
                            const d = Utils.dist(hx, hy, b.getCenterX(), b.getCenterY());
                            if (d < this.aoe) {
                                b.takeDamage(Math.floor(this.damage * 0.4));
                                if (b.dead && Game.players[pid]) Game.players[pid].stats.killsBuilding++;
                            }
                        }
                        const tile = GameMap.worldToTile(hx, hy);
                        GameMap.damageTile(tile.r, tile.c);
                    }, true);
                }, delay);
            }
            return;
        }

        if (this.range > 60) {
            const def = CFG.UNITS[this.type];
            const bMult = def.buildingDmgMult || 1;
            const vMult = def.vehicleDmgMult || 1;
            const projSpeed = isBigGun ? 150 : 250;

            Particles.addProjectile(this.x, this.y, tx, ty, color, projSpeed, (hx, hy) => {
                if (targetObj && !targetObj.dead) {
                    // Apply multiplier for buildings/vehicles
                    let dmg = this.damage;
                    if (targetObj.type !== undefined && targetObj.type !== null && typeof targetObj.getAvailableUnits === 'function') {
                        // It's a building
                        dmg = Math.floor(this.damage * bMult);
                    } else if (targetObj.isVehicle) {
                        dmg = Math.floor(this.damage * vMult);
                    }
                    targetObj.takeDamage(dmg, pid);

                    if (this.aoe > 0) {
                        this.dealAoeDamage(hx, hy, bMult, vMult);
                        Particles.shockwave(hx, hy, this.aoe, color, 0.3);
                        Particles.explosion(hx, hy, '#f80', 15);
                        Particles.smoke(hx, hy, 4);
                        Camera.shake(isBigGun ? 5 : 3);
                    } else {
                        Particles.hit(hx, hy, '#ff0');
                    }
                    if (targetObj.dead || targetObj.hp <= 0) {
                        Particles.explosion(hx, hy, '#f80', 18);
                        Particles.smoke(hx, hy, 5);
                        Camera.shake(3);
                        if (typeof targetObj.getAvailableUnits === 'function' && Game.players[pid])
                            Game.players[pid].stats.killsBuilding++;
                    }
                }
                // Damage buildings in AOE too
                if (this.aoe > 0) {
                    const blds = Game.getAllBuildings();
                    for (const b of blds) {
                        if (b === targetObj || b.dead || b.playerId === pid) continue;
                        const d = Utils.dist(hx, hy, b.getCenterX(), b.getCenterY());
                        if (d < this.aoe) {
                            b.takeDamage(Math.floor(this.damage * bMult * 0.5));
                            if (b.dead && Game.players[pid]) Game.players[pid].stats.killsBuilding++;
                        }
                    }
                }
                const tile = GameMap.worldToTile(hx, hy);
                GameMap.damageTile(tile.r, tile.c);
            }, isBigGun);
        } else {
            if (targetObj && !targetObj.dead) {
                targetObj.takeDamage(this.damage, pid);
                Particles.hit(tx, ty, color);
                if (this.aoe > 0) this.dealAoeDamage(tx, ty);
                if (targetObj.dead || targetObj.hp <= 0) {
                    Particles.explosion(tx, ty, '#f80', 10);
                }
            }
        }
    }

    dealAoeDamage(cx, cy, bMult = 1, vMult = 1) {
        const allUnits = Game.getAllUnits();
        for (const u of allUnits) {
            if (u === this.attackTarget || u.dead || u.playerId === this.playerId) continue;
            const d = Utils.dist(cx, cy, u.x, u.y);
            if (d < this.aoe) {
                const falloff = 1 - d / this.aoe;
                let dmg = Math.floor(this.damage * falloff * 0.5);
                if (u.isVehicle) dmg = Math.floor(dmg * vMult);
                u.takeDamage(dmg, this.playerId);
                Particles.hit(u.x, u.y, '#f80');
            }
        }
    }

    takeDamage(dmg, attackerId) {
        // Territory defense bonus: 25% less damage on own territory
        const defBonus = GameMap.getDefenseBonus(this.x, this.y, this.playerId);
        dmg = Math.floor(dmg * defBonus);
        if (dmg < 1) dmg = 1;

        this.hp -= dmg;
        this.hitFlash = 0.12;
        // Floating damage number (green tint if defended)
        const numColor = defBonus < 1 ? '#4FC3F7' : '#f44';
        if (dmg > 0) Game.addDamageNumber(this.x + Utils.rand(-5, 5), this.y - this.size, Math.floor(dmg), numColor);
        // Track stats
        if (attackerId !== undefined && Game.players[attackerId]) {
            Game.players[attackerId].stats.damageDealt += dmg;
        }
        if (this.playerId !== undefined && Game.players[this.playerId]) {
            Game.players[this.playerId].stats.damageReceived += dmg;
        }
        if (this.hp <= 0) {
            this.hp = 0;
            this.dead = true;
            if (attackerId !== undefined && Game.players[attackerId]) {
                if (this.isVehicle) Game.players[attackerId].stats.killsVehicle++;
                else Game.players[attackerId].stats.killsInfantry++;
                // Grant XP to nearby attacker units
                for (const u of Game.players[attackerId].units) {
                    if (u.dead) continue;
                    if (Utils.dist(u.x, u.y, this.x, this.y) < 150) {
                        u.addXP(this.isVehicle ? 20 : 10);
                    }
                }
            }
        }
    }

    addXP(amount) {
        this.xp += amount;
        const oldRank = this.rank;
        if (this.xp >= 50) this.rank = 2;
        else if (this.xp >= 20) this.rank = 1;
        // Rank up bonuses
        if (this.rank > oldRank) {
            this.damage = Math.floor(CFG.UNITS[this.type].damage * (1 + this.rank * 0.2));
            this.maxHp = Math.floor(CFG.UNITS[this.type].hp * (1 + this.rank * 0.15));
            this.hp = Math.min(this.hp + 20, this.maxHp);
            Game.addDamageNumber(this.x, this.y - this.size - 10, this.rank === 2 ? 'ЭЛИТА' : 'ВЕТЕРАН', '#ff0');
        }
    }

    getCenterX() { return this.x; }
    getCenterY() { return this.y; }

    draw(ctx, playerColor) {
        if (this.dead) return;
        const s = this.size;
        const px = Math.floor(this.x), py = Math.floor(this.y);

        // Neon glow under unit
        ctx.shadowColor = playerColor;
        ctx.shadowBlur = 8;
        ctx.fillStyle = playerColor;
        ctx.globalAlpha = 0.12;
        ctx.beginPath(); ctx.arc(px, py, s + 2, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;

        // Selection — neon ring
        if (this.selected) {
            ctx.shadowColor = '#ff0';
            ctx.shadowBlur = 12;
            ctx.strokeStyle = '#ff0';
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(px, py, s + 3, 0, Math.PI * 2); ctx.stroke();
            ctx.shadowBlur = 0;
        }

        ctx.save();
        ctx.translate(px, py);

        const flash = this.hitFlash > 0;

        // dir8: 0=up, 1=upR, 2=right, 3=downR, 4=down, 5=downL, 6=left, 7=upL
        // Sprite drawn facing RIGHT. We flip horizontally for left-facing dirs,
        // then rotate only within -90° to +90° so it never goes upside down.
        //
        // dir8  → flip? → rotation (from right)
        //  0 up       no     -90°
        //  1 upR      no     -45°
        //  2 right    no       0°
        //  3 downR    no     +45°
        //  4 down     no     +90°
        //  5 downL    yes    +45°  (mirrored)
        //  6 left     yes      0°  (mirrored)
        //  7 upL      yes    -45°  (mirrored)

        // Flip Y so sprites (drawn with head at +Y) appear right-side up
        ctx.scale(1, -1);

        if (this.isVehicle) {
            // Vehicles: 4 directions always (walk and attack)
            // dir8→dir4: 0,7,1→up  2,3→right  4,5→down  6→left (but simplified)
            const dir4map = [0, 0, 1, 1, 2, 2, 3, 3]; // up,upR→up, right,downR→right, etc.
            const dir4 = this.isAttacking ? dir4map[this.dir8] : (this.walkDir4 !== undefined ? this.walkDir4 : 1);
            // dir4: 0=up, 1=right, 2=down, 3=left
            // sprite faces right, so: right=0°, down=−90°, left=flip, up=+90°
            if (dir4 === 0) ctx.rotate(Math.PI / 2);       // up
            else if (dir4 === 2) ctx.rotate(-Math.PI / 2);  // down
            else if (dir4 === 3) ctx.scale(-1, 1);           // left (flip)
            // dir4===1 (right) — no transform
        } else {
            // Infantry: 8 dir when attacking, left/right flip when walking
            if (this.isAttacking) {
                const flipDirs  = [false, false, false, false, false, true, true, true];
                const rotations = [Math.PI/2, Math.PI/4, 0, -Math.PI/4, -Math.PI/2, -Math.PI/4, 0, Math.PI/4];
                if (flipDirs[this.dir8]) ctx.scale(-1, 1);
                ctx.rotate(rotations[this.dir8]);
            } else {
                if (this.facingLeft) ctx.scale(-1, 1);
            }
        }

        switch (this.type) {
            case 'tank':           this.drawTank(ctx, s, playerColor, flash); break;
            case 'apc':            this.drawAPC(ctx, s, playerColor, flash); break;
            case 'mlrs':           this.drawMLRS(ctx, s, playerColor, flash); break;
            case 'artillery_unit': this.drawCannon(ctx, s, playerColor, flash); break;
            default:               this.drawHuman(ctx, s, playerColor, flash); break;
        }

        ctx.restore();

        // HP bar — neon
        if (this.hp < this.maxHp) {
            const barW = s * 2 + 2;
            const ratio = this.hp / this.maxHp;
            const hpColor = ratio > 0.5 ? '#0f0' : ratio > 0.25 ? '#ff0' : '#f00';
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(px - s - 1, py - s - 6, barW, 4);
            ctx.shadowColor = hpColor;
            ctx.shadowBlur = 4;
            ctx.fillStyle = hpColor;
            ctx.fillRect(px - s - 1, py - s - 6, Math.floor(barW * ratio), 4);
            ctx.shadowBlur = 0;
        }

        // Rank stars
        if (this.rank > 0) {
            ctx.shadowColor = '#ff0';
            ctx.shadowBlur = 4;
            ctx.fillStyle = '#ff0';
            for (let i = 0; i < this.rank; i++) {
                ctx.beginPath();
                ctx.arc(px - (this.rank - 1) * 4 + i * 8, py + s + 5, 2, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.shadowBlur = 0;
        }
    }

    // =====================
    // TANK — Battle City style with track animation
    // =====================
    drawTank(ctx, s, color, flash) {
        const c = flash ? '#fff' : this.color;
        const dk = flash ? '#ddd' : this.darken(this.color, 40);
        const f = this.animFrame;
        const p = s / 11; // scale factor

        // Tracks
        ctx.fillStyle = '#222';
        ctx.fillRect(-s, -s, s * 2, s * 2);

        // Track tread animation
        ctx.fillStyle = '#444';
        const step = Math.max(3, Math.round(4 * p));
        for (let i = -s + (f ? Math.round(2*p) : 0); i < s; i += step) {
            ctx.fillRect(i, -s, Math.round(2*p), Math.round(3*p));
            ctx.fillRect(i, s - Math.round(3*p), Math.round(2*p), Math.round(3*p));
        }

        // Track inners
        ctx.fillStyle = '#333';
        ctx.fillRect(-s + p, -s + Math.round(3*p), s*2 - p*2, Math.round(2*p));
        ctx.fillRect(-s + p, s - Math.round(5*p), s*2 - p*2, Math.round(2*p));

        // Body
        ctx.fillStyle = c;
        ctx.fillRect(-s + Math.round(3*p), -s + Math.round(3*p), s*2 - Math.round(6*p), s*2 - Math.round(6*p));
        ctx.fillStyle = dk;
        ctx.fillRect(-s + Math.round(4*p), -s + Math.round(4*p), s*2 - Math.round(8*p), s*2 - Math.round(8*p));
        // Highlight
        ctx.fillStyle = c;
        ctx.fillRect(-s + Math.round(4*p), -s + Math.round(4*p), s - Math.round(4*p), Math.round(2*p));

        // Turret
        const tw = Math.round(s * 0.7);
        ctx.fillStyle = c;
        ctx.fillRect(-tw/2, -tw/2, tw, tw);
        ctx.fillStyle = dk;
        ctx.fillRect(-tw/2+1, -tw/2+1, tw-2, tw-2);
        ctx.fillStyle = color;
        ctx.fillRect(Math.round(-s*0.18), Math.round(-s*0.18), Math.round(s*0.36), Math.round(s*0.36));

        // Barrel
        ctx.fillStyle = '#333';
        ctx.fillRect(tw/2, Math.round(-2*p), s - Math.round(2*p), Math.round(4*p));
        ctx.fillStyle = '#555';
        ctx.fillRect(s - Math.round(3*p), Math.round(-3*p), Math.round(4*p), Math.round(6*p));
    }

    // =====================
    // APC — fast armored box with turret
    drawAPC(ctx, s, color, flash) {
        const c = flash ? '#fff' : this.color;
        const dk = flash ? '#ddd' : this.darken(this.color, 30);
        const p = s / 10;

        // Wheels
        ctx.fillStyle = '#222';
        ctx.fillRect(s - Math.round(3*p), -s, Math.round(3*p), Math.round(3*p));
        ctx.fillRect(s - Math.round(3*p), s - Math.round(3*p), Math.round(3*p), Math.round(3*p));
        ctx.fillRect(-s, -s, Math.round(3*p), Math.round(3*p));
        ctx.fillRect(-s, s - Math.round(3*p), Math.round(3*p), Math.round(3*p));

        // Body — rounded box
        ctx.fillStyle = c;
        ctx.fillRect(-s + Math.round(2*p), -s + Math.round(2*p), s*2 - Math.round(4*p), s*2 - Math.round(4*p));
        ctx.fillStyle = dk;
        ctx.fillRect(-s + Math.round(3*p), -s + Math.round(3*p), s*2 - Math.round(6*p), s*2 - Math.round(6*p));

        // Windshield
        ctx.fillStyle = '#6af';
        ctx.fillRect(s - Math.round(4*p), -Math.round(2*p), Math.round(2*p), Math.round(4*p));

        // Small turret
        ctx.fillStyle = '#555';
        ctx.fillRect(-Math.round(2*p), -Math.round(2*p), Math.round(4*p), Math.round(4*p));

        // Gun barrel
        ctx.fillStyle = '#444';
        ctx.fillRect(Math.round(2*p), -Math.round(p), s - Math.round(p), Math.round(2*p));

        // Player color stripe
        ctx.fillStyle = color;
        ctx.fillRect(-s + Math.round(2*p), -s + Math.round(2*p), s*2 - Math.round(4*p), Math.round(2*p));
        ctx.fillRect(-s + Math.round(2*p), s - Math.round(4*p), s*2 - Math.round(4*p), Math.round(2*p));
    }

    // MLRS — truck with rocket launcher
    // =====================
    drawMLRS(ctx, s, color, flash) {
        const c = flash ? '#fff' : this.color;
        const dk = flash ? '#ddd' : this.darken(this.color, 30);
        const p = s / 11;

        // Wheels
        ctx.fillStyle = '#222';
        const wr = Math.round(3.5 * p);
        ctx.fillRect(s - wr*2, -s, wr*2, wr*2);
        ctx.fillRect(s - wr*2, s - wr*2, wr*2, wr*2);
        ctx.fillRect(-s, -s, wr*2, wr*2);
        ctx.fillRect(-s, s - wr*2, wr*2, wr*2);
        // Wheel hubs
        ctx.fillStyle = '#555';
        ctx.fillRect(s - wr*2 + Math.round(p), -s + Math.round(p), wr*2 - Math.round(2*p), wr*2 - Math.round(2*p));
        ctx.fillRect(s - wr*2 + Math.round(p), s - wr*2 + Math.round(p), wr*2 - Math.round(2*p), wr*2 - Math.round(2*p));

        // Cabin
        const cabW = Math.round(s * 0.65);
        ctx.fillStyle = c;
        ctx.fillRect(s - cabW, -s + wr*2, cabW, s*2 - wr*4);
        ctx.fillStyle = dk;
        ctx.fillRect(s - cabW + Math.round(p), -s + wr*2 + Math.round(p), cabW - Math.round(2*p), s*2 - wr*4 - Math.round(2*p));
        // Windshield
        ctx.fillStyle = '#6af';
        ctx.fillRect(s - cabW + Math.round(2*p), -s + wr*2 + Math.round(2*p), cabW - Math.round(4*p), s*2 - wr*4 - Math.round(4*p));

        // Truck bed
        ctx.fillStyle = '#3a3a3a';
        ctx.fillRect(-s + wr*2, -s + wr*2, s*2 - cabW - wr*2 + Math.round(p), s*2 - wr*4);

        // Rocket rack
        ctx.fillStyle = '#555';
        const rackX = -s + wr*2 + Math.round(p);
        const rackW = s*2 - cabW - wr*2 - Math.round(p);
        const rackY = -s + wr*2 + Math.round(p);
        const rackH = s*2 - wr*4 - Math.round(2*p);
        ctx.fillRect(rackX, rackY, rackW, rackH);

        // Rocket tubes (3 rows)
        const tubeH = Math.round(rackH / 4);
        for (let i = 0; i < 3; i++) {
            const ry = rackY + Math.round(tubeH * (i + 0.5));
            ctx.fillStyle = '#777';
            ctx.fillRect(rackX + Math.round(p), ry, rackW - Math.round(2*p), tubeH - Math.round(p));
            // Rocket tips
            ctx.fillStyle = '#e44';
            ctx.fillRect(rackX + Math.round(p), ry, Math.round(2*p), tubeH - Math.round(p));
        }

        // Player color stripe
        ctx.fillStyle = color;
        ctx.fillRect(s - cabW, -s + wr*2, cabW, Math.round(2*p));
        ctx.fillRect(s - cabW, s - wr*2 - Math.round(2*p), cabW, Math.round(2*p));
    }

    // =====================
    // ARTILLERY — cannon with big wheels
    // =====================
    drawCannon(ctx, s, color, flash) {
        const c = flash ? '#fff' : this.color;
        const dk = flash ? '#ddd' : this.darken(this.color, 40);
        const p = s / 12;

        // Big wheels
        const wheelR = Math.round(4 * p);
        ctx.fillStyle = '#333';
        ctx.beginPath(); ctx.arc(-s + wheelR + Math.round(p), -s + wheelR + Math.round(p), wheelR, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(-s + wheelR + Math.round(p), s - wheelR - Math.round(p), wheelR, 0, Math.PI * 2); ctx.fill();
        // Spokes
        ctx.fillStyle = '#666';
        ctx.beginPath(); ctx.arc(-s + wheelR + Math.round(p), -s + wheelR + Math.round(p), Math.round(2*p), 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(-s + wheelR + Math.round(p), s - wheelR - Math.round(p), Math.round(2*p), 0, Math.PI * 2); ctx.fill();

        // Gun trail / carriage
        ctx.fillStyle = dk;
        const trailH = Math.round(5 * p);
        ctx.fillRect(-s, -trailH/2, s, trailH);
        ctx.fillStyle = '#444';
        ctx.fillRect(-s, Math.round(-2*p), Math.round(3*p), Math.round(4*p));

        // Gun shield
        ctx.fillStyle = c;
        const shieldW = Math.round(4 * p);
        ctx.fillRect(-Math.round(p), -s + Math.round(2*p), shieldW, s*2 - Math.round(4*p));
        ctx.fillStyle = dk;
        ctx.fillRect(0, -s + Math.round(3*p), shieldW - Math.round(2*p), s*2 - Math.round(6*p));

        // Barrel
        const barrelStart = shieldW;
        const barrelLen = s + Math.round(3*p);
        ctx.fillStyle = '#444';
        ctx.fillRect(barrelStart, Math.round(-3*p), barrelLen, Math.round(6*p));
        ctx.fillStyle = '#555';
        ctx.fillRect(barrelStart, Math.round(-2*p), barrelLen, Math.round(4*p));
        // Muzzle
        ctx.fillStyle = '#333';
        ctx.fillRect(barrelStart + barrelLen - Math.round(3*p), Math.round(-4*p), Math.round(4*p), Math.round(8*p));
        // Barrel bands
        ctx.fillStyle = '#666';
        ctx.fillRect(barrelStart + Math.round(3*p), Math.round(-3*p), Math.round(2*p), Math.round(6*p));
        ctx.fillRect(barrelStart + barrelLen - Math.round(7*p), Math.round(-3*p), Math.round(2*p), Math.round(6*p));

        // Breech
        ctx.fillStyle = '#555';
        ctx.fillRect(-Math.round(2*p), Math.round(-4*p), Math.round(5*p), Math.round(8*p));

        // Player color flag
        ctx.fillStyle = color;
        ctx.fillRect(-s, -s, Math.round(3*p), Math.round(6*p));
        ctx.fillRect(-s + Math.round(3*p), -s, Math.round(2*p), Math.round(3*p));
    }

    // =====================
    // HUMAN — soldier (mercenary, sniper, rocketeer)
    // All coordinates scale with s
    // =====================
    drawHuman(ctx, s, color, flash) {
        const c = flash ? '#fff' : this.color;
        const dk = flash ? '#ddd' : this.darken(this.color, 30);
        const walk = Math.floor(this.walkCycle) % 4;
        const isMoving = !!(this.moveTarget);
        const p = s / 10; // scale unit

        // --- Legs ---
        ctx.fillStyle = '#3a4a30';
        const legW = Math.round(3 * p);
        const legH = Math.round(4 * p);
        const legY = -s;
        const legOff = isMoving ? ((walk < 2) ? Math.round(2*p) : -Math.round(2*p)) : 0;
        // Left leg
        ctx.fillRect(-Math.round(3*p), legY + legOff, legW, legH);
        // Right leg
        ctx.fillRect(0, legY - legOff, legW, legH);
        // Boots
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(-Math.round(3*p), legY + legH - Math.round(2*p) + legOff, legW, Math.round(2*p));
        ctx.fillRect(0, legY + legH - Math.round(2*p) - legOff, legW, Math.round(2*p));

        // --- Body ---
        const bodyW = Math.round(8 * p);
        const bodyH = Math.round(7 * p);
        const bodyX = -Math.round(4 * p);
        const bodyY = -Math.round(3 * p);
        ctx.fillStyle = c;
        ctx.fillRect(bodyX, bodyY, bodyW, bodyH);
        ctx.fillStyle = dk;
        ctx.fillRect(bodyX + Math.round(p), bodyY + Math.round(p), bodyW - Math.round(2*p), bodyH - Math.round(2*p));

        // Belt
        ctx.fillStyle = '#444';
        ctx.fillRect(bodyX, bodyY + bodyH - Math.round(2*p), bodyW, Math.round(2*p));

        // --- Arms ---
        const armW = Math.round(2 * p);
        const armH = Math.round(5 * p);
        ctx.fillStyle = c;
        ctx.fillRect(bodyX - armW, bodyY + Math.round(p), armW, armH);
        ctx.fillRect(bodyX + bodyW, bodyY + Math.round(p), armW, armH);

        // --- Head ---
        const headW = Math.round(6 * p);
        const headH = Math.round(6 * p);
        const headX = -Math.round(3 * p);
        const headY = bodyY + bodyH;
        ctx.fillStyle = flash ? '#ffe' : '#e8c89a';
        ctx.fillRect(headX, headY, headW, headH);

        // Hair / helmet
        if (this.type === 'sniper') {
            ctx.fillStyle = '#2244aa';
            ctx.fillRect(headX - Math.round(p), headY + Math.round(4*p), headW + Math.round(2*p), Math.round(3*p));
        } else if (this.type === 'rocketeer') {
            ctx.fillStyle = '#556633';
            ctx.fillRect(headX - Math.round(p), headY + Math.round(3*p), headW + Math.round(2*p), Math.round(4*p));
        } else {
            ctx.fillStyle = '#884422';
            ctx.fillRect(headX, headY + Math.round(4*p), headW, Math.round(3*p));
        }

        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(headX + Math.round(p), headY + Math.round(2*p), Math.round(2*p), Math.round(p));
        ctx.fillRect(headX + headW - Math.round(3*p), headY + Math.round(2*p), Math.round(2*p), Math.round(p));

        // --- Weapon ---
        const gunY = -Math.round(p);
        const gunStart = bodyX + bodyW + armW;
        if (this.type === 'sniper') {
            // Long rifle
            ctx.fillStyle = '#444';
            ctx.fillRect(gunStart, gunY, s + Math.round(2*p), Math.round(2*p));
            ctx.fillStyle = '#5a3a20';
            ctx.fillRect(gunStart, gunY, Math.round(4*p), Math.round(2*p));
            // Scope
            ctx.fillStyle = '#88f';
            ctx.fillRect(gunStart + Math.round(5*p), gunY - Math.round(p), Math.round(3*p), Math.round(p));
        } else if (this.type === 'rocketeer') {
            // Rocket launcher
            ctx.fillStyle = '#556633';
            ctx.fillRect(gunStart, gunY - Math.round(p), s + Math.round(2*p), Math.round(4*p));
            ctx.fillStyle = '#333';
            ctx.fillRect(gunStart, gunY, s + Math.round(2*p), Math.round(2*p));
            // Rocket tip
            ctx.fillStyle = '#e44';
            ctx.fillRect(gunStart + s, gunY, Math.round(3*p), Math.round(2*p));
        } else {
            // Assault rifle
            ctx.fillStyle = '#444';
            ctx.fillRect(gunStart, gunY, s - Math.round(2*p), Math.round(2*p));
            ctx.fillStyle = '#5a3a20';
            ctx.fillRect(gunStart, gunY, Math.round(3*p), Math.round(2*p));
            // Magazine
            ctx.fillStyle = '#333';
            ctx.fillRect(gunStart + Math.round(4*p), gunY + Math.round(2*p), Math.round(2*p), Math.round(2*p));
        }

        // Player color shoulder pads
        ctx.fillStyle = color;
        ctx.fillRect(bodyX - armW, bodyY + Math.round(p), armW, Math.round(2*p));
        ctx.fillRect(bodyX + bodyW, bodyY + Math.round(p), armW, Math.round(2*p));
    }

    darken(hex, amount) {
        let r = parseInt(hex.slice(1, 3), 16);
        let g = parseInt(hex.slice(3, 5), 16);
        let b = parseInt(hex.slice(5, 7), 16);
        r = Math.max(0, r - amount);
        g = Math.max(0, g - amount);
        b = Math.max(0, b - amount);
        return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
    }
}
