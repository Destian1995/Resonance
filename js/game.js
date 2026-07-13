// ============ TITANIC — survival management ============
const G = {
    cv:null,ctx:null,lt:0,
    state:'menu', // menu,sailing,collision,sinking,end
    time:0,            // game seconds
    gameMinutes:0,     // simulated minutes since start
    timeScale:4,       // 1 real second = 4 game minutes
    phase:'sailing',   // sailing -> collision -> sinking
    collisionTimer:0,  // countdown to iceberg
    // Messages
    log:[],
    choices:[],        // current decision choices
    choiceActive:false,
    // Events
    eventQueue:[],
    eventTimer:0,
    nextEventIdx:0,
    // Stats
    decisions:[],
    score:0,

    init(){
        this.cv=document.getElementById('game');
        this.ctx=this.cv.getContext('2d');
        this._resize();
        window.addEventListener('resize',()=>this._resize());
        this.lt=performance.now();
        this.cv.addEventListener('mousedown',e=>this._click(this._pos(e)));
        this.cv.addEventListener('touchstart',e=>{e.preventDefault();this._click(this._tpos(e));},{passive:false});
        requestAnimationFrame(t=>this.loop(t));
    },
    _resize(){this.cv.width=window.innerWidth;this.cv.height=window.innerHeight;},
    _pos(e){const r=this.cv.getBoundingClientRect();return{x:(e.clientX-r.left)*(this.cv.width/r.width),y:(e.clientY-r.top)*(this.cv.height/r.height)};},
    _tpos(e){return this._pos(e.changedTouches[0]);},

    _click(p){
        if(this.state==='menu'){this._startGame();return;}
        if(this.state==='end'){this.state='menu';return;}
        // Handle choices
        if(this.choiceActive&&this.choices.length){
            const cw=this.cv.width,ch=this.cv.height;
            const pw=Math.min(400,cw*.85),ph=44,gap=6;
            const sx=(cw-pw)/2;
            for(let i=0;i<this.choices.length;i++){
                const py=ch*.5+i*(ph+gap);
                if(p.x>=sx&&p.x<=sx+pw&&p.y>=py&&p.y<=py+ph){
                    this._resolveChoice(i);
                    return;
                }
            }
        }
    },

    _startGame(){
        Ship.init();
        this.time=0;this.gameMinutes=0;this.timeScale=4;
        this.phase='sailing';this.collisionTimer=20; // 20 real seconds before iceberg
        this.log=[];this.choices=[];this.choiceActive=false;
        this.eventQueue=[];this.nextEventIdx=0;this.eventTimer=0;
        this.decisions=[];this.score=0;
        this.state='sailing';
        this._log('КАПИТАН','14 апреля 1912, 23:00. Титаник идёт полным ходом через Атлантику.');
        this._log('РАДИСТ','Получены предупреждения о льдах от других кораблей.');
        this._buildEvents();
    },

    _log(from,text){this.log.unshift({from,text,time:this.gameMinutes});if(this.log.length>20)this.log.pop();},

    _buildEvents(){
        // Sinking phase events with decisions
        this.eventQueue=[
            {at:2, from:'ПОМОЩНИК',text:'Сэр, мы получили предупреждение о льдах. Замедлить ход?',
             choices:['Поддерживать полный ход','Снизить до половины','Стоп машины'],
             effects:[
                 ()=>{this._log('КАПИТАН','Полный ход. Мы непотопляемы.');this.score-=10;},
                 ()=>{Ship.enginePower=2;this._log('КАПИТАН','Половинный ход.');this.collisionTimer+=8;this.score+=5;},
                 ()=>{Ship.enginePower=0;this._log('КАПИТАН','Стоп машины. Ждём рассвета.');this.collisionTimer+=30;this.score+=15;}
             ]},
            {at:5, from:'ВПЕРЕДСМОТРЯЩИЙ',text:'Прямо по курсу... АЙСБЕРГ! Дистанция 500 метров!',
             choices:['ЛЕВО НА БОРТ!','Полный назад!','Таранить прямо'],
             effects:[
                 ()=>{this._log('РУЛЕВОЙ','Лево на борт!');this.score+=5;this._triggerCollision(3);},
                 ()=>{this._log('МАШИННОЕ','Полный назад!');this.score-=5;this._triggerCollision(4);},
                 ()=>{this._log('КАПИТАН','Прямой курс...');this.score-=20;this._triggerCollision(5);}
             ]},
            // Post-collision events
            {at:12,from:'ИНЖЕНЕР',text:'Сэр! Вода поступает в 4 отсека. Корабль обречён. ~2 часа.',
             choices:['Понял. Готовить шлюпки.','Сколько шлюпок?','Можно ли заделать пробоины?'],
             effects:[
                 ()=>{this._log('КАПИТАН','Все руки — к шлюпкам!');this.score+=10;},
                 ()=>{this._log('ИНЖЕНЕР','20 шлюпок на 1300 мест. У нас 2200 человек...');this.score+=5;},
                 ()=>{this._log('ИНЖЕНЕР','Невозможно. Слишком обширные повреждения.');this.score+=2;}
             ]},
            {at:18,from:'РАДИСТ',text:'Отправить сигнал бедствия SOS?',
             choices:['Немедленно! SOS на всех частотах!','Подождать, не хочу паники','Отправить CQD и SOS'],
             effects:[
                 ()=>{Ship.distressSignaled=true;this._log('РАДИСТ','SOS! SOS! Титаник тонет!');this.score+=15;},
                 ()=>{this._log('КАПИТАН','Ждём...');this.score-=10;},
                 ()=>{Ship.distressSignaled=true;this._log('РАДИСТ','CQD CQD SOS — Титаник. Координаты 41°46N 50°14W');this.score+=15;}
             ]},
            {at:25,from:'ПОМОЩНИК',text:'Женщины и дети не хотят садиться в шлюпки. Корабль кажется безопасным.',
             choices:['Приказать силой!','Убеждать спокойно','Пусть мужчины тоже садятся'],
             effects:[
                 ()=>{this._log('ПОМОЩНИК','Силой сажаем!');Ship.evacuated+=80;this.score+=8;},
                 ()=>{this._log('ПОМОЩНИК','Леди, прошу вас...');Ship.evacuated+=40;this.score+=3;},
                 ()=>{Ship.evacuated+=100;this._log('ПОМОЩНИК','Все в шлюпки!');this.score+=10;}
             ]},
            {at:35,from:'ОФИЦЕР',text:'Шлюпка №6 полупустая — 28 из 65 мест. Спускать?',
             choices:['Спускать! Каждая минута важна','Заполнить до конца','Подождать ещё людей'],
             effects:[
                 ()=>{Ship.lifeboatsLaunched++;Ship.evacuated+=28;this._log('ОФИЦЕР','Шлюпка №6 на воде.');this.score+=5;},
                 ()=>{Ship.lifeboatsLaunched++;Ship.evacuated+=60;this._log('ОФИЦЕР','Шлюпка заполнена и спущена.');this.score+=12;},
                 ()=>{this._log('ОФИЦЕР','Ждём...');this.score-=3;}
             ]},
            {at:45,from:'МАШИННОЕ',text:'Котлы могут взорваться! Стравить пар?',
             choices:['Стравить пар немедленно','Держать давление — нужно электричество','Заглушить котлы'],
             effects:[
                 ()=>{this._log('МАШИННОЕ','Пар стравлен. Свист оглушительный.');this.score+=5;},
                 ()=>{this._log('МАШИННОЕ','Держим. Опасно.');this.score-=5;},
                 ()=>{this._log('МАШИННОЕ','Котлы заглушены.');Ship.powerOn=false;this.score+=3;}
             ]},
            {at:55,from:'РАДИСТ',text:'Карпатия ответила! Будет через 4 часа. Продолжать передачу?',
             choices:['Да! Передавайте без остановки!','Попробовать связаться ближе','Сообщить пассажирам'],
             effects:[
                 ()=>{this._log('РАДИСТ','Передаём... Карпатия идёт на всех парах!');this.score+=10;},
                 ()=>{this._log('РАДИСТ','Калифорниан не отвечает...');this.score+=3;},
                 ()=>{this._log('КАПИТАН','Помощь идёт! Не теряйте надежду!');Ship.evacuated+=20;this.score+=8;}
             ]},
            {at:70,from:'ПОМОЩНИК',text:'Нос уходит под воду. Палуба наклоняется. Паника!',
             choices:['Стрелять в воздух для порядка!','Оркестр — продолжайте играть!','Открыть все двери для 3-го класса'],
             effects:[
                 ()=>{this._log('ПОМОЩНИК','ВЫСТРЕЛ! Толпа успокоилась.');Ship.evacuated+=30;this.score+=5;},
                 ()=>{this._log('МУЗЫКАНТ','Джентльмены, было честью играть с вами.');Ship.evacuated+=10;this.score+=15;},
                 ()=>{this._log('СТЮАРД','Двери открыты! Люди бегут наверх!');Ship.evacuated+=80;this.score+=12;}
             ]},
            {at:85,from:'ОФИЦЕР',text:'Последние шлюпки. Складные шлюпки C и D.',
             choices:['Спускать! Только женщины и дети!','Всех кто влезет!','Капитан — идите в шлюпку!'],
             effects:[
                 ()=>{Ship.lifeboatsLaunched+=2;Ship.evacuated+=90;this._log('ОФИЦЕР','Последние шлюпки на воде.');this.score+=10;},
                 ()=>{Ship.lifeboatsLaunched+=2;Ship.evacuated+=120;this._log('ОФИЦЕР','Все в шлюпки!');this.score+=12;},
                 ()=>{this._log('КАПИТАН','Я остаюсь на борту.');Ship.lifeboatsLaunched+=2;Ship.evacuated+=90;this.score+=20;}
             ]},
            {at:100,from:'СИСТЕМА',text:'Корабль разламывается... Корма поднимается вертикально.',
             choices:['Держитесь за что можете!','Прыгайте в воду!','Молитесь...'],
             effects:[
                 ()=>{Ship.evacuated+=15;this._log('','Люди цепляются за перила...');this.score+=3;},
                 ()=>{Ship.evacuated+=25;this._log('','Некоторые прыгают и доплывают до шлюпок.');this.score+=5;},
                 ()=>{this._log('','Тишина...');this.score+=2;}
             ]}
        ];
    },

    _triggerCollision(severity){
        this.phase='sinking';
        Ship.icebergHit();
        // More breaches for worse decisions
        if(severity>=4) { Ship.sections[3].rate=3; }
        if(severity>=5) { Ship.sections[4].breached=true;Ship.sections[4].rate=2;Ship.breached.push(4); }
        this._log('','💥 СТОЛКНОВЕНИЕ С АЙСБЕРГОМ!');
        this.timeScale=6; // speed up time during sinking
    },

    _resolveChoice(idx){
        if(!this.choiceActive||!this.choices.length)return;
        const ev=this.eventQueue[this.nextEventIdx-1];
        if(ev&&ev.effects&&ev.effects[idx]) ev.effects[idx]();
        this.decisions.push({event:ev?ev.from:'',choice:idx});
        this.choiceActive=false;
        this.choices=[];
    },

    loop(time){
        const dt=Math.min((time-this.lt)/1000,.05);this.lt=time;this.time+=dt;
        if(this.state==='sailing'||this.state==='sinking')this._update(dt);
        this._draw();
        requestAnimationFrame(t=>this.loop(t));
    },

    _update(dt){
        this.gameMinutes+=dt*this.timeScale;

        // Pre-collision countdown
        if(this.phase==='sailing'){
            this.collisionTimer-=dt;
            // Auto-trigger collision event when timer hits
        }

        // Events
        if(this.nextEventIdx<this.eventQueue.length&&!this.choiceActive){
            const ev=this.eventQueue[this.nextEventIdx];
            if(this.gameMinutes>=ev.at||(this.phase==='sailing'&&this.collisionTimer<=0&&this.nextEventIdx===1)){
                this._log(ev.from,ev.text);
                if(ev.choices){
                    this.choices=ev.choices;
                    this.choiceActive=true;
                }
                this.nextEventIdx++;
            }
        }

        // Ship physics (during sinking)
        if(this.phase==='sinking'){
            const sunk=Ship.update(dt*this.timeScale, this.gameMinutes);
            // Auto-evacuate slowly
            if(Ship.lifeboatsLaunched<Ship.lifeboats){
                Ship.evacuated+=dt*this.timeScale*0.5;
                if(Math.random()<dt*.1){Ship.lifeboatsLaunched++;this._log('ШЛЮПКА',`Шлюпка №${Ship.lifeboatsLaunched} спущена.`);}
            }
            // Deaths from flooding
            const remaining=Ship.totalPassengers-Ship.evacuated-Ship.dead;
            if(Ship.flooding>80&&remaining>0){
                Ship.dead+=dt*this.timeScale*2;
            }
            if(sunk){
                Ship.dead=Math.max(0,Ship.totalPassengers-Math.floor(Ship.evacuated));
                this.state='end';
            }
        }
    },

    // ══════════ DRAW ══════════
    _draw(){
        const ctx=this.ctx,cw=this.cv.width,ch=this.cv.height;
        ctx.fillStyle='#080a14';ctx.fillRect(0,0,cw,ch);

        if(this.state==='menu'){this._drawMenu(ctx,cw,ch);return;}
        if(this.state==='end'){this._drawEnd(ctx,cw,ch);return;}

        // Ocean + sky (top 35%)
        const viewH=ch*.33;
        this._drawOcean(ctx,cw,viewH);

        // Ship schematic (middle)
        const schY=viewH+4, schH=ch*.22;
        this._drawShipSide(ctx,0,schY,cw,schH);

        // Console (bottom)
        const conY=schY+schH+2;
        ctx.fillStyle='#0a0c14';ctx.fillRect(0,conY,cw,ch-conY);

        // Log (left), Choices/Status (right)
        const logW=cw*.55;
        this._drawLog(ctx,4,conY+4,logW-8,ch-conY-8);
        this._drawStatus(ctx,logW,conY+4,cw-logW-4,ch-conY-8);

        // Choices overlay
        if(this.choiceActive) this._drawChoices(ctx,cw,ch);

        // Time
        const hrs=Math.floor(this.gameMinutes/60)+23;
        const mins=Math.floor(this.gameMinutes%60);
        ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(cw/2-50,2,100,18);
        ctx.fillStyle='#4af';ctx.font='bold 12px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(`${hrs%24}:${mins<10?'0':''}${mins}`,cw/2,11);
    },

    _drawOcean(ctx,cw,vh){
        // Night sky
        const grd=ctx.createLinearGradient(0,0,0,vh);
        grd.addColorStop(0,'#060a18');grd.addColorStop(.5,'#0a1428');grd.addColorStop(1,'#1a2a3a');
        ctx.fillStyle=grd;ctx.fillRect(0,0,cw,vh);
        // Stars
        for(let i=0;i<40;i++){
            ctx.fillStyle=`rgba(255,255,255,${.3+Math.sin(this.time*1.5+i)*.2})`;
            ctx.fillRect((Math.sin(i*7.3+1)*.5+.5)*cw,(Math.sin(i*3.1+2)*.5+.5)*vh*.5,1.5,1.5);
        }
        // Ocean
        const horizY=vh*.6;
        ctx.fillStyle='#0a1520';ctx.fillRect(0,horizY,cw,vh-horizY);
        // Waves
        for(let w=0;w<6;w++){
            const wy=horizY+3+w*((vh-horizY)/6);
            ctx.strokeStyle=`rgba(40,60,80,${.08+w*.01})`;ctx.lineWidth=.7;
            ctx.beginPath();
            for(let x=0;x<cw;x+=3){
                const wv=Math.sin(x*.02+this.time*1.2+w*.8)*(1.5+w*.5);
                ctx[x?'lineTo':'moveTo'](x,wy+wv);
            }
            ctx.stroke();
        }
        // Iceberg (visible when close)
        if(this.phase==='sailing'&&this.collisionTimer<8){
            const alpha=Math.min(1,(8-this.collisionTimer)/6);
            const ix=cw*.7, iy=horizY-10;
            ctx.globalAlpha=alpha;
            ctx.fillStyle='#8aaccc';
            ctx.beginPath();ctx.moveTo(ix,iy);ctx.lineTo(ix-25,iy+30);ctx.lineTo(ix+30,iy+30);ctx.closePath();ctx.fill();
            ctx.fillStyle='#aaccee';
            ctx.beginPath();ctx.moveTo(ix+5,iy-15);ctx.lineTo(ix-10,iy+5);ctx.lineTo(ix+15,iy+5);ctx.closePath();ctx.fill();
            ctx.globalAlpha=1;
        }
        // Sinking: bow going under
        if(this.phase==='sinking'&&Ship.bowAngle>5){
            ctx.fillStyle='#0a1520';
            const dip=Ship.bowAngle*1.5;
            ctx.fillRect(0,horizY-3,cw*.3,dip);
        }
    },

    _drawShipSide(ctx,x,y,w,h){
        ctx.fillStyle='#0c0e16';ctx.fillRect(x,y,w,h);
        ctx.strokeStyle='#1a2a2a';ctx.lineWidth=1;ctx.strokeRect(x,y,w,h);

        const cx=w/2, cy=y+h/2;
        const shipL=w*.8, shipH=h*.5;
        const bowDip=Ship.bowAngle*.8;

        ctx.save();
        ctx.translate(cx,cy);
        // Tilt with flooding
        ctx.rotate(-Ship.bowAngle*Math.PI/180*0.3);

        // Waterline
        ctx.strokeStyle='#2a5a7a';ctx.lineWidth=1;ctx.setLineDash([4,4]);
        ctx.beginPath();ctx.moveTo(-shipL/2-20,shipH*.2+bowDip);ctx.lineTo(shipL/2+20,shipH*.2);ctx.stroke();
        ctx.setLineDash([]);

        // Hull
        ctx.fillStyle='#1a1a2a';
        ctx.beginPath();
        ctx.moveTo(-shipL/2+10,-shipH*.2-bowDip); // bow top
        ctx.lineTo(-shipL/2,-bowDip); // bow point
        ctx.lineTo(-shipL/2+5,shipH*.3-bowDip); // bow bottom
        ctx.lineTo(shipL/2-5,shipH*.3); // stern bottom
        ctx.lineTo(shipL/2,0); // stern
        ctx.lineTo(shipL/2-10,-shipH*.2); // stern top
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle='#3a3a5a';ctx.lineWidth=1;ctx.stroke();

        // Superstructure
        ctx.fillStyle='#2a2a3a';
        ctx.fillRect(-shipL*.3,-shipH*.5,shipL*.6,shipH*.35);
        // Funnels (4)
        for(let i=0;i<4;i++){
            const fx=-shipL*.2+i*shipL*.12;
            const fh=shipH*.5;
            ctx.fillStyle='#2a2020';ctx.fillRect(fx-4,-shipH*.5-fh,8,fh);
            ctx.fillStyle='#1a1010';ctx.fillRect(fx-4,-shipH*.5-fh,8,fh*.2);
            // Smoke
            if(Ship.powerOn||i<3){
                ctx.globalAlpha=.15;ctx.fillStyle='#888';
                for(let s=0;s<3;s++){
                    ctx.beginPath();
                    ctx.arc(fx+Math.sin(this.time*2+i+s)*5,-shipH*.5-fh-8-s*8,4+s*2,0,Math.PI*2);
                    ctx.fill();
                }
                ctx.globalAlpha=1;
            }
        }

        // Windows
        ctx.fillStyle='#446';
        for(let i=0;i<12;i++){
            const wx=-shipL*.35+i*shipL*.06;
            ctx.fillRect(wx,-shipH*.35,3,3);
        }
        // Power lights (go off when power fails)
        if(Ship.powerOn){
            ctx.fillStyle='#ff8';ctx.globalAlpha=.5;
            for(let i=0;i<12;i++){
                ctx.fillRect(-shipL*.35+i*shipL*.06,-shipH*.35,3,3);
            }
            ctx.globalAlpha=1;
        }

        // Flooding in sections (blue overlay)
        for(let i=0;i<Ship.sections.length;i++){
            const s=Ship.sections[i];
            if(s.flooded>5){
                const sx=-shipL/2+i*(shipL/6)+5;
                const sW=shipL/6-2;
                const floodH=shipH*.6*(s.flooded/100);
                ctx.fillStyle=`rgba(30,60,120,${Math.min(.6,s.flooded/100)})`;
                ctx.fillRect(sx,shipH*.3-floodH-(i<3?bowDip*(1-i/3):0),sW,floodH);
            }
        }

        // Section labels
        ctx.font='bold 7px monospace';ctx.textAlign='center';ctx.fillStyle='#666';
        for(let i=0;i<Ship.sections.length;i++){
            const sx=-shipL/2+i*(shipL/6)+shipL/12;
            ctx.fillText(Ship.sections[i].name,sx,shipH*.3+12);
            if(Ship.sections[i].flooded>5){
                ctx.fillStyle=Ship.sections[i].flooded>50?'#f44':'#fa4';
                ctx.fillText(`${Ship.sections[i].flooded|0}%`,sx,shipH*.3+22);
                ctx.fillStyle='#666';
            }
        }

        // Lifeboats on deck
        ctx.fillStyle='#887';
        const boatsRemaining=Ship.lifeboats-Ship.lifeboatsLaunched;
        for(let i=0;i<Math.min(boatsRemaining,10);i++){
            ctx.fillRect(-shipL*.35+i*8,-shipH*.2-3,6,2);
        }

        ctx.restore();

        // Label
        ctx.fillStyle='#3a5a6a';ctx.font='bold 8px monospace';ctx.textAlign='left';
        ctx.fillText('СХЕМА КОРАБЛЯ',x+6,y+10);
        // Flooding %
        ctx.fillStyle=Ship.flooding>50?'#f44':'#fa4';ctx.textAlign='right';
        ctx.fillText(`Затопление: ${Ship.flooding.toFixed(1)}%  Крен: ${Ship.bowAngle.toFixed(1)}°`,x+w-6,y+10);
    },

    _drawLog(ctx,x,y,w,h){
        ctx.fillStyle='#080a10';ctx.fillRect(x,y,w,h);
        ctx.strokeStyle='#1a2a2a';ctx.lineWidth=1;ctx.strokeRect(x,y,w,h);
        ctx.fillStyle='#2a4a3a';ctx.font='bold 8px monospace';ctx.textAlign='left';
        ctx.fillText('ЖУРНАЛ',x+4,y+10);

        ctx.font='8px monospace';let ly=y+22;
        for(const m of this.log){
            if(ly>y+h-4)break;
            ctx.fillStyle='#4a8a4a';ctx.fillText(m.from,x+4,ly);
            ctx.fillStyle='#aaa';
            const words=m.text.split(' ');let line='',lineY=ly+10;
            for(const wd of words){
                if(ctx.measureText(line+wd+' ').width>w-12){ctx.fillText(line,x+4,lineY);lineY+=10;line=wd+' ';}
                else line+=wd+' ';
            }
            ctx.fillText(line,x+4,lineY);ly=lineY+12;
        }
    },

    _drawStatus(ctx,x,y,w,h){
        ctx.fillStyle='#080a10';ctx.fillRect(x,y,w,h);
        ctx.strokeStyle='#1a2a2a';ctx.lineWidth=1;ctx.strokeRect(x,y,w,h);
        ctx.fillStyle='#2a4a3a';ctx.font='bold 8px monospace';ctx.textAlign='left';
        ctx.fillText('СТАТУС',x+4,y+10);

        const fs=9; let ly=y+24;
        const line=(label,val,col)=>{
            ctx.fillStyle='#888';ctx.font=`${fs}px monospace`;ctx.fillText(label,x+6,ly);
            ctx.fillStyle=col||'#ccc';ctx.fillText(val,x+w*.5,ly);ly+=14;
        };

        line('Скорость',`${Ship.speed.toFixed(1)} уз`);
        line('Затопление',`${Ship.flooding.toFixed(1)}%`,Ship.flooding>50?'#f44':'#fa4');
        line('Крен',`${Ship.bowAngle.toFixed(1)}°`,Ship.bowAngle>10?'#f44':'#fff');
        line('Энергия',Ship.powerOn?'ВКЛ':'ОТКЛ',Ship.powerOn?'#4f4':'#f44');
        ly+=4;
        line('Пассажиры',`${Ship.totalPassengers}`);
        line('Эвакуировано',`${Math.floor(Ship.evacuated)}`,Ship.evacuated>0?'#4f4':'#888');
        line('Шлюпки',`${Ship.lifeboatsLaunched}/${Ship.lifeboats}`);
        line('Мест в шлюпках',`${Ship.lifeboats*Ship.lifeboatCapacity}`,'#fa4');
        if(this.phase==='sinking'){
            ly+=4;
            const timeStr=Ship.timeToSink>0?`${Ship.timeToSink.toFixed(0)} мин`:'--';
            line('До гибели',timeStr,Ship.timeToSink<30?'#f44':'#ff0');
            line('SOS',Ship.distressSignaled?'Передано':'Нет',Ship.distressSignaled?'#4f4':'#f44');
        }
    },

    _drawChoices(ctx,cw,ch){
        ctx.fillStyle='rgba(0,0,0,.7)';ctx.fillRect(0,ch*.35,cw,ch*.5);
        ctx.fillStyle='#ff0';ctx.font='bold 14px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText('РЕШЕНИЕ КАПИТАНА',cw/2,ch*.42);

        const pw=Math.min(400,cw*.85),ph=44,gap=6;
        const sx=(cw-pw)/2;
        for(let i=0;i<this.choices.length;i++){
            const py=ch*.5+i*(ph+gap);
            ctx.fillStyle='#1a2a3a';ctx.fillRect(sx,py,pw,ph);
            ctx.strokeStyle='#4af';ctx.lineWidth=1.5;ctx.strokeRect(sx,py,pw,ph);
            ctx.fillStyle='#fff';ctx.font='bold 11px monospace';ctx.textAlign='center';
            ctx.fillText(`${i+1}. ${this.choices[i]}`,cw/2,py+ph/2);
        }
    },

    _drawMenu(ctx,cw,ch){
        const grd=ctx.createLinearGradient(0,0,0,ch);grd.addColorStop(0,'#060a18');grd.addColorStop(1,'#0a1520');
        ctx.fillStyle=grd;ctx.fillRect(0,0,cw,ch);
        ctx.fillStyle='#4af';ctx.font='bold 32px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText('TITANIC',cw/2,ch*.15);
        ctx.fillStyle='#2a6a8a';ctx.font='bold 14px monospace';
        ctx.fillText('14 апреля 1912',cw/2,ch*.15+30);

        ctx.fillStyle='#aaa';ctx.font='12px monospace';
        ctx.fillText('Вы — капитан Эдвард Смит.',cw/2,ch*.38);
        ctx.fillText('Ваши решения определят сколько людей выживет.',cw/2,ch*.44);
        ctx.fillText('2200 пассажиров. 20 шлюпок. 1300 мест.',cw/2,ch*.52);
        ctx.fillStyle='#f44';ctx.fillText('Айсберг неизбежен.',cw/2,ch*.60);

        ctx.fillStyle='#888';ctx.font='13px monospace';
        ctx.fillText('Нажмите чтобы начать',cw/2,ch*.78);
    },

    _drawEnd(ctx,cw,ch){
        ctx.fillStyle='rgba(0,0,10,.95)';ctx.fillRect(0,0,cw,ch);

        ctx.fillStyle='#4af';ctx.font='bold 24px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText('ТИТАНИК ЗАТОНУЛ',cw/2,ch*.1);

        const survived=Math.floor(Ship.evacuated);
        const dead=Ship.totalPassengers-survived;
        const ly=ch*.25,sp=30;

        ctx.fillStyle='#fff';ctx.font='14px monospace';
        ctx.fillText(`Пассажиров: ${Ship.totalPassengers}`,cw/2,ly);
        ctx.fillStyle='#4f4';ctx.fillText(`Спасено: ${survived}`,cw/2,ly+sp);
        ctx.fillStyle='#f44';ctx.fillText(`Погибло: ${dead}`,cw/2,ly+sp*2);
        ctx.fillStyle='#ff0';ctx.fillText(`Шлюпок спущено: ${Ship.lifeboatsLaunched}`,cw/2,ly+sp*3);

        // Score
        const pct=((survived/Ship.totalPassengers)*100).toFixed(1);
        ctx.fillStyle='#4af';ctx.font='bold 18px monospace';
        ctx.fillText(`${pct}% выживших`,cw/2,ly+sp*5);

        // Historical comparison
        ctx.fillStyle='#888';ctx.font='11px monospace';
        ctx.fillText(`В реальности выжили 710 из 2200 (32%)`,cw/2,ly+sp*6.5);

        const rating=pct>50?'Герой!':pct>32?'Лучше реальности':pct>20?'Как в истории':'Катастрофа...';
        ctx.fillStyle=pct>32?'#4f4':'#f44';ctx.font='bold 14px monospace';
        ctx.fillText(rating,cw/2,ly+sp*8);

        // Decisions recap
        ctx.fillStyle='#666';ctx.font='10px monospace';
        ctx.fillText(`Решений принято: ${this.decisions.length}`,cw/2,ly+sp*9.5);

        ctx.fillStyle='#555';ctx.font='12px monospace';
        ctx.fillText('Нажмите для рестарта',cw/2,ch*.92);
    }
};

window.addEventListener('load',()=>{document.getElementById('loading').style.display='none';G.init();});
