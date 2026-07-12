// ============ XP GEMS ============
const Gems = {
    list: [],

    spawn(x, y, xp, big) {
        this.list.push({ x, y, xp, r: big ? 8 : CFG.GEM_RADIUS,
            color: big ? '#ff0' : xp > 5 ? '#4f4' : '#4af',
            attracted: false });
    },

    update(dt, player) {
        const magnet = player.magnetRange;
        for (let i = this.list.length - 1; i >= 0; i--) {
            const g = this.list[i];
            const d = U.dist(g, player);
            // Attract
            if (d < magnet) g.attracted = true;
            if (g.attracted) {
                const a = U.angle(g, player);
                const spd = CFG.GEM_MAGNET_SPEED * dt;
                g.x += Math.cos(a) * spd;
                g.y += Math.sin(a) * spd;
            }
            // Collect
            if (d < player.r + g.r + 5) {
                player.xp += g.xp;
                player.totalXp += g.xp;
                Snd.play('gem');
                this.list.splice(i, 1);
            }
        }
    },

    draw(ctx) {
        for (const g of this.list) {
            // Glow
            ctx.globalAlpha = 0.15;
            ctx.fillStyle = g.color;
            ctx.beginPath(); ctx.arc(g.x,g.y,g.r+4,0,Math.PI*2); ctx.fill();
            // Diamond shape
            ctx.globalAlpha = 0.95;
            ctx.fillStyle = g.color;
            ctx.beginPath();
            ctx.moveTo(g.x, g.y - g.r);
            ctx.lineTo(g.x + g.r * 0.7, g.y);
            ctx.lineTo(g.x, g.y + g.r);
            ctx.lineTo(g.x - g.r * 0.7, g.y);
            ctx.closePath();
            ctx.fill();
            // Shine
            ctx.fillStyle = '#fff';
            ctx.globalAlpha = 0.5;
            ctx.fillRect(g.x-1, g.y-g.r+1, 2, 2);
            ctx.globalAlpha = 1;
        }
    },

    clear() { this.list = []; }
};
