// ============ UI — BRIDGE CONTROLS (adaptive) ============
const UI = {
    buttons: [],

    draw(ctx, cw, ch, panelY, radarSz) {
        this.buttons = [];
        const s = G.ship;
        const ph = ch - panelY - 4; // panel height available
        const bh = Math.min(32, ph * .14); // button height adaptive
        const gap = 4;
        const fontSize = Math.min(10, bh * .3) | 0;
        const labelSz = Math.min(9, bh * .25) | 0;

        // Columns: after radar | center | right (comms handled separately)
        const c1x = radarSz + 25;
        const availW = cw * .70 - c1x;
        const colW = availW / 2;
        const c2x = c1x + colW + 6;
        let y1 = panelY + 6;

        // ════════ COL 1: NAVIGATION ════════
        this._label(ctx, c1x, y1, 'НАВИГАЦИЯ', labelSz);
        y1 += labelSz + 6;

        // Rudder
        const rw = (colW - 8) / 3;
        this._btn(ctx, c1x, y1, rw, bh, '◄ ЛЕВО', s.rudder===-1?'#2266aa':'#1a2a3a', fontSize, ()=>{s.rudder=s.rudder===-1?0:-1;});
        this._btn(ctx, c1x+rw+2, y1, rw, bh, 'ПРЯМО', s.rudder===0?'#226622':'#1a2a3a', fontSize, ()=>{s.rudder=0;});
        this._btn(ctx, c1x+rw*2+4, y1, rw, bh, 'ПРАВО ►', s.rudder===1?'#2266aa':'#1a2a3a', fontSize, ()=>{s.rudder=s.rudder===1?0:1;});
        y1 += bh + gap;

        // Engine telegraph
        this._label(ctx, c1x, y1, 'МАШИНЫ', labelSz);
        y1 += labelSz + 4;
        const ew = (colW - 12) / 5;
        const eStates = ['stop','slow','half','full','flank'];
        const eLabels = ['СТОП','МАЛ','ПОЛ','ПОЛН','ФОРС'];
        const eColors = ['#444444','#226622','#226622','#666622','#662222'];
        for (let i = 0; i < 5; i++) {
            const active = eStates[i] === s.engines;
            this._btn(ctx, c1x + i * (ew + 2), y1, ew, bh, eLabels[i], active ? eColors[i] : '#141a22', fontSize - 1, () => { s.engines = eStates[i]; });
        }
        y1 += bh + gap;

        // Speed/heading readout
        ctx.fillStyle = '#0a100a'; ctx.fillRect(c1x, y1, colW - 4, bh - 4);
        ctx.strokeStyle = '#1a2a1a'; ctx.lineWidth = 1; ctx.strokeRect(c1x, y1, colW - 4, bh - 4);
        ctx.fillStyle = '#4f8'; ctx.font = `bold ${fontSize}px monospace`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        const hdg = ((s.heading * 180 / Math.PI) % 360 + 360).toFixed(0);
        ctx.fillText(`СКР ${s.speed.toFixed(1)}уз  КУРС ${hdg}°`, c1x + 6, y1 + (bh - 4) / 2);

        // ════════ COL 2: WEAPONS + STATUS ════════
        let y2 = panelY + 6;
        this._label(ctx, c2x, y2, 'ВООРУЖЕНИЕ', labelSz);
        y2 += labelSz + 6;

        // Torpedo button
        const tReady = s.torpedoes > 0;
        this._btn(ctx, c2x, y2, colW - 4, bh, `🔱 ТОРПЕДА [${s.torpedoes}/${s.maxTorpedoes}]`, tReady ? '#1a4a5a' : '#111418', fontSize, () => G.fireTorpedo());
        if (s.torpReload > 0) { ctx.fillStyle = '#4af'; ctx.fillRect(c2x + 2, y2 + bh - 3, (colW - 8) * (1 - s.torpReload / 8), 2); }
        y2 += bh + gap;

        // Missile button
        const mReady = s.missiles > 0;
        this._btn(ctx, c2x, y2, colW - 4, bh, `🚀 РАКЕТА [${s.missiles}/${s.maxMissiles}]`, mReady ? '#4a2a1a' : '#111418', fontSize, () => G.fireMissile());
        if (s.missileReload > 0) { ctx.fillStyle = '#f80'; ctx.fillRect(c2x + 2, y2 + bh - 3, (colW - 8) * (1 - s.missileReload / 15), 2); }
        y2 += bh + gap;

        // Sonar + Flares row
        const halfW = (colW - 8) / 2;
        this._btn(ctx, c2x, y2, halfW, bh, `📡 СОНАР`, s.sonarCd <= 0 ? '#1a3a1a' : '#111418', fontSize, () => G.activateSonar());
        this._btn(ctx, c2x + halfW + 4, y2, halfW, bh, `✨ ЛОВУШКИ [${s.flares}]`, s.flares > 0 ? '#3a3a1a' : '#111418', fontSize, () => G.deployFlares());
        y2 += bh + gap;

        // Status section
        this._label(ctx, c2x, y2, 'СТАТУС', labelSz);
        y2 += labelSz + 4;

        // HP bar
        const hpW = colW - 4;
        ctx.fillStyle = '#0a0a0a'; ctx.fillRect(c2x, y2, hpW, bh * .6);
        const hpR = s.hp / s.maxHp;
        ctx.fillStyle = hpR > .5 ? '#226622' : hpR > .25 ? '#666622' : '#662222';
        ctx.fillRect(c2x + 1, y2 + 1, (hpW - 2) * hpR, bh * .6 - 2);
        ctx.strokeStyle = '#333'; ctx.strokeRect(c2x, y2, hpW, bh * .6);
        ctx.fillStyle = '#ccc'; ctx.font = `bold ${fontSize - 1}px monospace`; ctx.textAlign = 'center';
        ctx.fillText(`КОРПУС ${s.hp}%`, c2x + hpW / 2, y2 + bh * .3);
        y2 += bh * .6 + gap;

        // Alert + wave info
        const alertColors = ['#1a3a1a', '#3a3a1a', '#3a1a1a'];
        const alertTexts = ['ЗЕЛЁНЫЙ', 'ЖЁЛТЫЙ', 'КРАСНЫЙ'];
        ctx.fillStyle = alertColors[G.alertLevel]; ctx.fillRect(c2x, y2, hpW * .48, bh * .55);
        ctx.fillStyle = '#ddd'; ctx.font = `bold ${fontSize - 1}px monospace`; ctx.textAlign = 'center';
        ctx.fillText(alertTexts[G.alertLevel], c2x + hpW * .24, y2 + bh * .27);

        ctx.fillStyle = '#6a8a6a'; ctx.textAlign = 'left'; ctx.font = `${fontSize - 1}px monospace`;
        ctx.fillText(`Волна ${G.wave}/5  Цели ${G.kills}/${G.killsNeeded}`, c2x + hpW * .52, y2 + bh * .27);
    },

    _label(ctx, x, y, text, sz) {
        ctx.fillStyle = '#3a5a3a'; ctx.font = `bold ${sz || 9}px monospace`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(text, x, y);
    },

    _btn(ctx, x, y, w, h, text, color, fontSize, action) {
        ctx.fillStyle = color; ctx.fillRect(x, y, w, h);
        // Top highlight
        ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(x, y, w, 1);
        // Bottom shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x, y + h - 1, w, 1);
        // Border
        ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = .5; ctx.strokeRect(x, y, w, h);
        // Text
        ctx.fillStyle = '#ccc'; ctx.font = `bold ${fontSize || 9}px monospace`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(text, x + w / 2, y + h / 2);

        this.buttons.push({ x, y, w, h, action });
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
