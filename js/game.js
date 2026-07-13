// ============ GAME — pure TD, no hero ============
const Game = {
    state:ST.MENU, canvas:null, ctx:null, lastTime:0,
    wave:0, gold:0, kills:0, coreHp:CFG.CORE_HP,
    buildTimer:0, upgradeChoices:[], selectedTower:null,
    phase:'build', time:0,
    // Stats tracking
    stats: { goldSpent:0, goldEarned:0, towersBuilt:0, towersSold:0, spellsCast:0,
             towersByType:{}, enemiesReachedCore:0, maxWave:0, damageDealt:0 },
    endTimer:0,  // delay before showing stats

    init(){
        this.canvas=document.getElementById('game');
        this.ctx=this.canvas.getContext('2d');
        this._resize();
        window.addEventListener('resize',()=>this._resize());
        Input.init(this.canvas);Snd.init();
        this.lastTime=performance.now();
        requestAnimationFrame(t=>this.loop(t));
    },
    _resize(){this.canvas.width=window.innerWidth;this.canvas.height=window.innerHeight;this.ctx.imageSmoothingEnabled=false;Cam.init(this.canvas.width,this.canvas.height);},

    startGame(si){
        World.generate();Buildings.clear();Enemies.clear();FX.clear();
        Spells.init(si);
        this.wave=0;this.gold=CFG.START_GOLD;this.kills=0;this.coreHp=CFG.CORE_HP;
        this.selectedTower='arrow';this.phase='build';this.buildTimer=CFG.BUILD_TIME;this.time=0;
        this.endTimer=0;
        this.stats={goldSpent:0,goldEarned:CFG.START_GOLD,towersBuilt:0,towersSold:0,spellsCast:0,
                    towersByType:{},enemiesReachedCore:0,maxWave:0,damageDealt:0};
        // Center camera on map
        Cam.x=World.centerX-Cam.w/2;Cam.y=World.centerY-Cam.h/2;
        this.state=ST.BUILD;
    },
    startWave(){this.wave++;this.phase='wave';Enemies.spawnWave(this.wave);if(this.wave%CFG.BOSS_EVERY===0)Enemies.spawnBoss(this.wave);Snd.play('wave');this.state=ST.WAVE;},
    endWave(){
        this.gold+=CFG.GOLD_PER_WAVE;this.stats.goldEarned+=CFG.GOLD_PER_WAVE;
        this.stats.maxWave=Math.max(this.stats.maxWave,this.wave);
        if(this.wave>=CFG.WAVE_MAX){this.endTimer=0;this.state=ST.WIN;return;}
        this.upgradeChoices=Upgrades.buildChoices(this.wave);this.state=ST.UPGRADE;
    },

    loop(time){
        const dt=Math.min((time-this.lastTime)/1000,.05);this.lastTime=time;this.time+=dt;
        Input.update();
        const ctx=this.ctx,cw=this.canvas.width,ch=this.canvas.height;
        ctx.fillStyle='#080810';ctx.fillRect(0,0,cw,ch);
        switch(this.state){
            case ST.MENU:this._updateMenu();this._drawMenu(ctx,cw,ch);break;
            case ST.BUILD:this._updateBuild(dt);this._drawGame(ctx,cw,ch);break;
            case ST.WAVE:this._updateWave(dt);this._drawGame(ctx,cw,ch);break;
            case ST.UPGRADE:this._updateUpgrade(cw,ch);this._drawUpgrade(ctx,cw,ch);break;
            case ST.WIN:this._updateEnd();this._drawEnd(ctx,cw,ch,true);break;
            case ST.OVER:this._updateEnd();this._drawEnd(ctx,cw,ch,false);break;
        }
        Input.endFrame();requestAnimationFrame(t=>this.loop(t));
    },

    // ══ MENU ══
    _updateMenu(){
        if(!Input.tapped)return;
        const cw=this.canvas.width,ch=this.canvas.height,mob=Input.mobile||cw<600;
        const pw=mob?Math.min(cw*.88,320):220,ph=mob?100:250,gap=mob?12:20;
        for(let i=0;i<3;i++){
            let px,py;
            if(mob){px=(cw-pw)/2;py=ch*.25+i*(ph+gap);}
            else{px=(cw-(pw*3+gap*2))/2+i*(pw+gap);py=ch*.25;}
            if(Input.tapX>=px&&Input.tapX<=px+pw&&Input.tapY>=py&&Input.tapY<=py+ph){
                Snd.resume();Snd.play('lvl');this.startGame(i);return;
            }
        }
    },
    _drawMenu(ctx,cw,ch){
        const mob=Input.mobile||cw<600,t=this.time;
        // BG particles
        for(let i=0;i<15;i++){
            ctx.globalAlpha=.04;ctx.fillStyle=['#0ff','#f60','#4cf'][i%3];
            ctx.beginPath();ctx.arc((Math.sin(i*1.3+t*.2)*.5+.5)*cw,(Math.cos(i*1.7+t*.15)*.5+.5)*ch,25+Math.sin(t+i)*8,0,Math.PI*2);ctx.fill();
        }
        ctx.globalAlpha=1;
        this._txt('RESONANCE',cw/2,ch*.06,'#0ff',mob?26:44,'center');
        this._txt('TOWER DEFENSE',cw/2,ch*.06+(mob?24:40),'#088',mob?13:18,'center');
        this._txt('Выбери специализацию',cw/2,ch*.18,'#aaa',mob?11:14,'center');

        const pw=mob?Math.min(cw*.88,320):220,ph=mob?100:250,gap=mob?12:20;
        for(let i=0;i<3;i++){
            const s=SPECS[i];
            let px,py;
            if(mob){px=(cw-pw)/2;py=ch*.25+i*(ph+gap);}
            else{px=(cw-(pw*3+gap*2))/2+i*(pw+gap);py=ch*.25;}

            const grad=ctx.createLinearGradient(px,py,px,py+ph);
            grad.addColorStop(0,'#151528');grad.addColorStop(1,'#0e0e1a');
            ctx.fillStyle=grad;ctx.fillRect(px,py,pw,ph);
            ctx.fillStyle=s.color;ctx.fillRect(px,py,4,ph);
            ctx.strokeStyle=s.color;ctx.lineWidth=1.5;ctx.strokeRect(px,py,pw,ph);

            if(mob){
                ctx.fillStyle=s.color;ctx.font='28px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
                ctx.fillText(s.icon,px+30,py+ph/2);
                this._txt(s.name,px+60,py+18,s.color,16,'left');
                this._txt(s.desc,px+60,py+40,'#bbb',9,'left');
                for(let a=0;a<3;a++) this._txt(`${s.spells[a].icon} ${s.spells[a].name}`,px+60,py+58+a*14,'#aaa',8,'left');
            } else {
                ctx.fillStyle=s.color;ctx.font='36px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
                ctx.fillText(s.icon,px+pw/2,py+45);
                this._txt(s.name,px+pw/2,py+85,s.color,20,'center');
                this._txt(s.desc,px+pw/2,py+110,'#bbb',10,'center');
                for(let a=0;a<3;a++){
                    const sp=s.spells[a];
                    this._txt(`${sp.icon} ${sp.name}`,px+12,py+140+a*22,sp.color,10,'left');
                    this._txt(sp.desc,px+12,py+153+a*22,'#888',8,'left');
                }
            }
        }
        this._txt(mob?'Тап = строить башни!':'Тап строит башни. Защищай ядро!',cw/2,ch*.95,'#555',mob?9:11,'center');
    },

    // ══ BUILD ══
    _updateBuild(dt){
        this.buildTimer-=dt;FX.update(dt);Spells.update(dt);
        if(Input.tapped){
            const wp=Cam.screenToWorld(Input.tapX,Input.tapY);
            const hex=U.pixelToHex(wp.x,wp.y);
            const cell=World.getCell(hex.q,hex.r);
            if(cell&&cell.building){
                if(!Buildings.upgrade(hex.q,hex.r)){
                    const refund=Buildings.sell(hex.q,hex.r);
                    if(refund>0){this.gold+=refund;this.stats.towersSold++;}
                } else {
                    this.stats.goldSpent+=Math.floor(cell.building.def.cost*.7);
                }
            } else if(this.selectedTower){
                const def=TOWER_DEFS[this.selectedTower];
                if(def&&this.gold>=def.cost&&Buildings.place(hex.q,hex.r,this.selectedTower)){
                    this.gold-=def.cost;
                    this.stats.goldSpent+=def.cost;
                    this.stats.towersBuilt++;
                    this.stats.towersByType[this.selectedTower]=(this.stats.towersByType[this.selectedTower]||0)+1;
                }
            }
        }
        if(this.buildTimer<=0)this.startWave();
    },

    // ══ WAVE ══
    _updateWave(dt){
        Spells.update(dt);
        Buildings.update(dt,Enemies.list);
        Enemies.update(dt);
        FX.update(dt);Cam.update(dt);
        if(this.coreHp<=0){
            this.coreHp=0;Snd.play('death');
            this.stats.maxWave=Math.max(this.stats.maxWave,this.wave);
            this.endTimer=0;
            // Core explosion VFX
            FX.ring(World.centerX,World.centerY,'#f44',120,.6);
            FX.ring(World.centerX,World.centerY,'#f80',80,.4);
            FX.sparkle(World.centerX,World.centerY,'#f44',25,120);
            FX.doFlash('#f00',.4);Cam.addShake(12);
            this.state=ST.OVER;return;
        }
        if(Enemies.list.length===0)this.endWave();
    },

    // ══ DRAW ══
    _drawGame(ctx,cw,ch){
        Cam.begin(ctx);
        World.draw(ctx,this.phase,this.time);
        Buildings.draw(ctx,this.time);
        Enemies.draw(ctx);
        FX.drawWorld(ctx);

        // Build: hover hex
        if(this.state===ST.BUILD){
            const wp=Cam.screenToWorld(Input.tapX||cw/2,Input.tapY||ch/2);
            const hex=U.pixelToHex(wp.x,wp.y);
            const hp=U.hexToPixel(hex.q,hex.r);
            const canB=World.canBuild(hex.q,hex.r);
            U.drawHex(ctx,hp.x,hp.y,CFG.HEX_R-2,null,canB?'rgba(0,255,100,.25)':'rgba(255,60,60,.25)');
        }
        Cam.end(ctx);

        // Night overlay
        if(this.phase==='wave'){
            ctx.globalAlpha=.3;ctx.fillStyle='#000018';ctx.fillRect(0,0,cw,ch);
            // Core light
            const cpx=World.centerX-Cam.x+Cam.sx,cpy=World.centerY-Cam.y+Cam.sy;
            const grad=ctx.createRadialGradient(cpx,cpy,60,cpx,cpy,250);
            grad.addColorStop(0,'rgba(0,0,20,0)');grad.addColorStop(1,'rgba(0,0,20,.3)');
            ctx.globalAlpha=1;ctx.fillStyle=grad;ctx.fillRect(0,0,cw,ch);
        }

        this._drawHUD(ctx,cw,ch);
        FX.drawScreen(ctx,cw,ch);
    },

    _drawHUD(ctx,cw,ch){
        const p=8,mob=Input.mobile;

        // Core HP bar (top center)
        const coreW=Math.min(220,cw*.35);
        const cx=(cw-coreW)/2;
        ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(cx-2,p-2,coreW+4,18);
        ctx.fillStyle='#112';ctx.fillRect(cx,p,coreW,14);
        const hpR=this.coreHp/CFG.CORE_HP;
        ctx.fillStyle=hpR>.5?'#4af':hpR>.25?'#fa0':'#f44';
        ctx.fillRect(cx,p,coreW*hpR,14);
        ctx.strokeStyle='#444';ctx.lineWidth=1;ctx.strokeRect(cx,p,coreW,14);
        this._txt(`💎 ${Math.ceil(this.coreHp)}/${CFG.CORE_HP}`,cw/2,p+7,'#fff',10,'center');

        // Gold (left)
        this._txt(`💰 ${this.gold}`,p,p+7,'#ff0',13,'left');
        // Wave (right)
        this._txt(`${this.wave}/${CFG.WAVE_MAX}`,cw-p,p+7,'#aaa',12,'right');

        // Phase
        if(this.state===ST.BUILD){
            const tl=Math.ceil(this.buildTimer);
            this._txt(`☀ ДЕНЬ — ${tl}с`,cw/2,p+26,'#ff0',11,'center');
        } else {
            this._txt(`🌙 ВОЛНА ${this.wave}`,cw/2,p+26,'#f66',11,'center');
            this._txt(`x${Enemies.list.length}`,cw-p,p+22,'#888',9,'right');
        }

        // Build palette
        if(this.state===ST.BUILD){
            const types=['arrow','fire','ice','lightning','cannon','wall','trap','heal'];
            const bsz=mob?46:52,gap=4;
            const totalW=types.length*(bsz+gap);
            const sx=(cw-totalW)/2,by=ch-(mob?85:60);

            ctx.fillStyle='rgba(0,0,0,.7)';
            ctx.fillRect(sx-6,by-20,totalW+12,bsz+28);

            // Scroll hint
            this._txt('Тап на башню = апгрейд. Ещё раз = продать.',cw/2,by-10,'#666',8,'center');

            for(let i=0;i<types.length;i++){
                const t=types[i],def=TOWER_DEFS[t];
                const bx=sx+i*(bsz+gap),sel=this.selectedTower===t,afford=this.gold>=def.cost;

                ctx.fillStyle=sel?'#2a2a4a':'#12121e';
                ctx.fillRect(bx,by,bsz,bsz);
                ctx.strokeStyle=sel?def.color:(afford?'#444':'#1a1a1a');
                ctx.lineWidth=sel?2:1;
                ctx.strokeRect(bx,by,bsz,bsz);

                // Icon
                ctx.fillStyle=afford?def.color:'#333';
                ctx.font=`${mob?16:18}px monospace`;ctx.textAlign='center';ctx.textBaseline='middle';
                ctx.fillText(def.icon,bx+bsz/2,by+bsz/2-8);
                this._txt(`${def.cost}`,bx+bsz/2,by+bsz-10,afford?'#ff0':'#444',9,'center');

                // Tap to select
                if(Input.tapped&&Input.tapY>=by&&Input.tapY<=by+bsz&&Input.tapX>=bx&&Input.tapX<=bx+bsz){
                    this.selectedTower=t;Input.tapped=false;
                }
            }
        }

        // Spell buttons (both phases, bottom-right)
        const spec=SPECS[Spells.specIdx];
        const ssz=mob?50:46,sg=8;
        const sax=cw-p-ssz;
        for(let i=0;i<3;i++){
            const say=ch*.35+i*(ssz+sg);
            const cd=Spells.cooldowns[i],sp=spec.spells[i],ready=cd<=0;
            ctx.fillStyle=ready?'#1a2a3a':'#0e0e14';
            ctx.fillRect(sax,say,ssz,ssz);
            ctx.strokeStyle=ready?sp.color:'#222';ctx.lineWidth=ready?2:1;
            ctx.strokeRect(sax,say,ssz,ssz);
            if(!ready){ctx.globalAlpha=.35;ctx.fillStyle='#000';ctx.fillRect(sax,say,ssz,ssz*(cd/sp.cd));ctx.globalAlpha=1;}
            ctx.fillStyle=ready?'#fff':'#555';
            ctx.font=`${mob?20:18}px monospace`;ctx.textAlign='center';ctx.textBaseline='middle';
            ctx.fillText(sp.icon,sax+ssz/2,say+ssz/2);
            if(!ready)this._txt(`${Math.ceil(cd/1000)}`,sax+ssz/2,say+ssz-8,'#888',8,'center');

            if(Input.tapped&&Input.tapX>=sax&&Input.tapX<=sax+ssz&&Input.tapY>=say&&Input.tapY<=say+ssz){
                Spells.cast(i,Enemies.list);Input.tapped=false;
            }
        }

        // Kills counter
        this._txt(`☠ ${this.kills}`,p,ch-p-6,'#888',10,'left');
    },

    // ══ UPGRADE ══
    _updateUpgrade(cw,ch){
        if(!Input.tapped)return;
        const pw=Math.min(340,cw*.88),ph=70,gap=12,sx=(cw-pw)/2;
        for(let i=0;i<this.upgradeChoices.length;i++){
            const py=ch*.3+i*(ph+gap);
            if(Input.tapX>=sx&&Input.tapX<=sx+pw&&Input.tapY>=py&&Input.tapY<=py+ph){
                this.upgradeChoices[i].apply();Snd.play('lvl');
                this.phase='build';this.buildTimer=CFG.BUILD_TIME;this.state=ST.BUILD;return;
            }
        }
    },
    _drawUpgrade(ctx,cw,ch){
        this._drawGame(ctx,cw,ch);
        ctx.fillStyle='rgba(0,0,15,.85)';ctx.fillRect(0,0,cw,ch);
        ctx.fillStyle='#22a';ctx.fillRect(0,ch*.08,cw,40);
        this._txt(`Волна ${this.wave} пройдена!`,cw/2,ch*.08+20,'#0ff',20,'center');
        this._txt('Выбери улучшение',cw/2,ch*.22,'#ccc',12,'center');
        const pw=Math.min(340,cw*.88),ph=70,gap=12,sx=(cw-pw)/2;
        for(let i=0;i<this.upgradeChoices.length;i++){
            const c=this.upgradeChoices[i],py=ch*.3+i*(ph+gap);
            ctx.fillStyle='#1a1a30';ctx.fillRect(sx,py,pw,ph);
            ctx.fillStyle=c.color;ctx.fillRect(sx,py,3,ph);
            ctx.strokeStyle=c.color;ctx.lineWidth=1.5;ctx.strokeRect(sx,py,pw,ph);
            ctx.fillStyle=c.color;ctx.beginPath();ctx.arc(sx+30,py+ph/2,16,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#000';ctx.font='bold 16px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
            ctx.fillText(c.icon,sx+30,py+ph/2);
            this._txt(c.name,sx+56,py+22,'#fff',13,'left');
            this._txt(c.desc,sx+56,py+48,'#aaa',10,'left');
        }
    },

    // ══ END — animated stats screen ══
    _updateEnd(){
        this.endTimer+=.016; // ~60fps
        FX.update(.016);
        if(Input.tapped&&this.endTimer>1.5)this.state=ST.MENU;
    },
    _drawEnd(ctx,cw,ch,won){
        // Background — keep showing the game frozen
        Cam.begin(ctx);
        World.draw(ctx,this.phase,this.time);
        Buildings.draw(ctx,this.time);
        Enemies.draw(ctx);
        FX.drawWorld(ctx);
        Cam.end(ctx);

        // Dark overlay fades in
        const fadeIn=Math.min(1,this.endTimer/.8);
        ctx.fillStyle=`rgba(0,0,${won?8:0},${fadeIn*.88})`;
        ctx.fillRect(0,0,cw,ch);

        // Title banner
        if(this.endTimer>.3){
            const bannerAlpha=Math.min(1,(this.endTimer-.3)/.4);
            ctx.globalAlpha=bannerAlpha;
            ctx.fillStyle=won?'#024':'#400';
            ctx.fillRect(0,ch*.08,cw,50);
            this._txt(won?'ПОБЕДА!':'ЯДРО УНИЧТОЖЕНО',cw/2,ch*.08+25,won?'#0ff':'#f44',won?28:24,'center');
            ctx.globalAlpha=1;
        }

        // Stats appear one by one
        const mob=Input.mobile||cw<600;
        const statX=cw/2, startY=ch*.22;
        const lineH=mob?28:32;
        const st=this.stats;
        const spec=SPECS[Spells.specIdx];

        const lines=[
            {delay:.6,  icon:'📊', label:'СТАТИСТИКА',  value:'',        color:'#888', header:true},
            {delay:.8,  icon:'🌊', label:'Волна',        value:`${this.wave} / ${CFG.WAVE_MAX}`, color:'#4af'},
            {delay:1.0, icon:'☠',  label:'Убито врагов', value:`${this.kills}`,   color:'#f80'},
            {delay:1.2, icon:'💀', label:'Дошли до ядра',value:`${st.enemiesReachedCore}`, color:'#f44'},
            {delay:1.4, icon:'🏗', label:'Построено',    value:`${st.towersBuilt} башен`, color:'#4af'},
            {delay:1.6, icon:'💰', label:'Заработано',   value:`${st.goldEarned} золота`, color:'#ff0'},
            {delay:1.8, icon:'💸', label:'Потрачено',    value:`${st.goldSpent} золота`,  color:'#fa0'},
            {delay:2.0, icon:'🔧', label:'Продано',      value:`${st.towersSold} башен`,  color:'#aaa'},
            {delay:2.2, icon:'🏰', label:'Осталось башен',value:`${Buildings.list.length}`,color:'#4cf'},
        ];

        // Tower breakdown
        const towerTypes=Object.entries(st.towersByType);
        if(towerTypes.length>0){
            lines.push({delay:2.4,icon:'📋',label:'ПО ТИПАМ',value:'',color:'#888',header:true});
            let d=2.5;
            for(const[type,count] of towerTypes){
                const def=TOWER_DEFS[type];
                if(def) lines.push({delay:d,icon:def.icon,label:def.name,value:`x${count}`,color:def.color});
                d+=.15;
            }
        }

        lines.push({delay:Math.max(2.8,2.5+towerTypes.length*.15),icon:spec.icon,label:'Спец',value:spec.name,color:spec.color});

        for(const line of lines){
            if(this.endTimer<line.delay) continue;
            const alpha=Math.min(1,(this.endTimer-line.delay)/.3);
            ctx.globalAlpha=alpha;
            const y=startY+(lines.indexOf(line))*lineH;

            if(y>ch*.85) continue; // don't overflow

            if(line.header){
                // Section header
                ctx.fillStyle='#222';ctx.fillRect(statX-120,y-4,240,lineH-4);
                this._txt(`${line.icon} ${line.label}`,statX,y+lineH/2-4,line.color,mob?11:13,'center');
            } else {
                // Stat row: icon + label left, value right
                const rowW=Math.min(300,cw*.7);
                const lx=statX-rowW/2, rx=statX+rowW/2;
                // Background bar
                ctx.fillStyle='rgba(20,20,40,.6)';ctx.fillRect(lx-4,y,rowW+8,lineH-4);
                ctx.strokeStyle='#333';ctx.lineWidth=.5;ctx.strokeRect(lx-4,y,rowW+8,lineH-4);
                // Icon + Label
                this._txt(`${line.icon} ${line.label}`,lx+4,y+lineH/2-2,'#ccc',mob?10:12,'left');
                // Value
                this._txt(line.value,rx,y+lineH/2-2,line.color,mob?11:13,'right');
            }
        }
        ctx.globalAlpha=1;

        // Restart hint
        if(this.endTimer>2.5){
            const blink=Math.sin(this.endTimer*3)>.0;
            if(blink) this._txt('Нажмите для рестарта',cw/2,ch*.92,'#888',mob?11:13,'center');
        }

        FX.drawScreen(ctx,cw,ch);
    },

    _txt(s,x,y,c,sz,al){this.ctx.fillStyle=c;this.ctx.font=`bold ${sz}px monospace`;this.ctx.textAlign=al;this.ctx.textBaseline='middle';this.ctx.fillText(s,x,y);}
};
window.addEventListener('load',()=>{document.getElementById('loading').style.display='none';Game.init();});
