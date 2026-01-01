import { world, system } from "@minecraft/server";
import { ALL_AI_CACHE } from "./greeting.js";

const AI_ENTITY_TYPE_ID = "zps:newb";
const PROGRESSION_PROPERTY = "zps:progression_points";
const PROGRESSION_PROPERTY_SC = "PROGRESSION_PROPERTY";
const UPGRADING_TAG = "is_upgrading";
const SUODING_TAG = "suoding";
const BUSY_TAGS = ["is_upgrading", "on_eat", "is_busy_cooking", "is_busy_building"];

const MOB_KILL_POINTS = {
    // === 亡灵类 (Undead) ===
    "minecraft:zombie": 6,
    "minecraft:husk": 8,        // 沙漠变种，略强
    "minecraft:drowned": 8,     // 水下战斗，略难
    "minecraft:zombie_villager": 6, // 略高于普通僵尸
    "minecraft:skeleton": 7,
    "minecraft:stray": 9,       // 冰霜变种，带迟缓箭
    "minecraft:bogged": 10,      // 毒箭变种
    "minecraft:wither_skeleton": 13, // 下界堡垒，血量高，带凋零效果
    "minecraft:zombie_pigman": 14, // 群体仇恨，高基础值
    
    // === 基础/爬行类 (Basic/Crawlers) ===
    "minecraft:creeper": 12,    // 爆炸风险高
    "minecraft:spider": 6,
    "minecraft:cave_spider": 8,  // 带中毒效果
    "minecraft:slime": 2,
    "minecraft:pig": 3,
    "minecraft:cow": 5,
    "minecraft:chicken": 4,
    "minecraft:sheep": 3,
    "minecraft:magma_cube": 3,  // 下界变种
    "minecraft:iron_golem": 100,
    "minecraft:warden": 200,
    
    // === 特殊/施法类 (Special/Casters) ===
    "minecraft:witch": 15,      // 投掷药水
    "minecraft:phantom": 12,    // 飞行且高空偷袭
    "minecraft:enderman": 18,   // 瞬移，高血量
    "minecraft:shulker": 12,    // 漂浮射弹，带漂浮效果
    "minecraft:endermite": 6,
    "minecraft:breeze": 18,     // 强力近战和风力投射物，高难度
    
    // === 海洋类 (Ocean) ===
    "minecraft:guardian": 25,
    "minecraft:elder_guardian": 60, // 迷你 Boss 级别
    
    // === 掠夺者类 (Pillagers) ===
    "minecraft:pillager": 10,
    "minecraft:vindicator": 25,
    "minecraft:evoker": 30,     // 召唤/尖牙攻击，高威胁
    "minecraft:ravager": 50,    // 高血量，撞击
    
    // === 下界类 (Nether) ===
    "minecraft:piglin": 12,
    "minecraft:piglin_brute": 40, // 蛮兵，高威胁
    "minecraft:ghast": 30,
    "minecraft:blaze": 20,
    "minecraft:hoglin": 16,
    "minecraft:zoglin": 25      // 僵尸化疣猪兽
};

const PROGRESSION_TIERS = [
    { threshold: 5000, tag: "diamond_pro", event: "zps:event_upgrade_to_diamond_pro" },
    { threshold: 3000, tag: "diamond",     event: "zps:event_upgrade_to_diamond" },
    { threshold: 1500, tag: "iron",        event: "zps:event_upgrade_to_iron" },
    { threshold: 600,  tag: "copper",      event: "zps:event_upgrade_to_copper" },
    { threshold: 120,  tag: "stone",       event: "zps:event_upgrade_to_stone" },
    { threshold: 0,    tag: "wooden",      event: "zps:event_upgrade_to_wooden" }
];

const UPGRADE_ANIMATION_DURATION_TICKS = 100;

function initiateUpgradeProcess(ai, oldTierTag, newTierObject) {
    if (ai.hasTag(SUODING_TAG)) {
                return;
            }
    ai.addTag(UPGRADING_TAG);

    const aiLoc = ai.location;
    const workbenchPos = { x: Math.floor(aiLoc.x) + 2, y: Math.floor(aiLoc.y), z: Math.floor(aiLoc.z) };
    ai.lookAt({ 
        x: workbenchPos.x + 0.5, 
        y: workbenchPos.y + 0.5, 
        z: workbenchPos.z + 0.5 
    });
       ai.runCommand('playanimation @s set_block');
    ai.dimension.runCommand(`setblock ${workbenchPos.x} ${workbenchPos.y} ${workbenchPos.z} crafting_table`);
    ai.runCommand('playsound dig.wood @a[r=16]');

    ai.triggerEvent("zps:event_go_crafting"); 

    system.runTimeout(() => {
        if (!ai?.isValid) return;
        ai.removeTag(oldTierTag);
        ai.addTag(newTierObject.tag);
        ai.triggerEvent(newTierObject.event);
        ai.lookAt({ 
        x: workbenchPos.x + 0.5, 
        y: workbenchPos.y + 0.5, 
        z: workbenchPos.z + 0.5 
    });
       ai.runCommand('playanimation @s set_block');
        ai.dimension.runCommand(`setblock ${workbenchPos.x} ${workbenchPos.y} ${workbenchPos.z} air`);
        ai.runCommand('playsound dig.wood @a[r=16]');
        ai.triggerEvent("zps:event_stop_crafting");
        ai.removeTag(UPGRADING_TAG);
        
        
    }, UPGRADE_ANIMATION_DURATION_TICKS);
}

export function initializeProgressionSystem() {
    world.afterEvents.entitySpawn.subscribe(event => {
        if (event.entity.typeId === AI_ENTITY_TYPE_ID) {
            const ai = event.entity;
            const initialTier = PROGRESSION_TIERS.find(tier => ai.hasTag(tier.tag));
            const initialPoints = initialTier ? initialTier.threshold : 0;
            ai.setDynamicProperty(PROGRESSION_PROPERTY, initialPoints);
            if (!initialTier && !ai.getTags().some(tag => PROGRESSION_TIERS.find(t => t.tag === tag))) {
                ai.addTag(PROGRESSION_TIERS[PROGRESSION_TIERS.length - 1].tag);
            }
        }
    });
    
    
    // 【新增】处理 AI 击杀原版生物的逻辑
    world.afterEvents.entityDie.subscribe(event => {
        const { deadEntity, damageSource } = event;
        const killer = damageSource?.damagingProjectile?.owner ?? damageSource?.damagingEntity;
        
        // 1. 确保击杀者是 AI
        if (killer?.typeId === AI_ENTITY_TYPE_ID) {
            // 2. 检查被击杀生物是否在配置表中
            const points = MOB_KILL_POINTS[deadEntity.typeId];

            if (points !== undefined) {
                const killerPoints = killer.getDynamicProperty(PROGRESSION_PROPERTY) || 0;
                killer.setDynamicProperty(PROGRESSION_PROPERTY, killerPoints + points);
                
            }
        }
    });
    
        // 【新增/替换】计分板同步和清零逻辑 (每 100 tick 运行一次)
    system.runInterval(() => {
        // 尝试获取目标计分板
        const objective = world.scoreboard.getObjective(PROGRESSION_PROPERTY_SC);

        // 如果计分板目标不存在，则跳过同步
        if (!objective) {
            // 你也可以在这里添加逻辑来创建计分板，如果需要的话
            return;
        } 
        
        const allAis = ALL_AI_CACHE;
        if (!allAis || allAis.length === 0) return;
        for (const ai of allAis) {
        if (!ai.isValid) {
            continue; 
        }
            try {
                // 1. 使用 AI 实体作为参与者获取分数
                const scoreValue = objective.getScore(ai); 

                if (scoreValue > 0) {
                    const currentPoints = ai.getDynamicProperty(PROGRESSION_PROPERTY) || 0;
                    
                    // 2. 将计分板数值加进动态属性
                    ai.setDynamicProperty(PROGRESSION_PROPERTY, currentPoints + scoreValue);
                    
                    // 3. 将计分板清零
                    objective.setScore(ai, 0);
                    
                    
                }
            } catch (e) {
                // 如果实体不在计分板上，或者获取/设置分数失败，则忽略
            }
        }
    }, 100);



   system.runInterval(() => {
    const allAis = ALL_AI_CACHE;
        if (!allAis || allAis.length === 0) return;
    
    
    for (const ai of allAis) {
        if (!ai.isValid) {
            continue; 
        }
        const currentPoints = ai.getDynamicProperty(PROGRESSION_PROPERTY) || 0;
        ai.setDynamicProperty(PROGRESSION_PROPERTY, currentPoints + 1);
    }
}, 60);


    
    world.afterEvents.entityDie.subscribe(event => {
        const { deadEntity, damageSource } = event;
        const killer = damageSource?.damagingProjectile?.owner ?? damageSource?.damagingEntity;

        if (deadEntity.typeId === AI_ENTITY_TYPE_ID && killer?.typeId === AI_ENTITY_TYPE_ID) {
            const victimPoints = deadEntity.getDynamicProperty(PROGRESSION_PROPERTY) || 0;
            const killerPoints = killer.getDynamicProperty(PROGRESSION_PROPERTY) || 0;
            killer.setDynamicProperty(PROGRESSION_PROPERTY, killerPoints + victimPoints);
            
        }
    });

    
system.runInterval(() => {
    
    // -------------------------------------------------------------------
    // 【核心优化 1】使用全局缓存 ALL_AI_CACHE 替代昂贵的维度查询循环
    // -------------------------------------------------------------------
    const allAis = ALL_AI_CACHE;
    if (!allAis || allAis.length === 0) return;

    // 【核心优化 2】在 JS 内存中进行快速过滤
    const idleAis = allAis.filter(ai => {
        // 【安全性检查】排除无效实体（AI 死亡/移除）
        if (!ai.isValid) return false;
        
        if (ai.target) return false;
        
        // 排除忙碌的 AI
        for (const tag of BUSY_TAGS) {
            if (ai.hasTag(tag)) {
                return false;
            }
        }
        
        return true;
    });


    for (const ai of idleAis) {
        
        // 【安全性检查】虽然 filter 已经检查过 isValid，但保留此行是防御性编程的好习惯
        if (!ai.isValid) continue; 
        
        const currentPoints = ai.getDynamicProperty(PROGRESSION_PROPERTY) || 0;
        const aiTags = ai.getTags();
        let currentTierTag;

        // 查找当前等级标签
        for (const tier of PROGRESSION_TIERS) {
            if (aiTags.includes(tier.tag)) {
                currentTierTag = tier.tag;
                break;
            }
        }

        if (!currentTierTag) continue;

        // 查找合适的升级目标
        for (const targetTier of PROGRESSION_TIERS) {
            if (currentPoints >= targetTier.threshold) {
                if (targetTier.tag !== currentTierTag) {
                    
                    initiateUpgradeProcess(ai, currentTierTag, targetTier);
                }
                break; // 假设 PROGRESSION_TIERS 是按阈值排序的，找到最高等级后立即停止
            }
        }
    }
}, 100);
    
    
}