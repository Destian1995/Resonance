// ============ SOUND — naval ambience + submarine ============
const Snd = {
    ctx: null, masterGain: null,
    ambienceOn: false, subAmbienceOn: false,
    subNodes: null, // {src, lp, gain} for sub drone
    hullCreakTimer: 0,
    sonarLoopTimer: 0,

    init() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.3;
            this.masterGain.connect(this.ctx.destination);
        } catch(e) {}
    },
    resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },

    // Surface ocean ambience (filtered noise)
    startAmbience() {
        if (!this.ctx || this.ambienceOn) return;
        this.ambienceOn = true;
        this._makeNoise(200, 0.05);
    },

    // Submarine ambient drone — deep rumble + machinery hum
    startSubAmbience() {
        if (!this.ctx || this.subAmbienceOn) return;
        this.subAmbienceOn = true;

        // Deep pressure drone (very low frequency)
        const o1 = this.ctx.createOscillator();
        const g1 = this.ctx.createGain();
        o1.type = 'sine'; o1.frequency.value = 28;
        g1.gain.value = 0.04;
        o1.connect(g1); g1.connect(this.masterGain);
        o1.start();

        // Second harmonic wobble
        const o2 = this.ctx.createOscillator();
        const g2 = this.ctx.createGain();
        o2.type = 'sine'; o2.frequency.value = 42;
        g2.gain.value = 0.025;
        // LFO on the second oscillator for wobble
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.type = 'sine'; lfo.frequency.value = 0.3;
        lfoGain.gain.value = 3;
        lfo.connect(lfoGain); lfoGain.connect(o2.frequency);
        lfo.start();
        o2.connect(g2); g2.connect(this.masterGain);
        o2.start();

        // Machinery hum (filtered noise — engine room)
        this._makeNoise(120, 0.03);
        // Water flow noise (higher filtered)
        this._makeNoise(400, 0.02);

        this.subNodes = { o1, g1, o2, g2, lfo };
    },

    // Update depth-dependent sounds (call every frame)
    updateSubSounds(dt, depth) {
        if (!this.ctx || !this.subAmbienceOn || !this.subNodes) return;
        // Deeper = louder drone, lower pitch
        const deepFactor = Math.min(1, depth / 2);
        this.subNodes.g1.gain.value = 0.03 + deepFactor * 0.04;
        this.subNodes.o1.frequency.value = 28 - deepFactor * 8;
        this.subNodes.g2.gain.value = 0.02 + deepFactor * 0.02;

        // Random hull creaks at depth
        this.hullCreakTimer -= dt;
        if (this.hullCreakTimer <= 0 && deepFactor > 0.3) {
            this.hullCreakTimer = 3 + Math.random() * 8;
            this._hullCreak(deepFactor);
        }

        // Passive sonar pings (background)
        this.sonarLoopTimer -= dt;
        if (this.sonarLoopTimer <= 0) {
            this.sonarLoopTimer = 4 + Math.random() * 6;
            this._passiveSonar(deepFactor);
        }
    },

    _makeNoise(freq, vol) {
        const bufSize = this.ctx.sampleRate * 2;
        const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
        const src = this.ctx.createBufferSource();
        src.buffer = buf; src.loop = true;
        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = freq;
        const gain = this.ctx.createGain();
        gain.gain.value = vol;
        src.connect(lp); lp.connect(gain); gain.connect(this.masterGain);
        src.start();
    },

    // Hull creak — metallic stress sound
    _hullCreak(deepFactor) {
        const n = this.ctx.currentTime;
        const freq = 80 + Math.random() * 120;
        const {o, g} = this._tone(freq, 'triangle', 0.06 + deepFactor * 0.04, n, 0.6);
        o.frequency.exponentialRampToValueAtTime(freq * 0.7, n + 0.3);
        o.frequency.exponentialRampToValueAtTime(freq * 0.5, n + 0.6);
        g.gain.setValueAtTime(0.001, n);
        g.gain.linearRampToValueAtTime(0.06 + deepFactor * 0.04, n + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, n + 0.6);
        o.start(n); o.stop(n + 0.6);

        // Metal ping
        const {o: o2, g: g2} = this._tone(800 + Math.random() * 400, 'sine', 0.02, n + 0.05, 0.15);
        g2.gain.exponentialRampToValueAtTime(0.001, n + 0.2);
        o2.start(n + 0.05); o2.stop(n + 0.2);
    },

    // Passive sonar — distant ping echo
    _passiveSonar(deepFactor) {
        const n = this.ctx.currentTime;
        const delay = Math.random() * 0.5;
        const freq = 600 + Math.random() * 300;
        const {o, g} = this._tone(freq, 'sine', 0.015 + deepFactor * 0.01, n + delay, 1.5);
        o.frequency.exponentialRampToValueAtTime(freq * 0.6, n + delay + 0.8);
        g.gain.setValueAtTime(0.001, n + delay);
        g.gain.linearRampToValueAtTime(0.015, n + delay + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, n + delay + 1.5);
        o.start(n + delay); o.stop(n + delay + 1.5);
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
            case 'dive': this._diveAlarm(n, vol); break;
            case 'surface': this._surfaceBlast(n, vol); break;
            case 'bubble': this._bubbles(n, vol); break;
        }
    },

    _tone(freq, type, vol, start, dur) {
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = type; o.frequency.value = freq;
        g.gain.setValueAtTime(vol, start);
        o.connect(g); g.connect(this.masterGain);
        return { o, g };
    },

    // ── Active sonar — movie-style ping with reverb ──
    _sonarPing(n, vol) {
        // Main ping
        const {o, g} = this._tone(1400, 'sine', vol * 0.5, n, 2);
        o.frequency.exponentialRampToValueAtTime(600, n + 0.12);
        o.frequency.setValueAtTime(600, n + 0.12);
        o.frequency.exponentialRampToValueAtTime(350, n + 1.5);
        g.gain.setValueAtTime(vol * 0.6, n);
        g.gain.linearRampToValueAtTime(vol * 0.35, n + 0.1);
        g.gain.exponentialRampToValueAtTime(0.001, n + 2);
        o.start(n); o.stop(n + 2);

        // Echo (delayed, quieter)
        const {o: o2, g: g2} = this._tone(550, 'sine', vol * 0.12, n + 0.6, 1.2);
        o2.frequency.exponentialRampToValueAtTime(300, n + 1.5);
        g2.gain.setValueAtTime(0.001, n + 0.6);
        g2.gain.linearRampToValueAtTime(vol * 0.12, n + 0.65);
        g2.gain.exponentialRampToValueAtTime(0.001, n + 1.8);
        o2.start(n + 0.6); o2.stop(n + 1.8);

        // Second echo
        const {o: o3, g: g3} = this._tone(400, 'sine', vol * 0.04, n + 1.2, 0.8);
        g3.gain.setValueAtTime(0.001, n + 1.2);
        g3.gain.linearRampToValueAtTime(vol * 0.04, n + 1.25);
        g3.gain.exponentialRampToValueAtTime(0.001, n + 2);
        o3.start(n + 1.2); o3.stop(n + 2);
    },

    // Torpedo underwater launch — thud + hiss
    _torpedoLaunch(n, vol) {
        // Tube thud
        const {o, g} = this._tone(80, 'sine', vol * 0.5, n, 0.15);
        g.gain.exponentialRampToValueAtTime(0.001, n + 0.15);
        o.start(n); o.stop(n + 0.15);
        // Compressed air hiss
        const bufSz = this.ctx.sampleRate * 0.4;
        const buf = this.ctx.createBuffer(1, bufSz, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < bufSz; i++) d[i] = (Math.random() * 2 - 1);
        const src = this.ctx.createBufferSource(); src.buffer = buf;
        const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2000;
        const gn = this.ctx.createGain();
        gn.gain.setValueAtTime(vol * 0.25, n + 0.05);
        gn.gain.exponentialRampToValueAtTime(0.001, n + 0.4);
        src.connect(hp); hp.connect(gn); gn.connect(this.masterGain);
        src.start(n + 0.05); src.stop(n + 0.45);
        // Propeller whine departing
        const {o: o2, g: g2} = this._tone(200, 'sawtooth', vol * 0.1, n + 0.1, 0.8);
        o2.frequency.exponentialRampToValueAtTime(400, n + 0.5);
        o2.frequency.exponentialRampToValueAtTime(800, n + 0.9);
        g2.gain.exponentialRampToValueAtTime(0.001, n + 0.9);
        o2.start(n + 0.1); o2.stop(n + 0.9);
    },

    _missileLaunch(n, vol) {
        const {o, g} = this._tone(100, 'sawtooth', vol, n, 0.8);
        o.frequency.exponentialRampToValueAtTime(800, n + 0.4);
        o.frequency.exponentialRampToValueAtTime(2000, n + 0.7);
        g.gain.linearRampToValueAtTime(vol * 0.8, n + 0.3);
        g.gain.exponentialRampToValueAtTime(0.001, n + 0.8);
        o.start(n); o.stop(n + 0.8);
    },

    _explosion(n, vol, freq, dur) {
        // Low boom
        const {o, g} = this._tone(freq || 100, 'sawtooth', vol, n, dur || 0.3);
        o.frequency.exponentialRampToValueAtTime(20, n + (dur || 0.3));
        g.gain.exponentialRampToValueAtTime(0.001, n + (dur || 0.3));
        o.start(n); o.stop(n + (dur || 0.3));
        // Underwater: muffled thud echo
        if (G.shipType === 'sub') {
            const {o: o2, g: g2} = this._tone(40, 'sine', vol * 0.3, n + 0.15, 0.5);
            g2.gain.exponentialRampToValueAtTime(0.001, n + 0.65);
            o2.start(n + 0.15); o2.stop(n + 0.65);
        }
    },

    _thud(n, vol) {
        const {o, g} = this._tone(50, 'sine', vol * 0.5, n, 0.2);
        g.gain.exponentialRampToValueAtTime(0.001, n + 0.2);
        o.start(n); o.stop(n + 0.2);
    },

    _commsBeep(n, vol) {
        // Static crackle
        const bufSz = this.ctx.sampleRate * 0.08;
        const buf = this.ctx.createBuffer(1, bufSz, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < bufSz; i++) d[i] = (Math.random() * 2 - 1) * 0.3;
        const src = this.ctx.createBufferSource(); src.buffer = buf;
        const gn = this.ctx.createGain();
        gn.gain.setValueAtTime(vol * 0.35, n);
        gn.gain.exponentialRampToValueAtTime(0.001, n + 0.08);
        const bp = this.ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2000; bp.Q.value = 5;
        src.connect(bp); bp.connect(gn); gn.connect(this.masterGain);
        src.start(n); src.stop(n + 0.08);
        // Two-tone
        const {o, g} = this._tone(800, 'sine', vol * 0.12, n + 0.1, 0.12);
        g.gain.exponentialRampToValueAtTime(0.001, n + 0.22);
        o.start(n + 0.1); o.stop(n + 0.22);
        const {o: o2, g: g2} = this._tone(1000, 'sine', vol * 0.1, n + 0.25, 0.08);
        g2.gain.exponentialRampToValueAtTime(0.001, n + 0.33);
        o2.start(n + 0.25); o2.stop(n + 0.33);
    },

    _alertKlaxon(n, vol) {
        for (let i = 0; i < 3; i++) {
            const t = n + i * 0.4;
            const {o, g} = this._tone(440, 'square', vol * 0.18, t, 0.2);
            o.frequency.setValueAtTime(440, t);
            o.frequency.setValueAtTime(380, t + 0.1);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
            o.start(t); o.stop(t + 0.2);
        }
    },

    _radarTick(n, vol) {
        const {o, g} = this._tone(3000, 'sine', vol * 0.04, n, 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, n + 0.02);
        o.start(n); o.stop(n + 0.02);
    },

    _alarmBuzz(n, vol) {
        const {o, g} = this._tone(200, 'square', vol * 0.25, n, 0.4);
        o.frequency.setValueAtTime(200, n);
        o.frequency.setValueAtTime(150, n + 0.2);
        g.gain.exponentialRampToValueAtTime(0.001, n + 0.4);
        o.start(n); o.stop(n + 0.4);
    },

    _victoryHorn(n, vol) {
        for (let i = 0; i < 3; i++) {
            const t = n + i * 0.5;
            const freq = [262, 330, 392][i];
            const {o, g} = this._tone(freq, 'sine', vol * 0.25, t, 0.45);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
            o.start(t); o.stop(t + 0.45);
        }
    },

    // ── DIVE ALARM — awooga ──
    _diveAlarm(n, vol) {
        for (let i = 0; i < 2; i++) {
            const t = n + i * 0.8;
            const {o, g} = this._tone(300, 'sawtooth', vol * 0.2, t, 0.6);
            o.frequency.linearRampToValueAtTime(180, t + 0.3);
            o.frequency.linearRampToValueAtTime(300, t + 0.6);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
            o.start(t); o.stop(t + 0.7);
        }
    },

    // Surface — air blast
    _surfaceBlast(n, vol) {
        const bufSz = this.ctx.sampleRate * 0.5;
        const buf = this.ctx.createBuffer(1, bufSz, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < bufSz; i++) d[i] = (Math.random() * 2 - 1);
        const src = this.ctx.createBufferSource(); src.buffer = buf;
        const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500;
        const gn = this.ctx.createGain();
        gn.gain.setValueAtTime(vol * 0.3, n);
        gn.gain.exponentialRampToValueAtTime(0.001, n + 0.5);
        src.connect(lp); lp.connect(gn); gn.connect(this.masterGain);
        src.start(n); src.stop(n + 0.5);
    },

    // Random bubbles
    _bubbles(n, vol) {
        for (let i = 0; i < 3; i++) {
            const t = n + i * 0.1 + Math.random() * 0.1;
            const freq = 400 + Math.random() * 600;
            const {o, g} = this._tone(freq, 'sine', vol * 0.06, t, 0.08);
            o.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.05);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
            o.start(t); o.stop(t + 0.08);
        }
    }
};
