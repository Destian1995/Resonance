// ============ ENEMIES ============
const ENEMY_TYPES = [
    { name:'Гоблин',  color:'#5a5', r:7,  hpM:1,   spdM:1.2, dmgM:.8, xp:2 },
    { name:'Скелет',  color:'#cc9', r:7,  hpM:.8,  spdM:1.4, dmgM:.7, xp:2 },
    { name:'Мышь',    color:'#a6a', r:5,  hpM:.5,  spdM:2,   dmgM:.5, xp:1 },
    { name:'Огр',     color:'#a86', r:10, hpM:3,   spdM:.6,  dmgM:2,  xp:5 },
    { name:'Призрак', color:'#aaf', r:7,  hpM:1,   spdM:1.1, dmgM:1,  xp:3 },
    { name:'Подрывн.',color:'#f84', r:8,  hpM:1.2, spdM:1,   dmgM:3,  xp:4, bomber:true },
    { name:'Лекарь',  color:'#4f4', r:7,  hpM:1,   spdM:.9,  dmgM:.5, xp:4, healer:true }
];
const BOSS_TYPES = [
    { name:'Дракон',    color:'#f44', r:22, hpM:20, spdM:.5, dmgM:4, xp:40 },
    { name:'Голем',     color:'#888', r:26, hpM:35, spdM:.3, dmgM:3, xp:50 },
    { name:'Некромант', color:'#a4f', r:18, hpM:15, spdM:.6, dmgM:2, xp:45, summoner:true }
];

const Enemies = {
    list: [],

    spawnWave(waveNum) {
        const count = 5 + waveNum * 3;
        const scale = 1 + (waveNum - 1) * .12;
        const avail = waveNum < 3 ? ENEMY_TYPES.slice(0, 2) :
                      waveNum < 6 ? ENEMY_TYPES.slice(0, 4) : ENEMY_TYPES;
        for (let i = 0; i < count; i++) {
            const type = U.pick(avail);
            this._spawn(type, scale, i * .3); // stagger spawn
        }
    },

    spawnBoss(waveNum) {
        const type = BOSS_TYPES[Math.floor((waveNum / CFG.BOSS_EVERY - 1) % BOSS_TYPES.length)];
        const scale = 1 + (waveNum - 1) * .08;
        this._spawn(type, scale, 0, true);
        Snd.play('boss');
    },

    _spawn(type, scale, delay, boss) {
        // Spawn at edge ring
        const ring = CFG.GRID_RINGS;
        // Pick random edge hex
        const angle = Math.random() * Math.PI * 2;
        const q = Math.round(Math.cos(angle) * ring);
        const r = Math.round(Math.sin(angle) * ring);
        const p = U.hexToPixel(q, r);

        this.list.push({
            x: p.x, y: p.y, r: type.r,
            hp: Math.floor(CFG.ENEMY_BASE_HP * type.hpM * scale),
            maxHp: Math.floor(CFG.ENEMY_BASE_HP * type.hpM * scale),
            speed: CFG.ENEMY_BASE_SPD * type.spdM,
            dmg: Math.floor(CFG.ENEMY_BASE_DMG * type.dmgM * scale),
            xp: type.xp, color: type.color, name: type.name,
            alive: true, slow: 1, slowTimer: 0, dmgTimer: 0,
            boss: !!boss, bomber: !!type.bomber, healer: !!type.healer,
            summoner: !!type.summoner, summonTimer: 0,
            spawnDelay: delay || 0, anim: Math.random() * 10
        });
    },

    update(dt, hero) {
        const coreP = U.hexToPixel(0, 0);

        for (let i = this.list.length - 1; i >= 0; i--) {
            const e = this.list[i];
            e.anim += dt;

            // Spawn delay
            if (e.spawnDelay > 0) { e.spawnDelay -= dt; continue; }

            // Dead
            if (e.hp <= 0) {
                e.alive = false;
                FX.spawn(e.x, e.y, e.color, e.boss ? 15 : 6, e.boss ? 100 : 60);
                if (e.boss) { FX.doFlash('#ff0', .4); Cam.addShake(10); FX.ring(e.x, e.y, '#ff0', 80, .5); }
                FX.num(e.x, e.y, `+${e.xp}`, '#ff0', e.boss);
                Snd.play(e.boss ? 'boom' : 'hit', .12);
                Game.gold += CFG.GOLD_PER_KILL + (e.boss ? 30 : 0);
                Game.kills++;
                this.list.splice(i, 1);
                continue;
            }

            // Slow
            if (e.slowTimer > 0) { e.slowTimer -= dt * 1000; if (e.slowTimer <= 0) e.slow = 1; }

            // Healer: heal nearby enemies
            if (e.healer) {
                for (const other of this.list) {
                    if (other === e || !other.alive || other.hp >= other.maxHp) continue;
                    if (U.dist(e, other) < 60) {
                        other.hp = Math.min(other.maxHp, other.hp + 3 * dt);
                        if (Math.random() < .05) FX.sparkle(other.x, other.y, '#4f4', 2, 15);
                    }
                }
            }

            // Summoner boss: spawn minions
            if (e.summoner) {
                e.summonTimer += dt * 1000;
                if (e.summonTimer > 4000) {
                    e.summonTimer = 0;
                    for (let s = 0; s < 3; s++) {
                        this._spawn(ENEMY_TYPES[0], 1, 0);
                        const last = this.list[this.list.length - 1];
                        last.x = e.x + (Math.random() - .5) * 40;
                        last.y = e.y + (Math.random() - .5) * 40;
                    }
                    FX.ring(e.x, e.y, '#a4f', 40, .3);
                }
            }

            // Move toward core
            const target = coreP;
            const a = U.angle(e, target);
            const spd = e.speed * e.slow * dt;
            e.x += Math.cos(a) * spd;
            e.y += Math.sin(a) * spd;

            // Damage core on contact
            if (U.dist2(e.x, e.y, coreP.x, coreP.y) < e.r + 15) {
                Game.coreHp -= e.dmg;
                if (e.bomber) { Game.coreHp -= e.dmg * 2; FX.ring(e.x, e.y, '#f84', 40, .3); Cam.addShake(5); }
                e.hp = 0;
                FX.spawn(coreP.x, coreP.y, '#f00', 5);
                FX.doFlash('#f00', .1);
                Cam.addShake(3);
            }

            // Damage hero on contact
            e.dmgTimer -= dt * 1000;
            if (U.dist(e, hero) < e.r + hero.r && e.dmgTimer <= 0) {
                hero.hp -= e.dmg;
                e.dmgTimer = 600;
                FX.spawn(hero.x, hero.y, '#f00', 4);
                FX.num(hero.x, hero.y, e.dmg, '#f44');
                Cam.addShake(2);
            }

            // Bomber: damage buildings
            if (e.bomber) {
                for (const b of Buildings.list) {
                    if (b.def.hp && U.dist(e, b) < e.r + 15) {
                        b.hp -= e.dmg;
                        e.hp = 0;
                        FX.ring(e.x, e.y, '#f84', 35, .3);
                        Cam.addShake(4);
                        break;
                    }
                }
            }
        }
    },

    draw(ctx) {
        for (const e of this.list) {
            if (e.spawnDelay > 0) continue;
            const bob = Math.sin(e.anim * 3) * (e.boss ? 2 : 1);

            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,.3)';
            ctx.beginPath(); ctx.ellipse(e.x, e.y + e.r + 2, e.r * .7, 3, 0, 0, Math.PI * 2); ctx.fill();

            // Body
            ctx.fillStyle = e.color;
            ctx.beginPath(); ctx.arc(e.x | 0, (e.y + bob) | 0, e.r, 0, Math.PI * 2); ctx.fill();

            // Boss glow
            if (e.boss) {
                ctx.globalAlpha = .2; ctx.fillStyle = e.color;
                ctx.beginPath(); ctx.arc(e.x, e.y + bob, e.r + 8, 0, Math.PI * 2); ctx.fill();
                ctx.globalAlpha = 1;
            }

            // Eyes
            ctx.fillStyle = e.boss ? '#f00' : '#fff';
            ctx.fillRect(e.x - 3, e.y - 2 + bob, 2, 2);
            ctx.fillRect(e.x + 1, e.y - 2 + bob, 2, 2);

            // Healer cross
            if (e.healer) {
                ctx.fillStyle = '#fff';
                ctx.fillRect(e.x - 1, e.y - 5 + bob, 2, 6);
                ctx.fillRect(e.x - 3, e.y - 3 + bob, 6, 2);
            }

            // Bomber fuse
            if (e.bomber) {
                ctx.fillStyle = '#ff0';
                ctx.beginPath(); ctx.arc(e.x, e.y - e.r + bob, 3, 0, Math.PI * 2); ctx.fill();
            }

            // HP bar
            if (e.hp < e.maxHp) {
                const bw = e.r * 2 + 4;
                ctx.fillStyle = 'rgba(0,0,0,.5)';
                ctx.fillRect(e.x - bw / 2 - 1, e.y - e.r - 9, bw + 2, 5);
                ctx.fillStyle = '#300';
                ctx.fillRect(e.x - bw / 2, e.y - e.r - 8, bw, 3);
                ctx.fillStyle = e.boss ? '#f44' : '#4f4';
                ctx.fillRect(e.x - bw / 2, e.y - e.r - 8, bw * e.hp / e.maxHp, 3);
            }
        }
    },

    clear() { this.list = []; }
};
