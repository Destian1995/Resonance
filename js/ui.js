// ============ UI — BRIDGE CONTROLS ============
const UI = {
    buttons: [],
    engineStates: ['stop','slow','half','full','flank'],
    engineLabels: ['СТОП','М.ХОД','П.ХОД','П.ХОД','Ф.ХОД'],

    draw(ctx, cw, ch, panelY, radarSz) {
        this.buttons = [];
        const s = G.ship;
        const cx = radarSz + 30; // start after radar
        const pw = cw * .72 - cx - 10; // panel width
        const py = panelY + 8;
        const colW = pw / 3;
        const bh = 36, gap = 6;

        // ── COLUMN 1: Navigation ──
        const c1x = cx;
        this._label(ctx, c1x, py, 'НАВИГАЦИЯ');

        // Rudder buttons
        const rudY = py + 18;
        this._btn(ctx, c1x, rudY, colW * .3 - 2, bh, '◄ ЛЕВО', s.rudder === -1 ? '#4af' : '#2a3a4a', () => { s.rudder = s.rudder === -1 ? 0 : -1; });
        this._btn(ctx, c1x + colW * .33, rudY, colW * .33 - 2, bh, 'ПРЯМО', s.rudder === 0 ? '#4a4' : '#2a3a4a', () => { s.rudder = 0; });
        this._btn(ctx, c1x + colW * .67, rudY, colW * .3 - 2, bh, 'ПРАВО ►', s.rudder === 1 ? '#4af' : '#2a3a4a', () => { s.rudder = s.rudder === 1 ? 0 : 1; });

        // Engine telegraph
        const engY = rudY + bh + gap;
        this._label(ctx, c1x, engY, 'МАШИНЫ');
        const engBtnW = colW / 5 - 2;
        for (let i = 0; i < 5; i++) {
            const active = this.engineStates[i] === s.engines;
            const labels = ['СТОП', 'МАЛ', 'ПОЛ', 'ПОЛН', 'ФОРС'];
            const colors = ['#888', '#4a4', '#4a4', '#aa4', '#f44'];
            this._btn(ctx, c1x + i * (engBtnW + 2), engY + 14, engBtnW, bh, labels[i], active ? colors[i] : '#1a2a2a', () => { s.engines = this.engineStates[i]; });
        }

        // Speed & heading display
        const infoY = engY + bh + gap + 18;
        ctx.fillStyle = '#0a100a'; ctx.fillRect(c1x, infoY, colW - 4, 28);
        ctx.strokeStyle = '#2a3a2a'; ctx.lineWidth = 1; ctx.strokeRect(c1x, infoY, colW - 4, 28);
        ctx.fillStyle = '#4f8'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'left';
        ctx.fillText(`СКР: ${s.speed.toFixed(1)} уз  КУРС: ${((s.heading * 180 / Math.PI) % 360 + 360).toFixed(0)}°`, c1x + 6, infoY + 16);

        // ── COLUMN 2: Weapons ──
        const c2x = cx + colW + 8;
        this._label(ctx, c2x, py, 'ВООРУЖЕНИЕ');
        const wY = py + 18;

        // Torpedo
        const torpReady = s.torpedoes > 0;
        this._btn(ctx, c2x, wY, colW - 4, bh + 4, `🔱 ТОРПЕДА [${s.torpedoes}/${s.maxTorpedoes}]`, torpReady ? '#2a5a6a' : '#1a1a2a', () => G.fireTorpedo());
        if (s.torpReload > 0) {
            const pct = 1 - s.torpReload / 8;
            ctx.fillStyle = '#4af'; ctx.fillRect(c2x + 2, wY + bh + 2, (colW - 8) * pct, 3);
        }

        // Missile
        const mslY = wY + bh + gap + 8;
        const mslReady = s.missiles > 0;
        this._btn(ctx, c2x, mslY, colW - 4, bh + 4, `🚀 РАКЕТА [${s.missiles}/${s.maxMissiles}]`, mslReady ? '#5a3a2a' : '#1a1a2a', () => G.fireMissile());
        if (s.missileReload > 0) {
            const pct = 1 - s.missileReload / 15;
            ctx.fillStyle = '#f80'; ctx.fillRect(c2x + 2, mslY + bh + 2, (colW - 8) * pct, 3);
        }

        // Sonar
        const sonY = mslY + bh + gap + 8;
        const sonReady = s.sonarCd <= 0;
        this._btn(ctx, c2x, sonY, colW * .48, bh, `📡 СОНАР`, sonReady ? '#2a4a2a' : '#1a1a2a', () => G.activateSonar());

        // Flares
        this._btn(ctx, c2x + colW * .52, sonY, colW * .46, bh, `✨ ЛОВУШКИ [${s.flares}]`, s.flares > 0 ? '#4a4a2a' : '#1a1a2a', () => G.deployFlares());

        // ── COLUMN 3: Status ──
        const c3x = cx + colW * 2 + 16;
        this._label(ctx, c3x, py, 'СТАТУС');

        // Hull HP bar
        const hpY = py + 18;
        ctx.fillStyle = '#0a0a0a'; ctx.fillRect(c3x, hpY, colW - 20, 20);
        const hpRatio = s.hp / s.maxHp;
        ctx.fillStyle = hpRatio > .5 ? '#4a4' : hpRatio > .25 ? '#aa4' : '#f44';
        ctx.fillRect(c3x + 1, hpY + 1, (colW - 22) * hpRatio, 18);
        ctx.strokeStyle = '#3a3a3a'; ctx.strokeRect(c3x, hpY, colW - 20, 20);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
        ctx.fillText(`КОРПУС ${s.hp}%`, c3x + (colW - 20) / 2, hpY + 11);

        // Alert status
        const alertY = hpY + 28;
        const alertColors = ['#2a4a2a', '#8a8a2a', '#8a2a2a'];
        const alertTexts = ['ЗЕЛЁНЫЙ', 'ЖЁЛТЫЙ', 'КРАСНЫЙ'];
        ctx.fillStyle = alertColors[G.alertLevel];
        ctx.fillRect(c3x, alertY, colW - 20, 18);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 9px monospace';
        ctx.fillText(`⚠ ${alertTexts[G.alertLevel]}`, c3x + (colW - 20) / 2, alertY + 10);

        // Wave info
        const waveY = alertY + 26;
        ctx.fillStyle = '#8aa'; ctx.font = '10px monospace'; ctx.textAlign = 'left';
        ctx.fillText(`Волна: ${G.wave}/5`, c3x, waveY);
        ctx.fillText(`Цели: ${G.kills}/${G.killsNeeded}`, c3x, waveY + 14);
        ctx.fillText(`Торп. врага: ${G.enemyTorps.length}`, c3x, waveY + 28);
    },

    _label(ctx, x, y, text) {
        ctx.fillStyle = '#4a6a4a'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'left';
        ctx.fillText(text, x, y + 8);
        ctx.strokeStyle = '#2a3a2a'; ctx.lineWidth = .5;
        ctx.beginPath(); ctx.moveTo(x, y + 12); ctx.lineTo(x + 80, y + 12); ctx.stroke();
    },

    _btn(ctx, x, y, w, h, text, color, action) {
        // Button background
        const grd = ctx.createLinearGradient(x, y, x, y + h);
        grd.addColorStop(0, color); grd.addColorStop(1, this._darken(color));
        ctx.fillStyle = grd;
        ctx.fillRect(x, y, w, h);
        // Border
        ctx.strokeStyle = this._lighten(color); ctx.lineWidth = 1;
        ctx.strokeRect(x + .5, y + .5, w - 1, h - 1);
        // Bottom shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x, y + h - 2, w, 2);
        // Text
        ctx.fillStyle = '#ccc'; ctx.font = `bold ${h > 30 ? 10 : 8}px monospace`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(text, x + w / 2, y + h / 2);

        this.buttons.push({ x, y, w, h, action });
    },

    _lighten(c) {
        if (c[0] !== '#') return '#555';
        const r = Math.min(255, parseInt(c.slice(1, 3), 16) + 40);
        const g = Math.min(255, parseInt(c.slice(3, 5), 16) + 40);
        const b = Math.min(255, parseInt(c.slice(5, 7), 16) + 40);
        return `rgb(${r},${g},${b})`;
    },
    _darken(c) {
        if (c[0] !== '#') return '#111';
        const r = Math.max(0, parseInt(c.slice(1, 3), 16) - 30);
        const g = Math.max(0, parseInt(c.slice(3, 5), 16) - 30);
        const b = Math.max(0, parseInt(c.slice(5, 7), 16) - 30);
        return `rgb(${r},${g},${b})`;
    },

    handleClick(mx, my) {
        for (const b of this.buttons) {
            if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
                b.action();
                return;
            }
        }
    }
};
