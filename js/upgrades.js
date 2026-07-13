// ============ ROGUELIKE UPGRADES ============
const Upgrades = {
    buildChoices(waveNum) {
        const pool = [];

        // Tower damage +
        pool.push({name:'+20% Урон башен',desc:'Все башни наносят больше',icon:'🏹',color:'#f80',
            apply(){for(const b of Buildings.list)b.level=Math.min(3,b.level+1);}});
        // Hero HP
        pool.push({name:'+30 HP Герой',desc:'Максимум HP героя',icon:'♥',color:'#f44',
            apply(){Hero.maxHp+=30;Hero.hp+=30;}});
        // Hero speed
        pool.push({name:'+15% Скорость',desc:'Герой двигается быстрее',icon:'»',color:'#4ff',
            apply(){Hero.speed*=1.15;}});
        // Gold bonus
        pool.push({name:'+25 Золото',desc:'Немедленно получить',icon:'💰',color:'#ff0',
            apply(){Game.gold+=25;}});
        // Core heal
        pool.push({name:'+20 HP Ядро',desc:'Починить ядро',icon:'💎',color:'#4af',
            apply(){Game.coreHp=Math.min(CFG.CORE_HP,Game.coreHp+20);}});
        // Hero heal
        if(Hero.hp<Hero.maxHp)
            pool.push({name:'Лечение героя',desc:'Полное восстановление',icon:'✚',color:'#4f4',
                apply(){Hero.hp=Hero.maxHp;}});
        // Ability CD reduction
        pool.push({name:'-20% Кулдаун',desc:'Способности быстрее',icon:'↻',color:'#a5f',
            apply(){const h=HEROES[Hero.classIdx];for(let i=0;i<3;i++)h.abilities[i].cd*=.8;}});
        // Extra tower range
        pool.push({name:'+1 Дальность башен',desc:'Все башни бьют дальше',icon:'👁',color:'#8ef',
            apply(){for(const k in TOWER_DEFS)if(TOWER_DEFS[k].range)TOWER_DEFS[k].range+=.5;}});
        // Hero attack
        pool.push({name:'+5 Атака героя',desc:'Авто-атака сильнее',icon:'⚔',color:'#ccc',
            apply(){CFG.HERO_DMG+=5;}});

        // Shuffle & pick 3
        for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
        return pool.slice(0,3);
    }
};
