import { world, system, EntityDamageCause, EntityHealthComponent,  EntityEquippableComponent, EntityComponentTypes, ItemStack, EquipmentSlot, Player, Container, EntityInventoryComponent, EffectType } from "@minecraft/server";

import { REAL_PLAYERS_CACHE } from "./newb_namer.js";
const AI_ENTITY_TYPE_ID = "zps:newb"; 
const BUILD_TARGET_ENTITY_ID = "zps:build_target";

// --- 走位逻辑配置 (保持不变) ---
const STRAFE_THINK_INTERVAL_MIN_SECONDS = 0.1;
const STRAFE_THINK_INTERVAL_MAX_SECONDS = 0.1;

const STRAFE_STEP_COUNT_MIN = 5;    
const STRAFE_STEP_COUNT_MAX = 8;     
const STRAFE_STEP_INTERVAL_TICKS = 3;  
const STRAFE_STEP_STRENGTH = 0.23;    

// --- 激活与性能配置 (保持不变) ---
const PROXIMITY_RADIUS = 32; 
const AI_ACTIVATION_INTERVAL = 30; 

const strafeStates = new Map();

function performStrafeStep(ai, state, direction, stepsRemaining) {
    // 【代码不变】这里没有 Math.floor，保持高效
    if (stepsRemaining <= 0 || !ai.isValid || !ai.target) {
        state.isStrafing = false; 
        return;
    }

    const impulse = {
        x: direction.x * STRAFE_STEP_STRENGTH,
        y: 0,
        z: direction.z * STRAFE_STEP_STRENGTH
    };

    ai.applyImpulse(impulse);

    system.runTimeout(() => {
        performStrafeStep(ai, state, direction, stepsRemaining - 1); 
    }, STRAFE_STEP_INTERVAL_TICKS);
}

function initiateStrafe(ai) {
    if (!strafeStates.has(ai.id)) {
        strafeStates.set(ai.id, { isStrafing: false });
    }
    const state = strafeStates.get(ai.id);

    // 【优化点 1】合并布尔检查，使用短路求值
    if (state.isStrafing || !ai.isOnGround || ai.isInWater || ai.isFalling) {
        return;
    }
    
    const target = ai.target
    if (target && target.typeId === BUILD_TARGET_ENTITY_ID) {
        return;
    }

    state.isStrafing = true;  
    
    // 【优化点 2】逻辑简化：由于 MIN = MAX，延迟是固定的 0.1 秒
    const thinkDelay = STRAFE_THINK_INTERVAL_MIN_SECONDS;

    system.runTimeout(() => {
        if (!ai.isValid || !ai.target) {
            state.isStrafing = false; 
            return;
        }
        
        const randomX = Math.random() * 2 - 1;
        const randomZ = Math.random() * 2 - 1;
        const direction = { x: randomX, z: randomZ };

        // 【优化点 3】使用位操作符 | 0 代替 Math.floor
        // 注意：由于 MAX-MIN+1 总是等于 1，这里只是为了通用性
        const totalSteps = STRAFE_STEP_COUNT_MIN + ((Math.random() * (STRAFE_STEP_COUNT_MAX - STRAFE_STEP_COUNT_MIN + 1)) | 0);

        performStrafeStep(ai, state, direction, totalSteps);
        
    }, (thinkDelay * 20) | 0); // 【优化点 4】使用位操作符 | 0 代替 Math.floor
}


export function initializeStrafingBehavior() {
    
    system.runInterval(() => {
        
        const activeAIinCombat = new Set();
        
        // 【核心优化】使用全局缓存 REAL_PLAYERS_CACHE 替换昂贵的 world.getAllPlayers()
        // 假设 REAL_PLAYERS_CACHE 已经从 newb_namer.js 中获取并可用。
        const allPlayers = REAL_PLAYERS_CACHE; 
        
        // 如果缓存未初始化或没有玩家，则提前退出
        if (!allPlayers || allPlayers.length === 0) {
            return;
        }

        // 1. 遍历所有玩家，查询他们附近的 AI
        for (const player of allPlayers) {
            
            // 【代码不变】entity query 是必要的 API 开销，无法优化
            const nearbyAI = player.dimension.getEntities({
                type: AI_ENTITY_TYPE_ID,
                maxDistance: PROXIMITY_RADIUS, 
                location: player.location
            });

            // 2. 将附近且有目标的 AI 加入 Set
            for (const ai of nearbyAI) {
                if (ai.isValid && ai.target) { 
                    activeAIinCombat.add(ai);
                }
            }
        }
        
        // 3. 对所有被激活的 AI 运行走位逻辑
        for (const ai of activeAIinCombat) {
            initiateStrafe(ai);
        }

        // 4. 清理逻辑
        // 保持不变，这是 Map 清理的惯用高效方式
        const currentAiIds = new Set(Array.from(activeAIinCombat).map(ai => ai.id));
        for (const storedId of strafeStates.keys()) {
            if (!currentAiIds.has(storedId)) {
                strafeStates.delete(storedId);
            }
        }

    }, AI_ACTIVATION_INTERVAL); 
}