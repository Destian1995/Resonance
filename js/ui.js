// ============================================
// UI — Mobile-first adaptive HUD
// ============================================

const UI = {
    buttons: [],
    message: null,
    messageTimer: 0,
    menuState: 'main',
    setupPlayers: 2,
    setupSpec: 'armor',

    get mob() { return window.innerWidth < 800 || ('ontouchstart' in window); },
    get panelHeight() { return this.mob ? 100 : 150; },
    get topBarHeight() { return this.mob ? 48 : 40; },

    showMessage(text, dur = 2) { this.message = text; this.messageTimer = dur; },

    handleClick(sx, sy) {
        for (const btn of this.buttons) {
            if (Utils.pointInRect(sx, sy, btn.x, btn.y, btn.w, btn.h)) {
                if (btn.action) { btn.action(); Sound.play('click'); }
                return true;
            }
        }
        const c = document.getElementById('game');
        if (sy > c.height - this.panelHeight && Game.state === 'playing') return true;
        return false;
    },

    update(dt) { if (this.messageTimer > 0) { this.messageTimer -= dt; if (this.messageTimer <= 0) this.message = null; } },

    // === MENU ===
    drawMenu(ctx, w, h) {
        this.buttons = [];
        const m = this.mob;
        ctx.fillStyle = '#060610';
        ctx.fillRect(0, 0, w, h);

        // Subtle grid
        ctx.strokeStyle = 'rgba(0,255,100,0.03)';
        ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
        for (let y = 0; y < h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

        // Title
        ctx.shadowColor = '#0f0'; ctx.shadowBlur = 20;
        ctx.fillStyle = '#0f0';
        ctx.font = 'bold ' + (m ? '32' : '48') + 'px Arial';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('RESONANCE', w / 2, m ? 40 : 55);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#0a0';
        ctx.font = (m ? '12' : '16') + 'px Arial';
        ctx.fillText('Стратегия в реальном времени', w / 2, m ? 65 : 90);

        if (this.menuState === 'main') {
            const bw = Math.min(280, w - 40);
            this.drawMenuBtn(ctx, w/2 - bw/2, m ? 95 : 140, bw, m ? 48 : 55, 'ИГРАТЬ', '#0f0');
            this.drawMenuBtn(ctx, w/2 - bw/2, m ? 152 : 210, bw, m ? 42 : 45, 'Рейтинг', '#FFD740');

            if (!m) {
                ctx.fillStyle = '#444';
                ctx.font = '12px Arial';
                ctx.fillText('ЛКМ — выбор   ПКМ — приказ   WASD — камера   Пробел — пауза', w/2, h - 25);
            }
        } else if (this.menuState === 'leaderboard') {
            this.drawLeaderboard(ctx, w, h);
        } else if (this.menuState === 'setup') {
            this.drawSetup(ctx, w, h);
        }
    },

    drawMenuBtn(ctx, x, y, w, h, text, color) {
        const action = text === 'ИГРАТЬ' ? () => { this.menuState = 'setup'; }
            : text === 'Рейтинг' ? () => { this.menuState = 'leaderboard'; }
            : text === 'Назад' ? () => { this.menuState = 'main'; }
            : text === 'НАЧАТЬ' ? () => { Game.startGame(this.setupPlayers, this.setupSpec); }
            : null;
        this.buttons.push({ x, y, w, h, action });
        const hov = Utils.pointInRect(Input.mouse.x, Input.mouse.y, x, y, w, h);

        ctx.shadowColor = color; ctx.shadowBlur = hov ? 12 : 6;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        Utils.drawRoundRect(ctx, x, y, w, h, 10);
        ctx.stroke();
        if (hov) { ctx.fillStyle = color; ctx.globalAlpha = 0.1; ctx.fill(); ctx.globalAlpha = 1; }
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#fff';
        ctx.font = 'bold ' + (this.mob ? '16' : '20') + 'px Arial';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(text, x + w/2, y + h/2);
    },

    drawSetup(ctx, w, h) {
        const m = this.mob;
        const cy = m ? 95 : 115;

        // Player count
        ctx.fillStyle = '#ccc';
        ctx.font = 'bold ' + (m ? '14' : '18') + 'px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Игроки:', w/2, cy);

        const btnW = m ? 40 : 50, gap = m ? 6 : 10;
        const startX = w/2 - ((5 * btnW + 4 * gap) / 2);
        for (let i = 2; i <= 6; i++) {
            const bx = startX + (i-2) * (btnW + gap);
            const sel = this.setupPlayers === i;
            this.buttons.push({ x: bx, y: cy + 8, w: btnW, h: 32, action: () => { this.setupPlayers = i; } });
            ctx.strokeStyle = sel ? '#0f0' : '#444';
            ctx.lineWidth = sel ? 2 : 1;
            Utils.drawRoundRect(ctx, bx, cy + 8, btnW, 32, 6);
            ctx.stroke();
            if (sel) { ctx.fillStyle = 'rgba(0,255,0,0.15)'; ctx.fill(); }
            ctx.fillStyle = sel ? '#fff' : '#888';
            ctx.font = 'bold 16px Arial';
            ctx.fillText('' + i, bx + btnW/2, cy + 24);
        }

        // Specialization
        ctx.fillStyle = '#ccc';
        ctx.font = 'bold ' + (m ? '14' : '18') + 'px Arial';
        ctx.fillText('Специализация:', w/2, cy + 55);

        const specs = Object.entries(CFG.SPECS);
        const specW = Math.min(m ? 110 : 180, (w - 30) / specs.length - 8);
        const specH = m ? 80 : 110;
        const specStartX = w/2 - (specs.length * (specW + 8) - 8) / 2;

        for (let i = 0; i < specs.length; i++) {
            const [key, spec] = specs[i];
            const sx = specStartX + i * (specW + 8);
            const sy = cy + 68;
            const sel = this.setupSpec === key;

            this.buttons.push({ x: sx, y: sy, w: specW, h: specH, action: () => { this.setupSpec = key; } });

            // Card
            ctx.fillStyle = sel ? 'rgba(0,255,0,0.08)' : 'rgba(255,255,255,0.02)';
            Utils.drawRoundRect(ctx, sx, sy, specW, specH, 8);
            ctx.fill();
            ctx.shadowColor = sel ? spec.color : 'transparent';
            ctx.shadowBlur = sel ? 8 : 0;
            ctx.strokeStyle = sel ? spec.color : '#333';
            ctx.lineWidth = sel ? 2 : 1;
            ctx.stroke();
            ctx.shadowBlur = 0;

            ctx.font = (m ? '20' : '26') + 'px Arial';
            ctx.fillStyle = spec.color;
            ctx.fillText(spec.icon, sx + specW/2, sy + (m ? 18 : 24));

            ctx.font = 'bold ' + (m ? '11' : '14') + 'px Arial';
            ctx.fillStyle = sel ? '#fff' : '#aaa';
            ctx.fillText(spec.name, sx + specW/2, sy + (m ? 38 : 50));

            ctx.font = (m ? '9' : '11') + 'px Arial';
            ctx.fillStyle = '#888';
            ctx.fillText(spec.desc, sx + specW/2, sy + (m ? 52 : 66));

            if (!m) {
                ctx.font = '10px Arial';
                ctx.fillStyle = '#666';
                const names = [...spec.baseUnits, ...spec.specUnits, ...spec.factoryUnits]
                    .map(u => CFG.UNITS[u] ? CFG.UNITS[u].name : u).join(', ');
                ctx.fillText(names, sx + specW/2, sy + 86);
            }
        }

        // Start / Back
        const startY = cy + specH + 80;
        const bw = Math.min(260, w - 40);
        this.drawMenuBtn(ctx, w/2 - bw/2, startY, bw, m ? 44 : 50, 'НАЧАТЬ');
        this.drawMenuBtn(ctx, w/2 - 70, startY + (m ? 52 : 60), 140, 36, 'Назад');
    },

    drawLeaderboard(ctx, w, h) {
        const m = this.mob;
        ctx.fillStyle = '#FFD740';
        ctx.font = 'bold ' + (m ? '18' : '24') + 'px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Рейтинг', w/2, m ? 100 : 120);

        const scores = Game.loadScores();
        if (scores.length === 0) {
            ctx.fillStyle = '#666';
            ctx.font = '14px Arial';
            ctx.fillText('Пока нет результатов', w/2, 170);
        } else {
            let ty = m ? 120 : 150;
            for (let i = 0; i < scores.length; i++) {
                const s = scores[i];
                const specCfg = CFG.SPECS[s.spec];
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i+1) + '.';
                const tm = Math.floor(s.time/60) + ':' + ((s.time%60) < 10 ? '0' : '') + (s.time%60);

                ctx.fillStyle = i < 3 ? '#FFD740' : '#888';
                ctx.font = (m ? '12' : '14') + 'px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(medal + '  ' + (specCfg ? specCfg.icon : '') + ' ' + s.kills + ' убийств  ' + tm, w/2, ty);
                ty += m ? 20 : 24;
            }
        }

        this.drawMenuBtn(ctx, w/2 - 70, h - 70, 140, 40, 'Назад');
    },

    // === GAME HUD ===
    drawHUD(ctx, w, h, player) {
        this.buttons = [];
        this.drawTopBar(ctx, w, player);
        this.drawBottomPanel(ctx, w, h, player);

        // Message
        if (this.message) {
            const mw = Math.min(300, w - 20);
            ctx.fillStyle = 'rgba(0,0,0,0.85)';
            Utils.drawRoundRect(ctx, w/2 - mw/2, h/2 - 18, mw, 36, 8);
            ctx.fill();
            ctx.strokeStyle = '#ff0'; ctx.lineWidth = 1; ctx.stroke();
            ctx.fillStyle = '#ff0';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(this.message, w/2, h/2);
        }

        // Build mode banner
        if (player.buildMode) {
            const names = { barracks: 'Казармы', market: 'Рынок', tower: 'Башня' };
            const by = this.topBarHeight + 2;
            ctx.fillStyle = 'rgba(0,60,0,0.9)';
            Utils.drawRoundRect(ctx, w/2 - 100, by, 200, 24, 6);
            ctx.fill();
            ctx.fillStyle = '#0f0';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('Строим: ' + (names[player.buildMode] || ''), w/2, by + 12);
        }

        Input.drawDragRect(ctx);
    },

    drawTopBar(ctx, w, player) {
        const th = this.topBarHeight;
        const m = this.mob;
        ctx.fillStyle = 'rgba(5,5,15,0.92)';
        ctx.fillRect(0, 0, w, th);
        ctx.fillStyle = 'rgba(0,200,100,0.3)';
        ctx.fillRect(0, th - 1, w, 1);

        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';

        if (m) {
            // 2 rows, compact
            const f = 'bold 11px Arial';
            ctx.font = f;
            const y1 = 14, y2 = 34;
            let x = 6;
            const s = 52; // spacing

            ctx.fillStyle = '#FFD740';
            ctx.fillText(Math.floor(player.money) + '₽', x, y1); x += s;
            ctx.fillStyle = '#69F0AE';
            ctx.fillText('+' + player.getIncome(), x, y1); x += 36;
            ctx.fillStyle = '#FFB74D';
            ctx.fillText('Н' + Math.floor(player.oil), x, y1); x += 32;
            ctx.fillStyle = '#B0BEC5';
            ctx.fillText('М' + Math.floor(player.metal), x, y1);

            x = 6;
            ctx.fillStyle = '#4FC3F7';
            ctx.fillText('👥' + player.getCurrentPop() + '/' + player.getPopLimit(), x, y2); x += 58;
            ctx.fillStyle = '#EF5350';
            ctx.fillText(Game.players.filter(p => p.alive).length + '/' + Game.players.length, x, y2);

            ctx.textAlign = 'right';
            const sp = CFG.SPECS[player.spec];
            if (sp) { ctx.fillStyle = sp.color; ctx.fillText(sp.icon + sp.name, w - 6, y1); }
        } else {
            ctx.font = 'bold 13px Arial';
            let x = 12;
            const y = th / 2;
            ctx.fillStyle = '#FFD740'; ctx.fillText(Math.floor(player.money) + '₽', x, y); x += 70;
            ctx.fillStyle = '#69F0AE'; ctx.fillText('+' + player.getIncome() + '/5с', x, y); x += 75;
            ctx.fillStyle = '#FFB74D'; ctx.fillText('Н:' + Math.floor(player.oil), x, y); x += 55;
            ctx.fillStyle = '#B0BEC5'; ctx.fillText('М:' + Math.floor(player.metal), x, y); x += 60;
            ctx.fillStyle = '#4FC3F7'; ctx.fillText(player.getCurrentPop() + '/' + player.getPopLimit(), x, y);
            ctx.textAlign = 'right';
            ctx.fillStyle = '#EF5350';
            ctx.fillText(Game.players.filter(p=>p.alive).length + '/' + Game.players.length, w - 12, y);
        }
    },

    drawBottomPanel(ctx, w, h, player) {
        const py = h - this.panelHeight;
        ctx.fillStyle = 'rgba(5,5,15,0.92)';
        ctx.fillRect(0, py, w, this.panelHeight);
        ctx.fillStyle = 'rgba(0,200,100,0.3)';
        ctx.fillRect(0, py, w, 1);

        const su = player.units.filter(u => u.selected && !u.dead);
        const sb = player.buildings.find(b => b.selected && !b.dead);
        const sd = GameMap.oilDerricks.find(d => d.selected && d.owner === player.id);

        if (sd) this.panelDerrick(ctx, w, py, player, sd);
        else if (sb && sb.type === 'market') this.panelMarket(ctx, w, py, player, sb);
        else if (sb && sb.type === 'tower') this.panelUpgradable(ctx, w, py, player, sb, '🗼', '#EF5350', sb.getTowerStats());
        else if (sb) this.panelBuilding(ctx, w, py, player, sb);
        else if (su.length > 0) this.panelUnits(ctx, w, py, player, su);
        else this.panelBuild(ctx, w, py, player);
    },

    // -- Quick row of buttons helper --
    btnRow(ctx, items, y, w, h) {
        const m = this.mob;
        const gap = m ? 3 : 5;
        const bw = Math.floor((w - 12 - (items.length - 1) * gap) / items.length);
        let x = 6;
        for (const item of items) {
            this.drawPanelBtn(ctx, x, y, bw, h, item.label, item.sub, item.color, item.enabled, item.action);
            x += bw + gap;
        }
    },

    // -- PANELS --
    panelBuild(ctx, w, py, player) {
        const m = this.mob;
        const bc = CFG.BUILDING_COSTS;
        const items = [
            { label: m ? 'Казармы' : 'Казармы [B]', sub: bc.barracks.money + '₽', color: '#42A5F5', enabled: player.canAfford(bc.barracks), action: () => { player.buildMode = 'barracks'; } },
            { label: m ? 'Рынок' : 'Рынок [M]', sub: bc.market.money + '₽', color: '#FFB74D', enabled: player.canAfford(bc.market), action: () => { player.buildMode = 'market'; } },
            { label: m ? 'Башня' : 'Башня [T]', sub: bc.tower.money + '₽', color: '#EF5350', enabled: player.canAfford(bc.tower), action: () => { player.buildMode = 'tower'; } },
        ];
        if (player.base && !player.base.dead && player.base.canUpgrade()) {
            const cost = player.base.getUpgradeCost();
            const cn = typeof cost === 'number' ? cost : cost.money;
            items.push({ label: m ? 'Баз⬆' : 'Улучш. базу', sub: cn + '₽', color: '#FFD740', enabled: player.canAfford(cost), action: () => { player.upgradeBuilding(player.base); } });
        }
        this.btnRow(ctx, items, py + 6, w, m ? 40 : 48);

        // Info
        ctx.fillStyle = player.hasBuilding('factory') ? '#69F0AE' : '#555';
        ctx.font = (m ? '9' : '11') + 'px Arial';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(player.hasBuilding('factory') ? '✔ Завод' : '🔒 Завод: база 3ур.', 8, py + (m ? 50 : 60));
    },

    panelBuilding(ctx, w, py, player, b) {
        const m = this.mob;
        // Title + HP
        ctx.fillStyle = '#69F0AE';
        ctx.font = 'bold ' + (m ? '12' : '15') + 'px Arial';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(b.getLevelName(), 8, py + 5);
        ctx.fillStyle = '#888'; ctx.font = (m ? '9' : '11') + 'px Arial';
        ctx.fillText('HP:' + Math.floor(b.hp) + '/' + b.maxHp, 8, py + (m ? 18 : 22));

        // Unit buttons
        const units = b.getAvailableUnits(player.spec);
        const items = [];
        for (const ut of units) {
            const d = CFG.UNITS[ut];
            const cost = { money: d.cost, oil: d.oil || 0, metal: d.metal || 0 };
            let sub = d.cost + '₽';
            if (d.metal > 0) sub += ' ' + d.metal + 'м';
            items.push({ label: d.name, sub: sub, color: d.color, enabled: player.canAfford(cost) && player.getCurrentPop() + d.pop <= player.getPopLimit(), action: () => { player.trainUnit(ut, b); } });
        }
        if (b.canUpgrade()) {
            const cost = b.getUpgradeCost();
            const cn = typeof cost === 'number' ? cost : cost.money;
            items.push({ label: '⬆', sub: cn + '₽', color: '#FFD740', enabled: player.canAfford(cost), action: () => { player.upgradeBuilding(b); } });
        }

        const btnY = py + (m ? 30 : 38);
        this.btnRow(ctx, items, btnY, w, m ? 36 : 44);

        // Queue
        if (b.trainQueue.length > 0) {
            const def = CFG.UNITS[b.trainQueue[0]];
            const progress = b.trainProgress / def.trainTime;
            const qy = btnY + (m ? 40 : 50);
            ctx.fillStyle = '#222';
            ctx.fillRect(8, qy, Math.min(w - 16, 140), 5);
            ctx.fillStyle = '#69F0AE';
            ctx.fillRect(8, qy, Math.floor(Math.min(w - 16, 140) * progress), 5);
            ctx.fillStyle = '#888'; ctx.font = '9px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
            ctx.fillText(b.trainQueue.map(t => CFG.UNITS[t].name).join(', '), 8, qy + 7);
        }
    },

    panelMarket(ctx, w, py, player, b) {
        const m = this.mob;
        ctx.fillStyle = '#FFB74D';
        ctx.font = 'bold ' + (m ? '12' : '15') + 'px Arial';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText('Рынок  Н:' + Math.floor(player.oil) + '  М:' + Math.floor(player.metal), 8, py + 5);

        const oP = CFG.MARKET_PRICES.oil, mP = CFG.MARKET_PRICES.metal;
        const items = [
            { label: '+ Нефть', sub: oP.buyPrice + '₽→x' + oP.amount, color: '#FFB74D', enabled: player.money >= oP.buyPrice, action: () => { player.marketBuy('oil'); } },
            { label: '- Нефть', sub: 'x' + oP.amount + '→' + oP.sellPrice + '₽', color: '#FF8A65', enabled: player.oil >= oP.amount, action: () => { player.marketSell('oil'); } },
            { label: '+ Металл', sub: mP.buyPrice + '₽→x' + mP.amount, color: '#B0BEC5', enabled: player.money >= mP.buyPrice, action: () => { player.marketBuy('metal'); } },
            { label: '- Металл', sub: 'x' + mP.amount + '→' + mP.sellPrice + '₽', color: '#90A4AE', enabled: player.metal >= mP.amount, action: () => { player.marketSell('metal'); } },
        ];
        this.btnRow(ctx, items, py + (m ? 22 : 28), w, m ? 36 : 44);
    },

    panelDerrick(ctx, w, py, player, d) {
        const m = this.mob;
        const st = CFG.DERRICK_STATS[d.level - 1];
        ctx.fillStyle = '#FFB74D';
        ctx.font = 'bold ' + (m ? '12' : '15') + 'px Arial';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText('⛽ ' + st.name + '  +' + st.income + '₽  +' + st.oil + 'Н  +' + st.metal + 'М /5с', 8, py + 5);

        if (GameMap.canUpgradeDerrick(d)) {
            const cost = GameMap.getDerrickUpgradeCost(d);
            const next = CFG.DERRICK_STATS[d.level];
            let sub = cost.money + '₽';
            if (cost.metal > 0) sub += ' ' + cost.metal + 'м';
            if (cost.oil > 0) sub += ' ' + cost.oil + 'н';

            ctx.fillStyle = '#69F0AE'; ctx.font = (m ? '10' : '12') + 'px Arial';
            ctx.fillText('→ ' + next.name + ': +' + next.income + '₽ +' + next.oil + 'Н +' + next.metal + 'М', 8, py + (m ? 22 : 26));

            this.drawPanelBtn(ctx, w - (m ? 130 : 190), py + 6, m ? 120 : 180, m ? 38 : 50,
                '⬆ ' + next.name, sub, '#FFD740', player.canAfford(cost), () => { player.upgradeDerrick(d); });
        } else {
            ctx.fillStyle = '#69F0AE'; ctx.font = 'bold 12px Arial';
            ctx.fillText('★ Максимум!', 8, py + 24);
        }
    },

    panelUpgradable(ctx, w, py, player, b, icon, color, stats) {
        const m = this.mob;
        ctx.fillStyle = color;
        ctx.font = 'bold ' + (m ? '12' : '15') + 'px Arial';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(icon + ' ' + b.getLevelName() + '  HP:' + Math.floor(b.hp) + '/' + b.maxHp, 8, py + 5);

        ctx.fillStyle = '#aaa'; ctx.font = (m ? '9' : '11') + 'px Arial';
        ctx.fillText('Урон:' + stats.damage + ' Дальн:' + stats.range + (stats.aoe ? ' AOE:' + stats.aoe : ''), 8, py + (m ? 20 : 24));

        if (b.canUpgrade()) {
            const cost = b.getUpgradeCost();
            let sub = cost.money + '₽';
            if (cost.metal > 0) sub += ' ' + cost.metal + 'м';
            if (cost.oil > 0) sub += ' ' + cost.oil + 'н';
            this.drawPanelBtn(ctx, w - (m ? 130 : 190), py + 6, m ? 120 : 180, m ? 38 : 50,
                '⬆ Улучшить', sub, '#FFD740', player.canAfford(cost), () => { player.upgradeBuilding(b); });
        } else {
            ctx.fillStyle = '#69F0AE'; ctx.font = 'bold 12px Arial';
            ctx.fillText('★ Максимум!', 8, py + (m ? 34 : 42));
        }
    },

    panelUnits(ctx, w, py, player, units) {
        const m = this.mob;
        const counts = {};
        let hp = 0, mhp = 0;
        for (const u of units) { counts[u.type] = (counts[u.type] || 0) + 1; hp += u.hp; mhp += u.maxHp; }

        ctx.fillStyle = '#69F0AE';
        ctx.font = 'bold ' + (m ? '12' : '15') + 'px Arial';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';

        let info = units.length + ' юн: ';
        for (const [t, c] of Object.entries(counts)) info += CFG.UNITS[t].name + '×' + c + ' ';
        ctx.fillText(info, 8, py + 5);

        ctx.fillStyle = '#888'; ctx.font = (m ? '10' : '12') + 'px Arial';
        ctx.fillText('HP: ' + Math.floor(hp) + '/' + mhp, 8, py + (m ? 20 : 24));

        // Unit dots
        let dx = m ? 8 : 200;
        const dy = py + (m ? 36 : 44);
        for (const u of units.slice(0, m ? 20 : 30)) {
            ctx.fillStyle = CFG.UNITS[u.type].color;
            ctx.fillRect(dx, dy, 6, 6);
            dx += 8;
        }
    },

    // Universal panel button
    drawPanelBtn(ctx, x, y, w, h, line1, line2, color, enabled, action) {
        this.buttons.push({ x, y, w, h, action: enabled ? action : null });
        const hov = Utils.pointInRect(Input.mouse.x, Input.mouse.y, x, y, w, h);
        const m = this.mob;

        ctx.globalAlpha = enabled ? 1 : 0.3;
        ctx.fillStyle = hov && enabled ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)';
        Utils.drawRoundRect(ctx, x, y, w, h, 6);
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = hov && enabled ? 2 : 1;
        ctx.stroke();

        ctx.fillStyle = enabled ? '#fff' : '#555';
        ctx.font = 'bold ' + (m ? '10' : '12') + 'px Arial';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(line1, x + w/2, y + h/2 - (m ? 5 : 7));

        ctx.font = (m ? '8' : '10') + 'px Arial';
        ctx.fillStyle = enabled ? color : '#444';
        ctx.fillText(line2, x + w/2, y + h/2 + (m ? 6 : 8));
        ctx.globalAlpha = 1;
    },

    // === GAME OVER ===
    drawGameOver(ctx, w, h, winner) {
        this.buttons = [];
        const m = this.mob;
        ctx.fillStyle = 'rgba(0,0,0,0.92)';
        ctx.fillRect(0, 0, w, h);

        const isWin = winner && winner.isHuman;
        ctx.fillStyle = isWin ? '#69F0AE' : '#EF5350';
        ctx.font = 'bold ' + (m ? '28' : '42') + 'px Arial';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(isWin ? 'ПОБЕДА!' : 'ПОРАЖЕНИЕ', w/2, m ? 35 : 45);

        if (winner) {
            ctx.fillStyle = '#fff'; ctx.font = (m ? '13' : '18') + 'px Arial';
            ctx.fillText(winner.name + '  |  ' + this.formatTime(Game.gameTime), w/2, m ? 60 : 78);
        }

        // Stats
        const players = Game.players;
        const cols = players.length;
        const tx = m ? 5 : 30;
        const tw = w - tx * 2;
        const colW = tw / (cols + 1);
        let ty = m ? 80 : 105;
        const rh = m ? 18 : 22;
        const fs = m ? '10' : '12';

        // Header
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(tx, ty, tw, rh + 2);
        ctx.fillStyle = '#888'; ctx.font = 'bold ' + fs + 'px Arial';
        ctx.textAlign = 'left'; ctx.fillText('Стат', tx + 4, ty + rh/2 + 1);
        ctx.textAlign = 'center';
        for (let i = 0; i < cols; i++) { ctx.fillStyle = players[i].color; ctx.fillText(m ? ('P' + (i+1)) : players[i].name, tx + colW*(i+1) + colW/2, ty + rh/2 + 1); }
        ty += rh + 3;

        const rows = [
            ['Произв.', 'unitsProduced'], ['Потери', 'unitsLost'],
            ['Убийства', 'killsInfantry'], ['Техника', 'killsVehicle'],
            ['Здания', 'killsBuilding'], ['Урон↑', 'damageDealt'],
            ['Урон↓', 'damageReceived'], ['Доход', 'moneyEarned'],
        ];

        for (let r = 0; r < rows.length; r++) {
            if (r % 2 === 0) { ctx.fillStyle = 'rgba(255,255,255,0.02)'; ctx.fillRect(tx, ty, tw, rh); }
            ctx.fillStyle = '#777'; ctx.font = fs + 'px Arial'; ctx.textAlign = 'left';
            ctx.fillText(rows[r][0], tx + 4, ty + rh/2 + 1);
            let maxV = 0;
            for (const p of players) maxV = Math.max(maxV, p.stats[rows[r][1]]);
            ctx.textAlign = 'center'; ctx.font = fs + 'px Arial';
            for (let i = 0; i < cols; i++) {
                const v = players[i].stats[rows[r][1]];
                ctx.fillStyle = (v === maxV && maxV > 0) ? '#FFD740' : '#ccc';
                ctx.fillText(Math.floor(v), tx + colW*(i+1) + colW/2, ty + rh/2 + 1);
            }
            ty += rh;
        }

        this.drawMenuBtn(ctx, w/2 - 100, h - (m ? 50 : 65), 200, m ? 40 : 50, 'Назад');
    },

    formatTime(s) { const m = Math.floor(s/60); return m + ':' + ((Math.floor(s%60)) < 10 ? '0' : '') + Math.floor(s%60); },
};
