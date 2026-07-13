// ============ TITANIC — Ship State ============
const Ship = {
    // Sections: bow, fwdHold, bridge, midship, engineRoom, aftHold, stern
    sections: [],
    totalHP: 100,
    flooding: 0,        // 0-100% total flooding
    listAngle: 0,       // degrees port/starboard tilt
    bowAngle: 0,        // degrees bow-down pitch
    sinkRate: 0,
    speed: 22,          // knots
    heading: 0,
    rudderAngle: 0,
    enginePower: 3,     // 0=stop,1=slow,2=half,3=full,4=reverse
    // Compartments (watertight)
    compartments: 6,
    breached: [],       // which compartments are breached
    // Passengers
    totalPassengers: 2200,
    evacuated: 0,
    dead: 0,
    lifeboats: 20,
    lifeboatsLaunched: 0,
    lifeboatCapacity: 65,
    // Timing
    timeToSink: 160,    // minutes game-time remaining
    distressSignaled: false,
    // Power
    powerOn: true,
    generatorFlooded: false,

    init() {
        this.sections = [
            {name:'Нос',       x:.08, hp:100, flooded:0, rate:0, breached:false},
            {name:'Трюм пер.', x:.22, hp:100, flooded:0, rate:0, breached:false},
            {name:'Мостик',    x:.38, hp:100, flooded:0, rate:0, breached:false},
            {name:'Миделъ',    x:.52, hp:100, flooded:0, rate:0, breached:false},
            {name:'Машинное',  x:.67, hp:100, flooded:0, rate:0, breached:false},
            {name:'Трюм кор.', x:.82, hp:100, flooded:0, rate:0, breached:false}
        ];
        this.totalHP=100;this.flooding=0;this.listAngle=0;this.bowAngle=0;
        this.sinkRate=0;this.speed=22;this.heading=0;this.rudderAngle=0;this.enginePower=3;
        this.breached=[];this.evacuated=0;this.dead=0;
        this.lifeboats=20;this.lifeboatsLaunched=0;
        this.timeToSink=160;this.distressSignaled=false;
        this.powerOn=true;this.generatorFlooded=false;
    },

    icebergHit() {
        // Breach first 3 compartments (historically accurate)
        for (let i = 0; i < 3; i++) {
            this.sections[i].breached = true;
            this.sections[i].rate = 3 + i * 1.5; // flooding rate %/min
            this.breached.push(i);
        }
        // Partial breach on 4th
        this.sections[3].breached = true;
        this.sections[3].rate = 1;
        this.breached.push(3);
    },

    update(dt, gameMinutes) {
        // Flooding spreads
        for (const s of this.sections) {
            if (s.breached && s.flooded < 100) {
                s.flooded = Math.min(100, s.flooded + s.rate * dt);
                // Flooding accelerates as compartment fills
                if (s.flooded > 50) s.rate *= 1 + dt * 0.02;
            }
        }
        // Adjacent compartments flood when one is >80%
        for (let i = 0; i < this.sections.length - 1; i++) {
            if (this.sections[i].flooded > 80 && !this.sections[i+1].breached) {
                this.sections[i+1].breached = true;
                this.sections[i+1].rate = 1.5;
                if (!this.breached.includes(i+1)) this.breached.push(i+1);
            }
        }
        // Total flooding
        let total = 0;
        for (const s of this.sections) total += s.flooded;
        this.flooding = total / this.sections.length;

        // Bow angle increases with forward flooding
        const fwdFlood = (this.sections[0].flooded + this.sections[1].flooded + this.sections[2].flooded) / 3;
        this.bowAngle = fwdFlood * 0.25; // up to 25 degrees
        // List (slight random)
        this.listAngle = Math.sin(gameMinutes * 0.5) * 2 + (fwdFlood > 50 ? (fwdFlood - 50) * 0.1 : 0);

        // Power fails when engine room floods > 70%
        if (this.sections[4].flooded > 70 && this.powerOn) {
            this.powerOn = false;
            this.generatorFlooded = true;
        }

        // Speed decreases with flooding
        const maxSpeed = this.powerOn ? [0, 5, 12, 22, -3][this.enginePower] : 0;
        this.speed += (maxSpeed - this.speed) * dt * 0.3;
        this.speed = Math.max(-3, this.speed);

        // Sink rate
        this.sinkRate = this.flooding * 0.01;

        // Time to sink decreases with flooding
        if (this.flooding > 10) {
            this.timeToSink -= dt * (1 + this.flooding * 0.02);
        }

        // HP
        this.totalHP = Math.max(0, 100 - this.flooding);

        return this.flooding >= 95 || this.timeToSink <= 0;
    }
};
