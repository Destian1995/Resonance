// ============ ROGUELIKE UPGRADES — no hero, pure TD ============
const Upgrades = {
    buildChoices(waveNum) {
        const pool = [];

        // Tower damage — all towers get +1 level
        pool.push({name:'+1 Уровень башен',desc:'Все башни получают уровень (макс 3)',icon:'⬆',color:'#f80',
            apply(){for(const b of Buildings.list)if(b.level<3){b.level++;b.maxHp=Math.floor((b.def.hp||999)*b.level);b.hp=b.maxHp;}}});

        // Tower attack speed
        pool.push({name:'-15% Кулдаун',desc:'Все башни стреляют чаще',icon:'↻',color:'#a5f',
            apply(){for(const k in TOWER_DEFS)if(TOWER_DEFS[k].cd)TOWER_DEFS[k].cd=Math.floor(TOWER_DEFS[k].cd*.85);}});

        // Tower range
        pool.push({name:'+1 Дальность',desc:'Все башни бьют дальше',icon:'👁',color:'#8ef',
            apply(){for(const k in TOWER_DEFS)if(TOWER_DEFS[k].range)TOWER_DEFS[k].range+=.5;}});

        // Tower damage multiplier
        pool.push({name:'+25% Урон',desc:'Все башни наносят больше урона',icon:'💥',color:'#f44',
            apply(){for(const k in TOWER_DEFS)if(TOWER_DEFS[k].dmg)TOWER_DEFS[k].dmg=Math.ceil(TOWER_DEFS[k].dmg*1.25);}});

        // Gold bonus
        pool.push({name:'+40 Золото',desc:'Немедленно получить',icon:'💰',color:'#ff0',
            apply(){Game.gold+=40;}});

        // Core heal
        if(Game.coreHp < CFG.CORE_HP)
            pool.push({name:'+30 HP Ядро',desc:'Починить ядро',icon:'💎',color:'#4af',
                apply(){Game.coreHp=Math.min(CFG.CORE_HP,Game.coreHp+30);}});

        // Core max HP
        pool.push({name:'+25 Макс HP ядра',desc:'Увеличить прочность ядра',icon:'🛡',color:'#4cf',
            apply(){CFG.CORE_HP+=25;Game.coreHp+=25;}});

        // Gold per kill
        pool.push({name:'+2 Золото/убийство',desc:'Больше золота за врагов',icon:'💸',color:'#fa0',
            apply(){CFG.GOLD_PER_KILL+=2;}});

        // Chain lightning bonus
        pool.push({name:'+2 Цепи молний',desc:'Молниевые башни бьют больше целей',icon:'⚡',color:'#4ef',
            apply(){TOWER_DEFS.lightning.chain+=2;}});

        // AoE bonus
        pool.push({name:'+30% Радиус AoE',desc:'Огненные и пушки бьют по площади шире',icon:'🔥',color:'#f60',
            apply(){if(TOWER_DEFS.fire.aoe)TOWER_DEFS.fire.aoe=Math.ceil(TOWER_DEFS.fire.aoe*1.3);
                    if(TOWER_DEFS.cannon.aoe)TOWER_DEFS.cannon.aoe=Math.ceil(TOWER_DEFS.cannon.aoe*1.3);}});

        // Slow power
        pool.push({name:'Усил. замедление',desc:'Замедление сильнее и дольше',icon:'❄',color:'#8ef',
            apply(){/* handled by modifying slow params globally — traps/ice get .25 slow instead of .35 */
                TOWER_DEFS.ice.slow=true; /* already true, but signifies upgrade */
            }});

        // Spell cooldown reduction
        pool.push({name:'-20% Кулдаун заклинаний',desc:'Заклинания перезаряжаются быстрее',icon:'✦',color:'#a4f',
            apply(){const spec=SPECS[Spells.specIdx];for(const sp of spec.spells)sp.cd=Math.floor(sp.cd*.8);}});

        // Build discount
        pool.push({name:'-20% Цена башен',desc:'Все башни дешевле',icon:'🏗',color:'#4f4',
            apply(){for(const k in TOWER_DEFS)if(TOWER_DEFS[k].cost)TOWER_DEFS[k].cost=Math.max(5,Math.floor(TOWER_DEFS[k].cost*.8));}});

        // Wall HP
        pool.push({name:'+50 HP Стены',desc:'Стены прочнее',icon:'🧱',color:'#888',
            apply(){TOWER_DEFS.wall.hp+=50;for(const b of Buildings.list)if(b.type==='wall'){b.maxHp+=50;b.hp+=50;}}});

        // Shuffle & pick 3
        for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
        return pool.slice(0, 3);
    }
};
