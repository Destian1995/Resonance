// ============ BILLIARD PHYSICS ============
const Physics = {
    friction: 0.985,
    minSpeed: 0.3,
    wallBounce: 0.75,
    ballBounce: 0.95,

    update(balls, table, dt) {
        const steps = 3; // substeps for accuracy
        const sdt = dt / steps;
        for (let s = 0; s < steps; s++) {
            // Move
            for (const b of balls) {
                if (!b.active) continue;
                b.x += b.vx * sdt;
                b.y += b.vy * sdt;
                // Friction
                b.vx *= this.friction;
                b.vy *= this.friction;
                if (Math.abs(b.vx) < this.minSpeed && Math.abs(b.vy) < this.minSpeed) {
                    b.vx = 0; b.vy = 0;
                }
                // Spin decay
                b.spin *= 0.98;
            }
            // Wall collisions
            for (const b of balls) {
                if (!b.active) continue;
                this._wallCollide(b, table);
            }
            // Ball-ball collisions
            for (let i = 0; i < balls.length; i++) {
                if (!balls[i].active) continue;
                for (let j = i + 1; j < balls.length; j++) {
                    if (!balls[j].active) continue;
                    this._ballCollide(balls[i], balls[j]);
                }
            }
            // Pocket check
            for (const b of balls) {
                if (!b.active) continue;
                for (const p of table.pockets) {
                    const dx = b.x - p.x, dy = b.y - p.y;
                    if (Math.sqrt(dx*dx + dy*dy) < p.r + b.r * 0.3) {
                        b.pocketed = true;
                        b.active = false;
                        b.vx = 0; b.vy = 0;
                        // Sink animation target
                        b.sinkX = p.x; b.sinkY = p.y;
                    }
                }
            }
        }
    },

    _wallCollide(b, table) {
        const L = table.x + table.cushion;
        const R = table.x + table.w - table.cushion;
        const T = table.y + table.cushion;
        const B = table.y + table.h - table.cushion;
        const pR = table.pocketR * 1.2; // pocket gap

        // Left
        if (b.x - b.r < L) {
            // Check if near a pocket — don't bounce
            if (!this._nearPocket(b, table)) {
                b.x = L + b.r;
                b.vx = -b.vx * this.wallBounce;
                Snd.play('wall');
            }
        }
        // Right
        if (b.x + b.r > R) {
            if (!this._nearPocket(b, table)) {
                b.x = R - b.r;
                b.vx = -b.vx * this.wallBounce;
                Snd.play('wall');
            }
        }
        // Top
        if (b.y - b.r < T) {
            if (!this._nearPocket(b, table)) {
                b.y = T + b.r;
                b.vy = -b.vy * this.wallBounce;
                Snd.play('wall');
            }
        }
        // Bottom
        if (b.y + b.r > B) {
            if (!this._nearPocket(b, table)) {
                b.y = B - b.r;
                b.vy = -b.vy * this.wallBounce;
                Snd.play('wall');
            }
        }
    },

    _nearPocket(b, table) {
        for (const p of table.pockets) {
            const dx = b.x - p.x, dy = b.y - p.y;
            if (Math.sqrt(dx*dx + dy*dy) < p.r * 1.8) return true;
        }
        return false;
    },

    _ballCollide(a, b) {
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const minDist = a.r + b.r;
        if (dist >= minDist || dist === 0) return;

        // Separate
        const nx = dx / dist, ny = dy / dist;
        const overlap = minDist - dist;
        a.x -= nx * overlap * 0.5;
        a.y -= ny * overlap * 0.5;
        b.x += nx * overlap * 0.5;
        b.y += ny * overlap * 0.5;

        // Relative velocity
        const dvx = a.vx - b.vx, dvy = a.vy - b.vy;
        const dvn = dvx * nx + dvy * ny;
        if (dvn <= 0) return; // moving apart

        const restitution = this.ballBounce;
        a.vx -= dvn * nx * restitution;
        a.vy -= dvn * ny * restitution;
        b.vx += dvn * nx * restitution;
        b.vy += dvn * ny * restitution;

        Snd.play('hit');
    },

    allStopped(balls) {
        for (const b of balls) {
            if (!b.active) continue;
            if (Math.abs(b.vx) > this.minSpeed || Math.abs(b.vy) > this.minSpeed) return false;
        }
        return true;
    }
};
