// ============ NEON STORM — arcade twin-stick shooter ============
const W=1200,H=800; // world size
let cv,ctx,lt=0,t=0;
// Player
const P={x:W/2,y:H/2,r:8,vx:0,vy:0,speed:240,hp:5,maxHp:5,
    fireRate:120,fireTimer:0,spread:1,dmg:1,shield:0,
    combo:0,comboTimer:0,maxCombo:0,score:0,hiScore:0,
    alive:true,invuln:0,
    // Powerups
    spreadShot:0,rapidFire:0,nukeReady:true,magnetRange:60};
// State
let state='menu',enemies=[],bullets=[],particles=[],powerups=[],
    wave=0,waveTimer=0,spawnTimer=0,slowMo=0,screenShake=0,
    flashAlpha=0,flashColor='#fff',bossActive=false;
// Input
const keys={};let joyDx=0,joyDy=0,joyActive=false,joyId=-1,joyBx=0,joyBy=0;
// Audio
let audioCtx;

function init(){
    cv=document.getElementById('game');ctx=cv.getContext('2d');
    resize();window.addEventListener('resize',resize);
    window.addEventListener('keydown',e=>keys[e.code]=true);
    window.addEventListener('keyup',e=>keys[e.code]=false);
    cv.addEventListener('touchstart',e=>{e.preventDefault();const t2=e.changedTouches[0];const p=tp(t2);
        if(state==='menu'||state==='over'){startGame();return;}
        if(p.x<cv.width*.4){joyActive=true;joyId=t2.identifier;joyBx=p.x;joyBy=p.y;}
        else if(P.nukeReady&&P.alive){nuke();}
    },{passive:false});
    cv.addEventListener('touchmove',e=>{e.preventDefault();for(const t2 of e.changedTouches){if(t2.identifier===joyId){const p=tp(t2);const dx=p.x-joyBx,dy=p.y-joyBy;const d=Math.sqrt(dx*dx+dy*dy);if(d>8){const c=Math.min(d,50);joyDx=dx/d*(c/50);joyDy=dy/d*(c/50);}else{joyDx=0;joyDy=0;}}}},{passive:false});
    cv.addEventListener('touchend',e=>{e.preventDefault();for(const t2 of e.changedTouches){if(t2.identifier===joyId){joyActive=false;joyId=-1;joyDx=0;joyDy=0;}}},{passive:false});
    cv.addEventListener('mousedown',e=>{if(state!=='play')startGame();else if(P.nukeReady)nuke();});
    try{audioCtx=new(window.AudioContext||window.webkitAudioContext)();}catch(e){}
    lt=performance.now();requestAnimationFrame(loop);
}
function resize(){cv.width=window.innerWidth;cv.height=window.innerHeight;}
function tp(t){const r=cv.getBoundingClientRect();return{x:(t.clientX-r.left)*(cv.width/r.width),y:(t.clientY-r.top)*(cv.height/r.height)};}

// ── SOUND ──
function snd(type){
    if(!audioCtx)return;const n=audioCtx.currentTime;
    const o=audioCtx.createOscillator(),g=audioCtx.createGain();
    o.connect(g);g.connect(audioCtx.destination);
    switch(type){
        case'shoot':o.type='square';o.frequency.setValueAtTime(800,n);o.frequency.exponentialRampToValueAtTime(200,n+.04);g.gain.setValueAtTime(.08,n);g.gain.exponentialRampToValueAtTime(.001,n+.04);o.start(n);o.stop(n+.04);break;
        case'hit':o.type='sawtooth';o.frequency.setValueAtTime(300,n);o.frequency.exponentialRampToValueAtTime(50,n+.1);g.gain.setValueAtTime(.12,n);g.gain.exponentialRampToValueAtTime(.001,n+.1);o.start(n);o.stop(n+.1);break;
        case'explode':o.type='sawtooth';o.frequency.setValueAtTime(150,n);o.frequency.exponentialRampToValueAtTime(15,n+.3);g.gain.setValueAtTime(.15,n);g.gain.exponentialRampToValueAtTime(.001,n+.3);o.start(n);o.stop(n+.3);break;
        case'powerup':o.type='sine';o.frequency.setValueAtTime(400,n);o.frequency.linearRampToValueAtTime(800,n+.1);o.frequency.linearRampToValueAtTime(1200,n+.2);g.gain.setValueAtTime(.1,n);g.gain.exponentialRampToValueAtTime(.001,n+.25);o.start(n);o.stop(n+.25);break;
        case'nuke':o.type='sawtooth';o.frequency.setValueAtTime(60,n);o.frequency.exponentialRampToValueAtTime(10,n+.8);g.gain.setValueAtTime(.2,n);g.gain.exponentialRampToValueAtTime(.001,n+.8);o.start(n);o.stop(n+.8);break;
        case'death':o.type='sawtooth';o.frequency.setValueAtTime(400,n);o.frequency.exponentialRampToValueAtTime(20,n+1);g.gain.setValueAtTime(.15,n);g.gain.exponentialRampToValueAtTime(.001,n+1);o.start(n);o.stop(n+1);break;
        case'combo':o.type='sine';o.frequency.setValueAtTime(600+P.combo*20,n);g.gain.setValueAtTime(.06,n);g.gain.exponentialRampToValueAtTime(.001,n+.05);o.start(n);o.stop(n+.05);break;
    }
}

// ── GAME START ──
function startGame(){
    if(audioCtx&&audioCtx.state==='suspended')audioCtx.resume();
    P.x=W/2;P.y=H/2;P.vx=0;P.vy=0;P.hp=5;P.maxHp=5;P.alive=true;P.invuln=1;
    P.fireRate=120;P.fireTimer=0;P.spread=1;P.dmg=1;P.shield=0;
    P.combo=0;P.comboTimer=0;P.maxCombo=0;P.score=0;
    P.spreadShot=0;P.rapidFire=0;P.nukeReady=true;P.magnetRange=60;
    enemies=[];bullets=[];particles=[];powerups=[];
    wave=0;waveTimer=2;spawnTimer=0;slowMo=0;screenShake=0;
    flashAlpha=0;bossActive=false;
    state='play';
}

// ── ENEMY TYPES ──
const ETYPES=[
    {name:'drone',r:7,hp:1,speed:80,color:'#f44',score:10,behavior:'chase'},
    {name:'zigzag',r:6,hp:1,speed:120,color:'#f80',score:15,behavior:'zigzag'},
    {name:'orbit',r:8,hp:2,speed:60,color:'#ff0',score:20,behavior:'orbit'},
    {name:'splitter',r:10,hp:2,speed:50,color:'#4f4',score:25,behavior:'chase',splits:true},
    {name:'sniper',r:6,hp:1,speed:40,color:'#f4f',score:30,behavior:'snipe',shootTimer:0},
    {name:'tank',r:14,hp:6,speed:30,color:'#4ff',score:50,behavior:'chase'},
    {name:'ghost',r:7,hp:1,speed:100,color:'#aaf',score:20,behavior:'phase',alpha:1},
    {name:'swarm',r:4,hp:1,speed:150,color:'#fa4',score:8,behavior:'chase'}
];

function spawnEnemy(type,x,y){
    const def=typeof type==='string'?ETYPES.find(e=>e.name===type):ETYPES[type%ETYPES.length];
    const scale=1+wave*.08;
    if(!x){const a=Math.random()*Math.PI*2;const d=Math.max(W,H)*.6;x=P.x+Math.cos(a)*d;y=P.y+Math.sin(a)*d;}
    enemies.push({...def,x,y,hp:Math.ceil(def.hp*scale),maxHp:Math.ceil(def.hp*scale),
        speed:def.speed*(1+wave*.02),vx:0,vy:0,age:0,
        shootTimer:def.shootTimer||0,splits:def.splits||false,
        alpha:def.alpha||1,boss:false,phaseTimer:0});
}

function spawnBoss(){
    const a=Math.random()*Math.PI*2;const d=400;
    const hp=50+wave*20;
    enemies.push({name:'BOSS',r:30,hp,maxHp:hp,speed:35,color:'#f0f',
        x:P.x+Math.cos(a)*d,y:P.y+Math.sin(a)*d,
        vx:0,vy:0,score:500,behavior:'boss',age:0,
        shootTimer:0,boss:true,alpha:1,phaseTimer:0,splits:false});
    bossActive=true;
    flash('#f0f',.3);
}

// ── MAIN LOOP ──
function loop(time){
    const rawDt=Math.min((time-lt)/1000,.05);lt=time;
    const dt=rawDt*(slowMo>0?.3:1);
    t+=dt;
    if(slowMo>0)slowMo-=rawDt;

    if(state==='play')update(dt,rawDt);
    draw();
    requestAnimationFrame(loop);
}

function update(dt){
    // ── PLAYER ──
    let dx=0,dy=0;
    if(keys.KeyW||keys.ArrowUp)dy=-1;if(keys.KeyS||keys.ArrowDown)dy=1;
    if(keys.KeyA||keys.ArrowLeft)dx=-1;if(keys.KeyD||keys.ArrowRight)dx=1;
    if(joyActive){dx=joyDx;dy=joyDy;}
    if(dx||dy){const d=Math.sqrt(dx*dx+dy*dy);dx/=d;dy/=d;}
    P.vx+=(dx*P.speed-P.vx)*dt*8;P.vy+=(dy*P.speed-P.vy)*dt*8;
    P.x+=P.vx*dt;P.y+=P.vy*dt;
    P.x=Math.max(P.r,Math.min(W-P.r,P.x));P.y=Math.max(P.r,Math.min(H-P.r,P.y));

    if(P.invuln>0)P.invuln-=dt;
    if(P.spreadShot>0)P.spreadShot-=dt;
    if(P.rapidFire>0)P.rapidFire-=dt;

    // Auto-fire at nearest enemy
    P.fireTimer-=dt*1000;
    if(P.fireTimer<=0&&enemies.length>0){
        const rate=P.rapidFire>0?P.fireRate*.4:P.fireRate;
        P.fireTimer=rate;
        let best=null,bd=Infinity;
        for(const e of enemies){const d=dist(P,e);if(d<bd){bd=d;best=e;}}
        if(best){
            const a=Math.atan2(best.y-P.y,best.x-P.x);
            const spread=P.spreadShot>0?P.spread+2:P.spread;
            for(let s=0;s<spread;s++){
                const sa=a+(s-(spread-1)/2)*.15;
                bullets.push({x:P.x+Math.cos(sa)*12,y:P.y+Math.sin(sa)*12,
                    vx:Math.cos(sa)*500,vy:Math.sin(sa)*500,life:.8,dmg:P.dmg,
                    color:P.rapidFire>0?'#f44':P.spreadShot>0?'#4ff':'#ff0'});
            }
            snd('shoot');
        }
    }

    // Combo timer
    if(P.comboTimer>0){P.comboTimer-=dt;if(P.comboTimer<=0){P.combo=0;}}

    // ── BULLETS ──
    for(let i=bullets.length-1;i>=0;i--){
        const b=bullets[i];b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
        if(b.life<=0||b.x<-20||b.x>W+20||b.y<-20||b.y>H+20){bullets.splice(i,1);continue;}
        // Hit enemies
        for(let j=enemies.length-1;j>=0;j--){
            const e=enemies[j];
            if(dist(b,e)<b.r+e.r+3){
                e.hp-=b.dmg;b.life=0;
                spawn_particles(e.x,e.y,e.color,4,60);
                snd('hit');
                if(e.hp<=0) killEnemy(j);
                break;
            }
        }
    }

    // ── ENEMIES ──
    for(let i=enemies.length-1;i>=0;i--){
        const e=enemies[i];e.age+=dt;
        const spd=e.speed*dt;
        const toP=Math.atan2(P.y-e.y,P.x-e.x);

        switch(e.behavior){
            case'chase':e.x+=Math.cos(toP)*spd;e.y+=Math.sin(toP)*spd;break;
            case'zigzag':e.x+=Math.cos(toP+Math.sin(e.age*5)*1)*spd;e.y+=Math.sin(toP+Math.sin(e.age*5)*1)*spd;break;
            case'orbit':
                const orbitR=120+Math.sin(e.age*.5)*40;
                e.x+=(P.x+Math.cos(e.age*1.5)*orbitR-e.x)*dt*1.5;
                e.y+=(P.y+Math.sin(e.age*1.5)*orbitR-e.y)*dt*1.5;break;
            case'snipe':
                if(dist(P,e)>200)e.x+=Math.cos(toP)*spd;else e.x-=Math.cos(toP)*spd*.3;
                e.y+=Math.sin(toP)*spd*(dist(P,e)>200?1:-.3);
                e.shootTimer+=dt*1000;
                if(e.shootTimer>1500){e.shootTimer=0;
                    const a=Math.atan2(P.y-e.y,P.x-e.x);
                    enemies.push({name:'ebullet',r:3,hp:1,maxHp:1,speed:200,color:'#f4f',x:e.x,y:e.y,
                        vx:Math.cos(a)*200,vy:Math.sin(a)*200,score:0,behavior:'linear',age:0,
                        shootTimer:0,boss:false,alpha:1,splits:false,phaseTimer:0});
                }break;
            case'phase':
                e.phaseTimer+=dt;e.alpha=.3+Math.sin(e.phaseTimer*3)*.35+.35;
                e.x+=Math.cos(toP)*spd;e.y+=Math.sin(toP)*spd;break;
            case'linear':e.x+=e.vx*dt;e.y+=e.vy*dt;if(e.age>3)e.hp=0;break;
            case'boss':
                e.x+=Math.cos(toP+Math.sin(e.age*.8)*.5)*spd;
                e.y+=Math.sin(toP+Math.sin(e.age*.8)*.5)*spd;
                e.shootTimer+=dt*1000;
                if(e.shootTimer>800){e.shootTimer=0;
                    for(let s=0;s<8;s++){
                        const a=s*Math.PI/4+e.age;
                        enemies.push({name:'ebullet',r:3,hp:1,maxHp:1,speed:150,color:'#f0f',x:e.x+Math.cos(a)*20,y:e.y+Math.sin(a)*20,
                            vx:Math.cos(a)*150,vy:Math.sin(a)*150,score:0,behavior:'linear',age:0,
                            shootTimer:0,boss:false,alpha:1,splits:false,phaseTimer:0});
                    }
                }break;
        }
        // Clamp to world
        e.x=Math.max(-50,Math.min(W+50,e.x));e.y=Math.max(-50,Math.min(H+50,e.y));

        // Hit player
        if(P.alive&&P.invuln<=0&&dist(P,e)< P.r+e.r-2&&e.alpha>.5){
            if(P.shield>0){P.shield--;spawn_particles(P.x,P.y,'#4ff',10,80);snd('hit');e.hp=0;if(e.hp<=0)killEnemy(i);}
            else{P.hp--;P.invuln=1.5;screenShake=8;flash('#f00',.3);snd('death');spawn_particles(P.x,P.y,'#f44',15,100);
                if(P.hp<=0){P.alive=false;state='over';spawn_particles(P.x,P.y,'#fff',30,150);P.hiScore=Math.max(P.hiScore,P.score);}
                e.hp=0;if(e.hp<=0&&i<enemies.length)killEnemy(i);
            }
        }
    }

    // ── POWERUPS ──
    for(let i=powerups.length-1;i>=0;i--){
        const pw=powerups[i];pw.age+=dt;
        // Magnet toward player
        const d=dist(P,pw);
        if(d<P.magnetRange){const a=Math.atan2(P.y-pw.y,P.x-pw.x);pw.x+=Math.cos(a)*300*dt;pw.y+=Math.sin(a)*300*dt;}
        if(d<P.r+pw.r){
            applyPowerup(pw.type);powerups.splice(i,1);snd('powerup');flash(pw.color,.15);continue;
        }
        if(pw.age>12)powerups.splice(i,1);
    }

    // ── WAVES ──
    waveTimer-=dt;
    if(waveTimer<=0&&!bossActive){
        wave++;waveTimer=wave%5===0?99:8+wave*.5; // boss wave = wait until killed
        if(wave%5===0){spawnBoss();}
        else{
            const count=5+wave*2;
            for(let i=0;i<count;i++){
                const typeIdx=Math.floor(Math.random()*Math.min(ETYPES.length,2+wave));
                setTimeout(()=>spawnEnemy(typeIdx),i*200);
            }
        }
    }

    // ── PARTICLES ──
    for(let i=particles.length-1;i>=0;i--){
        const p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.96;p.vy*=.96;p.life-=dt;
        if(p.life<=0)particles.splice(i,1);
    }

    // Effects decay
    if(screenShake>0)screenShake*=.9;
    if(flashAlpha>0)flashAlpha-=dt*2;
}

function killEnemy(idx){
    const e=enemies[idx];
    const mult=1+P.combo*.1;
    P.score+=Math.floor(e.score*mult);
    P.combo++;P.comboTimer=2;
    P.maxCombo=Math.max(P.maxCombo,P.combo);
    snd('combo');

    spawn_particles(e.x,e.y,e.color,e.boss?25:8,e.boss?120:70);
    if(e.boss){screenShake=15;flash('#ff0',.5);slowMo=.5;snd('nuke');bossActive=false;waveTimer=3;}
    else{screenShake=Math.max(screenShake,3);if(P.combo%10===0)slowMo=.15;}

    // Splitters spawn 2 smaller
    if(e.splits){
        for(let s=0;s<2;s++){spawnEnemy('drone',e.x+(s?10:-10),e.y);}
    }

    // Drop powerup (15% chance, boss=100%)
    if(e.boss||Math.random()<.15){
        const types=['spread','rapid','shield','heal','nuke','magnet'];
        const type=types[Math.floor(Math.random()*types.length)];
        const colors={spread:'#4ff',rapid:'#f44',shield:'#44f',heal:'#4f4',nuke:'#ff0',magnet:'#f80'};
        powerups.push({x:e.x,y:e.y,r:8,type,color:colors[type],age:0});
    }

    enemies.splice(idx,1);
}

function applyPowerup(type){
    switch(type){
        case'spread':P.spreadShot=8;break;
        case'rapid':P.rapidFire=6;break;
        case'shield':P.shield=Math.min(3,P.shield+1);break;
        case'heal':P.hp=Math.min(P.maxHp,P.hp+1);break;
        case'nuke':P.nukeReady=true;break;
        case'magnet':P.magnetRange=Math.min(200,P.magnetRange+30);break;
    }
}

function nuke(){
    if(!P.nukeReady||!P.alive)return;P.nukeReady=false;
    flash('#fff',.6);screenShake=20;slowMo=.8;snd('nuke');
    for(let i=enemies.length-1;i>=0;i--){
        if(enemies[i].boss){enemies[i].hp-=20;spawn_particles(enemies[i].x,enemies[i].y,'#ff0',10,80);}
        else killEnemy(i);
    }
}

// ── HELPERS ──
function dist(a,b){return Math.sqrt((a.x-b.x)**2+(a.y-b.y)**2);}
function spawn_particles(x,y,color,n,spd){
    for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2;const s=spd*(.3+Math.random()*.7);
        particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.4+Math.random()*.3,maxLife:.7,color,sz:2+Math.random()*3});}
}
function flash(c,a){flashColor=c;flashAlpha=a;}

// ══════════ DRAW ══════════
function draw(){
    const cw=cv.width,ch=cv.height;
    ctx.fillStyle='#08080c';ctx.fillRect(0,0,cw,ch);

    if(state==='menu'){drawMenu(cw,ch);return;}

    // Camera: center on player, scale to fit world
    const scale=Math.min(cw/W,ch/H);
    const ox=(cw-W*scale)/2, oy=(ch-H*scale)/2;
    const sx=screenShake>0?(Math.random()-.5)*screenShake:0;
    const sy=screenShake>0?(Math.random()-.5)*screenShake:0;

    ctx.save();ctx.translate(ox+sx,oy+sy);ctx.scale(scale,scale);

    // Grid background
    ctx.strokeStyle='#151520';ctx.lineWidth=1;
    for(let gx=0;gx<W;gx+=60){ctx.beginPath();ctx.moveTo(gx,0);ctx.lineTo(gx,H);ctx.stroke();}
    for(let gy=0;gy<H;gy+=60){ctx.beginPath();ctx.moveTo(0,gy);ctx.lineTo(W,gy);ctx.stroke();}
    // Border
    ctx.strokeStyle='#2a2a3a';ctx.lineWidth=3;ctx.strokeRect(0,0,W,H);

    // ── POWERUPS ──
    for(const pw of powerups){
        const pulse=.6+Math.sin(t*6+pw.x)*.3;
        ctx.globalAlpha=pulse;ctx.fillStyle=pw.color;
        ctx.beginPath();ctx.arc(pw.x,pw.y,pw.r+2,0,Math.PI*2);ctx.fill();
        ctx.globalAlpha=1;ctx.fillStyle='#fff';
        ctx.beginPath();ctx.arc(pw.x,pw.y,pw.r*.5,0,Math.PI*2);ctx.fill();
    }

    // ── BULLETS ──
    for(const b of bullets){
        ctx.globalAlpha=.3;ctx.fillStyle=b.color;ctx.beginPath();ctx.arc(b.x,b.y,5,0,Math.PI*2);ctx.fill();
        ctx.globalAlpha=1;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(b.x,b.y,2,0,Math.PI*2);ctx.fill();
    }

    // ── ENEMIES ──
    for(const e of enemies){
        if(e.name==='ebullet'){
            ctx.fillStyle=e.color;ctx.beginPath();ctx.arc(e.x,e.y,e.r,0,Math.PI*2);ctx.fill();continue;
        }
        ctx.globalAlpha=e.alpha||1;
        // Glow
        ctx.fillStyle=e.color;ctx.globalAlpha*=.2;
        ctx.beginPath();ctx.arc(e.x,e.y,e.r+6,0,Math.PI*2);ctx.fill();
        ctx.globalAlpha=e.alpha||1;
        // Body shape (neon wireframe)
        ctx.strokeStyle=e.color;ctx.lineWidth=2;
        if(e.boss){
            // Boss: rotating hexagon
            ctx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3+e.age;ctx[i?'lineTo':'moveTo'](e.x+Math.cos(a)*e.r,e.y+Math.sin(a)*e.r);}ctx.closePath();ctx.stroke();
            ctx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3-e.age*.5;ctx[i?'lineTo':'moveTo'](e.x+Math.cos(a)*e.r*.6,e.y+Math.sin(a)*e.r*.6);}ctx.closePath();ctx.stroke();
        } else if(e.r>10){
            // Tank: square
            ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.age);
            ctx.strokeRect(-e.r,-e.r,e.r*2,e.r*2);ctx.restore();
        } else {
            // Others: triangle/diamond
            const sides=e.name==='zigzag'?3:4;
            ctx.beginPath();for(let i=0;i<sides;i++){const a=i*Math.PI*2/sides+e.age*2;ctx[i?'lineTo':'moveTo'](e.x+Math.cos(a)*e.r,e.y+Math.sin(a)*e.r);}ctx.closePath();ctx.stroke();
        }
        // HP bar for multi-hp enemies
        if(e.maxHp>1&&e.hp<e.maxHp){
            ctx.fillStyle='#300';ctx.fillRect(e.x-e.r,e.y-e.r-6,e.r*2,3);
            ctx.fillStyle=e.color;ctx.fillRect(e.x-e.r,e.y-e.r-6,e.r*2*(e.hp/e.maxHp),3);
        }
        ctx.globalAlpha=1;
    }

    // ── PLAYER ──
    if(P.alive){
        if(P.invuln<=0||Math.floor(P.invuln*10)%2===0){
            // Shield ring
            if(P.shield>0){
                ctx.strokeStyle='#4ff';ctx.lineWidth=2;ctx.globalAlpha=.4;
                for(let s=0;s<P.shield;s++){ctx.beginPath();ctx.arc(P.x,P.y,P.r+6+s*4,0,Math.PI*2);ctx.stroke();}
                ctx.globalAlpha=1;
            }
            // Glow
            ctx.globalAlpha=.15;ctx.fillStyle='#0ff';
            ctx.beginPath();ctx.arc(P.x,P.y,P.r+10,0,Math.PI*2);ctx.fill();
            ctx.globalAlpha=1;
            // Ship (triangle pointing toward nearest enemy or last direction)
            let aim=Math.atan2(P.vy,P.vx);
            if(enemies.length){let b=null,bd=Infinity;for(const e of enemies){const d=dist(P,e);if(d<bd){bd=d;b=e;}}if(b)aim=Math.atan2(b.y-P.y,b.x-P.x);}
            ctx.save();ctx.translate(P.x,P.y);ctx.rotate(aim);
            ctx.fillStyle='#0ff';
            ctx.beginPath();ctx.moveTo(P.r+2,0);ctx.lineTo(-P.r,-P.r*.7);ctx.lineTo(-P.r*.5,0);ctx.lineTo(-P.r,P.r*.7);ctx.closePath();ctx.fill();
            ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke();
            // Engine glow
            if(Math.abs(P.vx)>5||Math.abs(P.vy)>5){
                ctx.fillStyle='#08f';ctx.globalAlpha=.5+Math.sin(t*20)*.3;
                ctx.beginPath();ctx.moveTo(-P.r*.5,P.r*.3);ctx.lineTo(-P.r-6,0);ctx.lineTo(-P.r*.5,-P.r*.3);ctx.fill();
                ctx.globalAlpha=1;
            }
            ctx.restore();
        }
    }

    // ── PARTICLES ──
    for(const p of particles){
        const a=p.life/p.maxLife;
        ctx.globalAlpha=a;ctx.fillStyle=p.color;
        const s=p.sz*a;
        ctx.fillRect(p.x-s/2,p.y-s/2,s,s);
    }
    ctx.globalAlpha=1;

    ctx.restore(); // camera

    // ── SCREEN EFFECTS ──
    if(flashAlpha>0){ctx.globalAlpha=flashAlpha;ctx.fillStyle=flashColor;ctx.fillRect(0,0,cw,ch);ctx.globalAlpha=1;}
    if(slowMo>0){ctx.globalAlpha=.08;ctx.fillStyle='#fff';ctx.fillRect(0,0,cw,ch);ctx.globalAlpha=1;}

    // ── HUD ──
    ctx.fillStyle='#fff';ctx.font='bold 14px monospace';ctx.textAlign='left';ctx.textBaseline='top';
    ctx.fillText(`SCORE: ${P.score}`,10,10);
    // HP hearts
    for(let i=0;i<P.maxHp;i++){ctx.fillStyle=i<P.hp?'#f44':'#333';ctx.fillText('♥',10+i*18,30);}
    // Combo
    if(P.combo>1){
        ctx.fillStyle='#ff0';ctx.font=`bold ${14+P.combo}px monospace`;ctx.textAlign='center';
        ctx.fillText(`x${P.combo}`,cw/2,10);
    }
    // Wave
    ctx.fillStyle='#888';ctx.font='12px monospace';ctx.textAlign='right';
    ctx.fillText(`WAVE ${wave}`,cw-10,10);
    ctx.fillText(`ENEMIES: ${enemies.filter(e=>e.name!=='ebullet').length}`,cw-10,26);
    // Nuke
    if(P.nukeReady){ctx.fillStyle='#ff0';ctx.textAlign='left';ctx.fillText('💥 NUKE READY (tap right)',10,ch-20);}
    // Shield
    if(P.shield>0){ctx.fillStyle='#4ff';ctx.fillText(`🛡x${P.shield}`,10,50);}
    // Powerup timers
    if(P.spreadShot>0){ctx.fillStyle='#4ff';ctx.fillText(`SPREAD ${P.spreadShot.toFixed(1)}s`,10,70);}
    if(P.rapidFire>0){ctx.fillStyle='#f44';ctx.fillText(`RAPID ${P.rapidFire.toFixed(1)}s`,10,88);}

    // Game over overlay
    if(state==='over'){
        ctx.fillStyle='rgba(0,0,0,.7)';ctx.fillRect(0,0,cw,ch);
        ctx.fillStyle='#f44';ctx.font='bold 32px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText('GAME OVER',cw/2,ch*.3);
        ctx.fillStyle='#fff';ctx.font='18px monospace';
        ctx.fillText(`SCORE: ${P.score}`,cw/2,ch*.42);
        ctx.fillText(`WAVE: ${wave}`,cw/2,ch*.48);
        ctx.fillText(`MAX COMBO: x${P.maxCombo}`,cw/2,ch*.54);
        ctx.fillStyle='#ff0';ctx.fillText(`HI-SCORE: ${P.hiScore}`,cw/2,ch*.64);
        ctx.fillStyle='#888';ctx.font='14px monospace';
        ctx.fillText('Нажмите для рестарта',cw/2,ch*.78);
    }
}

function drawMenu(cw,ch){
    // Animated neon grid bg
    ctx.strokeStyle='#101020';ctx.lineWidth=1;
    for(let gx=0;gx<cw;gx+=50){const wx=gx+Math.sin(t+gx*.01)*5;ctx.beginPath();ctx.moveTo(wx,0);ctx.lineTo(wx,ch);ctx.stroke();}
    for(let gy=0;gy<ch;gy+=50){const wy=gy+Math.cos(t+gy*.01)*5;ctx.beginPath();ctx.moveTo(0,wy);ctx.lineTo(cw,wy);ctx.stroke();}

    // Floating particles
    for(let i=0;i<20;i++){
        const px=(Math.sin(i*3.7+t*.3)*.5+.5)*cw;
        const py=(Math.cos(i*2.3+t*.2)*.5+.5)*ch;
        ctx.fillStyle=['#f44','#0ff','#ff0','#f0f','#4f4'][i%5];ctx.globalAlpha=.15;
        ctx.beginPath();ctx.arc(px,py,4,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;

    ctx.fillStyle='#0ff';ctx.font='bold 42px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('NEON STORM',cw/2,ch*.2);
    ctx.fillStyle='#088';ctx.font='16px monospace';
    ctx.fillText('ARCADE SHOOTER',cw/2,ch*.2+38);

    ctx.fillStyle='#aaa';ctx.font='12px monospace';
    ctx.fillText('WASD / Джойстик — движение',cw/2,ch*.45);
    ctx.fillText('Стрельба автоматическая',cw/2,ch*.5);
    ctx.fillText('Тап справа / Клик — NUKE',cw/2,ch*.55);
    ctx.fillText('Убивай ▸ Комбо ▸ Пауэрапы ▸ Боссы',cw/2,ch*.62);

    if(P.hiScore>0){ctx.fillStyle='#ff0';ctx.fillText(`HI-SCORE: ${P.hiScore}`,cw/2,ch*.72);}

    ctx.fillStyle='#888';ctx.font='14px monospace';
    ctx.fillText('Нажмите чтобы начать',cw/2,ch*.85);
}

window.addEventListener('load',()=>{document.getElementById('loading').style.display='none';init();});
