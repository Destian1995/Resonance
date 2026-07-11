// ============================================
// Input Handling
// ============================================

const Input = {
    mouse: { x: 0, y: 0, worldX: 0, worldY: 0, down: false, button: 0 },
    keys: {},
    dragStart: null,
    dragEnd: null,
    isDragging: false,
    hoveredButton: null,

    init(canvas) {
        this.canvas = canvas;

        canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        canvas.addEventListener('wheel', (e) => this.onWheel(e));

        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            if (Game.state === 'playing') this.onKeyDown(e);
        });
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });

        // Touch support
        canvas.addEventListener('dblclick', (e) => this.onDoubleClick(e));
        canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
        canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
        canvas.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
    },

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    },

    onMouseDown(e) {
        const pos = this.getMousePos(e);
        this.mouse.x = pos.x;
        this.mouse.y = pos.y;
        this.mouse.down = true;
        this.mouse.button = e.button;

        if (Game.state !== 'playing') {
            UI.handleClick(pos.x, pos.y);
            return;
        }

        // Check if clicking on minimap
        if (Minimap.handleClick(pos.x, pos.y)) return;

        // Check if clicking on UI
        if (UI.handleClick(pos.x, pos.y)) return;

        const world = Camera.screenToWorld(pos.x, pos.y);
        this.mouse.worldX = world.x;
        this.mouse.worldY = world.y;

        if (e.button === 0) {
            // Left click — select or start drag
            this.dragStart = { x: pos.x, y: pos.y };
            this.isDragging = false;

            const player = Game.getHumanPlayer();
            if (!player) return;

            // Build mode
            if (player.buildMode) {
                this.handleBuild(player, world);
                return;
            }
        } else if (e.button === 2) {
            // Right click — command
            this.handleRightClick();
        }
    },

    onMouseMove(e) {
        const pos = this.getMousePos(e);
        this.mouse.x = pos.x;
        this.mouse.y = pos.y;

        const world = Camera.screenToWorld(pos.x, pos.y);
        this.mouse.worldX = world.x;
        this.mouse.worldY = world.y;

        // Drag select
        if (this.mouse.down && this.mouse.button === 0 && this.dragStart) {
            const dx = pos.x - this.dragStart.x;
            const dy = pos.y - this.dragStart.y;
            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                this.isDragging = true;
                this.dragEnd = { x: pos.x, y: pos.y };
            }
        }

        // Edge scrolling
        if (Game.state === 'playing') {
            const edge = CFG.CAM_EDGE;
            const w = this.canvas.width;
            const h = this.canvas.height;
            let dx = 0, dy = 0;
            if (pos.x < edge) dx = -CFG.CAM_SPEED;
            if (pos.x > w - edge) dx = CFG.CAM_SPEED;
            if (pos.y < edge) dy = -CFG.CAM_SPEED;
            if (pos.y > h - edge) dy = CFG.CAM_SPEED;
            if (dx || dy) Camera.moveBy(dx, dy);
        }
    },

    onMouseUp(e) {
        const pos = this.getMousePos(e);

        if (Game.state === 'playing' && e.button === 0) {
            if (this.isDragging) {
                this.handleDragSelect();
            } else if (this.dragStart) {
                this.handleClick();
            }
        }

        this.mouse.down = false;
        this.dragStart = null;
        this.dragEnd = null;
        this.isDragging = false;
    },

    onWheel(e) {
        if (Game.state !== 'playing') return;
        const delta = e.deltaY > 0 ? -1 : 1;
        Camera.zoomAt(this.mouse.x, this.mouse.y, delta);
        e.preventDefault();
    },

    onKeyDown(e) {
        const player = Game.getHumanPlayer();
        if (!player) return;

        const key = e.key.toLowerCase();

        // Pause
        if (key === ' ' || key === 'p') {
            Game.paused = !Game.paused;
            UI.showMessage(Game.paused ? '⏸ ПАУЗА' : '▶ ПРОДОЛЖЕНИЕ', 1);
            e.preventDefault();
            return;
        }

        // Speed control
        if (key === '=' || key === '+') {
            Game.gameSpeed = Math.min(4, Game.gameSpeed + 0.5);
            UI.showMessage('Скорость: x' + Game.gameSpeed, 1);
            return;
        }
        if (key === '-') {
            Game.gameSpeed = Math.max(0.5, Game.gameSpeed - 0.5);
            UI.showMessage('Скорость: x' + Game.gameSpeed, 1);
            return;
        }

        // Ctrl+1..9 — save group
        if (e.ctrlKey && key >= '1' && key <= '9') {
            const selected = player.units.filter(u => u.selected && !u.dead);
            if (selected.length > 0) {
                Game.unitGroups[key] = selected.map(u => u);
                UI.showMessage('Группа ' + key + ' (' + selected.length + ' юн.)', 1);
            }
            e.preventDefault();
            return;
        }

        // 1..9 — recall group
        if (!e.ctrlKey && key >= '1' && key <= '9') {
            const group = Game.unitGroups[key];
            if (group) {
                player.deselectAll();
                for (const d of GameMap.oilDerricks) d.selected = false;
                const alive = group.filter(u => !u.dead);
                for (const u of alive) u.selected = true;
                if (alive.length > 0) {
                    Camera.centerOn(alive[0].x, alive[0].y);
                }
            }
            return;
        }

        switch (key) {
            case 'escape':
                player.buildMode = null;
                player.deselectAll();
                for (const d of GameMap.oilDerricks) d.selected = false;
                break;
            case 'b':
                if (!player.buildMode) player.buildMode = 'barracks';
                break;
            case 'm':
                if (!player.buildMode) player.buildMode = 'market';
                break;
            case 't':
                if (!player.buildMode) player.buildMode = 'tower';
                break;
            case 'a':
                player.deselectAll();
                for (const u of player.units) {
                    if (!u.dead) u.selected = true;
                }
                break;
        }
    },

    onDoubleClick(e) {
        if (Game.state !== 'playing') return;
        const player = Game.getHumanPlayer();
        if (!player) return;
        const pos = this.getMousePos(e);
        const world = Camera.screenToWorld(pos.x, pos.y);

        // Find clicked unit
        for (const u of player.units) {
            if (u.dead) continue;
            if (Utils.dist(world.x, world.y, u.x, u.y) < u.size + 5) {
                // Select all units of same type on screen
                player.deselectAll();
                for (const other of player.units) {
                    if (other.dead || other.type !== u.type) continue;
                    if (Camera.isVisible(other.x, other.y)) {
                        other.selected = true;
                    }
                }
                Sound.play('click');
                return;
            }
        }
    },

    handleClick() {
        const player = Game.getHumanPlayer();
        if (!player) return;

        const world = Camera.screenToWorld(this.dragStart.x, this.dragStart.y);

        if (!this.keys['shift']) {
            player.deselectAll();
            // Deselect derricks
            for (const d of GameMap.oilDerricks) d.selected = false;
        }

        // Try to select a unit
        let found = false;
        for (const u of player.units) {
            if (u.dead) continue;
            if (Utils.dist(world.x, world.y, u.x, u.y) < u.size + 5) {
                u.selected = true;
                found = true;
                break;
            }
        }

        // Try to select a building
        if (!found) {
            for (const b of player.buildings) {
                if (b.dead) continue;
                if (b.containsPoint(world.x, world.y)) {
                    b.selected = true;
                    found = true;
                    break;
                }
            }
        }

        // Try to select own derrick
        if (!found) {
            const derrick = GameMap.getDerrickAt(world.x, world.y);
            if (derrick && derrick.owner === player.id) {
                derrick.selected = true;
                found = true;
            }
        }
    },

    handleDragSelect() {
        const player = Game.getHumanPlayer();
        if (!player || !this.dragStart || !this.dragEnd) return;

        if (!this.keys['shift']) {
            player.deselectAll();
        }

        const s = Camera.screenToWorld(this.dragStart.x, this.dragStart.y);
        const e = Camera.screenToWorld(this.dragEnd.x, this.dragEnd.y);

        const x1 = Math.min(s.x, e.x);
        const y1 = Math.min(s.y, e.y);
        const x2 = Math.max(s.x, e.x);
        const y2 = Math.max(s.y, e.y);

        for (const u of player.units) {
            if (u.dead) continue;
            if (u.x >= x1 && u.x <= x2 && u.y >= y1 && u.y <= y2) {
                u.selected = true;
            }
        }
    },

    handleRightClick() {
        const player = Game.getHumanPlayer();
        if (!player) return;

        const world = Camera.screenToWorld(this.mouse.x, this.mouse.y);
        const selectedUnits = player.units.filter(u => u.selected && !u.dead);
        if (selectedUnits.length === 0) return;

        // Check if right-clicking on enemy
        let targetEnemy = null;
        const allUnits = Game.getAllUnits();
        const allBuildings = Game.getAllBuildings();

        for (const u of allUnits) {
            if (u.dead || u.playerId === player.id) continue;
            if (Utils.dist(world.x, world.y, u.x, u.y) < u.size + 10) {
                targetEnemy = u;
                break;
            }
        }

        if (!targetEnemy) {
            for (const b of allBuildings) {
                if (b.dead || b.playerId === player.id) continue;
                if (b.containsPoint(world.x, world.y)) {
                    targetEnemy = b;
                    break;
                }
            }
        }

        if (targetEnemy) {
            // Attack target
            for (const u of selectedUnits) {
                u.setAttackTarget(targetEnemy);
            }
        } else {
            // Move command — formation
            const count = selectedUnits.length;
            const cols = Math.ceil(Math.sqrt(count));
            const spacing = 14;

            for (let i = 0; i < selectedUnits.length; i++) {
                const col = i % cols;
                const row = Math.floor(i / cols);
                const ox = (col - cols / 2) * spacing;
                const oy = row * spacing;
                selectedUnits[i].moveTo(world.x + ox, world.y + oy);
            }
        }
    },

    handleBuild(player, world) {
        const type = player.buildMode;
        const cost = CFG.BUILDING_COSTS[type];

        if (!player.canAfford(cost)) {
            UI.showMessage('Недостаточно средств/ресурсов!');
            return;
        }

        const t = CFG.TILE;
        const gx = Math.floor(world.x / t) * t;
        const gy = Math.floor(world.y / t) * t;
        const buildSize = type === 'tower' ? CFG.TOWER_SIZE : CFG.BUILDING_SIZE;

        // Towers can be placed further from base (defensive perimeter)
        const maxDist = type === 'tower' ? 250 : 160;
        const bx = player.base.getCenterX();
        const by = player.base.getCenterY();
        if (Utils.dist(gx + buildSize / 2, gy + buildSize / 2, bx, by) > maxDist) {
            UI.showMessage('Слишком далеко от базы!');
            return;
        }

        if (player.buildStructure(type, gx, gy)) {
            player.buildMode = null;
        } else {
            UI.showMessage('Невозможно построить здесь!');
        }
    },

    drawDragRect(ctx) {
        if (!this.isDragging || !this.dragStart || !this.dragEnd) return;

        ctx.strokeStyle = '#0f0';
        ctx.lineWidth = 1;
        ctx.fillStyle = 'rgba(0,255,0,0.1)';

        const x = Math.min(this.dragStart.x, this.dragEnd.x);
        const y = Math.min(this.dragStart.y, this.dragEnd.y);
        const w = Math.abs(this.dragEnd.x - this.dragStart.x);
        const h = Math.abs(this.dragEnd.y - this.dragStart.y);

        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
    },

    drawBuildPreview(ctx) {
        const player = Game.getHumanPlayer();
        if (!player || !player.buildMode) return;

        const isTower = player.buildMode === 'tower';
        const s = isTower ? CFG.TOWER_SIZE : CFG.BUILDING_SIZE;
        const maxDist = isTower ? 250 : 160;
        const t = CFG.TILE;
        const gx = Math.floor(this.mouse.worldX / t) * t;
        const gy = Math.floor(this.mouse.worldY / t) * t;

        const canPlace = Buildings.canPlace(gx, gy, player.buildings, s);
        const bx = player.base.getCenterX();
        const by = player.base.getCenterY();
        const inRange = Utils.dist(gx + s/2, gy + s/2, bx, by) <= maxDist;
        const valid = canPlace && inRange;

        Camera.applyTransform(ctx);

        // Range circle
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(bx, by, maxDist, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Preview building
        ctx.fillStyle = valid ? 'rgba(0,255,0,0.3)' : 'rgba(255,0,0,0.3)';
        ctx.fillRect(gx, gy, s, s);
        ctx.strokeStyle = valid ? '#0f0' : '#f00';
        ctx.lineWidth = 1;
        ctx.strokeRect(gx, gy, s, s);

        // Tower: show attack range preview
        if (isTower && valid) {
            ctx.strokeStyle = 'rgba(255,100,100,0.3)';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.arc(gx + s / 2, gy + s / 2, CFG.TOWER_STATS[0].range, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        Camera.resetTransform(ctx);
    },

    // Touch handling
    touchStartTime: 0,
    touchStartPos: null,
    lastTouchDist: 0,

    onTouchStart(e) {
        e.preventDefault();
        if (e.touches.length === 1) {
            const t = e.touches[0];
            const pos = { x: t.clientX, y: t.clientY };
            this.touchStartPos = pos;
            this.touchStartTime = Date.now();
            this.mouse.x = pos.x;
            this.mouse.y = pos.y;
            const world = Camera.screenToWorld(pos.x, pos.y);
            this.mouse.worldX = world.x;
            this.mouse.worldY = world.y;

            if (Game.state !== 'playing') {
                UI.handleClick(pos.x, pos.y);
            } else {
                this.dragStart = { x: pos.x, y: pos.y };
                UI.handleClick(pos.x, pos.y);
            }
        } else if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            this.lastTouchDist = Math.sqrt(dx * dx + dy * dy);
        }
    },

    onTouchMove(e) {
        e.preventDefault();
        if (e.touches.length === 1) {
            const t = e.touches[0];
            const pos = { x: t.clientX, y: t.clientY };
            this.mouse.x = pos.x;
            this.mouse.y = pos.y;

            if (this.dragStart) {
                const dx = pos.x - this.dragStart.x;
                const dy = pos.y - this.dragStart.y;
                if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
                    // Pan camera
                    Camera.moveBy(-dx * 0.5, -dy * 0.5);
                    this.dragStart = { x: pos.x, y: pos.y };
                }
            }
        } else if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const delta = (dist - this.lastTouchDist) * 0.01;
            const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            Camera.zoomAt(cx, cy, delta);
            this.lastTouchDist = dist;
        }
    },

    onTouchEnd(e) {
        e.preventDefault();
        if (e.changedTouches.length === 1) {
            const elapsed = Date.now() - this.touchStartTime;
            if (elapsed < 300 && !this.isDragging) {
                // Tap — select
                this.handleClick();
            }
        }
        this.dragStart = null;
        this.isDragging = false;
        this.mouse.down = false;
    },
};
