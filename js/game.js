// ============ TITANIC — full control, top-down view ============
const G = {
    cv:null,ctx:null,lt:0,t:0,
    state:'menu',
    camX:0,camY:0,
    log:[],
    warned:false,

    init(){
        this.cv=document.getElementById('game');
        this.ctx=this.cv.getContext('2d');
        this._resize();
        window.addEventListener('resize',()=>this._resize());
        this.lt=performance.now();
        this.cv.addEventListener('mousedown',e=>this._click(this._pos(e)));
        this.cv.addEventListener('touchstart',e=>{e.preventDefault();this._click(this._tpos(e));},{passive:false});
        requestAnimationFrame(t=>this.loop(t));
    },
    _resize(){this.cv.width=window.innerWidth;this.cv.height=window.innerHeight;},
    _pos(e){const r=this.cv.getBoundingClientRect();return{x:(e.clientX-r.left)*(this.cv.width/r.width),y:(e.clientY-r.top)*(this.cv.height/r.height)};},
    _tpos(e){return this._pos(e.changedTouches[0]);},

    buttons:[],

    _click(p){
        if(this.state==='menu'){Ship.init();this.t=0;this.log=[];this.warned=false;this.state='play';this._log('МОСТИК','23:00 — Титаник идёт полным ходом.');return;}
        if(this.state==='end'){this.state='menu';return;}
        for(const b of this.buttons){
            if(p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h){b.fn();return;}
        }
    },

    _log(f,t){this.log.unshift({f,t,time:this.t});if(this.log.length>15)this.log.pop();},

    loop(time){
        const dt=Math.min((time-this.lt)/1000,.05);this.lt=time;this.t+=dt;
        if(this.state==='play')this._update(dt);
        this._draw();
        requestAnimationFrame(t=>this.loop(t));
    },

    _update(dt){
        Ship.update(dt);
        // Camera follows ship
        this.camX=Ship.x-this.cv.width/2;
        this.camY=Ship.y-this.cv.height*.35;

        // Auto events
        if(!this.warned&&Ship.iceberg){
            const bx=Ship.x+Math.cos(Ship.heading)*Ship.length*.45;
            const by=Ship.y+Math.sin(Ship.heading)*Ship.length*.45;
            const d=Math.sqrt((bx-Ship.iceberg.x)**2+(by-Ship.iceberg.y)**2);
            if(d<250&&!this.warned){this.warned=true;this._log('ВПЕРЕДСМОТРЯЩИЙ','АЙСБЕРГ! ПРЯМО ПО КУРСУ!');}
        }

        if(Ship.hit&&!Ship._hitLogged){Ship._hitLogged=true;this._log('','💥 СТОЛКНОВЕНИЕ!');this._log('ИНЖЕНЕР','Вода в отсеках! Переборки прорваны!');}
        if(!Ship.powerOn&&!Ship._powerLogged){Ship._powerLogged=true;this._log('МАШИННОЕ','Генераторы затоплены! Энергия потеряна!');}
        if(Ship.sunk){this.state='end';}

        // Auto-warn about flooding
        if(Ship.sinking&&Ship.flooding>30&&!Ship._warn30){Ship._warn30=true;this._log('ИНЖЕНЕР','Затопление 30%! Спускайте шлюпки!');}
        if(Ship.sinking&&Ship.flooding>60&&!Ship._warn60){Ship._warn60=true;this._log('ИНЖЕНЕР','Затопление 60%! Мало времени!');}
        if(Ship.sinking&&Ship.flooding>80&&!Ship._warn80){Ship._warn80=true;this._log('','Корабль уходит под воду...');}
    },

    _draw(){
        const ctx=this.ctx,cw=this.cv.width,ch=this.cv.height;
        this.buttons=[];

        if(this.state==='menu'){this._drawMenu(ctx,cw,ch);return;}
        if(this.state==='end'){this._drawEnd(ctx,cw,ch);return;}

        // ── OCEAN (top-down, fill screen) ──
        ctx.fillStyle='#0a1520';ctx.fillRect(0,0,cw,ch);

        // Waves pattern
        const ox=this.camX,oy=this.camY;
        ctx.strokeStyle='rgba(30,60,90,.15)';ctx.lineWidth=1;
        for(let wy=-50;wy<ch+50;wy+=30){
            ctx.beginPath();
            for(let wx=-50;wx<cw+50;wx+=5){
                const wv=Math.sin((wx+ox)*.01+this.t*1.2+wy*.02)*4;
                ctx[wx===-50?'moveTo':'lineTo'](wx,wy+wv);
            }
            ctx.stroke();
        }

        // Camera transform
        ctx.save();
        ctx.translate(-ox,-oy);

        // ── ICEBERG ──
        if(Ship.iceberg){
            const ib=Ship.iceberg;
            ctx.fillStyle='#4a6a8a';
            ctx.beginPath();ctx.arc(ib.x,ib.y,ib.r,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#7aaccc';
            ctx.beginPath();ctx.arc(ib.x-5,ib.y-5,ib.r*.6,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#aaddee';
            ctx.beginPath();ctx.arc(ib.x-3,ib.y-8,ib.r*.3,0,Math.PI*2);ctx.fill();
            // Underwater part
            ctx.globalAlpha=.15;ctx.fillStyle='#2a4a6a';
            ctx.beginPath();ctx.arc(ib.x+5,ib.y+10,ib.r*2,0,Math.PI*2);ctx.fill();
            ctx.globalAlpha=1;
        }

        // ── SHIP (top-down) ──
        ctx.save();
        ctx.translate(Ship.x,Ship.y);
        ctx.rotate(Ship.heading);

        const L=Ship.length,W=Ship.width;

        // Wake behind ship
        if(Ship.speed>1){
            ctx.globalAlpha=.08;ctx.fillStyle='#8ac';
            ctx.beginPath();ctx.moveTo(-L*.5,0);ctx.lineTo(-L*.7,-W*1.5);ctx.lineTo(-L*.7,W*1.5);ctx.fill();
            ctx.globalAlpha=1;
        }

        // Hull shadow
        ctx.fillStyle='rgba(0,0,0,.3)';
        ctx.beginPath();
        ctx.moveTo(L*.48+3,3);ctx.lineTo(L*.2+3,W*.5+3);ctx.lineTo(-L*.45+3,W*.4+3);
        ctx.lineTo(-L*.48+3,3);ctx.lineTo(-L*.45+3,-W*.4+3);ctx.lineTo(L*.2+3,-W*.5+3);
        ctx.closePath();ctx.fill();

        // Hull
        ctx.fillStyle='#1a1a28';
        ctx.beginPath();
        ctx.moveTo(L*.48,0); // bow point
        ctx.lineTo(L*.2,W*.5);ctx.lineTo(-L*.45,W*.4);
        ctx.lineTo(-L*.48,0);ctx.lineTo(-L*.45,-W*.4);ctx.lineTo(L*.2,-W*.5);
        ctx.closePath();ctx.fill();
        ctx.strokeStyle='#3a3a5a';ctx.lineWidth=1.5;ctx.stroke();

        // Deck (lighter)
        ctx.fillStyle='#222238';
        ctx.beginPath();
        ctx.moveTo(L*.43,0);ctx.lineTo(L*.15,W*.38);ctx.lineTo(-L*.4,W*.3);
        ctx.lineTo(-L*.43,0);ctx.lineTo(-L*.4,-W*.3);ctx.lineTo(L*.15,-W*.38);
        ctx.closePath();ctx.fill();

        // Superstructure
        ctx.fillStyle='#2a2a3e';
        ctx.fillRect(-L*.15,-W*.25,L*.35,W*.5);

        // Bridge
        ctx.fillStyle='#3a4a5a';
        ctx.fillRect(L*.05,-W*.2,L*.08,W*.4);
        // Bridge windows
        if(Ship.powerOn){
            ctx.fillStyle='#ff8';ctx.globalAlpha=.6;
            for(let i=0;i<4;i++)ctx.fillRect(L*.06+i*4,-W*.15+i%2*W*.25,3,2);
            ctx.globalAlpha=1;
        }

        // Funnels (4)
        for(let i=0;i<4;i++){
            const fx=-L*.08+i*L*.07;
            ctx.fillStyle='#2a1a1a';ctx.fillRect(fx-3,-W*.12,6,W*.24);
            ctx.fillStyle='#1a0a0a';ctx.fillRect(fx-3,-W*.12,6,W*.06);
        }

        // Flooding overlay per compartment
        for(let i=0;i<Ship.comps.length;i++){
            const c=Ship.comps[i];
            if(c.flooded>3){
                const cx=L*.45-i*(L*.9/6)-L*.075;
                const cw2=L*.15;
                ctx.fillStyle=`rgba(20,60,140,${Math.min(.6,c.flooded/120)})`;
                ctx.fillRect(cx,-W*.35,cw2,W*.7);
            }
        }

        // Lifeboats on deck
        for(let i=0;i<Ship.boats.length;i++){
            const b=Ship.boats[i];
            if(b.launched)continue;
            const bx=b.localX*L;
            const by=b.side===0?-W*.42:W*.42;
            ctx.fillStyle=b.pax>0?'#8a8':'#665';
            ctx.fillRect(bx-3,by-1.5,6,3);
            if(b.pax>0){
                ctx.fillStyle='#ff0';ctx.font='bold 5px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
                ctx.fillText(b.pax,bx,by);
            }
        }

        // ── PEOPLE on deck ──
        for(const p of Ship.people){
            if(p.state==='inboat'||p.state==='dead')continue;
            const px=p.lx*L, py=p.ly*W*2;
            const sz=p.state==='panic'?2:1.5;
            ctx.fillStyle=p.state==='panic'?'#fa4':p.state==='toboat'?'#4f4':p.color;
            ctx.fillRect(px-sz/2,py-sz/2,sz,sz);
        }

        // Bow angle visual (water creeping)
        if(Ship.bowAngle>3){
            ctx.globalAlpha=Math.min(.5,Ship.bowAngle/30);
            ctx.fillStyle='#1a3a5a';
            const waterLine=L*.48-Ship.bowAngle*3;
            ctx.fillRect(waterLine,-W*.5,L*.5-waterLine+L*.5,W);
            ctx.globalAlpha=1;
        }

        ctx.restore(); // end ship rotation

        // Launched lifeboats in water
        for(const b of Ship.boats){
            if(!b.launched)continue;
            const wp=Ship.localToWorld(b.localX,b.side===0?-.6:.6);
            // Drift away slowly
            wp.x+=(b.side===0?-1:1)*Ship.timeElapsed*2;
            wp.y+=Math.sin(this.t+b.localX*10)*2;
            ctx.fillStyle='#887';
            ctx.fillRect(wp.x-4,wp.y-2,8,4);
            ctx.fillStyle='#ff0';ctx.font='bold 5px monospace';ctx.textAlign='center';
            ctx.fillText(b.pax,wp.x,wp.y);
        }

        ctx.restore(); // end camera

        // ── HUD ──
        this._drawHUD(ctx,cw,ch);
    },

    _drawHUD(ctx,cw,ch){
        const p=6,bh=28,fs=9;
        // Bottom panel
        const panelH=ch*.38;
        const panelY=ch-panelH;
        ctx.fillStyle='rgba(8,10,18,.92)';ctx.fillRect(0,panelY,cw,panelH);
        ctx.fillStyle='#1a1e28';ctx.fillRect(0,panelY,cw,2);

        // ── LEFT: Controls ──
        const ctrlW=cw*.3;
        let y=panelY+6;

        this._lbl(ctx,p,y,'УПРАВЛЕНИЕ');y+=14;

        // Rudder
        const rw=(ctrlW-20)/3;
        this._btn(p,y,rw,bh,'◄ ЛЕВО',Ship.rudder<-.3?'#2266aa':'#141a22',()=>{Ship.rudder=-1;});
        this._btn(p+rw+2,y,rw,bh,'ПРЯМО',Math.abs(Ship.rudder)<.3?'#226622':'#141a22',()=>{Ship.rudder=0;});
        this._btn(p+rw*2+4,y,rw,bh,'ПРАВО ►',Ship.rudder>.3?'#2266aa':'#141a22',()=>{Ship.rudder=1;});
        y+=bh+4;

        // Engine
        this._lbl(ctx,p,y,'МАШИНЫ');y+=12;
        const ew=(ctrlW-20)/5;
        const eL=['СТОП','МАЛ','ПОЛ','ПОЛН','НАЗ'];
        for(let i=0;i<5;i++){
            const col=Ship.engine===i?['#666','#242','#242','#442','#422'][i]:'#111418';
            this._btn(p+i*(ew+1),y,ew,bh*.8,eL[i],col,()=>{Ship.engine=i;if(i===0)this._log('МАШИННОЕ','Стоп машины!');});
        }
        y+=bh*.8+4;

        // Speed & heading
        ctx.fillStyle='#0a100a';ctx.fillRect(p,y,ctrlW-12,20);
        ctx.fillStyle='#4f8';ctx.font=`bold ${fs}px monospace`;ctx.textAlign='left';ctx.textBaseline='middle';
        const hdg=((Ship.heading*180/Math.PI)%360+360).toFixed(0);
        ctx.fillText(`${Ship.speed.toFixed(1)} уз  ${hdg}°`,p+4,y+10);
        y+=24;

        // Lifeboat buttons
        if(Ship.sinking){
            this._lbl(ctx,p,y,'ШЛЮПКИ');y+=12;
            const bw=(ctrlW-16)/2;
            this._btn(p,y,bw,bh,'🚣 Порт',Ship.boats.some(b=>!b.launched&&b.side===0)?'#2a4a4a':'#111',()=>this._launchSide(0));
            this._btn(p+bw+4,y,bw,bh,'🚣 Правый',Ship.boats.some(b=>!b.launched&&b.side===1)?'#2a4a4a':'#111',()=>this._launchSide(1));
            y+=bh+4;
            // SOS
            this._btn(p,y,ctrlW-12,bh*.8,'📡 SOS',Ship.distressSignaled?'#1a3a1a':'#3a2a1a',()=>{Ship.distressSignaled=true;this._log('РАДИСТ','SOS! Титаник тонет! 41°46N 50°14W');});
        }

        // ── CENTER: Ship status ──
        const statX=ctrlW+4;
        const statW=cw*.35;
        y=panelY+6;
        this._lbl(ctx,statX,y,'СОСТОЯНИЕ');y+=14;

        // Flooding bars per compartment
        for(let i=0;i<Ship.comps.length;i++){
            const c=Ship.comps[i];
            const bw2=statW/6-3;
            const bx=statX+i*(bw2+2);
            ctx.fillStyle='#0a0a14';ctx.fillRect(bx,y,bw2,bh*1.5);
            if(c.flooded>0){
                ctx.fillStyle=c.flooded>50?'#2244aa':'#224488';
                ctx.fillRect(bx,y+bh*1.5*(1-c.flooded/100),bw2,bh*1.5*(c.flooded/100));
            }
            ctx.strokeStyle=c.breached?'#f44':'#333';ctx.lineWidth=.5;ctx.strokeRect(bx,y,bw2,bh*1.5);
            ctx.fillStyle='#888';ctx.font='bold 6px monospace';ctx.textAlign='center';
            ctx.fillText(c.name,bx+bw2/2,y+bh*1.5+8);
            if(c.flooded>3){ctx.fillStyle='#4af';ctx.fillText(`${c.flooded|0}%`,bx+bw2/2,y+bh*.75);}
        }
        y+=bh*1.5+14;

        // Stats
        ctx.fillStyle='#888';ctx.font=`${fs}px monospace`;ctx.textAlign='left';
        const sl=(label,val,col)=>{ctx.fillStyle='#888';ctx.fillText(label,statX,y);ctx.fillStyle=col||'#ccc';ctx.fillText(val,statX+statW*.45,y);y+=13;};
        sl('Затопление',`${Ship.flooding.toFixed(1)}%`,Ship.flooding>50?'#f44':'#fa4');
        sl('Крен',`${Ship.bowAngle.toFixed(1)}°`,Ship.bowAngle>10?'#f44':'#fff');
        sl('Энергия',Ship.powerOn?'ВКЛ':'ОТКЛ',Ship.powerOn?'#4f4':'#f44');
        sl('Пассажиры',`${Ship.totalPax}`);
        sl('Эвакуировано',`${Math.floor(Ship.evacuated)}`,'#4f4');
        sl('Шлюпок спущ.',`${Ship.boatsLaunched}/20`);

        // ── RIGHT: Log ──
        const logX=statX+statW+8;
        const logW=cw-logX-4;
        const logY=panelY+6;
        ctx.fillStyle='#080a10';ctx.fillRect(logX,logY,logW,panelH-12);
        ctx.strokeStyle='#1a2a1a';ctx.lineWidth=.5;ctx.strokeRect(logX,logY,logW,panelH-12);
        this._lbl(ctx,logX+3,logY+2,'ЖУРНАЛ');
        ctx.font='7px monospace';let ly=logY+16;
        for(const m of this.log){
            if(ly>panelY+panelH-8)break;
            ctx.fillStyle='#4a8a4a';ctx.textAlign='left';ctx.fillText(m.f,logX+3,ly);
            ctx.fillStyle='#aaa';
            const maxW=logW-8;let line='',lineY=ly+9;
            for(const w of m.t.split(' ')){if(ctx.measureText(line+w+' ').width>maxW){ctx.fillText(line,logX+3,lineY);lineY+=9;line=w+' ';}else line+=w+' ';}
            ctx.fillText(line,logX+3,lineY);ly=lineY+10;
        }

        // Draw buttons
        for(const b of this.buttons){
            ctx.fillStyle=b.col;ctx.fillRect(b.x,b.y,b.w,b.h);
            ctx.fillStyle='rgba(255,255,255,.04)';ctx.fillRect(b.x,b.y,b.w,1);
            ctx.strokeStyle='rgba(255,255,255,.08)';ctx.lineWidth=.5;ctx.strokeRect(b.x,b.y,b.w,b.h);
            ctx.fillStyle='#ccc';ctx.font=`bold ${Math.min(9,b.h*.33)|0}px monospace`;ctx.textAlign='center';ctx.textBaseline='middle';
            ctx.fillText(b.label,b.x+b.w/2,b.y+b.h/2);
        }

        // Time
        const mins=this.t*4; // 4x speed
        const hrs=Math.floor(mins/60)+23;
        const m=Math.floor(mins%60);
        ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(cw/2-45,2,90,18);
        ctx.fillStyle='#4af';ctx.font='bold 11px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(`${hrs%24}:${m<10?'0':''}${m}`,cw/2,11);
    },

    _btn(x,y,w,h,label,col,fn){this.buttons.push({x,y,w,h,label,col,fn});},
    _lbl(ctx,x,y,t){ctx.fillStyle='#3a5a4a';ctx.font='bold 8px monospace';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText(t,x,y);},

    _launchSide(side){
        for(const b of Ship.boats){
            if(!b.launched&&b.side===side){
                const saved=Ship.launchBoat(Ship.boats.indexOf(b));
                this._log('ШЛЮПКА',`Шлюпка спущена! ${saved} человек.`);
                return;
            }
        }
        this._log('ОФИЦЕР','Нет шлюпок на этом борту!');
    },

    _drawMenu(ctx,cw,ch){
        ctx.fillStyle='#060a18';ctx.fillRect(0,0,cw,ch);
        for(let i=0;i<30;i++){ctx.fillStyle=`rgba(255,255,255,${.2+Math.sin(this.t+i)*.15})`;ctx.fillRect((Math.sin(i*7.3+1)*.5+.5)*cw,(Math.sin(i*3.1+2)*.5+.5)*ch*.5,1.5,1.5);}
        ctx.fillStyle='#4af';ctx.font='bold 34px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText('TITANIC',cw/2,ch*.18);
        ctx.fillStyle='#2a6a8a';ctx.font='14px monospace';ctx.fillText('14 апреля 1912',cw/2,ch*.18+32);
        ctx.fillStyle='#aaa';ctx.font='12px monospace';
        ctx.fillText('Вы управляете кораблём.',cw/2,ch*.42);
        ctx.fillText('Руль, машины, шлюпки — всё в ваших руках.',cw/2,ch*.48);
        ctx.fillText('Айсберг впереди. Спасите людей.',cw/2,ch*.56);
        ctx.fillStyle='#888';ctx.font='13px monospace';
        ctx.fillText('Нажмите чтобы начать',cw/2,ch*.75);
    },

    _drawEnd(ctx,cw,ch){
        ctx.fillStyle='rgba(0,0,10,.95)';ctx.fillRect(0,0,cw,ch);
        ctx.fillStyle='#4af';ctx.font='bold 24px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText('ТИТАНИК ЗАТОНУЛ',cw/2,ch*.1);
        const survived=Math.floor(Ship.evacuated);
        const dead=Ship.totalPax-survived;
        const pct=((survived/Ship.totalPax)*100).toFixed(1);
        ctx.fillStyle='#fff';ctx.font='14px monospace';
        ctx.fillText(`Пассажиров: ${Ship.totalPax}`,cw/2,ch*.3);
        ctx.fillStyle='#4f4';ctx.fillText(`Спасено: ${survived} (${pct}%)`,cw/2,ch*.37);
        ctx.fillStyle='#f44';ctx.fillText(`Погибло: ${dead}`,cw/2,ch*.44);
        ctx.fillStyle='#ff0';ctx.fillText(`Шлюпок: ${Ship.boatsLaunched}/20`,cw/2,ch*.51);
        ctx.fillStyle='#888';ctx.font='11px monospace';
        ctx.fillText('В реальности: 710 из 2200 (32%)',cw/2,ch*.62);
        const rating=pct>50?'Герой!':pct>32?'Лучше реальности':'Как в истории';
        ctx.fillStyle=pct>32?'#4f4':'#f44';ctx.font='bold 16px monospace';
        ctx.fillText(rating,cw/2,ch*.72);
        ctx.fillStyle='#555';ctx.font='12px monospace';ctx.fillText('Нажмите для рестарта',cw/2,ch*.88);
    }
};

window.addEventListener('load',()=>{document.getElementById('loading').style.display='none';G.init();});
