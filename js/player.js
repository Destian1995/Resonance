// ============ PLAYER — pixel art characters ============
const CLASSES = [
    { id:'warrior', name:'Воин', color:'#f80', color2:'#c60', startWeapon:'sword',
      hp:120, speed:140, desc:'Вращающиеся клинки' },
    { id:'mage', name:'Маг', color:'#a5f', color2:'#83c', startWeapon:'missile',
      hp:80, speed:160, desc:'Самонаводящиеся снаряды' },
    { id:'ranger', name:'Рейнджер', color:'#ff0', color2:'#cc0', startWeapon:'arrow',
      hp:100, speed:155, desc:'Авто-стрелы вперёд' }
];

const Player = {
    x:0,y:0,r:CFG.PLAYER_RADIUS,
    hp:100,maxHp:100,speed:150,weapons:[],facing:0,alive:true,
    xp:0,totalXp:0,level:1,kills:0,
    dmgBonus:0,speedBonus:0,cdReduction:0,
    magnetRange:CFG.MAGNET_BASE, extraProj:0, classIdx:0,
    animFrame:0, animTimer:0, invuln:0,

    init(ci) {
        const c=CLASSES[ci]; this.classIdx=ci;
        this.x=CFG.WORLD_W/2; this.y=CFG.WORLD_H/2;
        this.hp=c.hp; this.maxHp=c.hp; this.speed=c.speed;
        this.alive=true; this.xp=0; this.totalXp=0;
        this.level=1; this.kills=0; this.facing=0;
        this.dmgBonus=0; this.speedBonus=0; this.cdReduction=0;
        this.magnetRange=CFG.MAGNET_BASE; this.extraProj=0;
        this.weapons=[]; this.addWeapon(c.startWeapon);
        this.animFrame=0; this.animTimer=0; this.invuln=0;
    },

    addWeapon(k) { const w=WeaponInst(k,1); w.recalc(); this.weapons.push(w); },
    hasWeapon(k) { return this.weapons.some(w=>w.key===k); },
    getWeapon(k) { return this.weapons.find(w=>w.key===k); },

    xpToNext() {
        return CFG.XP_PER_LEVEL[Math.min(this.level-1, CFG.XP_PER_LEVEL.length-1)];
    },

    update(dt) {
        if (!this.alive) return false;
        const spd=this.speed*(1+this.speedBonus/100)*dt;
        this.x=U.clamp(this.x+Input.dx*spd, this.r, CFG.WORLD_W-this.r);
        this.y=U.clamp(this.y+Input.dy*spd, this.r, CFG.WORLD_H-this.r);
        if (Input.dx||Input.dy) this.facing=Math.atan2(Input.dy,Input.dx);
        // Walk animation
        if (Input.dx||Input.dy) { this.animTimer+=dt; if(this.animTimer>.15){this.animTimer=0;this.animFrame=(this.animFrame+1)%4;} }
        else this.animFrame=0;
        // Invulnerability flash
        if (this.invuln>0) this.invuln-=dt;
        if (this.hp<=0) { this.hp=0; this.alive=false; }
        if (this.xp>=this.xpToNext()) { this.xp-=this.xpToNext(); this.level++; return true; }
        return false;
    },

    draw(ctx) {
        if (!this.alive) return;
        const c=CLASSES[this.classIdx];
        // Invuln blink
        if (this.invuln>0 && Math.floor(this.invuln*10)%2) return;

        const x=this.x|0, y=this.y|0;
        const f=this.facing;
        const walk=this.animFrame;
        const legOff = walk%2===0 ? 0 : (walk===1?2:-2);

        ctx.save();
        ctx.translate(x, y);

        // Shadow
        ctx.fillStyle='rgba(0,0,0,0.35)';
        ctx.beginPath(); ctx.ellipse(0,this.r+4,this.r*.9,4,0,0,Math.PI*2); ctx.fill();

        // Legs
        ctx.fillStyle='#543';
        ctx.fillRect(-4, 5+legOff, 3, 7);
        ctx.fillRect(2, 5-legOff, 3, 7);

        // Class-specific body
        if (c.id==='warrior') this._drawWarrior(ctx,c,f);
        else if (c.id==='mage') this._drawMage(ctx,c,f);
        else this._drawRanger(ctx,c,f);

        ctx.restore();
    },

    _drawWarrior(ctx,c,f) {
        // Armor body
        ctx.fillStyle=c.color;
        ctx.fillRect(-7,-7,14,14);
        ctx.fillStyle=c.color2;
        ctx.fillRect(-7,-7,14,2); // shoulder plate
        ctx.fillRect(-7,5,14,2);
        // Belt
        ctx.fillStyle='#640';
        ctx.fillRect(-7,1,14,2);
        // Head
        ctx.fillStyle='#eca';
        ctx.beginPath(); ctx.arc(0,-10,5,0,Math.PI*2); ctx.fill();
        // Helmet
        ctx.fillStyle='#888';
        ctx.fillRect(-6,-15,12,4);
        ctx.fillRect(-5,-16,10,2);
        // Visor slit
        ctx.fillStyle='#333';
        ctx.fillRect(-3,-12,6,2);
        // Shield arm
        ctx.fillStyle='#666';
        const sx=Math.cos(f+Math.PI*.7)*8, sy=Math.sin(f+Math.PI*.7)*8;
        ctx.beginPath(); ctx.arc(sx,sy-2,5,0,Math.PI*2); ctx.fill();
        ctx.fillStyle=c.color;
        ctx.beginPath(); ctx.arc(sx,sy-2,4,0,Math.PI*2); ctx.fill();
    },

    _drawMage(ctx,c,f) {
        // Robe body
        ctx.fillStyle=c.color;
        ctx.fillRect(-6,-6,12,12);
        // Robe skirt
        ctx.fillStyle=c.color2;
        ctx.beginPath();
        ctx.moveTo(-8,6); ctx.lineTo(8,6); ctx.lineTo(6,13); ctx.lineTo(-6,13);
        ctx.fill();
        // Robe stripe
        ctx.fillStyle='#fff';
        ctx.globalAlpha=.2;
        ctx.fillRect(-1,-6,2,18);
        ctx.globalAlpha=1;
        // Head
        ctx.fillStyle='#eca';
        ctx.beginPath(); ctx.arc(0,-9,5,0,Math.PI*2); ctx.fill();
        // Wizard hat
        ctx.fillStyle=c.color2;
        ctx.beginPath();
        ctx.moveTo(-7,-9); ctx.lineTo(7,-9); ctx.lineTo(2,-22);
        ctx.fill();
        ctx.fillStyle='#ff0';
        ctx.fillRect(-7,-10,14,2);
        // Staff
        ctx.save(); ctx.rotate(f);
        ctx.fillStyle='#862';
        ctx.fillRect(4,-1,14,2);
        // Staff orb
        ctx.fillStyle='#f0f';
        ctx.beginPath(); ctx.arc(18,0,3.5,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=.3;
        ctx.fillStyle='#f0f';
        ctx.beginPath(); ctx.arc(18,0,7,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=1;
        ctx.restore();
    },

    _drawRanger(ctx,c,f) {
        // Leather body
        ctx.fillStyle='#654';
        ctx.fillRect(-6,-6,12,12);
        ctx.fillStyle=c.color;
        ctx.fillRect(-6,-6,12,3);
        // Quiver on back
        ctx.fillStyle='#543';
        ctx.fillRect(-8,-5,3,10);
        ctx.fillStyle=c.color;
        ctx.fillRect(-8,-6,3,2);
        // Arrow tips
        ctx.fillStyle='#aaa';
        ctx.fillRect(-7,-7,1,2);
        ctx.fillRect(-8,-7,1,2);
        // Head
        ctx.fillStyle='#eca';
        ctx.beginPath(); ctx.arc(0,-9,5,0,Math.PI*2); ctx.fill();
        // Hood
        ctx.fillStyle='#453';
        ctx.beginPath();
        ctx.arc(0,-9,6,Math.PI,0);
        ctx.fill();
        // Eyes
        ctx.fillStyle='#fff';
        ctx.fillRect(-3,-10,2,2);
        ctx.fillRect(1,-10,2,2);
        ctx.fillStyle='#000';
        ctx.fillRect(-2,-10,1,1);
        ctx.fillRect(2,-10,1,1);
        // Bow
        ctx.save(); ctx.rotate(f);
        ctx.strokeStyle='#862'; ctx.lineWidth=2;
        ctx.beginPath();
        ctx.arc(10,0,8,-.8,.8);
        ctx.stroke();
        // Bowstring
        ctx.strokeStyle='#ccc'; ctx.lineWidth=1;
        ctx.beginPath();
        ctx.moveTo(10+Math.cos(-.8)*8, Math.sin(-.8)*8);
        ctx.lineTo(10+Math.cos(.8)*8, Math.sin(.8)*8);
        ctx.stroke();
        ctx.restore();
    }
};
