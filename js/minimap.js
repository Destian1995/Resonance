// ============================================
// Minimap — pixel style for small map
// ============================================

const Minimap = {
    x: 0,
    y: 0,
    padding: 6,

    get w() { return UI.isMobile ? 90 : 140; },
    get h() { return UI.isMobile ? 90 : 140; },

    getPosition(canvasW, canvasH) {
        this.x = canvasW - this.w - this.padding;
        this.y = canvasH - UI.panelHeight - this.h - this.padding;
        return { x: this.x, y: this.y };
    },

    containsPoint(sx, sy) {
        return sx >= this.x && sx <= this.x + this.w &&
               sy >= this.y && sy <= this.y + this.h;
    },

    screenToMap(sx, sy) {
        return {
            x: (sx - this.x) / this.w * CFG.MAP_W,
            y: (sy - this.y) / this.h * CFG.MAP_H,
        };
    },

    handleClick(sx, sy) {
        if (!this.containsPoint(sx, sy)) return false;
        const pos = this.screenToMap(sx, sy);
        Camera.centerOn(pos.x, pos.y);
        return true;
    },

    draw(ctx, canvasW, canvasH, players) {
        this.getPosition(canvasW, canvasH);

        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(this.x - 2, this.y - 2, this.w + 4, this.h + 4);

        ctx.fillStyle = '#111';
        ctx.fillRect(this.x, this.y, this.w, this.h);

        // Border
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x, this.y, this.w, this.h);

        const scaleX = this.w / CFG.MAP_W;
        const scaleY = this.h / CFG.MAP_H;

        // Tiles — simplified
        const tileScale = CFG.TILE * scaleX;
        for (let r = 0; r < CFG.MAP_ROWS; r++) {
            for (let c = 0; c < CFG.MAP_COLS; c++) {
                const tile = GameMap.tiles[r] && GameMap.tiles[r][c];
                if (!tile) continue;
                let color;
                switch (tile) {
                    case CFG.TILE_BRICK: color = '#8a3020'; break;
                    case CFG.TILE_STEEL: color = '#888'; break;
                    case CFG.TILE_WATER: color = '#2040a0'; break;
                    case CFG.TILE_TREES: color = '#1a801a'; break;
                    case CFG.TILE_ICE: color = '#90c0e0'; break;
                    default: continue;
                }
                ctx.fillStyle = color;
                ctx.fillRect(
                    Math.floor(this.x + c * tileScale),
                    Math.floor(this.y + r * tileScale),
                    Math.max(1, Math.ceil(tileScale)),
                    Math.max(1, Math.ceil(tileScale))
                );
            }
        }

        // Oil derricks
        for (const d of GameMap.oilDerricks) {
            ctx.fillStyle = d.owner >= 0 ? CFG.PLAYER_COLORS[d.owner] : '#666';
            ctx.fillRect(
                Math.floor(this.x + d.x * scaleX - 1),
                Math.floor(this.y + d.y * scaleY - 1),
                3, 3
            );
        }

        // Buildings
        for (const p of players) {
            if (!p.alive) continue;
            ctx.fillStyle = p.color;
            for (const b of p.buildings) {
                if (b.dead) continue;
                const bx = Math.floor(this.x + b.getCenterX() * scaleX);
                const by = Math.floor(this.y + b.getCenterY() * scaleY);
                ctx.fillRect(bx - 2, by - 2, 4, 4);
            }
        }

        // Units
        for (const p of players) {
            if (!p.alive) continue;
            ctx.fillStyle = p.color;
            for (const u of p.units) {
                if (u.dead) continue;
                ctx.fillRect(
                    Math.floor(this.x + u.x * scaleX),
                    Math.floor(this.y + u.y * scaleY),
                    2, 2
                );
            }
        }

        // Camera viewport
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        const vx = this.x + Camera.x * scaleX;
        const vy = this.y + Camera.y * scaleY;
        const vw = (Camera.screenW / Camera.zoom) * scaleX;
        const vh = (Camera.screenH / Camera.zoom) * scaleY;
        ctx.strokeRect(Math.floor(vx), Math.floor(vy), Math.floor(vw), Math.floor(vh));
    },
};
