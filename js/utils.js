// ============ UTILS + HEX MATH ============
const U = {
    dist(a,b){const dx=b.x-a.x,dy=b.y-a.y;return Math.sqrt(dx*dx+dy*dy);},
    dist2(x1,y1,x2,y2){const dx=x2-x1,dy=y2-y1;return Math.sqrt(dx*dx+dy*dy);},
    angle(a,b){return Math.atan2(b.y-a.y,b.x-a.x);},
    clamp(v,lo,hi){return v<lo?lo:v>hi?hi:v;},
    lerp(a,b,t){return a+(b-a)*t;},
    rand(a,b){return Math.random()*(b-a)+a;},
    randInt(a,b){return Math.floor(Math.random()*(b-a+1))+a;},
    pick(a){return a[Math.floor(Math.random()*a.length)];},
    isMobile(){return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||('ontouchstart' in window)||navigator.maxTouchPoints>0;},

    // ── Hex math (axial coordinates, pointy-top) ──
    hexToPixel(q, r) {
        const s = CFG.HEX_R;
        return {
            x: s * (Math.sqrt(3) * q + Math.sqrt(3)/2 * r),
            y: s * (3/2 * r)
        };
    },
    pixelToHex(x, y) {
        const s = CFG.HEX_R;
        const q = (Math.sqrt(3)/3 * x - 1/3 * y) / s;
        const r = (2/3 * y) / s;
        return U.hexRound(q, r);
    },
    hexRound(q, r) {
        const s = -q - r;
        let rq = Math.round(q), rr = Math.round(r), rs = Math.round(s);
        const dq = Math.abs(rq-q), dr = Math.abs(rr-r), ds = Math.abs(rs-s);
        if (dq > dr && dq > ds) rq = -rr - rs;
        else if (dr > ds) rr = -rq - rs;
        return { q: rq, r: rr };
    },
    hexDist(q1,r1,q2,r2) {
        return (Math.abs(q1-q2)+Math.abs(q1+r1-q2-r2)+Math.abs(r1-r2))/2;
    },
    hexKey(q,r) { return `${q},${r}`; },

    // Draw hex
    drawHex(ctx, cx, cy, r, fill, stroke) {
        ctx.beginPath();
        for (let i=0;i<6;i++) {
            const a = Math.PI/180*(60*i-30);
            const px = cx+r*Math.cos(a), py = cy+r*Math.sin(a);
            if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
        }
        ctx.closePath();
        if(fill){ctx.fillStyle=fill;ctx.fill();}
        if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}
    }
};
