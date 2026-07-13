// ============ HERO ============
const HEROES = [
    { id:'tank', name:'Танк', color:'#f80', color2:'#c60', hp:200, speed:130,
      desc:'Щит, провокация, укрепление',
      abilities:[
        {name:'Удар щитом',cd:5000,icon:'🛡',desc:'Оглушает врагов рядом'},
        {name:'Провокация',cd:8000,icon:'😤',desc:'Враги идут к вам 3с'},
        {name:'Укрепление',cd:12000,icon:'🏰',desc:'Башни рядом +50% урон 5с'}
      ]},
    { id:'mage', name:'Маг', color:'#a5f', color2:'#83c', hp:120, speed:155,
      desc:'Файрбол, молния, морозная волна',
      abilities:[
        {name:'Файрбол',cd:3000,icon:'🔥',desc:'Взрыв в точке'},
        {name:'Цеп. молния',cd:6000,icon:'⚡',desc:'Бьёт 5 врагов'},
        {name:'Мороз. волна',cd:10000,icon:'❄',desc:'Замораживает рядом'}
      ]},
    { id:'engineer', name:'Инженер', color:'#4f4', color2:'#2a2', hp:150, speed:145,
      desc:'Быстрое строительство, ремонт, разгон',
      abilities:[
        {name:'Быстр. башня',cd:4000,icon:'⚒',desc:'Бесплатная стрелк. башня'},
        {name:'Ремонт',cd:8000,icon:'🔧',desc:'Чинит всё +30 HP ядру'},
        {name:'Разгон',cd:15000,icon:'⚡',desc:'Башни x2 скорость 5с'}
      ]}
];

const Hero = {
    x:0, y:0, r:CFG.HERO_RADIUS,
    hp:100, maxHp:100, speed:150,
    alive:true, classIdx:0, facing:0,
    atkTimer:0, abCooldowns:[0,0,0],
    animFrame:0, animTimer:0,
    taunting:false, tauntTimer:0,
    // Buffs
    towerBuff:0, overclockTimer:0,

    init(ci) {
        const h=HEROES[ci]; this.classIdx=ci;
        this.hp=h.hp; this.maxHp=h.hp; this.speed=h.speed;
        this.alive=true; this.facing=0; this.atkTimer=0;
        this.abCooldowns=[0,0,0]; this.animFrame=0; this.animTimer=0;
        this.taunting=false; this.tauntTimer=0;
        this.towerBuff=0; this.overclockTimer=0;
        const cp=U.hexToPixel(0,0);
        this.x=cp.x+30; this.y=cp.y+30;
    },

    update(dt, enemies) {
        if(!this.alive) return;
        // Movement
        const spd=this.speed*dt;
        this.x+=Input.dx*spd; this.y+=Input.dy*spd;
        // Keep on grid area
        const maxD=CFG.GRID_RINGS*CFG.HEX_R*1.8;
        const cp=U.hexToPixel(0,0);
        const dx=this.x-cp.x, dy=this.y-cp.y;
        const d=Math.sqrt(dx*dx+dy*dy);
        if(d>maxD){this.x=cp.x+dx/d*maxD;this.y=cp.y+dy/d*maxD;}

        // Walk anim
        if(Input.dx||Input.dy){this.animTimer+=dt;if(this.animTimer>.12){this.animTimer=0;this.animFrame=(this.animFrame+1)%4;}}
        else this.animFrame=0;

        // Face nearest enemy
        let nearest=null,nd=Infinity;
        for(const e of enemies){if(!e.alive||e.spawnDelay>0)continue;const dd=U.dist(this,e);if(dd<nd){nd=dd;nearest=e;}}
        if(nearest)this.facing=U.angle(this,nearest);
        else if(Input.dx||Input.dy)this.facing=Math.atan2(Input.dy,Input.dx);

        // Auto attack nearest
        this.atkTimer-=dt*1000;
        if(nearest && nd<CFG.HERO_ATTACK_RANGE && this.atkTimer<=0) {
            this.atkTimer=CFG.HERO_ATTACK_CD;
            nearest.hp-=CFG.HERO_DMG;
            FX.sparkle(nearest.x,nearest.y,HEROES[this.classIdx].color,4,40);
            FX.num(nearest.x,nearest.y,CFG.HERO_DMG,HEROES[this.classIdx].color);
            Snd.play('hit',.08);
        }

        // Cooldowns
        for(let i=0;i<3;i++) if(this.abCooldowns[i]>0)this.abCooldowns[i]-=dt*1000;

        // Taunt
        if(this.taunting){
            this.tauntTimer-=dt*1000;
            if(this.tauntTimer<=0)this.taunting=false;
            for(const e of enemies){
                if(e.alive&&U.dist(this,e)<200){
                    // Redirect to hero
                    const a=U.angle(e,this);
                    e.x+=Math.cos(a)*e.speed*dt*.5;
                    e.y+=Math.sin(a)*e.speed*dt*.5;
                }
            }
        }

        // Tower buff & overclock decay
        if(this.towerBuff>0)this.towerBuff-=dt*1000;
        if(this.overclockTimer>0)this.overclockTimer-=dt*1000;

        if(this.hp<=0){this.hp=0;this.alive=false;}
    },

    useAbility(idx, enemies) {
        if(this.abCooldowns[idx]>0) return false;
        const h=HEROES[this.classIdx];
        this.abCooldowns[idx]=h.abilities[idx].cd;

        if(h.id==='tank') {
            if(idx===0){ // Shield bash
                FX.ring(this.x,this.y,'#f80',60,.4);
                Cam.addShake(4);
                for(const e of enemies){if(e.alive&&U.dist(this,e)<70){e.hp-=20;e.slow=0;e.slowTimer=1500;FX.num(e.x,e.y,20,'#f80');}}
            } else if(idx===1){ // Taunt
                this.taunting=true;this.tauntTimer=3000;
                FX.ring(this.x,this.y,'#f44',100,.5);
            } else { // Fortify
                this.towerBuff=5000;
                FX.ring(this.x,this.y,'#ff0',120,.5);
            }
        } else if(h.id==='mage') {
            if(idx===0){ // Fireball at nearest
                let t=null,bd=Infinity;for(const e of enemies){if(!e.alive)continue;const dd=U.dist(this,e);if(dd<bd){bd=dd;t=e;}}
                if(t){
                    FX.ring(t.x,t.y,'#f60',60,.4);FX.sparkle(t.x,t.y,'#f80',12,80);FX.doFlash('#f60',.1);Cam.addShake(5);Snd.play('boom',.2);
                    for(const e of enemies){if(e.alive&&U.dist(t,e)<60){e.hp-=35;FX.num(e.x,e.y,35,'#f60');}}
                }
            } else if(idx===1){ // Chain lightning
                let t=null,bd=Infinity;for(const e of enemies){if(!e.alive)continue;const dd=U.dist(this,e);if(dd<200&&dd<bd){bd=dd;t=e;}}
                if(t){
                    let cur=t;const hit=new Set();
                    for(let c=0;c<5;c++){if(!cur||!cur.alive)break;cur.hp-=25;FX.sparkle(cur.x,cur.y,'#4ef',5,60);FX.num(cur.x,cur.y,25,'#4ef');hit.add(cur);
                    let nx=null,ndd=Infinity;for(const e of enemies){if(!e.alive||hit.has(e))continue;const dd=U.dist(cur,e);if(dd<100&&dd<ndd){ndd=dd;nx=e;}}
                    if(nx)FX.bolt(cur.x,cur.y,nx.x,nx.y,'#4ef',.3);cur=nx;}
                    FX.bolt(this.x,this.y,t.x,t.y,'#8cf',.2);Cam.addShake(3);
                }
            } else { // Frost nova
                FX.ring(this.x,this.y,'#8ef',100,.5);FX.sparkle(this.x,this.y,'#8ef',15,90);
                for(const e of enemies){if(e.alive&&U.dist(this,e)<100){e.slow=.2;e.slowTimer=3000;e.hp-=10;FX.num(e.x,e.y,10,'#8ef');}}
            }
        } else { // Engineer
            if(idx===0){ // Free arrow tower at nearest empty hex
                const hx=U.pixelToHex(this.x,this.y);
                for(const[dq,dr]of HEX_DIR){if(Buildings.place(hx.q+dq,hx.r+dr,'arrow')){Game.gold+=TOWER_DEFS.arrow.cost;break;}} // refund cost since it's free
            } else if(idx===1){ // Repair all
                Game.coreHp=Math.min(CFG.CORE_HP,Game.coreHp+30);
                for(const b of Buildings.list){b.hp=Math.min(b.maxHp,b.hp+30);}
                FX.ring(this.x,this.y,'#4f4',150,.5);
            } else { // Overclock
                this.overclockTimer=5000;
                FX.ring(this.x,this.y,'#ff0',100,.5);
            }
        }
        Snd.play('lvl',.15);
        return true;
    },

    draw(ctx) {
        if(!this.alive)return;
        const h=HEROES[this.classIdx];
        const walk=this.animFrame;
        const lo=walk%2===0?0:(walk===1?2:-2);

        ctx.save();ctx.translate(this.x|0,this.y|0);
        // Shadow
        ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(0,this.r+4,this.r*.9,4,0,0,Math.PI*2);ctx.fill();
        // Legs
        ctx.fillStyle='#543';ctx.fillRect(-4,5+lo,3,7);ctx.fillRect(2,5-lo,3,7);
        // Body
        ctx.fillStyle=h.color;ctx.fillRect(-7,-7,14,14);
        ctx.fillStyle=h.color2;ctx.fillRect(-7,-7,14,2);ctx.fillRect(-7,5,14,2);
        // Head
        ctx.fillStyle='#eca';ctx.beginPath();ctx.arc(0,-10,5,0,Math.PI*2);ctx.fill();
        // Class accent
        if(h.id==='tank'){
            ctx.fillStyle='#888';ctx.fillRect(-6,-14,12,3); // helmet
            ctx.fillStyle='#666';ctx.fillRect(-3,-11,6,2); // visor
        } else if(h.id==='mage'){
            ctx.fillStyle=h.color2;ctx.beginPath();ctx.moveTo(-6,-10);ctx.lineTo(6,-10);ctx.lineTo(2,-20);ctx.fill(); // hat
            ctx.fillStyle='#ff0';ctx.fillRect(-6,-11,12,2); // hat band
        } else {
            ctx.fillStyle='#453';ctx.beginPath();ctx.arc(0,-10,6,Math.PI,0);ctx.fill(); // hood
            ctx.fillStyle='#fff';ctx.fillRect(-3,-11,2,2);ctx.fillRect(1,-11,2,2); // eyes
        }

        // Taunt indicator
        if(this.taunting){
            ctx.fillStyle='#f44';ctx.globalAlpha=.3+Math.sin(performance.now()/200)*.2;
            ctx.beginPath();ctx.arc(0,0,25,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
        }

        ctx.restore();
    }
};
