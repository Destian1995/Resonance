// ============ PARTICLES + DAMAGE NUMBERS + SCREEN EFFECTS ============
const FX = {
    list: [],
    dmgNums: [],         // floating damage numbers
    screenFlash: 0,      // white flash alpha
    screenFlashColor: '#fff',
    bossWarn: 0,         // boss warning timer

    spawn(x,y,color,n,spd,life) {
        n=n||4; spd=spd||60; life=life||.4;
        for (let i=0;i<n;i++) {
            const a=Math.random()*Math.PI*2, s=spd*(.5+Math.random()*.5);
            this.list.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,
                life:life*(.7+Math.random()*.3),ml:life,color,sz:2+Math.random()*3});
        }
    },

    // Trail particle (smaller, no spread)
    trail(x,y,color,sz) {
        this.list.push({x:x+(Math.random()-.5)*4,y:y+(Math.random()-.5)*4,
            vx:(Math.random()-.5)*10,vy:(Math.random()-.5)*10,
            life:.25,ml:.25,color,sz:sz||2});
    },

    // Floating damage number
    dmgNum(x,y,amount,color) {
        this.dmgNums.push({
            x: x + (Math.random()-.5)*12,
            y: y - 10,
            text: Math.abs(Math.floor(amount)).toString(),
            color: color || '#fff',
            life: 0.8,
            ml: 0.8,
            vy: -60,
            big: amount >= 20
        });
    },

    flash(color, intensity) {
        this.screenFlash = intensity || 0.3;
        this.screenFlashColor = color || '#fff';
    },

    bossWarning() {
        this.bossWarn = 2.5; // seconds
    },

    update(dt) {
        // Particles
        for (let i=this.list.length-1;i>=0;i--) {
            const p=this.list[i];
            p.x+=p.vx*dt; p.y+=p.vy*dt;
            p.vx*=.92; p.vy*=.92; p.life-=dt;
            if (p.life<=0) this.list.splice(i,1);
        }
        // Damage numbers
        for (let i=this.dmgNums.length-1;i>=0;i--) {
            const d=this.dmgNums[i];
            d.y+=d.vy*dt; d.vy*=.95; d.life-=dt;
            if (d.life<=0) this.dmgNums.splice(i,1);
        }
        // Screen effects
        if (this.screenFlash>0) this.screenFlash=Math.max(0,this.screenFlash-.015);
        if (this.bossWarn>0) this.bossWarn-=dt;
    },

    drawWorld(ctx) {
        // Particles in world space
        for (const p of this.list) {
            ctx.globalAlpha=U.clamp(p.life/p.ml,0,1);
            ctx.fillStyle=p.color;
            const s=p.sz*(p.life/p.ml);
            ctx.fillRect(p.x-s/2|0, p.y-s/2|0, Math.ceil(s), Math.ceil(s));
        }
        ctx.globalAlpha=1;
        // Damage numbers in world space
        for (const d of this.dmgNums) {
            const a = U.clamp(d.life/d.ml,0,1);
            ctx.globalAlpha=a;
            ctx.fillStyle=d.color;
            ctx.font=`bold ${d.big?16:12}px monospace`;
            ctx.textAlign='center'; ctx.textBaseline='middle';
            ctx.fillText(d.text, d.x|0, d.y|0);
            if (d.big) {
                ctx.strokeStyle='#000'; ctx.lineWidth=2;
                ctx.strokeText(d.text, d.x|0, d.y|0);
                ctx.fillText(d.text, d.x|0, d.y|0);
            }
        }
        ctx.globalAlpha=1;
    },

    drawScreen(ctx, cw, ch) {
        // Screen flash
        if (this.screenFlash>0.01) {
            ctx.globalAlpha=this.screenFlash;
            ctx.fillStyle=this.screenFlashColor;
            ctx.fillRect(0,0,cw,ch);
            ctx.globalAlpha=1;
        }
        // Boss warning
        if (this.bossWarn>0) {
            const pulse = Math.sin(this.bossWarn*8)*0.5+0.5;
            ctx.globalAlpha = pulse * 0.15;
            ctx.fillStyle = '#f00';
            ctx.fillRect(0,0,cw,ch);
            ctx.globalAlpha = pulse * 0.9;
            ctx.fillStyle = '#f00';
            ctx.font = 'bold 32px monospace';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            if (this.bossWarn > 1) ctx.fillText('⚠ БОСС ИДЁТ! ⚠', cw/2, ch*0.15);
            ctx.globalAlpha = 1;
        }
    },

    clear() { this.list=[]; this.dmgNums=[]; this.screenFlash=0; this.bossWarn=0; }
};
