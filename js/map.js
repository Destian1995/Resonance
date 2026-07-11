// ============================================
// Map — NEON style dark terrain
// ============================================

const GameMap = {
    tiles: [],
    oilDerricks: [],
    zones: [],       // territory zones
    width: 0,
    height: 0,

    init(playerCount) {
        this.width = CFG.MAP_W;
        this.height = CFG.MAP_H;
        this.oilDerricks = [];
        this.zones = [];
        this.generateTiles(playerCount);
        this.generateZones(playerCount);
        this.generateOilDerricks(playerCount);
    },

    // Territory zones — full Voronoi coverage
    zoneGrid: null, // pre-computed: which zone owns each tile

    generateZones(playerCount) {
        const zoneCount = Math.max(6, Math.min(19, 4 + playerCount * 3));
        const margin = 40;
        const points = [];

        // Place zone centers with good spacing
        for (let i = 0; i < zoneCount; i++) {
            let attempts = 0, px, py;
            do {
                px = Utils.rand(margin, this.width - margin);
                py = Utils.rand(margin, this.height - margin);
                attempts++;
                let ok = true;
                for (const p of points) {
                    if (Utils.dist(px, py, p.x, p.y) < 80) { ok = false; break; }
                }
                if (ok) break;
            } while (attempts < 80);

            points.push({
                x: px, y: py,
                owner: -1,
                id: i,
                captureProgress: {},
            });
        }
        this.zones = points;

        // Pre-compute Voronoi grid (which zone each tile belongs to)
        const step = CFG.TILE; // resolution = tile size
        const cols = Math.ceil(this.width / step);
        const rows = Math.ceil(this.height / step);
        this.zoneGrid = [];
        for (let r = 0; r < rows; r++) {
            this.zoneGrid[r] = [];
            for (let c = 0; c < cols; c++) {
                const wx = c * step + step / 2;
                const wy = r * step + step / 2;
                let minD = Infinity, best = 0;
                for (let z = 0; z < this.zones.length; z++) {
                    const d = Utils.dist(wx, wy, this.zones[z].x, this.zones[z].y);
                    if (d < minD) { minD = d; best = z; }
                }
                this.zoneGrid[r][c] = best;
            }
        }
    },

    getZoneAt(wx, wy) {
        const step = CFG.TILE;
        const c = Math.floor(wx / step);
        const r = Math.floor(wy / step);
        if (this.zoneGrid && this.zoneGrid[r] && this.zoneGrid[r][c] !== undefined) {
            return this.zones[this.zoneGrid[r][c]];
        }
        // Fallback
        let nearest = null, minD = Infinity;
        for (const z of this.zones) {
            const d = Utils.dist(wx, wy, z.x, z.y);
            if (d < minD) { minD = d; nearest = z; }
        }
        return nearest;
    },

    // Check if unit is on friendly territory (for defense bonus)
    isOnFriendlyTerritory(unit) {
        const z = this.getZoneAt(unit.x, unit.y);
        return z && z.owner === unit.playerId;
    },

    // Defense bonus multiplier: 0.75 = take 25% less damage on own territory
    getDefenseBonus(x, y, playerId) {
        const z = this.getZoneAt(x, y);
        if (z && z.owner === playerId) return 0.75;
        return 1.0;
    },

    updateZones(players, units, dt) {
        for (const z of this.zones) {
            const near = {};
            // Count units in THIS zone (not just near center — check zoneGrid)
            for (const u of units) {
                if (u.dead) continue;
                const uz = this.getZoneAt(u.x, u.y);
                if (uz && uz.id === z.id) {
                    near[u.playerId] = (near[u.playerId] || 0) + 1;
                }
            }
            for (const p of players) {
                if (!p.alive) continue;
                for (const b of p.buildings) {
                    if (b.dead) continue;
                    const bz = this.getZoneAt(b.getCenterX(), b.getCenterY());
                    if (bz && bz.id === z.id) {
                        near[p.id] = (near[p.id] || 0) + 3;
                    }
                }
            }

            let best = -1, bestCount = 0, contested = false;
            for (const [pid, cnt] of Object.entries(near)) {
                const id = parseInt(pid);
                if (cnt > bestCount) { bestCount = cnt; best = id; contested = false; }
                else if (cnt === bestCount && cnt > 0) { contested = true; }
            }

            if (contested || bestCount === 0) continue;
            if (best === z.owner) continue;

            if (!z.captureProgress[best]) z.captureProgress[best] = 0;
            z.captureProgress[best] += dt * 500;
            for (const k of Object.keys(z.captureProgress)) {
                if (parseInt(k) !== best) z.captureProgress[k] = Math.max(0, z.captureProgress[k] - dt * 200);
            }
            if (z.captureProgress[best] >= 2000) {
                z.owner = best;
                z.captureProgress = {};
            }
        }
    },

    getPlayerZoneCount(playerId) {
        return this.zones.filter(z => z.owner === playerId).length;
    },

    generateTiles(playerCount) {
        const rows = CFG.MAP_ROWS;
        const cols = CFG.MAP_COLS;
        this.tiles = [];
        for (let r = 0; r < rows; r++) {
            this.tiles[r] = [];
            for (let c = 0; c < cols; c++) this.tiles[r][c] = CFG.TILE_EMPTY;
        }
        // Border
        for (let r = 0; r < rows; r++) { this.tiles[r][0] = CFG.TILE_STEEL; this.tiles[r][cols-1] = CFG.TILE_STEEL; }
        for (let c = 0; c < cols; c++) { this.tiles[0][c] = CFG.TILE_STEEL; this.tiles[rows-1][c] = CFG.TILE_STEEL; }

        const clearRadius = 5;
        const startTiles = CFG.START_POSITIONS.slice(0, playerCount).map(p => ({
            c: Math.floor(p.x / CFG.TILE), r: Math.floor(p.y / CFG.TILE),
        }));
        this.generateBrickClusters(6 + playerCount, startTiles, clearRadius);
        this.generateSteelClusters(2 + playerCount, startTiles, clearRadius);
        this.generateWaterPatches(2, startTiles, clearRadius);
        this.generateTreePatches(3 + playerCount, startTiles, clearRadius);
        this.generateIcePatches(2, startTiles, clearRadius);
    },

    isClearOfStarts(r, c, starts, radius) {
        for (const s of starts) { if (Math.abs(r - s.r) < radius && Math.abs(c - s.c) < radius) return false; }
        return true;
    },

    generateBrickClusters(count, starts, clearR) {
        for (let i = 0; i < count; i++) {
            const cr = Utils.randInt(3, CFG.MAP_ROWS - 4);
            const cc = Utils.randInt(3, CFG.MAP_COLS - 4);
            if (!this.isClearOfStarts(cr, cc, starts, clearR)) continue;
            const shape = Utils.randInt(0, 4);
            if (shape <= 1) { const len = Utils.randInt(3, 7); for (let j = 0; j < len; j++) this.setTileSafe(cr + (shape ? j : 0), cc + (shape ? 0 : j), CFG.TILE_BRICK); }
            else if (shape === 2) { for (let dr = 0; dr < Utils.randInt(2,3); dr++) for (let dc = 0; dc < Utils.randInt(2,3); dc++) this.setTileSafe(cr+dr, cc+dc, CFG.TILE_BRICK); }
            else { for (let j = 0; j < 4; j++) this.setTileSafe(cr+j, cc, CFG.TILE_BRICK); for (let j = 1; j < 3; j++) this.setTileSafe(cr+3, cc+j, CFG.TILE_BRICK); }
        }
    },
    generateSteelClusters(count, starts, clearR) {
        for (let i = 0; i < count; i++) { const cr = Utils.randInt(4, CFG.MAP_ROWS-5); const cc = Utils.randInt(4, CFG.MAP_COLS-5); if (!this.isClearOfStarts(cr,cc,starts,clearR+2)) continue; for (let dr=0;dr<Utils.randInt(1,2);dr++) for (let dc=0;dc<Utils.randInt(1,2);dc++) this.setTileSafe(cr+dr,cc+dc,CFG.TILE_STEEL); }
    },
    generateWaterPatches(count, starts, clearR) {
        for (let i = 0; i < count; i++) { const cr = Utils.randInt(5, CFG.MAP_ROWS-6); const cc = Utils.randInt(5, CFG.MAP_COLS-6); if (!this.isClearOfStarts(cr,cc,starts,clearR+2)) continue; const s=Utils.randInt(2,3); for (let dr=0;dr<s;dr++) for (let dc=0;dc<s;dc++) if (Math.random()>0.25) this.setTileSafe(cr+dr,cc+dc,CFG.TILE_WATER); }
    },
    generateTreePatches(count, starts, clearR) {
        for (let i = 0; i < count; i++) { const cr = Utils.randInt(3, CFG.MAP_ROWS-6); const cc = Utils.randInt(3, CFG.MAP_COLS-6); if (!this.isClearOfStarts(cr,cc,starts,clearR)) continue; for (let dr=0;dr<Utils.randInt(2,4);dr++) for (let dc=0;dc<Utils.randInt(2,4);dc++) if (Math.random()>0.2) this.setTileSafe(cr+dr,cc+dc,CFG.TILE_TREES); }
    },
    generateIcePatches(count, starts, clearR) {
        for (let i = 0; i < count; i++) { const cr = Utils.randInt(5, CFG.MAP_ROWS-8); const cc = Utils.randInt(5, CFG.MAP_COLS-8); if (!this.isClearOfStarts(cr,cc,starts,clearR)) continue; for (let dr=0;dr<Utils.randInt(3,5);dr++) for (let dc=0;dc<Utils.randInt(3,5);dc++) if (this.getTile(cr+dr,cc+dc)===CFG.TILE_EMPTY) this.setTileSafe(cr+dr,cc+dc,CFG.TILE_ICE); }
    },

    setTileSafe(r, c, type) { if (r>0&&r<CFG.MAP_ROWS-1&&c>0&&c<CFG.MAP_COLS-1&&this.tiles[r][c]===CFG.TILE_EMPTY) this.tiles[r][c]=type; },
    getTile(r, c) { if (r<0||r>=CFG.MAP_ROWS||c<0||c>=CFG.MAP_COLS) return CFG.TILE_STEEL; return this.tiles[r][c]; },
    setTile(r, c, type) { if (r>=0&&r<CFG.MAP_ROWS&&c>=0&&c<CFG.MAP_COLS) this.tiles[r][c]=type; },
    worldToTile(wx, wy) { return { c: Math.floor(wx/CFG.TILE), r: Math.floor(wy/CFG.TILE) }; },
    damageTile(r, c) { if (this.getTile(r,c)===CFG.TILE_BRICK) { this.tiles[r][c]=CFG.TILE_EMPTY; return true; } return false; },

    generateOilDerricks(playerCount) {
        const count = 3 + playerCount; const margin = 5;
        for (let i = 0; i < count; i++) {
            let attempts = 0, r, c;
            do { c = Utils.randInt(margin, CFG.MAP_COLS-margin); r = Utils.randInt(margin, CFG.MAP_ROWS-margin); attempts++; }
            while (attempts < 60 && !this.isValidDerrickPos(r, c, playerCount));
            if (attempts < 60) {
                for (let dr=-1;dr<=1;dr++) for (let dc=-1;dc<=1;dc++) this.setTile(r+dr,c+dc,CFG.TILE_EMPTY);
                this.oilDerricks.push({ x: c*CFG.TILE+CFG.TILE/2, y: r*CFG.TILE+CFG.TILE/2, owner:-1, level:1, captureProgress:0, capturingPlayer:-1, radius:CFG.TILE, selected:false });
            }
        }
    },
    isValidDerrickPos(r, c, pc) {
        if (this.getTile(r,c)!==CFG.TILE_EMPTY) return false;
        for (const d of this.oilDerricks) { if (Math.abs(r-Math.floor(d.y/CFG.TILE))<5&&Math.abs(c-Math.floor(d.x/CFG.TILE))<5) return false; }
        for (let i=0;i<pc;i++) { const sp=CFG.START_POSITIONS[i]; if (Math.abs(r-Math.floor(sp.y/CFG.TILE))<5&&Math.abs(c-Math.floor(sp.x/CFG.TILE))<5) return false; }
        return true;
    },

    isPassable(x, y, radius = 4) {
        const t = CFG.TILE;
        const corners = [
            {r:Math.floor((y-radius)/t),c:Math.floor((x-radius)/t)},{r:Math.floor((y-radius)/t),c:Math.floor((x+radius)/t)},
            {r:Math.floor((y+radius)/t),c:Math.floor((x-radius)/t)},{r:Math.floor((y+radius)/t),c:Math.floor((x+radius)/t)},
        ];
        for (const p of corners) { const tile=this.getTile(p.r,p.c); if (tile===CFG.TILE_BRICK||tile===CFG.TILE_STEEL||tile===CFG.TILE_WATER) return false; }
        return true;
    },

    updateDerricks(players, units, dt) {
        for (const d of this.oilDerricks) {
            let pNear = {};
            for (const u of units) { if (u.dead) continue; if (Utils.dist(u.x,u.y,d.x,d.y)<CFG.CAPTURE_RADIUS) pNear[u.playerId]=(pNear[u.playerId]||0)+1; }
            let np=-1, mx=0, contested=false;
            for (const [pid,cnt] of Object.entries(pNear)) { if (cnt>mx){mx=cnt;np=parseInt(pid);contested=false;}else if(cnt===mx&&cnt>0)contested=true; }
            if (contested||mx===0) { if (d.captureProgress>0) d.captureProgress=Math.max(0,d.captureProgress-dt*500); continue; }
            if (np===d.owner) continue;
            if (d.capturingPlayer!==np){d.capturingPlayer=np;d.captureProgress=0;}
            d.captureProgress+=dt*1000;
            if (d.captureProgress>=CFG.CAPTURE_TIME){d.owner=np;d.captureProgress=0;d.capturingPlayer=-1;}
        }
    },

    getPlayerDerrickCount(pid) { return this.oilDerricks.filter(d=>d.owner===pid).length; },
    getPlayerDerricks(pid) { return this.oilDerricks.filter(d=>d.owner===pid); },
    getPlayerDerrickIncome(pid) { let s=0; for(const d of this.oilDerricks) if(d.owner===pid) s+=CFG.DERRICK_STATS[d.level-1].income; return s; },
    getPlayerDerrickOil(pid) { let s=0; for(const d of this.oilDerricks) if(d.owner===pid) s+=CFG.DERRICK_STATS[d.level-1].oil; return s; },
    getPlayerDerrickMetal(pid) { let s=0; for(const d of this.oilDerricks) if(d.owner===pid) s+=CFG.DERRICK_STATS[d.level-1].metal; return s; },
    canUpgradeDerrick(d) { return d.owner>=0&&d.level<3; },
    getDerrickUpgradeCost(d) { return d.level>=3?null:CFG.DERRICK_UPGRADE[d.level-1]; },
    upgradeDerrick(d) { if(d.level<3)d.level++; },
    getDerrickAt(wx,wy) { for(const d of this.oilDerricks) if(Utils.dist(wx,wy,d.x,d.y)<20)return d; return null; },

    // ==================
    // NEON RENDERING
    // ==================
    draw(ctx) {
        const t = CFG.TILE;

        // Тёмный фон
        ctx.fillStyle = '#0a0a12';
        ctx.fillRect(0, 0, this.width, this.height);

        // Тонкая неоновая сетка
        ctx.strokeStyle = 'rgba(0,255,180,0.04)';
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= this.width; x += t) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.height); ctx.stroke();
        }
        for (let y = 0; y <= this.height; y += t) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.width, y); ctx.stroke();
        }

        // Territory zones — colored regions
        this.drawZones(ctx);

        // Тайлы
        for (let r = 0; r < CFG.MAP_ROWS; r++) {
            for (let c = 0; c < CFG.MAP_COLS; c++) {
                const tile = this.tiles[r][c];
                const x = c * t, y = r * t;
                switch (tile) {
                    case CFG.TILE_BRICK: this.drawBrick(ctx, x, y, t); break;
                    case CFG.TILE_STEEL: this.drawSteel(ctx, x, y, t); break;
                    case CFG.TILE_WATER: this.drawWater(ctx, x, y, t); break;
                    case CFG.TILE_ICE: this.drawIce(ctx, x, y, t); break;
                }
            }
        }
    },

    drawTreesLayer(ctx) {
        const t = CFG.TILE;
        for (let r = 0; r < CFG.MAP_ROWS; r++)
            for (let c = 0; c < CFG.MAP_COLS; c++)
                if (this.tiles[r][c] === CFG.TILE_TREES) this.drawTrees(ctx, c*t, r*t, t);
    },

    drawBrick(ctx, x, y, t) {
        ctx.fillStyle = '#5a2010';
        ctx.fillRect(x+1, y+1, t-2, t-2);
        // Неоновый контур
        ctx.strokeStyle = 'rgba(255,100,50,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x+0.5, y+0.5, t-1, t-1);
        // Кирпичный рисунок
        ctx.fillStyle = '#7a3020';
        const h = t / 4;
        ctx.fillRect(x+2, y+1, t/2-2, h-1);
        ctx.fillRect(x+t/2+1, y+h+1, t/2-3, h-1);
        ctx.fillRect(x+2, y+h*2+1, t/2-2, h-1);
    },

    drawSteel(ctx, x, y, t) {
        ctx.fillStyle = '#2a2a3a';
        ctx.fillRect(x, y, t, t);
        // Неоновое свечение
        ctx.shadowColor = '#4488ff';
        ctx.shadowBlur = 4;
        ctx.strokeStyle = 'rgba(80,130,255,0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x+0.5, y+0.5, t-1, t-1);
        ctx.shadowBlur = 0;
        // Блик
        ctx.fillStyle = 'rgba(100,150,255,0.15)';
        ctx.fillRect(x+2, y+2, t/2-2, t/2-2);
    },

    drawWater(ctx, x, y, t) {
        const time = Date.now() * 0.003;
        const phase = Math.sin(time + x*0.1 + y*0.1);
        ctx.fillStyle = '#0a1530';
        ctx.fillRect(x, y, t, t);
        // Неоновая вода
        ctx.shadowColor = '#0088ff';
        ctx.shadowBlur = 6;
        ctx.fillStyle = phase > 0 ? 'rgba(0,100,255,0.3)' : 'rgba(0,80,230,0.3)';
        ctx.fillRect(x+2, y+2, t-4, t-4);
        ctx.shadowBlur = 0;
        // Блики
        ctx.fillStyle = 'rgba(100,180,255,0.4)';
        ctx.fillRect(x+3, y+Math.floor(phase*2+t/3), t-6, 2);
    },

    drawTrees(ctx, x, y, t) {
        ctx.fillStyle = 'rgba(0,60,20,0.7)';
        ctx.fillRect(x, y, t, t);
        // Неоновые листья
        ctx.shadowColor = '#00ff60';
        ctx.shadowBlur = 4;
        ctx.fillStyle = 'rgba(0,200,60,0.5)';
        ctx.beginPath(); ctx.arc(x+t/2, y+t/2, t/3, 0, Math.PI*2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(0,255,80,0.3)';
        ctx.beginPath(); ctx.arc(x+t/3, y+t/3, t/4, 0, Math.PI*2); ctx.fill();
    },

    drawIce(ctx, x, y, t) {
        ctx.fillStyle = '#101825';
        ctx.fillRect(x, y, t, t);
        ctx.shadowColor = '#00ddff';
        ctx.shadowBlur = 3;
        ctx.fillStyle = 'rgba(0,200,255,0.15)';
        ctx.fillRect(x+1, y+1, t-2, t-2);
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(150,230,255,0.2)';
        ctx.fillRect(x+2, y+2, t/2, 2);
    },

    drawZones(ctx) {
        if (!this.zoneGrid) return;
        const step = CFG.TILE;
        const cols = this.zoneGrid[0] ? this.zoneGrid[0].length : 0;
        const rows = this.zoneGrid.length;

        // Fill each tile with its zone's owner color
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const zi = this.zoneGrid[r][c];
                const z = this.zones[zi];
                if (!z) continue;
                const x = c * step, y = r * step;

                if (z.owner >= 0) {
                    ctx.fillStyle = CFG.PLAYER_COLORS[z.owner];
                    ctx.globalAlpha = 0.07;
                    ctx.fillRect(x, y, step, step);
                }

                // Draw border between different zones
                if (c > 0 && this.zoneGrid[r][c - 1] !== zi) {
                    const nz = this.zones[this.zoneGrid[r][c - 1]];
                    ctx.globalAlpha = 0.2;
                    ctx.fillStyle = (z.owner >= 0) ? CFG.PLAYER_COLORS[z.owner] : '#333';
                    ctx.fillRect(x, y, 1, step);
                }
                if (r > 0 && this.zoneGrid[r - 1][c] !== zi) {
                    ctx.globalAlpha = 0.2;
                    ctx.fillStyle = (z.owner >= 0) ? CFG.PLAYER_COLORS[z.owner] : '#333';
                    ctx.fillRect(x, y, step, 1);
                }
            }
        }
        ctx.globalAlpha = 1;

        // Zone center markers + capture bars
        for (const z of this.zones) {
            if (z.owner >= 0) {
                // Owned flag
                ctx.shadowColor = CFG.PLAYER_COLORS[z.owner];
                ctx.shadowBlur = 8;
                ctx.fillStyle = CFG.PLAYER_COLORS[z.owner];
                ctx.beginPath(); ctx.arc(z.x, z.y, 5, 0, Math.PI * 2); ctx.fill();
                // Shield icon (defense bonus indicator)
                ctx.globalAlpha = 0.5;
                ctx.font = '10px Arial';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText('🛡', z.x, z.y - 10);
                ctx.globalAlpha = 1;
                ctx.shadowBlur = 0;
            } else {
                // Neutral
                ctx.fillStyle = '#444';
                ctx.save(); ctx.translate(z.x, z.y); ctx.rotate(Math.PI / 4);
                ctx.fillRect(-3, -3, 6, 6);
                ctx.restore();
            }

            // Capture progress
            for (const [pid, prog] of Object.entries(z.captureProgress)) {
                if (prog > 0) {
                    const ratio = prog / 2000;
                    ctx.fillStyle = 'rgba(0,0,0,0.6)';
                    ctx.fillRect(z.x - 16, z.y + 10, 32, 5);
                    ctx.shadowColor = CFG.PLAYER_COLORS[parseInt(pid)] || '#fff';
                    ctx.shadowBlur = 4;
                    ctx.fillStyle = CFG.PLAYER_COLORS[parseInt(pid)] || '#fff';
                    ctx.fillRect(z.x - 16, z.y + 10, Math.floor(32 * ratio), 5);
                    ctx.shadowBlur = 0;
                }
            }
        }
    },

    drawDerricks(ctx, players) {
        for (const d of this.oilDerricks) {
            const ownerColor = d.owner >= 0 ? CFG.PLAYER_COLORS[d.owner] : '#555';
            const lvl = d.level;

            // Selection glow
            if (d.selected) {
                ctx.shadowColor = '#ff0';
                ctx.shadowBlur = 12;
                ctx.strokeStyle = '#ff0';
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(d.x, d.y, 18, 0, Math.PI*2); ctx.stroke();
                ctx.shadowBlur = 0;
            }

            // Glow circle base
            ctx.shadowColor = ownerColor;
            ctx.shadowBlur = 8 + lvl * 4;
            ctx.fillStyle = ownerColor;
            ctx.globalAlpha = 0.15;
            ctx.beginPath(); ctx.arc(d.x, d.y, 14 + lvl*3, 0, Math.PI*2); ctx.fill();
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;

            // Derrick body
            ctx.fillStyle = '#222';
            ctx.fillRect(d.x-4, d.y-12-lvl*3, 8, 14+lvl*3);

            // Tower top
            ctx.fillStyle = ownerColor;
            ctx.fillRect(d.x-6, d.y-14-lvl*3, 12, 4);

            // Pump animation
            const pump = Math.sin(Date.now() * 0.004 * (1+lvl*0.3)) * 3;
            ctx.fillStyle = '#888';
            ctx.fillRect(d.x-2, d.y-10-lvl*3+pump, 4, 6);

            // Base platform
            ctx.fillStyle = '#1a1a2a';
            ctx.fillRect(d.x-8, d.y-2, 16, 8);

            // Neon ring
            ctx.shadowColor = ownerColor;
            ctx.shadowBlur = 6;
            ctx.strokeStyle = ownerColor;
            ctx.lineWidth = lvl;
            ctx.beginPath(); ctx.arc(d.x, d.y, 12, 0, Math.PI*2); ctx.stroke();
            ctx.shadowBlur = 0;

            // Level dots
            ctx.fillStyle = '#ff0';
            for (let i = 0; i < lvl; i++) ctx.fillRect(d.x - lvl*3 + i*6, d.y+8, 4, 3);

            // Capture bar
            if (d.captureProgress > 0 && d.capturingPlayer >= 0) {
                const bw = 24, prog = d.captureProgress / CFG.CAPTURE_TIME;
                ctx.fillStyle = '#000';
                ctx.fillRect(d.x-bw/2, d.y+14, bw, 4);
                ctx.fillStyle = CFG.PLAYER_COLORS[d.capturingPlayer];
                ctx.fillRect(d.x-bw/2, d.y+14, bw*prog, 4);
            }
        }
    },
};
