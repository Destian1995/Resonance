// ============ UTILS ============
const U = {
    dist(a, b) { const dx = b.x - a.x, dy = b.y - a.y; return Math.sqrt(dx*dx+dy*dy); },
    dist2(x1,y1,x2,y2) { const dx=x2-x1, dy=y2-y1; return Math.sqrt(dx*dx+dy*dy); },
    angle(a, b) { return Math.atan2(b.y - a.y, b.x - a.x); },
    clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; },
    lerp(a, b, t) { return a + (b - a) * t; },
    rand(lo, hi) { return Math.random() * (hi - lo) + lo; },
    randInt(lo, hi) { return Math.floor(Math.random() * (hi - lo + 1)) + lo; },
    pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
    overlap(a, b) { return U.dist(a, b) < (a.r || a.radius) + (b.r || b.radius); },
    isMobile() {
        return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
            || ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    }
};
