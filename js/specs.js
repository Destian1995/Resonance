// ============ SPECIALIZATIONS (replace hero) + SPELLS ============
const SPECS = [
    { id:'fire', name:'Пламя', color:'#f60', icon:'🔥',
      desc:'Огн. башни -30% цена, +20% урон',
      spells:[
        {name:'Метеорит',cd:12000,icon:'☄',desc:'Взрыв AoE 80px',color:'#f60',
         cast(enemies){
             let t=null,bd=Infinity;
             for(const e of enemies){if(!e.alive)continue;const d=U.dist2(e.x,e.y,World.centerX,World.centerY);if(d<bd){bd=d;t=e;}}
             if(!t)return;
             FX.ring(t.x,t.y,'#f60',80,.5);FX.ring(t.x,t.y,'#ff0',40,.3);
             FX.sparkle(t.x,t.y,'#f80',20,100);FX.doFlash('#f60',.15);Cam.addShake(8);Snd.play('boom',.3);
             for(const e of enemies){if(e.alive&&U.dist(t,e)<80){e.hp-=40;FX.num(e.x,e.y,40,'#f60');}}
         }},
        {name:'Огн. стена',cd:18000,icon:'🔥',desc:'Линия огня через карту',color:'#f80',
         cast(enemies){
             const cx=World.centerX, cy=World.centerY;
             const a=Math.random()*Math.PI;
             for(let i=-6;i<=6;i++){
                 const px=cx+Math.cos(a)*i*30, py=cy+Math.sin(a)*i*30;
                 FX.sparkle(px,py,'#f60',4,40);
                 for(const e of enemies){if(e.alive&&U.dist2(px,py,e.x,e.y)<30){e.hp-=25;FX.num(e.x,e.y,25,'#f80');}}
             }
             Cam.addShake(5);Snd.play('boom',.2);
         }},
        {name:'Вулкан',cd:30000,icon:'🌋',desc:'Все враги горят 5с',color:'#f44',
         cast(enemies){
             for(const e of enemies){if(e.alive){e.burning=5000;FX.spawn(e.x,e.y,'#f60',3,30);}}
             FX.doFlash('#f40',.2);Snd.play('boom',.25);
         }}
      ],
      apply(){TOWER_DEFS.fire.cost=28;TOWER_DEFS.fire.dmg=18;}
    },
    { id:'ice', name:'Мороз', color:'#4cf', icon:'❄',
      desc:'Лед. башни +40% зона, все враги -10% скорость',
      spells:[
        {name:'Бл. мороз',cd:10000,icon:'❄',desc:'Заморозка всех рядом с ядром',color:'#8ef',
         cast(enemies){
             const cp={x:World.centerX,y:World.centerY};
             FX.ring(cp.x,cp.y,'#8ef',120,.6);FX.sparkle(cp.x,cp.y,'#aef',20,100);Cam.addShake(4);
             for(const e of enemies){if(e.alive&&U.dist(cp,e)<120){e.slow=.1;e.slowTimer=4000;e.hp-=10;FX.num(e.x,e.y,10,'#8ef');}}
         }},
        {name:'Лед. шторм',cd:20000,icon:'🌨',desc:'Замедление всех на 50%',color:'#6cf',
         cast(enemies){for(const e of enemies){if(e.alive){e.slow=.5;e.slowTimer=6000;}}FX.doFlash('#4cf',.15);}},
        {name:'Абс. ноль',cd:35000,icon:'🧊',desc:'Полная заморозка 3с',color:'#4ef',
         cast(enemies){for(const e of enemies){if(e.alive){e.slow=.05;e.slowTimer=3000;e.hp-=5;}}FX.doFlash('#8ef',.25);Cam.addShake(6);}}
      ],
      apply(){TOWER_DEFS.ice.range=4;CFG.ENEMY_BASE_SPD*=.9;}
    },
    { id:'tech', name:'Техно', color:'#4f4', icon:'⚙',
      desc:'Все башни -15% кулдаун, +1 цепь молний',
      spells:[
        {name:'Перегрузка',cd:15000,icon:'⚡',desc:'Все башни стреляют мгновенно',color:'#ff0',
         cast(){for(const b of Buildings.list)b.timer=0;FX.doFlash('#ff0',.1);Snd.play('lvl',.2);}},
        {name:'Ремонт',cd:12000,icon:'🔧',desc:'+40 HP ядру, чинит стены',color:'#4f4',
         cast(){
             Game.coreHp=Math.min(CFG.CORE_HP,Game.coreHp+40);
             for(const b of Buildings.list)b.hp=Math.min(b.maxHp,b.hp+40);
             FX.ring(World.centerX,World.centerY,'#4f4',100,.5);FX.sparkle(World.centerX,World.centerY,'#4f4',10,60);
         }},
        {name:'ЭМИ',cd:25000,icon:'💥',desc:'Все враги теряют 30% HP',color:'#4ef',
         cast(enemies){
             for(const e of enemies){if(e.alive){const dmg=Math.floor(e.maxHp*.3);e.hp-=dmg;FX.num(e.x,e.y,dmg,'#4ef');FX.sparkle(e.x,e.y,'#4ef',3,30);}}
             FX.doFlash('#4ef',.2);Cam.addShake(6);Snd.play('boom',.25);
         }}
      ],
      apply(){for(const k in TOWER_DEFS){if(TOWER_DEFS[k].cd)TOWER_DEFS[k].cd*=.85;}TOWER_DEFS.lightning.chain=4;}
    }
];

const Spells = {
    specIdx: 0,
    cooldowns: [0,0,0],

    init(si) {
        this.specIdx = si;
        this.cooldowns = [0,0,0];
        SPECS[si].apply();
    },

    update(dt) {
        for(let i=0;i<3;i++) if(this.cooldowns[i]>0) this.cooldowns[i]-=dt*1000;
    },

    cast(idx, enemies) {
        if(this.cooldowns[idx]>0) return false;
        const spell = SPECS[this.specIdx].spells[idx];
        spell.cast(enemies);
        this.cooldowns[idx] = spell.cd;
        Game.stats.spellsCast++;
        return true;
    }
};
