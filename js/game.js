// ============ NAVAL COMMAND — view from captain's bridge ============
const G = {
    cv:null,ctx:null,lt:0,t:0,
    state:'menu', // menu,play,gameover,win
    // Ship
    ship:{x:0,y:0,heading:0,targetHeading:0,speed:0,maxSpeed:12,hp:100,maxHp:100,
          torpedoes:6,maxTorpedoes:6,torpReload:0,
          missiles:3,maxMissiles:3,missileReload:0,
          flares:2,
          sonarPing:0,sonarCd:0,
          engines:'stop', // stop,slow,half,full,flank
          rudder:0}, // -1 left, 0 center, 1 right
    // Enemies
    enemies:[],
    // Projectiles
    torps:[], missiles:[], enemyTorps:[],
    // Explosions
    explosions:[],
    // Radar
    radarAngle:0,
    radarContacts:[], // {x,y,age,type}
    // Sea state
    waveOffset:0,
    // Mission
    wave:0, killsNeeded:0, kills:0,
    msgQueue:[], commsLog:[],
    alertLevel:0, // 0=green 1=yellow 2=red

    init(){
        this.cv=document.getElementById('game');
        this.ctx=this.cv.getContext('2d');
        this._resize();
        window.addEventListener('resize',()=>this._resize());
        this.lt=performance.now();
        this.cv.addEventListener('mousedown',e=>this._click(e));
        this.cv.addEventListener('touchstart',e=>{e.preventDefault();this._click(e.touches[0]);},{passive:false});
        requestAnimationFrame(t=>this.loop(t));
    },

    _resize(){this.cv.width=window.innerWidth;this.cv.height=window.innerHeight;},

    _click(e){
        const r=this.cv.getBoundingClientRect();
        const mx=(e.clientX-r.left)*(this.cv.width/r.width);
        const my=(e.clientY-r.top)*(this.cv.height/r.height);
        if(this.state==='menu'){this._startGame();return;}
        if(this.state==='gameover'||this.state==='win'){this.state='menu';return;}
        UI.handleClick(mx,my);
    },

    _startGame(){
        const s=this.ship;
        s.x=0;s.y=0;s.heading=0;s.targetHeading=0;s.speed=0;s.hp=s.maxHp;
        s.torpedoes=s.maxTorpedoes;s.missiles=s.maxMissiles;s.flares=2;
        s.torpReload=0;s.missileReload=0;s.sonarPing=0;s.sonarCd=0;
        s.engines='stop';s.rudder=0;
        this.enemies=[];this.torps=[];this.missiles=[];this.enemyTorps=[];
        this.explosions=[];this.radarContacts=[];this.commsLog=[];this.msgQueue=[];
        this.wave=0;this.kills=0;this.alertLevel=0;this.t=0;
        this._nextWave();
        this.state='play';
        this._addComms('ШТАБ','Капитан, вы вышли на боевое дежурство. Уничтожьте все вражеские корабли.');
    },

    _nextWave(){
        this.wave++;
        const count=2+this.wave;
        this.killsNeeded=count;
        this.kills=0;
        for(let i=0;i<count;i++){
            const a=Math.random()*Math.PI*2;
            const d=800+Math.random()*600;
            const type=Math.random()<.3&&this.wave>2?'destroyer':'patrol';
            this.enemies.push({
                x:this.ship.x+Math.cos(a)*d,
                y:this.ship.y+Math.sin(a)*d,
                heading:Math.random()*Math.PI*2,
                speed:type==='destroyer'?6:4,
                hp:type==='destroyer'?60:30,
                maxHp:type==='destroyer'?60:30,
                type,
                fireTimer:3000+Math.random()*4000,
                detected:false,
                blipAge:99
            });
        }
        this._addComms('ШТАБ',`Волна ${this.wave}: обнаружено ${count} вражеских кораблей. Удачной охоты!`);
        this.alertLevel=1;
    },

    _addComms(from,text){
        this.commsLog.unshift({from,text,time:this.t});
        if(this.commsLog.length>8)this.commsLog.pop();
    },

    loop(time){
        const dt=Math.min((time-this.lt)/1000,.05);
        this.lt=time;this.t+=dt;
        if(this.state==='play')this._update(dt);
        this._draw();
        requestAnimationFrame(t=>this.loop(t));
    },

    _update(dt){
        const s=this.ship;
        // Engine speed
        const speedMap={stop:0,slow:3,half:6,full:10,flank:12};
        const target=speedMap[s.engines];
        s.speed+=(target-s.speed)*dt*0.8;

        // Rudder -> heading
        if(s.rudder!==0) s.targetHeading+=s.rudder*dt*0.6;
        let dh=s.targetHeading-s.heading;
        while(dh>Math.PI)dh-=Math.PI*2;
        while(dh<-Math.PI)dh+=Math.PI*2;
        s.heading+=dh*dt*1.2;

        // Move ship
        s.x+=Math.cos(s.heading)*s.speed*dt;
        s.y+=Math.sin(s.heading)*s.speed*dt;

        // Waves
        this.waveOffset+=dt;

        // Radar sweep
        this.radarAngle+=dt*1.8;
        if(this.radarAngle>Math.PI*2)this.radarAngle-=Math.PI*2;

        // Sonar
        if(s.sonarPing>0)s.sonarPing-=dt;
        if(s.sonarCd>0)s.sonarCd-=dt;

        // Reloads
        if(s.torpReload>0){s.torpReload-=dt;if(s.torpReload<=0&&s.torpedoes<s.maxTorpedoes){s.torpedoes++;s.torpReload=s.torpedoes<s.maxTorpedoes?8:0;}}
        if(s.missileReload>0){s.missileReload-=dt;if(s.missileReload<=0&&s.missiles<s.maxMissiles){s.missiles++;s.missileReload=s.missiles<s.maxMissiles?15:0;}}

        // Enemy AI
        for(const e of this.enemies){
            if(e.hp<=0)continue;
            // Move
            e.x+=Math.cos(e.heading)*e.speed*dt;
            e.y+=Math.sin(e.heading)*e.speed*dt;
            // Steer toward player loosely
            const toPlayer=Math.atan2(s.y-e.y,s.x-e.x);
            let da=toPlayer-e.heading;
            while(da>Math.PI)da-=Math.PI*2;while(da<-Math.PI)da+=Math.PI*2;
            e.heading+=da*dt*0.3;

            // Detect on radar sweep
            const relAngle=Math.atan2(e.y-s.y,e.x-s.x);
            let sweepDiff=this.radarAngle-relAngle;
            while(sweepDiff>Math.PI)sweepDiff-=Math.PI*2;while(sweepDiff<-Math.PI)sweepDiff+=Math.PI*2;
            if(Math.abs(sweepDiff)<.15){
                e.detected=true;e.blipAge=0;
                // Update radar contact
                const dist=Math.sqrt((e.x-s.x)**2+(e.y-s.y)**2);
                this.radarContacts.push({x:e.x,y:e.y,age:0,type:e.type,dist});
            }
            e.blipAge+=dt;

            // Fire at player
            const distToPlayer=Math.sqrt((e.x-s.x)**2+(e.y-s.y)**2);
            e.fireTimer-=dt*1000;
            if(e.fireTimer<=0&&distToPlayer<700){
                e.fireTimer=4000+Math.random()*3000;
                const a=Math.atan2(s.y-e.y,s.x-e.x)+(Math.random()-.5)*.15;
                this.enemyTorps.push({x:e.x,y:e.y,vx:Math.cos(a)*80,vy:Math.sin(a)*80,life:10});
                if(distToPlayer<500)this.alertLevel=2;
                this._addComms('СОНАР','Торпеда в воде! Вражеская торпеда обнаружена!');
            }
        }

        // Age radar contacts
        for(let i=this.radarContacts.length-1;i>=0;i--){
            this.radarContacts[i].age+=dt;
            if(this.radarContacts[i].age>4)this.radarContacts.splice(i,1);
        }

        // Update torpedoes
        for(let i=this.torps.length-1;i>=0;i--){
            const t=this.torps[i];
            t.x+=t.vx*dt;t.y+=t.vy*dt;t.life-=dt;
            if(t.life<=0){this.torps.splice(i,1);continue;}
            for(const e of this.enemies){
                if(e.hp<=0)continue;
                if(Math.sqrt((t.x-e.x)**2+(t.y-e.y)**2)<25){
                    e.hp-=35;t.life=0;
                    this.explosions.push({x:e.x,y:e.y,t:1.5,r:0,type:'hit'});
                    this._addComms('ОРУЖИЕ','Попадание торпедой!');
                    if(e.hp<=0){this.kills++;this.explosions.push({x:e.x,y:e.y,t:3,r:0,type:'sink'});this._addComms('НАБЛЮДАТЕЛЬ',`Вражеский ${e.type==='destroyer'?'эсминец':'катер'} потоплен!`);}
                    break;
                }
            }
        }

        // Update missiles
        for(let i=this.missiles.length-1;i>=0;i--){
            const m=this.missiles[i];
            // Home toward nearest enemy
            let best=null,bd=Infinity;
            for(const e of this.enemies){if(e.hp<=0)continue;const d=Math.sqrt((m.x-e.x)**2+(m.y-e.y)**2);if(d<bd){bd=d;best=e;}}
            if(best){
                const a=Math.atan2(best.y-m.y,best.x-m.x);
                m.vx+=(Math.cos(a)*200-m.vx)*dt*2;
                m.vy+=(Math.sin(a)*200-m.vy)*dt*2;
            }
            m.x+=m.vx*dt;m.y+=m.vy*dt;m.life-=dt;
            if(m.life<=0){this.missiles.splice(i,1);continue;}
            for(const e of this.enemies){
                if(e.hp<=0)continue;
                if(Math.sqrt((m.x-e.x)**2+(m.y-e.y)**2)<30){
                    e.hp-=50;m.life=0;
                    this.explosions.push({x:e.x,y:e.y,t:2,r:0,type:'hit'});
                    this._addComms('ОРУЖИЕ','Ракета поразила цель!');
                    if(e.hp<=0){this.kills++;this.explosions.push({x:e.x,y:e.y,t:3,r:0,type:'sink'});this._addComms('НАБЛЮДАТЕЛЬ',`Вражеский корабль уничтожен!`);}
                    break;
                }
            }
        }

        // Enemy torpedoes
        for(let i=this.enemyTorps.length-1;i>=0;i--){
            const t=this.enemyTorps[i];
            t.x+=t.vx*dt;t.y+=t.vy*dt;t.life-=dt;
            if(t.life<=0){this.enemyTorps.splice(i,1);continue;}
            if(Math.sqrt((t.x-s.x)**2+(t.y-s.y)**2)<20){
                s.hp-=25;t.life=0;
                this.explosions.push({x:s.x,y:s.y,t:2,r:0,type:'hit'});
                this._addComms('ПОВРЕЖДЕНИЯ',`Попадание! Прочность корпуса: ${Math.max(0,s.hp)}%`);
                if(s.hp<=0){this.state='gameover';this._addComms('','Корабль потоплен...');}
            }
        }

        // Explosions
        for(let i=this.explosions.length-1;i>=0;i--){
            this.explosions[i].t-=dt;
            this.explosions[i].r+=dt*60;
            if(this.explosions[i].t<=0)this.explosions.splice(i,1);
        }

        // Remove dead enemies
        this.enemies=this.enemies.filter(e=>e.hp>0);

        // Wave complete?
        if(this.kills>=this.killsNeeded){
            if(this.wave>=5){this.state='win';this._addComms('ШТАБ','Все угрозы устранены. Миссия выполнена!');}
            else{this._nextWave();}
        }

        // Alert decay
        if(this.enemies.every(e=>Math.sqrt((e.x-s.x)**2+(e.y-s.y)**2)>500))this.alertLevel=Math.max(1,this.alertLevel);
    },

    // ══ DRAW ══
    _draw(){
        const ctx=this.ctx,cw=this.cv.width,ch=this.cv.height;
        ctx.fillStyle='#0a0c12';ctx.fillRect(0,0,cw,ch);
        if(this.state==='menu'){this._drawMenu(ctx,cw,ch);return;}
        if(this.state==='gameover'||this.state==='win'){this._drawEnd(ctx,cw,ch);return;}

        // ── BRIDGE VIEW ──
        this._drawOceanView(ctx,cw,ch);
        this._drawBridgeFrame(ctx,cw,ch);

        // ── PANELS ──
        const panelY=ch*0.55; // below horizon
        const panelH=ch-panelY;

        // Console background
        ctx.fillStyle='#0c0e14';
        ctx.fillRect(0,panelY,cw,panelH);
        ctx.fillStyle='#1a1c24';
        ctx.fillRect(0,panelY,cw,3);

        // Layout: Radar(left) | Controls(center) | Comms(right)
        const radarSize=Math.min(panelH-16, cw*.2, 200);
        const radarX=8+radarSize/2;
        const radarY=panelY+8+radarSize/2;

        this._drawRadar(ctx,radarX,radarY,radarSize/2);
        UI.draw(ctx,cw,ch,panelY,radarSize);
        this._drawComms(ctx,cw,ch,panelY);
    },

    _drawOceanView(ctx,cw,ch){
        const horizonY=ch*0.35;
        const s=this.ship;

        // Sky gradient
        const skyGrd=ctx.createLinearGradient(0,0,0,horizonY);
        skyGrd.addColorStop(0,'#0a1428');skyGrd.addColorStop(.5,'#1a2a4a');skyGrd.addColorStop(1,'#2a3a5a');
        ctx.fillStyle=skyGrd;ctx.fillRect(0,0,cw,horizonY);

        // Stars
        for(let i=0;i<30;i++){
            const sx=(Math.sin(i*7.3+1)*0.5+0.5)*cw;
            const sy=(Math.sin(i*3.1+2)*0.5+0.5)*horizonY*.7;
            ctx.fillStyle=`rgba(255,255,255,${.3+Math.sin(this.t*2+i)*.2})`;
            ctx.fillRect(sx,sy,1.5,1.5);
        }

        // Ocean gradient
        const seaGrd=ctx.createLinearGradient(0,horizonY,0,ch*.55);
        seaGrd.addColorStop(0,'#1a2a3a');seaGrd.addColorStop(.3,'#0a1a2a');seaGrd.addColorStop(1,'#060e18');
        ctx.fillStyle=seaGrd;ctx.fillRect(0,horizonY,cw,ch*.55-horizonY);

        // Wave lines
        ctx.strokeStyle='rgba(100,140,180,0.12)';ctx.lineWidth=1;
        for(let w=0;w<8;w++){
            const wy=horizonY+10+w*((ch*.55-horizonY)/8);
            ctx.beginPath();
            for(let wx=0;wx<cw;wx+=4){
                const wave=Math.sin(wx*.02+this.t*1.5+w)*(2+w*.5);
                ctx[wx?'lineTo':'moveTo'](wx,wy+wave);
            }
            ctx.stroke();
        }

        // Horizon glow
        ctx.fillStyle='rgba(40,60,80,0.3)';
        ctx.fillRect(0,horizonY-2,cw,4);

        // Draw visible explosions in ocean view
        for(const ex of this.explosions){
            const dx=ex.x-s.x, dy=ex.y-s.y;
            const dist=Math.sqrt(dx*dx+dy*dy);
            if(dist>1200)continue;
            // Project to screen
            let relAngle=Math.atan2(dy,dx)-s.heading;
            while(relAngle>Math.PI)relAngle-=Math.PI*2;while(relAngle<-Math.PI)relAngle+=Math.PI*2;
            if(Math.abs(relAngle)>1)continue;
            const scrX=cw/2+relAngle/(Math.PI/3)*cw*.4;
            const scrY=horizonY-5+dist*.01;
            const sz=ex.type==='sink'?30-ex.r*.3:15-ex.r*.2;
            if(sz>0){
                ctx.globalAlpha=ex.t/2;
                ctx.fillStyle=ex.type==='sink'?'#f80':'#ff4';
                ctx.beginPath();ctx.arc(scrX,scrY,Math.max(2,sz),0,Math.PI*2);ctx.fill();
                ctx.fillStyle='#f44';
                ctx.beginPath();ctx.arc(scrX,scrY,Math.max(1,sz*.5),0,Math.PI*2);ctx.fill();
                ctx.globalAlpha=1;
            }
        }

        // Compass heading at top
        ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(cw/2-60,5,120,22);
        ctx.strokeStyle='#4a6';ctx.lineWidth=1;ctx.strokeRect(cw/2-60,5,120,22);
        const hdg=((s.heading*180/Math.PI)%360+360)%360;
        ctx.fillStyle='#4f8';ctx.font='bold 14px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(`${hdg.toFixed(0)}°`,cw/2,16);
    },

    _drawBridgeFrame(ctx,cw,ch){
        const horizonY=ch*0.35;
        // Window frame posts
        ctx.fillStyle='#1a1c22';
        ctx.fillRect(0,0,15,ch*.55);
        ctx.fillRect(cw-15,0,15,ch*.55);
        ctx.fillRect(cw*.33,0,8,ch*.55);
        ctx.fillRect(cw*.66,0,8,ch*.55);
        // Top beam
        ctx.fillStyle='#1a1c22';ctx.fillRect(0,0,cw,18);
        // Bottom sill
        ctx.fillStyle='#22242c';ctx.fillRect(0,ch*.55-8,cw,8);
        // Metal bolts
        ctx.fillStyle='#444';
        for(let i=0;i<6;i++){
            ctx.beginPath();ctx.arc(20+i*(cw-40)/5,ch*.55-4,3,0,Math.PI*2);ctx.fill();
        }
    },

    _drawRadar(ctx,cx,cy,r){
        const s=this.ship;
        // Radar background
        ctx.fillStyle='#0a100a';
        ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();

        // Grid rings
        ctx.strokeStyle='#1a3a1a';ctx.lineWidth=.5;
        for(let i=1;i<=4;i++){
            ctx.beginPath();ctx.arc(cx,cy,r*i/4,0,Math.PI*2);ctx.stroke();
        }
        // Grid cross
        ctx.beginPath();ctx.moveTo(cx-r,cy);ctx.lineTo(cx+r,cy);ctx.stroke();
        ctx.beginPath();ctx.moveTo(cx,cy-r);ctx.lineTo(cx,cy+r);ctx.stroke();

        // Sweep line
        const sweepAngle=this.radarAngle-s.heading;
        ctx.strokeStyle='#2f2';ctx.lineWidth=2;ctx.globalAlpha=.8;
        ctx.beginPath();ctx.moveTo(cx,cy);
        ctx.lineTo(cx+Math.cos(sweepAngle)*r,cy+Math.sin(sweepAngle)*r);ctx.stroke();
        // Sweep fade
        ctx.globalAlpha=.08;
        ctx.fillStyle='#2f2';
        ctx.beginPath();ctx.moveTo(cx,cy);
        ctx.arc(cx,cy,r,sweepAngle-.4,sweepAngle);ctx.fill();
        ctx.globalAlpha=1;

        // Contacts
        const radarRange=1200;
        for(const c of this.radarContacts){
            const dx=c.x-s.x, dy=c.y-s.y;
            const dist=Math.sqrt(dx*dx+dy*dy);
            if(dist>radarRange)continue;
            const a=Math.atan2(dy,dx)-s.heading;
            const rd=dist/radarRange*r;
            const bx=cx+Math.cos(a)*rd, by=cy+Math.sin(a)*rd;
            const alpha=Math.max(0,1-c.age/4);
            ctx.fillStyle=c.type==='destroyer'?'#f44':'#ff0';
            ctx.globalAlpha=alpha;
            ctx.fillRect(bx-2,by-2,4,4);
            ctx.globalAlpha=1;
        }

        // Torpedoes on radar
        ctx.fillStyle='#4af';
        for(const t of this.torps){
            const dx=t.x-s.x,dy=t.y-s.y,dist=Math.sqrt(dx*dx+dy*dy);
            if(dist>radarRange)continue;
            const a=Math.atan2(dy,dx)-s.heading;
            const rd=dist/radarRange*r;
            ctx.fillRect(cx+Math.cos(a)*rd-1,cy+Math.sin(a)*rd-1,3,3);
        }
        // Enemy torps
        ctx.fillStyle='#f44';
        for(const t of this.enemyTorps){
            const dx=t.x-s.x,dy=t.y-s.y,dist=Math.sqrt(dx*dx+dy*dy);
            if(dist>radarRange)continue;
            const a=Math.atan2(dy,dx)-s.heading;
            const rd=dist/radarRange*r;
            const blink=Math.sin(this.t*10)>.0;
            if(blink)ctx.fillRect(cx+Math.cos(a)*rd-1,cy+Math.sin(a)*rd-1,3,3);
        }

        // Center dot (our ship)
        ctx.fillStyle='#4f4';
        ctx.beginPath();ctx.arc(cx,cy,3,0,Math.PI*2);ctx.fill();

        // Sonar ping ring
        if(s.sonarPing>0){
            const pr=(1-s.sonarPing/2)*r;
            ctx.strokeStyle='#4f4';ctx.lineWidth=2;ctx.globalAlpha=s.sonarPing/2;
            ctx.beginPath();ctx.arc(cx,cy,pr,0,Math.PI*2);ctx.stroke();
            ctx.globalAlpha=1;
        }

        // Label
        ctx.fillStyle='#2a4a2a';ctx.font='bold 9px monospace';ctx.textAlign='center';
        ctx.fillText('РАДАР',cx,cy+r+12);
    },

    _drawComms(ctx,cw,ch,panelY){
        // Comms panel (right side)
        const cx=cw*.73, cy=panelY+6, cwidth=cw*.26, cheight=ch-panelY-12;
        ctx.fillStyle='#0a0c10';ctx.fillRect(cx,cy,cwidth,cheight);
        ctx.strokeStyle='#2a3a2a';ctx.lineWidth=1;ctx.strokeRect(cx,cy,cwidth,cheight);

        ctx.fillStyle='#1a3a2a';ctx.font='bold 9px monospace';ctx.textAlign='left';
        ctx.fillText('СВЯЗЬ',cx+4,cy+10);

        ctx.font='9px monospace';
        for(let i=0;i<this.commsLog.length&&i<7;i++){
            const m=this.commsLog[i];
            const ly=cy+24+i*22;
            if(ly>cy+cheight-5)break;
            ctx.fillStyle='#4a8a4a';ctx.fillText(m.from+':',cx+4,ly);
            ctx.fillStyle='#8a8a6a';
            // Word wrap
            const words=m.text.split(' ');let line='';
            let lx=cx+4, lineY=ly+11;
            for(const w of words){
                const test=line+w+' ';
                if(ctx.measureText(test).width>cwidth-10){
                    ctx.fillText(line,lx,lineY);lineY+=10;line=w+' ';
                } else line=test;
            }
            ctx.fillText(line,lx,lineY);
        }
    },

    _drawMenu(ctx,cw,ch){
        // Ocean bg
        const grd=ctx.createLinearGradient(0,0,0,ch);
        grd.addColorStop(0,'#0a1428');grd.addColorStop(.4,'#1a2a4a');grd.addColorStop(1,'#060e18');
        ctx.fillStyle=grd;ctx.fillRect(0,0,cw,ch);

        ctx.fillStyle='#0ff';ctx.font='bold 36px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText('RESONANCE',cw/2,ch*.15);
        ctx.fillStyle='#088';ctx.font='bold 18px monospace';
        ctx.fillText('NAVAL COMMAND',cw/2,ch*.15+34);

        // Ship silhouette
        ctx.fillStyle='#1a2a3a';
        ctx.beginPath();ctx.moveTo(cw/2-80,ch*.45);ctx.lineTo(cw/2+80,ch*.45);
        ctx.lineTo(cw/2+100,ch*.45+10);ctx.lineTo(cw/2-60,ch*.45+10);ctx.closePath();ctx.fill();
        ctx.fillRect(cw/2-20,ch*.45-20,8,20);ctx.fillRect(cw/2+10,ch*.45-15,5,15);

        ctx.fillStyle='#aaa';ctx.font='14px monospace';
        ctx.fillText('Нажмите чтобы начать',cw/2,ch*.65);
        ctx.fillStyle='#666';ctx.font='11px monospace';
        ctx.fillText('Вид из рубки капитана — управляйте кораблём',cw/2,ch*.73);
        ctx.fillText('Радар • Торпеды • Ракеты • Сонар',cw/2,ch*.78);
    },

    _drawEnd(ctx,cw,ch){
        ctx.fillStyle='rgba(0,0,0,.85)';ctx.fillRect(0,0,cw,ch);
        const won=this.state==='win';
        ctx.fillStyle=won?'#0ff':'#f44';ctx.font='bold 28px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(won?'МИССИЯ ВЫПОЛНЕНА':'КОРАБЛЬ ПОТОПЛЕН',cw/2,ch*.25);
        ctx.fillStyle='#fff';ctx.font='14px monospace';
        ctx.fillText(`Волна: ${this.wave}`,cw/2,ch*.4);
        ctx.fillText(`Потоплено: ${this.kills}`,cw/2,ch*.47);
        ctx.fillText(`Прочность: ${Math.max(0,this.ship.hp)}%`,cw/2,ch*.54);
        ctx.fillStyle='#888';ctx.font='12px monospace';
        ctx.fillText('Нажмите для рестарта',cw/2,ch*.75);
    },

    // Ship actions
    fireTorpedo(){
        const s=this.ship;
        if(s.torpedoes<=0)return;
        s.torpedoes--;
        if(s.torpedoes<s.maxTorpedoes&&s.torpReload<=0)s.torpReload=8;
        const a=s.heading;
        this.torps.push({x:s.x+Math.cos(a)*15,y:s.y+Math.sin(a)*15,vx:Math.cos(a)*120,vy:Math.sin(a)*120,life:8});
        this._addComms('ОРУЖИЕ','Торпеда выпущена!');
    },

    fireMissile(){
        const s=this.ship;
        if(s.missiles<=0)return;
        s.missiles--;
        if(s.missiles<s.maxMissiles&&s.missileReload<=0)s.missileReload=15;
        const a=s.heading;
        this.missiles.push({x:s.x,y:s.y,vx:Math.cos(a)*150,vy:Math.sin(a)*150,life:12});
        this._addComms('ОРУЖИЕ','Ракета запущена! Самонаведение активно.');
    },

    activateSonar(){
        const s=this.ship;
        if(s.sonarCd>0)return;
        s.sonarPing=2;s.sonarCd=5;
        // Reveal all enemies
        for(const e of this.enemies){
            e.detected=true;e.blipAge=0;
            const dist=Math.sqrt((e.x-s.x)**2+(e.y-s.y)**2);
            this.radarContacts.push({x:e.x,y:e.y,age:0,type:e.type,dist});
        }
        this._addComms('СОНАР','Пинг отправлен. Все контакты обнаружены.');
    },

    deployFlares(){
        const s=this.ship;
        if(s.flares<=0)return;
        s.flares--;
        // Deflect nearest enemy torpedo
        let best=null,bd=Infinity;
        for(const t of this.enemyTorps){
            const d=Math.sqrt((t.x-s.x)**2+(t.y-s.y)**2);
            if(d<bd){bd=d;best=t;}
        }
        if(best){
            best.vx=(Math.random()-.5)*100;best.vy=(Math.random()-.5)*100;
            this._addComms('ЗАЩИТА','Ловушки выпущены! Торпеда отклонена.');
        } else {
            this._addComms('ЗАЩИТА','Ловушки выпущены.');
        }
    }
};

window.addEventListener('load',()=>{document.getElementById('loading').style.display='none';G.init();});
