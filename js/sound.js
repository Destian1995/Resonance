// ============================================
// Sound — procedural audio via Web Audio API
// ============================================

const Sound = {
    ctx: null,
    enabled: true,
    masterVol: 0.3,
    ambientNode: null,

    init() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            this.enabled = false;
        }
    },

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },

    play(type) {
        if (!this.enabled || !this.ctx) return;
        this.resume();
        switch (type) {
            case 'shoot': this.playShoot(); break;
            case 'explosion': this.playExplosion(); break;
            case 'bigExplosion': this.playBigExplosion(); break;
            case 'build': this.playBuild(); break;
            case 'upgrade': this.playUpgrade(); break;
            case 'click': this.playClick(); break;
            case 'alert': this.playAlert(); break;
            case 'salvo': this.playSalvo(); break;
        }
    },

    // --- Noise generator ---
    noise(duration, vol = 0.1, freq = 0) {
        const c = this.ctx;
        const len = c.sampleRate * duration;
        const buf = c.createBuffer(1, len, c.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) {
            data[i] = (Math.random() * 2 - 1) * vol;
        }
        const src = c.createBufferSource();
        src.buffer = buf;
        return src;
    },

    // --- Effects ---
    playShoot() {
        const c = this.ctx;
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, c.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, c.currentTime + 0.08);
        gain.gain.setValueAtTime(this.masterVol * 0.3, c.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1);
        osc.connect(gain).connect(c.destination);
        osc.start(); osc.stop(c.currentTime + 0.1);
    },

    playExplosion() {
        const c = this.ctx;
        const n = this.noise(0.3, 0.5);
        const gain = c.createGain();
        const filter = c.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, c.currentTime);
        filter.frequency.exponentialRampToValueAtTime(100, c.currentTime + 0.3);
        gain.gain.setValueAtTime(this.masterVol * 0.4, c.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
        n.connect(filter).connect(gain).connect(c.destination);
        n.start(); n.stop(c.currentTime + 0.3);
    },

    playBigExplosion() {
        const c = this.ctx;
        // Low boom
        const osc = c.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(80, c.currentTime);
        osc.frequency.exponentialRampToValueAtTime(20, c.currentTime + 0.5);
        const gain1 = c.createGain();
        gain1.gain.setValueAtTime(this.masterVol * 0.5, c.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5);
        osc.connect(gain1).connect(c.destination);
        osc.start(); osc.stop(c.currentTime + 0.5);
        // Noise layer
        const n = this.noise(0.4, 0.6);
        const gain2 = c.createGain();
        const filter = c.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, c.currentTime);
        filter.frequency.exponentialRampToValueAtTime(50, c.currentTime + 0.4);
        gain2.gain.setValueAtTime(this.masterVol * 0.5, c.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4);
        n.connect(filter).connect(gain2).connect(c.destination);
        n.start(); n.stop(c.currentTime + 0.4);
    },

    playBuild() {
        const c = this.ctx;
        for (let i = 0; i < 3; i++) {
            const osc = c.createOscillator();
            const gain = c.createGain();
            osc.type = 'triangle';
            const t = c.currentTime + i * 0.08;
            osc.frequency.setValueAtTime(300 + i * 200, t);
            gain.gain.setValueAtTime(this.masterVol * 0.2, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
            osc.connect(gain).connect(c.destination);
            osc.start(t); osc.stop(t + 0.08);
        }
    },

    playUpgrade() {
        const c = this.ctx;
        const notes = [400, 500, 600, 800];
        for (let i = 0; i < notes.length; i++) {
            const osc = c.createOscillator();
            const gain = c.createGain();
            osc.type = 'sine';
            const t = c.currentTime + i * 0.1;
            osc.frequency.setValueAtTime(notes[i], t);
            gain.gain.setValueAtTime(this.masterVol * 0.25, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
            osc.connect(gain).connect(c.destination);
            osc.start(t); osc.stop(t + 0.15);
        }
    },

    playClick() {
        const c = this.ctx;
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, c.currentTime);
        gain.gain.setValueAtTime(this.masterVol * 0.15, c.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.05);
        osc.connect(gain).connect(c.destination);
        osc.start(); osc.stop(c.currentTime + 0.05);
    },

    playAlert() {
        const c = this.ctx;
        for (let i = 0; i < 3; i++) {
            const osc = c.createOscillator();
            const gain = c.createGain();
            osc.type = 'square';
            const t = c.currentTime + i * 0.15;
            osc.frequency.setValueAtTime(i % 2 ? 800 : 600, t);
            gain.gain.setValueAtTime(this.masterVol * 0.2, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
            osc.connect(gain).connect(c.destination);
            osc.start(t); osc.stop(t + 0.12);
        }
    },

    playSalvo() {
        const c = this.ctx;
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                if (!this.ctx) return;
                const n = this.noise(0.15, 0.4);
                const gain = c.createGain();
                gain.gain.setValueAtTime(this.masterVol * 0.25, c.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
                n.connect(gain).connect(c.destination);
                n.start(); n.stop(c.currentTime + 0.15);
            }, i * 80);
        }
    },

    // --- Ambient drone ---
    startAmbient() {
        if (!this.enabled || !this.ctx || this.ambientNode) return;
        const c = this.ctx;
        this.resume();
        const osc = c.createOscillator();
        const gain = c.createGain();
        const filter = c.createBiquadFilter();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(40, c.currentTime);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(80, c.currentTime);
        gain.gain.setValueAtTime(this.masterVol * 0.06, c.currentTime);
        osc.connect(filter).connect(gain).connect(c.destination);
        osc.start();
        this.ambientNode = { osc, gain };
    },

    stopAmbient() {
        if (this.ambientNode) {
            this.ambientNode.osc.stop();
            this.ambientNode = null;
        }
    },
};
