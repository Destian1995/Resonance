// ============ ENEMIES — pixel art, no hero ============
const ENEMY_TYPES = [
    {name:'Гоблин',  color:'#5a5',color2:'#384', r:7,  hpM:1,  spdM:1.2,dmgM:.8, xp:2,draw:'goblin'},
    {name:'Скелет',  color:'#cc9',color2:'#aa7', r:7,  hpM:.8, spdM:1.4,dmgM:.7, xp:2,draw:'skeleton'},
    {name:'Мышь',    color:'#a6a',color2:'#848', r:5,  hpM:.5, spdM:2.2,dmgM:.4, xp:1,draw:'bat'},
    {name:'Огр',     color:'#a86',color2:'#864', r:11, hpM:3,  spdM:.6, dmgM:2,  xp:5,draw:'ogre'},
    {name:'Призрак', color:'#aaf',color2:'#88c', r:7,  hpM:1,  spdM:1.1,dmgM:1,  xp:3,draw:'ghost'},
    {name:'Подрывн.',color:'#f84',color2:'#c62', r:8,  hpM:1.2,spdM:1,  dmgM:3,  xp:4,draw:'bomber',bomber:true},
    {name:'Лекарь',  color:'#4f4',color2:'#2a2', r:7,  hpM:1,  spdM:.9, dmgM:.5, xp:4,draw:'healer',healer:true}
];
const BOSS_TYPES = [
    {name:'Дракон',   color:'#f44',color2:'#a22',r:24,hpM:20,spdM:.5,dmgM:4,xp:40,draw:'dragon'},
    {name:'Голем',    color:'#888',color2:'#555',r:28,hpM:35,spdM:.3,dmgM:3,xp:50,draw:'golem'},
    {name:'Некромант',color:'#a4f',color2:'#82c',r:20,hpM:15,spdM:.6,dmgM:2,xp:45,draw:'necro',summoner:true}
];

const Enemies = {
    list:[],

    spawnWave(wn){
        const count=Math.min(5+wn*3, 60); // cap at 60 per wave
        const scale=1+(wn-1)*.12;
        const avail=wn<3?ENEMY_TYPES.slice(0,2):wn<6?ENEMY_TYPES.slice(0,4):ENEMY_TYPES;
        for(let i=0;i<count;i++) this._spawn(U.pick(avail),scale,i*.25);
    },
    spawnBoss(wn){
        const type=BOSS_TYPES[Math.floor((wn/CFG.BOSS_EVERY-1)%BOSS_TYPES.length)];
        this._spawn(type,1+(wn-1)*.08,0,true);Snd.play('boss');
    },
    _spawn(type,scale,delay,boss){
        const ring=CFG.GRID_RINGS+1;
        const a=Math.random()*Math.PI*2;
        const q=Math.round(Math.cos(a)*ring),r=Math.round(Math.sin(a)*ring);
        const p=U.hexToPixel(q,r);
        this.list.push({x:p.x,y:p.y,r:type.r,
            hp:Math.floor(CFG.ENEMY_BASE_HP*type.hpM*scale),maxHp:Math.floor(CFG.ENEMY_BASE_HP*type.hpM*scale),
            speed:CFG.ENEMY_BASE_SPD*type.spdM,dmg:Math.floor(CFG.ENEMY_BASE_DMG*type.dmgM*scale),
            xp:type.xp,color:type.color,color2:type.color2,name:type.name,drawType:type.draw,
            alive:true,slow:1,slowTimer:0,boss:!!boss,bomber:!!type.bomber,healer:!!type.healer,
            summoner:!!type.summoner,summonTimer:0,spawnDelay:delay||0,anim:Math.random()*10,
            burning:0,flipX:1
        });
    },

    update(dt){
        const core={x:World.centerX,y:World.centerY};
        for(let i=this.list.length-1;i>=0;i--){
            const e=this.list[i]; e.anim+=dt;
            if(e.spawnDelay>0){e.spawnDelay-=dt;continue;}

            // Burning DoT
            if(e.burning>0){e.burning-=dt*1000;e.hp-=8*dt;if(Math.random()<.1)FX.trail(e.x,e.y,'#f60',2);}

            if(e.hp<=0){
                e.alive=false;
                FX.spawn(e.x,e.y,e.color,e.boss?18:7,e.boss?110:65);
                if(e.boss){FX.doFlash('#ff0',.35);Cam.addShake(10);FX.ring(e.x,e.y,'#ff0',90,.5);}
                FX.num(e.x,e.y,`+${e.xp}`,'#ff0',e.boss);
                Snd.play(e.boss?'boom':'hit',.1);
                const killGold=CFG.GOLD_PER_KILL+(e.boss?30:0);
                Game.gold+=killGold;Game.stats.goldEarned+=killGold;Game.kills++;
                this.list.splice(i,1);continue;
            }

            if(e.slowTimer>0){e.slowTimer-=dt*1000;if(e.slowTimer<=0)e.slow=1;}

            // Healer
            if(e.healer){for(const o of this.list){if(o!==e&&o.alive&&o.hp<o.maxHp&&U.dist(e,o)<55){o.hp=Math.min(o.maxHp,o.hp+4*dt);if(Math.random()<.03)FX.sparkle(o.x,o.y,'#4f4',2,12);}}}
            // Summoner (max 150 enemies total to prevent freeze)
            if(e.summoner&&this.list.length<150){e.summonTimer+=dt*1000;if(e.summonTimer>5000){e.summonTimer=0;for(let s=0;s<2;s++){this._spawn(ENEMY_TYPES[0],1,0);const l=this.list[this.list.length-1];l.x=e.x+(Math.random()-.5)*40;l.y=e.y+(Math.random()-.5)*40;}FX.ring(e.x,e.y,'#a4f',40,.3);}}

            // Move to core
            const a=U.angle(e,core);
            const spd=e.speed*e.slow*dt;
            e.x+=Math.cos(a)*spd;e.y+=Math.sin(a)*spd;
            e.flipX=Math.cos(a)>0?1:-1;

            // Damage core
            if(U.dist(e,core)<e.r+18){
                Game.coreHp-=e.dmg;
                Game.stats.enemiesReachedCore++;
                if(e.bomber){Game.coreHp-=e.dmg*2;FX.ring(e.x,e.y,'#f84',45,.3);Cam.addShake(5);}
                e.hp=0;FX.spawn(core.x,core.y,'#f00',5);FX.doFlash('#f00',.1);Cam.addShake(3);
            }

            // Bomber: damage buildings
            if(e.bomber){for(const b of Buildings.list){if(b.def.hp&&U.dist(e,b)<e.r+12){b.hp-=e.dmg;e.hp=0;FX.ring(e.x,e.y,'#f84',35,.3);Cam.addShake(4);break;}}}
        }
    },

    draw(ctx){
        for(const e of this.list){
            if(e.spawnDelay>0)continue;
            const bob=Math.sin(e.anim*3.5)*(e.boss?2:1);
            ctx.save();ctx.translate(e.x|0,(e.y+bob)|0);ctx.scale(e.flipX,1);

            // Shadow
            ctx.fillStyle='rgba(0,0,0,.3)';
            ctx.beginPath();ctx.ellipse(0,e.r+2,e.r*.7,3,0,0,Math.PI*2);ctx.fill();

            switch(e.drawType){
                case 'goblin':
                    ctx.fillStyle=e.color;ctx.fillRect(-5,-5,10,10);
                    ctx.fillStyle=e.color2;ctx.beginPath();ctx.arc(0,-7,4.5,0,Math.PI*2);ctx.fill();
                    ctx.fillStyle='#ff0';ctx.fillRect(-3,-8,2,2);ctx.fillRect(1,-8,2,2);
                    // Pointy ears
                    ctx.fillStyle=e.color;ctx.beginPath();ctx.moveTo(-5,-6);ctx.lineTo(-8,-10);ctx.lineTo(-3,-6);ctx.fill();
                    ctx.beginPath();ctx.moveTo(5,-6);ctx.lineTo(8,-10);ctx.lineTo(3,-6);ctx.fill();
                    // Little club
                    ctx.fillStyle='#864';ctx.fillRect(5,-3,6,2);
                    ctx.fillStyle='#543';ctx.fillRect(9,-5,4,6);
                    break;
                case 'skeleton':
                    ctx.fillStyle=e.color;ctx.fillRect(-4,-4,8,8);
                    ctx.fillStyle='#000';ctx.fillRect(-2,-2,1,4);ctx.fillRect(1,-2,1,4);
                    ctx.fillStyle=e.color;ctx.beginPath();ctx.arc(0,-7,4.5,0,Math.PI*2);ctx.fill();
                    ctx.fillStyle='#000';ctx.fillRect(-3,-8,2,2);ctx.fillRect(1,-8,2,2);ctx.fillRect(-1,-5,2,1);
                    // Sword
                    ctx.fillStyle='#aaa';ctx.fillRect(4,-2,7,1.5);
                    ctx.fillStyle='#ddd';ctx.beginPath();ctx.moveTo(11,-3);ctx.lineTo(13,-1);ctx.lineTo(11,1);ctx.fill();
                    break;
                case 'bat':
                    ctx.fillStyle=e.color;ctx.beginPath();ctx.arc(0,0,4,0,Math.PI*2);ctx.fill();
                    const wing=Math.sin(e.anim*10)*.7;
                    ctx.fillStyle=e.color2;
                    ctx.save();ctx.rotate(wing);
                    ctx.beginPath();ctx.moveTo(4,-2);ctx.lineTo(12,-7);ctx.lineTo(10,0);ctx.lineTo(4,1);ctx.fill();ctx.restore();
                    ctx.save();ctx.rotate(-wing);
                    ctx.beginPath();ctx.moveTo(-4,-2);ctx.lineTo(-12,-7);ctx.lineTo(-10,0);ctx.lineTo(-4,1);ctx.fill();ctx.restore();
                    ctx.fillStyle='#f00';ctx.fillRect(-2,-2,1.5,1.5);ctx.fillRect(1,-2,1.5,1.5);
                    break;
                case 'ogre':
                    ctx.fillStyle=e.color;ctx.fillRect(-8,-7,16,16);
                    ctx.fillStyle=e.color2;ctx.fillRect(-8,-7,16,3);ctx.fillRect(-8,6,16,3);
                    ctx.fillStyle=e.color;ctx.beginPath();ctx.arc(0,-10,6,0,Math.PI*2);ctx.fill();
                    ctx.fillStyle='#fff';ctx.fillRect(-4,-11,3,3);ctx.fillRect(1,-11,3,3);
                    ctx.fillStyle='#000';ctx.fillRect(-3,-10,1,1);ctx.fillRect(2,-10,1,1);
                    // Club
                    ctx.fillStyle='#643';ctx.fillRect(8,-5,3,14);
                    ctx.fillStyle='#543';ctx.fillRect(7,-6,5,5);
                    break;
                case 'ghost':
                    const wave=Math.sin(e.anim*3)*3;
                    ctx.globalAlpha=.65;ctx.fillStyle=e.color;
                    ctx.beginPath();ctx.arc(0,-2,7,Math.PI,0);
                    ctx.lineTo(7,5);ctx.quadraticCurveTo(5,8,3.5,5);ctx.quadraticCurveTo(2,8,0,5);
                    ctx.quadraticCurveTo(-2,8,-3.5,5);ctx.quadraticCurveTo(-5,8,-7,5);ctx.fill();
                    ctx.fillStyle='#000';ctx.beginPath();ctx.arc(-3,-3,2,0,Math.PI*2);ctx.fill();
                    ctx.beginPath();ctx.arc(3,-3,2,0,Math.PI*2);ctx.fill();
                    ctx.fillStyle='#fff';ctx.fillRect(-3.5,-3.5,1,1);ctx.fillRect(2.5,-3.5,1,1);
                    ctx.globalAlpha=1;
                    break;
                case 'bomber':
                    ctx.fillStyle=e.color;ctx.beginPath();ctx.arc(0,0,e.r,0,Math.PI*2);ctx.fill();
                    ctx.fillStyle=e.color2;ctx.fillRect(-e.r,-2,e.r*2,4);
                    // Fuse
                    ctx.strokeStyle='#864';ctx.lineWidth=1.5;
                    ctx.beginPath();ctx.moveTo(0,-e.r);ctx.quadraticCurveTo(4,-e.r-6,0,-e.r-8);ctx.stroke();
                    // Spark
                    ctx.fillStyle='#ff0';ctx.globalAlpha=.5+Math.sin(e.anim*12)*.4;
                    ctx.beginPath();ctx.arc(0,-e.r-8,3,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
                    // Skull
                    ctx.fillStyle='#000';ctx.fillRect(-2,-2,2,2);ctx.fillRect(1,-2,2,2);
                    break;
                case 'healer':
                    ctx.fillStyle=e.color;ctx.beginPath();ctx.arc(0,0,e.r,0,Math.PI*2);ctx.fill();
                    // Halo
                    ctx.strokeStyle='#8f8';ctx.lineWidth=1;ctx.globalAlpha=.5;
                    ctx.beginPath();ctx.ellipse(0,-e.r-2,e.r*.7,3,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
                    // Cross
                    ctx.fillStyle='#fff';ctx.fillRect(-1,-4,2,8);ctx.fillRect(-4,-1,8,2);
                    break;
                case 'dragon':
                    const r=e.r;
                    ctx.globalAlpha=.15;ctx.fillStyle='#f00';ctx.beginPath();ctx.arc(0,0,r+10,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
                    ctx.fillStyle=e.color;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();
                    // Wings
                    ctx.fillStyle=e.color2;
                    ctx.beginPath();ctx.moveTo(r-4,-5);ctx.lineTo(r+15,-15);ctx.lineTo(r+10,0);ctx.lineTo(r-4,3);ctx.fill();
                    ctx.beginPath();ctx.moveTo(-r+4,-5);ctx.lineTo(-r-15,-15);ctx.lineTo(-r-10,0);ctx.lineTo(-r+4,3);ctx.fill();
                    // Horns
                    ctx.fillStyle='#ff0';
                    ctx.beginPath();ctx.moveTo(-6,-r+3);ctx.lineTo(-10,-r-12);ctx.lineTo(-2,-r+3);ctx.fill();
                    ctx.beginPath();ctx.moveTo(6,-r+3);ctx.lineTo(10,-r-12);ctx.lineTo(2,-r+3);ctx.fill();
                    // Eyes
                    ctx.fillStyle='#f00';ctx.fillRect(-6,-5,4,4);ctx.fillRect(2,-5,4,4);
                    ctx.fillStyle='#fff';ctx.fillRect(-5,-4,2,2);ctx.fillRect(3,-4,2,2);
                    // Fire breath
                    if(Math.random()<.15) FX.trail(e.flipX*r,0,'#f60',3);
                    break;
                case 'golem':
                    ctx.fillStyle=e.color2;ctx.fillRect(-r*.7,-r*.8,r*1.4,r*1.8);
                    ctx.fillStyle=e.color;ctx.fillRect(-r*.6,-r*.7,r*1.2,r*1.5);
                    // Cracks
                    ctx.strokeStyle='#444';ctx.lineWidth=1;
                    ctx.beginPath();ctx.moveTo(-5,-8);ctx.lineTo(2,0);ctx.lineTo(-3,8);ctx.stroke();
                    // Eyes
                    ctx.fillStyle='#ff0';ctx.fillRect(-5,-5,3,4);ctx.fillRect(2,-5,3,4);
                    // Fists
                    ctx.fillStyle=e.color2;
                    ctx.fillRect(-r*.8,r*.2,6,8);ctx.fillRect(r*.8-6,r*.2,6,8);
                    break;
                case 'necro':
                    ctx.fillStyle=e.color2;
                    ctx.beginPath();ctx.moveTo(-r*.6,r*.7);ctx.lineTo(r*.6,r*.7);ctx.lineTo(0,-r*.2);ctx.fill();
                    ctx.fillStyle=e.color;ctx.fillRect(-r*.4,-r*.5,r*.8,r*.7);
                    ctx.fillStyle='#a88';ctx.beginPath();ctx.arc(0,-r*.6,r*.3,0,Math.PI*2);ctx.fill();
                    ctx.fillStyle=e.color2;ctx.beginPath();ctx.moveTo(-r*.4,-r*.5);ctx.lineTo(r*.4,-r*.5);ctx.lineTo(0,-r*1.1);ctx.fill();
                    ctx.fillStyle='#f0f';ctx.fillRect(-4,-r*.65,3,2);ctx.fillRect(1,-r*.65,3,2);
                    // Staff
                    ctx.fillStyle='#536';ctx.fillRect(r*.3,-1,r*.8,2);
                    ctx.fillStyle='#a0f';ctx.beginPath();ctx.arc(r*1.1,0,4,0,Math.PI*2);ctx.fill();
                    ctx.globalAlpha=.3;ctx.beginPath();ctx.arc(r*1.1,0,8,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
                    break;
            }
            ctx.restore();

            // HP bar
            if(e.hp<e.maxHp){
                const bw=e.r*2+6,bh=e.boss?5:3;
                ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillRect(e.x-bw/2-1,e.y-e.r-10,bw+2,bh+2);
                ctx.fillStyle='#300';ctx.fillRect(e.x-bw/2,e.y-e.r-9,bw,bh);
                ctx.fillStyle=e.boss?'#f44':'#4f4';ctx.fillRect(e.x-bw/2,e.y-e.r-9,bw*(e.hp/e.maxHp),bh);
            }
            // Slow indicator
            if(e.slow<1){
                ctx.fillStyle='#4cf';ctx.globalAlpha=.4;
                ctx.beginPath();ctx.arc(e.x,e.y,e.r+3,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
            }
            // Burn indicator
            if(e.burning>0){
                ctx.fillStyle='#f60';ctx.globalAlpha=.3;
                ctx.beginPath();ctx.arc(e.x,e.y,e.r+2,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
            }
        }
    },
    clear(){this.list=[];}
};
