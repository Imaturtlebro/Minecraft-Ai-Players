import { world, system, Entity, ScoreboardObjective, EntityHealthComponent, ItemStack } from "@minecraft/server";

// ====================================================================
// AI 实体和属性常量
// ====================================================================
const AI_ENTITY_TYPE_ID = "zps:newb"; // 你的 AI 实体 ID
const FOOD_INVENTORY_PROPERTY = "zps:food_inventory"; // 虚拟背包的动态属性键
const TRANSFER_SCOREBOARD_NAME = "FoodTransfer"; // 计分板名称
const COOKING_TAG = "is_busy_cooking"; // 烹饪标签
const EATING_TAG = "on_eat";
const BUILDING_TAG = "is_busy_building";
const UPGRADING_TAG = "is_upgrading";
const NO_FOOD_TAG = "no_food";
const EATING_ANIM_TAG = "is_eating";
import { ALL_AI_CACHE } from "./greeting.js"; 
const COOKING_EXCLUDE_TAGS = ["wooden", EATING_TAG, BUILDING_TAG, UPGRADING_TAG, COOKING_TAG];

// ====================================================================
// 食物配置表 (FOOD_SETTINGS)
// (基于你提供的 eat_food.js，并修正了生肉的 effects 语法)
// ====================================================================

const FOOD_SETTINGS = {
    "minecraft:enchanted_golden_apple":   { 
        weight: 50,
        code: 100,
        health: 8,
        target: true,
        effects: [ 
            { id: 'regeneration', level: 2, duration: 36 },
            { id: 'absorption', level: 3, duration: 120 },
            { id: 'fire_resistance', level: 0, duration: 300 },
            { id: 'resistance', level: 0, duration: 300 }
        ]
    },
    "minecraft:golden_apple":   { 
        weight: 49,
        code: 200,
        health: 8,
        target: true,
        effects: [ 
            { id: 'regeneration', level: 2, duration: 8 },
            { id: 'absorption', level: 0, duration: 120 }
        ]
    },
    "minecraft:chorus_fruit":   { 
        weight: 48,
        code: 300,
        health: 8,
        target: true,
        effects: [ 
            { id: 'regeneration', level: 2, duration: 6 }
        ],
        commands: "spreadplayers ~ ~ 1 8 @s; playsound mob.endermen.portal @a[r=24]"
    },
    "minecraft:rabbit_stew":   { 
        weight: 47,
        code: 400,
        effects: [ 
            { id: 'regeneration', level: 2, duration: 12 }
        ]
    },
    "minecraft:golden_carrot":   { 
        weight: 46,
        code: 500,
        effects: [ 
            { id: 'regeneration', level: 2, duration: 10 }
        ]
    },
    "minecraft:cooked_beef":   { 
        weight: 45,
        code: 600,
        effects: [ 
            { id: 'regeneration', level: 2, duration: 8 }
        ]
    },
    "minecraft:cooked_porkchop":   { 
        weight: 44,
        code: 700,
        effects: [ 
            { id: 'regeneration', level: 2, duration: 8 }
        ]
    },
    "minecraft:pumpkin_pie":   { 
        weight: 43,
        code: 800,
        effects: [ 
            { id: 'regeneration', level: 2, duration: 7 }
        ]
    },
    "minecraft:beetroot_soup":   { 
        weight: 42,
        code: 900,
        effects: [ 
            { id: 'regeneration', level: 2, duration: 7 }
        ]
    },
    "minecraft:mushroom_stew":   { 
        weight: 41,
        code: 1000,
        effects: [ 
            { id: 'regeneration', level: 2, duration: 7 }
        ]
    },
    "minecraft:suspicious_stew":   { 
        weight: 40,
        code: 1100,
        effects: [ 
            { id: 'regeneration', level: 2, duration: 7 }
        ]
    },
    "minecraft:honey_bottle":   { 
        weight: 39,
        code: 1200,
        effects: [ 
            { id: 'regeneration', level: 2, duration: 6 }
        ]
    },
    "minecraft:cooked_mutton":   { 
        weight: 38,
        code: 1300,
        effects: [ 
            { id: 'regeneration', level: 2, duration: 6 }
        ]
    },
    "minecraft:cooked_chicken":   { 
        weight: 37,
        code: 1400,
        effects: [ 
            { id: 'regeneration', level: 2, duration: 6 }
        ]
    },
    "minecraft:cooked_salmon":   { 
        weight: 36,
        code: 1500,
        effects: [ 
            { id: 'regeneration', level: 2, duration: 6 }
        ]
    },
    "minecraft:baked_potato":   { 
        weight: 35,
        code: 1600,
        effects: [ 
            { id: 'regeneration', level: 2, duration: 5 }
        ]
    },
    "minecraft:bread":   { 
        weight: 34,
        code: 1700,
        effects: [ 
            { id: 'regeneration', level: 2, duration: 5 }
        ]
    },
    "minecraft:cooked_cod":   { 
        weight: 33,
        code: 1800,
        effects: [ 
            { id: 'regeneration', level: 2, duration: 5 }
        ]
    },
    "minecraft:cooked_rabbit":   { 
        weight: 32,
        code: 1900,
        effects: [ 
            { id: 'regeneration', level: 2, duration: 5 }
        ]
    },
    "minecraft:apple":   { 
        weight: 31,
        code: 2000,
        effects: [ 
            { id: 'regeneration', level: 2, duration: 4 }
        ]
    },
    "minecraft:carrot":   { 
        weight: 30,
        code: 2100,
        effects: [ 
            { id: 'regeneration', level: 2, duration: 3 }
        ]
    },
    "minecraft:sweet_berries":   { 
        weight: 29,
        code: 2200,
        effects: [ 
            { id: 'regeneration', level: 2, duration: 2 }
        ]
    },
    "minecraft:tropical_fish":   { 
        weight: 28,
        code: 2300,
        effects: [ 
            { id: 'regeneration', level: 2, duration: 2 }
        ]
    },
    "minecraft:glow_berries":   { 
        weight: 27,
        code: 2400,
        effects: [ 
            { id: 'regeneration', level: 2, duration: 2 }
        ]
    },
    "minecraft:melon_slice":   { 
        weight: 25,
        code: 2600,
        effects: [ 
            { id: 'regeneration', level: 2, duration: 2 }
        ]
    },
    "minecraft:cookie":   { 
        weight: 24,
        code: 2700,
        effects: [ 
            { id: 'regeneration', level: 2, duration: 2 }
        ]
    },
    "minecraft:dried_kelp":   { 
        weight: 23,
        code: 2800,
        effects: [ 
            { id: 'regeneration', level: 2, duration: 2 }
        ]
    },
    "minecraft:beetroot":   { 
        weight: 22,
        code: 2900,
        effects: [ 
            { id: 'regeneration', level: 2, duration: 2 }
        ]
    },
    "minecraft:beef": { 
        weight: 21,
        code: 3000,
        target: true,
        isRaw: true, 
        cookTo: "minecraft:cooked_beef",
        effects: [
            { id: 'regeneration', level: 2, duration: 3 }
        ]
    },
    "minecraft:porkchop": { 
        weight: 20,
        code: 3100,
        target: true,
        isRaw: true, 
        cookTo: "minecraft:cooked_porkchop",
        effects: [
            { id: 'regeneration', level: 2, duration: 3 }
        ]
    },
    "minecraft:rabbit": { 
        weight: 19,
        code: 3200,
        target: true,
        isRaw: true, 
        cookTo: "minecraft:cooked_rabbit",
        effects: [
            { id: 'regeneration', level: 2, duration: 3 }
        ]
    },
    "minecraft:salmon": { 
        weight: 18,
        code: 3300,
        target: true,
        isRaw: true, 
        cookTo: "minecraft:cooked_salmon",
        effects: [
            { id: 'regeneration', level: 2, duration: 3 }
        ]
    },
    "minecraft:cod": { 
        weight: 17,
        code: 3400,
        target: true,
        isRaw: true, 
        cookTo: "minecraft:cooked_cod",
        effects: [
            { id: 'regeneration', level: 2, duration: 2 }
        ]
    },
    "minecraft:mutton": { 
        weight: 16,
        code: 3500,
        target: true,
        isRaw: true, 
        cookTo: "minecraft:cooked_mutton",
        effects: [
            { id: 'regeneration', level: 2, duration: 2 }
        ]
    },
    "minecraft:chicken": { 
        weight: 15,
        code: 3600,
        target: true,
        isRaw: true, 
        cookTo: "minecraft:cooked_chicken",
        effects: [
            { id: 'regeneration', level: 2, duration: 2 }
        ]
    },
    "minecraft:potato": { 
        weight: 14,
        code: 3700,
        target: true,
        isRaw: true, 
        cookTo: "minecraft:baked_potato",
        effects: [
            { id: 'regeneration', level: 2, duration: 2 }
        ]
    },
};

// ====================================================================
// 初始食物背包配置表
// ====================================================================

const INITIAL_FOOD_INVENTORY = {
    // 你的装备等级标签
    "wooden": {
        "minecraft:apple": { min: 0, max: 2 }, 
        "minecraft:bread": { min: 0, max: 1 },
        "minecraft:porkchop": { min: 0, max: 2 } 
    },
    "stone": {
        "minecraft:apple": { min: 1, max: 2 },
        "minecraft:cooked_chicken": { min: 0, max: 4 },
        "minecraft:mutton": { min: 1, max: 5 } 
    },
    "copper": {
        "minecraft:cooked_chicken": { min: 3, max: 8 },
        "minecraft:cooked_beef": { min: 2, max: 10 },
        "minecraft:bread": { min: 3, max: 8 }
    },
    "iron": {
        "minecraft:cooked_beef": { min: 15, max: 20 },
        "minecraft:bread": { min: 15, max: 20 },
        "minecraft:cooked_porkchop": { min: 5, max: 10 }
    },
    "diamond": {
        "minecraft:cooked_beef": { min: 24, max: 32 },
        "minecraft:cooked_porkchop": { min: 10, max: 20 },
        "minecraft:chorus_fruit": { min: 0, max: 1 },
        "minecraft:golden_apple": { min: 1, max: 3 } 
    },
    "diamond_pro": {
        "minecraft:cooked_beef": { min: 32, max: 48 },
        "minecraft:enchanted_golden_apple": { min: 1, max: 2 },
        "minecraft:chorus_fruit": { min: 0, max: 2 },
        "minecraft:golden_carrot": { min: 16, max: 32 }
    }
};

// ====================================================================
// 辅助工具函数
// ====================================================================

// food.js (新增辅助函数部分)

/**
 * 监听实体死亡事件，处理虚拟背包的转移和掉落。
 */
function listenForFoodTransferOnDeath() {
    world.afterEvents.entityDie.subscribe(event => {
        const deadEntity = event.deadEntity;
        const killer = event.damageSource.damagingEntity;

        // 1. 确保死者是 AI 玩家
        if (deadEntity.typeId !== AI_ENTITY_TYPE_ID) {
            return;
        }

        const deadAiInventory = getVirtualInventory(deadEntity);
        // 如果背包为空，直接返回
        if (Object.keys(deadAiInventory).length === 0) {
            return;
        }
        
        // 清空死亡者的背包 (无论哪种死法，都会清空)
        setVirtualInventory(deadEntity, {}); 

        let isKillerAI = killer && killer.typeId === AI_ENTITY_TYPE_ID;
        let isKillerPlayer = killer && killer.typeId === 'minecraft:player';

        // ----------------------------------------
        // 情况 A: AI 击杀 AI - 食物转移
        // ----------------------------------------
        if (isKillerAI) {
            const killerAi = killer;
            
            // 将死者的所有食物转移给击杀者
            for (const itemId in deadAiInventory) {
                const count = deadAiInventory[itemId];
                changeFoodCount(killerAi, itemId, count); 
            }
            

        // ----------------------------------------
        // 情况 B: 玩家击杀 AI - 食物掉落
        // 【修正：仅当击杀者是玩家时执行】
        // 【新增：Chunk Loaded 检查】
        // ----------------------------------------
        } else if (isKillerPlayer) {
            
            const dropLocation = deadEntity.location;
            const dimension = deadEntity.dimension;
            
            // 【新增】在掉落前检查区块是否加载
            try {
                // 检查掉落位置的区块是否已加载
                if (!dimension.isChunkLoaded(dropLocation)) {
                     return; // 提前退出
                }
            } catch (e) {
                 return;
            }

            // 掉落所有食物
            for (const itemId in deadAiInventory) {
             const count = deadAiInventory[itemId];
                // 确保 ItemStack 是可用的类
                const itemStack = new ItemStack(itemId, count); 
                
                try {
                    // 使用 dimension.spawnItem 掉落
                    dimension.spawnItem(itemStack, dropLocation);
                } catch (e) {
                }
            }
        }
    });
}

/**
 * 生成一个在 [min, max] 区间内的随机整数
 */
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 从 AI 实体获取虚拟背包内容 (JSON -> Object)
 * @param {Entity} ai
 * @returns {Object}
 */
function getVirtualInventory(ai) {
    const raw = ai.getDynamicProperty(FOOD_INVENTORY_PROPERTY);
    if (!raw) return {};
    try {
        return JSON.parse(raw);
    } catch (e) {
        console.error(`解析AI背包失败: ${ai.id}`, e);
        return {};
    }
}

/**
 * 设置 AI 实体虚拟背包内容 (Object -> JSON)
 * @param {Entity} ai
 * @param {Object} inventory
 */
function setVirtualInventory(ai, inventory) {
    ai.setDynamicProperty(FOOD_INVENTORY_PROPERTY, JSON.stringify(inventory));
    // 设置后立即更新 no_food 标签
    updateNoFoodTag(ai, inventory);
}

/**
 * 检查背包是否为空并更新 no_food 标签
 * @param {Entity} ai
 * @param {Object} inventory
 */
function updateNoFoodTag(ai, inventory) {
    if (!ai.isValid) return;

    // 检查背包中是否还有任何数量大于 0 的食物
    const hasFood = Object.values(inventory).some(count => count > 0);
    
    if (hasFood) {
        ai.removeTag("no_food");
    } else {
        ai.addTag("no_food");
    }
}

/**
 * 增加或减少物品数量，并自动更新 no_food 标签
 * @param {Entity} ai
 * @param {string} itemId
 * @param {number} count
 */
function changeFoodCount(ai, itemId, count) {
    const inventory = getVirtualInventory(ai);
    inventory[itemId] = (inventory[itemId] || 0) + count;
    
    // 清除数量为 0 或以下的物品
    if (inventory[itemId] <= 0) {
        delete inventory[itemId];
    }
    
    setVirtualInventory(ai, inventory); // setVirtualInventory 会自动调用 updateNoFoodTag
}

/**
 * 动态构建一个从 code 映射到 itemId 的 Map
 * @returns {Map<number, string>}
 */
function buildCodeToIdMap() {
    const map = new Map();
    for (const itemId in FOOD_SETTINGS) {
        const config = FOOD_SETTINGS[itemId];
        if (config.code) {
            map.set(config.code, itemId);
        }
    }
    return map;
}


// ====================================================================
// 核心逻辑函数
// ====================================================================

/**
 * 1. AI 玩家生成时，根据等级标签初始化背包
 * @param {Entity} ai
 */
function initializeFoodInventory(ai) {
    // 检查 AI 是否已经有背包数据
    const existingInventory = ai.getDynamicProperty(FOOD_INVENTORY_PROPERTY);
    if (existingInventory) {
        // 如果已经有背包，只确保 no_food 标签是正确的
        updateNoFoodTag(ai, getVirtualInventory(ai));
        return; 
    }
    
    const aiTags = ai.getTags();
    let tierConfig = null;
    
    // 遍历 INITIAL_FOOD_INVENTORY 找到匹配的等级标签
    // (从高到低检查，防止 diamond AI 只匹配到 wooden)
    const tiers = ["diamond_pro", "diamond", "iron", "copper", "stone", "wooden"];
    for (const tag of tiers) {
        if (aiTags.includes(tag) && INITIAL_FOOD_INVENTORY[tag]) {
            tierConfig = INITIAL_FOOD_INVENTORY[tag];
            break; 
        }
    }

    const initialInventory = {};
    if (tierConfig) {
        // 遍历配置，随机化数量
        for (const itemId in tierConfig) {
            const range = tierConfig[itemId];
            if (range.min !== undefined && range.max !== undefined && range.max >= range.min) {
                const count = getRandomInt(range.min, range.max);
                if (count > 0) {
                    initialInventory[itemId] = count;
                }
            }
        }
        // console.log(`AI ${ai.nameTag} 初始化背包为 ${Object.keys(tierConfig)[0] || 'unknown'} 级配置。`);
    }
    
    // 设置背包（即使是空背包 {}），并更新 no_food 标签
    setVirtualInventory(ai, initialInventory);
}

/**
 * 2. 处理玩家给予食物（计分板转移）
 * @param {Entity} ai
 * @param {Map<number, string>} codeToIdMap
 * @param {ScoreboardObjective} scoreboard
 */
function processFoodTransfer(ai, codeToIdMap, scoreboard) {
    try {
        const score = scoreboard.getScore(ai); 

        if (score && score > 0) {
            // 解码核心：只获取 Item Code (我们假设分数就是 100, 200 等)
            const itemCode = score;
            
            // 硬编码数量为 1
            const transferCount = 1; 

            // 查找对应的 Item ID
            const itemId = codeToIdMap.get(itemCode); 
            
            if (itemId) {
                // 我们在之前的讨论中决定不使用随机倍数，而是固定+1
                // 如果你需要随机倍数，取消下面一行的注释
                // const randomMultiplier = Math.floor(Math.random() * 5) + 1;
                const finalCount = transferCount; // * randomMultiplier;

                changeFoodCount(ai, itemId, finalCount);
                // world.sendMessage(`§eAI ${ai.nameTag} 获得了 ${finalCount} 个 ${itemId.split(':')[1]}`);
            }
            
            // 清零计分板
            scoreboard.setScore(ai, 0); 
        }
    } catch (e) {
        // 忽略错误 (例如玩家不在计分板上)
        // 第一次设置时，需要先将玩家设为0分
        try { scoreboard.setScore(ai, 0); } catch (e2) {}
    }
}

/**
 * 3. 处理 AI 吃东西的行为 (当有 on_eat 标签时)
 * @param {Entity} ai
 */
function handleAiEating(ai) {
    const inventory = getVirtualInventory(ai);
    let bestFoodId = null;
    let highestWeight = -1;
    
    const healthComponent = ai.getComponent(EntityHealthComponent.componentId);
    if (!healthComponent) return;
    const currentHealth = healthComponent.currentValue;
    
    const isInCombat = ai.target !== undefined; 

    // 1. 查找最高权重且符合条件的食物
    for (const itemId in inventory) {
        const config = FOOD_SETTINGS[itemId];

        // 确保物品存在于配置中且数量 > 0
        if (inventory[itemId] > 0 && config) {
            
            // 检查 Health 限制
            if (config.health !== undefined && currentHealth > config.health) {
                continue; 
            }
            
            // 检查 Target 限制
            if (config.target === true && !isInCombat) {
                continue; // 这是战斗食物，但 AI 不在战斗中
            }
            
            
            // 检查权重
            if (config.weight > highestWeight) {
                highestWeight = config.weight;
                bestFoodId = itemId;
            }
        }
    }

    if (bestFoodId) {
        const foodSetting = FOOD_SETTINGS[bestFoodId];
        
        // 2. 消耗食物
        changeFoodCount(ai, bestFoodId, -1);
        
        // 3. 执行吃东西动画和声音
        try {
             ai.addTag(EATING_ANIM_TAG);
            // 替换手中物品
            ai.runCommand(`replaceitem entity @s slot.weapon.mainhand 0 ${bestFoodId}`);
            ai.runCommand(`effect @s slowness 2 1 true`);
            // 播放动画
            ai.runCommand('playanimation @s eat_item_custom');

            // 循环播放吃东西声音 (每 5 刻一次，持续 45 刻)
            const soundTicks = [1, 5, 9, 13, 17, 21, 25, 29, 33, 37, 41, 45, 49];
            for (const tick of soundTicks) {
                system.runTimeout(() => {
                    if (ai.isValid) {
                        ai.runCommand("playsound random.eat @a[r=8]");
                    }
                }, tick);
            }

            // 4. 动画结束（第 50 刻）
            system.runTimeout(() => {
                if (!ai.isValid) return;

                // 播放打嗝声
                ai.runCommand('playsound random.burp @a[r=8]');

                // 5. 应用效果
                if (foodSetting.effects && Array.isArray(foodSetting.effects)) {
                    for (const effect of foodSetting.effects) {
                        ai.runCommand(`effect @s ${effect.id} ${effect.duration} ${effect.level}`);
                    }
                }
                
                // 6. 执行命令 (处理分号)
                if (foodSetting.commands) {
                    const commandList = foodSetting.commands.split(';').map(cmd => cmd.trim()).filter(cmd => cmd.length > 0);
                    for (const command of commandList) {
                        try {
                            ai.runCommand(command);
                        } catch (e) {
                            console.error(`AI命令执行失败: ${command}`, e);
                        }
                    }
                }
                
                // 7. 移除标签
                ai.removeTag('on_eat');
                ai.removeTag(EATING_ANIM_TAG);

            }, 50); // 50 刻 = 2.5 秒

        } catch (e) {
            console.error(`AI吃东西时出错: ${ai.id}`, e);
            ai.removeTag('on_eat'); // 即使出错也要移除标签，防止卡死
        }
        
    } else {
        // 找不到可吃的食物（可能因为健康或战斗限制）
        ai.removeTag('on_eat');
    }
}

/**
 * 4. 处理 AI 烹饪生肉的行为 (空闲时)
 * @param {Entity} ai
 */
function handleAiCooking(ai) {
    // 检查是否有生肉
    const inventory = getVirtualInventory(ai);
    const rawFoodIds = Object.keys(inventory).filter(id => 
        inventory[id] > 0 && FOOD_SETTINGS[id]?.isRaw
    );

    if (rawFoodIds.length === 0) return; // 没有生肉，跳过

    // 检查 15% 概率
    if (Math.random() > 0.15) return;

    // --- 概率通过，开始烹饪 ---
    
    ai.addTag(COOKING_TAG);

    // 1. 放置熔炉 (参考你的 initiateUpgradeProcess)
    const aiLoc = ai.location;
    // 在 AI 附近 2 格位置放置
    const furnacePos = { x: Math.floor(aiLoc.x) + 2, y: Math.floor(aiLoc.y), z: Math.floor(aiLoc.z) };
    ai.lookAt({ 
        x: furnacePos.x + 0.5, 
        y: furnacePos.y + 0.5, 
        z: furnacePos.z + 0.5 
    });
    ai.runCommand('playanimation @s set_block');
    ai.dimension.runCommand(`setblock ${furnacePos.x} ${furnacePos.y} ${furnacePos.z} furnace`);
    ai.runCommand('playsound dig.stone @a[r=16]');

    // 2. 触发烹饪事件
    ai.triggerEvent("zps:event_go_cooking"); 

    // 3. 2-3 秒后点燃熔炉 (我们取 50 tick)
    system.runTimeout(() => {
        if (!ai?.isValid) return; // AI 可能已死亡
        // 仅在原位还是熔炉时才点燃
        ai.dimension.runCommand(`testforblock ${furnacePos.x} ${furnacePos.y} ${furnacePos.z} furnace`);
        // (上面的命令在脚本中无法直接获取结果，我们假设它还在)
        ai.dimension.runCommand(`setblock ${furnacePos.x} ${furnacePos.y} ${furnacePos.z} lit_furnace`);
    }, 50); // 2.5 秒

    // 4. 15 秒后完成烹饪 (300 tick)
    system.runTimeout(() => {
        if (!ai?.isValid) return; // AI 可能已死亡或被中断
        
        // 移除熔炉
        ai.runCommand('playanimation @s set_block');
        ai.dimension.runCommand(`setblock ${furnacePos.x} ${furnacePos.y} ${furnacePos.z} air`);
        ai.runCommand('playsound dig.stone @a[r=16]');
        
        // 移除标签并触发停止事件
        ai.removeTag(COOKING_TAG);
        ai.triggerEvent("zps:event_stop_cooking");
        
        // 5. 转换虚拟背包中的所有生肉
        const currentInv = getVirtualInventory(ai);
        const itemsToAdd = {};
        
        for (const itemId in currentInv) {
            const config = FOOD_SETTINGS[itemId];
            if (currentInv[itemId] > 0 && config?.isRaw && config.cookTo) {
                const count = currentInv[itemId];
                const cookedId = config.cookTo;
                
                // 记录要添加的熟食
                itemsToAdd[cookedId] = (itemsToAdd[cookedId] || 0) + count;
                
                // 删除生肉
                delete currentInv[itemId];
            }
        }
        
        // 批量添加熟食
        for (const cookedId in itemsToAdd) {
            currentInv[cookedId] = (currentInv[cookedId] || 0) + itemsToAdd[cookedId];
        }
        
        // 保存最终的背包
        setVirtualInventory(ai, currentInv);
        
        // console.log(`AI ${ai.nameTag} 烹饪完成。`);

    }, 300); // 15 秒
}

// ====================================================================
// 主系统初始化 (导出)
// ====================================================================

export function initializeFoodSystem() {
    
    // 1. 构建计分板 code -> item_id 映射表 (保持不变)
    const codeToIdMap = buildCodeToIdMap();

    // 2. AI 实体生成事件 (保持不变)
    world.afterEvents.entitySpawn.subscribe(event => {
        const entity = event.entity;
        if (entity.typeId === AI_ENTITY_TYPE_ID) {
            // 初始化食物背包和标签
            initializeFoodInventory(entity);
        }
    });
    
    listenForFoodTransferOnDeath(); 
    
    // 3. 快速循环（计分板检测 和 吃东西）- 每 10 tick (0.5秒) 
    system.runInterval(() => {
        
        // -------------------------------------------------------------------
        // 【核心优化 1】使用全局缓存 ALL_AI_CACHE 替代昂贵的维度查询循环
        // -------------------------------------------------------------------
        const allAis = ALL_AI_CACHE; 
        if (!allAis || allAis.length === 0) return;
        
        let scoreboard;
        try {
            // 在循环中获取计分板，避开权限问题
            scoreboard = world.scoreboard.getObjective(TRANSFER_SCOREBOARD_NAME);
        } catch (e) {
            scoreboard = null;
        }

        for (const ai of allAis) {
            
            // 【安全性检查】必须检查实体有效性
            if (!ai.isValid) continue;

            // A. 处理计分板转移 (需要所有 AI)
            if (scoreboard) {
                processFoodTransfer(ai, codeToIdMap, scoreboard);
            }
            
            // B. 检查吃东西的条件 (对所有 AI 进行标签检查)
            if (ai.hasTag(EATING_TAG) && 
                !ai.hasTag(NO_FOOD_TAG) && 
                !ai.hasTag(BUILDING_TAG) && 
                !ai.hasTag(UPGRADING_TAG) &&
                !ai.hasTag(EATING_ANIM_TAG)) 
            {
                handleAiEating(ai);
            }
        }
    }, 10); 

    // 4. 慢速循环（烹饪）- 每 200 tick (10秒)
    system.runInterval(() => {
        
        // -------------------------------------------------------------------
        // 【核心优化 1】使用全局缓存 ALL_AI_CACHE 替代昂贵的维度查询循环
        // -------------------------------------------------------------------
        const allAis = ALL_AI_CACHE;
        if (!allAis || allAis.length === 0) return;
        
        // 【核心优化 2】在 JS 内存中进行快速过滤
        const cookableAis = allAis.filter(ai => {
            // 【安全性检查】
            if (!ai.isValid) return false;

            // 检查是否包含任何忙碌标签或低等级标签
            for (const tag of COOKING_EXCLUDE_TAGS) {
                if (ai.hasTag(tag)) {
                    return false; // 忙碌/低等级，排除
                }
            }
            
            // 检查是否有目标 (空闲状态)
            if (ai.target !== undefined) {
                 return false;
            }

            return true; // 空闲且高等级，保留
        });

        for (const ai of cookableAis) {
            // 【安全性检查】防御性编程
            if (!ai.isValid) continue;
            
            handleAiCooking(ai);
        }
    }, 200);
    
    
}