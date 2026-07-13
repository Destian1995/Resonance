// ============ SOUND ============
const Snd = {
    ctx: null,
    init() { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} },
    resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
    play(type, vol) {
        if (!this.ctx) return;
        vol = vol || 0.15;
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.connect(g); g.connect(this.ctx.destination);
        const n = this.ctx.currentTime;
        g.gain.setValueAtTime(vol, n);
        switch(type) {
            case 'hit': // ball-ball click
                o.type = 'sine'; o.frequency.setValueAtTime(800, n);
                o.frequency.exponentialRampToValueAtTime(200, n + 0.06);
                g.gain.exponentialRampToValueAtTime(0.01, n + 0.06);
                o.start(n); o.stop(n + 0.06); break;
            case 'wall': // cushion thud
                o.type = 'triangle'; o.frequency.setValueAtTime(150, n);
                o.frequency.exponentialRampToValueAtTime(50, n + 0.08);
                g.gain.exponentialRampToValueAtTime(0.01, n + 0.08);
                o.start(n); o.stop(n + 0.08); break;
            case 'pocket': // ball sinks
                o.type = 'sine'; o.frequency.setValueAtTime(400, n);
                o.frequency.exponentialRampToValueAtTime(100, n + 0.2);
                g.gain.exponentialRampToValueAtTime(0.01, n + 0.2);
                o.start(n); o.stop(n + 0.2); break;
            case 'cue': // cue strike
                o.type = 'square'; o.frequency.setValueAtTime(600, n);
                o.frequency.exponentialRampToValueAtTime(100, n + 0.04);
                g.gain.exponentialRampToValueAtTime(0.01, n + 0.04);
                o.start(n); o.stop(n + 0.04); break;
            case 'foul': // scratch
                o.type = 'sawtooth'; o.frequency.setValueAtTime(200, n);
                o.frequency.exponentialRampToValueAtTime(80, n + 0.3);
                g.gain.exponentialRampToValueAtTime(0.01, n + 0.3);
                o.start(n); o.stop(n + 0.3); break;
            case 'win':
                o.type = 'sine'; o.frequency.setValueAtTime(500, n);
                o.frequency.linearRampToValueAtTime(800, n + 0.15);
                o.frequency.linearRampToValueAtTime(1200, n + 0.3);
                g.gain.exponentialRampToValueAtTime(0.01, n + 0.5);
                o.start(n); o.stop(n + 0.5); break;
        }
    }
};
