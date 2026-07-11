// ============================================
// Particle System — shockwaves, fire, smoke, trails
// ============================================

const Particles = {
    particles: [],
    projectiles: [],
    shockwaves: [],

    clear() {
        this.particles = [];
        this.projectiles = [];
        this.shockwaves = [];
    },

    // --- Взрыв ---
    explosion(x, y, color, count = 12) {
        // Огненные частицы
        for (let i = 0; i < count; i++) {
            const a = Utils.rand(0, Math.PI * 2);
            const sp = Utils.rand(30, 100);
            this.particles.push({
                x, y,
                vx: Math.cos(a) * sp,
                vy: Math.sin(a) * sp,
                life: Utils.rand(0.3, 0.7),
                maxLife: 0.7,
                size: Utils.rand(2, 5),
                color,
                type: 'fire',
            });
        }
        // Искры
        for (let i = 0; i < count / 2; i++) {
            const a = Utils.rand(0, Math.PI * 2);
            const sp = Utils.rand(50, 150);
            this.particles.push({
                x, y,
                vx: Math.cos(a) * sp,
                vy: Math.sin(a) * sp,
                life: Utils.rand(0.2, 0.5),
                maxLife: 0.5,
                size: 1,
                color: '#ff0',
                type: 'spark',
            });
        }
        // Дым
        this.smoke(x, y, Math.floor(count / 2));
    },

    // --- Ударная волна ---
    shockwave(x, y, maxRadius, color = '#fff', duration = 0.4) {
        this.shockwaves.push({
            x, y,
            radius: 3,
            maxRadius,
            life: duration,
            maxLife: duration,
            color,
            lineWidth: 3,
        });
    },

    // --- Большой взрыв башни ---
    towerImpact(x, y, aoeRadius, color) {
        // Ударная волна
        this.shockwave(x, y, aoeRadius, color, 0.35);

        // Центральная вспышка
        this.particles.push({
            x, y,
            vx: 0, vy: 0,
            life: 0.2, maxLife: 0.2,
            size: aoeRadius * 0.6,
            color: '#fff',
            type: 'flash',
        });

        // Огненный взрыв
        this.explosion(x, y, color, 18);

        // Кольцо огня
        for (let i = 0; i < 12; i++) {
            const a = (Math.PI * 2 / 12) * i;
            const dist = aoeRadius * 0.5;
            this.particles.push({
                x: x + Math.cos(a) * dist * 0.3,
                y: y + Math.sin(a) * dist * 0.3,
                vx: Math.cos(a) * 80,
                vy: Math.sin(a) * 80,
                life: 0.3, maxLife: 0.3,
                size: Utils.rand(3, 6),
                color: '#f80',
                type: 'fire',
            });
        }

        // Экранная тряска
        Camera.shake(5);
    },

    // --- Дым ---
    smoke(x, y, count = 4) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: x + Utils.rand(-4, 4),
                y: y + Utils.rand(-4, 4),
                vx: Utils.rand(-15, 15),
                vy: Utils.rand(-40, -15),
                life: Utils.rand(0.5, 1.2),
                maxLife: 1.2,
                size: Utils.rand(3, 8),
                color: '#555',
                type: 'smoke',
            });
        }
    },

    // --- Попадание ---
    hit(x, y, color) {
        for (let i = 0; i < 6; i++) {
            const a = Utils.rand(0, Math.PI * 2);
            const sp = Utils.rand(20, 50);
            this.particles.push({
                x, y,
                vx: Math.cos(a) * sp,
                vy: Math.sin(a) * sp,
                life: Utils.rand(0.1, 0.3),
                maxLife: 0.3,
                size: Utils.rand(1, 3),
                color,
                type: 'spark',
            });
        }
    },

    // --- Вспышка выстрела ---
    muzzleFlash(x, y, angle, color) {
        // Огненная вспышка
        for (let i = 0; i < 5; i++) {
            const a = angle + Utils.rand(-0.4, 0.4);
            const sp = Utils.rand(30, 70);
            this.particles.push({
                x, y,
                vx: Math.cos(a) * sp,
                vy: Math.sin(a) * sp,
                life: Utils.rand(0.08, 0.2),
                maxLife: 0.2,
                size: Utils.rand(2, 4),
                color: '#ff0',
                type: 'fire',
            });
        }
        // Белая центральная вспышка
        this.particles.push({
            x, y,
            vx: Math.cos(angle) * 10,
            vy: Math.sin(angle) * 10,
            life: 0.1, maxLife: 0.1,
            size: 5,
            color: '#fff',
            type: 'flash',
        });
    },

    // --- Снаряд ---
    addProjectile(x, y, tx, ty, color, speed = 200, onHit = null, big = false) {
        const a = Utils.angle(x, y, tx, ty);
        const d = Utils.dist(x, y, tx, ty);
        this.projectiles.push({
            x, y,
            vx: Math.cos(a) * speed,
            vy: Math.sin(a) * speed,
            life: d / speed + 0.15,
            color,
            size: big ? 4 : 2,
            big,
            trail: [],
            onHit,
            tx, ty,
        });
    },

    update(dt) {
        // Частицы
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;

            if (p.type === 'smoke') {
                p.size += dt * 8;
                p.vx *= 0.93;
            }
            if (p.type === 'fire') {
                p.size *= (1 - dt * 3);
            }

            if (p.life <= 0) this.particles.splice(i, 1);
        }

        // Ударные волны
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const sw = this.shockwaves[i];
            const progress = 1 - (sw.life / sw.maxLife);
            sw.radius = sw.maxRadius * progress;
            sw.life -= dt;
            if (sw.life <= 0) this.shockwaves.splice(i, 1);
        }

        // Снаряды
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.trail.push({ x: p.x, y: p.y });
            if (p.trail.length > (p.big ? 8 : 4)) p.trail.shift();
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;

            // Дымовой след для больших снарядов
            if (p.big && Math.random() > 0.5) {
                this.particles.push({
                    x: p.x + Utils.rand(-2, 2),
                    y: p.y + Utils.rand(-2, 2),
                    vx: Utils.rand(-5, 5), vy: Utils.rand(-10, -3),
                    life: 0.3, maxLife: 0.3,
                    size: Utils.rand(1, 3),
                    color: '#888', type: 'smoke',
                });
            }

            const d = Utils.dist(p.x, p.y, p.tx, p.ty);
            if (d < 8 || p.life <= 0) {
                if (p.onHit) p.onHit(p.tx, p.ty);
                if (!p.big) this.hit(p.tx, p.ty, p.color);
                this.projectiles.splice(i, 1);
            }
        }
    },

    draw(ctx) {
        // Ударные волны — неоновое свечение
        for (const sw of this.shockwaves) {
            const alpha = Utils.clamp(sw.life / sw.maxLife, 0, 1);

            ctx.shadowColor = sw.color;
            ctx.shadowBlur = 15 * alpha;
            ctx.globalAlpha = alpha * 0.8;
            ctx.strokeStyle = sw.color;
            ctx.lineWidth = (sw.lineWidth + 2) * alpha + 1;
            ctx.beginPath();
            ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
            ctx.stroke();

            // Внутреннее заполнение
            ctx.globalAlpha = alpha * 0.12;
            ctx.fillStyle = sw.color;
            ctx.beginPath();
            ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = 1;

        // Частицы
        for (const p of this.particles) {
            const alpha = Utils.clamp(p.life / p.maxLife, 0, 1);
            const px = Math.floor(p.x);
            const py = Math.floor(p.y);

            if (p.type === 'flash') {
                ctx.shadowColor = p.color;
                ctx.shadowBlur = p.size * 2;
                ctx.globalAlpha = alpha * 0.9;
                ctx.fillStyle = p.color;
                ctx.beginPath(); ctx.arc(px, py, p.size, 0, Math.PI*2); ctx.fill();
                ctx.shadowBlur = 0;
            } else if (p.type === 'smoke') {
                ctx.globalAlpha = alpha * 0.3;
                ctx.fillStyle = p.color;
                ctx.beginPath(); ctx.arc(px, py, p.size, 0, Math.PI*2); ctx.fill();
            } else if (p.type === 'fire') {
                const t = 1 - alpha;
                const r = 255, g = Math.floor(255*(1-t*0.7)), b = Math.floor(50*(1-t));
                ctx.shadowColor = `rgb(${r},${g},0)`;
                ctx.shadowBlur = 6;
                ctx.globalAlpha = alpha;
                ctx.fillStyle = `rgb(${r},${g},${b})`;
                ctx.beginPath(); ctx.arc(px, py, p.size, 0, Math.PI*2); ctx.fill();
                ctx.shadowBlur = 0;
            } else {
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 4;
                ctx.globalAlpha = alpha;
                ctx.fillStyle = p.color;
                ctx.beginPath(); ctx.arc(px, py, Math.max(1, p.size), 0, Math.PI*2); ctx.fill();
                ctx.shadowBlur = 0;
            }
        }
        ctx.globalAlpha = 1;

        // Снаряды — с неоновым свечением
        for (const p of this.projectiles) {
            // Светящийся след
            if (p.trail.length > 1) {
                ctx.shadowColor = p.color;
                ctx.shadowBlur = p.big ? 8 : 4;
                ctx.globalAlpha = p.big ? 0.6 : 0.4;
                ctx.strokeStyle = p.color;
                ctx.lineWidth = p.big ? 3 : 1.5;
                ctx.beginPath();
                ctx.moveTo(p.trail[0].x, p.trail[0].y);
                for (let i = 1; i < p.trail.length; i++) ctx.lineTo(p.trail[i].x, p.trail[i].y);
                ctx.lineTo(p.x, p.y);
                ctx.stroke();
                ctx.shadowBlur = 0;
            }

            // Головка снаряда — неоновая точка
            ctx.globalAlpha = 1;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = p.big ? 15 : 8;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.big ? p.size + 1 : 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.big ? p.size : 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = 1;
    },
};
