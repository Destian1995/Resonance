// ============ UI — adaptive bridge controls ============
const UI = {
    buttons:[],

    draw(ctx,cw,ch,panelY,leftW){
        this.buttons=[];
        const s=G.ship;
        const isSub=G.shipType==='sub';
        const ph=ch-panelY-6;
        const bh=Math.min(30,ph*.12)|0;
        const gap=3;
        const fs=Math.max(7,Math.min(10,bh*.32))|0;

        const c1x=leftW+6;
        const availW=cw*.74-c1x;
        const colW=availW/(isSub?3:2)-4;
        const c2x=c1x+colW+8;
        const c3x=c2x+colW+8;

        let y;

        // ════ COL1: NAVIGATION ════
        y=panelY+6;
        this._lbl(ctx,c1x,y,'КУРС',fs-1);y+=fs+4;

        // Heading buttons — 8 directions
        const dirSize=Math.min(bh,colW/4.5)|0;
        const dirs=[
            {label:'СЗ',da:-Math.PI*.75},{label:'С',da:-Math.PI/2},{label:'СВ',da:-Math.PI*.25},
            {label:'З',da:Math.PI},{label:'●',da:null},{label:'В',da:0},
            {label:'ЮЗ',da:Math.PI*.75},{label:'Ю',da:Math.PI/2},{label:'ЮВ',da:Math.PI*.25}
        ];
        for(let r=0;r<3;r++){
            for(let c=0;c<3;c++){
                const d=dirs[r*3+c];
                const bx=c1x+c*(dirSize+2),by=y+r*(dirSize+2);
                if(d.da===null){
                    // Center — current heading display
                    ctx.fillStyle='#0a1a0a';ctx.fillRect(bx,by,dirSize,dirSize);
                    ctx.strokeStyle='#2a4a2a';ctx.lineWidth=.5;ctx.strokeRect(bx,by,dirSize,dirSize);
                } else {
                    const targetA=(d.da+Math.PI*2)%(Math.PI*2);
                    const curA=(s.targetHeading+Math.PI*2)%(Math.PI*2);
                    const active=Math.abs(targetA-curA)<.2||Math.abs(targetA-curA-Math.PI*2)<.2;
                    this._btn(ctx,bx,by,dirSize,dirSize,d.label,active?'#226622':'#141a22',fs-1,()=>{s.targetHeading=d.da;});
                }
            }
        }
        y+=dirSize*3+gap*3;

        // Engine power
        this._lbl(ctx,c1x,y,'МАШИНЫ',fs-1);y+=fs+2;
        const ew=(colW-8)/5;
        const eLabels=['⏹','▶','▶▶','▶▶▶','⚡'];
        const eColors=['#444444','#224422','#224422','#444422','#442222'];
        for(let i=0;i<5;i++){
            this._btn(ctx,c1x+i*(ew+1),y,ew,bh*.8,eLabels[i],s.enginePower===i?eColors[i]:'#0e1218',fs-1,()=>{s.enginePower=i;});
        }
        y+=bh*.8+gap;

        // Speed readout
        ctx.fillStyle='#0a100a';ctx.fillRect(c1x,y,colW,bh*.6);
        ctx.strokeStyle='#1a2a1a';ctx.lineWidth=.5;ctx.strokeRect(c1x,y,colW,bh*.6);
        ctx.fillStyle='#4f8';ctx.font=`bold ${fs}px monospace`;ctx.textAlign='left';ctx.textBaseline='middle';
        ctx.fillText(`${s.speed.toFixed(1)} уз`,c1x+4,y+bh*.3);

        // ════ COL2: WEAPONS ════
        y=panelY+6;
        this._lbl(ctx,c2x,y,'ВООРУЖЕНИЕ',fs-1);y+=fs+4;

        this._btn(ctx,c2x,y,colW,bh,`🔱 ТОРПЕДА [${s.torpedoes}/${s.maxTorpedoes}]`,s.torpedoes>0?'#1a4a5a':'#0e1014',fs,()=>G.fireTorpedo());
        if(s.torpReload>0){ctx.fillStyle='#4af';ctx.fillRect(c2x+1,y+bh-2,(colW-2)*(1-s.torpReload/8),2);}
        y+=bh+gap;

        if(!isSub){
            this._btn(ctx,c2x,y,colW,bh,`🚀 РАКЕТА [${s.missiles}/${s.maxMissiles}]`,s.missiles>0?'#4a2a1a':'#0e1014',fs,()=>G.fireMissile());
            if(s.missileReload>0){ctx.fillStyle='#f80';ctx.fillRect(c2x+1,y+bh-2,(colW-2)*(1-s.missileReload/15),2);}
            y+=bh+gap;
        }

        const halfW=(colW-4)/2;
        this._btn(ctx,c2x,y,halfW,bh,`📡 СОНАР`,s.sonarCd<=0?'#1a3a1a':'#0e1014',fs-1,()=>G.activateSonar());
        if(!isSub){
            this._btn(ctx,c2x+halfW+4,y,halfW,bh,`✨ [${s.flares}]`,s.flares>0?'#3a3a1a':'#0e1014',fs-1,()=>G.deployFlares());
        }
        y+=bh+gap;

        // Status
        this._lbl(ctx,c2x,y,'СТАТУС',fs-1);y+=fs+2;
        const hpW=colW;
        ctx.fillStyle='#0a0808';ctx.fillRect(c2x,y,hpW,bh*.6);
        const hpR=s.hp/s.maxHp;
        ctx.fillStyle=hpR>.5?'#226622':hpR>.25?'#666622':'#662222';
        ctx.fillRect(c2x+1,y+1,(hpW-2)*hpR,bh*.6-2);
        ctx.strokeStyle='#333';ctx.lineWidth=.5;ctx.strokeRect(c2x,y,hpW,bh*.6);
        ctx.fillStyle='#ccc';ctx.font=`bold ${fs-1}px monospace`;ctx.textAlign='center';
        ctx.fillText(`КОРПУС ${s.hp}%`,c2x+hpW/2,y+bh*.3);
        y+=bh*.6+gap;

        // Alert + wave
        const alertC=['#1a3a1a','#3a3a1a','#3a1a1a'];
        const alertT=['ЗЕЛЁНЫЙ','ЖЁЛТЫЙ','КРАСНЫЙ'];
        ctx.fillStyle=alertC[G.alertLevel];ctx.fillRect(c2x,y,hpW*.45,bh*.5);
        ctx.fillStyle='#ddd';ctx.font=`bold ${fs-2}px monospace`;ctx.textAlign='center';
        ctx.fillText(alertT[G.alertLevel],c2x+hpW*.22,y+bh*.25);
        ctx.fillStyle='#6a8a6a';ctx.textAlign='left';ctx.font=`${fs-1}px monospace`;
        ctx.fillText(`В${G.wave}/5 Ц${G.kills}/${G.killsNeeded}`,c2x+hpW*.5,y+bh*.25);

        // ════ COL3: SUB CONTROLS (depth + O2) ════
        if(isSub){
            y=panelY+6;
            this._lbl(ctx,c3x,y,'ГЛУБИНА',fs-1);y+=fs+4;

            const depthLabels=['ВСПЛЫТИЕ','ПЕРИСКОП','ГЛУБОКО'];
            const depthColors=['#2a4a4a','#2a3a2a','#1a1a3a'];
            for(let d=0;d<3;d++){
                const active=Math.abs(s.depthTarget-d)<.3;
                this._btn(ctx,c3x,y,colW,bh,depthLabels[d],active?depthColors[d]:'#0e1014',fs,()=>G.setDepth(d));
                y+=bh+gap;
            }

            // O2 bar
            this._lbl(ctx,c3x,y,'КИСЛОРОД',fs-1);y+=fs+2;
            ctx.fillStyle='#0a0a0a';ctx.fillRect(c3x,y,colW,bh*.6);
            ctx.fillStyle=s.o2>30?'#226688':s.o2>10?'#886622':'#882222';
            ctx.fillRect(c3x+1,y+1,(colW-2)*(s.o2/s.maxO2),bh*.6-2);
            ctx.fillStyle='#ccc';ctx.font=`bold ${fs-1}px monospace`;ctx.textAlign='center';
            ctx.fillText(`O₂ ${s.o2.toFixed(0)}%`,c3x+colW/2,y+bh*.3);
            y+=bh*.6+gap;

            // Depth indicator
            ctx.fillStyle='#4af';ctx.font=`${fs}px monospace`;ctx.textAlign='left';
            ctx.fillText(`Глубина: ${(s.depth*60)|0}м`,c3x,y+fs);

            // Stealth status
            y+=fs+gap+4;
            const stealth=s.depth>1.5;
            ctx.fillStyle=stealth?'#2a4a2a':'#3a2a1a';ctx.fillRect(c3x,y,colW,bh*.7);
            ctx.fillStyle=stealth?'#4f4':'#fa4';ctx.font=`bold ${fs}px monospace`;ctx.textAlign='center';
            ctx.fillText(stealth?'НЕВИДИМ':'ОБНАРУЖИМ',c3x+colW/2,y+bh*.35);
        }
    },

    _lbl(ctx,x,y,text,sz){ctx.fillStyle='#3a5a3a';ctx.font=`bold ${sz||8}px monospace`;ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText(text,x,y);},

    _btn(ctx,x,y,w,h,text,color,fs,action){
        ctx.fillStyle=color;ctx.fillRect(x,y,w,h);
        ctx.fillStyle='rgba(255,255,255,0.04)';ctx.fillRect(x,y,w,1);
        ctx.fillStyle='rgba(0,0,0,0.25)';ctx.fillRect(x,y+h-1,w,1);
        ctx.strokeStyle='rgba(255,255,255,0.08)';ctx.lineWidth=.5;ctx.strokeRect(x,y,w,h);
        ctx.fillStyle='#ccc';ctx.font=`bold ${fs||9}px monospace`;ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(text,x+w/2,y+h/2);
        this.buttons.push({x,y,w,h,action});
    },

    handleClick(mx,my){for(const b of this.buttons)if(mx>=b.x&&mx<=b.x+b.w&&my>=b.y&&my<=b.y+b.h){b.action();return;}}
};
