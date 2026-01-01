import { world, system, Entity } from "@minecraft/server";
import { ALL_AI_CACHE } from "./greeting.js";

// ====================================================================
// 常量和依赖
// ====================================================================
const AI_ENTITY_TYPE_ID = "zps:newb"; 
const HUNTING_TAG = "allow_attack"; // 狩猎/攻击标签
const TAG_DURATION_TICKS = 40; // 攻击标签持续时间：2秒
const FOOD_INVENTORY_PROPERTY = "zps:food_inventory"; // 依赖于 food.js 的背包属性
const COOKING_TAG = "is_busy_cooking"; // 烹饪标签
const EATING_TAG = "on_eat";
const BUILDING_TAG = "is_busy_building";
const UPGRADING_TAG = "is_upgrading";
const NO_FOOD_TAG = "no_food";
const EATING_ANIM_TAG = "is_eating";
const BUSY_TAGS = ['allow_attack', 'on_eat', 'is_busy_building', 'is_upgrading', 'is_busy_cooking'];

// 狩猎等级配置 (由食物总数量决定)
const HUNTING_CONFIGS = [
    // 档位 1: 食物充足
    { 
        name: "Sufficient", 
        maxQuantity: 9999999, // 数量上限，确保包含所有
        minQuantity: 24,   // 数量 >= 24
        intervalTicks: 600, // 30 秒
        probability: 0.05    // 5% 概率
    },
    // 档位 2: 需要补充
    { 
        name: "NeedsRefill", 
        maxQuantity: 23, 
        minQuantity: 9,      // 数量 9 到 23
        intervalTicks: 300,  // 15 秒
        probability: 0.10    // 10% 概率
    },
    // 档位 3: 食物告急
    { 
        name: "Critical", 
        maxQuantity: 8, 
        minQuantity: 0,      // 数量 0 到 8
        intervalTicks: 200,  // 10 秒
        probability: 0.20    // 20% 概率
    }
];

// 击杀奖励配置
const KILL_REWARDS = {
    "minecraft:cow": {
        foodId: "minecraft:beef", // 奖励牛肉
        minCount: 1, 
        maxCount: 3,
        clearsDrops: true // 是否清除掉落物 (原版牛肉、皮革等)
    },
    "minecraft:pig": {
        foodId: "minecraft:porkchop", 
        minCount: 1, 
        maxCount: 3,
        clearsDrops: true
    },
    "minecraft:chicken": {
        foodId: "minecraft:chicken", 
        minCount: 1, 
        maxCount: 3,
        clearsDrops: true
    },
    "minecraft:sheep": {
        foodId: "minecraft:mutton", 
        minCount: 1, 
        maxCount: 3,
        clearsDrops: true
    },
    // 添加更多生物...
};


// ====================================================================
// 辅助工具函数
// ====================================================================

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 依赖于 food.js 的 getVirtualInventory
 * @param {Entity} ai
 * @returns {Object}
 */
function getVirtualInventory(ai) {
    const raw = ai.getDynamicProperty(FOOD_INVENTORY_PROPERTY);
    if (!raw) return {};
    try {
        return JSON.parse(raw);
    } catch (e) {
        return {};
    }
}

/**
 * 计算 AI 虚拟背包中食物的总数量
 * @param {Entity} ai
 * @returns {number}
 */
function getTotalFoodCount(ai) {
    const inventory = getVirtualInventory(ai);
    return Object.values(inventory).reduce((sum, count) => sum + count, 0);
}

/**
 * 依赖于 food.js 的 changeFoodCount
 * (为了避免循环依赖，我们在这里简单模拟，但在最终项目中应使用 food.js 中的导出函数)
 * @param {Entity} ai
 * @param {string} itemId
 * @param {number} count
 */
function changeFoodCount(ai, itemId, count) {
    const inventory = getVirtualInventory(ai);
    inventory[itemId] = (inventory[itemId] || 0) + count;
    
    if (inventory[itemId] <= 0) {
        delete inventory[itemId];
    }
    
    // 注意：这里需要重新设置 DynamicProperty，且需要实现 food.js 中的 setVirtualInventory 逻辑（包括 no_food 标签更新）
    // 为了让这个文件独立运行，我们在这里假设 setVirtualInventory 逻辑已被简化或通过其他方式导入。
    // 在最终项目中，请确保使用 food.js 中导出的 setVirtualInventory。
    ai.setDynamicProperty(FOOD_INVENTORY_PROPERTY, JSON.stringify(inventory));
    
    // 假设 food.js 的 updateNoFoodTag 会在某个地方被调用或导入
}


// ====================================================================
// 核心逻辑函数
// ====================================================================

/**
 * 授予 AI 狩猎标签，并在短时间后移除
 * @param {Entity} ai
 */
function giveAndRemoveTag(ai) {
    if (!ai.isValid) {
        return;
    }
    
    ai.addTag(HUNTING_TAG);
    // console.log(`AI ${ai.nameTag} 获得狩猎标签。`);

    system.runTimeout(() => {
        if (ai.isValid) {
            ai.removeTag(HUNTING_TAG);
            // console.log(`AI ${ai.nameTag} 移除狩猎标签。`);
        }
    }, TAG_DURATION_TICKS);
}

/**
 * 根据食物数量，动态检查 AI 是否进入狩猎状态
 * @param {Entity} ai
 * @param {string[]} excludeTags AI 应该跳过的标签
 */
function checkAndScheduleHunting(ai, excludeTags) {
    if (!ai.isValid) return;
    
    // 2. 计算食物总量，确定狩猎档位
    const foodCount = getTotalFoodCount(ai);
    let currentConfig = null;

    for (const config of HUNTING_CONFIGS) {
        if (foodCount >= config.minQuantity && foodCount <= config.maxQuantity) {
            currentConfig = config;
            break;
        }
    }

    if (!currentConfig) {
        // 理论上不会发生，但作为保底
        currentConfig = HUNTING_CONFIGS[0]; 
    }

    // 3. 概率判定
    if (Math.random() < currentConfig.probability) {
        giveAndRemoveTag(ai);
    }
}


/**
 * 监听实体死亡事件，给予 AI 击杀奖励并清除掉落物
 */
function listenForKillRewards() {
    world.afterEvents.entityDie.subscribe(event => {
        const deadEntity = event.deadEntity;
        const killer = event.damageSource.damagingEntity;

        if (!killer || killer.typeId !== AI_ENTITY_TYPE_ID) {
            return; // 确保是 AI 实体击杀
        }

        const rewardConfig = KILL_REWARDS[deadEntity.typeId];

        if (rewardConfig) {
            const ai = killer;
            const count = getRandomInt(rewardConfig.minCount, rewardConfig.maxCount);
            
            // A. 填充食物到虚拟背包
            changeFoodCount(ai, rewardConfig.foodId, count);
            
            // B. 清除掉落物
            if (rewardConfig.clearsDrops) {
                const loc = deadEntity.location;
                const dim = deadEntity.dimension;
                
                // 击杀位置小范围清除掉落物（半径 2 格）
                dim.runCommand(`kill @e[type=item, x=${loc.x}, y=${loc.y}, z=${loc.z}, r=2]`);
            }
            
            // console.log(`AI ${ai.nameTag} 击杀 ${deadEntity.typeId}，获得 ${count} 个 ${rewardConfig.foodId}`);
        }
    });
}


// ====================================================================
// 主系统初始化 (导出)
// ====================================================================

export function initializeAttackPermissionBehavior(excludeTags = []) {
    
    // 确保监听了击杀事件 (不变)
    // listenForKillRewards(); 

    // 动态狩猎调度循环 (每 10 刻检查一次)
    system.runInterval(() => {
        
        // 【核心优化 1】使用全局缓存获取所有 AI
        const allAis = ALL_AI_CACHE;
        if (!allAis || allAis.length === 0) return;

        // 【核心优化 2】在 JS 内存中进行快速过滤
        const idleAis = allAis.filter(ai => {
            // 确保实体有效
            if (!ai.isValid) return false;
            
            // 检查是否包含任何忙碌标签
            for (const tag of BUSY_TAGS) {
                if (ai.hasTag(tag)) {
                    return false; // 忙碌，排除
                }
            }
            
            return true; // 空闲，保留
        });

        for (const ai of idleAis) {
            // 在循环中进行概率判定和调度
            checkAndScheduleHunting(ai); // 假设 checkAndScheduleHunting 已经存在
        }

    }, 60); // 10 刻 (0.5 秒) 的高频率检查，现在开销极低

}
