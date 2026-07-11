// ============================================
// UI — HUD, Panels, Menus — ЧИТАЕМЫЙ русский интерфейс
// ============================================

const UI = {
    buttons: [],
    message: null,
    messageTimer: 0,
    menuState: 'main', // main, setup, leaderboard
    setupPlayers: 2,
    setupSpec: 'armor',

    // Responsive sizing
    get isMobile() { return window.innerWidth < 800 || ('ontouchstart' in window); },
    get panelHeight() { return this.isMobile ? 110 : 160; },
    get topBarHeight() { return this.isMobile ? 52 : 42; },
    get fontSize() { return this.isMobile ? 11 : 14; },

    showMessage(text, duration = 2) {
        this.message = text;
        this.messageTimer = duration;
    },

    handleClick(sx, sy) {
        for (const btn of this.buttons) {
            if (Utils.pointInRect(sx, sy, btn.x, btn.y, btn.w, btn.h)) {
                if (btn.action) btn.action();
                return true;
            }
        }
        const canvas = document.getElementById('game');
        if (sy > canvas.height - this.panelHeight && Game.state === 'playing') return true;
        return false;
    },

    update(dt) {
        if (this.messageTimer > 0) {
            this.messageTimer -= dt;
            if (this.messageTimer <= 0) this.message = null;
        }
    },

    // ==================
    // MAIN MENU
    // ==================
    drawMenu(ctx, w, h) {
        this.buttons = [];
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(255,255,255,0.02)';
        for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);

        // Title
        ctx.fillStyle = '#0f0';
        ctx.font = 'bold 44px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('RESONANCE', w / 2, 50);
        ctx.fillStyle = '#0a0';
        ctx.font = '16px Arial';
        ctx.fillText('Стратегия в реальном времени', w / 2, 82);

        if (this.menuState === 'main') {
            this.drawBtn(ctx, w/2 - 130, 130, 260, 55, 'ИГРАТЬ', '#0f0', '#000', () => { this.menuState = 'setup'; });
            this.drawBtn(ctx, w/2 - 130, 200, 260, 45, 'Рейтинг', '#FFD740', '#000', () => { this.menuState = 'leaderboard'; });

            // Controls
            ctx.fillStyle = '#555';
            ctx.font = '12px Arial';
            ctx.fillText('ЛКМ — выбор   ПКМ — приказ   Колесо — зум   WASD — камера', w/2, h - 40);
            ctx.fillText('B — казармы   M — рынок   T — башня   A — все   Пробел — пауза', w/2, h - 20);

        } else if (this.menuState === 'leaderboard') {
            this.drawLeaderboard(ctx, w, h);

        } else if (this.menuState === 'setup') {
            // Player count
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 18px Arial';
            ctx.fillText('Количество игроков:', w / 2, 120);

            const btnW = 50, gap = 10;
            const startX = w / 2 - ((5 * btnW + 4 * gap) / 2);
            for (let i = 2; i <= 6; i++) {
                const bx = startX + (i - 2) * (btnW + gap);
                const sel = this.setupPlayers === i;
                this.drawBtn(ctx, bx, 135, btnW, 36, '' + i, sel ? '#0f0' : '#555', sel ? '#000' : '#fff', () => { this.setupPlayers = i; });
            }

            // Specialization selection
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 18px Arial';
            ctx.fillText('Специализация:', w / 2, 195);

            const specs = Object.entries(CFG.SPECS);
            const specW = Math.min(200, (w - 60) / specs.length - 10);
            const specStartX = w / 2 - (specs.length * (specW + 10) - 10) / 2;

            for (let i = 0; i < specs.length; i++) {
                const [key, spec] = specs[i];
                const sx = specStartX + i * (specW + 10);
                const sy = 215;
                const selected = this.setupSpec === key;

                // Spec card
                this.buttons.push({ x: sx, y: sy, w: specW, h: 100, action: () => { this.setupSpec = key; } });
                const hov = Utils.pointInRect(Input.mouse.x, Input.mouse.y, sx, sy, specW, 100);

                ctx.fillStyle = selected ? 'rgba(0,255,0,0.1)' : 'rgba(255,255,255,0.03)';
                Utils.drawRoundRect(ctx, sx, sy, specW, 100, 8);
                ctx.fill();
                ctx.strokeStyle = selected ? spec.color : (hov ? '#666' : '#333');
                ctx.lineWidth = selected ? 2 : 1;
                ctx.stroke();

                // Icon
                ctx.font = '24px Arial';
                ctx.fillStyle = spec.color;
                ctx.fillText(spec.icon, sx + specW / 2, sy + 22);

                // Name
                ctx.font = 'bold 14px Arial';
                ctx.fillStyle = selected ? '#fff' : '#aaa';
                ctx.fillText(spec.name, sx + specW / 2, sy + 48);

                // Description
                ctx.font = '11px Arial';
                ctx.fillStyle = '#888';
                ctx.fillText(spec.desc, sx + specW / 2, sy + 66);

                // Unit list
                ctx.font = '10px Arial';
                ctx.fillStyle = '#666';
                const allUnits = [...spec.baseUnits, ...spec.specUnits, ...spec.factoryUnits];
                const names = allUnits.map(u => CFG.UNITS[u] ? CFG.UNITS[u].name : u).join(', ');
                ctx.fillText(names, sx + specW / 2, sy + 84);
            }

            ctx.fillStyle = '#888';
            ctx.font = '13px Arial';
            ctx.fillText('Вы — Игрок 1, остальные — ИИ (случайная специализация)', w / 2, 335);

            // Start
            this.drawBtn(ctx, w/2 - 130, 355, 260, 50, 'НАЧАТЬ ИГРУ', '#0f0', '#000', () => {
                Game.startGame(this.setupPlayers, this.setupSpec);
            });

            // Back
            this.drawBtn(ctx, w/2 - 80, 420, 160, 38, 'Назад', '#555', '#fff', () => { this.menuState = 'main'; });
        }
    },

    drawLeaderboard(ctx, w, h) {
        ctx.fillStyle = '#FFD740';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Таблица рейтинга', w / 2, 120);

        const scores = Game.loadScores();

        if (scores.length === 0) {
            ctx.fillStyle = '#666';
            ctx.font = '16px Arial';
            ctx.fillText('Пока нет результатов. Сыграйте партию!', w / 2, 180);
        } else {
            // Header
            const tx = w / 2 - 250;
            let ty = 150;
            ctx.fillStyle = '#888';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'left';
            ctx.fillText('#', tx, ty);
            ctx.fillText('Игрок', tx + 30, ty);
            ctx.fillText('Специализация', tx + 150, ty);
            ctx.fillText('Убийства', tx + 310, ty);
            ctx.fillText('Время', tx + 400, ty);
            ty += 20;

            for (let i = 0; i < scores.length; i++) {
                const s = scores[i];
                const specCfg = CFG.SPECS[s.spec];
                ctx.fillStyle = i === 0 ? '#FFD740' : i === 1 ? '#B0BEC5' : i === 2 ? '#A1887F' : '#888';
                ctx.font = '13px Arial';
                ctx.fillText((i + 1) + '.', tx, ty);
                ctx.fillText(s.name, tx + 30, ty);
                ctx.fillStyle = specCfg ? specCfg.color : '#888';
                ctx.fillText(specCfg ? specCfg.name : s.spec, tx + 150, ty);
                ctx.fillStyle = '#fff';
                ctx.fillText(s.kills, tx + 310, ty);
                const m = Math.floor(s.time / 60), sec = s.time % 60;
                ctx.fillText(m + ':' + (sec < 10 ? '0' : '') + sec, tx + 400, ty);
                ty += 22;
            }
        }

        ctx.textAlign = 'center';
        this.drawBtn(ctx, w/2 - 80, h - 80, 160, 40, 'Назад', '#555', '#fff', () => { this.menuState = 'main'; });
    },

    drawBtn(ctx, x, y, w, h, text, bg, fg, action) {
        this.buttons.push({ x, y, w, h, action });
        const hov = Utils.pointInRect(Input.mouse.x, Input.mouse.y, x, y, w, h);

        ctx.fillStyle = hov ? bg : bg;
        ctx.globalAlpha = hov ? 1 : 0.8;
        Utils.drawRoundRect(ctx, x, y, w, h, 6);
        ctx.fill();
        if (hov) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }
        ctx.globalAlpha = 1;

        ctx.fillStyle = fg;
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x + w / 2, y + h / 2);
    },

    // ==================
    // GAME HUD
    // ==================
    drawHUD(ctx, w, h, player) {
        this.buttons = [];
        this.drawTopBar(ctx, w, player);
        this.drawBottomPanel(ctx, w, h, player);

        if (this.message) {
            const mw = Math.min(400, w - 40);
            ctx.fillStyle = 'rgba(0,0,0,0.85)';
            Utils.drawRoundRect(ctx, w/2 - mw/2, h/2 - 22, mw, 44, 8);
            ctx.fill();
            ctx.strokeStyle = '#ff0';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = '#ff0';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.message, w / 2, h / 2);
        }

        if (player.buildMode) {
            const names = { barracks: 'Казармы', market: 'Рынок', tower: 'Башня' };
            const bmy = this.topBarHeight + 4;
            const bmw = Math.min(300, w - 20);
            ctx.fillStyle = 'rgba(0,80,0,0.85)';
            Utils.drawRoundRect(ctx, w/2 - bmw/2, bmy, bmw, 26, 6);
            ctx.fill();
            ctx.fillStyle = '#0f0';
            ctx.font = 'bold 13px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Строим: ' + (names[player.buildMode] || '') + (this.isMobile ? '' : '   (ESC — отмена)'), w / 2, bmy + 13);
        }

        Input.drawDragRect(ctx);
    },

    drawTopBar(ctx, w, player) {
        const h = this.topBarHeight;
        ctx.fillStyle = 'rgba(0,0,0,0.9)';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(0,200,100,0.4)';
        ctx.fillRect(0, h - 1, w, 1);

        const mob = this.isMobile;
        const fs = mob ? 11 : 14;
        ctx.font = 'bold ' + fs + 'px Arial';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';

        if (mob) {
            // Mobile: 2 rows
            const y1 = 13, y2 = 36;
            let px = 8;
            ctx.fillStyle = '#FFD740';
            ctx.fillText(Math.floor(player.money) + '₽', px, y1);
            px += 55;
            ctx.fillStyle = '#69F0AE';
            ctx.fillText('+' + player.getIncome(), px, y1);
            px += 40;
            ctx.fillStyle = '#FFB74D';
            ctx.fillText('Н:' + Math.floor(player.oil), px, y1);
            px += 40;
            ctx.fillStyle = '#B0BEC5';
            ctx.fillText('М:' + Math.floor(player.metal), px, y1);

            px = 8;
            ctx.fillStyle = '#4FC3F7';
            ctx.fillText(player.getCurrentPop() + '/' + player.getPopLimit(), px, y2);
            px += 50;
            const alive = Game.players.filter(p => p.alive).length;
            ctx.fillStyle = '#EF5350';
            ctx.fillText(alive + '/' + Game.players.length + ' жив', px, y2);

            // Spec icon
            const specCfg = CFG.SPECS[player.spec];
            if (specCfg) {
                ctx.textAlign = 'right';
                ctx.fillStyle = specCfg.color;
                ctx.fillText(specCfg.icon + ' ' + specCfg.name, w - 8, y1);
            }
        } else {
            // Desktop: 1 row
            let px = 15;
            ctx.fillStyle = '#FFD740';
            ctx.fillText(Math.floor(player.money) + '₽', px, h/2);
            px += 80;
            ctx.fillStyle = '#69F0AE';
            ctx.fillText('+' + player.getIncome() + '/5с', px, h/2);
            px += 80;
            ctx.fillStyle = '#FFB74D';
            ctx.fillText('Н:' + Math.floor(player.oil) + (player.getOilProduction() > 0 ? '(+' + player.getOilProduction() + ')' : ''), px, h/2);
            px += 90;
            ctx.fillStyle = '#B0BEC5';
            ctx.fillText('М:' + Math.floor(player.metal) + (player.getMetalProduction() > 0 ? '(+' + player.getMetalProduction() + ')' : ''), px, h/2);
            px += 100;
            ctx.fillStyle = '#4FC3F7';
            ctx.fillText(player.getCurrentPop() + '/' + player.getPopLimit(), px, h/2);

            const alive = Game.players.filter(p => p.alive).length;
            ctx.fillStyle = '#EF5350';
            ctx.textAlign = 'right';
            ctx.fillText(alive + '/' + Game.players.length, w - 15, h/2);
        }
    },

    drawBottomPanel(ctx, w, h, player) {
        const panelY = h - this.panelHeight;
        ctx.fillStyle = 'rgba(0,0,0,0.88)';
        ctx.fillRect(0, panelY, w, this.panelHeight);
        ctx.fillStyle = 'rgba(0,200,100,0.4)';
        ctx.fillRect(0, panelY, w, 2);

        const selectedUnits = player.units.filter(u => u.selected && !u.dead);
        const selectedBuilding = player.buildings.find(b => b.selected && !b.dead);
        const selectedDerrick = GameMap.oilDerricks.find(d => d.selected && d.owner === player.id);

        if (selectedDerrick) {
            this.drawDerrickPanel(ctx, w, panelY, player, selectedDerrick);
        } else if (selectedBuilding) {
            if (selectedBuilding.type === 'market') this.drawMarketPanel(ctx, w, panelY, player, selectedBuilding);
            else if (selectedBuilding.type === 'tower') this.drawTowerPanel(ctx, w, panelY, player, selectedBuilding);
            else this.drawBuildingPanel(ctx, w, panelY, player, selectedBuilding);
        } else if (selectedUnits.length > 0) {
            this.drawUnitsPanel(ctx, w, panelY, player, selectedUnits);
        } else {
            this.drawBuildPanel(ctx, w, panelY, player);
        }
    },

    // --- РЫНОК ---
    drawMarketPanel(ctx, w, panelY, player, building) {
        const px = 20, py = panelY + 12;

        ctx.fillStyle = '#FFB74D';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('🏪 Рынок', px, py);

        ctx.fillStyle = '#aaa';
        ctx.font = '13px Arial';
        ctx.fillText('Нефть: ' + Math.floor(player.oil) + '     Металл: ' + Math.floor(player.metal), px, py + 22);

        let btnX = 220;
        const oP = CFG.MARKET_PRICES.oil;
        const mP = CFG.MARKET_PRICES.metal;

        this.drawPanelBtn(ctx, btnX, panelY + 10, 110, 52,
            '🛢 Купить нефть', 'x' + oP.amount + ' за ' + oP.buyPrice + '₽',
            '#FFB74D', player.money >= oP.buyPrice, () => { player.marketBuy('oil'); });
        btnX += 116;

        this.drawPanelBtn(ctx, btnX, panelY + 10, 110, 52,
            '🛢 Продать нефть', 'x' + oP.amount + ' → ' + oP.sellPrice + '₽',
            '#FF8A65', player.oil >= oP.amount, () => { player.marketSell('oil'); });
        btnX += 116;

        this.drawPanelBtn(ctx, btnX, panelY + 10, 120, 52,
            '⚙ Купить металл', 'x' + mP.amount + ' за ' + mP.buyPrice + '₽',
            '#B0BEC5', player.money >= mP.buyPrice, () => { player.marketBuy('metal'); });
        btnX += 126;

        this.drawPanelBtn(ctx, btnX, panelY + 10, 120, 52,
            '⚙ Продать металл', 'x' + mP.amount + ' → ' + mP.sellPrice + '₽',
            '#90A4AE', player.metal >= mP.amount, () => { player.marketSell('metal'); });

        ctx.fillStyle = '#666';
        ctx.font = '11px Arial';
        ctx.fillText('Вышек: ' + GameMap.getPlayerDerrickCount(player.id) + '   Доход: +' + GameMap.getPlayerDerrickIncome(player.id) + '₽/5с', px, panelY + 75);
    },

    // --- ВЫШКА ---
    drawDerrickPanel(ctx, w, panelY, player, derrick) {
        const px = 20, py = panelY + 12;
        const stats = CFG.DERRICK_STATS[derrick.level - 1];

        ctx.fillStyle = '#FFB74D';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('⛽ ' + stats.name, px, py);

        // Текущий доход — крупно
        ctx.fillStyle = '#fff';
        ctx.font = '14px Arial';
        ctx.fillText('Доход:', px, py + 24);

        ctx.font = 'bold 14px Arial';
        ctx.fillStyle = '#FFD740';
        ctx.fillText('+' + stats.income + '₽', px + 60, py + 24);
        ctx.fillStyle = '#FFB74D';
        ctx.fillText('+' + stats.oil + ' нефти', px + 110, py + 24);
        ctx.fillStyle = '#B0BEC5';
        ctx.fillText('+' + stats.metal + ' металла', px + 200, py + 24);
        ctx.fillStyle = '#888';
        ctx.font = '12px Arial';
        ctx.fillText('каждые 5 сек', px + 310, py + 26);

        let btnX = 220;

        if (GameMap.canUpgradeDerrick(derrick)) {
            const cost = GameMap.getDerrickUpgradeCost(derrick);
            const next = CFG.DERRICK_STATS[derrick.level];

            // Показать что даст улучшение
            ctx.fillStyle = '#69F0AE';
            ctx.font = '13px Arial';
            ctx.fillText('После улучшения: +' + next.income + '₽  +' + next.oil + ' нефти  +' + next.metal + ' мет', px, py + 50);

            let costText = cost.money + '₽';
            if (cost.metal > 0) costText += '  ' + cost.metal + ' мет';
            if (cost.oil > 0) costText += '  ' + cost.oil + ' нефти';

            this.drawPanelBtn(ctx, w - 200, panelY + 10, 180, 58,
                '⬆ Улучшить до ' + next.name, costText,
                '#FFD740', player.canAfford(cost), () => { player.upgradeDerrick(derrick); });
        } else {
            ctx.fillStyle = '#69F0AE';
            ctx.font = 'bold 14px Arial';
            ctx.fillText('★ Максимальный уровень!', px, py + 50);
        }
    },

    // --- БАШНЯ ---
    drawTowerPanel(ctx, w, panelY, player, building) {
        const px = 20, py = panelY + 12;
        const stats = building.getTowerStats();

        ctx.fillStyle = '#EF5350';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('🗼 ' + building.getLevelName(), px, py);

        ctx.fillStyle = '#aaa';
        ctx.font = '13px Arial';
        ctx.fillText('HP: ' + Math.floor(building.hp) + '/' + building.maxHp + '     Урон: ' + stats.damage + '     Дальность: ' + stats.range + (stats.aoe ? '     Взрыв: ' + stats.aoe : ''), px, py + 22);

        if (building.canUpgrade()) {
            const cost = building.getUpgradeCost();
            const next = CFG.TOWER_STATS[building.level];
            let costText = cost.money + '₽';
            if (cost.metal > 0) costText += '  ' + cost.metal + ' мет';
            if (cost.oil > 0) costText += '  ' + cost.oil + ' нефти';

            ctx.fillStyle = '#69F0AE';
            ctx.font = '12px Arial';
            ctx.fillText('→ ' + next.name + ': урон ' + next.damage + ', дальн. ' + next.range + (next.aoe ? ', взрыв ' + next.aoe : ''), px, py + 44);

            this.drawPanelBtn(ctx, w - 200, panelY + 10, 180, 58,
                '⬆ Улучшить', costText,
                '#FFD740', player.canAfford(cost), () => { player.upgradeBuilding(building); });
        } else {
            ctx.fillStyle = '#69F0AE';
            ctx.font = 'bold 14px Arial';
            ctx.fillText('★ Максимальный уровень!', px, py + 44);
        }
    },

    // --- ЗДАНИЕ (база, казармы, завод) ---
    drawBuildingPanel(ctx, w, panelY, player, building) {
        const px = 20, py = panelY + 10;

        ctx.fillStyle = '#69F0AE';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(building.getLevelName(), px, py);

        ctx.fillStyle = '#aaa';
        ctx.font = '12px Arial';
        ctx.fillText('HP: ' + Math.floor(building.hp) + '/' + building.maxHp, px, py + 20);

        let btnX = 180;

        // Юниты
        const availableUnits = building.getAvailableUnits(player.spec);
        for (const unitType of availableUnits) {
            const def = CFG.UNITS[unitType];
            const cost = { money: def.cost, oil: def.oil || 0, metal: def.metal || 0 };
            const canAfford = player.canAfford(cost);
            const hasRoom = player.getCurrentPop() + def.pop <= player.getPopLimit();

            let costText = def.cost + '₽';
            if (def.metal > 0) costText += ' ' + def.metal + 'м';
            if (def.oil > 0) costText += ' ' + def.oil + 'н';

            this.drawPanelBtn(ctx, btnX, panelY + 8, 110, 55,
                def.name, costText + '  👥' + def.pop,
                def.color, canAfford && hasRoom, () => { player.trainUnit(unitType, building); });
            btnX += 116;
        }

        // Улучшение
        if (building.canUpgrade()) {
            const cost = building.getUpgradeCost();
            const costNum = typeof cost === 'number' ? cost : cost.money;
            const label = building.type === 'base' && building.level === 2 ? '⬆ Улучшить (+Завод!)' : '⬆ Улучшить';
            this.drawPanelBtn(ctx, btnX, panelY + 8, 130, 55,
                label, costNum + '₽',
                '#FFD740', player.canAfford(cost), () => { player.upgradeBuilding(building); });
        }

        // Очередь
        if (building.trainQueue.length > 0) {
            ctx.fillStyle = '#888';
            ctx.font = '11px Arial';
            ctx.fillText('Очередь: ' + building.trainQueue.map(t => CFG.UNITS[t].name).join(', '), px, panelY + 42);
            const def = CFG.UNITS[building.trainQueue[0]];
            const progress = building.trainProgress / def.trainTime;
            ctx.fillStyle = '#222';
            Utils.drawRoundRect(ctx, px, panelY + 56, 150, 8, 3);
            ctx.fill();
            ctx.fillStyle = '#69F0AE';
            Utils.drawRoundRect(ctx, px, panelY + 56, Math.floor(150 * progress), 8, 3);
            ctx.fill();
        }

        if (building.type === 'barracks') {
            ctx.fillStyle = '#4FC3F7';
            ctx.font = '11px Arial';
            ctx.fillText('Лимит населения: +' + building.getPopLimit(), px, panelY + 72);
        }
    },

    // --- ЮНИТЫ ---
    drawUnitsPanel(ctx, w, panelY, player, units) {
        const px = 20, py = panelY + 12;

        ctx.fillStyle = '#69F0AE';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('Выбрано: ' + units.length + ' юнит(ов)', px, py);

        const counts = {};
        let totalHp = 0, totalMaxHp = 0;
        for (const u of units) { counts[u.type] = (counts[u.type] || 0) + 1; totalHp += u.hp; totalMaxHp += u.maxHp; }

        let infoY = py + 22;
        ctx.font = '13px Arial';
        for (const [type, count] of Object.entries(counts)) {
            const def = CFG.UNITS[type];
            ctx.fillStyle = def.color;
            ctx.fillText(def.name + ': ' + count, px, infoY);
            infoY += 16;
        }
        ctx.fillStyle = '#888';
        ctx.fillText('Здоровье: ' + Math.floor(totalHp) + '/' + totalMaxHp, px, infoY);

        // Иконки юнитов
        let iconX = 250;
        for (const u of units.slice(0, 25)) {
            ctx.fillStyle = CFG.UNITS[u.type].color;
            ctx.beginPath();
            ctx.arc(iconX, panelY + 30, 5, 0, Math.PI * 2);
            ctx.fill();
            iconX += 12;
            if (iconX > w - 160) break;
        }
    },

    // --- МЕНЮ СТРОИТЕЛЬСТВА ---
    drawBuildPanel(ctx, w, panelY, player) {
        const mob = this.isMobile;
        const px = mob ? 6 : 20;
        const py = panelY + (mob ? 4 : 8);
        const bw = mob ? Math.floor((w - 20) / 4) : 110;
        const bh = mob ? 42 : 50;
        const gap = mob ? 4 : 6;
        const bc = CFG.BUILDING_COSTS;

        let btnX = px;
        const btnY = py + (mob ? 2 : 20);

        if (!mob) {
            ctx.fillStyle = '#888';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText('Строительство:', px, py);
        }

        this.drawPanelBtn(ctx, btnX, btnY, bw, bh,
            mob ? 'Казармы' : '🏘 Казармы [B]', bc.barracks.money + '₽',
            '#42A5F5', player.canAfford(bc.barracks), () => { player.buildMode = 'barracks'; });
        btnX += bw + gap;

        this.drawPanelBtn(ctx, btnX, btnY, bw, bh,
            mob ? 'Рынок' : '🏪 Рынок [M]', bc.market.money + '₽',
            '#FFB74D', player.canAfford(bc.market), () => { player.buildMode = 'market'; });
        btnX += bw + gap;

        this.drawPanelBtn(ctx, btnX, btnY, bw, bh,
            mob ? 'Башня' : '🗼 Башня [T]', bc.tower.money + '₽',
            '#EF5350', player.canAfford(bc.tower), () => { player.buildMode = 'tower'; });
        btnX += bw + gap;

        if (player.base && !player.base.dead && player.base.canUpgrade()) {
            const cost = player.base.getUpgradeCost();
            const costNum = typeof cost === 'number' ? cost : cost.money;
            const hint = mob ? 'Улучш.базу' : (player.base.level === 2 ? '⬆ База (+Завод!)' : '⬆ Улучшить');
            this.drawPanelBtn(ctx, btnX, btnY, bw, bh,
                hint, costNum + '₽',
                '#FFD740', player.canAfford(cost), () => { player.upgradeBuilding(player.base); });
        }

        // Info line
        const infoY = btnY + bh + 4;
        ctx.fillStyle = player.hasBuilding('factory') ? '#69F0AE' : '#666';
        ctx.font = (mob ? '9' : '11') + 'px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(player.hasBuilding('factory') ? '✔ Завод построен' : '🔒 Завод: база 3 ур.', px, infoY);

        if (!mob) {
            ctx.fillStyle = '#555';
            ctx.font = '11px Arial';
            ctx.fillText('A — все юниты    ESC — отмена    Shift+ЛКМ — добавить    ПКМ — приказ', px, panelY + 100);
        }
    },

    // Универсальная кнопка для панелей
    drawPanelBtn(ctx, x, y, w, h, line1, line2, color, enabled, action) {
        this.buttons.push({ x, y, w, h, action: enabled ? action : null });
        const hov = Utils.pointInRect(Input.mouse.x, Input.mouse.y, x, y, w, h);

        ctx.globalAlpha = enabled ? 1 : 0.35;

        // Фон кнопки
        ctx.fillStyle = hov && enabled ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)';
        Utils.drawRoundRect(ctx, x, y, w, h, 5);
        ctx.fill();

        // Рамка
        ctx.strokeStyle = color;
        ctx.lineWidth = hov && enabled ? 2 : 1;
        ctx.stroke();

        // Текст
        const mob = this.isMobile;
        ctx.fillStyle = enabled ? '#fff' : '#666';
        ctx.font = 'bold ' + (mob ? '10' : '12') + 'px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(line1, x + w / 2, y + h / 2 - (mob ? 6 : 8));

        ctx.font = (mob ? '9' : '11') + 'px Arial';
        ctx.fillStyle = enabled ? color : '#555';
        ctx.fillText(line2, x + w / 2, y + h / 2 + (mob ? 6 : 9));

        ctx.globalAlpha = 1;
    },

    // ==================
    // GAME OVER
    // ==================
    drawGameOver(ctx, w, h, winner) {
        this.buttons = [];
        ctx.fillStyle = 'rgba(0,0,0,0.92)';
        ctx.fillRect(0, 0, w, h);

        const isWin = winner && winner.isHuman;

        // Title
        ctx.fillStyle = isWin ? '#69F0AE' : '#EF5350';
        ctx.font = 'bold 42px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isWin ? 'ПОБЕДА!' : 'ПОРАЖЕНИЕ', w / 2, 50);

        if (winner) {
            ctx.fillStyle = '#fff';
            ctx.font = '18px Arial';
            ctx.fillText('Победитель: ' + winner.name + '   |   Время: ' + this.formatTime(Game.gameTime), w / 2, 82);
        }

        // Stats table
        const players = Game.players;
        const cols = players.length;
        const tableX = 40;
        const tableW = w - 80;
        const colW = tableW / (cols + 1);
        let ty = 115;
        const rowH = 22;

        // Header row
        ctx.fillStyle = '#555';
        ctx.fillRect(tableX, ty - 4, tableW, rowH + 4);
        ctx.fillStyle = '#aaa';
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Статистика', tableX + 8, ty + 10);
        ctx.textAlign = 'center';
        for (let i = 0; i < cols; i++) {
            const p = players[i];
            ctx.fillStyle = p.color;
            ctx.fillText(p.name + (p.alive ? '' : ' ✝'), tableX + colW * (i + 1) + colW / 2, ty + 10);
        }
        ty += rowH + 6;

        // Stat rows
        const rows = [
            { label: 'Юнитов произведено', key: 'unitsProduced' },
            { label: 'Юнитов потеряно', key: 'unitsLost' },
            { label: 'Убито пехоты', key: 'killsInfantry' },
            { label: 'Убито техники', key: 'killsVehicle' },
            { label: 'Зданий уничтожено', key: 'killsBuilding' },
            { label: 'Урон нанесён', key: 'damageDealt' },
            { label: 'Урон получен', key: 'damageReceived' },
            { label: 'Денег заработано', key: 'moneyEarned' },
            { label: 'Денег потрачено', key: 'moneySpent' },
            { label: 'Зданий построено', key: 'buildingsBuilt' },
            { label: 'Вышек захвачено', key: 'derricksOwned' },
            { label: 'Улучшений', key: 'upgradesDone' },
        ];

        for (let r = 0; r < rows.length; r++) {
            const row = rows[r];
            const even = r % 2 === 0;
            ctx.fillStyle = even ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0)';
            ctx.fillRect(tableX, ty - 2, tableW, rowH);

            ctx.fillStyle = '#888';
            ctx.font = '12px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(row.label, tableX + 8, ty + 11);

            // Find max for highlighting
            let maxVal = 0;
            for (const p of players) maxVal = Math.max(maxVal, p.stats[row.key]);

            ctx.textAlign = 'center';
            ctx.font = '13px Arial';
            for (let i = 0; i < cols; i++) {
                const val = players[i].stats[row.key];
                const isBest = val === maxVal && maxVal > 0;
                ctx.fillStyle = isBest ? '#FFD740' : '#ccc';
                if (isBest) ctx.font = 'bold 13px Arial';
                else ctx.font = '13px Arial';
                ctx.fillText(Math.floor(val), tableX + colW * (i + 1) + colW / 2, ty + 11);
            }
            ty += rowH;
        }

        // Separator
        ty += 8;
        ctx.fillStyle = '#333';
        ctx.fillRect(tableX, ty, tableW, 1);
        ty += 15;

        // Total kills row
        ctx.fillStyle = '#aaa';
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('ВСЕГО УБИЙСТВ', tableX + 8, ty + 4);
        ctx.textAlign = 'center';
        for (let i = 0; i < cols; i++) {
            const p = players[i];
            const total = p.stats.killsInfantry + p.stats.killsVehicle + p.stats.killsBuilding;
            ctx.fillStyle = p.color;
            ctx.fillText(total, tableX + colW * (i + 1) + colW / 2, ty + 4);
        }

        // Button
        this.drawBtn(ctx, w / 2 - 120, h - 70, 240, 50, 'В меню', '#0f0', '#000', () => {
            Game.state = 'menu';
            UI.menuState = 'main';
        });
    },

    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return m + ':' + (s < 10 ? '0' : '') + s;
    },
};
