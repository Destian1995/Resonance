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
            // Surface button
            if(p.y>ch*.35&&p.y<ch*.35+90){
                if(p.x<cw/2){this.shipType='surface';this._startGame();}
                else{this.shipType='sub';this._startGame();}
            }
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
        s.depth=0;s.depthTarget=0;s.o2=100;s.maxO2=100;
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

        // ── VIEW ──
        const viewH=ch*.48;
        this._drawView(ctx,cw,viewH);
        this._drawFrame(ctx,cw,viewH);

        // ── CONSOLE ──
        const panelY=viewH+4;
        ctx.fillStyle='#0a0c14';ctx.fillRect(0,panelY,cw,ch-panelY);
        // Metal edge
        ctx.fillStyle='#1a1e28';ctx.fillRect(0,panelY,cw,2);

        // Layout: Compass(left-top) + Radar(left-bottom) | Controls(center) | Comms(right)
        const rSz=Math.min((ch-panelY-40)*.5, cw*.13, 120);
        // Compass rose
        this._drawCompass(ctx, 8+rSz/2, panelY+8+rSz*.4, rSz*.4);
        // Radar
        this._drawRadar(ctx, 8+rSz/2, panelY+rSz+16+rSz/2, rSz/2);
        // Controls
        UI.draw(ctx,cw,ch,panelY,rSz+20);
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

        if(isSub&&depth>0.5){
            // Underwater view
            const dAlpha=Math.min(1,depth);
            const grd=ctx.createLinearGradient(0,0,0,vh);
            grd.addColorStop(0,`rgba(0,${30-depth*10|0},${60-depth*15|0},1)`);
            grd.addColorStop(1,`rgba(0,${10},${30-depth*10|0},1)`);
            ctx.fillStyle=grd;ctx.fillRect(0,0,cw,vh);
            // Light rays
            ctx.globalAlpha=.04;ctx.fillStyle='#4af';
            for(let i=0;i<6;i++){
                const rx=(Math.sin(i*2.3+this.t*.3)*.5+.5)*cw;
                ctx.beginPath();ctx.moveTo(rx-20,0);ctx.lineTo(rx+20,0);ctx.lineTo(rx+5+Math.sin(this.t+i)*10,vh);ctx.lineTo(rx-5+Math.sin(this.t+i)*10,vh);ctx.fill();
            }
            ctx.globalAlpha=1;
            // Bubbles
            for(let i=0;i<8;i++){
                const bx=(Math.sin(i*3.7+this.t*.5)*.5+.5)*cw;
                const by=(this.t*20+i*50)%vh;
                ctx.fillStyle='rgba(100,180,255,0.15)';
                ctx.beginPath();ctx.arc(bx,vh-by,2+Math.sin(i)*.5,0,Math.PI*2);ctx.fill();
            }
            // Depth gauge text
            ctx.fillStyle='#4af';ctx.font='bold 12px monospace';ctx.textAlign='center';
            ctx.fillText(`ГЛУБИНА: ${(depth*60)|0}м`,cw/2,vh-10);
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
        ctx.fillStyle='#0ff';ctx.font='bold 20px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText('ВЫБЕРИТЕ КОРАБЛЬ',cw/2,ch*.15);

        // Surface ship
        const bw=cw*.38,bh=80,by=ch*.35;
        ctx.fillStyle='#1a2a3a';ctx.fillRect(cw*.08,by,bw,bh);
        ctx.strokeStyle='#4af';ctx.lineWidth=2;ctx.strokeRect(cw*.08,by,bw,bh);
        ctx.fillStyle='#4af';ctx.font='bold 15px monospace';ctx.fillText('⚓ КОРАБЛЬ',cw*.08+bw/2,by+25);
        ctx.fillStyle='#aaa';ctx.font='10px monospace';
        ctx.fillText('HP:100 | Ракеты+Торпеды',cw*.08+bw/2,by+45);
        ctx.fillText('Ловушки | Видим врагам',cw*.08+bw/2,by+60);

        // Submarine
        ctx.fillStyle='#1a2a2a';ctx.fillRect(cw*.54,by,bw,bh);
        ctx.strokeStyle='#4f4';ctx.lineWidth=2;ctx.strokeRect(cw*.54,by,bw,bh);
        ctx.fillStyle='#4f4';ctx.font='bold 15px monospace';ctx.fillText('🔱 ПОДЛОДКА',cw*.54+bw/2,by+25);
        ctx.fillStyle='#aaa';ctx.font='10px monospace';
        ctx.fillText('HP:70 | 8 торпед | Погружение',cw*.54+bw/2,by+45);
        ctx.fillText('Скрытность | Кислород!',cw*.54+bw/2,by+60);
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
