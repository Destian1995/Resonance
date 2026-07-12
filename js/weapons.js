// ============ WEAPONS — auto-fire + epic VFX ============
const WEAPON_DEFS = {
    sword:     { name:'Вихрь клинков', icon:'🗡', color:'#ccc', baseDmg:12, baseCd:1800, baseCount:2, baseRadius:50, type:'orbit', desc:'Клинки вращаются вокруг' },
    missile:   { name:'Маг. снаряды', icon:'✦', color:'#a5f', baseDmg:10, baseCd:1200, baseCount:1, baseSpeed:280, type:'homing', desc:'Самонаводящиеся снаряды' },
    arrow:     { name:'Стрелы',       icon:'→', color:'#ff0', baseDmg:15, baseCd:800,  baseCount:1, baseSpeed:400, type:'directional', desc:'Стреляют в ближайшего врага' },
    lightning: { name:'Молния',       icon:'⚡', color:'#4ef', baseDmg:18, baseCd:2500, baseCount:1, chainRange:120, type:'chain', desc:'Цепная молния между врагами' },
    firenova:  { name:'Огн. взрыв',   icon:'💥', color:'#f60', baseDmg:25, baseCd:3500, baseCount:1, baseRadius:90, type:'nova', desc:'Взрыв огня вокруг вас' },
    frost:     { name:'Лед. щит',     icon:'❄', color:'#8ef', baseDmg:5,  baseCd:500,  baseCount:1, baseRadius:60, type:'aura', desc:'Замедляет и морозит рядом' },
    poison:    { name:'Яд. облако',   icon:'☁', color:'#4f4', baseDmg:8,  baseCd:4000, baseCount:1, baseRadius:70, duration:3000, type:'zone', desc:'Ядовитая зона на земле' }
};

function WeaponInst(key, level) {
    const def = WEAPON_DEFS[key];
    return {
        key, level: level||1, timer: 0,
        dmg:0, cd:0, count:0, radius:0, speed:0,
        orbitAngle: 0, zones: [],
        recalc() {
            const l=this.level;
            this.dmg=Math.floor(def.baseDmg*(1+(l-1)*.3));
            this.cd=Math.max(150, def.baseCd*Math.pow(.9,l-1));
            this.count=(def.baseCount||1)+Math.floor((l-1)/2);
            this.radius=(def.baseRadius||0)*(1+(l-1)*.12);
            this.speed=(def.baseSpeed||0)*(1+(l-1)*.1);
        }
    };
}

const Projs = {
    list: [],
    add(x,y,vx,vy,dmg,color,r,life,homing,pierce) {
        this.list.push({x,y,vx,vy,dmg,color,r:r||3,life:life||2,homing:homing||false,pierce:pierce||0,hit:new Set()});
    },
    update(dt, enemies) {
        for (let i=this.list.length-1;i>=0;i--) {
            const p=this.list[i];
            if (p.homing && enemies.length) {
                let best=null,bd=Infinity;
                for(const e of enemies) { if(p.hit.has(e))continue; const d=U.dist(p,e); if(d<bd){bd=d;best=e;} }
                if(best) { const a=U.angle(p,best); p.vx=U.lerp(p.vx,Math.cos(a)*350,6*dt); p.vy=U.lerp(p.vy,Math.sin(a)*350,6*dt); }
            }
            p.x+=p.vx*dt; p.y+=p.vy*dt; p.life-=dt;
            if(p.life<=0||p.x<0||p.x>CFG.WORLD_W||p.y<0||p.y>CFG.WORLD_H){this.list.splice(i,1);continue;}
            // Trail
            if(p.homing) FX.trail(p.x,p.y,p.color,2);
            else if(Math.random()<.3) FX.trail(p.x,p.y,p.color,1.5);
            // Wall collision
            if(World.isBlocked(p.x,p.y)){FX.spawn(p.x,p.y,p.color,3,30);this.list.splice(i,1);continue;}
            // Hit enemies
            for(const e of enemies) {
                if(!e.alive||p.hit.has(e)) continue;
                if(U.dist2(p.x,p.y,e.x,e.y)<p.r+e.r) {
                    e.hp-=p.dmg; p.hit.add(e);
                    FX.sparkle(e.x,e.y,p.color,5,50);
                    FX.dmgNum(e.x,e.y,p.dmg,p.color);
                    Snd.play('hit',.1);
                    if(p.pierce>0){p.pierce--;} else{this.list.splice(i,1);break;}
                }
            }
        }
    },
    draw(ctx) {
        for(const p of this.list) {
            // Glow
            ctx.globalAlpha=.3; ctx.fillStyle=p.color;
            ctx.beginPath(); ctx.arc(p.x,p.y,p.r*2.5,0,Math.PI*2); ctx.fill();
            // Core
            ctx.globalAlpha=1; ctx.fillStyle='#fff';
            ctx.beginPath(); ctx.arc(p.x|0,p.y|0,p.r*.7,0,Math.PI*2); ctx.fill();
            ctx.fillStyle=p.color;
            ctx.beginPath(); ctx.arc(p.x|0,p.y|0,p.r,0,Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha=1;
    },
    clear() { this.list=[]; }
};

const Zones = {
    list: [],
    add(x,y,r,dmg,dur,color,tickRate) {
        this.list.push({x,y,r,dmg,dur,elapsed:0,color,tickRate:tickRate||500,tickTimer:0,angle:0});
    },
    update(dt, enemies) {
        for(let i=this.list.length-1;i>=0;i--) {
            const z=this.list[i];
            z.elapsed+=dt*1000; z.tickTimer+=dt*1000; z.angle+=dt*2;
            if(z.elapsed>=z.dur){this.list.splice(i,1);continue;}
            if(z.tickTimer>=z.tickRate) {
                z.tickTimer=0;
                for(const e of enemies) {
                    if(e.alive && U.dist(z,e)<z.r+e.r) {
                        e.hp-=z.dmg; e.slow=.5; e.slowTimer=600;
                        FX.spawn(e.x,e.y,z.color,2);
                    }
                }
            }
        }
    },
    draw(ctx) {
        for(const z of this.list) {
            const a=1-z.elapsed/z.dur;
            // Bubbling poison / effect
            ctx.globalAlpha=a*.2;
            ctx.fillStyle=z.color;
            ctx.beginPath(); ctx.arc(z.x,z.y,z.r,0,Math.PI*2); ctx.fill();
            // Rotating pattern
            ctx.globalAlpha=a*.4;
            ctx.strokeStyle=z.color; ctx.lineWidth=2;
            for(let i=0;i<3;i++) {
                const ang=z.angle+i*Math.PI*2/3;
                ctx.beginPath();
                ctx.arc(z.x,z.y,z.r*.7,ang,ang+1);
                ctx.stroke();
            }
            // Outer ring
            ctx.globalAlpha=a*.5;
            ctx.beginPath(); ctx.arc(z.x,z.y,z.r,0,Math.PI*2); ctx.stroke();
            ctx.globalAlpha=1;
        }
    },
    clear() { this.list=[]; }
};

const WeaponSys = {
    fire(w, player, enemies, dt) {
        w.timer-=dt*1000;
        if(w.timer>0) return;
        w.timer=w.cd;
        const def=WEAPON_DEFS[w.key];
        switch(def.type) {
            case 'orbit': this._orbit(w,player,enemies,dt); break;
            case 'homing': this._homing(w,player,enemies); break;
            case 'directional': this._directional(w,player,enemies); break;
            case 'chain': this._chain(w,player,enemies); break;
            case 'nova': this._nova(w,player,enemies); break;
            case 'aura': this._aura(w,player,enemies); break;
            case 'zone': this._zone(w,player); break;
        }
    },

    _orbit(w, player, enemies, dt) {
        w.timer=50;
        w.orbitAngle+=dt*(2.5+w.level*.3);
        for(let i=0;i<w.count;i++) {
            const a=w.orbitAngle+(i/w.count)*Math.PI*2;
            const bx=player.x+Math.cos(a)*w.radius;
            const by=player.y+Math.sin(a)*w.radius;
            FX.trail(bx,by,'#aaa',1.5);
            for(const e of enemies) {
                if(e.alive && U.dist2(bx,by,e.x,e.y)<16+e.r) {
                    if(!e._orbHit) e._orbHit=0;
                    if(performance.now()-e._orbHit>250) {
                        e._orbHit=performance.now();
                        e.hp-=w.dmg;
                        FX.sparkle(e.x,e.y,'#fff',4,40);
                        FX.dmgNum(e.x,e.y,w.dmg,'#ccc');
                    }
                }
            }
        }
    },

    _homing(w, player, enemies) {
        FX.sparkle(player.x,player.y,'#a5f',3,30);
        for(let i=0;i<w.count;i++) {
            const a=Math.random()*Math.PI*2;
            Projs.add(player.x,player.y,Math.cos(a)*80,Math.sin(a)*80,w.dmg,'#a5f',5,3.5,true,0);
        }
    },

    // Auto-aim at nearest enemy
    _directional(w, player, enemies) {
        let target=null, bd=Infinity;
        for(const e of enemies) { if(!e.alive)continue; const d=U.dist(player,e); if(d<bd&&d<500){bd=d;target=e;} }
        const a = target ? U.angle(player,target) : player.facing;
        for(let i=0;i<w.count;i++) {
            const spread=(i-(w.count-1)/2)*.12;
            Projs.add(player.x,player.y,Math.cos(a+spread)*w.speed,Math.sin(a+spread)*w.speed,
                w.dmg,'#ff0',3,1.5,false,Math.floor(w.level/3));
        }
    },

    _chain(w, player, enemies) {
        if(!enemies.length) return;
        let best=null,bd=Infinity;
        for(const e of enemies) { if(!e.alive)continue; const d=U.dist(player,e); if(d<bd){bd=d;best=e;} }
        if(!best||bd>350) return;

        const chains=w.count+2;
        const cRange=WEAPON_DEFS.lightning.chainRange+w.level*12;
        let target=best;
        const hit=new Set();
        for(let c=0;c<chains;c++) {
            if(!target||!target.alive) break;
            target.hp-=w.dmg;
            FX.sparkle(target.x,target.y,'#4ef',6,80);
            FX.dmgNum(target.x,target.y,w.dmg,'#4ef');
            hit.add(target);
            let next=null,nd=Infinity;
            for(const e of enemies) { if(!e.alive||hit.has(e))continue; const d=U.dist(target,e); if(d<cRange&&d<nd){nd=d;next=e;} }
            if(next) FX.bolt(target.x,target.y,next.x,next.y,'#4ef',.3);
            target=next;
        }
        // Initial bolt from player to first target
        FX.bolt(player.x,player.y,best.x,best.y,'#8cf',.2);
        Cam.addShake(3);
        Snd.play('hit',.2);
    },

    _nova(w, player, enemies) {
        // Epic explosion ring
        FX.ring(player.x,player.y,'#f60',w.radius,.5);
        FX.ring(player.x,player.y,'#ff0',w.radius*.6,.3);
        FX.sparkle(player.x,player.y,'#f80',15,w.radius*1.2);
        FX.spawn(player.x,player.y,'#f40',10,w.radius,.5);
        Cam.addShake(6);
        Snd.play('boom',.25);
        FX.flash('#f60',.12);
        for(const e of enemies) {
            if(e.alive && U.dist(player,e)<w.radius+e.r) {
                e.hp-=w.dmg;
                FX.sparkle(e.x,e.y,'#f60',5,60);
                FX.dmgNum(e.x,e.y,w.dmg,'#f60');
                // Knockback
                const a=U.angle(player,e);
                e.x+=Math.cos(a)*15; e.y+=Math.sin(a)*15;
            }
        }
    },

    _aura(w, player, enemies) {
        w.timer=180;
        for(const e of enemies) {
            if(e.alive && U.dist(player,e)<w.radius+e.r) {
                e.hp-=w.dmg; e.slow=.35; e.slowTimer=900;
                if(Math.random()<.15) FX.trail(e.x,e.y,'#8ef',2);
            }
        }
    },

    _zone(w, player) {
        Zones.add(player.x,player.y,w.radius,w.dmg, WEAPON_DEFS.poison.duration+w.level*500,'#4f4',350);
        FX.spawn(player.x,player.y,'#4f4',6,40);
    },

    drawOrbits(ctx, player, weapons) {
        for(const w of weapons) {
            if(WEAPON_DEFS[w.key].type!=='orbit') continue;
            for(let i=0;i<w.count;i++) {
                const a=w.orbitAngle+(i/w.count)*Math.PI*2;
                const bx=player.x+Math.cos(a)*w.radius;
                const by=player.y+Math.sin(a)*w.radius;
                ctx.save(); ctx.translate(bx|0,by|0); ctx.rotate(a+Math.PI/4);
                // Blade glow
                ctx.globalAlpha=.2; ctx.fillStyle='#fff';
                ctx.fillRect(-8,-4,16,8);
                ctx.globalAlpha=1;
                // Blade
                ctx.fillStyle='#eee'; ctx.fillRect(-7,-2,14,4);
                ctx.fillStyle='#ccc'; ctx.fillRect(-7,-2,5,4);
                // Edge shine
                ctx.fillStyle='#fff'; ctx.fillRect(5,-1,2,2);
                ctx.restore();
            }
            // Orbit ring hint
            ctx.globalAlpha=.06; ctx.strokeStyle='#aaa'; ctx.lineWidth=1;
            ctx.beginPath(); ctx.arc(player.x,player.y,w.radius,0,Math.PI*2); ctx.stroke();
            ctx.globalAlpha=1;
        }
    },

    drawAuras(ctx, player, weapons) {
        for(const w of weapons) {
            const def=WEAPON_DEFS[w.key];
            if(def.type==='aura') {
                // Frost aura with rotating ice crystals
                const t=performance.now()/1000;
                ctx.globalAlpha=.08; ctx.fillStyle=def.color;
                ctx.beginPath(); ctx.arc(player.x,player.y,w.radius,0,Math.PI*2); ctx.fill();
                ctx.globalAlpha=.25; ctx.strokeStyle=def.color; ctx.lineWidth=2;
                ctx.beginPath(); ctx.arc(player.x,player.y,w.radius,t%Math.PI*2,t%Math.PI*2+Math.PI*1.5); ctx.stroke();
                // Inner ring
                ctx.globalAlpha=.15;
                ctx.beginPath(); ctx.arc(player.x,player.y,w.radius*.6,0,Math.PI*2); ctx.stroke();
                ctx.globalAlpha=1;
            }
            if(def.type==='nova') {
                // Subtle fire charge indicator
                const cd=w.timer/w.cd;
                if(cd<.3) {
                    ctx.globalAlpha=(.3-cd)*0.3;
                    ctx.fillStyle='#f60';
                    ctx.beginPath(); ctx.arc(player.x,player.y,w.radius*(1-cd),0,Math.PI*2); ctx.fill();
                    ctx.globalAlpha=1;
                }
            }
        }
    }
};
