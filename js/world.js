// ============ HEX WORLD — premium graphics ============
const World = {
    cells:{}, centerX:0, centerY:0,

    generate() {
        this.cells={};
        const R=CFG.GRID_RINGS;
        for(let q=-R;q<=R;q++) for(let r=-R;r<=R;r++){
            if(Math.abs(q+r)>R) continue;
            const dist=U.hexDist(q,r,0,0);
            this.cells[U.hexKey(q,r)]={q,r,type:dist===0?'core':'ground',building:null,
                // Visual variety
                shade:Math.random()*.08, deco:Math.random()<.15?U.randInt(0,5):-1};
        }
        const cp=U.hexToPixel(0,0);
        this.centerX=cp.x; this.centerY=cp.y;
    },

    getCell(q,r){return this.cells[U.hexKey(q,r)];},
    canBuild(q,r){const c=this.getCell(q,r);return c&&c.type!=='core'&&!c.building;},

    draw(ctx, phase, time) {
        const isNight = phase==='wave';
        const t = time || 0;

        for(const key in this.cells) {
            const c=this.cells[key];
            const p=U.hexToPixel(c.q,c.r);
            if(p.x<Cam.x-50||p.x>Cam.x+Cam.w+50||p.y<Cam.y-50||p.y>Cam.y+Cam.h+50) continue;

            const hr=CFG.HEX_R-1;
            const dist=U.hexDist(c.q,c.r,0,0);

            if(c.type==='core') {
                // Core hex — animated crystal
                const pulse=Math.sin(t*2)*.08;

                // Base glow
                ctx.globalAlpha=.15+pulse;
                ctx.fillStyle='#4af';
                ctx.beginPath();ctx.arc(p.x,p.y,hr+6,0,Math.PI*2);ctx.fill();
                ctx.globalAlpha=1;

                U.drawHex(ctx,p.x,p.y,hr,'#0a1a3a','#4af');

                // Crystal body
                ctx.fillStyle='#38a';
                ctx.beginPath();
                ctx.moveTo(p.x,p.y-14);ctx.lineTo(p.x+8,p.y-2);ctx.lineTo(p.x+5,p.y+10);
                ctx.lineTo(p.x-5,p.y+10);ctx.lineTo(p.x-8,p.y-2);
                ctx.closePath();ctx.fill();

                // Crystal shine
                ctx.fillStyle='#6cf';
                ctx.beginPath();
                ctx.moveTo(p.x-2,p.y-12);ctx.lineTo(p.x+3,p.y-4);ctx.lineTo(p.x-1,p.y+6);ctx.lineTo(p.x-5,p.y-2);
                ctx.closePath();ctx.fill();

                // Top sparkle
                ctx.fillStyle='#fff';
                ctx.globalAlpha=.6+Math.sin(t*4)*.3;
                ctx.beginPath();ctx.arc(p.x,p.y-12,2,0,Math.PI*2);ctx.fill();
                ctx.globalAlpha=1;

                // HP ring
                const hpRatio=Game.coreHp/CFG.CORE_HP;
                ctx.strokeStyle=hpRatio>.5?'#4af':'#f44';
                ctx.lineWidth=3;
                ctx.beginPath();ctx.arc(p.x,p.y,hr-3,-Math.PI/2,-Math.PI/2+Math.PI*2*hpRatio);ctx.stroke();
            } else {
                // Ground hex — layered terrain
                const ring=dist/CFG.GRID_RINGS;
                const base=isNight?8:16;
                const g=base+Math.floor(c.shade*30);
                const edgeDark=ring>.7;

                // Hex fill with gradient feel
                const col=edgeDark?
                    `rgb(${g-4},${g-2},${g-6})`:`rgb(${g-2},${g+4},${g-4})`;
                U.drawHex(ctx,p.x,p.y,hr,col, isNight?'#181820':'#1a1e1a');

                // Inner detail pattern
                if(dist%3===0 && !c.building) {
                    ctx.globalAlpha=.08;
                    ctx.fillStyle=isNight?'#226':'#242';
                    U.drawHex(ctx,p.x,p.y,hr*.6,ctx.fillStyle);
                    ctx.globalAlpha=1;
                }

                // Small decorations on empty cells
                if(c.deco>=0 && !c.building) {
                    ctx.globalAlpha=isNight?.3:.5;
                    switch(c.deco) {
                        case 0: // grass tufts
                            ctx.strokeStyle=isNight?'#1a2a1a':'#2a4a2a';ctx.lineWidth=1;
                            ctx.beginPath();ctx.moveTo(p.x-3,p.y+2);ctx.lineTo(p.x-1,p.y-4);
                            ctx.moveTo(p.x+1,p.y+2);ctx.lineTo(p.x+2,p.y-5);
                            ctx.moveTo(p.x+4,p.y+1);ctx.lineTo(p.x+3,p.y-3);ctx.stroke();
                            break;
                        case 1: // pebbles
                            ctx.fillStyle='#3a3a3a';
                            ctx.beginPath();ctx.arc(p.x-3,p.y+2,2,0,Math.PI*2);ctx.fill();
                            ctx.beginPath();ctx.arc(p.x+4,p.y-1,1.5,0,Math.PI*2);ctx.fill();
                            break;
                        case 2: // tiny flower
                            ctx.fillStyle=['#f6a','#fa6','#6af','#af6'][dist%4];
                            ctx.beginPath();ctx.arc(p.x,p.y-2,2,0,Math.PI*2);ctx.fill();
                            ctx.strokeStyle='#2a4a2a';ctx.lineWidth=1;
                            ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x,p.y+4);ctx.stroke();
                            break;
                        case 3: // rune mark
                            ctx.strokeStyle='#335';ctx.lineWidth=1;
                            ctx.beginPath();ctx.arc(p.x,p.y,5,0,Math.PI*1.5);ctx.stroke();
                            break;
                        case 4: // cracks
                            ctx.strokeStyle='#2a2a2a';ctx.lineWidth=.7;
                            ctx.beginPath();ctx.moveTo(p.x-5,p.y-2);ctx.lineTo(p.x,p.y+1);ctx.lineTo(p.x+4,p.y-3);ctx.stroke();
                            break;
                        case 5: // moss
                            ctx.fillStyle='#1a3a1a';
                            ctx.beginPath();ctx.ellipse(p.x+2,p.y+3,4,2,0,0,Math.PI*2);ctx.fill();
                            break;
                    }
                    ctx.globalAlpha=1;
                }

                // Range indicator for selected tower (during build)
                if(Game.state===ST.BUILD && c.building && c.building.def.range) {
                    const range=c.building.def.range*CFG.HEX_R*1.8;
                    ctx.globalAlpha=.06;ctx.fillStyle=c.building.def.color;
                    ctx.beginPath();ctx.arc(p.x,p.y,range,0,Math.PI*2);ctx.fill();
                    ctx.globalAlpha=1;
                }
            }
        }
    }
};
