// ============ WORLD — biomes, walls, day/night ============
const BIOMES = [
    { id:'forest', name:'Тёмный лес',
      ground:['#141e14','#121c12'], wall:'#2a4a1a', wallTop:'#3a6a2a',
      decos:['tree','tree','tree','bush','bush','mushroom','flower','stump','grass','grass'] },
    { id:'city', name:'Разрушенный город',
      ground:['#1a1a1a','#181818'], wall:'#4a4a4a', wallTop:'#5a5a5a',
      decos:['rubble','rubble','barrel','crate','lamppost','crack','crack','puddle'] },
    { id:'graveyard', name:'Кладбище',
      ground:['#141418','#121216'], wall:'#3a3a4a', wallTop:'#4a4a5a',
      decos:['grave','grave','grave','cross','bone','bone','deadtree','fog'] },
    { id:'dungeon', name:'Подземелье',
      ground:['#14100e','#120e0c'], wall:'#4a3a2a', wallTop:'#5a4a3a',
      decos:['torch','torch','skull','chain','crack','cobweb','cobweb','pillar'] },
    { id:'snow', name:'Ледяная пустошь',
      ground:['#1e2228','#1c2026'], wall:'#4a5a6a', wallTop:'#6a7a8a',
      decos:['snowpile','snowpile','deadtree','icicle','rock','rock','frost','frost'] }
];

const World = {
    walls: [],          // {x,y,w,h} — collision rects
    decos: [],
    biomeIdx: 0,
    biome: null,
    dayPhase: 0,        // 0-1, 0=noon, 0.5=midnight
    nightAlpha: 0,

    generate(biomeIdx) {
        this.biomeIdx = biomeIdx % BIOMES.length;
        this.biome = BIOMES[this.biomeIdx];
        this.walls = [];
        this.decos = [];

        const ts = CFG.TILE;
        const cols = Math.floor(CFG.WORLD_W / ts);
        const rows = Math.floor(CFG.WORLD_H / ts);

        // Generate wall layout based on biome
        if (this.biome.id === 'city') {
            this._genCity(cols, rows, ts);
        } else if (this.biome.id === 'dungeon') {
            this._genDungeon(cols, rows, ts);
        } else {
            this._genScattered(cols, rows, ts);
        }

        // Ensure player spawn area is clear
        this._clearArea(CFG.WORLD_W/2, CFG.WORLD_H/2, 120);

        // Generate decorations
        const decoTypes = this.biome.decos;
        for (let i = 0; i < 500; i++) {
            const x = Math.random() * CFG.WORLD_W;
            const y = Math.random() * CFG.WORLD_H;
            if (!this.isBlocked(x, y)) {
                this.decos.push({
                    x, y, type: U.pick(decoTypes),
                    variant: U.randInt(0,3),
                    scale: 0.6 + Math.random() * 0.6
                });
            }
        }
    },

    _genScattered(cols, rows, ts) {
        // Random wall clusters (forest, graveyard, snow)
        const clusters = 12 + Math.floor(Math.random() * 8);
        for (let c = 0; c < clusters; c++) {
            const cx = U.rand(2, cols-3) * ts;
            const cy = U.rand(2, rows-3) * ts;
            const shape = U.randInt(0, 3);
            if (shape === 0) { // L-shape
                this.walls.push({x:cx,y:cy,w:ts*3,h:ts});
                this.walls.push({x:cx,y:cy+ts,w:ts,h:ts*2});
            } else if (shape === 1) { // line
                const len = U.randInt(2,5);
                if (Math.random() > .5) this.walls.push({x:cx,y:cy,w:ts*len,h:ts});
                else this.walls.push({x:cx,y:cy,w:ts,h:ts*len});
            } else if (shape === 2) { // square
                const s = U.randInt(2,3);
                this.walls.push({x:cx,y:cy,w:ts*s,h:ts*s});
            } else { // cross
                this.walls.push({x:cx+ts,y:cy,w:ts,h:ts*3});
                this.walls.push({x:cx,y:cy+ts,w:ts*3,h:ts});
            }
        }
    },

    _genCity(cols, rows, ts) {
        // Grid-like streets with buildings
        for (let by = 2; by < rows - 4; by += 6) {
            for (let bx = 2; bx < cols - 4; bx += 7) {
                if (Math.random() < .7) {
                    const bw = U.randInt(2,4);
                    const bh = U.randInt(2,4);
                    this.walls.push({x:bx*ts, y:by*ts, w:bw*ts, h:bh*ts});
                }
            }
        }
    },

    _genDungeon(cols, rows, ts) {
        // Maze-like corridors
        // Fill with walls, carve rooms and paths
        const grid = [];
        for (let y=0;y<rows;y++) { grid[y]=[]; for(let x=0;x<cols;x++) grid[y][x]=1; }
        // Carve rooms
        for (let i=0;i<12;i++) {
            const rw=U.randInt(3,6), rh=U.randInt(3,5);
            const rx=U.randInt(1,cols-rw-1), ry=U.randInt(1,rows-rh-1);
            for(let y=ry;y<ry+rh;y++) for(let x=rx;x<rx+rw;x++) grid[y][x]=0;
        }
        // Carve center
        const cx=Math.floor(cols/2), cy=Math.floor(rows/2);
        for(let y=cy-3;y<=cy+3;y++) for(let x=cx-3;x<=cx+3;x++) if(y>0&&y<rows-1&&x>0&&x<cols-1) grid[y][x]=0;
        // Random corridors
        for (let i=0;i<8;i++) {
            let x=U.randInt(2,cols-3), y=U.randInt(2,rows-3);
            for(let s=0;s<30;s++) {
                grid[y][x]=0;
                if(Math.random()>.5) x+=Math.random()>.5?1:-1;
                else y+=Math.random()>.5?1:-1;
                x=U.clamp(x,1,cols-2); y=U.clamp(y,1,rows-2);
            }
        }
        // Convert grid to wall rects (merge horizontal runs)
        for(let y=0;y<rows;y++) {
            let run=0, sx=0;
            for(let x=0;x<=cols;x++) {
                if (x<cols && grid[y][x]===1) {
                    if(run===0) sx=x;
                    run++;
                } else {
                    if(run>0) this.walls.push({x:sx*ts,y:y*ts,w:run*ts,h:ts});
                    run=0;
                }
            }
        }
    },

    _clearArea(cx, cy, r) {
        this.walls = this.walls.filter(w =>
            !(w.x < cx+r && w.x+w.w > cx-r && w.y < cy+r && w.y+w.h > cy-r)
        );
    },

    isBlocked(x, y) {
        for (const w of this.walls) {
            if (x >= w.x && x <= w.x+w.w && y >= w.y && y <= w.y+w.h) return true;
        }
        return false;
    },

    // Resolve collision: push entity out of walls
    resolveCollision(ent) {
        for (const w of this.walls) {
            const closestX = U.clamp(ent.x, w.x, w.x+w.w);
            const closestY = U.clamp(ent.y, w.y, w.y+w.h);
            const dx = ent.x - closestX, dy = ent.y - closestY;
            const dist = Math.sqrt(dx*dx+dy*dy);
            if (dist < ent.r && dist > 0) {
                ent.x += (dx/dist)*(ent.r-dist);
                ent.y += (dy/dist)*(ent.r-dist);
            }
        }
    },

    updateDayNight(elapsed) {
        this.dayPhase = (elapsed % CFG.DAY_CYCLE) / CFG.DAY_CYCLE;
        // 0-0.4 = day, 0.4-0.5 = sunset, 0.5-0.9 = night, 0.9-1.0 = dawn
        if (this.dayPhase < 0.4) this.nightAlpha = 0;
        else if (this.dayPhase < 0.5) this.nightAlpha = (this.dayPhase - 0.4) / 0.1;
        else if (this.dayPhase < 0.9) this.nightAlpha = 1;
        else this.nightAlpha = 1 - (this.dayPhase - 0.9) / 0.1;
    },

    isNight() { return this.nightAlpha > 0.5; },

    draw(ctx) {
        const ts = CFG.TILE;
        const sx = Math.floor(Cam.x / ts) - 1;
        const sy = Math.floor(Cam.y / ts) - 1;
        const ex = Math.ceil((Cam.x + Cam.w) / ts) + 1;
        const ey = Math.ceil((Cam.y + Cam.h) / ts) + 1;
        const b = this.biome;

        // Ground
        for (let y=sy; y<=ey; y++) {
            for (let x=sx; x<=ex; x++) {
                const px=x*ts, py=y*ts;
                if (px<0||py<0||px>=CFG.WORLD_W||py>=CFG.WORLD_H) {
                    ctx.fillStyle='#050508';
                } else {
                    ctx.fillStyle = (x+y)%2===0 ? b.ground[0] : b.ground[1];
                }
                ctx.fillRect(px,py,ts,ts);
            }
        }

        // Walls
        for (const w of this.walls) {
            if (w.x+w.w<Cam.x||w.x>Cam.x+Cam.w||w.y+w.h<Cam.y||w.y>Cam.y+Cam.h) continue;
            // Wall body
            ctx.fillStyle = b.wall;
            ctx.fillRect(w.x, w.y, w.w, w.h);
            // Top edge highlight
            ctx.fillStyle = b.wallTop;
            ctx.fillRect(w.x, w.y, w.w, 3);
            ctx.fillRect(w.x, w.y, 2, w.h);
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,.25)';
            ctx.fillRect(w.x+2, w.y+w.h, w.w, 4);
            ctx.fillRect(w.x+w.w, w.y+2, 4, w.h);
        }

        // Border
        ctx.strokeStyle = b.wall;
        ctx.lineWidth = 4;
        ctx.strokeRect(0,0,CFG.WORLD_W,CFG.WORLD_H);

        // Decorations
        for (const d of this.decos) {
            if (d.x<Cam.x-30||d.x>Cam.x+Cam.w+30||d.y<Cam.y-30||d.y>Cam.y+Cam.h+30) continue;
            this._drawDeco(ctx, d);
        }
    },

    drawNightOverlay(ctx, cw, ch) {
        if (this.nightAlpha < 0.01) return;
        // Dark blue overlay
        ctx.globalAlpha = this.nightAlpha * 0.55;
        ctx.fillStyle = '#000020';
        ctx.fillRect(0,0,cw,ch);
        // Player "light" circle cutout via radial gradient
        if (this.nightAlpha > 0.2) {
            const px = Player.x - Cam.x + Cam.sx;
            const py = Player.y - Cam.y + Cam.sy;
            const r = 120 + Math.sin(performance.now()/800)*10;
            const grad = ctx.createRadialGradient(px,py,r*0.3, px,py,r);
            grad.addColorStop(0,'rgba(0,0,32,0)');
            grad.addColorStop(1,`rgba(0,0,32,${this.nightAlpha*0.4})`);
            ctx.globalAlpha = 1;
            ctx.fillStyle = grad;
            ctx.fillRect(0,0,cw,ch);
        }
        ctx.globalAlpha = 1;
    },

    _drawDeco(ctx, d) {
        ctx.save();
        ctx.translate(d.x|0, d.y|0);
        ctx.scale(d.scale, d.scale);
        switch(d.type) {
            case 'tree':
                ctx.fillStyle='#2a1a0a'; ctx.fillRect(-2,0,4,12);
                ctx.fillStyle='#1a4a1a';
                ctx.beginPath(); ctx.arc(0,-4,9,0,Math.PI*2); ctx.fill();
                ctx.fillStyle='#1e5e1e';
                ctx.beginPath(); ctx.arc(-2,-7,6,0,Math.PI*2); ctx.fill();
                break;
            case 'deadtree':
                ctx.strokeStyle='#3a2a1a'; ctx.lineWidth=2;
                ctx.beginPath(); ctx.moveTo(0,6); ctx.lineTo(0,-8); ctx.lineTo(-5,-14); ctx.moveTo(0,-5); ctx.lineTo(4,-11); ctx.stroke();
                break;
            case 'bush':
                ctx.fillStyle='#1a4a1a';
                ctx.beginPath(); ctx.arc(0,-2,6,0,Math.PI*2); ctx.fill();
                ctx.fillStyle='#1e5e1e';
                ctx.beginPath(); ctx.arc(-2,-4,4,0,Math.PI*2); ctx.fill();
                break;
            case 'grass':
                ctx.strokeStyle='#1e3e1e'; ctx.lineWidth=1;
                ctx.beginPath(); ctx.moveTo(-3,0); ctx.lineTo(-1,-7); ctx.moveTo(0,0); ctx.lineTo(1,-9); ctx.moveTo(3,0); ctx.lineTo(2,-6); ctx.stroke();
                break;
            case 'flower':
                ctx.fillStyle=['#f4a','#fa4','#a4f','#4af'][d.variant];
                ctx.beginPath(); ctx.arc(0,-4,2.5,0,Math.PI*2); ctx.fill();
                ctx.strokeStyle='#1a3a1a'; ctx.lineWidth=1;
                ctx.beginPath(); ctx.moveTo(0,-2); ctx.lineTo(0,3); ctx.stroke();
                break;
            case 'mushroom':
                ctx.fillStyle='#864'; ctx.fillRect(-1,-1,2,5);
                ctx.fillStyle=d.variant>1?'#f44':'#fa4';
                ctx.beginPath(); ctx.arc(0,-2,4,Math.PI,0); ctx.fill();
                ctx.fillStyle='#fff'; ctx.fillRect(-1,-3,1,1); ctx.fillRect(1,-2,1,1);
                break;
            case 'stump':
                ctx.fillStyle='#3a2a1a';
                ctx.beginPath(); ctx.ellipse(0,0,5,4,0,0,Math.PI*2); ctx.fill();
                ctx.fillStyle='#4a3a2a'; ctx.fillRect(-3,-1,6,2);
                break;
            case 'rubble':
                ctx.fillStyle='#4a4a4a';
                ctx.fillRect(-4,-2,8,4);
                ctx.fillStyle='#3a3a3a';
                ctx.fillRect(-2,-4,5,3);
                break;
            case 'barrel':
                ctx.fillStyle='#654'; ctx.fillRect(-4,-5,8,10);
                ctx.fillStyle='#876'; ctx.fillRect(-4,-5,8,2); ctx.fillRect(-4,3,8,2);
                break;
            case 'crate':
                ctx.fillStyle='#754'; ctx.fillRect(-5,-5,10,10);
                ctx.strokeStyle='#543'; ctx.lineWidth=1; ctx.strokeRect(-5,-5,10,10);
                ctx.beginPath(); ctx.moveTo(-5,-5); ctx.lineTo(5,5); ctx.moveTo(5,-5); ctx.lineTo(-5,5); ctx.stroke();
                break;
            case 'lamppost':
                ctx.fillStyle='#555'; ctx.fillRect(-1,-12,2,14);
                ctx.fillStyle='#ff8'; ctx.globalAlpha=.3;
                ctx.beginPath(); ctx.arc(0,-12,8,0,Math.PI*2); ctx.fill();
                ctx.globalAlpha=1;
                ctx.fillStyle='#ff8'; ctx.fillRect(-2,-13,4,3);
                break;
            case 'crack':
                ctx.strokeStyle='#333'; ctx.lineWidth=1;
                ctx.beginPath(); ctx.moveTo(-5,0); ctx.lineTo(-1,-3); ctx.lineTo(2,1); ctx.lineTo(6,-2); ctx.stroke();
                break;
            case 'puddle':
                ctx.globalAlpha=.3; ctx.fillStyle='#448';
                ctx.beginPath(); ctx.ellipse(0,0,6,3,0,0,Math.PI*2); ctx.fill();
                ctx.globalAlpha=1;
                break;
            case 'grave':
                ctx.fillStyle='#555'; ctx.fillRect(-3,-6,6,8);
                ctx.fillStyle='#666';
                ctx.beginPath(); ctx.arc(0,-6,3,Math.PI,0); ctx.fill();
                break;
            case 'cross':
                ctx.fillStyle='#666'; ctx.fillRect(-1,-8,2,10); ctx.fillRect(-4,-5,8,2);
                break;
            case 'bone':
                ctx.fillStyle='#aaa'; ctx.fillRect(-4,0,8,2);
                ctx.beginPath(); ctx.arc(-4,1,2,0,Math.PI*2); ctx.fill();
                ctx.beginPath(); ctx.arc(4,1,2,0,Math.PI*2); ctx.fill();
                break;
            case 'fog':
                ctx.globalAlpha=.08; ctx.fillStyle='#aaf';
                ctx.beginPath(); ctx.ellipse(0,0,15,8,0,0,Math.PI*2); ctx.fill();
                ctx.globalAlpha=1;
                break;
            case 'torch':
                ctx.fillStyle='#654'; ctx.fillRect(-1,-4,2,8);
                ctx.fillStyle='#f80'; ctx.globalAlpha=.5+Math.sin(performance.now()/200+d.x)*.3;
                ctx.beginPath(); ctx.arc(0,-5,4,0,Math.PI*2); ctx.fill();
                ctx.globalAlpha=1;
                ctx.fillStyle='#ff4'; ctx.beginPath(); ctx.arc(0,-5,2,0,Math.PI*2); ctx.fill();
                break;
            case 'skull':
                ctx.fillStyle='#ccc';
                ctx.beginPath(); ctx.arc(0,-1,4,0,Math.PI*2); ctx.fill();
                ctx.fillStyle='#000'; ctx.fillRect(-2,-2,1.5,1.5); ctx.fillRect(1,-2,1.5,1.5);
                ctx.fillRect(-1,1,2,1);
                break;
            case 'chain':
                ctx.strokeStyle='#666'; ctx.lineWidth=1.5;
                for(let i=0;i<4;i++) {
                    ctx.beginPath(); ctx.ellipse(0,-4+i*3,2,1.5,0,0,Math.PI*2); ctx.stroke();
                }
                break;
            case 'cobweb':
                ctx.strokeStyle='#888'; ctx.lineWidth=.5; ctx.globalAlpha=.3;
                for(let a=0;a<6;a++) {
                    const ang=a*Math.PI/3;
                    ctx.beginPath(); ctx.moveTo(0,0);
                    ctx.lineTo(Math.cos(ang)*8,Math.sin(ang)*8); ctx.stroke();
                }
                ctx.globalAlpha=1;
                break;
            case 'pillar':
                ctx.fillStyle='#5a4a3a'; ctx.fillRect(-3,-8,6,16);
                ctx.fillStyle='#6a5a4a'; ctx.fillRect(-4,-8,8,3); ctx.fillRect(-4,5,8,3);
                break;
            case 'snowpile':
                ctx.fillStyle='#cce';
                ctx.beginPath(); ctx.ellipse(0,0,6+d.variant,3,0,0,Math.PI*2); ctx.fill();
                ctx.fillStyle='#ddf';
                ctx.beginPath(); ctx.ellipse(-1,-1,3,2,0,0,Math.PI*2); ctx.fill();
                break;
            case 'icicle':
                ctx.fillStyle='#8cf';
                ctx.beginPath(); ctx.moveTo(-2,-6); ctx.lineTo(0,4); ctx.lineTo(2,-6); ctx.fill();
                break;
            case 'rock':
                ctx.fillStyle='#5a5a6a';
                ctx.beginPath(); ctx.ellipse(0,0,5+d.variant,4,0,0,Math.PI*2); ctx.fill();
                ctx.fillStyle='#6a6a7a'; ctx.fillRect(-2,-2,3,2);
                break;
            case 'frost':
                ctx.strokeStyle='#8cf'; ctx.lineWidth=.7; ctx.globalAlpha=.4;
                for(let a=0;a<6;a++) {
                    const ang=a*Math.PI/3;
                    ctx.beginPath(); ctx.moveTo(0,0);
                    ctx.lineTo(Math.cos(ang)*5,Math.sin(ang)*5); ctx.stroke();
                }
                ctx.globalAlpha=1;
                break;
        }
        ctx.restore();
    }
};
