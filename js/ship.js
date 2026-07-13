// ============ TITANIC — historically accurate ship model ============
// Sources: Encyclopedia Titanica, Britannica, Wikipedia
// Length: 882ft (269m), Beam: 92ft (28m), 16 watertight compartments
// 15 bulkheads, could stay afloat with 4 compartments flooded
// Hit breached compartments 1-6 (forepeak through boiler room 6)
// Sank in 2h40m (11:40pm - 2:20am), broke in two

const HIST = {
    // Real lifeboat launch order, side (0=stbd,1=port), time (min after collision), actual occupancy
    boats: [
        {id:7,  side:0, time:60,  occ:28, cap:65},
        {id:5,  side:0, time:65,  occ:41, cap:65},
        {id:3,  side:0, time:70,  occ:32, cap:65},
        {id:8,  side:1, time:75,  occ:28, cap:65},
        {id:1,  side:0, time:80,  occ:12, cap:40}, // emergency cutter
        {id:6,  side:1, time:85,  occ:28, cap:65},
        {id:16, side:1, time:90,  occ:56, cap:65},
        {id:14, side:1, time:95,  occ:60, cap:65},
        {id:12, side:1, time:100, occ:42, cap:65},
        {id:9,  side:0, time:100, occ:56, cap:65},
        {id:11, side:0, time:105, occ:70, cap:65},
        {id:13, side:0, time:110, occ:64, cap:65},
        {id:15, side:0, time:115, occ:70, cap:65},
        {id:2,  side:1, time:120, occ:26, cap:65}, // emergency cutter
        {id:10, side:1, time:125, occ:57, cap:65},
        {id:4,  side:1, time:130, occ:40, cap:65},
        {id:'C',side:0, time:140, occ:44, cap:47}, // collapsible
        {id:'D',side:1, time:145, occ:25, cap:47},
        {id:'A',side:0, time:155, occ:13, cap:47}, // washed off, partially flooded
        {id:'B',side:1, time:158, occ:30, cap:47}  // washed off, overturned
    ],
    // 16 watertight compartments (bow to stern)
    // Names and approximate position along ship (0=bow, 1=stern)
    comps: [
        {name:'Форпик',      pos:0.00, len:.04, breachRate:3.0},  // 1 - breached
        {name:'Трюм 1',      pos:0.04, len:.06, breachRate:2.5},  // 2 - breached
        {name:'Трюм 2',      pos:0.10, len:.06, breachRate:2.0},  // 3 - breached
        {name:'Трюм 3',      pos:0.16, len:.06, breachRate:0},    // 4
        {name:'Котельн. 6',  pos:0.22, len:.06, breachRate:2.5},  // 5 - breached
        {name:'Котельн. 5',  pos:0.28, len:.06, breachRate:1.5},  // 6 - breached (partially)
        {name:'Котельн. 4',  pos:0.34, len:.06, breachRate:0},    // 7
        {name:'Котельн. 3',  pos:0.40, len:.06, breachRate:0},    // 8
        {name:'Котельн. 2',  pos:0.46, len:.06, breachRate:0},    // 9
        {name:'Котельн. 1',  pos:0.52, len:.06, breachRate:0},    // 10
        {name:'Машинное',    pos:0.58, len:.08, breachRate:0},    // 11
        {name:'Турбинная',   pos:0.66, len:.06, breachRate:0},    // 12
        {name:'Трюм кор.1',  pos:0.72, len:.06, breachRate:0},   // 13
        {name:'Трюм кор.2',  pos:0.78, len:.06, breachRate:0},   // 14
        {name:'Трюм кор.3',  pos:0.84, len:.06, breachRate:0},   // 15
        {name:'Ахтерпик',   pos:0.90, len:.10, breachRate:0}     // 16
    ],
    totalPax: 2224,    // actual count
    survived: 710,     // actual survivors
    sinkTime: 160,     // minutes from collision to sinking
    // Decks: Boat, A-G (8 decks)
    decks: ['Шлюпочн.','A','B','C','D','E','F','G']
};

const Ship = {
    x:0, y:0, heading:0, speed:0,
    rudder:0, engine:3,
    length:270, width:28,

    comps: [],           // 16 compartments with flooding state
    flooding: 0,         // total %
    bowAngle: 0,         // degrees
    listAngle: 0,        // port/starboard
    powerOn: true,
    lightsOn: true,
    boilersLit: [true,true,true,true,true,true], // 6 boiler rooms

    boats: [],           // 20 lifeboats
    totalPax: HIST.totalPax,
    evacuated: 0,
    inBoats: 0,          // people currently in unlaunched boats
    dead: 0,

    hit: false,
    sinking: false,
    sunk: false,
    broken: false,       // ship broke in two at 2:18
    minutesSinceHit: 0,
    collisionSeverity: 0, // 0-5 based on how you hit

    // People on deck
    people: [],
    panicLevel: 0,       // 0-1

    // SOS
    distressSignaled: false,
    carpathiaETA: 240,   // minutes (4 hours)

    // Watertight doors
    wtDoorsOpen: true,

    init() {
        this.x=400;this.y=300;this.heading=-Math.PI/2;this.speed=22.5; // 22.5 knots actual speed
        this.rudder=0;this.engine=3;this.flooding=0;this.bowAngle=0;this.listAngle=0;
        this.powerOn=true;this.lightsOn=true;
        this.boilersLit=[true,true,true,true,true,true];
        this.hit=false;this.sinking=false;this.sunk=false;this.broken=false;
        this.minutesSinceHit=0;this.collisionSeverity=0;
        this.evacuated=0;this.inBoats=0;this.dead=0;
        this.panicLevel=0;this.distressSignaled=false;
        this.carpathiaETA=240;this.wtDoorsOpen=true;
        this._hitLogged=false;this._powerLogged=false;
        this._warn30=false;this._warn60=false;this._warn80=false;this._breakLogged=false;

        // Init compartments
        this.comps=HIST.comps.map(c=>({...c, flooded:0, rate:0, breached:false}));

        // Init lifeboats
        this.boats=HIST.boats.map((b,i)=>({
            ...b, launched:false, pax:0, ready:false,
            localX:.35-b.id*(typeof b.id==='number'?1:0)*.035-i*.03,
            preparing:false, prepTimer:0
        }));
        // Position boats along deck
        for(let i=0;i<this.boats.length;i++){
            const b=this.boats[i];
            // Stbd boats forward, port boats forward
            b.localX=.3-i*.032;
        }

        // Spawn visible people (200 = ~10% of passengers)
        this.people=[];
        for(let i=0;i<200;i++){
            this.people.push({
                lx:-.35+Math.random()*.7,
                ly:(Math.random()-.5)*.6,
                vx:0,vy:0,
                state:'idle', // idle,alarmed,panic,toboat,boarding,inboat,water,dead,saved
                target:null,
                speed:.15+Math.random()*.25,
                timer:Math.random()*10,
                class:Math.random()<.38?3:Math.random()<.6?2:1, // 38% 3rd, 22% 2nd, 40% 1st (+ crew)
                color:['#eca','#dba','#ca8','#fed','#edb'][Math.floor(Math.random()*5)]
            });
        }

        // Iceberg
        this.iceberg={x:this.x+Math.cos(this.heading)*900, y:this.y+Math.sin(this.heading)*900, r:45};
    },

    update(dt, gameMinutes) {
        if(this.sunk)return;

        // ── NAVIGATION ──
        const spds=[0,5,12,22.5,-4];
        const tgtSpd=this.powerOn?spds[this.engine]:Math.max(0,this.speed-dt*1.5);
        this.speed+=(tgtSpd-this.speed)*dt*.2;

        if(this.rudder!==0&&Math.abs(this.speed)>0.5){
            // Titanic had notoriously poor turning — 37 second response time
            this.heading+=this.rudder*dt*.008*Math.abs(this.speed);
        }
        this.x+=Math.cos(this.heading)*this.speed*dt*2;
        this.y+=Math.sin(this.heading)*this.speed*dt*2;

        // ── ICEBERG CHECK ──
        if(!this.hit&&this.iceberg){
            // Check collision along hull (not just bow)
            for(let t=0;t<1;t+=.05){
                const px=this.x+Math.cos(this.heading)*this.length*(.5-t);
                const py=this.y+Math.sin(this.heading)*this.length*(.5-t);
                const perp=this.heading+Math.PI/2;
                // Check starboard side
                const sx=px+Math.cos(perp)*this.width*.5;
                const sy=py+Math.sin(perp)*this.width*.5;
                const dx=sx-this.iceberg.x,dy=sy-this.iceberg.y;
                if(Math.sqrt(dx*dx+dy*dy)<this.iceberg.r+3){
                    this._onCollision(t); // t = where along hull
                    break;
                }
            }
        }

        // ── FLOODING (per minute of game time) ──
        if(this.sinking){
            this.minutesSinceHit+=dt*4; // 4x time scale
            for(const c of this.comps){
                if(!c.breached)continue;
                if(c.flooded<100){
                    // Water pours in at 7 tons/second in real life
                    c.flooded=Math.min(100, c.flooded+c.rate*dt*4);
                    // Flooding accelerates as compartment fills (pressure)
                    if(c.flooded>50) c.rate*=1+dt*.005;
                }
            }
            // Water overflows bulkheads when compartment >90% (bulkheads only reached E deck)
            if(!this.wtDoorsOpen){
                for(let i=0;i<this.comps.length-1;i++){
                    if(this.comps[i].flooded>90&&!this.comps[i+1].breached){
                        this.comps[i+1].breached=true;
                        this.comps[i+1].rate=1.2;
                    }
                }
            } else {
                // WT doors open = water spreads faster
                for(let i=0;i<this.comps.length-1;i++){
                    if(this.comps[i].flooded>60&&!this.comps[i+1].breached){
                        this.comps[i+1].breached=true;
                        this.comps[i+1].rate=1.8;
                    }
                }
            }

            // Total flooding
            let total=0;
            for(const c of this.comps)total+=c.flooded;
            this.flooding=total/this.comps.length;

            // Bow angle (forward compartments drag bow down)
            let fwdWeight=0;
            for(let i=0;i<8;i++) fwdWeight+=this.comps[i].flooded*(8-i);
            this.bowAngle=Math.min(45, fwdWeight*.008);

            // List angle
            this.listAngle=Math.sin(gameMinutes*.3)*1.5+(this.bowAngle>15?5:0);

            // Power loss: boiler rooms flood
            for(let i=0;i<6;i++){
                if(this.comps[i+4].flooded>60) this.boilersLit[i]=false;
            }
            const litCount=this.boilersLit.filter(b=>b).length;
            if(litCount===0&&this.powerOn) this.powerOn=false;
            // Lights flicker then die at 2:18 (bowAngle ~23°)
            if(this.bowAngle>23) this.lightsOn=false;

            // Ship breaks at bowAngle >30° (historically at 2:18am, ~158 min)
            if(this.bowAngle>30&&!this.broken){
                this.broken=true;
            }

            // Sunk when flooding >85% or bowAngle >40
            if(this.flooding>85||this.bowAngle>40) this.sunk=true;
        }

        // ── PEOPLE AI ──
        // Panic rises over time after collision
        if(this.sinking){
            this.panicLevel=Math.min(1, this.minutesSinceHit/120);
        }

        for(const p of this.people){
            if(p.state==='dead'||p.state==='inboat'||p.state==='saved')continue;
            p.timer-=dt;

            if(p.state==='idle'&&this.sinking){
                // Higher class = alerted sooner (historically accurate — 3rd class was locked below)
                const alertDelay=p.class===1?5:p.class===2?15:30;
                if(this.minutesSinceHit>alertDelay+Math.random()*20){
                    p.state='alarmed';p.timer=2+Math.random()*5;
                }
            }

            if(p.state==='alarmed'&&p.timer<=0){
                p.state=Math.random()<this.panicLevel?'panic':'toboat';
                if(p.state==='toboat') this._assignBoat(p);
                p.timer=1+Math.random()*3;
            }

            if(p.state==='panic'){
                p.vx+=(Math.random()-.5)*dt*6;p.vy+=(Math.random()-.5)*dt*6;
                p.vx*=.94;p.vy*=.94;
                p.lx+=p.vx*dt*p.speed;p.ly+=p.vy*dt*p.speed;
                p.lx=Math.max(-.43,Math.min(.43,p.lx));
                p.ly=Math.max(-.38,Math.min(.38,p.ly));
                if(p.timer<=0){p.state='toboat';this._assignBoat(p);p.timer=2;}
            }

            if(p.state==='toboat'&&p.target){
                const b=p.target;
                if(b.launched){p.state='panic';p.timer=1;continue;}
                const tx=b.localX, ty=b.side===0?-.38:.38;
                const dx=tx-p.lx,dy=ty-p.ly,d=Math.sqrt(dx*dx+dy*dy);
                if(d<.03){
                    if(b.pax<b.cap){p.state='boarding';b.pax++;this.inBoats++;}
                    else{p.state='panic';p.timer=1;}
                } else {
                    p.lx+=dx/d*dt*p.speed*.5;
                    p.ly+=dy/d*dt*p.speed*.5;
                }
            }

            if(p.state==='boarding'){p.state='inboat';}

            // People at bow fall in water when angle steep
            if(this.bowAngle>20&&p.lx>.2&&p.state!=='dead'&&p.state!=='inboat'){
                if(Math.random()<dt*.01*this.bowAngle){p.state='water';p.timer=3+Math.random()*5;}
            }
            // Water = hypothermia death
            if(p.state==='water'){
                p.timer-=dt;
                if(p.timer<=0){p.state='dead';this.dead++;}
            }
        }
    },

    _onCollision(hitPos){
        this.hit=true;this.sinking=true;this.engine=0;
        // Breach compartments based on where hit scrapes
        // Historical: starboard scrape from bow along ~300ft (compartments 1-6)
        const startComp=0;
        const endComp=Math.min(5, Math.floor(hitPos*16)+4);
        for(let i=startComp;i<=endComp;i++){
            if(i<this.comps.length){
                this.comps[i].breached=true;
                this.comps[i].rate=HIST.comps[i].breachRate||1;
            }
        }
        this.collisionSeverity=endComp;
        // Close watertight doors automatically (Captain's order)
        this.wtDoorsOpen=false;
    },

    _assignBoat(person){
        let best=null,bd=Infinity;
        for(const b of this.boats){
            if(b.launched||b.pax>=b.cap)continue;
            const bx=b.localX,by=b.side===0?-.38:.38;
            const d=Math.sqrt((person.lx-bx)**2+(person.ly-by)**2);
            if(d<bd){bd=d;best=b;}
        }
        person.target=best;
        if(!best)person.state='panic';
    },

    launchBoat(idx){
        const b=this.boats[idx];
        if(!b||b.launched)return{launched:false};
        b.launched=true;
        const saved=b.pax;
        this.evacuated+=saved;
        this.inBoats-=saved;
        // People in this boat are saved
        for(const p of this.people){
            if(p.state==='inboat'&&p.target===b) p.state='saved';
        }
        return{launched:true, id:b.id, pax:saved, cap:b.cap};
    },

    localToWorld(lx,ly){
        const cos=Math.cos(this.heading),sin=Math.sin(this.heading);
        const sx=lx*this.length, sy=ly*this.width*2;
        return{x:this.x+cos*sx-sin*sy, y:this.y+sin*sx+cos*sy};
    }
};
