// ============ PARTICLES + VFX + DAMAGE NUMBERS ============
const FX = {
    list: [],
    rings: [],        // expanding ring effects
    bolts: [],        // lightning bolt visuals
    dmgNums: [],
    screenFlash: 0,
    screenFlashColor: '#fff',
    bossWarn: 0,

    spawn(x,y,color,n,spd,life) {
        n=n||4; spd=spd||60; life=life||.4;
        for (let i=0;i<n;i++) {
            const a=Math.random()*Math.PI*2, s=spd*(.5+Math.random()*.5);
            this.list.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,
                life:life*(.7+Math.random()*.3),ml:life,color,
                sz:2+Math.random()*3,type:'square'});
        }
    },

    // Glowing round particles
    sparkle(x,y,color,n,spd) {
        n=n||6; spd=spd||80;
        for(let i=0;i<n;i++) {
            const a=Math.random()*Math.PI*2, s=spd*(.3+Math.random()*.7);
            this.list.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,
                life:.5+Math.random()*.3,ml:.8,color,sz:3+Math.random()*3,type:'glow'});
        }
    },

    trail(x,y,color,sz) {
        this.list.push({x:x+(Math.random()-.5)*4,y:y+(Math.random()-.5)*4,
            vx:(Math.random()-.5)*10,vy:(Math.random()-.5)*10,
            life:.2,ml:.2,color,sz:sz||2,type:'glow'});
    },

    // Expanding ring (for nova, explosions)
    ring(x,y,color,maxR,dur) {
        this.rings.push({x,y,color,r:0,maxR:maxR||80,life:dur||.4,ml:dur||.4});
    },

    // Lightning bolt visual between two points
    bolt(x1,y1,x2,y2,color,life) {
        const segs=[];
        const steps=6;
        for(let i=0;i<=steps;i++) {
            const t=i/steps;
            segs.push({
                x:U.lerp(x1,x2,t)+(i>0&&i<steps?(Math.random()-.5)*20:0),
                y:U.lerp(y1,y2,t)+(i>0&&i<steps?(Math.random()-.5)*20:0)
            });
        }
        this.bolts.push({segs,color:color||'#4ef',life:life||.25,ml:life||.25,width:3});
    },

    dmgNum(x,y,amount,color) {
        this.dmgNums.push({
            x:x+(Math.random()-.5)*10, y:y-10,
            text:Math.abs(Math.floor(amount)).toString(),
            color:color||'#fff', life:.9, ml:.9, vy:-70,
            big:amount>=20
        });
    },

    flash(color,intensity) { this.screenFlash=intensity||.3; this.screenFlashColor=color||'#fff'; },
    bossWarning() { this.bossWarn=2.5; },

    update(dt) {
        for(let i=this.list.length-1;i>=0;i--) {
            const p=this.list[i];
            p.x+=p.vx*dt; p.y+=p.vy*dt;
            p.vx*=.91; p.vy*=.91; p.life-=dt;
            if(p.life<=0) this.list.splice(i,1);
        }
        for(let i=this.rings.length-1;i>=0;i--) {
            const r=this.rings[i];
            r.life-=dt;
            r.r=r.maxR*(1-r.life/r.ml);
            if(r.life<=0) this.rings.splice(i,1);
        }
        for(let i=this.bolts.length-1;i>=0;i--) {
            this.bolts[i].life-=dt;
            if(this.bolts[i].life<=0) this.bolts.splice(i,1);
        }
        for(let i=this.dmgNums.length-1;i>=0;i--) {
            const d=this.dmgNums[i];
            d.y+=d.vy*dt; d.vy*=.94; d.life-=dt;
            if(d.life<=0) this.dmgNums.splice(i,1);
        }
        if(this.screenFlash>0) this.screenFlash=Math.max(0,this.screenFlash-.02);
        if(this.bossWarn>0) this.bossWarn-=dt;
    },

    drawWorld(ctx) {
        // Rings
        for(const r of this.rings) {
            const a=U.clamp(r.life/r.ml,0,1);
            ctx.globalAlpha=a*.6;
            ctx.strokeStyle=r.color;
            ctx.lineWidth=3*a;
            ctx.beginPath(); ctx.arc(r.x,r.y,r.r,0,Math.PI*2); ctx.stroke();
            // Inner glow
            ctx.globalAlpha=a*.15;
            ctx.fillStyle=r.color;
            ctx.beginPath(); ctx.arc(r.x,r.y,r.r,0,Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha=1;

        // Lightning bolts
        for(const b of this.bolts) {
            const a=U.clamp(b.life/b.ml,0,1);
            ctx.globalAlpha=a;
            // Glow
            ctx.strokeStyle=b.color; ctx.lineWidth=b.width*2; ctx.globalAlpha=a*.3;
            ctx.beginPath(); ctx.moveTo(b.segs[0].x,b.segs[0].y);
            for(let i=1;i<b.segs.length;i++) ctx.lineTo(b.segs[i].x,b.segs[i].y);
            ctx.stroke();
            // Core
            ctx.strokeStyle='#fff'; ctx.lineWidth=b.width*.7; ctx.globalAlpha=a*.9;
            ctx.beginPath(); ctx.moveTo(b.segs[0].x,b.segs[0].y);
            for(let i=1;i<b.segs.length;i++) ctx.lineTo(b.segs[i].x,b.segs[i].y);
            ctx.stroke();
        }
        ctx.globalAlpha=1;

        // Particles
        for(const p of this.list) {
            const a=U.clamp(p.life/p.ml,0,1);
            const s=p.sz*a;
            if(p.type==='glow') {
                ctx.globalAlpha=a*.5;
                ctx.fillStyle=p.color;
                ctx.beginPath(); ctx.arc(p.x,p.y,s*1.5,0,Math.PI*2); ctx.fill();
                ctx.globalAlpha=a;
                ctx.fillStyle='#fff';
                ctx.beginPath(); ctx.arc(p.x,p.y,s*.5,0,Math.PI*2); ctx.fill();
            } else {
                ctx.globalAlpha=a;
                ctx.fillStyle=p.color;
                ctx.fillRect(p.x-s/2|0,p.y-s/2|0,Math.ceil(s),Math.ceil(s));
            }
        }
        ctx.globalAlpha=1;

        // Damage numbers
        for(const d of this.dmgNums) {
            const a=U.clamp(d.life/d.ml,0,1);
            const sz=d.big?16:12;
            // Shadow
            ctx.globalAlpha=a*.5;
            ctx.fillStyle='#000';
            ctx.font=`bold ${sz}px monospace`;
            ctx.textAlign='center'; ctx.textBaseline='middle';
            ctx.fillText(d.text,(d.x|0)+1,(d.y|0)+1);
            // Text
            ctx.globalAlpha=a;
            ctx.fillStyle=d.color;
            ctx.fillText(d.text,d.x|0,d.y|0);
        }
        ctx.globalAlpha=1;
    },

    drawScreen(ctx,cw,ch) {
        if(this.screenFlash>0.01) {
            ctx.globalAlpha=this.screenFlash;
            ctx.fillStyle=this.screenFlashColor;
            ctx.fillRect(0,0,cw,ch);
            ctx.globalAlpha=1;
        }
        if(this.bossWarn>0) {
            const pulse=Math.sin(this.bossWarn*8)*.5+.5;
            ctx.globalAlpha=pulse*.15; ctx.fillStyle='#f00'; ctx.fillRect(0,0,cw,ch);
            ctx.globalAlpha=pulse*.9; ctx.fillStyle='#f00';
            ctx.font='bold 30px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
            if(this.bossWarn>1) ctx.fillText('⚠ БОСС ИДЁТ ⚠',cw/2,ch*.13);
            ctx.globalAlpha=1;
        }
    },

    clear() { this.list=[]; this.rings=[]; this.bolts=[]; this.dmgNums=[]; this.screenFlash=0; this.bossWarn=0; }
};
