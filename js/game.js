// ============ GAME — polished mobile-first ============
const Game = {
    state: ST.MENU,
    canvas: null, ctx: null,
    lastTime: 0, elapsed: 0,
    spawnTimer: 0, bossTimer: 0,
    upgradeChoices: [], menuAnim: 0,

    init() {
        this.canvas = document.getElementById('game');
        this.ctx = this.canvas.getContext('2d');
        this._resize();
        window.addEventListener('resize', () => this._resize());
        Input.init(this.canvas);
        Snd.init();
        this.lastTime = performance.now();
        requestAnimationFrame(t => this.loop(t));
    },

    _resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.ctx.imageSmoothingEnabled = false;
        Cam.init(this.canvas.width, this.canvas.height);
    },

    start(ci) {
        Player.init(ci);
        Enemies.clear(); Gems.clear(); Projs.clear(); Zones.clear(); FX.clear();
        World.generated = false;
        this.elapsed=0; this.spawnTimer=0; this.bossTimer=0;
        this.state = ST.PLAY;
    },

    loop(time) {
        const dt = Math.min((time - this.lastTime) / 1000, 0.05);
        this.lastTime = time;
        Input.update();

        const ctx = this.ctx;
        const cw = this.canvas.width, ch = this.canvas.height;
        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(0, 0, cw, ch);

        switch (this.state) {
            case ST.MENU: this._updateMenu(dt); this._drawMenu(ctx,cw,ch); break;
            case ST.PLAY: this._updatePlay(dt); this._drawPlay(ctx,cw,ch); break;
            case ST.UPGRADE: this._updateUpgrade(cw,ch); this._drawUpgrade(ctx,cw,ch); break;
            case ST.OVER: this._updateOver(); this._drawOver(ctx,cw,ch); break;
        }

        Input.endFrame();
        requestAnimationFrame(t => this.loop(t));
    },

    // ══════════ MENU ══════════
    _updateMenu(dt) {
        this.menuAnim += dt;
        if (!Input.tapped) return;
        const cw=this.canvas.width, ch=this.canvas.height;
        const mob = Input.mobile || cw < 600;
        const pw = mob ? Math.min(cw*.88,320) : 220;
        const ph = mob ? 90 : 270;
        const gap = mob ? 14 : 24;

        for (let i=0; i<3; i++) {
            let px, py;
            if (mob) { px=(cw-pw)/2; py=ch*.28+i*(ph+gap); }
            else { const tw=pw*3+gap*2; px=(cw-tw)/2+i*(pw+gap); py=ch*.28; }
            if (Input.tapX>=px && Input.tapX<=px+pw && Input.tapY>=py && Input.tapY<=py+ph) {
                Snd.resume(); Snd.play('lvl');
                this.start(i); return;
            }
        }
    },

    _drawMenu(ctx,cw,ch) {
        const mob = Input.mobile || cw < 600;
        // Animated background particles
        const t = this.menuAnim;
        for (let i=0;i<20;i++) {
            const x = ((Math.sin(i*1.3+t*.3)*0.5+0.5)*cw)|0;
            const y = ((Math.cos(i*1.7+t*.2)*0.5+0.5)*ch)|0;
            ctx.globalAlpha=.06;
            ctx.fillStyle=['#0ff','#f80','#a5f','#ff0'][i%4];
            ctx.beginPath(); ctx.arc(x,y,30+Math.sin(t+i)*10,0,Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha=1;

        // Title
        const ts = mob ? 30 : 46;
        this._text('RESONANCE',cw/2,ch*.06,'#0ff',ts,'center');
        this._textShadow('SURVIVORS',cw/2,ch*.06+ts*.8,'#088',Math.floor(ts*.5),'center');
        this._text('Выбери героя',cw/2,ch*.2,'#ccc',mob?13:15,'center');

        const pw = mob ? Math.min(cw*.88,320) : 220;
        const ph = mob ? 90 : 270;
        const gap = mob ? 14 : 24;

        for (let i=0;i<3;i++) {
            const c = CLASSES[i];
            let px, py;
            if (mob) { px=(cw-pw)/2; py=ch*.28+i*(ph+gap); }
            else { const tw=pw*3+gap*2; px=(cw-tw)/2+i*(pw+gap); py=ch*.28; }

            // Card bg with gradient feel
            const grad = ctx.createLinearGradient(px,py,px,py+ph);
            grad.addColorStop(0,'#1a1a30'); grad.addColorStop(1,'#10101e');
            ctx.fillStyle=grad;
            ctx.fillRect(px,py,pw,ph);
            // Colored side strip
            ctx.fillStyle=c.color;
            ctx.fillRect(px,py,4,ph);
            // Border
            ctx.strokeStyle=c.color; ctx.lineWidth=1.5;
            ctx.strokeRect(px+.5,py+.5,pw-1,ph-1);

            if (mob) {
                // Icon
                ctx.fillStyle=c.color;
                ctx.beginPath(); ctx.arc(px+35,py+ph/2,22,0,Math.PI*2); ctx.fill();
                ctx.fillStyle=c.color2;
                ctx.beginPath(); ctx.arc(px+35,py+ph/2,18,0,Math.PI*2); ctx.fill();
                ctx.fillStyle='#fff';
                ctx.font='bold 18px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
                ctx.fillText(c.id[0].toUpperCase(),px+35,py+ph/2);
                // Text
                this._text(c.name,px+70,py+22,c.color,17,'left');
                this._text(c.desc,px+70,py+44,'#bbb',11,'left');
                this._text(`HP ${c.hp}   SPD ${c.speed}`,px+70,py+66,'#6f6',10,'left');
            } else {
                // Large icon
                const cx=px+pw/2, iy=py+55;
                ctx.fillStyle=c.color;
                ctx.beginPath(); ctx.arc(cx,iy,30,0,Math.PI*2); ctx.fill();
                ctx.fillStyle=c.color2;
                ctx.beginPath(); ctx.arc(cx,iy,24,0,Math.PI*2); ctx.fill();
                ctx.fillStyle='#fff';
                ctx.font='bold 24px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
                ctx.fillText(c.id[0].toUpperCase(),cx,iy);

                this._text(c.name,cx,py+105,c.color,19,'center');
                this._text(c.desc,cx,py+130,'#bbb',12,'center');

                // Stats bars
                this._statBar(ctx,px+15,py+155,pw-30,'HP',c.hp,200,'#4f4');
                this._statBar(ctx,px+15,py+180,pw-30,'SPD',c.speed,200,'#4af');
            }
        }

        // Controls hint
        const hy = mob ? ch*.96 : ch*.94;
        this._text(mob?'Двигай левой — стреляет авто!':'WASD движение — оружие стреляет авто!',cw/2,hy,'#555',mob?10:11,'center');
    },

    _statBar(ctx,x,y,w,label,val,max,color) {
        ctx.fillStyle='#222'; ctx.fillRect(x,y,w,12);
        ctx.fillStyle=color;
        ctx.fillRect(x,y,w*(val/max),12);
        ctx.strokeStyle='#444'; ctx.lineWidth=1; ctx.strokeRect(x,y,w,12);
        this._text(`${label} ${val}`,x+4,y+6,'#fff',9,'left');
    },

    // ══════════ PLAY ══════════
    _updatePlay(dt) {
        this.elapsed += dt;
        const mins = this.elapsed/60;
        // Spawn
        const interval = CFG.SPAWN_INTERVAL * Math.max(.15, 1-mins*.05);
        this.spawnTimer += dt*1000;
        while (this.spawnTimer >= interval) {
            this.spawnTimer -= interval;
            const batch = 1 + Math.floor(mins*.5);
            for (let b=0;b<batch;b++) Enemies.spawn(Player.x, Player.y, this.elapsed);
        }
        // Boss
        this.bossTimer += dt;
        if (this.bossTimer >= CFG.BOSS_INTERVAL) {
            this.bossTimer = 0;
            Enemies.spawnBoss(Player.x, Player.y, this.elapsed);
        }
        // Player
        if (Player.update(dt)) {
            this.upgradeChoices = Upgrades.buildChoices();
            this.state = ST.UPGRADE;
            Snd.play('lvl');
            FX.flash('#ff0',.3);
            return;
        }
        // Weapons
        for (const w of Player.weapons) WeaponSys.fire(w, Player, Enemies.list, dt);
        Enemies.update(dt, Player);
        Projs.update(dt, Enemies.list);
        Zones.update(dt, Enemies.list);
        Gems.update(dt, Player);
        FX.update(dt);
        Cam.follow(Player); Cam.update(dt);
        if (!Player.alive) { Snd.play('death'); this.state=ST.OVER; }
    },

    _drawPlay(ctx,cw,ch) {
        Cam.begin(ctx);
        World.draw(ctx);
        Zones.draw(ctx);
        Gems.draw(ctx);
        WeaponSys.drawAuras(ctx, Player, Player.weapons);
        Enemies.draw(ctx);
        Player.draw(ctx);
        WeaponSys.drawOrbits(ctx, Player, Player.weapons);
        Projs.draw(ctx);
        FX.drawWorld(ctx);
        Cam.end(ctx);

        this._drawHUD(ctx,cw,ch);
        Input.drawJoy(ctx);
        FX.drawScreen(ctx,cw,ch);
    },

    _drawHUD(ctx,cw,ch) {
        const p=8;
        const mob = Input.mobile;

        // ── Top: XP bar full width ──
        const xpH = 6;
        ctx.fillStyle='#112';
        ctx.fillRect(0,0,cw,xpH);
        ctx.fillStyle='#55f';
        ctx.fillRect(0,0,cw*(Player.xp/Player.xpToNext()),xpH);

        // Level badge
        ctx.fillStyle='#22a';
        ctx.beginPath(); ctx.arc(cw/2, xpH+12, 12, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle='#fff';
        ctx.font='bold 11px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(Player.level, cw/2, xpH+12);

        // ── Left: HP ──
        const hpW = Math.min(140, cw*.25);
        const hpY = xpH + 4;
        // HP bar styled
        ctx.fillStyle='#200';
        ctx.fillRect(p,hpY,hpW,12);
        const hpRatio = Player.hp/Player.maxHp;
        const hpColor = hpRatio>.5?'#0c0':hpRatio>.25?'#fc0':'#f00';
        ctx.fillStyle=hpColor;
        ctx.fillRect(p,hpY,hpW*hpRatio,12);
        ctx.strokeStyle='#444'; ctx.lineWidth=1;
        ctx.strokeRect(p,hpY,hpW,12);
        this._text(`${Math.ceil(Player.hp)}`,p+hpW+6,hpY+6,'#fff',9,'left');

        // ── Center: Timer ──
        const mins=Math.floor(this.elapsed/60);
        const secs=Math.floor(this.elapsed%60);
        this._text(`${mins}:${secs<10?'0':''}${secs}`,cw/2,hpY+6,'#0ff',13,'center');

        // ── Right: Kill count ──
        this._text(`${Player.kills}`,cw-p,hpY+6,'#f80',12,'right');

        // ── Bottom: Weapon strip ──
        const stripH = 36;
        const stripY = ch - stripH - (mob?60:8);
        const wCount = Player.weapons.length;
        const wSlot = Math.min(52, (cw-20)/Math.max(wCount,1));

        ctx.fillStyle='rgba(0,0,0,.45)';
        ctx.fillRect(p-2, stripY-2, wCount*wSlot+4, stripH+4);

        for (let i=0;i<wCount;i++) {
            const w = Player.weapons[i];
            const def = WEAPON_DEFS[w.key];
            const sx = p + i*wSlot;

            // Slot bg
            ctx.fillStyle='#1a1a2a';
            ctx.fillRect(sx, stripY, wSlot-3, stripH);
            ctx.strokeStyle=def.color;
            ctx.lineWidth=1;
            ctx.strokeRect(sx, stripY, wSlot-3, stripH);

            // Icon
            ctx.fillStyle=def.color;
            ctx.font='14px monospace'; ctx.textAlign='center';
            ctx.fillText(def.icon, sx+(wSlot-3)/2, stripY+14);

            // Level
            ctx.fillStyle='#fff';
            ctx.font='bold 9px monospace';
            ctx.fillText(`Lv${w.level}`, sx+(wSlot-3)/2, stripY+28);

            // Cooldown overlay
            if (w.timer > 0) {
                const cdRatio = w.timer / w.cd;
                ctx.globalAlpha=.3;
                ctx.fillStyle='#000';
                ctx.fillRect(sx, stripY, wSlot-3, stripH*cdRatio);
                ctx.globalAlpha=1;
            }
        }

        // Enemy count (top right small)
        if (Enemies.list.length > 30) {
            this._text(`x${Enemies.list.length}`,cw-p,hpY+20,'#888',8,'right');
        }
    },

    // ══════════ UPGRADE ══════════
    _updateUpgrade(cw,ch) {
        if (!Input.tapped) return;
        const pw=Math.min(340,cw*.88), ph=75, gap=12;
        const sx=(cw-pw)/2;
        for (let i=0;i<this.upgradeChoices.length;i++) {
            const py=ch*.28+i*(ph+gap);
            if (Input.tapX>=sx && Input.tapX<=sx+pw && Input.tapY>=py && Input.tapY<=py+ph) {
                Upgrades.apply(this.upgradeChoices[i]);
                Snd.play('lvl');
                this.state=ST.PLAY; return;
            }
        }
    },

    _drawUpgrade(ctx,cw,ch) {
        this._drawPlay(ctx,cw,ch);
        // Frosted overlay
        ctx.fillStyle='rgba(0,0,15,.82)';
        ctx.fillRect(0,0,cw,ch);

        // Level up banner
        ctx.fillStyle='#22a';
        ctx.fillRect(0,ch*.1-4,cw,40);
        this._textShadow(`УРОВЕНЬ ${Player.level}!`,cw/2,ch*.1+16,'#ff0',22,'center');

        this._text('Выбери улучшение',cw/2,ch*.22,'#ccc',13,'center');

        const pw=Math.min(340,cw*.88), ph=75, gap=12;
        const sx=(cw-pw)/2;

        for (let i=0;i<this.upgradeChoices.length;i++) {
            const c=this.upgradeChoices[i];
            const py=ch*.28+i*(ph+gap);

            // Card
            const grad=ctx.createLinearGradient(sx,py,sx+pw,py);
            grad.addColorStop(0,'#1a1a34'); grad.addColorStop(1,'#141428');
            ctx.fillStyle=grad;
            ctx.fillRect(sx,py,pw,ph);
            // Color accent left
            ctx.fillStyle=c.color;
            ctx.fillRect(sx,py,3,ph);
            // Border
            ctx.strokeStyle=c.color; ctx.lineWidth=1.5;
            ctx.strokeRect(sx,py,pw,ph);

            // Icon
            ctx.fillStyle=c.color;
            ctx.beginPath(); ctx.arc(sx+32,py+ph/2,18,0,Math.PI*2); ctx.fill();
            ctx.fillStyle='#000';
            ctx.font='bold 18px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
            ctx.fillText(c.icon,sx+32,py+ph/2);

            this._text(c.name,sx+60,py+24,'#fff',14,'left');
            this._text(c.desc,sx+60,py+50,'#aaa',11,'left');
        }
    },

    // ══════════ GAME OVER ══════════
    _updateOver() { if (Input.tapped) this.state=ST.MENU; },

    _drawOver(ctx,cw,ch) {
        ctx.fillStyle='rgba(0,0,0,.92)';
        ctx.fillRect(0,0,cw,ch);

        // Red stripe
        ctx.fillStyle='#400';
        ctx.fillRect(0,ch*.15,cw,50);
        this._textShadow('ПОРАЖЕНИЕ',cw/2,ch*.15+25,'#f00',30,'center');

        const mins=Math.floor(this.elapsed/60), secs=Math.floor(this.elapsed%60);
        const c=CLASSES[Player.classIdx];
        const ly=ch*.35, sp=32;

        this._text(`${c.name}`,cw/2,ly,c.color,16,'center');
        this._statLine(ctx,cw/2,ly+sp*1,'Время',`${mins}:${secs<10?'0':''}${secs}`,'#0ff');
        this._statLine(ctx,cw/2,ly+sp*2,'Уровень',Player.level,'#aaf');
        this._statLine(ctx,cw/2,ly+sp*3,'Убито',Player.kills,'#f80');
        this._statLine(ctx,cw/2,ly+sp*4,'Оружий',Player.weapons.length,'#ff0');
        this._statLine(ctx,cw/2,ly+sp*5,'Опыт',Player.totalXp,'#4f4');

        // Weapon icons
        const ws=Player.weapons.length, ww=36;
        const wx=cw/2-(ws*ww)/2;
        for(let i=0;i<ws;i++) {
            const def=WEAPON_DEFS[Player.weapons[i].key];
            ctx.fillStyle=def.color;
            ctx.font='16px monospace'; ctx.textAlign='center';
            ctx.fillText(def.icon, wx+i*ww+ww/2, ly+sp*6+5);
        }

        this._text('Нажмите для рестарта',cw/2,ch*.88,'#666',12,'center');
    },

    _statLine(ctx,cx,y,label,value,color) {
        this._text(label,cx-60,y,'#888',12,'right');
        this._text(String(value),cx-40,y,color,14,'left');
    },

    // ══════════ HELPERS ══════════
    _text(s,x,y,c,sz,al) {
        this.ctx.fillStyle=c;
        this.ctx.font=`bold ${sz}px monospace`;
        this.ctx.textAlign=al; this.ctx.textBaseline='middle';
        this.ctx.fillText(s,x,y);
    },
    _textShadow(s,x,y,c,sz,al) {
        this.ctx.fillStyle='#000';
        this.ctx.font=`bold ${sz}px monospace`;
        this.ctx.textAlign=al; this.ctx.textBaseline='middle';
        this.ctx.fillText(s,x+2,y+2);
        this.ctx.fillStyle=c;
        this.ctx.fillText(s,x,y);
    }
};

window.addEventListener('load', () => {
    document.getElementById('loading').style.display='none';
    Game.init();
});
