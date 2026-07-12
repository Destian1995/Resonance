// ============ WEAPON DEFINITIONS & LOGIC ============
const WEAPON_DEFS = {
    sword: {
        name: 'Вихрь клинков', icon: '🗡', color: '#ccc',
        baseDmg: 12, baseCd: 1800, baseCount: 2, baseRadius: 50,
        type: 'orbit', desc: 'Клинки вращаются вокруг вас'
    },
    missile: {
        name: 'Маг. снаряды', icon: '✦', color: '#a5f',
        baseDmg: 10, baseCd: 1200, baseCount: 1, baseSpeed: 280,
        type: 'homing', desc: 'Самонаводящиеся снаряды'
    },
    arrow: {
        name: 'Стрелы', icon: '→', color: '#ff0',
        baseDmg: 15, baseCd: 800, baseCount: 1, baseSpeed: 400,
        type: 'directional', desc: 'Стреляют в направлении движения'
    },
    lightning: {
        name: 'Молния', icon: '⚡', color: '#4ef',
        baseDmg: 18, baseCd: 2500, baseCount: 1, chainRange: 120,
        type: 'chain', desc: 'Бьёт ближайшего, перескакивает на следующих'
    },
    firenova: {
        name: 'Огн. взрыв', icon: '💥', color: '#f60',
        baseDmg: 25, baseCd: 3500, baseCount: 1, baseRadius: 90,
        type: 'nova', desc: 'Периодический AoE взрыв вокруг вас'
    },
    frost: {
        name: 'Лед. щит', icon: '❄', color: '#8ef',
        baseDmg: 5, baseCd: 500, baseCount: 1, baseRadius: 60,
        type: 'aura', desc: 'Замедляет и наносит урон рядом'
    },
    poison: {
        name: 'Яд. облако', icon: '☁', color: '#4f4',
        baseDmg: 8, baseCd: 4000, baseCount: 1, baseRadius: 70, duration: 3000,
        type: 'zone', desc: 'Ставит ядовитую зону на земле'
    }
};

// Active weapon instance
function WeaponInst(key, level) {
    const def = WEAPON_DEFS[key];
    return {
        key, level: level || 1, timer: 0,
        // Computed stats (recalculated on level change)
        dmg: 0, cd: 0, count: 0, radius: 0, speed: 0,
        // Orbit state
        orbitAngle: 0,
        // Zone state
        zones: [],
        recalc() {
            const l = this.level;
            this.dmg = Math.floor(def.baseDmg * (1 + (l-1) * 0.3));
            this.cd = Math.max(200, def.baseCd * Math.pow(0.9, l-1));
            this.count = (def.baseCount || 1) + Math.floor((l-1) / 2);
            this.radius = (def.baseRadius || 0) * (1 + (l-1) * 0.12);
            this.speed = (def.baseSpeed || 0) * (1 + (l-1) * 0.1);
        }
    };
}

// Projectiles pool
const Projs = {
    list: [],
    add(x,y,vx,vy,dmg,color,r,life,homing,pierce) {
        this.list.push({x,y,vx,vy,dmg,color,r:r||3,life:life||2,homing:homing||false,pierce:pierce||0,hit:new Set()});
    },
    update(dt, enemies) {
        for (let i=this.list.length-1;i>=0;i--) {
            const p=this.list[i];
            // Homing
            if (p.homing && enemies.length) {
                let best=null, bd=Infinity;
                for (const e of enemies) {
                    if (p.hit.has(e)) continue;
                    const d=U.dist(p,e);
                    if (d<bd) { bd=d; best=e; }
                }
                if (best) {
                    const a=U.angle(p,best);
                    const hs=350;
                    p.vx=U.lerp(p.vx, Math.cos(a)*hs, 6*dt);
                    p.vy=U.lerp(p.vy, Math.sin(a)*hs, 6*dt);
                }
            }
            p.x+=p.vx*dt; p.y+=p.vy*dt; p.life-=dt;
            // OOB or expired
            if (p.life<=0||p.x<0||p.x>CFG.WORLD_W||p.y<0||p.y>CFG.WORLD_H) {
                this.list.splice(i,1); continue;
            }
            // Trail
            if (p.homing) FX.trail(p.x,p.y,p.color,2);
            // Hit enemies
            for (const e of enemies) {
                if (!e.alive || p.hit.has(e)) continue;
                if (U.dist2(p.x,p.y,e.x,e.y) < p.r + e.r) {
                    e.hp -= p.dmg;
                    p.hit.add(e);
                    FX.spawn(e.x,e.y,p.color,4,50);
                    FX.dmgNum(e.x,e.y,p.dmg,p.color);
                    Snd.play('hit',0.1);
                    if (p.pierce>0) { p.pierce--; }
                    else { this.list.splice(i,1); break; }
                }
            }
        }
    },
    draw(ctx) {
        for (const p of this.list) {
            ctx.fillStyle=p.color;
            ctx.beginPath(); ctx.arc(p.x|0,p.y|0,p.r,0,Math.PI*2); ctx.fill();
        }
    },
    clear() { this.list=[]; }
};

// Damage zones (poison clouds, etc.)
const Zones = {
    list: [],
    add(x,y,r,dmg,dur,color,tickRate) {
        this.list.push({x,y,r,dmg,dur,elapsed:0,color,tickRate:tickRate||500,tickTimer:0});
    },
    update(dt, enemies) {
        for (let i=this.list.length-1;i>=0;i--) {
            const z=this.list[i];
            z.elapsed+=dt*1000; z.tickTimer+=dt*1000;
            if (z.elapsed>=z.dur) { this.list.splice(i,1); continue; }
            if (z.tickTimer>=z.tickRate) {
                z.tickTimer=0;
                for (const e of enemies) {
                    if (e.alive && U.dist(z,e)<z.r+e.r) {
                        e.hp-=z.dmg; e.slow=0.5; e.slowTimer=600;
                        FX.spawn(e.x,e.y,z.color,2);
                    }
                }
            }
        }
    },
    draw(ctx) {
        for (const z of this.list) {
            const a=1-z.elapsed/z.dur;
            ctx.globalAlpha=a*0.25;
            ctx.fillStyle=z.color;
            ctx.beginPath(); ctx.arc(z.x,z.y,z.r,0,Math.PI*2); ctx.fill();
            ctx.globalAlpha=a*0.5;
            ctx.strokeStyle=z.color; ctx.lineWidth=2;
            ctx.beginPath(); ctx.arc(z.x,z.y,z.r,0,Math.PI*2); ctx.stroke();
            ctx.globalAlpha=1;
        }
    },
    clear() { this.list=[]; }
};

// Weapon update logic
const WeaponSys = {
    fire(w, player, enemies, dt) {
        w.timer -= dt * 1000;
        if (w.timer > 0) return;
        w.timer = w.cd;

        const def = WEAPON_DEFS[w.key];
        switch(def.type) {
            case 'orbit': this._orbit(w, player, enemies, dt); break;
            case 'homing': this._homing(w, player, enemies); break;
            case 'directional': this._directional(w, player); break;
            case 'chain': this._chain(w, player, enemies); break;
            case 'nova': this._nova(w, player, enemies); break;
            case 'aura': this._aura(w, player, enemies); break;
            case 'zone': this._zone(w, player); break;
        }
    },

    _orbit(w, player, enemies, dt) {
        // Orbit handles damage continuously, timer just controls rotation speed
        w.timer = 50; // tick fast
        w.orbitAngle += dt * (2 + w.level * 0.3);
        for (let i = 0; i < w.count; i++) {
            const a = w.orbitAngle + (i / w.count) * Math.PI * 2;
            const bx = player.x + Math.cos(a) * w.radius;
            const by = player.y + Math.sin(a) * w.radius;
            for (const e of enemies) {
                if (e.alive && U.dist2(bx, by, e.x, e.y) < 14 + e.r) {
                    if (!e._orbHit) e._orbHit = 0;
                    if (performance.now() - e._orbHit > 300) {
                        e._orbHit = performance.now();
                        e.hp -= w.dmg;
                        FX.spawn(e.x, e.y, '#ccc', 3, 40);
                        FX.dmgNum(e.x, e.y, w.dmg, '#ccc');
                    }
                }
            }
        }
    },

    _homing(w, player, enemies) {
        for (let i = 0; i < w.count; i++) {
            const a = Math.random() * Math.PI * 2;
            Projs.add(player.x, player.y, Math.cos(a)*100, Math.sin(a)*100,
                w.dmg, '#a5f', 4, 3, true, 0);
        }
    },

    _directional(w, player) {
        const a = player.facing;
        for (let i = 0; i < w.count; i++) {
            const spread = (i - (w.count-1)/2) * 0.15;
            Projs.add(player.x, player.y,
                Math.cos(a+spread)*w.speed, Math.sin(a+spread)*w.speed,
                w.dmg, '#ff0', 3, 1.5, false, Math.floor(w.level/3));
        }
    },

    _chain(w, player, enemies) {
        if (enemies.length === 0) return;
        // Find nearest
        let best = null, bd = Infinity;
        for (const e of enemies) {
            if (!e.alive) continue;
            const d = U.dist(player, e);
            if (d < bd) { bd = d; best = e; }
        }
        if (!best || bd > 300) return;

        const chains = w.count + 1;
        const chainRange = WEAPON_DEFS.lightning.chainRange + w.level * 10;
        let target = best;
        const hit = new Set();
        for (let c = 0; c < chains; c++) {
            if (!target || !target.alive) break;
            target.hp -= w.dmg;
            FX.spawn(target.x, target.y, '#4ef', 4, 80);
            hit.add(target);
            // Find next
            let next = null, nd = Infinity;
            for (const e of enemies) {
                if (!e.alive || hit.has(e)) continue;
                const d = U.dist(target, e);
                if (d < chainRange && d < nd) { nd = d; next = e; }
            }
            if (next && target) {
                // Draw chain line via particles
                FX.spawn((target.x+next.x)/2, (target.y+next.y)/2, '#4ef', 3, 30, 0.2);
            }
            target = next;
        }
        Snd.play('hit', 0.15);
    },

    _nova(w, player, enemies) {
        FX.spawn(player.x, player.y, '#f60', 12, w.radius*1.5, 0.4);
        Cam.addShake(4);
        Snd.play('boom', 0.2);
        for (const e of enemies) {
            if (e.alive && U.dist(player, e) < w.radius + e.r) {
                e.hp -= w.dmg;
                FX.spawn(e.x, e.y, '#f60', 4, 50);
                FX.dmgNum(e.x, e.y, w.dmg, '#f60');
            }
        }
    },

    _aura(w, player, enemies) {
        w.timer = 200; // tick often
        for (const e of enemies) {
            if (e.alive && U.dist(player, e) < w.radius + e.r) {
                e.hp -= w.dmg;
                e.slow = 0.4;
                e.slowTimer = 800;
            }
        }
    },

    _zone(w, player) {
        Zones.add(player.x, player.y, w.radius, w.dmg,
            WEAPON_DEFS.poison.duration + w.level * 500, '#4f4', 400);
    },

    // Draw orbit blades
    drawOrbits(ctx, player, weapons) {
        for (const w of weapons) {
            if (WEAPON_DEFS[w.key].type !== 'orbit') continue;
            for (let i = 0; i < w.count; i++) {
                const a = w.orbitAngle + (i / w.count) * Math.PI * 2;
                const bx = player.x + Math.cos(a) * w.radius;
                const by = player.y + Math.sin(a) * w.radius;
                ctx.save();
                ctx.translate(bx|0, by|0);
                ctx.rotate(a + Math.PI/4);
                ctx.fillStyle = '#ddd';
                ctx.fillRect(-6, -2, 12, 4);
                ctx.fillStyle = '#aaa';
                ctx.fillRect(-6, -2, 4, 4);
                ctx.restore();
            }
        }
    },

    // Draw aura
    drawAuras(ctx, player, weapons) {
        for (const w of weapons) {
            const def = WEAPON_DEFS[w.key];
            if (def.type === 'aura') {
                ctx.globalAlpha = 0.12;
                ctx.fillStyle = def.color;
                ctx.beginPath(); ctx.arc(player.x, player.y, w.radius, 0, Math.PI*2); ctx.fill();
                ctx.globalAlpha = 0.3;
                ctx.strokeStyle = def.color; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(player.x, player.y, w.radius, 0, Math.PI*2); ctx.stroke();
                ctx.globalAlpha = 1;
            }
            if (def.type === 'nova') {
                ctx.globalAlpha = 0.06;
                ctx.fillStyle = def.color;
                ctx.beginPath(); ctx.arc(player.x, player.y, w.radius, 0, Math.PI*2); ctx.fill();
                ctx.globalAlpha = 1;
            }
        }
    }
};
