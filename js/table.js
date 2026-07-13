// ============ TABLE + BALLS — premium graphics ============
const Table = {
    x:0, y:0, w:0, h:0,
    cushion: 18,
    pocketR: 24,     // BIGGER pockets
    pockets: [],

    init(cw, ch) {
        // Smaller table — 60% of screen
        const maxW = cw * 0.7, maxH = ch * 0.55;
        if (maxW / 2 > maxH) { this.h = maxH; this.w = this.h * 2; }
        else { this.w = maxW; this.h = this.w / 2; }
        this.x = (cw - this.w) / 2;
        this.y = (ch - this.h) / 2 + 10;

        const px=this.x, py=this.y, pw=this.w, ph=this.h, pr=this.pocketR;
        this.pockets = [
            {x:px-2,      y:py-2,      r:pr},     // top-left
            {x:px+pw/2,   y:py-4,      r:pr-3},   // top-center
            {x:px+pw+2,   y:py-2,      r:pr},     // top-right
            {x:px-2,      y:py+ph+2,   r:pr},     // bottom-left
            {x:px+pw/2,   y:py+ph+4,   r:pr-3},   // bottom-center
            {x:px+pw+2,   y:py+ph+2,   r:pr}      // bottom-right
        ];
    },

    draw(ctx) {
        const {x,y,w,h,cushion:c} = this;

        // ── OUTER FRAME (rich wood) ──
        // Drop shadow
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(x-26, y-22, w+52, h+48);

        // Wood frame outer
        const grd = ctx.createLinearGradient(x-24,y-24,x-24,y+h+24);
        grd.addColorStop(0,'#7a5028'); grd.addColorStop(.3,'#5a3818');
        grd.addColorStop(.7,'#6a4420'); grd.addColorStop(1,'#4a2a10');
        ctx.fillStyle = grd;
        ctx.fillRect(x-24, y-24, w+48, h+48);

        // Wood grain lines
        ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1;
        for(let i=0;i<12;i++){
            const gy=y-22+i*(h+44)/12;
            ctx.beginPath(); ctx.moveTo(x-22,gy); ctx.lineTo(x+w+22,gy); ctx.stroke();
        }

        // Inlay (gold trim)
        ctx.strokeStyle = '#c8a050'; ctx.lineWidth = 2;
        ctx.strokeRect(x-14,y-14,w+28,h+28);
        ctx.strokeStyle = '#a08040'; ctx.lineWidth = 1;
        ctx.strokeRect(x-10,y-10,w+20,h+20);

        // ── GREEN FELT ──
        const feltGrd = ctx.createRadialGradient(x+w/2,y+h/2,20, x+w/2,y+h/2,w*.6);
        feltGrd.addColorStop(0,'#1e7a3a'); feltGrd.addColorStop(1,'#166028');
        ctx.fillStyle = feltGrd;
        ctx.fillRect(x,y,w,h);

        // Felt cloth texture
        ctx.globalAlpha=.04;
        for(let fy=0;fy<h;fy+=6){
            ctx.fillStyle = fy%12<6 ? '#0a4a1a' : '#1a5a28';
            ctx.fillRect(x,y+fy,w,3);
        }
        ctx.globalAlpha=1;

        // ── MARKINGS ──
        // Head string line
        ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=1;
        ctx.setLineDash([5,5]);
        ctx.beginPath(); ctx.moveTo(x+w*.25,y+c+2); ctx.lineTo(x+w*.25,y+h-c-2); ctx.stroke();
        // Center line
        ctx.beginPath(); ctx.moveTo(x+w*.5,y+c+2); ctx.lineTo(x+w*.5,y+h-c-2); ctx.stroke();
        ctx.setLineDash([]);
        // Spots
        ctx.fillStyle='rgba(255,255,255,0.1)';
        ctx.beginPath(); ctx.arc(x+w*.25,y+h/2,4,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(x+w*.75,y+h/2,4,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(x+w*.5,y+h/2,3,0,Math.PI*2); ctx.fill();

        // ── CUSHIONS (3D beveled) ──
        const pr=this.pocketR, csh=c;
        // Top cushion segments
        this._cushionH(ctx, x+pr*1.4, y, w/2-pr*2.2, csh, false);
        this._cushionH(ctx, x+w/2+pr*.8, y, w/2-pr*2.2, csh, false);
        // Bottom
        this._cushionH(ctx, x+pr*1.4, y+h-csh, w/2-pr*2.2, csh, true);
        this._cushionH(ctx, x+w/2+pr*.8, y+h-csh, w/2-pr*2.2, csh, true);
        // Left
        this._cushionV(ctx, x, y+pr*1.4, csh, h-pr*2.8, false);
        // Right
        this._cushionV(ctx, x+w-csh, y+pr*1.4, csh, h-pr*2.8, true);

        // ── POCKETS (3D depth) ──
        for(const p of this.pockets){
            // Outer dark ring
            ctx.fillStyle='#0a0a0a';
            ctx.beginPath(); ctx.arc(p.x,p.y,p.r+4,0,Math.PI*2); ctx.fill();
            // Metal rim
            const rimGrd=ctx.createRadialGradient(p.x-2,p.y-2,p.r-2,p.x,p.y,p.r+3);
            rimGrd.addColorStop(0,'#444'); rimGrd.addColorStop(.6,'#222'); rimGrd.addColorStop(1,'#111');
            ctx.fillStyle=rimGrd;
            ctx.beginPath(); ctx.arc(p.x,p.y,p.r+2,0,Math.PI*2); ctx.fill();
            // Pocket hole
            ctx.fillStyle='#050505';
            ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
            // Net shadow inside
            const netGrd=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r);
            netGrd.addColorStop(0,'#080808'); netGrd.addColorStop(1,'#020202');
            ctx.fillStyle=netGrd;
            ctx.beginPath(); ctx.arc(p.x,p.y,p.r*.85,0,Math.PI*2); ctx.fill();
            // Subtle net lines
            ctx.strokeStyle='#1a1a1a'; ctx.lineWidth=.5;
            for(let a=0;a<6;a++){
                const ang=a*Math.PI/3;
                ctx.beginPath(); ctx.moveTo(p.x,p.y);
                ctx.lineTo(p.x+Math.cos(ang)*p.r*.8,p.y+Math.sin(ang)*p.r*.8); ctx.stroke();
            }
        }

        // ── DIAMOND SIGHTS ──
        ctx.fillStyle='#d4b878';
        const dms=[.125,.25,.375,.5,.625,.75,.875];
        for(const d of dms){
            this._diamond(ctx,x+w*d,y-15,3.5);
            this._diamond(ctx,x+w*d,y+h+15,3.5);
        }
        for(const d of [.25,.5,.75]){
            this._diamond(ctx,x-15,y+h*d,3.5);
            this._diamond(ctx,x+w+15,y+h*d,3.5);
        }

        // ── TABLE LIGHT REFLECTION (soft glow center) ──
        ctx.globalAlpha=.06;
        const lightGrd=ctx.createRadialGradient(x+w/2,y+h/2,0,x+w/2,y+h/2,w*.35);
        lightGrd.addColorStop(0,'#fff'); lightGrd.addColorStop(1,'transparent');
        ctx.fillStyle=lightGrd;
        ctx.fillRect(x,y,w,h);
        ctx.globalAlpha=1;
    },

    _cushionH(ctx,x,y,w,h,bottom){
        // Main cushion body
        const grd=ctx.createLinearGradient(x,y,x,y+h);
        if(bottom){grd.addColorStop(0,'#1a5a28');grd.addColorStop(1,'#2a6a38');}
        else{grd.addColorStop(0,'#2a7a3a');grd.addColorStop(1,'#1a5a28');}
        ctx.fillStyle=grd; ctx.fillRect(x,y,w,h);
        // Highlight edge
        ctx.fillStyle=bottom?'#1a5a28':'#3a8a4a';
        ctx.fillRect(x,bottom?y+h-2:y,w,2);
        // Rubber nose
        ctx.fillStyle='#2a6a2a';
        ctx.fillRect(x,bottom?y:y+h-3,w,3);
    },

    _cushionV(ctx,x,y,w,h,right){
        const grd=ctx.createLinearGradient(x,y,x+w,y);
        if(right){grd.addColorStop(0,'#1a5a28');grd.addColorStop(1,'#2a6a38');}
        else{grd.addColorStop(0,'#2a7a3a');grd.addColorStop(1,'#1a5a28');}
        ctx.fillStyle=grd; ctx.fillRect(x,y,w,h);
        ctx.fillStyle=right?'#1a5a28':'#3a8a4a';
        ctx.fillRect(right?x+w-2:x,y,2,h);
        ctx.fillStyle='#2a6a2a';
        ctx.fillRect(right?x:x+w-3,y,3,h);
    },

    _diamond(ctx,x,y,s){
        ctx.beginPath();
        ctx.moveTo(x,y-s);ctx.lineTo(x+s*.7,y);ctx.lineTo(x,y+s);ctx.lineTo(x-s*.7,y);
        ctx.closePath();ctx.fill();
        // Tiny highlight
        ctx.fillStyle='#e8d0a0'; ctx.beginPath();
        ctx.arc(x-.5,y-s*.3,s*.25,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#d4b878';
    }
};

// ── BALLS (smaller for smaller table) ──
const BALL_R = 9;
const BALL_COLORS = [
    null,'#f2d426','#2255cc','#cc2222','#6622aa','#ee6600','#228844','#882222',
    '#111111','#f2d426','#2255cc','#cc2222','#6622aa','#ee6600','#228844','#882222'
];

function createBalls(table) {
    const balls=[];
    const cx=table.x+table.w*.75, cy=table.y+table.h/2;
    const d=BALL_R*2.08;

    balls.push({id:0,x:table.x+table.w*.25,y:cy,vx:0,vy:0,r:BALL_R,active:true,pocketed:false,stripe:false,color:'#f0f0ee',spin:0,sinkX:0,sinkY:0});

    const rack=[[1],[9,2],[3,8,10],[11,4,12,5],[6,13,14,7,15]];
    for(let row=0;row<rack.length;row++){
        for(let col=0;col<rack[row].length;col++){
            const num=rack[row][col];
            const bx=cx+row*d*Math.sqrt(3)/2;
            const by=cy+(col-(rack[row].length-1)/2)*d;
            balls.push({id:num,x:bx,y:by+(Math.random()-.5)*.3,vx:0,vy:0,r:BALL_R,active:true,pocketed:false,
                stripe:num>8,color:BALL_COLORS[num],spin:0,sinkX:0,sinkY:0});
        }
    }
    return balls;
}

function drawBall(ctx, b) {
    if(!b.active) return;
    const x=b.x|0, y=b.y|0, r=b.r;

    // Shadow (offset, soft)
    ctx.fillStyle='rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(x+3,y+3,r*1.05,r*.75,0,0,Math.PI*2); ctx.fill();

    // Ball body base
    if(b.id===0){
        // Cue ball — pearly white gradient
        const cGrd=ctx.createRadialGradient(x-r*.25,y-r*.25,r*.1, x,y,r);
        cGrd.addColorStop(0,'#ffffff'); cGrd.addColorStop(.6,'#eeeeea'); cGrd.addColorStop(1,'#ccccbb');
        ctx.fillStyle=cGrd;
    } else if(b.stripe){
        // Stripe: white base
        const sGrd=ctx.createRadialGradient(x-r*.2,y-r*.2,r*.1, x,y,r);
        sGrd.addColorStop(0,'#ffffff'); sGrd.addColorStop(.6,'#f0f0ec'); sGrd.addColorStop(1,'#ddddd5');
        ctx.fillStyle=sGrd;
    } else {
        // Solid: color gradient
        const cGrd=ctx.createRadialGradient(x-r*.3,y-r*.3,r*.1, x+r*.2,y+r*.2,r*1.1);
        cGrd.addColorStop(0,_lighten(b.color,.4)); cGrd.addColorStop(.5,b.color); cGrd.addColorStop(1,_darken(b.color,.3));
        ctx.fillStyle=cGrd;
    }
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();

    if(b.id>0){
        if(b.stripe){
            // Stripe band with gradient
            ctx.save(); ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.clip();
            const bandGrd=ctx.createRadialGradient(x-r*.2,y-r*.2,0, x,y,r);
            bandGrd.addColorStop(0,_lighten(b.color,.3)); bandGrd.addColorStop(1,_darken(b.color,.2));
            ctx.fillStyle=bandGrd;
            ctx.fillRect(x-r,y-r*.55,r*2,r*1.1);
            ctx.restore();
        }
        // Number circle
        ctx.fillStyle='#fff';
        ctx.beginPath(); ctx.arc(x,y,r*.38,0,Math.PI*2); ctx.fill();
        // Number text
        ctx.fillStyle='#111';
        ctx.font=`bold ${r>7?8:6}px Arial`;
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(b.id,x,y+.5);
    }

    // Primary specular highlight
    ctx.fillStyle='rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.arc(x-r*.28,y-r*.3,r*.22,0,Math.PI*2); ctx.fill();
    // Secondary soft glow
    ctx.fillStyle='rgba(255,255,255,0.12)';
    ctx.beginPath(); ctx.arc(x-r*.1,y-r*.15,r*.5,0,Math.PI*2); ctx.fill();
    // Bottom rim light
    ctx.fillStyle='rgba(255,255,255,0.05)';
    ctx.beginPath(); ctx.arc(x+r*.15,y+r*.25,r*.35,0,Math.PI*2); ctx.fill();

    // Edge outline
    ctx.strokeStyle='rgba(0,0,0,0.15)'; ctx.lineWidth=.5;
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.stroke();
}

// Color helpers (global)
function _lighten(hex,amt){
    let r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
    r=Math.min(255,r+Math.floor((255-r)*amt)); g=Math.min(255,g+Math.floor((255-g)*amt)); b=Math.min(255,b+Math.floor((255-b)*amt));
    return `rgb(${r},${g},${b})`;
}
function _darken(hex,amt){
    let r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
    r=Math.floor(r*(1-amt)); g=Math.floor(g*(1-amt)); b=Math.floor(b*(1-amt));
    return `rgb(${r},${g},${b})`;
}
