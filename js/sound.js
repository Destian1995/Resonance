// ============ SOUND ============
const Snd = {
    ctx: null,
    init() { try { this.ctx = new (window.AudioContext||window.webkitAudioContext)(); } catch(e){} },
    resume() { if (this.ctx && this.ctx.state==='suspended') this.ctx.resume(); },
    play(type, vol) {
        if (!this.ctx) return;
        vol = vol || 0.2;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.connect(g); g.connect(this.ctx.destination);
        const n = this.ctx.currentTime;
        g.gain.setValueAtTime(vol, n);
        switch(type) {
            case 'hit':
                o.type='square'; o.frequency.setValueAtTime(300,n);
                o.frequency.exponentialRampToValueAtTime(80,n+.08);
                g.gain.exponentialRampToValueAtTime(.01,n+.08);
                o.start(n); o.stop(n+.08); break;
            case 'kill':
                o.type='sawtooth'; o.frequency.setValueAtTime(200,n);
                o.frequency.exponentialRampToValueAtTime(50,n+.12);
                g.gain.exponentialRampToValueAtTime(.01,n+.12);
                o.start(n); o.stop(n+.12); break;
            case 'lvl':
                o.type='sine'; o.frequency.setValueAtTime(500,n);
                o.frequency.linearRampToValueAtTime(1000,n+.15);
                o.frequency.linearRampToValueAtTime(1400,n+.3);
                g.gain.exponentialRampToValueAtTime(.01,n+.4);
                o.start(n); o.stop(n+.4); break;
            case 'gem':
                o.type='sine'; o.frequency.setValueAtTime(800,n);
                o.frequency.exponentialRampToValueAtTime(1200,n+.05);
                g.gain.setValueAtTime(.08,n);
                g.gain.exponentialRampToValueAtTime(.01,n+.05);
                o.start(n); o.stop(n+.05); break;
            case 'boom':
                o.type='sawtooth'; o.frequency.setValueAtTime(80,n);
                o.frequency.exponentialRampToValueAtTime(20,n+.3);
                g.gain.exponentialRampToValueAtTime(.01,n+.3);
                o.start(n); o.stop(n+.3); break;
            case 'boss':
                o.type='sawtooth'; o.frequency.setValueAtTime(60,n);
                o.frequency.linearRampToValueAtTime(120,n+.3);
                o.frequency.linearRampToValueAtTime(40,n+.6);
                g.gain.exponentialRampToValueAtTime(.01,n+.7);
                o.start(n); o.stop(n+.7); break;
            case 'death':
                o.type='sawtooth'; o.frequency.setValueAtTime(200,n);
                o.frequency.exponentialRampToValueAtTime(20,n+1);
                g.gain.exponentialRampToValueAtTime(.01,n+1);
                o.start(n); o.stop(n+1); break;
        }
    }
};
