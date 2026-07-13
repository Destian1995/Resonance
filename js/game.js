// ============ TITANIC SIMULATOR — historically accurate ============
const G = {
    cv:null,ctx:null,lt:0,t:0,
    state:'menu',
    camX:0,camY:0,
    log:[],warned:false,
    timeScale:4, // 1 real sec = 4 game minutes
    gameMinutes:0,
    buttons:[],
    selectedBoat:-1,

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

    _click(p){
        if(this.state==='menu'){Ship.init();this.t=0;this.gameMinutes=0;this.log=[];this.warned=false;this.selectedBoat=-1;this.state='play';this._log('МОСТИК','14 апр. 23:00 — Титаник: 22.5 узлов, курс на Нью-Йорк.');this._log('РАДИСТ','Получены 6 ледовых предупреждений за день.');return;}
        if(this.state==='end'){this.state='menu';return;}
        for(const b of this.buttons)if(p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h){b.fn();return;}
    },

    _log(f,t){this.log.unshift({f,t});if(this.log.length>20)this.log.pop();},

    loop(time){
        const dt=Math.min((time-this.lt)/1000,.05);this.lt=time;this.t+=dt;
        if(this.state==='play')this._update(dt);
        this._draw();
        requestAnimationFrame(t=>this.loop(t));
    },

    _update(dt){
        this.gameMinutes+=dt*this.timeScale;
        Ship.update(dt, this.gameMinutes);
        this.camX=Ship.x-this.cv.width/2;
        this.camY=Ship.y-this.cv.height*.35;

        // Iceberg warning
        if(!this.warned&&Ship.iceberg){
            const bx=Ship.x+Math.cos(Ship.heading)*Ship.length*.45;
            const by=Ship.y+Math.sin(Ship.heading)*Ship.length*.45;
            const d=Math.sqrt((bx-Ship.iceberg.x)**2+(by-Ship.iceberg.y)**2);
            if(d<300){this.warned=true;this._log('ВПЕРЕДСМОТРЯЩИЙ','АЙСБЕРГ! ПРЯМО ПО КУРСУ!');this._log('','⚠ Дистанция ~500 ярдов! Решайте БЫСТРО!');}
        }
        if(Ship.hit&&!Ship._hitLogged){Ship._hitLogged=true;
            this._log('','💥 СТОЛКНОВЕНИЕ! Скрежет по правому борту!');
            this._log('БОЦМАН','Вода поступает в носовые отсеки!');
            this._log('ИНЖЕНЕР',`Пробито ${Ship.collisionSeverity+1} отсеков. Корабль может держаться с 4. Это приговор.`);
            this.timeScale=6;
        }
        if(!Ship.powerOn&&!Ship._powerLogged){Ship._powerLogged=true;this._log('МАШИННОЕ','Генераторы затоплены! Энергия отключается!');}
        if(!Ship.lightsOn&&!Ship._lightsLogged){Ship._lightsLogged=true;this._log('','Свет мигнул и погас. Темнота.');}
        if(Ship.broken&&!Ship._breakLogged){Ship._breakLogged=true;this._log('','💀 Корпус РАЗЛОМИЛСЯ НАДВОЕ! Грохот металла!');}
        if(Ship.sinking&&!Ship._warn30&&Ship.flooding>30){Ship._warn30=true;this._log('ИНЖЕНЕР','Затопление 30%. Ускорьте эвакуацию!');}
        if(Ship.sinking&&!Ship._warn60&&Ship.flooding>60){Ship._warn60=true;this._log('ИНЖЕНЕР','Затопление 60%! Палуба уходит!');}
        if(Ship.sinking&&!Ship._sosRemind&&Ship.minutesSinceHit>10&&!Ship.distressSignaled){Ship._sosRemind=true;this._log('ПОМОЩНИК','Сэр! Надо отправить SOS!');}
        if(Ship.sunk) this.state='end';

        // Auto-calculate carpet ETA
        if(Ship.distressSignaled) Ship.carpathiaETA=Math.max(0,240-Ship.minutesSinceHit);
    },

    _draw(){
        const ctx=this.ctx,cw=this.cv.width,ch=this.cv.height;
        this.buttons=[];
        if(this.state==='menu'){this._drawMenu(ctx,cw,ch);return;}
        if(this.state==='end'){this._drawEnd(ctx,cw,ch);return;}

        // ── OCEAN ──
        ctx.fillStyle='#081018';ctx.fillRect(0,0,cw,ch);
        const ox=this.camX,oy=this.camY;
        ctx.strokeStyle='rgba(25,50,70,.12)';ctx.lineWidth=1;
        for(let wy=-50;wy<ch+50;wy+=25){
            ctx.beginPath();
            for(let wx=-50;wx<cw+50;wx+=5){
                const wv=Math.sin((wx+ox)*.01+this.t*1.1+wy*.015)*3;
                ctx[wx===-50?'moveTo':'lineTo'](wx,wy+wv);
            }ctx.stroke();
        }

        ctx.save();ctx.translate(-ox,-oy);

        // Iceberg
        if(Ship.iceberg){
            const ib=Ship.iceberg;
            ctx.globalAlpha=.12;ctx.fillStyle='#2a4a6a';ctx.beginPath();ctx.arc(ib.x+3,ib.y+8,ib.r*2.2,0,Math.PI*2);ctx.fill();
            ctx.globalAlpha=1;ctx.fillStyle='#5a8aaa';ctx.beginPath();ctx.arc(ib.x,ib.y,ib.r,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#8abedc';ctx.beginPath();ctx.arc(ib.x-8,ib.y-8,ib.r*.5,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#b0daf0';ctx.beginPath();ctx.arc(ib.x-4,ib.y-12,ib.r*.25,0,Math.PI*2);ctx.fill();
        }

        // ── SHIP ──
        ctx.save();ctx.translate(Ship.x,Ship.y);ctx.rotate(Ship.heading);
        const L=Ship.length,W=Ship.width;

        // Wake
        if(Ship.speed>1){ctx.globalAlpha=.06;ctx.fillStyle='#8ac';ctx.beginPath();ctx.moveTo(-L*.5,0);ctx.lineTo(-L*.75,-W*1.5);ctx.lineTo(-L*.75,W*1.5);ctx.fill();ctx.globalAlpha=1;}

        // Shadow
        ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();
        ctx.moveTo(L*.48+2,2);ctx.lineTo(L*.18+2,W*.48+2);ctx.lineTo(-L*.44+2,W*.38+2);
        ctx.lineTo(-L*.47+2,2);ctx.lineTo(-L*.44+2,-W*.38+2);ctx.lineTo(L*.18+2,-W*.48+2);ctx.closePath();ctx.fill();

        // Hull
        ctx.fillStyle='#121828';ctx.beginPath();
        ctx.moveTo(L*.48,0);ctx.lineTo(L*.18,W*.48);ctx.lineTo(-L*.44,W*.38);
        ctx.lineTo(-L*.47,0);ctx.lineTo(-L*.44,-W*.38);ctx.lineTo(L*.18,-W*.48);ctx.closePath();ctx.fill();
        ctx.strokeStyle='#2a3050';ctx.lineWidth=1.5;ctx.stroke();

        // Deck
        ctx.fillStyle='#1a2238';ctx.beginPath();
        ctx.moveTo(L*.44,0);ctx.lineTo(L*.14,W*.36);ctx.lineTo(-L*.4,W*.28);
        ctx.lineTo(-L*.43,0);ctx.lineTo(-L*.4,-W*.28);ctx.lineTo(L*.14,-W*.36);ctx.closePath();ctx.fill();

        // Well deck areas (lower)
        ctx.fillStyle='#161e30';
        ctx.fillRect(L*.25,-W*.2,L*.08,W*.4); // fwd well deck
        ctx.fillRect(-L*.35,-W*.18,L*.08,W*.36); // aft well deck

        // Superstructure
        ctx.fillStyle='#222840';ctx.fillRect(-L*.12,-W*.22,L*.32,W*.44);
        // Officers quarters
        ctx.fillStyle='#2a3248';ctx.fillRect(L*.1,-W*.15,L*.08,W*.3);
        // Bridge
        ctx.fillStyle='#3a4a60';ctx.fillRect(L*.18,-W*.18,L*.05,W*.36);

        // 4 Funnels
        for(let i=0;i<4;i++){
            const fx=L*.06-i*L*.065;
            ctx.fillStyle=Ship.boilersLit[Math.min(i,5)]?'#2a1818':'#1a1218';
            ctx.beginPath();ctx.ellipse(fx,0,W*.12,W*.18,0,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#1a0a0a';ctx.beginPath();ctx.ellipse(fx,0,W*.06,W*.1,0,0,Math.PI*2);ctx.fill();
            // Smoke
            if(Ship.boilersLit[Math.min(i,5)]&&Ship.powerOn){
                ctx.globalAlpha=.1;ctx.fillStyle='#666';
                for(let s=0;s<3;s++){
                    ctx.beginPath();ctx.arc(fx+Math.sin(this.t*2+i+s)*3,-W*.22-s*5,3+s*2,0,Math.PI*2);ctx.fill();
                }ctx.globalAlpha=1;
            }
        }

        // Windows (rows along superstructure)
        for(let row=0;row<2;row++){
            const wy=W*(.12+row*.08)*(row%2?-1:1);
            for(let i=0;i<18;i++){
                const wx=-L*.1+i*L*.023;
                ctx.fillStyle=Ship.lightsOn?'rgba(255,220,100,.5)':'rgba(40,40,60,.3)';
                ctx.fillRect(wx,wy,2,2);
                ctx.fillRect(wx,-wy,2,2);
            }
        }

        // Flooding overlay
        for(let i=0;i<Ship.comps.length;i++){
            const c=Ship.comps[i];
            if(c.flooded>2){
                const cx=L*(.48-c.pos-c.len/2);
                const cw2=L*c.len;
                const alpha=Math.min(.55,c.flooded/120);
                ctx.fillStyle=`rgba(20,50,120,${alpha})`;
                ctx.fillRect(cx-cw2/2,-W*.35,cw2,W*.7);
            }
        }

        // Bow underwater
        if(Ship.bowAngle>3){
            ctx.globalAlpha=Math.min(.4,Ship.bowAngle/50);ctx.fillStyle='#0a1520';
            const waterX=L*(.48-Ship.bowAngle*.008);
            ctx.fillRect(waterX,-W*.5,L-waterX,W);ctx.globalAlpha=1;
        }

        // Break line
        if(Ship.broken){
            ctx.strokeStyle='#444';ctx.lineWidth=3;
            ctx.beginPath();ctx.moveTo(-L*.15,-W*.4);ctx.lineTo(-L*.12,W*.4);ctx.stroke();
        }

        // Lifeboats on davits
        for(let i=0;i<Ship.boats.length;i++){
            const b=Ship.boats[i];
            if(b.launched)continue;
            const bx=b.localX*L;
            const by=b.side===0?-W*.4:W*.4;
            ctx.fillStyle=b.pax>0?'#8a8':'#554';
            ctx.fillRect(bx-3,by-1.5,6,3);
            if(b.pax>0){ctx.fillStyle='#ff0';ctx.font='bold 4px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(b.pax,bx,by);}
            // Highlight selected
            if(i===this.selectedBoat){ctx.strokeStyle='#0f0';ctx.lineWidth=1;ctx.strokeRect(bx-5,by-3,10,6);}
        }

        // ── PEOPLE ──
        for(const p of Ship.people){
            if(p.state==='inboat'||p.state==='dead'||p.state==='saved')continue;
            const px=p.lx*L,py=p.ly*W*2;
            ctx.fillStyle=p.state==='water'?'#48f':p.state==='panic'?'#f84':p.state==='toboat'?'#4f4':p.state==='alarmed'?'#ff4':p.color;
            ctx.fillRect(px-1,py-1,2,2);
        }

        ctx.restore(); // ship transform

        // Launched boats drifting
        for(const b of Ship.boats){
            if(!b.launched)continue;
            const wp=Ship.localToWorld(b.localX,(b.side===0?-.7:.7));
            wp.x+=(b.side===0?-1:1)*Ship.minutesSinceHit*1.5;
            wp.y+=Math.sin(this.t+b.localX*5)*2;
            ctx.fillStyle='#776';ctx.fillRect(wp.x-4,wp.y-2,8,4);
        }

        ctx.restore(); // camera

        // ── HUD ──
        this._drawHUD(ctx,cw,ch);
    },

    _drawHUD(ctx,cw,ch){
        const panelH=ch*.4;const panelY=ch-panelH;
        ctx.fillStyle='rgba(6,8,16,.93)';ctx.fillRect(0,panelY,cw,panelH);
        ctx.fillStyle='#1a1e28';ctx.fillRect(0,panelY,cw,2);
        const p=5,bh=24,fs=8;
        let y;

        // ═══ COL1: HELM ═══
        const c1w=cw*.22;
        y=panelY+4;
        this._lbl(ctx,p,y,'РУЛЬ');y+=12;
        const rw=(c1w-12)/3;
        this._b(p,y,rw,bh,'◄ ЛЕВО',Ship.rudder<-.3?'#224488':'#111820',()=>{Ship.rudder=-1;});
        this._b(p+rw+2,y,rw,bh,'ПРЯМО',Math.abs(Ship.rudder)<.3?'#224422':'#111820',()=>{Ship.rudder=0;});
        this._b(p+rw*2+4,y,rw,bh,'ПРАВО ►',Ship.rudder>.3?'#224488':'#111820',()=>{Ship.rudder=1;});
        y+=bh+3;
        this._lbl(ctx,p,y,'МАШИНЫ');y+=11;
        const ew=(c1w-12)/5;
        const eL=['СТОП','МАЛ','ПОЛ','ПОЛН','НАЗ'];
        for(let i=0;i<5;i++)this._b(p+i*(ew+1),y,ew,bh*.7,eL[i],Ship.engine===i?['#555','#232','#232','#442','#422'][i]:'#0e1218',()=>{Ship.engine=i;});
        y+=bh*.7+3;
        // Readout
        ctx.fillStyle='#080e08';ctx.fillRect(p,y,c1w-8,16);
        ctx.fillStyle='#4f8';ctx.font='bold 8px monospace';ctx.textAlign='left';ctx.textBaseline='middle';
        const hdg=((Ship.heading*180/Math.PI)%360+360).toFixed(0);
        ctx.fillText(`${Ship.speed.toFixed(1)}уз ${hdg}°`,p+3,y+8);
        y+=20;
        // WT doors
        if(Ship.sinking){
            this._b(p,y,c1w-8,bh*.7,Ship.wtDoorsOpen?'🚪 ЗАКРЫТЬ ВТ ДВЕРИ':'🔒 ВТ ДВЕРИ ЗАКРЫТЫ',Ship.wtDoorsOpen?'#442222':'#1a3a1a',()=>{Ship.wtDoorsOpen=!Ship.wtDoorsOpen;this._log('МОСТИК',Ship.wtDoorsOpen?'Водонепроницаемые двери ОТКРЫТЫ!':'ВТ двери задраены.');});
            y+=bh*.7+3;
            this._b(p,y,(c1w-12)/2,bh*.7,'📡 SOS',Ship.distressSignaled?'#1a3a1a':'#3a2a1a',()=>{if(!Ship.distressSignaled){Ship.distressSignaled=true;this._log('РАДИСТ','CQD CQD SOS — RMS TITANIC — 41°46\'N 50°14\'W');this._log('РАДИСТ','Карпатия ответила! ETA 4 часа.');}});
            this._b(p+(c1w-12)/2+4,y,(c1w-12)/2,bh*.7,`⏱ x${this.timeScale}`,null,()=>{this.timeScale=this.timeScale===6?2:this.timeScale===2?1:6;});
        }

        // ═══ COL2: COMPARTMENTS ═══
        const c2x=c1w+6,c2w=cw*.28;
        y=panelY+4;
        this._lbl(ctx,c2x,y,'ОТСЕКИ (16)');y+=12;
        const compH=panelH-50;
        const cBh=Math.min(14,(compH-8)/16);
        for(let i=0;i<Ship.comps.length;i++){
            const c=Ship.comps[i];
            const by=y+i*(cBh+1);
            const bw=c2w-8;
            ctx.fillStyle='#0a0a14';ctx.fillRect(c2x,by,bw,cBh);
            if(c.flooded>0){
                ctx.fillStyle=c.flooded>60?'#1a3388':c.flooded>30?'#1a2a66':'#1a2244';
                ctx.fillRect(c2x,by,bw*(c.flooded/100),cBh);
            }
            ctx.strokeStyle=c.breached?'#f44':'#222';ctx.lineWidth=.5;ctx.strokeRect(c2x,by,bw,cBh);
            ctx.fillStyle=c.breached?'#f88':'#666';ctx.font=`${Math.min(7,cBh-2)}px monospace`;ctx.textAlign='left';ctx.textBaseline='middle';
            ctx.fillText(c.name,c2x+2,by+cBh/2);
            if(c.flooded>1){ctx.fillStyle='#8af';ctx.textAlign='right';ctx.fillText(`${c.flooded.toFixed(0)}%`,c2x+bw-2,by+cBh/2);}
        }
        // Total
        ctx.fillStyle=Ship.flooding>50?'#f44':'#fa4';ctx.font='bold 8px monospace';ctx.textAlign='left';
        ctx.fillText(`Общее: ${Ship.flooding.toFixed(1)}%  Крен: ${Ship.bowAngle.toFixed(1)}°`,c2x,y+16*(cBh+1)+4);

        // ═══ COL3: LIFEBOATS + STATUS ═══
        const c3x=c2x+c2w+6,c3w=cw*.22;
        y=panelY+4;
        this._lbl(ctx,c3x,y,'ШЛЮПКИ');y+=12;

        // Boat list (scrollable via next/prev)
        const visBoats=Math.min(8,Math.floor((panelH-80)/16));
        for(let vi=0;vi<visBoats;vi++){
            const bi=vi;if(bi>=Ship.boats.length)break;
            const b=Ship.boats[bi];
            const bw=c3w-8,by2=y+vi*17;
            ctx.fillStyle=b.launched?'#0a1a0a':bi===this.selectedBoat?'#1a2a3a':'#0c0e14';
            ctx.fillRect(c3x,by2,bw,15);
            ctx.strokeStyle=bi===this.selectedBoat?'#0f0':'#1a1a2a';ctx.lineWidth=.5;ctx.strokeRect(c3x,by2,bw,15);
            ctx.fillStyle=b.launched?'#4a4':'#aaa';ctx.font='7px monospace';ctx.textAlign='left';ctx.textBaseline='middle';
            const side=b.side===0?'пр':'лв';
            const status=b.launched?'✓спущ':`${b.pax}/${b.cap}`;
            ctx.fillText(`#${b.id} ${side} ${status}`,c3x+3,by2+8);
            if(!b.launched){
                // Click to select
                this._b(c3x,by2,bw,15,'',null,()=>{this.selectedBoat=bi;});
            }
        }
        y+=visBoats*17+4;
        // Launch selected
        if(this.selectedBoat>=0&&!Ship.boats[this.selectedBoat]?.launched){
            this._b(c3x,y,c3w-8,bh,'🚣 СПУСТИТЬ ШЛЮПКУ','#2a4a4a',()=>{
                const r=Ship.launchBoat(this.selectedBoat);
                if(r.launched)this._log('ШЛЮПКА',`#${r.id} спущена! ${r.pax} из ${r.cap} мест.`);
                this.selectedBoat=-1;
            });
            y+=bh+3;
        }
        // Stats
        ctx.fillStyle='#888';ctx.font='8px monospace';ctx.textAlign='left';
        const sl=(l,v,c2)=>{ctx.fillStyle='#666';ctx.fillText(l,c3x,y);ctx.fillStyle=c2||'#ccc';ctx.fillText(v,c3x+c3w*.5,y);y+=12;};
        sl('Пассажиры',`${Ship.totalPax}`);
        sl('В шлюпках',`${Ship.inBoats}`,'#ff0');
        sl('Спасено',`${Math.floor(Ship.evacuated)}`,'#4f4');
        sl('Энергия',Ship.powerOn?'ВКЛ':'ОТКЛ',Ship.powerOn?'#4f4':'#f44');
        if(Ship.distressSignaled)sl('Карпатия',`${Math.floor(Ship.carpathiaETA)} мин`,'#4af');

        // ═══ COL4: LOG ═══
        const c4x=c3x+c3w+6,c4w=cw-c4x-4;
        const logY=panelY+4;
        ctx.fillStyle='#060810';ctx.fillRect(c4x,logY,c4w,panelH-8);
        ctx.strokeStyle='#1a1e2a';ctx.lineWidth=.5;ctx.strokeRect(c4x,logY,c4w,panelH-8);
        this._lbl(ctx,c4x+3,logY+2,'ЖУРНАЛ');
        ctx.font='7px monospace';let ly=logY+14;
        for(const m of this.log){
            if(ly>panelY+panelH-8)break;
            ctx.fillStyle='#4a8a4a';ctx.textAlign='left';ctx.fillText(m.f,c4x+3,ly);
            ctx.fillStyle='#aaa';
            const maxW=c4w-8;let line='',lineY=ly+9;
            for(const w of m.t.split(' ')){if(ctx.measureText(line+w+' ').width>maxW){ctx.fillText(line,c4x+3,lineY);lineY+=9;line=w+' ';}else line+=w+' ';}
            ctx.fillText(line,c4x+3,lineY);ly=lineY+10;
        }

        // Time display
        const mins=this.gameMinutes;
        const hrs=Math.floor(mins/60)+23;
        const m=Math.floor(mins%60);
        ctx.fillStyle='rgba(0,0,0,.7)';ctx.fillRect(cw/2-50,2,100,20);
        ctx.strokeStyle='#4a6';ctx.lineWidth=1;ctx.strokeRect(cw/2-50,2,100,20);
        ctx.fillStyle='#4af';ctx.font='bold 12px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(`${hrs%24}:${m<10?'0':''}${m}`,cw/2,12);
        // Mins since hit
        if(Ship.sinking){
            ctx.fillStyle='#f88';ctx.font='9px monospace';
            ctx.fillText(`+${Ship.minutesSinceHit.toFixed(0)} мин`,cw/2,26);
        }

        // Draw button overlays
        for(const b of this.buttons){
            if(!b.col)continue;
            ctx.fillStyle=b.col;ctx.fillRect(b.x,b.y,b.w,b.h);
            ctx.fillStyle='rgba(255,255,255,.03)';ctx.fillRect(b.x,b.y,b.w,1);
            ctx.strokeStyle='rgba(255,255,255,.06)';ctx.lineWidth=.5;ctx.strokeRect(b.x,b.y,b.w,b.h);
            if(b.label){ctx.fillStyle='#ccc';ctx.font=`bold ${Math.min(9,b.h*.38)|0}px monospace`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(b.label,b.x+b.w/2,b.y+b.h/2);}
        }
    },

    _b(x,y,w,h,label,col,fn){this.buttons.push({x,y,w,h,label,col,fn});},
    _lbl(ctx,x,y,t){ctx.fillStyle='#3a5a4a';ctx.font='bold 8px monospace';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText(t,x,y);},

    _drawMenu(ctx,cw,ch){
        ctx.fillStyle='#040810';ctx.fillRect(0,0,cw,ch);
        for(let i=0;i<40;i++){ctx.fillStyle=`rgba(255,255,255,${.15+Math.sin(this.t+i)*.1})`;ctx.fillRect((Math.sin(i*7.3+1)*.5+.5)*cw,(Math.sin(i*3.1+2)*.5+.5)*ch*.4,1.5,1.5);}
        ctx.fillStyle='#4af';ctx.font='bold 34px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText('TITANIC',cw/2,ch*.12);
        ctx.fillStyle='#2a6a8a';ctx.font='13px monospace';ctx.fillText('Симулятор — 14 апреля 1912',cw/2,ch*.12+30);
        ctx.fillStyle='#ccc';ctx.font='11px monospace';
        const lines=[
            'Исторически достоверная модель:',
            '• 16 водонепроницаемых отсеков, 15 переборок',
            '• 20 шлюпок (1178 мест на 2224 человека)',
            '• Реальный порядок спуска шлюпок',
            '• Затопление 6 отсеков по правому борту',
            '• Корабль ломается надвое при крене 30°+',
            '',
            'Вы управляете рулём и машинами.',
            'Спускайте шлюпки. Спасите людей.',
            'В реальности выжили 710 (32%).'
        ];
        for(let i=0;i<lines.length;i++){
            ctx.fillStyle=i===0?'#ff0':lines[i][0]==='•'?'#8aa':'#888';
            ctx.fillText(lines[i],cw/2,ch*.3+i*18);
        }
        ctx.fillStyle='#888';ctx.font='14px monospace';ctx.fillText('Нажмите чтобы начать',cw/2,ch*.85);
    },

    _drawEnd(ctx,cw,ch){
        ctx.fillStyle='rgba(0,0,8,.96)';ctx.fillRect(0,0,cw,ch);
        ctx.fillStyle='#4af';ctx.font='bold 26px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText('RMS TITANIC',cw/2,ch*.08);
        ctx.fillStyle='#688';ctx.font='12px monospace';ctx.fillText('15 апреля 1912, 02:20',cw/2,ch*.08+24);

        const surv=Math.floor(Ship.evacuated);
        const dead=Ship.totalPax-surv;
        const pct=((surv/Ship.totalPax)*100).toFixed(1);
        const ly=ch*.22,sp=26;
        ctx.fillStyle='#fff';ctx.font='13px monospace';
        ctx.fillText(`На борту: ${Ship.totalPax} человек`,cw/2,ly);
        ctx.fillStyle='#4f4';ctx.fillText(`Спасено: ${surv} (${pct}%)`,cw/2,ly+sp);
        ctx.fillStyle='#f44';ctx.fillText(`Погибло: ${dead}`,cw/2,ly+sp*2);
        ctx.fillStyle='#ff0';ctx.fillText(`Шлюпок спущено: ${Ship.boatsLaunched} из 20`,cw/2,ly+sp*3);
        ctx.fillStyle='#4af';ctx.fillText(`Время от удара до гибели: ${Ship.minutesSinceHit.toFixed(0)} мин`,cw/2,ly+sp*4);
        ctx.fillStyle='#888';ctx.font='11px monospace';
        ctx.fillText(`Историческая справка: 710 выживших из 2224 (32%)`,cw/2,ly+sp*5.5);
        ctx.fillText(`Реальное время затопления: 160 минут`,cw/2,ly+sp*6.5);
        const rating=pct>50?'ГЕРОЙ — вы спасли больше половины!':pct>32?'Лучше реальности!':pct>20?'Близко к истории':'Катастрофа...';
        ctx.fillStyle=pct>32?'#4f4':'#f44';ctx.font='bold 15px monospace';ctx.fillText(rating,cw/2,ly+sp*8);
        ctx.fillStyle='#555';ctx.font='12px monospace';ctx.fillText('Нажмите для рестарта',cw/2,ch*.92);
    }
};

window.addEventListener('load',()=>{document.getElementById('loading').style.display='none';G.init();});
