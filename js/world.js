// ============ WORLD — rich ground with decorations ============
const World = {
    decorations: [],
    generated: false,

    generate() {
        this.decorations = [];
        // Scatter grass tufts, flowers, bones, stones across the map
        const types = ['grass','grass','grass','flower','stone','bone','bush','mushroom'];
        for (let i = 0; i < 600; i++) {
            this.decorations.push({
                x: Math.random() * CFG.WORLD_W,
                y: Math.random() * CFG.WORLD_H,
                type: U.pick(types),
                variant: Math.floor(Math.random() * 3),
                scale: 0.7 + Math.random() * 0.6
            });
        }
        this.generated = true;
    },

    draw(ctx) {
        if (!this.generated) this.generate();
        const ts = CFG.TILE;
        const sx = Math.floor(Cam.x / ts) - 1;
        const sy = Math.floor(Cam.y / ts) - 1;
        const ex = Math.ceil((Cam.x + Cam.w) / ts) + 1;
        const ey = Math.ceil((Cam.y + Cam.h) / ts) + 1;

        // Ground tiles
        for (let y = sy; y <= ey; y++) {
            for (let x = sx; x <= ex; x++) {
                const px = x * ts, py = y * ts;
                if (px < 0 || py < 0 || px >= CFG.WORLD_W || py >= CFG.WORLD_H) {
                    ctx.fillStyle = '#080810';
                } else {
                    // Varied green ground
                    const hash = ((x * 7 + y * 13) & 0xFF);
                    const g1 = 18 + (hash & 7);
                    const g2 = 24 + ((hash >> 3) & 7);
                    ctx.fillStyle = `rgb(${g1-4},${g2},${g1-2})`;
                }
                ctx.fillRect(px, py, ts, ts);
            }
        }

        // Border darker
        ctx.fillStyle = '#0a0a0a';
        if (Cam.x < 4) ctx.fillRect(-2, Cam.y, 4, Cam.h);
        if (Cam.y < 4) ctx.fillRect(Cam.x, -2, Cam.w, 4);
        if (Cam.x + Cam.w > CFG.WORLD_W - 4) ctx.fillRect(CFG.WORLD_W, Cam.y, 4, Cam.h);
        if (Cam.y + Cam.h > CFG.WORLD_H - 4) ctx.fillRect(Cam.x, CFG.WORLD_H, Cam.w, 4);
        ctx.strokeStyle = '#2a4a2a';
        ctx.lineWidth = 3;
        ctx.strokeRect(0, 0, CFG.WORLD_W, CFG.WORLD_H);

        // Decorations (only visible ones)
        for (const d of this.decorations) {
            if (d.x < Cam.x - 20 || d.x > Cam.x + Cam.w + 20 ||
                d.y < Cam.y - 20 || d.y > Cam.y + Cam.h + 20) continue;
            this._drawDeco(ctx, d);
        }
    },

    _drawDeco(ctx, d) {
        const s = d.scale;
        ctx.save();
        ctx.translate(d.x|0, d.y|0);
        ctx.scale(s, s);
        switch(d.type) {
            case 'grass':
                ctx.strokeStyle = d.variant===0 ? '#1a3a1a' : d.variant===1 ? '#1e3e1e' : '#163616';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(-3,0); ctx.lineTo(-1,-7);
                ctx.moveTo(0,0); ctx.lineTo(1,-9);
                ctx.moveTo(3,0); ctx.lineTo(2,-6);
                ctx.stroke();
                break;
            case 'flower':
                ctx.fillStyle = ['#f4a','#fa4','#a4f','#4af'][d.variant] || '#f4a';
                ctx.beginPath(); ctx.arc(0,-4,2.5,0,Math.PI*2); ctx.fill();
                ctx.strokeStyle='#1a3a1a'; ctx.lineWidth=1;
                ctx.beginPath(); ctx.moveTo(0,-2); ctx.lineTo(0,3); ctx.stroke();
                break;
            case 'stone':
                ctx.fillStyle = d.variant===0 ? '#3a3a3a' : '#4a4a4a';
                ctx.beginPath();
                ctx.ellipse(0,0,4+d.variant,3,0,0,Math.PI*2);
                ctx.fill();
                ctx.fillStyle = '#555';
                ctx.fillRect(-2,-2,2,1);
                break;
            case 'bone':
                ctx.fillStyle = '#aaa';
                ctx.fillRect(-4,0,8,2);
                ctx.beginPath(); ctx.arc(-4,1,2,0,Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(4,1,2,0,Math.PI*2); ctx.fill();
                break;
            case 'bush':
                ctx.fillStyle = '#1a4a1a';
                ctx.beginPath(); ctx.arc(0,-3,5,0,Math.PI*2); ctx.fill();
                ctx.fillStyle = '#1e5e1e';
                ctx.beginPath(); ctx.arc(-2,-5,3,0,Math.PI*2); ctx.fill();
                break;
            case 'mushroom':
                ctx.fillStyle = '#864';
                ctx.fillRect(-1,-1,2,5);
                ctx.fillStyle = d.variant===0 ? '#f44' : '#fa4';
                ctx.beginPath(); ctx.arc(0,-2,4,Math.PI,0); ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.fillRect(-1,-3,1,1);
                ctx.fillRect(1,-2,1,1);
                break;
        }
        ctx.restore();
    }
};
