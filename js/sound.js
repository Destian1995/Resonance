// ============ SOUND — naval ambience ============
const Snd = {
    ctx: null, masterGain: null,
    ambience: null, ambienceOn: false,

    init() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.3;
            this.masterGain.connect(this.ctx.destination);
        } catch(e) {}
    },
    resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },

    // Start ocean ambience loop (filtered noise)
    startAmbience() {
        if (!this.ctx || this.ambienceOn) return;
        this.ambienceOn = true;
        const bufSize = this.ctx.sampleRate * 2;
        const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);

        const src = this.ctx.createBufferSource();
        src.buffer = buf; src.loop = true;
        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 200;
        const gain = this.ctx.createGain();
        gain.gain.value = 0.06;
        src.connect(lp); lp.connect(gain); gain.connect(this.masterGain);
        src.start();
        this.ambience = { src, gain };
    },

    play(type, vol) {
        if (!this.ctx) return;
        vol = vol || 0.2;
        const n = this.ctx.currentTime;

        switch(type) {
            case 'sonar': this._sonarPing(n, vol); break;
            case 'torpedo': this._torpedoLaunch(n, vol); break;
            case 'missile': this._missileLaunch(n, vol); break;
            case 'hit': this._explosion(n, vol, 300, 0.12); break;
            case 'explosion': this._explosion(n, vol, 100, 0.4); break;
            case 'wall': this._thud(n, vol); break;
            case 'comms': this._commsBeep(n, vol); break;
            case 'alert': this._alertKlaxon(n, vol); break;
            case 'radar': this._radarTick(n, vol); break;
            case 'foul': this._alarmBuzz(n, vol); break;
            case 'win': this._victoryHorn(n, vol); break;
        }
    },

    _tone(freq, type, vol, start, dur) {
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = type; o.frequency.value = freq;
        g.gain.setValueAtTime(vol, start);
        o.connect(g); g.connect(this.masterGain);
        return { o, g, start, dur };
    },

    // Classic sonar ping — descending sine
    _sonarPing(n, vol) {
        const { o, g } = this._tone(1400, 'sine', vol * 0.4, n, 1.2);
        o.frequency.exponentialRampToValueAtTime(600, n + 0.15);
        o.frequency.setValueAtTime(600, n + 0.15);
        o.frequency.exponentialRampToValueAtTime(400, n + 1);
        g.gain.setValueAtTime(vol * 0.5, n);
        g.gain.linearRampToValueAtTime(vol * 0.3, n + 0.1);
        g.gain.exponentialRampToValueAtTime(0.001, n + 1.2);
        o.start(n); o.stop(n + 1.2);
    },

    // Torpedo launch — whoosh
    _torpedoLaunch(n, vol) {
        const { o, g } = this._tone(200, 'sawtooth', vol, n, 0.5);
        o.frequency.exponentialRampToValueAtTime(80, n + 0.3);
        g.gain.exponentialRampToValueAtTime(0.001, n + 0.5);
        o.start(n); o.stop(n + 0.5);
        // Splash
        const { o: o2, g: g2 } = this._tone(800, 'square', vol * 0.3, n + 0.05, 0.08);
        o2.frequency.exponentialRampToValueAtTime(200, n + 0.12);
        g2.gain.exponentialRampToValueAtTime(0.001, n + 0.12);
        o2.start(n + 0.05); o2.stop(n + 0.13);
    },

    // Missile launch — rising whoosh
    _missileLaunch(n, vol) {
        const { o, g } = this._tone(100, 'sawtooth', vol, n, 0.8);
        o.frequency.exponentialRampToValueAtTime(800, n + 0.4);
        o.frequency.exponentialRampToValueAtTime(2000, n + 0.7);
        g.gain.linearRampToValueAtTime(vol * 0.8, n + 0.3);
        g.gain.exponentialRampToValueAtTime(0.001, n + 0.8);
        o.start(n); o.stop(n + 0.8);
    },

    _explosion(n, vol, freq, dur) {
        const { o, g } = this._tone(freq || 100, 'sawtooth', vol, n, dur || 0.3);
        o.frequency.exponentialRampToValueAtTime(20, n + (dur || 0.3));
        g.gain.exponentialRampToValueAtTime(0.001, n + (dur || 0.3));
        o.start(n); o.stop(n + (dur || 0.3));
    },

    _thud(n, vol) {
        const { o, g } = this._tone(60, 'sine', vol * 0.5, n, 0.15);
        g.gain.exponentialRampToValueAtTime(0.001, n + 0.15);
        o.start(n); o.stop(n + 0.15);
    },

    // Radio comms static beep
    _commsBeep(n, vol) {
        // Static burst
        const bufSz = this.ctx.sampleRate * 0.08;
        const buf = this.ctx.createBuffer(1, bufSz, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < bufSz; i++) d[i] = (Math.random() * 2 - 1) * 0.3;
        const src = this.ctx.createBufferSource();
        src.buffer = buf;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(vol * 0.4, n);
        g.gain.exponentialRampToValueAtTime(0.001, n + 0.08);
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass'; bp.frequency.value = 2000; bp.Q.value = 5;
        src.connect(bp); bp.connect(g); g.connect(this.masterGain);
        src.start(n); src.stop(n + 0.08);

        // Two-tone beep
        const { o, g: g2 } = this._tone(800, 'sine', vol * 0.15, n + 0.1, 0.15);
        g2.gain.exponentialRampToValueAtTime(0.001, n + 0.25);
        o.start(n + 0.1); o.stop(n + 0.25);
        const { o: o2, g: g3 } = this._tone(1000, 'sine', vol * 0.12, n + 0.28, 0.1);
        g3.gain.exponentialRampToValueAtTime(0.001, n + 0.38);
        o2.start(n + 0.28); o2.stop(n + 0.38);
    },

    // Alert klaxon
    _alertKlaxon(n, vol) {
        for (let i = 0; i < 3; i++) {
            const t = n + i * 0.4;
            const { o, g } = this._tone(440, 'square', vol * 0.2, t, 0.2);
            o.frequency.setValueAtTime(440, t);
            o.frequency.setValueAtTime(380, t + 0.1);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
            o.start(t); o.stop(t + 0.2);
        }
    },

    // Radar tick (each sweep)
    _radarTick(n, vol) {
        const { o, g } = this._tone(3000, 'sine', vol * 0.05, n, 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, n + 0.02);
        o.start(n); o.stop(n + 0.02);
    },

    _alarmBuzz(n, vol) {
        const { o, g } = this._tone(200, 'square', vol * 0.3, n, 0.4);
        o.frequency.setValueAtTime(200, n);
        o.frequency.setValueAtTime(150, n + 0.2);
        g.gain.exponentialRampToValueAtTime(0.001, n + 0.4);
        o.start(n); o.stop(n + 0.4);
    },

    _victoryHorn(n, vol) {
        for (let i = 0; i < 3; i++) {
            const t = n + i * 0.5;
            const freq = [262, 330, 392][i]; // C E G
            const { o, g } = this._tone(freq, 'sine', vol * 0.3, t, 0.45);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
            o.start(t); o.stop(t + 0.45);
        }
    }
};
