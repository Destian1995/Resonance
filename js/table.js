// ============ TABLE + BALLS ============
const TABLE_COLOR = '#1a6830';
const CUSHION_COLOR = '#2a4a2a';
const WOOD_COLOR = '#5a3a1a';
const FELT_MARKS = '#1a5828';

const Table = {
    x: 0, y: 0, w: 0, h: 0,
    cushion: 22,
    pocketR: 18,
    pockets: [],

    init(cw, ch) {
        // Table proportions: 2:1
        const maxW = cw * 0.88, maxH = ch * 0.7;
        if (maxW / 2 > maxH) {
            this.h = maxH;
            this.w = this.h * 2;
        } else {
            this.w = maxW;
            this.h = this.w / 2;
        }
        this.x = (cw - this.w) / 2;
        this.y = (ch - this.h) / 2;

        // 6 pockets
        const px = this.x, py = this.y, pw = this.w, ph = this.h;
        const pr = this.pocketR;
        const off = 4; // slight inset
        this.pockets = [
            { x: px + off, y: py + off, r: pr },              // top-left
            { x: px + pw / 2, y: py - 2, r: pr - 2 },        // top-center
            { x: px + pw - off, y: py + off, r: pr },         // top-right
            { x: px + off, y: py + ph - off, r: pr },         // bottom-left
            { x: px + pw / 2, y: py + ph + 2, r: pr - 2 },   // bottom-center
            { x: px + pw - off, y: py + ph - off, r: pr }     // bottom-right
        ];
    },

    draw(ctx) {
        const {x, y, w, h, cushion: c} = this;

        // Outer wood frame
        ctx.fillStyle = WOOD_COLOR;
        ctx.fillRect(x - 20, y - 20, w + 40, h + 40);
        // Wood grain
        ctx.fillStyle = '#4a2a10';
        for (let i = 0; i < 8; i++) {
            ctx.fillRect(x - 18, y - 18 + i * (h + 36) / 8, w + 36, 2);
        }
        // Inner wood edge
        ctx.fillStyle = '#6a4a2a';
        ctx.fillRect(x - 8, y - 8, w + 16, h + 16);

        // Green felt
        ctx.fillStyle = TABLE_COLOR;
        ctx.fillRect(x, y, w, h);

        // Felt texture (subtle marks)
        ctx.fillStyle = FELT_MARKS;
        ctx.globalAlpha = 0.1;
        for (let fy = 0; fy < h; fy += 12) {
            ctx.fillRect(x, y + fy, w, 1);
        }
        ctx.globalAlpha = 1;

        // Center line & spot
        ctx.strokeStyle = '#1a5a2a';
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(x + w * 0.25, y + c);
        ctx.lineTo(x + w * 0.25, y + h - c);
        ctx.stroke();
        ctx.setLineDash([]);
        // Head spot
        ctx.fillStyle = '#1a5a2a';
        ctx.beginPath();
        ctx.arc(x + w * 0.25, y + h / 2, 3, 0, Math.PI * 2);
        ctx.fill();
        // Foot spot
        ctx.beginPath();
        ctx.arc(x + w * 0.75, y + h / 2, 3, 0, Math.PI * 2);
        ctx.fill();

        // Cushions (darker green borders)
        ctx.fillStyle = CUSHION_COLOR;
        // Top cushion (split for middle pocket)
        ctx.fillRect(x + this.pocketR * 1.5, y, w / 2 - this.pocketR * 2.5, c);
        ctx.fillRect(x + w / 2 + this.pocketR, y, w / 2 - this.pocketR * 2.5, c);
        // Bottom
        ctx.fillRect(x + this.pocketR * 1.5, y + h - c, w / 2 - this.pocketR * 2.5, c);
        ctx.fillRect(x + w / 2 + this.pocketR, y + h - c, w / 2 - this.pocketR * 2.5, c);
        // Left
        ctx.fillRect(x, y + this.pocketR * 1.5, c, h - this.pocketR * 3);
        // Right
        ctx.fillRect(x + w - c, y + this.pocketR * 1.5, c, h - this.pocketR * 3);

        // Cushion highlights
        ctx.fillStyle = '#3a6a3a';
        ctx.fillRect(x + this.pocketR * 1.5, y, w / 2 - this.pocketR * 2.5, 2);
        ctx.fillRect(x + w / 2 + this.pocketR, y, w / 2 - this.pocketR * 2.5, 2);
        ctx.fillRect(x, y + this.pocketR * 1.5, 2, h - this.pocketR * 3);

        // Pockets (dark holes with shadow)
        for (const p of this.pockets) {
            // Shadow
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(p.x + 1, p.y + 1, p.r + 2, 0, Math.PI * 2); ctx.fill();
            // Pocket
            ctx.fillStyle = '#111';
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
            // Inner
            ctx.fillStyle = '#0a0a0a';
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.7, 0, Math.PI * 2); ctx.fill();
        }

        // Diamond sights on rails
        ctx.fillStyle = '#c8b080';
        const diamonds = [0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875];
        for (const d of diamonds) {
            // Top rail
            this._diamond(ctx, x + w * d, y - 10, 3);
            // Bottom rail
            this._diamond(ctx, x + w * d, y + h + 10, 3);
        }
        const vDiamonds = [0.25, 0.5, 0.75];
        for (const d of vDiamonds) {
            // Left rail
            this._diamond(ctx, x - 10, y + h * d, 3);
            // Right rail
            this._diamond(ctx, x + w + 10, y + h * d, 3);
        }
    },

    _diamond(ctx, x, y, s) {
        ctx.beginPath();
        ctx.moveTo(x, y - s); ctx.lineTo(x + s, y);
        ctx.lineTo(x, y + s); ctx.lineTo(x - s, y);
        ctx.closePath(); ctx.fill();
    }
};

// ── BALLS ──
const BALL_R = 10;
const BALL_COLORS = [
    null,        // 0 = cue (white)
    '#f2d426',   // 1 yellow (solid)
    '#2255cc',   // 2 blue
    '#cc2222',   // 3 red
    '#6622aa',   // 4 purple
    '#ee6600',   // 5 orange
    '#228844',   // 6 green
    '#882222',   // 7 maroon
    '#111111',   // 8 black
    '#f2d426',   // 9 yellow (stripe)
    '#2255cc',   // 10 blue
    '#cc2222',   // 11 red
    '#6622aa',   // 12 purple
    '#ee6600',   // 13 orange
    '#228844',   // 14 green
    '#882222'    // 15 maroon
];

function createBalls(table) {
    const balls = [];
    const cx = table.x + table.w * 0.75;
    const cy = table.y + table.h / 2;
    const d = BALL_R * 2.05; // spacing

    // Cue ball
    balls.push({ id: 0, x: table.x + table.w * 0.25, y: cy,
        vx: 0, vy: 0, r: BALL_R, active: true, pocketed: false,
        stripe: false, color: '#f0f0ee', spin: 0, sinkX:0, sinkY:0 });

    // Triangle rack (5 rows)
    const rack = [
        [1],
        [9, 2],
        [3, 8, 10],
        [11, 4, 12, 5],
        [6, 13, 14, 7, 15]
    ];
    for (let row = 0; row < rack.length; row++) {
        for (let col = 0; col < rack[row].length; col++) {
            const num = rack[row][col];
            const bx = cx + row * d * Math.sqrt(3) / 2;
            const by = cy + (col - (rack[row].length - 1) / 2) * d;
            balls.push({
                id: num, x: bx, y: by + (Math.random() - 0.5) * 0.5,
                vx: 0, vy: 0, r: BALL_R, active: true, pocketed: false,
                stripe: num > 8, color: BALL_COLORS[num], spin: 0,
                sinkX: 0, sinkY: 0
            });
        }
    }
    return balls;
}

function drawBall(ctx, b) {
    if (!b.active && !b.pocketed) return;
    if (b.pocketed) return; // don't draw pocketed

    const x = b.x | 0, y = b.y | 0;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(x + 2, y + 2, b.r, b.r * 0.7, 0, 0, Math.PI * 2); ctx.fill();

    // Ball body
    ctx.fillStyle = b.id === 0 ? '#f0f0ee' : b.stripe ? '#f0f0ee' : b.color;
    ctx.beginPath(); ctx.arc(x, y, b.r, 0, Math.PI * 2); ctx.fill();

    if (b.id > 0) {
        if (b.stripe) {
            // Stripe: white ball with colored band
            ctx.fillStyle = b.color;
            ctx.beginPath();
            ctx.arc(x, y, b.r, -0.8, 0.8); // top arc
            ctx.arc(x, y, b.r, Math.PI - 0.8, Math.PI + 0.8); // bottom arc
            ctx.fill();
        }
        // Number circle
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(x, y, b.r * 0.42, 0, Math.PI * 2); ctx.fill();
        // Number
        ctx.fillStyle = '#000';
        ctx.font = `bold ${b.r > 8 ? 9 : 7}px Arial`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(b.id, x, y + 0.5);
    }

    // Specular highlight
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath(); ctx.arc(x - b.r * 0.3, y - b.r * 0.3, b.r * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath(); ctx.arc(x - b.r * 0.15, y - b.r * 0.15, b.r * 0.5, 0, Math.PI * 2); ctx.fill();
}
