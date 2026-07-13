// ============ UI — targeting system ============
const UI = {
    buttons:[],

    draw(ctx,cw,ch,panelY,leftW){
        this.buttons=[];
        const s=G.ship, isSub=G.shipType==='sub';
        const ph=ch-panelY-6;
        const bh=Math.min(28,ph*.11)|0;
        const gap=2;
        const fs=Math.max(7,Math.min(10,bh*.33))|0;

        const c1x=leftW+6;
        const availW=cw*.74-c1x;
        const colW=availW/(isSub?3:2)-4;
        const c2x=c1x+colW+8;
        const c3x=c2x+colW+8;
        let y;

        // ════ COL1: NAVIGATION ════
        y=panelY+4;
        this._lbl(ctx,c1x,y,'КУРС',fs-1);y+=fs+3;
        const dirSize=Math.min(bh,colW/4.5)|0;
        const dirs=[
            {label:'СЗ',da:-Math.PI*.75},{label:'С',da:-Math.PI/2},{label:'СВ',da:-Math.PI*.25},
            {label:'З',da:Math.PI},{label:'●',da:null},{label:'В',da:0},
            {label:'ЮЗ',da:Math.PI*.75},{label:'Ю',da:Math.PI/2},{label:'ЮВ',da:Math.PI*.25}
        ];
        for(let r=0;r<3;r++) for(let c=0;c<3;c++){
            const d=dirs[r*3+c], bx=c1x+c*(dirSize+2), by=y+r*(dirSize+2);
            if(d.da===null){ctx.fillStyle='#0a1a0a';ctx.fillRect(bx,by,dirSize,dirSize);ctx.strokeStyle='#2a4a2a';ctx.lineWidth=.5;ctx.strokeRect(bx,by,dirSize,dirSize);}
            else{const tA=(d.da+Math.PI*2)%(Math.PI*2),cA=(s.targetHeading+Math.PI*2)%(Math.PI*2),act=Math.abs(tA-cA)<.2||Math.abs(tA-cA-Math.PI*2)<.2;
            this._btn(ctx,bx,by,dirSize,dirSize,d.label,act?'#226622':'#141a22',fs-1,()=>{s.targetHeading=d.da;});}
        }
        y+=dirSize*3+gap*2;

        this._lbl(ctx,c1x,y,'МАШИНЫ',fs-1);y+=fs+2;
        const ew=(colW-6)/5;
        for(let i=0;i<5;i++){
            const eL=['⏹','▶','▶▶','▶▶▶','⚡'][i];
            const eC=['#444444','#224422','#224422','#444422','#442222'][i];
            this._btn(ctx,c1x+i*(ew+1),y,ew,bh*.75,eL,s.enginePower===i?eC:'#0e1218',fs-2,()=>{s.enginePower=i;});
        }
        y+=bh*.75+gap;
        ctx.fillStyle='#0a100a';ctx.fillRect(c1x,y,colW,bh*.5);
        ctx.fillStyle='#4f8';ctx.font=`bold ${fs-1}px monospace`;ctx.textAlign='left';ctx.textBaseline='middle';
        ctx.fillText(`${s.speed.toFixed(1)} уз`,c1x+4,y+bh*.25);

        // ════ COL2: TARGET → FIRE ════
        y=panelY+4;
        this._lbl(ctx,c2x,y,'ЦЕЛЬ',fs-1);y+=fs+3;

        // Target info box
        const tgt=G.selectedTarget, det=G.detectedEnemies.length;
        ctx.fillStyle='#080c14';ctx.fillRect(c2x,y,colW,bh*1.1);
        ctx.strokeStyle=tgt?'#0f0':'#222';ctx.lineWidth=1;ctx.strokeRect(c2x,y,colW,bh*1.1);
        if(tgt){
            const dist=Math.sqrt((tgt.x-s.x)**2+(tgt.y-s.y)**2)|0;
            const brg=((Math.atan2(tgt.y-s.y,tgt.x-s.x)*180/Math.PI)%360+360).toFixed(0);
            const age=G.t-(tgt.lastDetectTime||0);
            const fresh=age<3;
            ctx.fillStyle=fresh?'#0f0':'#880';ctx.font=`bold ${fs}px monospace`;ctx.textAlign='left';ctx.textBaseline='middle';
            ctx.fillText(`⊕ ${tgt.type==='destroyer'?'ЭСМИНЕЦ':'КАТЕР'}`,c2x+4,y+bh*.3);
            ctx.fillStyle='#8a8';ctx.font=`${fs-1}px monospace`;
            ctx.fillText(`${dist}м  ${brg}° ${fresh?'':'⚠УСТАР'}`,c2x+4,y+bh*.8);
        } else {
            ctx.fillStyle='#555';ctx.font=`${fs-1}px monospace`;ctx.textAlign='center';ctx.textBaseline='middle';
            ctx.fillText(det?`${det} контакт(ов) — ВЫБОР ↓`:'Нет контактов — СОНАР ↓',c2x+colW/2,y+bh*.55);
        }
        y+=bh*1.1+gap;

        // Scan + Select row
        const hw=(colW-4)/2;
        this._btn(ctx,c2x,y,hw,bh,`🔎 СОНАР`,s.sonarCd<=0?'#1a3a1a':'#0e1014',fs-1,()=>G.activateSonar());
        this._btn(ctx,c2x+hw+4,y,hw,bh,`⊕ ВЫБОР [${det}]`,det>0?'#2a4a2a':'#0e1014',fs-1,()=>G.nextTarget());
        y+=bh+gap;

        // Fire buttons
        this._lbl(ctx,c2x,y,'ОГОНЬ',fs-1);y+=fs+1;
        const canFire=!!tgt;
        this._btn(ctx,c2x,y,colW,bh,`🔱 ТОРП [${s.torpedoes}/${s.maxTorpedoes}]${canFire?'':' нет цели'}`,canFire&&s.torpedoes>0?'#1a5a6a':'#0e1014',fs-1,()=>G.fireTorpedo());
        if(s.torpReload>0){ctx.fillStyle='#4af';ctx.fillRect(c2x+1,y+bh-2,(colW-2)*(1-s.torpReload/8),2);}
        y+=bh+gap;

        if(!isSub){
            this._btn(ctx,c2x,y,colW,bh,`🚀 РКТ [${s.missiles}/${s.maxMissiles}]${canFire?'':' нет цели'}`,canFire&&s.missiles>0?'#5a3a1a':'#0e1014',fs-1,()=>G.fireMissile());
            if(s.missileReload>0){ctx.fillStyle='#f80';ctx.fillRect(c2x+1,y+bh-2,(colW-2)*(1-s.missileReload/15),2);}
            y+=bh+gap;
            this._btn(ctx,c2x,y,colW,bh*.7,`✨ ЛОВУШКИ [${s.flares}]`,s.flares>0?'#3a3a1a':'#0e1014',fs-1,()=>G.deployFlares());
            y+=bh*.7+gap;
        }

        // Status compact
        const hpW=colW;
        ctx.fillStyle='#080808';ctx.fillRect(c2x,y,hpW,bh*.5);
        const hpR=s.hp/s.maxHp;
        ctx.fillStyle=hpR>.5?'#226622':hpR>.25?'#666622':'#662222';
        ctx.fillRect(c2x+1,y+1,(hpW-2)*hpR,bh*.5-2);
        ctx.fillStyle='#ccc';ctx.font=`bold ${fs-2}px monospace`;ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(`HP ${s.hp}%`,c2x+hpW/2,y+bh*.25);
        y+=bh*.5+gap;
        ctx.fillStyle='#6a8a6a';ctx.font=`${fs-1}px monospace`;ctx.textAlign='left';
        ctx.fillText(`В${G.wave}/5 Ц${G.kills}/${G.killsNeeded}`,c2x,y+bh*.2);

        // ════ COL3: SUB CONTROLS ════
        if(isSub){
            y=panelY+4;
            this._lbl(ctx,c3x,y,'ГЛУБИНА',fs-1);y+=fs+3;
            const dL=['ПОВЕРХН','ПЕРИСКОП','ГЛУБОКО'],dC=['#2a4a4a','#2a3a2a','#1a1a3a'];
            for(let d=0;d<3;d++){
                this._btn(ctx,c3x,y,colW,bh,dL[d],Math.abs(s.depthTarget-d)<.3?dC[d]:'#0e1014',fs,()=>G.setDepth(d));
                y+=bh+gap;
            }
            this._lbl(ctx,c3x,y,'O₂',fs-1);y+=fs+1;
            ctx.fillStyle='#0a0a0a';ctx.fillRect(c3x,y,colW,bh*.5);
            ctx.fillStyle=s.o2>30?'#226688':s.o2>10?'#886622':'#882222';
            ctx.fillRect(c3x+1,y+1,(colW-2)*(s.o2/s.maxO2),bh*.5-2);
            ctx.fillStyle='#ccc';ctx.font=`bold ${fs-1}px monospace`;ctx.textAlign='center';
            ctx.fillText(`${s.o2.toFixed(0)}%`,c3x+colW/2,y+bh*.25);
            y+=bh*.5+gap;
            ctx.fillStyle='#4af';ctx.font=`${fs-1}px monospace`;ctx.textAlign='left';
            ctx.fillText(`${(s.depth*60)|0}м`,c3x,y+fs);
            y+=fs+gap+2;
            const stealth=s.depth>1.5;
            ctx.fillStyle=stealth?'#1a3a1a':'#2a1a0a';ctx.fillRect(c3x,y,colW,bh*.6);
            ctx.fillStyle=stealth?'#4f4':'#fa4';ctx.font=`bold ${fs-1}px monospace`;ctx.textAlign='center';
            ctx.fillText(stealth?'⬤ НЕВИДИМ':'◯ ВИДЕН',c3x+colW/2,y+bh*.3);
        }
    },

    _lbl(ctx,x,y,t,sz){ctx.fillStyle='#3a5a3a';ctx.font=`bold ${sz||8}px monospace`;ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText(t,x,y);},

    _btn(ctx,x,y,w,h,t,c,fs,a){
        ctx.fillStyle=c;ctx.fillRect(x,y,w,h);
        ctx.fillStyle='rgba(255,255,255,0.04)';ctx.fillRect(x,y,w,1);
        ctx.fillStyle='rgba(0,0,0,0.2)';ctx.fillRect(x,y+h-1,w,1);
        ctx.strokeStyle='rgba(255,255,255,0.07)';ctx.lineWidth=.5;ctx.strokeRect(x,y,w,h);
        ctx.fillStyle='#ccc';ctx.font=`bold ${fs||9}px monospace`;ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(t,x+w/2,y+h/2);
        this.buttons.push({x,y,w,h,action:a});
    },

    handleClick(mx,my){for(const b of this.buttons)if(mx>=b.x&&mx<=b.x+b.w&&my>=b.y&&my<=b.y+b.h){b.action();return;}}
};
