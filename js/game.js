// ============ NAVAL COMMAND — Sub vs Surface ============
const G = {
    cv:null,ctx:null,lt:0,t:0,
    state:'menu', // menu,pick,play,gameover,win
    shipType:'surface', // 'surface' or 'sub'
    // Ship
    ship:{x:0,y:0,heading:0,speed:0,hp:100,maxHp:100,
          torpedoes:6,maxTorpedoes:6,torpReload:0,
          missiles:3,maxMissiles:3,missileReload:0,
          flares:2,sonarPing:0,sonarCd:0,
          // Sub-specific
          depth:0, // 0=surface, 1=periscope(30m), 2=deep(100m)
          depthTarget:0, o2:100, maxO2:100,
          // Nav
          targetHeading:0, rudder:0, enginePower:0 // 0-4
    },
    enemies:[],torps:[],missiles:[],enemyTorps:[],explosions:[],
    radarAngle:0, radarContacts:[],
    wave:0,killsNeeded:0,kills:0,
    commsLog:[],alertLevel:0,
    // Aiming
    aimAngle:0, aimActive:false,

    init(){
        this.cv=document.getElementById('game');
        this.ctx=this.cv.getContext('2d');
        this._resize();
        window.addEventListener('resize',()=>this._resize());
        Snd.init();
        this.lt=performance.now();
        this.cv.addEventListener('mousedown',e=>this._click(this._pos(e)));
        this.cv.addEventListener('mousemove',e=>{const p=this._pos(e);this.aimX=p.x;this.aimY=p.y;});
        this.cv.addEventListener('touchstart',e=>{e.preventDefault();this._click(this._tpos(e));},{passive:false});
        this.cv.addEventListener('touchmove',e=>{e.preventDefault();const p=this._tpos(e);this.aimX=p.x;this.aimY=p.y;},{passive:false});
        requestAnimationFrame(t=>this.loop(t));
    },
    _resize(){this.cv.width=window.innerWidth;this.cv.height=window.innerHeight;},
    _pos(e){const r=this.cv.getBoundingClientRect();return{x:(e.clientX-r.left)*(this.cv.width/r.width),y:(e.clientY-r.top)*(this.cv.height/r.height)};},
    _tpos(e){return this._pos(e.changedTouches[0]);},

    _click(p){
        if(this.state==='menu'){this.state='pick';return;}
        if(this.state==='pick'){
            const cw=this.cv.width,ch=this.cv.height;
            const mob=cw<600;
            const bw=mob?cw*.85:cw*.38, bh=mob?90:100, gap=mob?12:0;
            const x1=mob?(cw-bw)/2:cw*.06, x2=mob?(cw-bw)/2:cw*.54;
            const y1=ch*.25, y2=mob?y1+bh+gap:y1;
            if(p.x>=x1&&p.x<=x1+bw&&p.y>=y1&&p.y<=y1+bh){this.shipType='surface';this._startGame();return;}
            if(p.x>=x2&&p.x<=x2+bw&&p.y>=y2&&p.y<=y2+bh){this.shipType='sub';this._startGame();return;}
            return;
        }
        if(this.state==='gameover'||this.state==='win'){this.state='menu';return;}
        UI.handleClick(p.x,p.y);
    },

    _startGame(){
        Snd.resume();Snd.startAmbience();
        const s=this.ship;
        s.x=0;s.y=0;s.heading=0;s.targetHeading=0;s.speed=0;s.rudder=0;s.enginePower=0;
        s.torpedoes=this.shipType==='sub'?8:6;s.maxTorpedoes=s.torpedoes;
        s.missiles=this.shipType==='sub'?0:3;s.maxMissiles=s.missiles;
        s.flares=this.shipType==='sub'?0:2;
        s.hp=this.shipType==='sub'?70:100;s.maxHp=s.hp;
        s.torpReload=0;s.missileReload=0;s.sonarPing=0;s.sonarCd=0;
        s.depth=this.shipType==='sub'?1.5:0;
        s.depthTarget=this.shipType==='sub'?2:0;
        s.o2=100;s.maxO2=100;
        this.enemies=[];this.torps=[];this.missiles=[];this.enemyTorps=[];
        this.explosions=[];this.radarContacts=[];this.commsLog=[];
        this.wave=0;this.kills=0;this.alertLevel=0;this.t=0;this.aimAngle=0;
        this._nextWave();
        this.state='play';
        const shipName=this.shipType==='sub'?'подводная лодка':'корабль';
        this._msg('ШТАБ',`Ваш ${shipName} выходит на позицию. Уничтожьте противника!`);
    },

    _nextWave(){
        this.wave++;
        const count=2+this.wave;this.killsNeeded=count;this.kills=0;
        for(let i=0;i<count;i++){
            const a=Math.random()*Math.PI*2, d=600+Math.random()*500;
            const type=Math.random()<.25&&this.wave>2?'destroyer':'patrol';
            this.enemies.push({
                x:this.ship.x+Math.cos(a)*d,y:this.ship.y+Math.sin(a)*d,
                heading:Math.random()*Math.PI*2,
                speed:type==='destroyer'?5:3.5,
                hp:type==='destroyer'?60:30,maxHp:type==='destroyer'?60:30,
                type,fireTimer:4000+Math.random()*5000,
                detected:false,blipAge:99
            });
        }
        this._msg('ШТАБ',`Волна ${this.wave}: ${count} целей. Удачной охоты!`);
        this.alertLevel=1;Snd.play('comms');Snd.play('alert');
    },

    _msg(from,text){this.commsLog.unshift({from,text,time:this.t});if(this.commsLog.length>10)this.commsLog.pop();},

    loop(time){
        const dt=Math.min((time-this.lt)/1000,.05);this.lt=time;this.t+=dt;
        if(this.state==='play')this._update(dt);
        this._draw();
        requestAnimationFrame(t=>this.loop(t));
    },

    // ══════════ UPDATE ══════════
    _update(dt){
        const s=this.ship;
        // ── Navigation ──
        const speeds=[0,2.5,5,9,12];
        const targetSpd=speeds[s.enginePower]*(this.shipType==='sub'&&s.depth===2?.6:1);
        s.speed+=(targetSpd-s.speed)*dt*.8;

        // Smooth heading turn
        let dh=s.targetHeading-s.heading;
        while(dh>Math.PI)dh-=Math.PI*2;while(dh<-Math.PI)dh+=Math.PI*2;
        const turnRate=this.shipType==='sub'?.4:.7;
        s.heading+=dh*dt*turnRate;

        s.x+=Math.cos(s.heading)*s.speed*dt*8;
        s.y+=Math.sin(s.heading)*s.speed*dt*8;

        // Sub depth
        if(this.shipType==='sub'){
            s.depth+=(s.depthTarget-s.depth)*dt*.5;
            if(s.depth>.3) s.o2=Math.max(0,s.o2-dt*2);
            else s.o2=Math.min(s.maxO2,s.o2+dt*5);
            if(s.o2<=0){s.hp-=dt*10;this._msg('АВАРИЯ','Кислород на нуле! Всплывайте!');}
        }

        // Radar
        const prevRA=this.radarAngle;
        this.radarAngle+=dt*1.8;
        if(this.radarAngle>Math.PI*2){this.radarAngle-=Math.PI*2;Snd.play('radar');}

        // Sonar & reloads
        if(s.sonarPing>0)s.sonarPing-=dt;
        if(s.sonarCd>0)s.sonarCd-=dt;
        if(s.torpReload>0){s.torpReload-=dt;if(s.torpReload<=0&&s.torpedoes<s.maxTorpedoes){s.torpedoes++;s.torpReload=s.torpedoes<s.maxTorpedoes?8:0;}}
        if(s.missileReload>0){s.missileReload-=dt;if(s.missileReload<=0&&s.missiles<s.maxMissiles){s.missiles++;s.missileReload=s.missiles<s.maxMissiles?15:0;}}

        // ── Enemies ──
        for(const e of this.enemies){
            if(e.hp<=0)continue;
            e.x+=Math.cos(e.heading)*e.speed*dt*8;
            e.y+=Math.sin(e.heading)*e.speed*dt*8;
            const toP=Math.atan2(s.y-e.y,s.x-e.x);
            let da=toP-e.heading;while(da>Math.PI)da-=Math.PI*2;while(da<-Math.PI)da+=Math.PI*2;
            e.heading+=da*dt*.2;

            // Radar detect
            const relA=Math.atan2(e.y-s.y,e.x-s.x);
            let sw=this.radarAngle-relA;while(sw>Math.PI)sw-=Math.PI*2;while(sw<-Math.PI)sw+=Math.PI*2;
            // Sub at depth = harder to detect by enemy, but radar works same
            if(Math.abs(sw)<.15){
                e.detected=true;e.blipAge=0;
                const dist=Math.sqrt((e.x-s.x)**2+(e.y-s.y)**2);
                this.radarContacts.push({x:e.x,y:e.y,age:0,type:e.type,dist});
            }
            e.blipAge+=dt;

            // Enemy fires
            const dist=Math.sqrt((e.x-s.x)**2+(e.y-s.y)**2);
            e.fireTimer-=dt*1000;
            // Sub at deep = enemy can't detect
            const canDetect=this.shipType==='sub'?s.depth<1.5:true;
            if(e.fireTimer<=0&&dist<600&&canDetect){
                e.fireTimer=5000+Math.random()*4000;
                const a=Math.atan2(s.y-e.y,s.x-e.x)+(Math.random()-.5)*.2;
                this.enemyTorps.push({x:e.x,y:e.y,vx:Math.cos(a)*70,vy:Math.sin(a)*70,life:10});
                this.alertLevel=2;
                this._msg('СОНАР','Торпеда в воде!');Snd.play('alert');Snd.play('comms');
            }
        }

        // Radar contacts age
        for(let i=this.radarContacts.length-1;i>=0;i--){this.radarContacts[i].age+=dt;if(this.radarContacts[i].age>5)this.radarContacts.splice(i,1);}

        // ── Our torpedoes (aimed, hit chance) ──
        for(let i=this.torps.length-1;i>=0;i--){
            const t=this.torps[i];
            t.x+=t.vx*dt;t.y+=t.vy*dt;t.life-=dt;
            if(t.life<=0){this.torps.splice(i,1);continue;}
            for(const e of this.enemies){
                if(e.hp<=0)continue;
                const d=Math.sqrt((t.x-e.x)**2+(t.y-e.y)**2);
                if(d<30){
                    // Hit chance based on distance and angle
                    const hitChance=.65+t.accuracy*.2; // base 65-85%
                    if(Math.random()<hitChance){
                        e.hp-=35;
                        this.explosions.push({x:e.x,y:e.y,t:2,r:0,type:'hit'});
                        this._msg('ОРУЖИЕ','Торпеда попала в цель!');Snd.play('explosion');Snd.play('comms');
                        if(e.hp<=0){this.kills++;this.explosions.push({x:e.x,y:e.y,t:3,r:0,type:'sink'});this._msg('НАБЛЮДАТЕЛЬ','Цель потоплена!');}
                    } else {
                        this._msg('ОРУЖИЕ','Торпеда прошла мимо!');
                    }
                    t.life=0;break;
                }
            }
        }

        // ── Our missiles ──
        for(let i=this.missiles.length-1;i>=0;i--){
            const m=this.missiles[i];
            let best=null,bd=Infinity;
            for(const e of this.enemies){if(e.hp<=0)continue;const d=Math.sqrt((m.x-e.x)**2+(m.y-e.y)**2);if(d<bd){bd=d;best=e;}}
            if(best){const a=Math.atan2(best.y-m.y,best.x-m.x);m.vx+=(Math.cos(a)*180-m.vx)*dt*2;m.vy+=(Math.sin(a)*180-m.vy)*dt*2;}
            m.x+=m.vx*dt;m.y+=m.vy*dt;m.life-=dt;
            if(m.life<=0){this.missiles.splice(i,1);continue;}
            for(const e of this.enemies){
                if(e.hp<=0)continue;
                if(Math.sqrt((m.x-e.x)**2+(m.y-e.y)**2)<30){
                    const hitChance=.75;
                    if(Math.random()<hitChance){
                        e.hp-=50;
                        this.explosions.push({x:e.x,y:e.y,t:2,r:0,type:'hit'});
                        this._msg('ОРУЖИЕ','Ракета поразила цель!');Snd.play('explosion');Snd.play('comms');
                        if(e.hp<=0){this.kills++;this.explosions.push({x:e.x,y:e.y,t:3,r:0,type:'sink'});this._msg('НАБЛЮДАТЕЛЬ','Цель уничтожена!');}
                    } else { this._msg('ОРУЖИЕ','Ракета — промах!'); }
                    m.life=0;break;
                }
            }
        }

        // ── Enemy torpedoes ──
        for(let i=this.enemyTorps.length-1;i>=0;i--){
            const t=this.enemyTorps[i];
            t.x+=t.vx*dt;t.y+=t.vy*dt;t.life-=dt;
            if(t.life<=0){this.enemyTorps.splice(i,1);continue;}
            if(Math.sqrt((t.x-s.x)**2+(t.y-s.y)**2)<20){
                // Hit chance: sub deep=20%, sub periscope=50%, surface=70%
                let hitChance=.7;
                if(this.shipType==='sub'){hitChance=s.depth>1.5?.15:s.depth>.5?.4:.65;}
                if(Math.random()<hitChance){
                    s.hp-=20;
                    this.explosions.push({x:s.x,y:s.y,t:2,r:0,type:'hit'});
                    this._msg('ПОВРЕЖДЕНИЯ',`Попадание! Корпус: ${Math.max(0,s.hp)}%`);
                    Snd.play('explosion');Snd.play('foul');
                    if(s.hp<=0){this.state='gameover';Snd.play('alert');}
                } else {
                    this._msg('СОНАР','Торпеда прошла мимо!');
                }
                t.life=0;
            }
        }

        // Explosions
        for(let i=this.explosions.length-1;i>=0;i--){this.explosions[i].t-=dt;this.explosions[i].r+=dt*50;if(this.explosions[i].t<=0)this.explosions.splice(i,1);}
        this.enemies=this.enemies.filter(e=>e.hp>0);
        if(this.kills>=this.killsNeeded){
            if(this.wave>=5){this.state='win';Snd.play('win');this._msg('ШТАБ','Миссия выполнена!');}
            else this._nextWave();
        }
    },

    // ══════════ DRAW ══════════
    _draw(){
        const ctx=this.ctx,cw=this.cv.width,ch=this.cv.height;
        ctx.fillStyle='#080a10';ctx.fillRect(0,0,cw,ch);
        if(this.state==='menu'){this._drawMenu(ctx,cw,ch);return;}
        if(this.state==='pick'){this._drawPick(ctx,cw,ch);return;}
        if(this.state==='gameover'||this.state==='win'){this._drawEnd(ctx,cw,ch);return;}

        // ── VIEW (40% screen) ──
        const viewH=Math.floor(ch*.38);
        this._drawView(ctx,cw,viewH);
        this._drawFrame(ctx,cw,viewH);

        // ── CONSOLE (60% screen) ──
        const panelY=viewH+2;
        const panelH=ch-panelY;
        ctx.fillStyle='#0a0c14';ctx.fillRect(0,panelY,cw,panelH);
        ctx.fillStyle='#1a1e28';ctx.fillRect(0,panelY,cw,2);

        // Radar/Compass size — fits in panel
        const rSz=Math.max(50, Math.min(panelH*.42, cw*.12, 110));
        // Compass rose (top-left of panel)
        const compR=rSz*.35;
        this._drawCompass(ctx, 8+compR+2, panelY+8+compR, compR);
        // Radar (below compass)
        const radarR=rSz*.45;
        const radarCY=panelY+8+compR*2+14+radarR;
        this._drawRadar(ctx, 8+radarR+2, Math.min(radarCY, ch-radarR-14), radarR);
        // Controls
        UI.draw(ctx,cw,ch,panelY,(radarR+6)*2+8);
        // Comms
        this._drawComms(ctx,cw,ch,panelY);
    },

    // ── Day/Night ──
    _dayPhase(){return(this.t%120)/120;},
    _isNight(){const p=this._dayPhase();return p>.45&&p<.95;},
    _dayLerp(d,n){const p=this._dayPhase();let t;if(p<.2)t=0;else if(p<.3)t=(p-.2)/.1;else if(p<.45)t=0;else if(p<.55)t=(p-.45)/.1;else if(p<.85)t=1;else t=1-(p-.85)/.1;t=Math.max(0,Math.min(1,t));return d.map((v,i)=>Math.floor(v+(n[i]-v)*t));},

    _drawView(ctx,cw,vh){
        const night=this._isNight();
        const isSub=this.shipType==='sub';
        const depth=this.ship.depth;

        if(isSub&&depth>0.3){
            this._drawUnderwater(ctx,cw,vh,depth);
        } else {
            // Surface view (sky + ocean)
            const horizonY=vh*.55;
            const st=this._dayLerp([40,80,160],[8,12,30]);
            const sm=this._dayLerp([80,140,210],[14,20,50]);
            const sb=this._dayLerp([120,170,220],[25,35,60]);
            const skyG=ctx.createLinearGradient(0,0,0,horizonY);
            skyG.addColorStop(0,`rgb(${st})`);skyG.addColorStop(.5,`rgb(${sm})`);skyG.addColorStop(1,`rgb(${sb})`);
            ctx.fillStyle=skyG;ctx.fillRect(0,0,cw,horizonY);

            // Stars
            if(night){for(let i=0;i<30;i++){ctx.fillStyle=`rgba(255,255,255,${.4+Math.sin(this.t*2+i)*.2})`;ctx.fillRect((Math.sin(i*7.3+1)*.5+.5)*cw,(Math.sin(i*3.1+2)*.5+.5)*horizonY*.6,1.5,1.5);}}

            // Moon/Sun
            if(night){
                ctx.globalAlpha=.08;ctx.fillStyle='#ccf';ctx.beginPath();ctx.arc(cw*.75,horizonY*.25,22,0,Math.PI*2);ctx.fill();
                ctx.globalAlpha=.6;ctx.fillStyle='#ddf';ctx.beginPath();ctx.arc(cw*.75,horizonY*.25,7,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
            } else {
                ctx.globalAlpha=.12;ctx.fillStyle='#ff8';ctx.beginPath();ctx.arc(cw*.4,horizonY*.3,30,0,Math.PI*2);ctx.fill();
                ctx.globalAlpha=.5;ctx.fillStyle='#ffa';ctx.beginPath();ctx.arc(cw*.4,horizonY*.3,10,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
            }

            // Clouds
            ctx.globalAlpha=night?.03:.07;ctx.fillStyle='#fff';
            for(let c=0;c<4;c++){const cx2=(c*300+this.t*6)%(cw+200)-100;ctx.beginPath();ctx.ellipse(cx2,horizonY*.2+c*20,45,9,0,0,Math.PI*2);ctx.fill();}
            ctx.globalAlpha=1;

            // Ocean
            const ot=this._dayLerp([25,60,90],[8,16,30]);
            const ob=this._dayLerp([8,25,45],[4,8,16]);
            const seaG=ctx.createLinearGradient(0,horizonY,0,vh);
            seaG.addColorStop(0,`rgb(${ot})`);seaG.addColorStop(1,`rgb(${ob})`);
            ctx.fillStyle=seaG;ctx.fillRect(0,horizonY,cw,vh-horizonY);

            // Waves
            for(let w=0;w<10;w++){
                const wy=horizonY+4+w*((vh-horizonY)/10);
                const dep=w/10,amp=1+dep*3.5,spd=1+dep*.7,freq=.025-dep*.008;
                ctx.strokeStyle=`rgba(${night?'60,80,110':'80,140,180'},${.1*(1-dep*.3)})`;ctx.lineWidth=.7+dep;
                ctx.beginPath();
                for(let wx=0;wx<cw;wx+=3){const wv=Math.sin(wx*freq+this.t*spd+w*.7)*amp+Math.sin(wx*freq*1.6+this.t*spd*.5+w)*amp*.3;ctx[wx?'lineTo':'moveTo'](wx,wy+wv);}
                ctx.stroke();
            }

            // Horizon
            ctx.fillStyle='rgba(40,60,80,0.2)';ctx.fillRect(0,horizonY-1,cw,2);

            // Explosions on horizon
            for(const ex of this.explosions){
                const dx=ex.x-this.ship.x,dy=ex.y-this.ship.y,dist=Math.sqrt(dx*dx+dy*dy);
                if(dist>1000)continue;
                let relA=Math.atan2(dy,dx)-this.ship.heading;while(relA>Math.PI)relA-=Math.PI*2;while(relA<-Math.PI)relA+=Math.PI*2;
                if(Math.abs(relA)>1.2)continue;
                const scrX=cw/2+relA/(Math.PI/3)*cw*.4;
                const scrY=horizonY+dist*.005;
                const sz=Math.max(2,20-ex.r*.3);
                ctx.globalAlpha=ex.t/2;ctx.fillStyle=ex.type==='sink'?'#f80':'#ff4';
                ctx.beginPath();ctx.arc(scrX,scrY,sz,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
            }
        }

        // Compass at top
        ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(cw/2-55,3,110,20);
        ctx.strokeStyle='#4a6';ctx.lineWidth=1;ctx.strokeRect(cw/2-55,3,110,20);
        const hdg=((this.ship.heading*180/Math.PI)%360+360)%360;
        ctx.fillStyle='#4f8';ctx.font='bold 12px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
        const icon=night?'🌙':'☀';
        ctx.fillText(`${icon} ${hdg.toFixed(0)}°`,cw/2,13);
    },

    _drawUnderwater(ctx,cw,vh,depth){
        const t=this.t;
        // depth: 0.3-1 = periscope (shallow), 1-2 = deep
        const deepFactor=Math.min(1,(depth-.3)/1.7); // 0=shallow, 1=abyss

        // ── WATER GRADIENT — changes drastically with depth ──
        const grd=ctx.createLinearGradient(0,0,0,vh);
        if(deepFactor<.4){
            // SHALLOW — bright turquoise, sun visible
            grd.addColorStop(0,`rgb(${20-deepFactor*30|0},${100-deepFactor*60|0},${140-deepFactor*50|0})`);
            grd.addColorStop(.4,`rgb(${10-deepFactor*15|0},${70-deepFactor*40|0},${120-deepFactor*40|0})`);
            grd.addColorStop(1,`rgb(${5},${40-deepFactor*20|0},${80-deepFactor*30|0})`);
        } else if(deepFactor<.75){
            // MID — dark blue-green, murky
            grd.addColorStop(0,`rgb(${5},${30-deepFactor*15|0},${70-deepFactor*30|0})`);
            grd.addColorStop(.5,`rgb(${3},${18-deepFactor*10|0},${50-deepFactor*25|0})`);
            grd.addColorStop(1,`rgb(${2},${8},${25-deepFactor*10|0})`);
        } else {
            // DEEP ABYSS — nearly black with deep blue tint
            grd.addColorStop(0,`rgb(2,${12-deepFactor*8|0},${30-deepFactor*20|0})`);
            grd.addColorStop(.5,`rgb(1,${6},${18-deepFactor*10|0})`);
            grd.addColorStop(1,'rgb(1,2,8)');
        }
        ctx.fillStyle=grd;ctx.fillRect(0,0,cw,vh);

        // ── LIGHT RAYS from surface (fade with depth) ──
        const rayAlpha=Math.max(0,.12-deepFactor*.11);
        if(rayAlpha>.005){
            for(let i=0;i<8;i++){
                const rx=(Math.sin(i*2.1+t*.2)*.5+.5)*cw;
                const sway=Math.sin(t*.5+i*1.5)*15;
                const w=12+i*3;
                ctx.globalAlpha=rayAlpha*(1-i*.08);
                ctx.fillStyle=i%2?'#5ac8f0':'#40a0d0';
                ctx.beginPath();
                ctx.moveTo(rx-w,0);ctx.lineTo(rx+w,0);
                ctx.lineTo(rx+sway+w*.3,vh);ctx.lineTo(rx+sway-w*.3,vh);
                ctx.fill();
            }
            ctx.globalAlpha=1;
        }

        // ── SURFACE RIPPLE (visible when shallow) ──
        if(deepFactor<.3){
            ctx.globalAlpha=.06*(1-deepFactor*3);
            ctx.strokeStyle='#8cf';ctx.lineWidth=1;
            for(let w=0;w<5;w++){
                ctx.beginPath();
                for(let x=0;x<cw;x+=4){
                    const y=8+w*12+Math.sin(x*.03+t*2+w)*4+Math.sin(x*.05+t*1.3)*2;
                    ctx[x?'lineTo':'moveTo'](x,y);
                }
                ctx.stroke();
            }
            ctx.globalAlpha=1;
        }

        // ── FLOATING PARTICLES (plankton/sediment) ──
        const particleCount=15+deepFactor*20|0;
        for(let i=0;i<particleCount;i++){
            const px=((Math.sin(i*5.3+t*.15)*500+t*8+i*73)%cw+cw)%cw;
            const py=((Math.cos(i*3.7+t*.1)*300+t*3+i*47)%vh+vh)%vh;
            const sz=Math.max(.3, .5+Math.sin(i)*.4);
            ctx.globalAlpha=deepFactor<.5?.08:.04+deepFactor*.03;
            ctx.fillStyle=deepFactor<.5?'#8cf':'#446';
            ctx.beginPath();ctx.arc(px,py,sz,0,Math.PI*2);ctx.fill();
        }
        ctx.globalAlpha=1;

        // ── SEA LIFE (depth-dependent) ──
        if(deepFactor<.5){
            // SHALLOW: colorful fish schools
            for(let school=0;school<3;school++){
                const sx=((t*30+school*400)%((cw+200)))-100;
                const sy=vh*.2+school*vh*.25+Math.sin(t*.8+school)*20;
                const fishColor=['#ff8844','#44aaff','#ffdd44'][school];
                ctx.fillStyle=fishColor;
                for(let f=0;f<5+school*2;f++){
                    const fx=sx+Math.sin(f*2+t*3)*20+f*12;
                    const fy=sy+Math.cos(f*3+t*2.5)*10;
                    ctx.globalAlpha=.35;
                    // Fish body
                    ctx.beginPath();ctx.ellipse(fx,fy,5,2.5,Math.sin(t*4+f)*.2,0,Math.PI*2);ctx.fill();
                    // Tail
                    ctx.beginPath();ctx.moveTo(fx-5,fy);ctx.lineTo(fx-9,fy-3);ctx.lineTo(fx-9,fy+3);ctx.fill();
                }
                ctx.globalAlpha=1;
            }

            // Jellyfish (shallow)
            for(let j=0;j<2;j++){
                const jx=((t*10+j*500+200)%(cw+100))-50;
                const jy=vh*.3+j*vh*.3+Math.sin(t*.6+j*2)*30;
                ctx.globalAlpha=.2;
                // Bell
                ctx.fillStyle=j?'#ff88cc':'#88ccff';
                ctx.beginPath();ctx.ellipse(jx,jy,12,8+Math.sin(t*2+j)*2,0,Math.PI,0);ctx.fill();
                // Tentacles
                ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=1;
                for(let te=0;te<4;te++){
                    ctx.beginPath();ctx.moveTo(jx-6+te*4,jy);
                    ctx.quadraticCurveTo(jx-6+te*4+Math.sin(t*2+te)*5,jy+15,jx-6+te*4+Math.sin(t*1.5+te*2)*8,jy+25+Math.sin(t+te)*5);
                    ctx.stroke();
                }
                ctx.globalAlpha=1;
            }
        }

        if(deepFactor>=.3&&deepFactor<.75){
            // MID-DEPTH: darker fish, squid silhouettes
            for(let i=0;i<4;i++){
                const fx=((t*15+i*350)%(cw+200))-100;
                const fy=vh*.15+i*vh*.2+Math.sin(t*.5+i)*25;
                ctx.globalAlpha=.15;
                ctx.fillStyle='#446688';
                ctx.beginPath();ctx.ellipse(fx,fy,8,3,Math.sin(t*3+i)*.15,0,Math.PI*2);ctx.fill();
                ctx.beginPath();ctx.moveTo(fx-8,fy);ctx.lineTo(fx-13,fy-3);ctx.lineTo(fx-13,fy+3);ctx.fill();
                ctx.globalAlpha=1;
            }
            // Distant whale silhouette
            const wx=((t*5+100)%(cw+400))-200;
            const wy=vh*.6;
            ctx.globalAlpha=.06;ctx.fillStyle='#223344';
            ctx.beginPath();ctx.ellipse(wx,wy,60,18,0,0,Math.PI*2);ctx.fill();
            ctx.beginPath();ctx.ellipse(wx+55,wy-5,15,8,.3,0,Math.PI*2);ctx.fill(); // tail
            ctx.globalAlpha=1;
        }

        if(deepFactor>=.7){
            // DEEP ABYSS: bioluminescent creatures
            for(let i=0;i<8;i++){
                const bx=((Math.sin(i*4.3+t*.08)*300+t*5+i*170)%cw+cw)%cw;
                const by=((Math.cos(i*2.7+t*.06)*200+i*90)%vh+vh)%vh;
                const pulse=.2+Math.sin(t*3+i*2)*.15;
                // Glow
                ctx.globalAlpha=pulse*.6;
                const bioColor=['#00ffaa','#00aaff','#ff44aa','#aaff00','#ff8800'][i%5];
                ctx.fillStyle=bioColor;
                ctx.beginPath();ctx.arc(bx,by,6+Math.sin(t*2+i)*2,0,Math.PI*2);ctx.fill();
                ctx.globalAlpha=pulse;
                ctx.beginPath();ctx.arc(bx,by,2,0,Math.PI*2);ctx.fill();
            }
            ctx.globalAlpha=1;

            // Anglerfish silhouette (rare)
            if(Math.sin(t*.1)>.7){
                const ax=cw*.6+Math.sin(t*.3)*100, ay=vh*.7;
                ctx.globalAlpha=.08;ctx.fillStyle='#112';
                ctx.beginPath();ctx.ellipse(ax,ay,25,15,0,0,Math.PI*2);ctx.fill();
                // Lure light
                ctx.globalAlpha=.5+Math.sin(t*5)*.3;ctx.fillStyle='#4ff';
                ctx.beginPath();ctx.arc(ax+20,ay-18,4,0,Math.PI*2);ctx.fill();
                ctx.globalAlpha=.15;ctx.beginPath();ctx.arc(ax+20,ay-18,10,0,Math.PI*2);ctx.fill();
                // Stalk
                ctx.strokeStyle='#223';ctx.lineWidth=1;ctx.globalAlpha=.1;
                ctx.beginPath();ctx.moveTo(ax+10,ay-8);ctx.quadraticCurveTo(ax+18,ay-15,ax+20,ay-18);ctx.stroke();
                ctx.globalAlpha=1;
            }
        }

        // ── SEABED elements visible at mid+ depth ──
        if(deepFactor>.2){
            const bedY=vh-20+deepFactor*15;
            // Sandy/rocky bottom
            ctx.globalAlpha=.1+deepFactor*.05;
            ctx.fillStyle=deepFactor<.7?'#3a4a3a':'#1a1a22';
            ctx.fillRect(0,bedY,cw,vh-bedY+20);
            // Rocks
            for(let r=0;r<8;r++){
                const rx=r*(cw/8)+Math.sin(r*5)*20;
                ctx.fillStyle=deepFactor<.7?'#4a5a4a':'#1a2a2a';
                ctx.beginPath();ctx.ellipse(rx,bedY+5,10+Math.sin(r*3)*5,5+r%3*2,0,0,Math.PI*2);ctx.fill();
            }
            // Seaweed (shallow/mid only)
            if(deepFactor<.7){
                for(let s=0;s<12;s++){
                    const sx=s*(cw/12)+15;
                    const sway=Math.sin(t*1.5+s*2)*6;
                    ctx.strokeStyle=deepFactor<.4?'#2a6a2a':'#1a4a2a';
                    ctx.lineWidth=2;ctx.globalAlpha=.25;
                    ctx.beginPath();ctx.moveTo(sx,bedY);
                    ctx.quadraticCurveTo(sx+sway,bedY-15,sx+sway*1.3,bedY-25-Math.sin(s)*8);
                    ctx.stroke();
                    // Leaves
                    ctx.fillStyle=ctx.strokeStyle;
                    ctx.beginPath();ctx.ellipse(sx+sway*.7,bedY-12,3,6,.3+Math.sin(t+s)*.2,0,Math.PI*2);ctx.fill();
                }
                ctx.globalAlpha=1;
            }
        }

        // ── DEPTH GAUGE HUD ──
        ctx.globalAlpha=1;
        const depthM=(depth*60)|0;
        ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillRect(cw/2-60,vh-22,120,18);
        ctx.strokeStyle=deepFactor<.4?'#4af':deepFactor<.75?'#2a6a8a':'#4a2a6a';
        ctx.lineWidth=1;ctx.strokeRect(cw/2-60,vh-22,120,18);
        ctx.fillStyle=deepFactor<.4?'#4af':deepFactor<.75?'#2a8aaa':'#8a4aff';
        ctx.font='bold 11px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
        const zoneName=deepFactor<.4?'МЕЛКОВОДЬЕ':deepFactor<.75?'СУМЕРЕЧНАЯ ЗОНА':'ТЁМНАЯ БЕЗДНА';
        ctx.fillText(`⬇ ${depthM}м — ${zoneName}`,cw/2,vh-13);

        // ── PERISCOPE FRAME (when near surface) ──
        if(depth<.8){
            ctx.strokeStyle='rgba(100,150,200,0.15)';ctx.lineWidth=2;
            ctx.beginPath();ctx.arc(cw/2,vh/2,Math.min(cw,vh)*.4,0,Math.PI*2);ctx.stroke();
            // Crosshair
            ctx.strokeStyle='rgba(100,150,200,0.1)';ctx.lineWidth=1;
            ctx.beginPath();ctx.moveTo(cw/2-30,vh/2);ctx.lineTo(cw/2+30,vh/2);ctx.stroke();
            ctx.beginPath();ctx.moveTo(cw/2,vh/2-30);ctx.lineTo(cw/2,vh/2+30);ctx.stroke();
        }
    },

    _drawFrame(ctx,cw,vh){
        ctx.fillStyle='#12141c';
        ctx.fillRect(0,0,12,vh);ctx.fillRect(cw-12,0,12,vh);
        ctx.fillRect(cw*.33,0,6,vh);ctx.fillRect(cw*.66,0,6,vh);
        ctx.fillRect(0,0,cw,14);ctx.fillRect(0,vh-5,cw,5);
        ctx.fillStyle='#333';
        for(let i=0;i<5;i++)ctx.fillRect(15+i*(cw-30)/4,vh-3,4,3);
    },

    _drawCompass(ctx,cx,cy,r){
        ctx.fillStyle='#0a100a';ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='#2a4a2a';ctx.lineWidth=1;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();
        // Cardinal marks
        ctx.fillStyle='#4a6a4a';ctx.font='bold 8px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
        const dirs=['С','В','Ю','З'];
        for(let i=0;i<4;i++){const a=-Math.PI/2+i*Math.PI/2-this.ship.heading;ctx.fillText(dirs[i],cx+Math.cos(a)*(r-.8),cy+Math.sin(a)*(r-8));}
        // Target heading indicator
        const ta=this.ship.targetHeading-this.ship.heading-Math.PI/2;
        ctx.fillStyle='#ff0';
        ctx.beginPath();ctx.moveTo(cx+Math.cos(ta)*(r-4),cy+Math.sin(ta)*(r-4));
        ctx.lineTo(cx+Math.cos(ta-.1)*(r-12),cy+Math.sin(ta-.1)*(r-12));
        ctx.lineTo(cx+Math.cos(ta+.1)*(r-12),cy+Math.sin(ta+.1)*(r-12));ctx.fill();
        // Ship heading (always up)
        ctx.fillStyle='#4f4';
        ctx.beginPath();ctx.moveTo(cx,cy-r+6);ctx.lineTo(cx-4,cy-r+14);ctx.lineTo(cx+4,cy-r+14);ctx.fill();
        ctx.fillStyle='#2a4a2a';ctx.font='bold 7px monospace';
        ctx.fillText('КОМПАС',cx,cy+r+8);
    },

    _drawRadar(ctx,cx,cy,r){
        const s=this.ship;
        ctx.fillStyle='#0a100a';ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='#1a3a1a';ctx.lineWidth=.5;
        for(let i=1;i<=3;i++){ctx.beginPath();ctx.arc(cx,cy,r*i/3,0,Math.PI*2);ctx.stroke();}
        ctx.beginPath();ctx.moveTo(cx-r,cy);ctx.lineTo(cx+r,cy);ctx.stroke();
        ctx.beginPath();ctx.moveTo(cx,cy-r);ctx.lineTo(cx,cy+r);ctx.stroke();

        const sw=this.radarAngle-s.heading;
        ctx.strokeStyle='#2f2';ctx.lineWidth=1.5;ctx.globalAlpha=.7;
        ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(sw)*r,cy+Math.sin(sw)*r);ctx.stroke();
        ctx.globalAlpha=.06;ctx.fillStyle='#2f2';ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,sw-.4,sw);ctx.fill();ctx.globalAlpha=1;

        const range=1000;
        for(const c of this.radarContacts){
            const dx=c.x-s.x,dy=c.y-s.y,dist=Math.sqrt(dx*dx+dy*dy);if(dist>range)continue;
            const a=Math.atan2(dy,dx)-s.heading;
            const bx=cx+Math.cos(a)*(dist/range*r),by=cy+Math.sin(a)*(dist/range*r);
            ctx.fillStyle=c.type==='destroyer'?'#f44':'#ff0';ctx.globalAlpha=Math.max(0,1-c.age/5);
            ctx.fillRect(bx-2,by-2,4,4);ctx.globalAlpha=1;
        }
        // Torps
        ctx.fillStyle='#4af';for(const t of this.torps){const dx=t.x-s.x,dy=t.y-s.y,d=Math.sqrt(dx*dx+dy*dy);if(d>range)continue;const a=Math.atan2(dy,dx)-s.heading;ctx.fillRect(cx+Math.cos(a)*(d/range*r)-1,cy+Math.sin(a)*(d/range*r)-1,2,2);}
        ctx.fillStyle='#f44';for(const t of this.enemyTorps){const dx=t.x-s.x,dy=t.y-s.y,d=Math.sqrt(dx*dx+dy*dy);if(d>range)continue;const a=Math.atan2(dy,dx)-s.heading;if(Math.sin(this.t*10)>0)ctx.fillRect(cx+Math.cos(a)*(d/range*r)-1,cy+Math.sin(a)*(d/range*r)-1,3,3);}

        if(s.sonarPing>0){const pr=(1-s.sonarPing/2)*r;ctx.strokeStyle='#4f4';ctx.lineWidth=2;ctx.globalAlpha=s.sonarPing/2;ctx.beginPath();ctx.arc(cx,cy,pr,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}

        ctx.fillStyle='#4f4';ctx.beginPath();ctx.arc(cx,cy,2,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#2a4a2a';ctx.font='bold 7px monospace';ctx.textAlign='center';ctx.fillText('РАДАР',cx,cy+r+8);
    },

    _drawComms(ctx,cw,ch,panelY){
        const cx=cw*.76,cy=panelY+6,cwidth=cw*.23,cheight=ch-panelY-12;
        ctx.fillStyle='#080a0e';ctx.fillRect(cx,cy,cwidth,cheight);
        ctx.strokeStyle='#1a2a1a';ctx.lineWidth=1;ctx.strokeRect(cx,cy,cwidth,cheight);
        ctx.fillStyle='#2a4a2a';ctx.font='bold 8px monospace';ctx.textAlign='left';ctx.fillText('СВЯЗЬ',cx+4,cy+10);
        ctx.font='8px monospace';
        for(let i=0;i<this.commsLog.length&&i<8;i++){
            const m=this.commsLog[i],ly=cy+20+i*20;if(ly>cy+cheight-5)break;
            ctx.fillStyle='#4a8a4a';ctx.fillText(m.from+':',cx+3,ly);
            ctx.fillStyle='#8a8a6a';
            const maxW=cwidth-8;let line='',lineY=ly+10;
            for(const w of m.text.split(' ')){const test=line+w+' ';if(ctx.measureText(test).width>maxW){ctx.fillText(line,cx+3,lineY);lineY+=9;line=w+' ';}else line=test;}
            ctx.fillText(line,cx+3,lineY);
        }
    },

    _drawMenu(ctx,cw,ch){
        const grd=ctx.createLinearGradient(0,0,0,ch);grd.addColorStop(0,'#0a1428');grd.addColorStop(1,'#060e18');
        ctx.fillStyle=grd;ctx.fillRect(0,0,cw,ch);
        ctx.fillStyle='#0ff';ctx.font='bold 34px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText('RESONANCE',cw/2,ch*.15);
        ctx.fillStyle='#088';ctx.font='bold 17px monospace';ctx.fillText('NAVAL COMMAND',cw/2,ch*.15+32);
        ctx.fillStyle='#aaa';ctx.font='13px monospace';ctx.fillText('Нажмите чтобы начать',cw/2,ch*.55);
    },

    _drawPick(ctx,cw,ch){
        ctx.fillStyle='#0a0e18';ctx.fillRect(0,0,cw,ch);
        ctx.fillStyle='#0ff';ctx.font=`bold ${cw<500?16:22}px monospace`;ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText('ВЫБЕРИТЕ КОРАБЛЬ',cw/2,ch*.12);

        const mob=cw<600;
        const bw=mob?cw*.85:cw*.38, bh=mob?90:100;
        const gap=mob?12:0;
        const x1=mob?(cw-bw)/2:cw*.06, x2=mob?(cw-bw)/2:cw*.54;
        const y1=ch*.25, y2=mob?y1+bh+gap:y1;

        // Surface ship
        ctx.fillStyle='#0e1a28';ctx.fillRect(x1,y1,bw,bh);
        ctx.strokeStyle='#4af';ctx.lineWidth=2;ctx.strokeRect(x1,y1,bw,bh);
        ctx.fillStyle='#4af';ctx.font=`bold ${mob?14:17}px monospace`;ctx.fillText('⚓ НАДВОДНЫЙ КОРАБЛЬ',x1+bw/2,y1+22);
        ctx.fillStyle='#aaa';ctx.font=`${mob?10:11}px monospace`;
        ctx.fillText('HP:100 | Ракеты + Торпеды + Ловушки',x1+bw/2,y1+46);
        ctx.fillText('Видим врагам | Быстрый поворот',x1+bw/2,y1+64);
        ctx.fillStyle='#4af';ctx.font='bold 10px monospace';
        ctx.fillText('▶ ТАПНИТЕ ЧТОБЫ ВЫБРАТЬ ◀',x1+bw/2,y1+bh-10);

        // Submarine
        ctx.fillStyle='#0e1e1a';ctx.fillRect(x2,y2,bw,bh);
        ctx.strokeStyle='#4f4';ctx.lineWidth=2;ctx.strokeRect(x2,y2,bw,bh);
        ctx.fillStyle='#4f4';ctx.font=`bold ${mob?14:17}px monospace`;ctx.fillText('🔱 ПОДВОДНАЯ ЛОДКА',x2+bw/2,y2+22);
        ctx.fillStyle='#aaa';ctx.font=`${mob?10:11}px monospace`;
        ctx.fillText('HP:70 | 8 торпед | 3 уровня глубины',x2+bw/2,y2+46);
        ctx.fillText('Скрытность на глубине | Кислород!',x2+bw/2,y2+64);
        ctx.fillStyle='#4f4';ctx.font='bold 10px monospace';
        ctx.fillText('▶ ТАПНИТЕ ЧТОБЫ ВЫБРАТЬ ◀',x2+bw/2,y2+bh-10);
    },

    _drawEnd(ctx,cw,ch){
        ctx.fillStyle='rgba(0,0,0,.88)';ctx.fillRect(0,0,cw,ch);
        const won=this.state==='win';
        ctx.fillStyle=won?'#0ff':'#f44';ctx.font='bold 26px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(won?'МИССИЯ ВЫПОЛНЕНА':'КОРАБЛЬ ПОТЕРЯН',cw/2,ch*.25);
        ctx.fillStyle='#fff';ctx.font='13px monospace';
        ctx.fillText(`Волна: ${this.wave} | Потоплено: ${this.kills}`,cw/2,ch*.42);
        ctx.fillText(`Корпус: ${Math.max(0,this.ship.hp)}% | ${this.shipType==='sub'?'Подлодка':'Корабль'}`,cw/2,ch*.5);
        ctx.fillStyle='#888';ctx.font='12px monospace';ctx.fillText('Нажмите для рестарта',cw/2,ch*.75);
    },

    // ── Ship actions ──
    fireTorpedo(){
        const s=this.ship;if(s.torpedoes<=0)return;
        s.torpedoes--;if(s.torpedoes<s.maxTorpedoes&&s.torpReload<=0)s.torpReload=8;
        const a=s.heading;
        // Accuracy depends on distance to nearest enemy
        let acc=.5;
        for(const e of this.enemies){if(e.hp<=0)continue;const d=Math.sqrt((e.x-s.x)**2+(e.y-s.y)**2);if(d<300)acc=.9;else if(d<500)acc=.7;}
        this.torps.push({x:s.x+Math.cos(a)*15,y:s.y+Math.sin(a)*15,vx:Math.cos(a)*100,vy:Math.sin(a)*100,life:10,accuracy:acc});
        this._msg('ОРУЖИЕ',`Торпеда! Точность: ${(acc*100)|0}%`);Snd.play('torpedo');Snd.play('comms');
    },
    fireMissile(){
        const s=this.ship;if(s.missiles<=0)return;
        s.missiles--;if(s.missiles<s.maxMissiles&&s.missileReload<=0)s.missileReload=15;
        const a=s.heading;
        this.missiles.push({x:s.x,y:s.y,vx:Math.cos(a)*120,vy:Math.sin(a)*120,life:12});
        this._msg('ОРУЖИЕ','Ракета пущена!');Snd.play('missile');Snd.play('comms');
    },
    activateSonar(){
        const s=this.ship;if(s.sonarCd>0)return;
        s.sonarPing=2;s.sonarCd=5;Snd.play('sonar');
        for(const e of this.enemies){e.detected=true;e.blipAge=0;this.radarContacts.push({x:e.x,y:e.y,age:0,type:e.type,dist:Math.sqrt((e.x-s.x)**2+(e.y-s.y)**2)});}
        this._msg('СОНАР','Пинг! Все контакты обнаружены.');Snd.play('comms');
    },
    deployFlares(){
        const s=this.ship;if(s.flares<=0)return;s.flares--;
        let best=null,bd=Infinity;
        for(const t of this.enemyTorps){const d=Math.sqrt((t.x-s.x)**2+(t.y-s.y)**2);if(d<bd){bd=d;best=t;}}
        if(best){best.vx=(Math.random()-.5)*80;best.vy=(Math.random()-.5)*80;this._msg('ЗАЩИТА','Ловушки: торпеда отклонена!');}
        else this._msg('ЗАЩИТА','Ловушки выпущены.');
        Snd.play('comms');
    },
    setDepth(d){if(this.shipType!=='sub')return;this.ship.depthTarget=d;
        const names=['Всплытие','Перископ (30м)','Глубина (100м)'];
        this._msg('РУБКА',names[d]);Snd.play('comms');
    }
};

window.addEventListener('load',()=>{document.getElementById('loading').style.display='none';G.init();});
