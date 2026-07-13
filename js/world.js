// ============ HEX GRID WORLD ============
const World = {
    cells: {},      // key -> {q,r,type,building}
    centerX: 0,
    centerY: 0,

    generate() {
        this.cells = {};
        const R = CFG.GRID_RINGS;
        for (let q = -R; q <= R; q++) {
            for (let r = -R; r <= R; r++) {
                if (Math.abs(q + r) > R) continue;
                const key = U.hexKey(q, r);
                this.cells[key] = { q, r, type: 'ground', building: null };
            }
        }
        // Center is core
        this.cells[U.hexKey(0, 0)].type = 'core';
        // Calculate pixel center
        const cp = U.hexToPixel(0, 0);
        this.centerX = cp.x;
        this.centerY = cp.y;
    },

    getCell(q, r) { return this.cells[U.hexKey(q, r)]; },

    canBuild(q, r) {
        const c = this.getCell(q, r);
        if (!c || c.type === 'core' || c.building) return false;
        return true;
    },

    draw(ctx, phase) {
        const isNight = phase === 'wave';
        for (const key in this.cells) {
            const c = this.cells[key];
            const p = U.hexToPixel(c.q, c.r);
            // Skip if off screen
            if (p.x < Cam.x - 40 || p.x > Cam.x + Cam.w + 40 ||
                p.y < Cam.y - 40 || p.y > Cam.y + Cam.h + 40) continue;

            const hr = CFG.HEX_R - 1;
            if (c.type === 'core') {
                U.drawHex(ctx, p.x, p.y, hr, '#1a3a5a', '#4af');
                // Core crystal
                ctx.fillStyle = '#4af';
                ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#8cf';
                ctx.beginPath(); ctx.arc(p.x - 2, p.y - 2, 4, 0, Math.PI * 2); ctx.fill();
            } else {
                const dist = U.hexDist(c.q, c.r, 0, 0);
                const shade = isNight ? 8 : 14;
                const g = shade + (dist % 2) * 4;
                U.drawHex(ctx, p.x, p.y, hr, `rgb(${g},${g+6},${g-2})`, '#222');
            }
        }
    }
};
