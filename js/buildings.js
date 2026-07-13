// ============ BUILDINGS (towers, walls, traps) ============
const TOWER_DEFS = {
    arrow:     { name:'Стрелковая',  cost:25,  color:'#ca4', dmg:8,  range:3, cd:800,  projColor:'#ff0', projSpd:350, icon:'🏹' },
    fire:      { name:'Огненная',    cost:40,  color:'#f60', dmg:15, range:2.5, cd:1500, projColor:'#f80', projSpd:250, icon:'🔥', aoe:30 },
    ice:       { name:'Ледяная',     cost:35,  color:'#8ef', dmg:6,  range:3, cd:1000, projColor:'#8ef', projSpd:300, icon:'❄', slow:true },
    lightning: { name:'Молниевая',   cost:50,  color:'#4ef', dmg:12, range:3.5, cd:2000, projColor:'#4ef', projSpd:0, icon:'⚡', chain:3 },
    cannon:    { name:'Пушка',       cost:60,  color:'#888', dmg:30, range:4, cd:3000, projColor:'#aaa', projSpd:200, icon:'💣', aoe:50 },
    wall:      { name:'Стена',       cost:10,  color:'#666', hp:80, icon:'🧱' },
    trap:      { name:'Ловушка',     cost:20,  color:'#a44', dmg:20, icon:'⚠', slow:true },
    heal:      { name:'Лечебная',    cost:45,  color:'#4f4', healRange:2.5, healAmt:2, cd:1000, icon:'💚' }
};

const Buildings = {
    list: [],       // all placed buildings
    projs: [],      // tower projectiles

    place(q, r, type) {
        if (!World.canBuild(q, r)) return false;
        const def = TOWER_DEFS[type];
        if (!def) return false;
        const p = U.hexToPixel(q, r);
        const b = {
            q, r, x: p.x, y: p.y, type, level: 1,
            hp: def.hp || 999, maxHp: def.hp || 999,
            timer: 0, def,
            triggered: false // for traps
        };
        this.list.push(b);
        World.getCell(q, r).building = b;
        Snd.play('build');
        return true;
    },

    sell(q, r) {
        const idx = this.list.findIndex(b => b.q === q && b.r === r);
        if (idx === -1) return 0;
        const b = this.list[idx];
        const refund = Math.floor(b.def.cost * 0.6);
        this.list.splice(idx, 1);
        const cell = World.getCell(q, r);
        if (cell) cell.building = null;
        Snd.play('sell');
        return refund;
    },

    update(dt, enemies, hero) {
        for (const b of this.list) {
            if (b.hp <= 0) continue;
            b.timer -= dt * 1000;
            const def = b.def;

            if (def.healRange && b.timer <= 0) {
                // Heal hero if nearby
                b.timer = def.cd;
                const hd = U.hexDist(b.q, b.r, 0, 0);
                if (hd <= def.healRange) {
                    // Heal core
                    Game.coreHp = Math.min(CFG.CORE_HP, Game.coreHp + def.healAmt);
                }
                if (U.dist(b, hero) < def.healRange * CFG.HEX_R * 1.8) {
                    hero.hp = Math.min(hero.maxHp, hero.hp + def.healAmt);
                    FX.sparkle(hero.x, hero.y, '#4f4', 3, 20);
                }
                continue;
            }

            if (def.dmg && !def.hp && def.cd && !b.triggered) {
                // Trap: trigger on contact
                if (def.icon === '⚠') {
                    for (const e of enemies) {
                        if (!e.alive) continue;
                        if (U.dist(b, e) < CFG.HEX_R) {
                            e.hp -= def.dmg * b.level;
                            if (def.slow) { e.slow = .4; e.slowTimer = 2000; }
                            FX.ring(b.x, b.y, '#f44', 30, .3);
                            FX.num(e.x, e.y, def.dmg * b.level, '#f44');
                            b.triggered = true;
                            b.hp = 0;
                            Snd.play('boom', .15);
                            break;
                        }
                    }
                    continue;
                }

                // Tower: shoot
                if (b.timer > 0) continue;
                const range = (def.range || 3) * CFG.HEX_R * 1.8;
                let target = null, bd = Infinity;
                for (const e of enemies) {
                    if (!e.alive) continue;
                    const d = U.dist(b, e);
                    if (d < range && d < bd) { bd = d; target = e; }
                }
                if (!target) continue;
                b.timer = def.cd / b.level;

                if (def.chain) {
                    // Lightning: instant chain
                    let cur = target;
                    const hit = new Set();
                    for (let c = 0; c < def.chain + b.level; c++) {
                        if (!cur || !cur.alive) break;
                        cur.hp -= def.dmg * b.level;
                        FX.sparkle(cur.x, cur.y, '#4ef', 4, 50);
                        FX.num(cur.x, cur.y, def.dmg * b.level, '#4ef');
                        hit.add(cur);
                        let next = null, nd = Infinity;
                        for (const e of enemies) {
                            if (!e.alive || hit.has(e)) continue;
                            const d = U.dist(cur, e);
                            if (d < 100 && d < nd) { nd = d; next = e; }
                        }
                        if (next) FX.bolt(cur.x, cur.y, next.x, next.y, '#4ef', .25);
                        cur = next;
                    }
                    FX.bolt(b.x, b.y, target.x, target.y, '#8cf', .2);
                } else {
                    // Projectile
                    const a = U.angle(b, target);
                    this.projs.push({
                        x: b.x, y: b.y,
                        vx: Math.cos(a) * def.projSpd, vy: Math.sin(a) * def.projSpd,
                        dmg: def.dmg * b.level,
                        color: def.projColor, r: def.aoe ? 5 : 3,
                        life: 2, aoe: def.aoe || 0,
                        slow: def.slow || false
                    });
                }
            }
        }

        // Remove dead buildings
        for (let i = this.list.length - 1; i >= 0; i--) {
            if (this.list[i].hp <= 0) {
                const b = this.list[i];
                const cell = World.getCell(b.q, b.r);
                if (cell) cell.building = null;
                FX.spawn(b.x, b.y, b.def.color, 6, 50);
                this.list.splice(i, 1);
            }
        }

        // Update projectiles
        for (let i = this.projs.length - 1; i >= 0; i--) {
            const p = this.projs[i];
            p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
            if (p.life <= 0) { this.projs.splice(i, 1); continue; }
            FX.trail(p.x, p.y, p.color, 2);
            for (const e of enemies) {
                if (!e.alive) continue;
                if (U.dist(p, e) < p.r + e.r) {
                    if (p.aoe) {
                        // AoE damage
                        FX.ring(p.x, p.y, p.color, p.aoe, .3);
                        FX.spawn(p.x, p.y, p.color, 8, 60);
                        Cam.addShake(3);
                        for (const e2 of enemies) {
                            if (e2.alive && U.dist(p, e2) < p.aoe) {
                                e2.hp -= p.dmg;
                                FX.num(e2.x, e2.y, p.dmg, p.color);
                            }
                        }
                    } else {
                        e.hp -= p.dmg;
                        FX.sparkle(e.x, e.y, p.color, 4, 40);
                        FX.num(e.x, e.y, p.dmg, p.color);
                        if (p.slow) { e.slow = .4; e.slowTimer = 1500; }
                    }
                    Snd.play('hit', .08);
                    this.projs.splice(i, 1);
                    break;
                }
            }
        }
    },

    draw(ctx) {
        for (const b of this.list) {
            if (b.hp <= 0) continue;
            const def = b.def;
            const p = { x: b.x, y: b.y };
            const hr = CFG.HEX_R * .6;

            if (def.hp && def.icon === '🧱') {
                // Wall
                ctx.fillStyle = '#555';
                ctx.fillRect(b.x - hr, b.y - hr * .6, hr * 2, hr * 1.2);
                ctx.fillStyle = '#777';
                ctx.fillRect(b.x - hr, b.y - hr * .6, hr * 2, 3);
            } else if (def.icon === '⚠') {
                // Trap
                ctx.fillStyle = '#422';
                U.drawHex(ctx, b.x, b.y, hr * .8, '#422', '#f44');
                ctx.fillStyle = '#f44';
                ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText('!', b.x, b.y);
            } else {
                // Tower base
                U.drawHex(ctx, b.x, b.y, hr, '#222', def.color);
                // Tower body
                ctx.fillStyle = def.color;
                ctx.fillRect(b.x - 4, b.y - 8, 8, 12);
                ctx.fillStyle = '#333';
                ctx.fillRect(b.x - 6, b.y + 2, 12, 4);
                // Top
                ctx.fillStyle = def.color;
                ctx.beginPath(); ctx.arc(b.x, b.y - 8, 5, 0, Math.PI * 2); ctx.fill();
                // Level indicator
                if (b.level > 1) {
                    ctx.fillStyle = '#ff0';
                    for (let s = 0; s < b.level - 1; s++) {
                        ctx.fillRect(b.x - 3 + s * 4, b.y + 6, 3, 3);
                    }
                }
            }
        }
        // Projectiles
        for (const p of this.projs) {
            ctx.globalAlpha = .3; ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1; ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r * .6, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x | 0, p.y | 0, p.r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
    },

    clear() { this.list = []; this.projs = []; }
};
