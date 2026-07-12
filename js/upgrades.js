// ============ UPGRADE SYSTEM ============
const Upgrades = {
    pool: [],

    // Build pool of available upgrades
    buildChoices() {
        this.pool = [];
        const owned = Player.weapons.map(w => w.key);

        // Weapon level ups
        for (const w of Player.weapons) {
            if (w.level < 8) {
                const def = WEAPON_DEFS[w.key];
                this.pool.push({
                    type: 'weapon_up', key: w.key,
                    name: `${def.name} Lv${w.level+1}`,
                    desc: `+30% урон, -10% кулдаун`,
                    icon: def.icon, color: def.color
                });
            }
        }

        // New weapons (not owned yet)
        for (const key in WEAPON_DEFS) {
            if (!owned.includes(key) && Player.weapons.length < 6) {
                const def = WEAPON_DEFS[key];
                this.pool.push({
                    type: 'weapon_new', key,
                    name: def.name,
                    desc: def.desc,
                    icon: def.icon, color: def.color
                });
            }
        }

        // Stat upgrades
        if (Player.maxHp < 300)
            this.pool.push({ type:'stat', stat:'hp', name:'+20 Здоровье', desc:'Макс HP +20', icon:'♥', color:'#f44' });
        if (Player.speedBonus < 50)
            this.pool.push({ type:'stat', stat:'speed', name:'+8% Скорость', desc:'Быстрее двигаться', icon:'»', color:'#4ff' });
        if (Player.dmgBonus < 100)
            this.pool.push({ type:'stat', stat:'dmg', name:'+10% Урон', desc:'Все оружия сильнее', icon:'⚔', color:'#f80' });
        if (Player.cdReduction < 40)
            this.pool.push({ type:'stat', stat:'cd', name:'-8% Кулдаун', desc:'Оружия стреляют чаще', icon:'↻', color:'#af0' });
        if (Player.magnetRange < 200)
            this.pool.push({ type:'stat', stat:'magnet', name:'+30 Магнит', desc:'Притягивать опыт издалека', icon:'◎', color:'#ff0' });
        if (Player.extraProj < 3)
            this.pool.push({ type:'stat', stat:'proj', name:'+1 Снаряд', desc:'Все оружия +1 снаряд', icon:'+', color:'#f0f' });

        // Heal
        if (Player.hp < Player.maxHp)
            this.pool.push({ type:'heal', name:'Лечение', desc:`Восстановить 30 HP`, icon:'✚', color:'#0f0' });

        // Shuffle and pick N
        for (let i = this.pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.pool[i], this.pool[j]] = [this.pool[j], this.pool[i]];
        }
        return this.pool.slice(0, CFG.UPGRADE_CHOICES);
    },

    apply(choice) {
        switch (choice.type) {
            case 'weapon_up': {
                const w = Player.getWeapon(choice.key);
                if (w) { w.level++; w.recalc(); }
                break;
            }
            case 'weapon_new':
                Player.addWeapon(choice.key);
                break;
            case 'stat':
                switch (choice.stat) {
                    case 'hp': Player.maxHp += 20; Player.hp += 20; break;
                    case 'speed': Player.speedBonus += 8; break;
                    case 'dmg': Player.dmgBonus += 10; break;
                    case 'cd': Player.cdReduction += 8; break;
                    case 'magnet': Player.magnetRange += 30; break;
                    case 'proj':
                        Player.extraProj++;
                        for (const w of Player.weapons) { w.count++; }
                        break;
                }
                break;
            case 'heal':
                Player.hp = Math.min(Player.maxHp, Player.hp + 30);
                break;
        }
        // Recalc all weapons with damage bonus & cd reduction
        for (const w of Player.weapons) {
            const def = WEAPON_DEFS[w.key];
            const l = w.level;
            w.dmg = Math.floor(def.baseDmg * (1 + (l-1) * 0.3) * (1 + Player.dmgBonus / 100));
            w.cd = Math.max(100, def.baseCd * Math.pow(0.9, l-1) * (1 - Player.cdReduction / 100));
        }
    }
};
