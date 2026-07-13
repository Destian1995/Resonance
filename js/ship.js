// ============ SHIP — physics, compartments, flooding ============
const Ship = {
    x:0, y:0, heading:0, speed:0,
    rudder:0,       // -1..1
    engine:3,       // 0=stop 1=slow 2=half 3=full 4=reverse
    maxSpeed:22,
    length:270,     // meters (pixels at scale)
    width:28,
    hp:100,
    // Compartments (0=bow..5=stern)
    comps:[],
    flooding:0,
    bowAngle:0,
    powerOn:true,
    // Passengers
    people:[],       // {x,y,vx,vy,state,deck} — simulated people
    totalPax:2200,
    evacuated:0,
    dead:0,
    // Lifeboats {x,y,side,launched,people}
    boats:[],
    boatsLaunched:0,
    // Iceberg
    iceberg:null,    // {x,y,r}
    hit:false,
    sinking:false,
    sunk:false,
    timeElapsed:0,

    init(){
        this.x=400;this.y=300;this.heading=-Math.PI/2;this.speed=22;
        this.rudder=0;this.engine=3;this.hp=100;this.flooding=0;
        this.bowAngle=0;this.powerOn=true;this.hit=false;this.sinking=false;this.sunk=false;
        this.evacuated=0;this.dead=0;this.boatsLaunched=0;this.timeElapsed=0;

        // Compartments along ship length
        this.comps=[];
        const names=['Нос','Трюм 1','Трюм 2','Котельн.','Машинн.','Корма'];
        for(let i=0;i<6;i++){
            this.comps.push({name:names[i], flooded:0, rate:0, breached:false, pos:i/5});
        }

        // Lifeboats (10 per side)
        this.boats=[];
        for(let side=0;side<2;side++){
            for(let i=0;i<10;i++){
                this.boats.push({
                    localX:-.3+i*.065, // along ship length (-0.5..0.5)
                    side:side, // 0=port 1=starboard
                    launched:false, pax:0, capacity:65
                });
            }
        }

        // Spawn people on deck
        this.people=[];
        for(let i=0;i<200;i++){ // 200 visible (represent 2200)
            this.people.push({
                lx:-.4+Math.random()*.8, // local x along ship
                ly:(Math.random()-.5)*.7, // local y across ship
                vx:0, vy:0,
                state:'idle', // idle, panic, toboat, inboat, water, dead
                target:null,
                speed:.3+Math.random()*.4,
                timer:Math.random()*5,
                color:['#dca','#cb9','#eca','#fed','#ba8'][Math.floor(Math.random()*5)]
            });
        }

        // Iceberg ahead
        this.iceberg={x:this.x+Math.cos(this.heading)*800, y:this.y+Math.sin(this.heading)*800, r:40};
    },

    update(dt){
        if(this.sunk)return;
        this.timeElapsed+=dt;

        // ── NAVIGATION ──
        const spds=[0,5,12,22,-5];
        const tgtSpd=this.powerOn?spds[this.engine]:Math.max(0,this.speed-dt*2);
        this.speed+=(tgtSpd-this.speed)*dt*.3;

        // Rudder turns ship
        if(this.rudder!==0&&Math.abs(this.speed)>1){
            this.heading+=this.rudder*dt*.012*Math.abs(this.speed);
        }

        this.x+=Math.cos(this.heading)*this.speed*dt*2;
        this.y+=Math.sin(this.heading)*this.speed*dt*2;

        // ── ICEBERG COLLISION ──
        if(!this.hit&&this.iceberg){
            // Ship bow position
            const bowX=this.x+Math.cos(this.heading)*this.length*.45;
            const bowY=this.y+Math.sin(this.heading)*this.length*.45;
            const dx=bowX-this.iceberg.x, dy=bowY-this.iceberg.y;
            if(Math.sqrt(dx*dx+dy*dy)<this.iceberg.r+8){
                this._onHit();
            }
        }

        // ── FLOODING ──
        if(this.sinking){
            for(const c of this.comps){
                if(c.breached&&c.flooded<100){
                    c.flooded=Math.min(100,c.flooded+c.rate*dt);
                    if(c.flooded>60)c.rate*=1+dt*.01;
                }
            }
            // Spread flooding
            for(let i=0;i<this.comps.length-1;i++){
                if(this.comps[i].flooded>85&&!this.comps[i+1].breached){
                    this.comps[i+1].breached=true;
                    this.comps[i+1].rate=1;
                }
            }
            let total=0;
            for(const c of this.comps)total+=c.flooded;
            this.flooding=total/this.comps.length;
            this.bowAngle=(this.comps[0].flooded+this.comps[1].flooded+this.comps[2].flooded)/3*.2;
            if(this.comps[4].flooded>60)this.powerOn=false;
            this.hp=Math.max(0,100-this.flooding);
            if(this.flooding>=90)this.sunk=true;
        }

        // ── PEOPLE AI ──
        for(const p of this.people){
            if(p.state==='dead'||p.state==='inboat')continue;
            p.timer-=dt;

            if(this.sinking&&p.state==='idle'&&p.timer<=0){
                // Gradually panic
                p.state='panic';
                p.timer=1+Math.random()*3;
            }

            if(p.state==='panic'){
                // Run around randomly, then go to nearest boat
                p.vx+=(Math.random()-.5)*dt*8;
                p.vy+=(Math.random()-.5)*dt*8;
                p.vx*=.95;p.vy*=.95;
                p.lx+=p.vx*dt*p.speed;
                p.ly+=p.vy*dt*p.speed;
                // Clamp to ship
                p.lx=Math.max(-.45,Math.min(.45,p.lx));
                p.ly=Math.max(-.4,Math.min(.4,p.ly));
                // Try to find a boat
                if(p.timer<=0){
                    let best=null,bd=Infinity;
                    for(const b of this.boats){
                        if(b.launched||b.pax>=b.capacity)continue;
                        const bx=b.localX, by=b.side===0?-.45:.45;
                        const d=Math.sqrt((p.lx-bx)**2+(p.ly-by)**2);
                        if(d<bd){bd=d;best=b;}
                    }
                    if(best){p.state='toboat';p.target=best;}
                    else p.timer=2;
                }
            }

            if(p.state==='toboat'&&p.target){
                const b=p.target;
                if(b.launched||b.pax>=b.capacity){p.state='panic';p.timer=1;continue;}
                const tx=b.localX, ty=b.side===0?-.42:.42;
                const dx=tx-p.lx, dy=ty-p.ly;
                const d=Math.sqrt(dx*dx+dy*dy);
                if(d<.03){
                    // Board boat
                    p.state='inboat';
                    b.pax++;
                } else {
                    p.lx+=dx/d*dt*p.speed*.8;
                    p.ly+=dy/d*dt*p.speed*.8;
                }
            }

            // Fall into water if bow flooding high and person is at bow
            if(this.bowAngle>15&&p.lx<-.2&&p.state!=='dead'){
                if(Math.random()<dt*.02){p.state='dead';this.dead++;}
            }
        }
    },

    _onHit(){
        this.hit=true;this.sinking=true;
        // Breach first 3 compartments
        for(let i=0;i<3;i++){this.comps[i].breached=true;this.comps[i].rate=2+i;}
        this.comps[3].breached=true;this.comps[3].rate=.8;
        this.engine=0; // emergency stop
    },

    launchBoat(idx){
        const b=this.boats[idx];
        if(!b||b.launched)return 0;
        b.launched=true;
        this.boatsLaunched++;
        const saved=b.pax;
        this.evacuated+=saved;
        return saved;
    },

    // Get world position from local ship coords
    localToWorld(lx,ly){
        const cos=Math.cos(this.heading),sin=Math.sin(this.heading);
        const sx=lx*this.length, sy=ly*this.width*2;
        return {x:this.x+cos*sx-sin*sy, y:this.y+sin*sx+cos*sy};
    }
};
