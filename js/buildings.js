// ============ BUILDINGS — detailed tower sprites ============
const TOWER_DEFS = {
    arrow:     {name:'Стрелковая', cost:25, color:'#ca4',color2:'#a82', dmg:8,  range:3, cd:800,  projColor:'#ff0', projSpd:350, icon:'🏹'},
    fire:      {name:'Огненная',   cost:40, color:'#f60',color2:'#c40', dmg:15, range:2.5,cd:1500,projColor:'#f80', projSpd:250, icon:'🔥', aoe:35},
    ice:       {name:'Ледяная',    cost:35, color:'#4cf',color2:'#2a8', dmg:6,  range:3, cd:1000, projColor:'#8ef', projSpd:300, icon:'❄', slow:true},
    lightning: {name:'Молниевая',  cost:50, color:'#4ef',color2:'#28c', dmg:12, range:3.5,cd:2000,projColor:'#4ef', projSpd:0,   icon:'⚡', chain:3},
    cannon:    {name:'Пушка',      cost:60, color:'#888',color2:'#555', dmg:30, range:4, cd:3000, projColor:'#aaa', projSpd:200, icon:'💣', aoe:55},
    wall:      {name:'Стена',      cost:10, color:'#666',color2:'#444', hp:100, icon:'🧱'},
    trap:      {name:'Ловушка',    cost:20, color:'#a44',color2:'#822', dmg:25, icon:'⚠', slow:true},
    heal:      {name:'Лечебная',   cost:45, color:'#4f4',color2:'#2a2', healRange:2.5, healAmt:3, cd:1200, icon:'💚'}
};

const Buildings = {
    list:[], projs:[],

    place(q,r,type){
        if(!World.canBuild(q,r))return false;
        const def=TOWER_DEFS[type]; if(!def)return false;
        const p=U.hexToPixel(q,r);
        const b={q,r,x:p.x,y:p.y,type,level:1,hp:def.hp||999,maxHp:def.hp||999,timer:0,def,triggered:false,fireAnim:0};
        this.list.push(b); World.getCell(q,r).building=b; Snd.play('build');
        FX.sparkle(p.x,p.y,'#fff',6,30);
        return true;
    },

    sell(q,r){
        const idx=this.list.findIndex(b=>b.q===q&&b.r===r);
        if(idx===-1)return 0;
        const b=this.list[idx], refund=Math.floor(b.def.cost*.6);
        this.list.splice(idx,1);
        const cell=World.getCell(q,r);if(cell)cell.building=null;
        Snd.play('sell'); return refund;
    },

    upgrade(q,r){
        const b=this.list.find(b=>b.q===q&&b.r===r);
        if(!b||b.level>=3)return false;
        const cost=Math.floor(b.def.cost*.7);
        if(Game.gold<cost)return false;
        Game.gold-=cost; b.level++;
        b.maxHp=Math.floor((b.def.hp||999)*b.level);b.hp=b.maxHp;
        FX.sparkle(b.x,b.y,'#ff0',8,40);Snd.play('lvl',.15);
        return true;
    },

    update(dt,enemies){
        for(const b of this.list){
            if(b.hp<=0)continue;
            b.timer-=dt*1000;
            const def=b.def;

            // Heal station
            if(def.healRange&&b.timer<=0){
                b.timer=def.cd/b.level;
                const hd=U.hexDist(b.q,b.r,0,0);
                if(hd<=def.healRange){
                    Game.coreHp=Math.min(CFG.CORE_HP,Game.coreHp+def.healAmt*b.level);
                    FX.sparkle(World.centerX,World.centerY,'#4f4',3,20);
                }
                // Heal nearby buildings
                for(const ob of this.list){
                    if(ob===b||ob.hp>=ob.maxHp)continue;
                    if(U.hexDist(b.q,b.r,ob.q,ob.r)<=def.healRange){
                        ob.hp=Math.min(ob.maxHp,ob.hp+def.healAmt*b.level);
                    }
                }
                continue;
            }

            // Trap
            if(def.icon==='⚠'&&!b.triggered){
                for(const e of enemies){
                    if(!e.alive)continue;
                    if(U.dist(b,e)<CFG.HEX_R*.8){
                        e.hp-=def.dmg*b.level;
                        if(def.slow){e.slow=.3;e.slowTimer=2500;}
                        FX.ring(b.x,b.y,'#f44',35,.3);FX.sparkle(b.x,b.y,'#f44',8,50);
                        FX.num(e.x,e.y,def.dmg*b.level,'#f44');
                        b.triggered=true;b.hp=0;Snd.play('boom',.15);break;
                    }
                }
                continue;
            }

            // Tower shoot
            if(!def.dmg||def.hp||b.timer>0)continue;
            const range=(def.range||3)*CFG.HEX_R*1.8*(.9+b.level*.1);
            let target=null,bd=Infinity;
            for(const e of enemies){if(!e.alive)continue;const d=U.dist(b,e);if(d<range&&d<bd){bd=d;target=e;}}
            if(!target)continue;
            b.timer=def.cd/(.8+b.level*.2);
            b.fireAnim=1;

            if(def.chain){
                let cur=target;const hit=new Set();
                for(let c=0;c<def.chain+b.level;c++){
                    if(!cur||!cur.alive)break;
                    cur.hp-=def.dmg*b.level;
                    FX.sparkle(cur.x,cur.y,'#4ef',5,50);FX.num(cur.x,cur.y,def.dmg*b.level,'#4ef');
                    hit.add(cur);
                    let next=null,nd=Infinity;
                    for(const e of enemies){if(!e.alive||hit.has(e))continue;const d=U.dist(cur,e);if(d<110&&d<nd){nd=d;next=e;}}
                    if(next)FX.bolt(cur.x,cur.y,next.x,next.y,'#4ef',.25);
                    cur=next;
                }
                FX.bolt(b.x,b.y-8,target.x,target.y,'#8cf',.2);
                Snd.play('hit',.12);
            } else {
                const a=U.angle(b,target);
                this.projs.push({x:b.x,y:b.y-6,vx:Math.cos(a)*def.projSpd,vy:Math.sin(a)*def.projSpd,
                    dmg:def.dmg*b.level,color:def.projColor,r:def.aoe?6:3,life:2,aoe:def.aoe||0,slow:def.slow||false});
            }
        }

        // Remove dead
        for(let i=this.list.length-1;i>=0;i--){
            if(this.list[i].hp<=0){const b=this.list[i];const cell=World.getCell(b.q,b.r);if(cell)cell.building=null;
            FX.spawn(b.x,b.y,b.def.color,8,60);FX.ring(b.x,b.y,b.def.color,20,.3);this.list.splice(i,1);}
        }

        // Projectiles
        for(let i=this.projs.length-1;i>=0;i--){
            const p=this.projs[i];
            p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;
            if(p.life<=0){this.projs.splice(i,1);continue;}
            FX.trail(p.x,p.y,p.color,2);
            for(const e of enemies){
                if(!e.alive)continue;
                if(U.dist(p,e)<p.r+e.r){
                    if(p.aoe){
                        FX.ring(p.x,p.y,p.color,p.aoe,.35);FX.sparkle(p.x,p.y,p.color,10,70);Cam.addShake(4);Snd.play('boom',.15);
                        for(const e2 of enemies){if(e2.alive&&U.dist(p,e2)<p.aoe){e2.hp-=p.dmg;FX.num(e2.x,e2.y,p.dmg,p.color);}}
                    } else {
                        e.hp-=p.dmg;FX.sparkle(e.x,e.y,p.color,5,40);FX.num(e.x,e.y,p.dmg,p.color);
                        if(p.slow){e.slow=.35;e.slowTimer=1800;}
                    }
                    Snd.play('hit',.06);this.projs.splice(i,1);break;
                }
            }
        }

        // Decay fire anim
        for(const b of this.list) if(b.fireAnim>0) b.fireAnim=Math.max(0,b.fireAnim-.03);
    },

    draw(ctx,time) {
        const t=time||0;
        // Draw range circles for towers
        for(const b of this.list){
            if(b.hp<=0||!b.def.range)continue;
            ctx.globalAlpha=.04;ctx.fillStyle=b.def.color;
            const range=b.def.range*CFG.HEX_R*1.8*(.9+b.level*.1);
            ctx.beginPath();ctx.arc(b.x,b.y,range,0,Math.PI*2);ctx.fill();
            ctx.globalAlpha=1;
        }

        for(const b of this.list){
            if(b.hp<=0)continue;
            const def=b.def, hr=CFG.HEX_R*.55;

            if(def.hp&&def.icon==='🧱'){
                // ─── WALL ───
                // 3D brick wall
                ctx.fillStyle='#555';
                ctx.fillRect(b.x-hr,b.y-hr*.4,hr*2,hr*1.1);
                // Brick pattern
                ctx.fillStyle='#4a4a4a';
                for(let row=0;row<3;row++){
                    const ry=b.y-hr*.4+row*hr*.37;
                    const off=row%2?hr*.3:0;
                    for(let col=-1;col<3;col++){
                        ctx.strokeStyle='#3a3a3a';ctx.lineWidth=.5;
                        ctx.strokeRect(b.x-hr+col*hr*.7+off,ry,hr*.65,hr*.35);
                    }
                }
                // Top highlight
                ctx.fillStyle='#777';ctx.fillRect(b.x-hr,b.y-hr*.4,hr*2,2);
                // Damage cracks
                if(b.hp<b.maxHp*.5){
                    ctx.strokeStyle='#222';ctx.lineWidth=1;
                    ctx.beginPath();ctx.moveTo(b.x-3,b.y-2);ctx.lineTo(b.x+2,b.y+3);ctx.stroke();
                }
            } else if(def.icon==='⚠'){
                // ─── TRAP ───
                U.drawHex(ctx,b.x,b.y,hr*.7,'#2a1515','#a44');
                // Spikes
                ctx.fillStyle='#888';
                for(let i=0;i<4;i++){
                    const a=i*Math.PI/2+t;
                    ctx.fillRect(b.x+Math.cos(a)*5-1,b.y+Math.sin(a)*5-1,2,2);
                }
                ctx.fillStyle='#f44';ctx.font='bold 8px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
                ctx.fillText('!',b.x,b.y);
            } else if(def.healRange){
                // ─── HEAL STATION ───
                U.drawHex(ctx,b.x,b.y,hr,'#0a2a0a',def.color);
                // Pulsing cross
                const hPulse=.7+Math.sin(t*3)*.15;
                ctx.globalAlpha=hPulse;
                ctx.fillStyle='#4f4';
                ctx.fillRect(b.x-2,b.y-7,4,14);
                ctx.fillRect(b.x-7,b.y-2,14,4);
                ctx.globalAlpha=1;
                // Healing ring
                ctx.globalAlpha=.15;ctx.strokeStyle='#4f4';ctx.lineWidth=1;
                ctx.beginPath();ctx.arc(b.x,b.y,def.healRange*CFG.HEX_R*1.8,0,Math.PI*2);ctx.stroke();
                ctx.globalAlpha=1;
            } else {
                // ─── TOWER ───
                const recoil=b.fireAnim*3;

                // Base platform
                U.drawHex(ctx,b.x,b.y+2,hr,'#1a1a1a',def.color2);
                U.drawHex(ctx,b.x,b.y,hr*.85,'#222',def.color2);

                // Tower shaft
                ctx.fillStyle=def.color2;
                ctx.fillRect(b.x-5,b.y-12+recoil,10,16);
                ctx.fillStyle=def.color;
                ctx.fillRect(b.x-4,b.y-10+recoil,8,12);

                // Tower top (type-specific)
                if(b.type==='arrow'){
                    // Arrow tower: battlements
                    ctx.fillStyle=def.color;
                    ctx.fillRect(b.x-7,b.y-14+recoil,3,4);
                    ctx.fillRect(b.x-2,b.y-14+recoil,3,4);
                    ctx.fillRect(b.x+4,b.y-14+recoil,3,4);
                    // Bow
                    ctx.strokeStyle='#862';ctx.lineWidth=1.5;
                    ctx.beginPath();ctx.arc(b.x,b.y-8+recoil,6,-.8,.8);ctx.stroke();
                } else if(b.type==='fire'){
                    // Fire tower: flames on top
                    ctx.fillStyle=def.color;
                    ctx.beginPath();ctx.arc(b.x,b.y-12+recoil,6,0,Math.PI*2);ctx.fill();
                    // Animated flames
                    const fl=Math.sin(t*8+b.x)*.3;
                    ctx.fillStyle='#ff4';
                    ctx.beginPath();ctx.moveTo(b.x-4,b.y-12+recoil);ctx.lineTo(b.x,b.y-18+recoil+fl*3);ctx.lineTo(b.x+4,b.y-12+recoil);ctx.fill();
                    ctx.fillStyle='#f80';
                    ctx.beginPath();ctx.moveTo(b.x-2,b.y-13+recoil);ctx.lineTo(b.x,b.y-20+recoil+fl*4);ctx.lineTo(b.x+2,b.y-13+recoil);ctx.fill();
                } else if(b.type==='ice'){
                    // Ice tower: crystal top
                    ctx.fillStyle='#8cf';
                    ctx.beginPath();ctx.moveTo(b.x,b.y-18+recoil);ctx.lineTo(b.x+5,b.y-10+recoil);
                    ctx.lineTo(b.x-5,b.y-10+recoil);ctx.closePath();ctx.fill();
                    ctx.fillStyle='#aef';
                    ctx.beginPath();ctx.moveTo(b.x-1,b.y-16+recoil);ctx.lineTo(b.x+2,b.y-10+recoil);
                    ctx.lineTo(b.x-3,b.y-10+recoil);ctx.closePath();ctx.fill();
                    // Frost particles
                    if(Math.random()<.1) FX.trail(b.x+(Math.random()-.5)*10,b.y-12+recoil,'#8ef',1);
                } else if(b.type==='lightning'){
                    // Lightning tower: coil + spark
                    ctx.fillStyle=def.color;
                    ctx.beginPath();ctx.arc(b.x,b.y-12+recoil,5,0,Math.PI*2);ctx.fill();
                    // Tesla coil arcs
                    ctx.strokeStyle='#4ef';ctx.lineWidth=1;
                    const sp=Math.sin(t*12+b.x)*4;
                    ctx.beginPath();ctx.moveTo(b.x-4,b.y-14+recoil);ctx.lineTo(b.x+sp,b.y-20+recoil);ctx.stroke();
                    ctx.beginPath();ctx.moveTo(b.x+4,b.y-14+recoil);ctx.lineTo(b.x-sp,b.y-19+recoil);ctx.stroke();
                    // Spark
                    ctx.fillStyle='#fff';ctx.globalAlpha=.5+Math.sin(t*20)*.3;
                    ctx.beginPath();ctx.arc(b.x,b.y-18+recoil,2,0,Math.PI*2);ctx.fill();
                    ctx.globalAlpha=1;
                } else if(b.type==='cannon'){
                    // Cannon: barrel
                    ctx.fillStyle='#666';
                    ctx.fillRect(b.x-6,b.y-14+recoil,12,6);
                    ctx.fillStyle='#555';
                    ctx.beginPath();ctx.arc(b.x,b.y-14+recoil,6,Math.PI,0);ctx.fill();
                    // Barrel opening
                    ctx.fillStyle='#333';
                    ctx.beginPath();ctx.arc(b.x,b.y-8+recoil,4,0,Math.PI*2);ctx.fill();
                    ctx.fillStyle='#222';
                    ctx.beginPath();ctx.arc(b.x,b.y-8+recoil,2.5,0,Math.PI*2);ctx.fill();
                }

                // Level stars
                if(b.level>1){
                    ctx.fillStyle='#ff0';
                    for(let s=0;s<b.level;s++){
                        const sx=b.x-4+s*5, sy=b.y+hr-.5;
                        ctx.beginPath();
                        for(let p=0;p<5;p++){
                            const a=-Math.PI/2+p*Math.PI*2/5;
                            const r2=p%2?1.5:3;
                            ctx[p?'lineTo':'moveTo'](sx+Math.cos(a)*r2,sy+Math.sin(a)*r2);
                        }
                        ctx.closePath();ctx.fill();
                    }
                }
            }

            // HP bar for walls
            if(def.hp&&b.hp<b.maxHp){
                const bw=hr*2,bh=3;
                ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillRect(b.x-bw/2-1,b.y-hr-.8-1,bw+2,bh+2);
                ctx.fillStyle='#300';ctx.fillRect(b.x-bw/2,b.y-hr-.8,bw,bh);
                ctx.fillStyle='#4f4';ctx.fillRect(b.x-bw/2,b.y-hr-.8,bw*(b.hp/b.maxHp),bh);
            }
        }

        // Projectiles with glow
        for(const p of this.projs){
            ctx.globalAlpha=.25;ctx.fillStyle=p.color;
            ctx.beginPath();ctx.arc(p.x,p.y,p.r*3,0,Math.PI*2);ctx.fill();
            ctx.globalAlpha=1;ctx.fillStyle='#fff';
            ctx.beginPath();ctx.arc(p.x|0,p.y|0,p.r*.5,0,Math.PI*2);ctx.fill();
            ctx.fillStyle=p.color;
            ctx.beginPath();ctx.arc(p.x|0,p.y|0,p.r,0,Math.PI*2);ctx.fill();
        }
        ctx.globalAlpha=1;
    },

    clear(){this.list=[];this.projs=[];}
};
