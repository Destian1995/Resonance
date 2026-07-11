// ============================================
// Camera / Viewport — adapted for small map
// ============================================

const Camera = {
    x: 0,
    y: 0,
    zoom: 1.5,
    targetX: 0,
    targetY: 0,
    screenW: 0,
    screenH: 0,
    shakeAmount: 0,
    shakeX: 0,
    shakeY: 0,
    viewOffsetY: 0,  // top bar offset
    viewH: 0,        // game viewport height

    init(sx, sy) {
        this.screenW = sx;
        this.screenH = sy;
        this.zoom = CFG.DEFAULT_ZOOM;
    },

    resize(w, h) {
        this.screenW = w;
        this.screenH = h;
    },

    centerOn(wx, wy) {
        this.targetX = wx - this.screenW / (2 * this.zoom);
        const vh = this.viewH > 0 ? this.viewH : this.screenH;
        this.targetY = wy - vh / (2 * this.zoom);
    },

    update(dt) {
        this.x = Utils.lerp(this.x, this.targetX, 0.15);
        this.y = Utils.lerp(this.y, this.targetY, 0.15);

        const vh = this.viewH > 0 ? this.viewH : this.screenH;
        const maxX = CFG.MAP_W - this.screenW / this.zoom;
        const maxY = CFG.MAP_H - vh / this.zoom;
        this.x = Utils.clamp(this.x, Math.min(0, maxX), Math.max(0, maxX));
        this.y = Utils.clamp(this.y, Math.min(0, maxY), Math.max(0, maxY));

        if (this.shakeAmount > 0) {
            this.shakeX = Utils.rand(-this.shakeAmount, this.shakeAmount);
            this.shakeY = Utils.rand(-this.shakeAmount, this.shakeAmount);
            this.shakeAmount *= 0.88;
            if (this.shakeAmount < 0.3) this.shakeAmount = 0;
        } else {
            this.shakeX = 0;
            this.shakeY = 0;
        }
    },

    shake(amount) {
        this.shakeAmount = Math.max(this.shakeAmount, amount);
    },

    applyTransform(ctx) {
        ctx.setTransform(this.zoom, 0, 0, this.zoom,
            -this.x * this.zoom + this.shakeX,
            -this.y * this.zoom + this.shakeY + this.viewOffsetY);
    },

    resetTransform(ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    },

    screenToWorld(sx, sy) {
        return {
            x: sx / this.zoom + this.x,
            y: (sy - this.viewOffsetY) / this.zoom + this.y,
        };
    },

    worldToScreen(wx, wy) {
        return {
            x: (wx - this.x) * this.zoom,
            y: (wy - this.y) * this.zoom + this.viewOffsetY,
        };
    },

    isVisible(wx, wy, margin = 50) {
        const sx = (wx - this.x) * this.zoom;
        const sy = (wy - this.y) * this.zoom;
        return sx > -margin && sx < this.screenW + margin &&
               sy > -margin && sy < this.screenH + margin;
    },

    moveBy(dx, dy) {
        this.targetX += dx / this.zoom;
        this.targetY += dy / this.zoom;
    },

    zoomAt(sx, sy, delta) {
        const oldZoom = this.zoom;
        this.zoom = Utils.clamp(this.zoom + delta * CFG.ZOOM_STEP, CFG.ZOOM_MIN, CFG.ZOOM_MAX);
        const wx = sx / oldZoom + this.x;
        const wy = sy / oldZoom + this.y;
        this.targetX = wx - sx / this.zoom;
        this.targetY = wy - sy / this.zoom;
        this.x = this.targetX;
        this.y = this.targetY;
    },
};
