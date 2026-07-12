// ============ CAMERA ============
const Cam = {
    x: 0, y: 0, w: 0, h: 0,
    shake: 0, sx: 0, sy: 0,

    init(w, h) { this.w = w; this.h = h; },

    follow(t) {
        this.x = t.x - this.w / 2;
        this.y = t.y - this.h / 2;
        this.x = U.clamp(this.x, 0, CFG.WORLD_W - this.w);
        this.y = U.clamp(this.y, 0, CFG.WORLD_H - this.h);
    },

    addShake(n) { this.shake = Math.max(this.shake, n); },

    update(dt) {
        if (this.shake > 0.3) {
            this.sx = (Math.random() - 0.5) * this.shake;
            this.sy = (Math.random() - 0.5) * this.shake;
            this.shake *= 0.88;
        } else { this.shake = 0; this.sx = 0; this.sy = 0; }
    },

    begin(ctx) { ctx.save(); ctx.translate(-this.x + this.sx, -this.y + this.sy); },
    end(ctx) { ctx.restore(); }
};
