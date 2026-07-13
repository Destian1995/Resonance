// ============ GAME — Tower Defense Roguelike ============
const Game = {
    state: ST.MENU,
    canvas:null, ctx:null, lastTime:0,
    wave:0, gold:0, kills:0,
    coreHp: CFG.CORE_HP,
    buildTimer:0, waveTimer:0,
    upgradeChoices:[], selectedTower:null,
    phase:'build', // 'build' or 'wave'

    init() {
        this.canvas=document.getElementById('game');
        this.ctx=this.canvas.getContext('2d');
        this._resize();
        window.addEventListener('resize',()=>this._resize());
        Input.init(this.canvas);
        Snd.init();
        this.lastTime=performance.now();
        requestAnimationFrame(t=>this.loop(t));
    },
    _resize(){this.canvas.width=window.innerWidth;this.canvas.height=window.innerHeight;this.ctx.imageSmoothingEnabled=false;Cam.init(this.canvas.width,this.canvas.height);},

    startGame(ci) {
        Hero.init(ci);
        World.generate();
        Buildings.clear(); Enemies.clear(); FX.clear();
        this.wave=0; this.gold=CFG.START_GOLD; this.kills=0;
        this.coreHp=CFG.CORE_HP;
        this.selectedTower='arrow';
        this.phase='build'; this.buildTimer=CFG.BUILD_TIME;
        this.state=ST.BUILD;
    },

    startWave() {
        this.wave++;
        this.phase='wave';
        Enemies.spawnWave(this.wave);
        if(this.wave%CFG.BOSS_EVERY===0) Enemies.spawnBoss(this.wave);
        Snd.play('wave');
        this.state=ST.WAVE;
    },

    endWave() {
        this.gold+=CFG.GOLD_PER_WAVE;
        if(this.wave>=CFG.WAVE_MAX){this.state=ST.WIN;return;}
        // Roguelike upgrade
        this.upgradeChoices=Upgrades.buildChoices(this.wave);
        this.state=ST.UPGRADE;
    },

    loop(time){
        const dt=Math.min((time-this.lastTime)/1000,.05);
        this.lastTime=time;
        Input.update();
        const ctx=this.ctx, cw=this.canvas.width, ch=this.canvas.height;
        ctx.fillStyle='#0a0a14';ctx.fillRect(0,0,cw,ch);

        switch(this.state){
            case ST.MENU: this._updateMenu(); this._drawMenu(ctx,cw,ch); break;
            case ST.BUILD: this._updateBuild(dt); this._drawGame(ctx,cw,ch); break;
            case ST.WAVE: this._updateWave(dt); this._drawGame(ctx,cw,ch); break;
            case ST.UPGRADE: this._updateUpgrade(cw,ch); this._drawUpgrade(ctx,cw,ch); break;
            case ST.WIN: this._updateEnd(); this._drawEnd(ctx,cw,ch,true); break;
            case ST.OVER: this._updateEnd(); this._drawEnd(ctx,cw,ch,false); break;
        }
        Input.endFrame();
        requestAnimationFrame(t=>this.loop(t));
    },

    // ══ MENU ══
    _updateMenu(){
        if(!Input.tapped)return;
        const cw=this.canvas.width,ch=this.canvas.height;
        const mob=Input.mobile||cw<600;
        const pw=mob?Math.min(cw*.88,300):200, ph=mob?85:220, gap=mob?12:20;
        for(let i=0;i<3;i++){
            let px,py;
            if(mob){px=(cw-pw)/2;py=ch*.3+i*(ph+gap);}
            else{px=(cw-(pw*3+gap*2))/2+i*(pw+gap);py=ch*.3;}
            if(Input.tapX>=px&&Input.tapX<=px+pw&&Input.tapY>=py&&Input.tapY<=py+ph){
                Snd.resume();Snd.play('lvl');this.startGame(i);return;
            }
        }
    },
    _drawMenu(ctx,cw,ch){
        const mob=Input.mobile||cw<600;
        this._txt('RESONANCE',cw/2,ch*.06,'#0ff',mob?28:42,'center');
        this._txt('TOWER DEFENSE',cw/2,ch*.06+(mob?26:38),'#088',mob?14:20,'center');
        this._txt('Выбери героя',cw/2,ch*.2,'#aaa',13,'center');
        const pw=mob?Math.min(cw*.88,300):200,ph=mob?85:220,gap=mob?12:20;
        for(let i=0;i<3;i++){
            const h=HEROES[i];
            let px,py;
            if(mob){px=(cw-pw)/2;py=ch*.3+i*(ph+gap);}
            else{px=(cw-(pw*3+gap*2))/2+i*(pw+gap);py=ch*.3;}
            ctx.fillStyle='#151528';ctx.fillRect(px,py,pw,ph);
            ctx.fillStyle=h.color;ctx.fillRect(px,py,4,ph);
            ctx.strokeStyle=h.color;ctx.lineWidth=1.5;ctx.strokeRect(px,py,pw,ph);
            if(mob){
                ctx.fillStyle=h.color;ctx.beginPath();ctx.arc(px+35,py+ph/2,20,0,Math.PI*2);ctx.fill();
                this._txt(h.name,px+65,py+20,h.color,16,'left');
                this._txt(h.desc,px+65,py+42,'#bbb',10,'left');
                this._txt(`HP:${h.hp}`,px+65,py+62,'#6f6',9,'left');
            } else {
                ctx.fillStyle=h.color;ctx.beginPath();ctx.arc(px+pw/2,py+50,25,0,Math.PI*2);ctx.fill();
                this._txt(h.name,px+pw/2,py+95,h.color,18,'center');
                this._txt(h.desc,px+pw/2,py+118,'#bbb',10,'center');
                this._txt(`HP ${h.hp}  SPD ${h.speed}`,px+pw/2,py+145,'#6f6',10,'center');
                for(let a=0;a<3;a++){
                    this._txt(`${h.abilities[a].icon} ${h.abilities[a].name}`,px+10,py+165+a*16,'#aaa',9,'left');
                }
            }
        }
        this._txt(mob?'Строй башни днём — защищай ядро ночью!':'WASD — двигай героя. Строй башни днём, защищай ядро ночью!',cw/2,ch*.95,'#555',mob?9:11,'center');
    },

    // ══ BUILD PHASE ══
    _updateBuild(dt){
        this.buildTimer-=dt;
        Hero.update(dt,[]);
        FX.update(dt);
        Cam.follow(Hero);Cam.update(dt);

        // Tap to build
        if(Input.tapped && this.selectedTower){
            const wp=Cam.screenToWorld(Input.tapX,Input.tapY);
            const hex=U.pixelToHex(wp.x,wp.y);
            const def=TOWER_DEFS[this.selectedTower];
            if(def && this.gold>=def.cost && Buildings.place(hex.q,hex.r,this.selectedTower)){
                this.gold-=def.cost;
            }
        }

        // Timer expired -> start wave
        if(this.buildTimer<=0) this.startWave();
    },

    // ══ WAVE PHASE ══
    _updateWave(dt){
        Hero.update(dt,Enemies.list);
        // Overclock: speed up towers
        if(Hero.overclockTimer>0){
            for(const b of Buildings.list)if(b.def.cd)b.timer-=dt*1000; // double tick
        }
        // Tower buff
        if(Hero.towerBuff>0){
            // Already handled in buildings via level boost
        }
        Buildings.update(dt,Enemies.list,Hero);
        Enemies.update(dt,Hero);
        FX.update(dt);
        Cam.follow(Hero);Cam.update(dt);

        // Ability keys / tap right side
        if(Input.keys.Digit1||Input.keys.KeyQ)Hero.useAbility(0,Enemies.list);
        if(Input.keys.Digit2||Input.keys.KeyE)Hero.useAbility(1,Enemies.list);
        if(Input.keys.Digit3||Input.keys.KeyR)Hero.useAbility(2,Enemies.list);

        // Core dead
        if(this.coreHp<=0){this.coreHp=0;Snd.play('death');this.state=ST.OVER;return;}
        // Hero dead -> respawn after 3s with half HP
        if(!Hero.alive){
            Hero.alive=true;Hero.hp=Math.floor(Hero.maxHp*.5);
            const cp=U.hexToPixel(0,0);Hero.x=cp.x;Hero.y=cp.y;
        }
        // All enemies dead -> end wave
        if(Enemies.list.length===0)this.endWave();
    },

    // ══ DRAW GAME (both phases) ══
    _drawGame(ctx,cw,ch){
        Cam.begin(ctx);
        World.draw(ctx,this.phase);
        Buildings.draw(ctx);
        Enemies.draw(ctx);
        Hero.draw(ctx);
        FX.drawWorld(ctx);

        // Highlight hovered hex in build mode
        if(this.state===ST.BUILD && this.selectedTower){
            const wp=Cam.screenToWorld(Input.tapX||cw/2,Input.tapY||ch/2);
            const hex=U.pixelToHex(wp.x,wp.y);
            const hp=U.hexToPixel(hex.q,hex.r);
            const canB=World.canBuild(hex.q,hex.r);
            U.drawHex(ctx,hp.x,hp.y,CFG.HEX_R-2,null,canB?'rgba(0,255,0,.3)':'rgba(255,0,0,.3)');
        }
        Cam.end(ctx);

        // Night overlay during wave
        if(this.phase==='wave'){
            ctx.globalAlpha=.35;ctx.fillStyle='#000020';ctx.fillRect(0,0,cw,ch);
            // Player light
            const px=Hero.x-Cam.x+Cam.sx, py=Hero.y-Cam.y+Cam.sy;
            const grad=ctx.createRadialGradient(px,py,40,px,py,160);
            grad.addColorStop(0,'rgba(0,0,20,0)');grad.addColorStop(1,'rgba(0,0,20,.35)');
            ctx.globalAlpha=1;ctx.fillStyle=grad;ctx.fillRect(0,0,cw,ch);
        }

        this._drawHUD(ctx,cw,ch);
        Input.drawJoy(ctx);
        FX.drawScreen(ctx,cw,ch);
    },

    _drawHUD(ctx,cw,ch){
        const p=8, mob=Input.mobile;

        // Core HP
        const coreW=Math.min(160,cw*.25);
        ctx.fillStyle='#113';ctx.fillRect(p,p,coreW,12);
        ctx.fillStyle=this.coreHp/CFG.CORE_HP>.5?'#4af':'#f44';
        ctx.fillRect(p,p,coreW*(this.coreHp/CFG.CORE_HP),12);
        ctx.strokeStyle='#444';ctx.lineWidth=1;ctx.strokeRect(p,p,coreW,12);
        this._txt(`Ядро ${Math.ceil(this.coreHp)}`,p+coreW+6,p+6,'#fff',9,'left');

        // Hero HP
        const heroW=Math.min(120,cw*.18);
        ctx.fillStyle='#210';ctx.fillRect(p,p+18,heroW,8);
        ctx.fillStyle='#f80';ctx.fillRect(p,p+18,heroW*(Hero.hp/Hero.maxHp),8);
        this._txt(`${Math.ceil(Hero.hp)}`,p+heroW+5,p+22,'#fa8',8,'left');

        // Gold + Wave
        this._txt(`💰 ${this.gold}`,cw/2-40,p+6,'#ff0',12,'left');
        this._txt(`Волна ${this.wave}/${CFG.WAVE_MAX}`,cw-p,p+6,'#aaa',11,'right');

        // Phase indicator
        if(this.state===ST.BUILD){
            const timeLeft=Math.ceil(this.buildTimer);
            this._txt(`☀ ДЕНЬ — Стройте! ${timeLeft}с`,cw/2,p+24,'#ff0',12,'center');
        } else {
            this._txt(`🌙 НОЧЬ — Волна ${this.wave}`,cw/2,p+24,'#f44',12,'center');
            this._txt(`Врагов: ${Enemies.list.length}`,cw-p,p+20,'#888',9,'right');
        }

        // Build palette (bottom, during build phase)
        if(this.state===ST.BUILD){
            const types=['arrow','fire','ice','lightning','cannon','wall','trap','heal'];
            const bsz=mob?44:50, gap=4;
            const totalW=types.length*(bsz+gap);
            const sx=(cw-totalW)/2;
            const by=ch-(mob?90:60);

            ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(sx-4,by-4,totalW+8,bsz+8);

            for(let i=0;i<types.length;i++){
                const t=types[i], def=TOWER_DEFS[t];
                const bx=sx+i*(bsz+gap);
                const selected=this.selectedTower===t;
                const canAfford=this.gold>=def.cost;

                ctx.fillStyle=selected?'#2a2a4a':'#151520';
                ctx.fillRect(bx,by,bsz,bsz);
                ctx.strokeStyle=selected?def.color:(canAfford?'#444':'#222');
                ctx.lineWidth=selected?2:1;
                ctx.strokeRect(bx,by,bsz,bsz);

                ctx.fillStyle=canAfford?def.color:'#333';
                ctx.font=`${mob?14:16}px monospace`;ctx.textAlign='center';ctx.textBaseline='middle';
                ctx.fillText(def.icon,bx+bsz/2,by+bsz/2-6);
                this._txt(`${def.cost}`,bx+bsz/2,by+bsz-8,canAfford?'#ff0':'#444',8,'center');

                // Tap to select
                if(Input.tapped && Input.tapY>=by && Input.tapY<=by+bsz && Input.tapX>=bx && Input.tapX<=bx+bsz){
                    this.selectedTower=t;
                    Input.tapped=false; // consume tap
                }
            }

            // Sell button
            this._txt('ПРОДАТЬ: тап на башню',cw/2,by-14,'#888',9,'center');
        }

        // Abilities (during wave, right side)
        if(this.state===ST.WAVE){
            const h=HEROES[Hero.classIdx];
            const absz=mob?48:44;
            const ax=cw-p-absz;
            for(let i=0;i<3;i++){
                const ay=ch*.3+i*(absz+8);
                const cd=Hero.abCooldowns[i];
                const ready=cd<=0;
                ctx.fillStyle=ready?'#1a2a3a':'#111';
                ctx.fillRect(ax,ay,absz,absz);
                ctx.strokeStyle=ready?h.color:'#333';
                ctx.lineWidth=ready?2:1;
                ctx.strokeRect(ax,ay,absz,absz);
                // CD overlay
                if(!ready){
                    const cdMax=h.abilities[i].cd;
                    ctx.globalAlpha=.4;ctx.fillStyle='#000';
                    ctx.fillRect(ax,ay,absz,absz*(cd/cdMax));
                    ctx.globalAlpha=1;
                }
                ctx.fillStyle=ready?'#fff':'#666';
                ctx.font=`${mob?18:16}px monospace`;ctx.textAlign='center';ctx.textBaseline='middle';
                ctx.fillText(h.abilities[i].icon,ax+absz/2,ay+absz/2);

                // Tap to use
                if(Input.tapped && Input.tapX>=ax && Input.tapX<=ax+absz && Input.tapY>=ay && Input.tapY<=ay+absz){
                    Hero.useAbility(i,Enemies.list);
                    Input.tapped=false;
                }
            }
        }
    },

    // ══ UPGRADE ══
    _updateUpgrade(cw,ch){
        if(!Input.tapped)return;
        const pw=Math.min(320,cw*.85),ph=70,gap=10,sx=(cw-pw)/2;
        for(let i=0;i<this.upgradeChoices.length;i++){
            const py=ch*.3+i*(ph+gap);
            if(Input.tapX>=sx&&Input.tapX<=sx+pw&&Input.tapY>=py&&Input.tapY<=py+ph){
                this.upgradeChoices[i].apply();
                Snd.play('lvl');
                // Go to next build phase
                this.phase='build';this.buildTimer=CFG.BUILD_TIME;
                this.state=ST.BUILD;
                return;
            }
        }
    },
    _drawUpgrade(ctx,cw,ch){
        this._drawGame(ctx,cw,ch);
        ctx.fillStyle='rgba(0,0,15,.82)';ctx.fillRect(0,0,cw,ch);
        this._txt(`Волна ${this.wave} пройдена!`,cw/2,ch*.12,'#0ff',20,'center');
        this._txt('Выбери улучшение',cw/2,ch*.2,'#aaa',12,'center');
        const pw=Math.min(320,cw*.85),ph=70,gap=10,sx=(cw-pw)/2;
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

    // ══ WIN / GAME OVER ══
    _updateEnd(){if(Input.tapped)this.state=ST.MENU;},
    _drawEnd(ctx,cw,ch,won){
        ctx.fillStyle='rgba(0,0,0,.92)';ctx.fillRect(0,0,cw,ch);
        this._txt(won?'ПОБЕДА!':'ПОРАЖЕНИЕ',cw/2,ch*.2,won?'#0ff':'#f00',30,'center');
        this._txt(`Волна: ${this.wave}/${CFG.WAVE_MAX}`,cw/2,ch*.38,'#fff',15,'center');
        this._txt(`Убито: ${this.kills}`,cw/2,ch*.48,'#f80',14,'center');
        this._txt(`Золото: ${this.gold}`,cw/2,ch*.56,'#ff0',14,'center');
        this._txt(`Башен: ${Buildings.list.length}`,cw/2,ch*.64,'#4af',13,'center');
        this._txt('Нажмите для рестарта',cw/2,ch*.85,'#666',12,'center');
    },

    _txt(s,x,y,c,sz,al){this.ctx.fillStyle=c;this.ctx.font=`bold ${sz}px monospace`;this.ctx.textAlign=al;this.ctx.textBaseline='middle';this.ctx.fillText(s,x,y);}
};

window.addEventListener('load',()=>{document.getElementById('loading').style.display='none';Game.init();});
