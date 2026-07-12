// ============ ENEMIES — pixel art sprites ============
const ENEMY_TYPES = [
    { name:'Зомби', color:'#5a5', color2:'#384', r:9, hpMul:1, spdMul:1, dmgMul:1, xpMul:1, draw:'zombie' },
    { name:'Скелет', color:'#cc9', color2:'#aa7', r:8, hpMul:.7, spdMul:1.4, dmgMul:.8, xpMul:1.2, draw:'skeleton' },
    { name:'Слизь', color:'#4c4', color2:'#2a2', r:10, hpMul:1.5, spdMul:.7, dmgMul:1.2, xpMul:1.5, draw:'slime' },
    { name:'Летучая мышь', color:'#a6a', color2:'#848', r:7, hpMul:.5, spdMul:2, dmgMul:.6, xpMul:1, draw:'bat' },
    { name:'Рыцарь', color:'#999', color2:'#666', r:11, hpMul:2.5, spdMul:.8, dmgMul:1.5, xpMul:2, draw:'knight' },
    { name:'Призрак', color:'#aaf', color2:'#88c', r:8, hpMul:.8, spdMul:1.3, dmgMul:1, xpMul:1.3, draw:'ghost' }
];

const Enemies = {
    list: [],

    spawn(px, py, elapsed) {
        if (this.list.length >= CFG.MAX_ENEMIES) return;
        const mins = elapsed / 60;
        const scale = 1 + mins * CFG.DIFFICULTY_SCALE;
        const angle = Math.random() * Math.PI * 2;
        const dist = U.rand(CFG.SPAWN_MIN_DIST, CFG.SPAWN_MAX_DIST);
        let ex = U.clamp(px + Math.cos(angle)*dist, 20, CFG.WORLD_W-20);
        let ey = U.clamp(py + Math.sin(angle)*dist, 20, CFG.WORLD_H-20);
        const available = mins<1?ENEMY_TYPES.slice(0,2):mins<3?ENEMY_TYPES.slice(0,4):ENEMY_TYPES;
        const type = U.pick(available);
        this.list.push({
            x:ex, y:ey, r:type.r,
            hp:Math.floor(CFG.ENEMY_BASE_HP*type.hpMul*scale),
            maxHp:Math.floor(CFG.ENEMY_BASE_HP*type.hpMul*scale),
            speed:CFG.ENEMY_BASE_SPEED*type.spdMul*(1+mins*.02),
            dmg:Math.floor(CFG.ENEMY_BASE_DMG*type.dmgMul*scale),
            xp:Math.ceil(CFG.ENEMY_BASE_XP*type.xpMul*Math.sqrt(scale)),
            color:type.color, color2:type.color2,
            alive:true, slow:1, slowTimer:0, boss:false, dmgTimer:0,
            drawType:type.draw, anim:Math.random()*10, flipX:Math.random()>.5?1:-1
        });
    },

    spawnBoss(px, py, elapsed) {
        const mins=elapsed/60, scale=1+mins*CFG.DIFFICULTY_SCALE;
        const angle=Math.random()*Math.PI*2;
        let ex=U.clamp(px+Math.cos(angle)*CFG.SPAWN_MAX_DIST,40,CFG.WORLD_W-40);
        let ey=U.clamp(py+Math.sin(angle)*CFG.SPAWN_MAX_DIST,40,CFG.WORLD_H-40);
        this.list.push({
            x:ex,y:ey,r:CFG.BOSS_RADIUS,
            hp:Math.floor(CFG.ENEMY_BASE_HP*CFG.BOSS_HP_MULT*scale),
            maxHp:Math.floor(CFG.ENEMY_BASE_HP*CFG.BOSS_HP_MULT*scale),
            speed:CFG.ENEMY_BASE_SPEED*CFG.BOSS_SPEED_MULT,
            dmg:Math.floor(CFG.ENEMY_BASE_DMG*CFG.BOSS_DMG_MULT*scale),
            xp:Math.ceil(CFG.ENEMY_BASE_XP*CFG.BOSS_XP_MULT),
            color:'#f44',color2:'#a22',
            alive:true,slow:1,slowTimer:0,boss:true,dmgTimer:0,
            drawType:'boss',anim:0,flipX:1
        });
        Snd.play('boss');
        FX.bossWarning();
    },

    update(dt, player) {
        for (let i=this.list.length-1;i>=0;i--) {
            const e=this.list[i];
            e.anim+=dt;
            if (e.hp<=0) {
                Gems.spawn(e.x,e.y,e.xp,e.boss);
                FX.spawn(e.x,e.y,e.color,e.boss?15:6,e.boss?120:70);
                if (e.boss) { FX.flash('#ff0',.4); Cam.addShake(10); }
                FX.dmgNum(e.x,e.y-10,e.xp,'#4f4');
                Snd.play('kill',.1);
                player.kills++;
                this.list.splice(i,1);
                continue;
            }
            if (e.slowTimer>0) { e.slowTimer-=dt*1000; if(e.slowTimer<=0)e.slow=1; }
            const a=U.angle(e,player);
            const nightSpd = World.isNight() ? CFG.NIGHT_SPEED_MULT : 1;
            const spd=e.speed*e.slow*nightSpd*dt;
            e.x+=Math.cos(a)*spd; e.y+=Math.sin(a)*spd;
            e.flipX=Math.cos(a)>0?1:-1;
            // Wall collision
            World.resolveCollision(e);
            e.dmgTimer-=dt*1000;
            if (U.dist(e,player)<e.r+player.r && e.dmgTimer<=0) {
                const nightDmg = World.isNight() ? CFG.NIGHT_DMG_MULT : 1;
                player.hp-=Math.floor(e.dmg*nightDmg);
                e.dmgTimer=500;
                FX.spawn(player.x,player.y,'#f00',5);
                FX.dmgNum(player.x,player.y,e.dmg,'#f44');
                FX.flash('#f00',.15);
                Cam.addShake(4);
                player.invuln=.2;
            }
        }
    },

    draw(ctx) {
        for (const e of this.list) {
            ctx.save();
            ctx.translate(e.x|0, e.y|0);
            ctx.scale(e.flipX, 1);

            // Shadow
            ctx.fillStyle='rgba(0,0,0,0.3)';
            ctx.beginPath(); ctx.ellipse(0,e.r+3,e.r*.8,3,0,0,Math.PI*2); ctx.fill();

            switch(e.drawType) {
                case 'zombie': this._zombie(ctx,e); break;
                case 'skeleton': this._skeleton(ctx,e); break;
                case 'slime': this._slime(ctx,e); break;
                case 'bat': this._bat(ctx,e); break;
                case 'knight': this._knight(ctx,e); break;
                case 'ghost': this._ghost(ctx,e); break;
                case 'boss': this._boss(ctx,e); break;
            }

            ctx.restore();

            // HP bar
            if (e.hp<e.maxHp) {
                const bw=e.r*2.5+4, bh=e.boss?5:3;
                const bx=e.x-bw/2, by=e.y-e.r-(e.boss?14:9);
                ctx.fillStyle='rgba(0,0,0,.6)';
                ctx.fillRect(bx-1,by-1,bw+2,bh+2);
                ctx.fillStyle='#300';
                ctx.fillRect(bx,by,bw,bh);
                ctx.fillStyle=e.boss?'#f44':'#4f4';
                ctx.fillRect(bx,by,bw*(e.hp/e.maxHp),bh);
            }
        }
    },

    _zombie(ctx,e) {
        const bob=Math.sin(e.anim*3)*1;
        // Body
        ctx.fillStyle=e.color;
        ctx.fillRect(-5,-5+bob,10,10);
        // Torn shirt
        ctx.fillStyle='#886';
        ctx.fillRect(-5,-5+bob,10,3);
        // Head
        ctx.fillStyle=e.color2;
        ctx.beginPath(); ctx.arc(0,-8+bob,5,0,Math.PI*2); ctx.fill();
        // Eyes
        ctx.fillStyle='#ff0';
        ctx.fillRect(-3,-9+bob,2,2);
        ctx.fillRect(1,-9+bob,2,2);
        // Arms reaching out
        ctx.fillStyle=e.color;
        ctx.fillRect(5,-3+bob,6,2);
        ctx.fillRect(-11,-3+bob,6,2);
        // Legs
        ctx.fillStyle='#443';
        const lob=Math.sin(e.anim*4)*2;
        ctx.fillRect(-3,5+lob,3,5);
        ctx.fillRect(1,5-lob,3,5);
    },

    _skeleton(ctx,e) {
        const bob=Math.sin(e.anim*4)*.5;
        ctx.fillStyle=e.color;
        // Ribcage
        ctx.fillRect(-4,-4+bob,8,8);
        ctx.fillStyle='#000';
        ctx.fillRect(-2,-2+bob,1,4);
        ctx.fillRect(1,-2+bob,1,4);
        // Skull
        ctx.fillStyle=e.color;
        ctx.beginPath(); ctx.arc(0,-7+bob,4.5,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#000';
        ctx.fillRect(-3,-8+bob,2,2);
        ctx.fillRect(1,-8+bob,2,2);
        ctx.fillRect(-1,-5+bob,2,1);
        // Bone arms
        ctx.fillStyle=e.color;
        ctx.fillRect(4,-2+bob,5,1.5);
        ctx.fillRect(-9,-2+bob,5,1.5);
        // Legs
        ctx.fillRect(-3,4,2,5);
        ctx.fillRect(1,4,2,5);
    },

    _slime(ctx,e) {
        const squish=1+Math.sin(e.anim*2)*.1;
        ctx.save(); ctx.scale(1/squish, squish);
        ctx.fillStyle=e.color;
        ctx.beginPath();
        ctx.ellipse(0,0,e.r,e.r*.8,0,0,Math.PI*2);
        ctx.fill();
        // Shiny
        ctx.fillStyle='#fff'; ctx.globalAlpha=.3;
        ctx.beginPath(); ctx.arc(-3,-3,3,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=1;
        // Face
        ctx.fillStyle='#000';
        ctx.fillRect(-4,-2,2,3);
        ctx.fillRect(2,-2,2,3);
        // Mouth
        ctx.fillRect(-2,2,4,1);
        ctx.restore();
    },

    _bat(ctx,e) {
        const wing=Math.sin(e.anim*8)*.6;
        // Body
        ctx.fillStyle=e.color;
        ctx.beginPath(); ctx.arc(0,0,4,0,Math.PI*2); ctx.fill();
        // Wings
        ctx.fillStyle=e.color2;
        ctx.save(); ctx.rotate(wing);
        ctx.beginPath();
        ctx.moveTo(4,-2); ctx.lineTo(12,-6); ctx.lineTo(10,0); ctx.lineTo(4,1);
        ctx.fill();
        ctx.restore();
        ctx.save(); ctx.rotate(-wing);
        ctx.beginPath();
        ctx.moveTo(-4,-2); ctx.lineTo(-12,-6); ctx.lineTo(-10,0); ctx.lineTo(-4,1);
        ctx.fill();
        ctx.restore();
        // Eyes
        ctx.fillStyle='#f00';
        ctx.fillRect(-2,-2,1.5,1.5);
        ctx.fillRect(1,-2,1.5,1.5);
        // Fangs
        ctx.fillStyle='#fff';
        ctx.fillRect(-1,2,1,2);
        ctx.fillRect(1,2,1,2);
    },

    _knight(ctx,e) {
        const bob=Math.sin(e.anim*2.5)*.5;
        // Armor body
        ctx.fillStyle=e.color;
        ctx.fillRect(-7,-6+bob,14,14);
        ctx.fillStyle=e.color2;
        ctx.fillRect(-7,-6+bob,14,2);
        ctx.fillRect(-7,6+bob,14,2);
        // Cross
        ctx.fillStyle='#c00';
        ctx.fillRect(-1,-3+bob,2,8);
        ctx.fillRect(-4,0+bob,8,2);
        // Helmet
        ctx.fillStyle=e.color;
        ctx.beginPath(); ctx.arc(0,-10+bob,6,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#333';
        ctx.fillRect(-4,-11+bob,8,2); // visor
        // Shield
        ctx.fillStyle='#c00';
        ctx.fillRect(-10,-2+bob,4,8);
        ctx.strokeStyle='#ff0'; ctx.lineWidth=1;
        ctx.strokeRect(-10,-2+bob,4,8);
        // Sword
        ctx.fillStyle='#ccc';
        ctx.fillRect(7,-4+bob,2,10);
        ctx.fillStyle='#ff0';
        ctx.fillRect(6,5+bob,4,2);
        // Legs
        ctx.fillStyle='#666';
        ctx.fillRect(-4,8,3,5);
        ctx.fillRect(2,8,3,5);
    },

    _ghost(ctx,e) {
        const wave=Math.sin(e.anim*3)*3;
        ctx.globalAlpha=.7;
        ctx.fillStyle=e.color;
        // Wavy body
        ctx.beginPath();
        ctx.arc(0,-2+wave,7,Math.PI,0);
        ctx.lineTo(7,5+wave);
        ctx.quadraticCurveTo(5,8+wave,3.5,5+wave);
        ctx.quadraticCurveTo(2,8+wave,0,5+wave);
        ctx.quadraticCurveTo(-2,8+wave,-3.5,5+wave);
        ctx.quadraticCurveTo(-5,8+wave,-7,5+wave);
        ctx.fill();
        // Eyes
        ctx.fillStyle='#000';
        ctx.beginPath(); ctx.arc(-3,-3+wave,2,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(3,-3+wave,2,0,Math.PI*2); ctx.fill();
        // Glow eyes
        ctx.fillStyle='#fff';
        ctx.fillRect(-3.5,-3.5+wave,1,1);
        ctx.fillRect(2.5,-3.5+wave,1,1);
        ctx.globalAlpha=1;
    },

    _boss(ctx,e) {
        const pulse=Math.sin(e.anim*2)*.05;
        const r=e.r;
        ctx.save(); ctx.scale(1+pulse,1+pulse);
        // Glow
        ctx.globalAlpha=.15;
        ctx.fillStyle='#f00';
        ctx.beginPath(); ctx.arc(0,0,r+10,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=1;
        // Body
        ctx.fillStyle=e.color;
        ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill();
        // Armor plates
        ctx.fillStyle=e.color2;
        ctx.fillRect(-r,-r*.3,r*2,3);
        ctx.fillRect(-r,r*.3,r*2,3);
        // Horns
        ctx.fillStyle='#ff0';
        ctx.beginPath();
        ctx.moveTo(-8,-r+2); ctx.lineTo(-12,-r-10); ctx.lineTo(-4,-r+2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(8,-r+2); ctx.lineTo(12,-r-10); ctx.lineTo(4,-r+2);
        ctx.fill();
        // Face
        ctx.fillStyle='#f00';
        ctx.fillRect(-6,-5,4,4);
        ctx.fillRect(2,-5,4,4);
        ctx.fillStyle='#fff';
        ctx.fillRect(-5,-4,2,2);
        ctx.fillRect(3,-4,2,2);
        // Mouth
        ctx.fillStyle='#600';
        ctx.fillRect(-5,3,10,3);
        ctx.fillStyle='#fff';
        for(let i=-4;i<5;i+=2) ctx.fillRect(i,3,1,2);
        ctx.restore();
    },

    clear() { this.list=[]; }
};
