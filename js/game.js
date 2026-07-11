// ============================================
// Game — Main Loop & State Machine
// ============================================

const Game = {
    canvas: null,
    ctx: null,
    state: 'menu', // menu, playing, gameover
    players: [],
    winner: null,
    gameTime: 0,

    init() {
        this.canvas = document.getElementById('game');
        this.ctx = this.canvas.getContext('2d');

        // Disable image smoothing for pixel art
        this.ctx.imageSmoothingEnabled = false;

        this.resize();
        window.addEventListener('resize', () => this.resize());

        Input.init(this.canvas);
        Camera.init(this.canvas.width, this.canvas.height);
        Sound.init();

        let last = performance.now();
        const loop = (now) => {
            const dt = Math.min((now - last) / 1000, 0.05);
            last = now;
            this.update(dt);
            this.draw();
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    },

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        Camera.resize(this.canvas.width, this.canvas.height);
        // Keep pixel art sharp
        this.ctx.imageSmoothingEnabled = false;
    },

    startGame(playerCount) {
        this.state = 'playing';
        this.players = [];
        this.winner = null;
        this.gameTime = 0;
        this.alerts = [];
        this.gameSpeed = 1;
        this.paused = false;
        Particles.clear();
        Sound.resume();
        Sound.startAmbient();

        for (let i = 0; i < playerCount; i++) {
            const pos = CFG.START_POSITIONS[i];
            const isHuman = (i === 0);
            const name = isHuman ? 'Игрок' : CFG.PLAYER_NAMES[i];
            const player = new Player(i, name, isHuman, pos.x, pos.y);
            this.players.push(player);
        }

        // Generate new random map each game
        GameMap.init(playerCount);
        AI.init(this.players);

        // Clear tiles under all player buildings
        for (const p of this.players) {
            for (const b of p.buildings) {
                const t = CFG.TILE;
                for (let r = Math.floor(b.y / t); r < Math.ceil((b.y + b.size) / t); r++) {
                    for (let c = Math.floor(b.x / t); c < Math.ceil((b.x + b.size) / t); c++) {
                        GameMap.setTile(r, c, CFG.TILE_EMPTY);
                    }
                }
            }
        }

        const humanBase = this.players[0].base;
        Camera.centerOn(humanBase.getCenterX(), humanBase.getCenterY());
        Camera.x = Camera.targetX;
        Camera.y = Camera.targetY;
    },

    getHumanPlayer() {
        return this.players.find(p => p.isHuman);
    },

    getAllUnits() {
        const all = [];
        for (const p of this.players) {
            if (!p.alive) continue;
            for (const u of p.units) {
                if (!u.dead) all.push(u);
            }
        }
        return all;
    },

    getAllBuildings() {
        const all = [];
        for (const p of this.players) {
            for (const b of p.buildings) {
                if (!b.dead) all.push(b);
            }
        }
        return all;
    },

    // Alerts system
    alerts: [],
    alertTimer: 0,
    addAlert(text) {
        this.alerts.push({ text, time: 4 });
        Sound.play('alert');
    },

    // Unit groups (Ctrl+1..9 / 1..9)
    unitGroups: {},

    // Pause / speed
    paused: false,
    gameSpeed: 1,

    update(dt) {
        UI.update(dt);
        if (this.state !== 'playing') return;

        // Alerts decay
        for (let i = this.alerts.length - 1; i >= 0; i--) {
            this.alerts[i].time -= dt;
            if (this.alerts[i].time <= 0) this.alerts.splice(i, 1);
        }

        if (this.paused) {
            Camera.update(dt);
            // Allow camera movement while paused
            if (Input.keys['w'] || Input.keys['arrowup']) Camera.moveBy(0, -CFG.CAM_SPEED);
            if (Input.keys['s'] || Input.keys['arrowdown']) Camera.moveBy(0, CFG.CAM_SPEED);
            if (Input.keys['a'] || Input.keys['arrowleft']) Camera.moveBy(-CFG.CAM_SPEED, 0);
            if (Input.keys['d'] || Input.keys['arrowright']) Camera.moveBy(CFG.CAM_SPEED, 0);
            return;
        }

        const sDt = dt * this.gameSpeed;
        this.gameTime += sDt;

        if (Input.keys['w'] || Input.keys['arrowup']) Camera.moveBy(0, -CFG.CAM_SPEED);
        if (Input.keys['s'] || Input.keys['arrowdown']) Camera.moveBy(0, CFG.CAM_SPEED);
        if (Input.keys['a'] || Input.keys['arrowleft']) Camera.moveBy(-CFG.CAM_SPEED, 0);
        if (Input.keys['d'] || Input.keys['arrowright']) Camera.moveBy(CFG.CAM_SPEED, 0);

        Camera.update(sDt);

        // Track base HP for alerts
        const human = this.getHumanPlayer();
        const prevBaseHp = human && human.base ? human.base.hp : 0;

        for (const p of this.players) p.update(sDt);

        // Alert: base under attack
        if (human && human.base && !human.base.dead && human.base.hp < prevBaseHp) {
            if (!this._baseAlertCD || this._baseAlertCD <= 0) {
                this.addAlert('⚠ Ваша база под атакой!');
                this._baseAlertCD = 10;
            }
        }
        if (this._baseAlertCD > 0) this._baseAlertCD -= sDt;

        const allUnits = this.getAllUnits();
        const allBuildings = this.getAllBuildings();

        for (const p of this.players) {
            if (!p.alive) continue;
            for (const u of p.units) {
                if (!u.dead) u.update(sDt, allUnits, allBuildings);
            }
        }

        // Auto-heal near base (7)
        if (human && human.base && !human.base.dead) {
            const bx = human.base.getCenterX(), by = human.base.getCenterY();
            for (const u of human.units) {
                if (u.dead || u.hp >= u.maxHp) continue;
                if (Utils.dist(u.x, u.y, bx, by) < 80) {
                    u.hp = Math.min(u.maxHp, u.hp + 5 * sDt);
                }
            }
            // AI players too
            for (const p of this.players) {
                if (p.isHuman || !p.alive || !p.base || p.base.dead) continue;
                const pbx = p.base.getCenterX(), pby = p.base.getCenterY();
                for (const u of p.units) {
                    if (u.dead || u.hp >= u.maxHp) continue;
                    if (Utils.dist(u.x, u.y, pbx, pby) < 80) {
                        u.hp = Math.min(u.maxHp, u.hp + 5 * sDt);
                    }
                }
            }
        }

        GameMap.updateDerricks(this.players, allUnits, sDt);
        AI.update(sDt, this.players, allUnits, allBuildings);
        Particles.update(sDt);
        this.checkGameEnd();
    },

    checkGameEnd() {
        const alivePlayers = this.players.filter(p => p.alive);
        if (alivePlayers.length <= 1) {
            this.state = 'gameover';
            this.winner = alivePlayers[0] || null;
        }

        const human = this.getHumanPlayer();
        if (human && !human.alive && !this.winner) {
            this.state = 'gameover';
            let strongest = null, maxUnits = 0;
            for (const p of this.players) {
                if (!p.alive) continue;
                const cnt = p.units.filter(u => !u.dead).length;
                if (cnt > maxUnits) { maxUnits = cnt; strongest = p; }
            }
            this.winner = strongest;
        }
    },

    draw() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Black background
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);

        if (this.state === 'menu') {
            UI.drawMenu(ctx, w, h);
            return;
        }

        if (this.state === 'gameover') {
            this.drawWorld(ctx);
            Camera.resetTransform(ctx);
            UI.drawGameOver(ctx, w, h, this.winner);
            return;
        }

        // Playing — clip game world to area between top bar and bottom panel
        const topH = 42;
        const botH = UI.panelHeight;
        const gameH = h - topH - botH;

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, topH, w, gameH);
        ctx.clip();

        // Offset camera rendering to account for top bar
        Camera.viewOffsetY = topH;
        Camera.viewH = gameH;
        this.drawWorld(ctx);
        Camera.resetTransform(ctx);
        Input.drawBuildPreview(ctx);

        ctx.restore();

        // Minimap (drawn inside game area)
        Minimap.draw(ctx, w, h, this.players);

        // HUD on top (not clipped)
        const human = this.getHumanPlayer();
        if (human) UI.drawHUD(ctx, w, h, human);

        // Alerts
        this.drawAlerts(ctx, w);

        // Pause overlay
        if (this.paused) {
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fillRect(0, topH, w, gameH);
            ctx.fillStyle = '#ff0';
            ctx.font = 'bold 32px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('⏸ ПАУЗА', w / 2, topH + gameH / 2);
            ctx.font = '14px Arial';
            ctx.fillStyle = '#aaa';
            ctx.fillText('Пробел — продолжить   +/- — скорость (x' + this.gameSpeed + ')', w / 2, topH + gameH / 2 + 30);
        }

        // Speed indicator
        if (this.gameSpeed !== 1) {
            ctx.fillStyle = '#ff0';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'top';
            ctx.fillText('x' + this.gameSpeed, w - 15, 46);
        }
    },

    drawAlerts(ctx, w) {
        let ay = 70;
        for (const a of this.alerts) {
            const alpha = Math.min(1, a.time);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = 'rgba(180,0,0,0.7)';
            Utils.drawRoundRect(ctx, w / 2 - 160, ay, 320, 26, 5);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 13px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(a.text, w / 2, ay + 13);
            ctx.globalAlpha = 1;
            ay += 30;
        }
    },

    drawWorld(ctx) {
        Camera.applyTransform(ctx);

        // Map base tiles
        GameMap.draw(ctx);

        // Oil derricks
        GameMap.drawDerricks(ctx, this.players);

        // Buildings
        for (const p of this.players) {
            if (!p.alive) continue;
            p.drawBuildings(ctx);
        }

        // Units
        for (const p of this.players) {
            if (!p.alive) continue;
            p.drawUnits(ctx);
        }

        // Particles (bullets, explosions)
        Particles.draw(ctx);

        // Trees layer on top (hides units like in Battle City)
        GameMap.drawTreesLayer(ctx);

        // Damage numbers
        this.drawDamageNumbers(ctx);
    },

    // Floating damage numbers
    damageNumbers: [],
    addDamageNumber(x, y, dmg, color) {
        this.damageNumbers.push({ x, y, dmg, color, life: 1.0 });
    },

    drawDamageNumbers(ctx) {
        for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
            const dn = this.damageNumbers[i];
            dn.y -= 30 * (1 / 60); // float up
            dn.life -= 1 / 60;
            if (dn.life <= 0) { this.damageNumbers.splice(i, 1); continue; }
            ctx.globalAlpha = Math.min(1, dn.life * 2);
            ctx.shadowColor = dn.color;
            ctx.shadowBlur = 4;
            ctx.fillStyle = dn.color;
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('-' + dn.dmg, dn.x, dn.y);
            ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = 1;
    },

    // Fog of War — darken areas outside human vision
    drawFog(ctx) {
        const human = this.getHumanPlayer();
        if (!human) return;

        // Create a temporary canvas for fog mask
        const visionRadius = 100;
        const buildingVision = 120;

        // Gather all vision points for human player
        const points = [];
        for (const u of human.units) {
            if (!u.dead) points.push({ x: u.x, y: u.y, r: visionRadius });
        }
        for (const b of human.buildings) {
            if (!b.dead) points.push({ x: b.getCenterX(), y: b.getCenterY(), r: buildingVision });
        }
        // Derricks
        for (const d of GameMap.oilDerricks) {
            if (d.owner === human.id) points.push({ x: d.x, y: d.y, r: 80 });
        }

        // Draw fog as dark overlay with holes
        ctx.fillStyle = 'rgba(0,0,10,0.65)';
        ctx.fillRect(0, 0, CFG.MAP_W, CFG.MAP_H);

        // Cut out vision circles (clear them)
        ctx.globalCompositeOperation = 'destination-out';
        for (const pt of points) {
            const grad = ctx.createRadialGradient(pt.x, pt.y, pt.r * 0.3, pt.x, pt.y, pt.r);
            grad.addColorStop(0, 'rgba(0,0,0,1)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
    },
};

window.addEventListener('load', () => {
    Game.init();
});
