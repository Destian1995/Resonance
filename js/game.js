// ============ 8-BALL POOL ============
const Game = {
    canvas: null, ctx: null, lastTime: 0,
    state: 'menu', // menu, aiming, moving, turnEnd, foul, win
    balls: [], turn: 1, // 1 or 2
    p1: { name: 'Игрок 1', type: null, score: 0 }, // type: 'solid'/'stripe'/null
    p2: { name: 'Игрок 2', type: null, score: 0 },
    // Aiming
    aimX: 0, aimY: 0, power: 0, maxPower: 650,
    dragging: false, dragStartX: 0, dragStartY: 0,
    // Shot tracking
    firstHit: null, pocketedThisShot: [],
    cuePocketed: false, foulMsg: '',
    // Cue ball placement
    placing: false,
    // Visual
    shotTrail: [], msg: '', msgTimer: 0,

    init() {
        this.canvas = document.getElementById('game');
        this.ctx = this.canvas.getContext('2d');
        this._resize();
        window.addEventListener('resize', () => { this._resize(); Table.init(this.canvas.width, this.canvas.height); });
        Snd.init();
        this._initInput();
        this.lastTime = performance.now();
        requestAnimationFrame(t => this.loop(t));
    },

    _resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.ctx.imageSmoothingEnabled = true;
    },

    _initInput() {
        const c = this.canvas;
        // Mouse
        c.addEventListener('mousedown', e => this._onDown(this._mpos(e)));
        c.addEventListener('mousemove', e => this._onMove(this._mpos(e)));
        c.addEventListener('mouseup', e => this._onUp(this._mpos(e)));
        // Touch
        c.addEventListener('touchstart', e => { e.preventDefault(); this._onDown(this._tpos(e)); }, { passive: false });
        c.addEventListener('touchmove', e => { e.preventDefault(); this._onMove(this._tpos(e)); }, { passive: false });
        c.addEventListener('touchend', e => { e.preventDefault(); this._onUp(this._tpos(e)); }, { passive: false });
    },

    _mpos(e) { const r = this.canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * (this.canvas.width / r.width), y: (e.clientY - r.top) * (this.canvas.height / r.height) }; },
    _tpos(e) { const t = e.changedTouches[0]; return this._mpos(t); },

    _onDown(p) {
        Snd.resume();
        if (this.state === 'menu') { this.startGame(); return; }
        if (this.state === 'win') { this.state = 'menu'; return; }
        if (this.placing) { this._placeCue(p); return; }
        if (this.state !== 'aiming') return;
        const cue = this.balls[0];
        if (!cue.active) return;
        this.dragging = true;
        this.dragStartX = p.x;
        this.dragStartY = p.y;
        this.aimX = p.x; this.aimY = p.y;
    },

    _onMove(p) {
        this.aimX = p.x; this.aimY = p.y;
    },

    _onUp(p) {
        if (!this.dragging) return;
        this.dragging = false;
        const cue = this.balls[0];
        if (!cue.active) return;
        const dx = this.dragStartX - p.x;
        const dy = this.dragStartY - p.y;
        const power = Math.min(Math.sqrt(dx * dx + dy * dy) * 3, this.maxPower);
        if (power < 15) return; // too weak
        const angle = Math.atan2(dy, dx);
        cue.vx = Math.cos(angle) * power;
        cue.vy = Math.sin(angle) * power;
        this.state = 'moving';
        this.firstHit = null;
        this.pocketedThisShot = [];
        this.cuePocketed = false;
        this.shotTrail = [{ x: cue.x, y: cue.y }];
        Snd.play('cue');
    },

    _placeCue(p) {
        const cue = this.balls[0];
        // Must be on table, behind head string
        const tx = Math.max(Table.x + Table.cushion + cue.r, Math.min(p.x, Table.x + Table.w * 0.25));
        const ty = Math.max(Table.y + Table.cushion + cue.r, Math.min(p.y, Table.y + Table.h - Table.cushion - cue.r));
        // Check not overlapping other balls
        let ok = true;
        for (let i = 1; i < this.balls.length; i++) {
            if (!this.balls[i].active) continue;
            const dx = tx - this.balls[i].x, dy = ty - this.balls[i].y;
            if (Math.sqrt(dx*dx + dy*dy) < cue.r + this.balls[i].r + 2) { ok = false; break; }
        }
        if (ok) {
            cue.x = tx; cue.y = ty;
            cue.active = true; cue.pocketed = false;
            this.placing = false;
            this.state = 'aiming';
        }
    },

    startGame() {
        Table.init(this.canvas.width, this.canvas.height);
        this.balls = createBalls(Table);
        this.turn = 1;
        this.p1 = { name: 'Игрок 1', type: null, score: 0 };
        this.p2 = { name: 'Игрок 2', type: null, score: 0 };
        this.placing = false;
        this.msg = ''; this.msgTimer = 0;
        this.state = 'aiming';
        this.showMsg('Игрок 1 — ваш удар!');
    },

    showMsg(text) { this.msg = text; this.msgTimer = 2.5; },

    currentPlayer() { return this.turn === 1 ? this.p1 : this.p2; },
    otherPlayer() { return this.turn === 1 ? this.p2 : this.p1; },

    loop(time) {
        const dt = Math.min((time - this.lastTime) / 1000, 0.05);
        this.lastTime = time;
        const ctx = this.ctx, cw = this.canvas.width, ch = this.canvas.height;

        // Update
        if (this.state === 'moving') {
            Physics.update(this.balls, Table, dt);
            // Track trail
            const cue = this.balls[0];
            if (cue.active && this.shotTrail.length < 300) {
                const last = this.shotTrail[this.shotTrail.length - 1];
                if (Math.abs(cue.x - last.x) > 3 || Math.abs(cue.y - last.y) > 3) {
                    this.shotTrail.push({ x: cue.x, y: cue.y });
                }
            }
            // Track first ball hit by cue
            if (!this.firstHit) {
                for (let i = 1; i < this.balls.length; i++) {
                    const b = this.balls[i];
                    if (b.pocketed && !this.pocketedThisShot.includes(b.id)) {
                        // Not a first-hit tracker, but track pocketed
                    }
                }
            }
            // Check pocketed this frame
            for (const b of this.balls) {
                if (b.pocketed && !this.pocketedThisShot.includes(b.id) && b.id !== 0) {
                    this.pocketedThisShot.push(b.id);
                    Snd.play('pocket');
                }
                if (b.id === 0 && b.pocketed && !this.cuePocketed) {
                    this.cuePocketed = true;
                    Snd.play('foul');
                }
            }

            // All stopped?
            if (Physics.allStopped(this.balls)) {
                this._evaluateShot();
            }
        }

        if (this.msgTimer > 0) this.msgTimer -= dt;

        // Draw
        ctx.fillStyle = '#1a1a2a';
        ctx.fillRect(0, 0, cw, ch);

        if (this.state === 'menu') {
            this._drawMenu(ctx, cw, ch);
        } else {
            Table.draw(ctx);
            // Shot trail
            if (this.shotTrail.length > 1) {
                ctx.strokeStyle = 'rgba(255,255,255,0.06)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(this.shotTrail[0].x, this.shotTrail[0].y);
                for (let i = 1; i < this.shotTrail.length; i++) {
                    ctx.lineTo(this.shotTrail[i].x, this.shotTrail[i].y);
                }
                ctx.stroke();
            }
            // Balls
            for (let i = this.balls.length - 1; i >= 0; i--) drawBall(ctx, this.balls[i]);
            // Aiming line
            if (this.state === 'aiming' && !this.placing) this._drawAim(ctx);
            // Placing indicator
            if (this.placing) this._drawPlacing(ctx, cw, ch);
            // HUD
            this._drawHUD(ctx, cw, ch);
        }

        requestAnimationFrame(t => this.loop(t));
    },

    _evaluateShot() {
        const cp = this.currentPlayer();
        const op = this.otherPlayer();
        let foul = false;
        let switchTurn = true;

        // Assign types on first legal pot
        if (!cp.type && this.pocketedThisShot.length > 0) {
            const potted = this.pocketedThisShot.filter(id => id !== 8);
            if (potted.length > 0) {
                const first = potted[0];
                if (first >= 1 && first <= 7) { cp.type = 'solid'; op.type = 'stripe'; }
                else if (first >= 9 && first <= 15) { cp.type = 'stripe'; op.type = 'solid'; }
            }
        }

        // Foul: cue ball pocketed
        if (this.cuePocketed) {
            foul = true;
            this.foulMsg = 'Фол! Белый шар в лузе';
        }

        // Count pocketed by type
        let pottedOwn = 0;
        for (const id of this.pocketedThisShot) {
            if (id === 8) continue;
            const isSolid = id >= 1 && id <= 7;
            const isStripe = id >= 9 && id <= 15;
            if ((cp.type === 'solid' && isSolid) || (cp.type === 'stripe' && isStripe)) {
                pottedOwn++; cp.score++;
            } else if (cp.type) {
                // Potted opponent's ball — not a foul in 8-ball but no continuation
            }
        }

        // 8-ball potted?
        const eightPotted = this.pocketedThisShot.includes(8);
        if (eightPotted) {
            // Check if player has cleared their group
            const ownBalls = cp.type === 'solid' ? [1,2,3,4,5,6,7] : [9,10,11,12,13,14,15];
            const remaining = ownBalls.filter(id => this.balls.find(b => b.id === id && b.active));
            if (remaining.length === 0 && !foul) {
                // Win!
                this.state = 'win';
                this.showMsg(`${cp.name} победил!`);
                Snd.play('win');
                return;
            } else {
                // Potted 8-ball too early or with foul = lose
                this.state = 'win';
                this.showMsg(`${op.name} победил! (${cp.name} забил 8 рано)`);
                Snd.play('foul');
                return;
            }
        }

        // Foul: place cue ball
        if (foul) {
            this.showMsg(this.foulMsg);
            this.turn = this.turn === 1 ? 2 : 1;
            // Reset cue ball for placement
            const cue = this.balls[0];
            cue.active = false; cue.pocketed = false;
            this.placing = true;
            this.state = 'aiming';
            return;
        }

        // Continue if potted own ball
        if (pottedOwn > 0) {
            switchTurn = false;
            this.showMsg(`${cp.name} продолжает!`);
        }

        if (switchTurn) {
            this.turn = this.turn === 1 ? 2 : 1;
            this.showMsg(`${this.currentPlayer().name} — ваш удар`);
        }

        this.shotTrail = [];
        this.state = 'aiming';
    },

    _drawAim(ctx) {
        const cue = this.balls[0];
        if (!cue.active) return;

        if (this.dragging) {
            // Power line from cue to drag start (shows direction)
            const dx = this.dragStartX - this.aimX;
            const dy = this.dragStartY - this.aimY;
            const power = Math.min(Math.sqrt(dx * dx + dy * dy) * 3, this.maxPower);
            const angle = Math.atan2(dy, dx);

            // Aim line (dotted)
            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 6]);
            ctx.beginPath();
            ctx.moveTo(cue.x, cue.y);
            ctx.lineTo(cue.x + Math.cos(angle) * 200, cue.y + Math.sin(angle) * 200);
            ctx.stroke();
            ctx.setLineDash([]);

            // Power bar
            const pRatio = power / this.maxPower;
            const barW = 120, barH = 10;
            const bx = cue.x - barW / 2, by = cue.y - 30;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
            ctx.fillStyle = pRatio < 0.3 ? '#4f4' : pRatio < 0.7 ? '#ff0' : '#f44';
            ctx.fillRect(bx, by, barW * pRatio, barH);

            // Cue stick visual
            const stickLen = 100 + power * 0.15;
            const sx = cue.x - Math.cos(angle) * (cue.r + 6 + power * 0.08);
            const sy = cue.y - Math.sin(angle) * (cue.r + 6 + power * 0.08);
            const ex = sx - Math.cos(angle) * stickLen;
            const ey = sy - Math.sin(angle) * stickLen;

            // Cue stick
            ctx.strokeStyle = '#c8a050';
            ctx.lineWidth = 5;
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
            ctx.strokeStyle = '#e8c878';
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + (ex - sx) * 0.15, sy + (ey - sy) * 0.15); ctx.stroke();
            // Tip
            ctx.fillStyle = '#4a8';
            ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2); ctx.fill();
        }
    },

    _drawPlacing(ctx, cw, ch) {
        // Show placement zone
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(Table.x + Table.w * 0.25, Table.y + Table.cushion);
        ctx.lineTo(Table.x + Table.w * 0.25, Table.y + Table.h - Table.cushion);
        ctx.stroke();
        ctx.setLineDash([]);

        // Ghost cue ball at mouse
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#f0f0ee';
        ctx.beginPath();
        ctx.arc(
            Math.max(Table.x + Table.cushion + BALL_R, Math.min(this.aimX, Table.x + Table.w * 0.25)),
            Math.max(Table.y + Table.cushion + BALL_R, Math.min(this.aimY, Table.y + Table.h - Table.cushion - BALL_R)),
            BALL_R, 0, Math.PI * 2
        );
        ctx.fill();
        ctx.globalAlpha = 1;

        this._txt('Поставьте белый шар', cw / 2, Table.y - 30, '#ff0', 14, 'center');
    },

    _drawHUD(ctx, cw, ch) {
        const p = 10;
        // Pocketed balls display
        const ty = Table.y - 44;

        // Player 1 info (left)
        const p1col = this.turn === 1 ? '#fff' : '#888';
        this._txt(this.p1.name, p, ty, p1col, 13, 'left');
        if (this.p1.type) {
            this._txt(this.p1.type === 'solid' ? 'Цельные (1-7)' : 'Полосатые (9-15)', p, ty + 18, '#aaa', 10, 'left');
        }
        // Pocketed balls for P1
        let px1 = p;
        for (const b of this.balls) {
            if (!b.pocketed || b.id === 0 || b.id === 8) continue;
            const isMine = (this.p1.type === 'solid' && b.id <= 7) || (this.p1.type === 'stripe' && b.id >= 9);
            if (isMine || !this.p1.type) {
                ctx.fillStyle = b.color;
                ctx.beginPath(); ctx.arc(px1 + 7, ty + 36, 6, 0, Math.PI * 2); ctx.fill();
                px1 += 16;
            }
        }

        // Player 2 info (right)
        const p2col = this.turn === 2 ? '#fff' : '#888';
        this._txt(this.p2.name, cw - p, ty, p2col, 13, 'right');
        if (this.p2.type) {
            this._txt(this.p2.type === 'solid' ? 'Цельные (1-7)' : 'Полосатые (9-15)', cw - p, ty + 18, '#aaa', 10, 'right');
        }

        // Turn arrow
        const arrowX = this.turn === 1 ? p + 70 : cw - p - 70;
        if (this.state === 'aiming') {
            ctx.fillStyle = '#ff0';
            ctx.beginPath(); ctx.arc(arrowX, ty + 6, 5, 0, Math.PI * 2); ctx.fill();
        }

        // Message
        if (this.msgTimer > 0 && this.msg) {
            const alpha = Math.min(1, this.msgTimer / 0.3);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            const mw = 300, mh = 36;
            ctx.fillRect(cw / 2 - mw / 2, ch * 0.15, mw, mh);
            this._txt(this.msg, cw / 2, ch * 0.15 + 18, '#fff', 14, 'center');
            ctx.globalAlpha = 1;
        }
    },

    _drawMenu(ctx, cw, ch) {
        // Table preview
        Table.init(cw, ch);
        Table.draw(ctx);

        // Overlay
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(0, 0, cw, ch);

        this._txt('RESONANCE', cw / 2, ch * 0.15, '#0ff', 38, 'center');
        this._txt('BILLIARDS', cw / 2, ch * 0.15 + 36, '#088', 20, 'center');

        // 8-ball illustration
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.arc(cw / 2, ch * 0.45, 35, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(cw / 2, ch * 0.45, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = 'bold 16px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('8', cw / 2, ch * 0.45);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath(); ctx.arc(cw / 2 - 10, ch * 0.45 - 12, 10, 0, Math.PI * 2); ctx.fill();

        this._txt('Нажмите чтобы начать', cw / 2, ch * 0.65, '#aaa', 14, 'center');
        this._txt('Тяни от белого шара — сила и направление', cw / 2, ch * 0.73, '#666', 11, 'center');
        this._txt('8-Ball: забей свои шары, затем чёрный 8', cw / 2, ch * 0.8, '#666', 11, 'center');
    },

    _txt(s, x, y, c, sz, al) {
        this.ctx.fillStyle = c;
        this.ctx.font = `bold ${sz}px monospace`;
        this.ctx.textAlign = al; this.ctx.textBaseline = 'middle';
        this.ctx.fillText(s, x, y);
    }
};

window.addEventListener('load', () => {
    document.getElementById('loading').style.display = 'none';
    Game.init();
});
