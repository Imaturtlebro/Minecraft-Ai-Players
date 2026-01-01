import { world, system } from "@minecraft/server";

// =================================================================
// --- 核心配置 ---
// =================================================================

const AI_ENTITY_TYPE_ID = "zps:newb";
const SCOREBOARD_NAME = "affinity_set"; // 您的中转计分板
const PLAYER_GIVE_TAG = "affinity_give";  // 玩家给予物品后获得的标签
const AFFINITY_BASE_KEY = "affinity_player_"; // AI 动态属性的前缀
const LOOP_INTERVAL_TICKS = 5;       // 检查频率 (5 刻 = 0.25秒，查询开销极低)
const INTERACTION_RANGE = 8;         // AI 必须在玩家 8 格范围内
const MOVEMENT_LOCK_CONFIG = {
    enabled: true,
    lockEvent: "lock_movement", 
    unlockEvent: "unlock_movement"
};

// =================================================================
// --- 计分板触发配置 ---
// =================================================================
// 键 (Key) = 计分板 `affinity_set` 的值
// 值 (Value) = 触发的逻辑
//
// 示例：当计分板值为 3 时：
// - 有 50% 概率增加 1-3 点好感度
// - 有 50% 概率发送消息
// - 冷却时间 60 秒
//
const AFFINITY_CONFIG = new Map([
    // 当 affinity_set = 1
    [1, {
        affinityChance: 0.25,      // 25% 概率增加好感度
        affinityMin: 1,           // 增加 1
        affinityMax: 3,           // 增加 1
        messageChance: 0.10,      // 10% 概率发送消息
        messages: ["thx", "that's good", "yeah"],
        cooldownSeconds: 30       // 此次触发的私有冷却时间 30 秒
    }],
    
    // 当 affinity_set = 3
    [3, {
        affinityChance: 0.50,      // 50% 概率增加好感度
        affinityMin: 4,           // 增加 1
        affinityMax: 6,           // 增加 3
        messageChance: 0.50,      // 50% 概率发送消息
        messages: ["thx a lot man", "yo bro thank", "haha thx"],
        cooldownSeconds: 60       // 此次触发的私有冷却时间 60 秒
    }],
    
    // 当 affinity_set = 5 (例如给予钻石)
    [5, {
        affinityChance: 1.0,       // 100% 概率增加好感度
        affinityMin: 7,           // 增加 3
        affinityMax: 10,           // 增加 5
        messageChance: 1.0,       // 100% 概率发送消息
        messages: ["that's great dude", "wow thx homie", "yeah bro thx u"],
        cooldownSeconds: 120      // 此次触发的私有冷却时间 120 秒
    }]
]);

// =================================================================
// --- 内部缓存 ---
// =================================================================

// 【性能优化】缓存计分板对象
let SCOREBOARD_OBJECTIVE = null;

// 【性能优化】追踪 AI 的私有冷却
// 结构: Map<ai_id, Map<score_value, expiry_tick>>
const aiCooldowns = new Map();

// =================================================================
// --- 核心逻辑 ---
// =================================================================

/**
 * 启动 AI 好感度监听器的主循环。
 * 采用高性能事件驱动查询。
 */
function checkAffinityEvents() {
    // 1. 检查计分板是否已缓存
    if (!SCOREBOARD_OBJECTIVE) {
        try {
            // 尝试获取一次，如果失败，下次循环再试
            SCOREBOARD_OBJECTIVE = world.scoreboard.getObjective(SCOREBOARD_NAME);
            if (!SCOREBOARD_OBJECTIVE) return;
        } catch (e) {
            return; // 计分板不存在，跳过
        }
    }

    // 2. 【极限优化】查询带标签的玩家 (开销极低)
    const playersWhoGave = world.getPlayers({ tags: [PLAYER_GIVE_TAG] });
    if (playersWhoGave.length === 0) return;

    for (const player of playersWhoGave) {
        
        // 【安全性检查】
        if (!player.isValid) continue;

        // 3. 【极限优化】查询玩家附近且计分板>0的AI (开销低)
        const nearbyAis = player.dimension.getEntities({
            type: AI_ENTITY_TYPE_ID,
            location: player.location,
            maxDistance: INTERACTION_RANGE,
            scoreOptions: [{
                objective: SCOREBOARD_NAME,
                minScore: 1 // 只获取需要处理的 AI
            }]
        });

        for (const ai of nearbyAis) {
            
            // 【安全性检查】
            if (!ai.isValid) continue;

            // 4. 处理好感度事件
            processAffinityEvent(ai, player);
        }
        
        // 5. 【清理】处理完毕，移除玩家标签
        player.removeTag(PLAYER_GIVE_TAG);
    }
}

/**
 * 处理单个 AI 的好感度事件。
 * @param {import("@minecraft/server").Entity} ai AI 实体
 * @param {import("@minecraft/server").Player} player 玩家
 */
function processAffinityEvent(ai, player) {
    let score;
    try {
        // 1. 获取并重置计分板（立即重置以防重复触发）
        score = SCOREBOARD_OBJECTIVE.getScore(ai);
        if (score === undefined) return; // AI 没有分数

        SCOREBOARD_OBJECTIVE.setScore(ai, 0);

    } catch (e) {
        // 捕获 getScore/setScore 可能的错误
        return; 
    }

    // 2. 查找此分数的配置
    const config = AFFINITY_CONFIG.get(score);
    if (!config) return; // 没有为这个分数配置任何操作

    const aiId = ai.id;
    const currentTick = system.currentTick;

    // 3. 检查私有冷却
    if (!aiCooldowns.has(aiId)) {
        aiCooldowns.set(aiId, new Map());
    }
    const aiPrivateCooldowns = aiCooldowns.get(aiId);
    const cooldownExpiry = aiPrivateCooldowns.get(score) || 0;

    // 4. 【好感度逻辑】
    if (currentTick >= cooldownExpiry) {
        // 冷却已过，执行好感度增加
        if (Math.random() < config.affinityChance) {
            
            // 【微优化】使用 | 0 进行最快取整
            const affinityGain = ((Math.random() * (config.affinityMax - config.affinityMin + 1)) | 0) + config.affinityMin;
            
           // 应用好感度
            const affinityKey = AFFINITY_BASE_KEY + player.id;
            const currentAffinity = ai.getDynamicProperty(affinityKey) || 0;
            ai.setDynamicProperty(affinityKey, currentAffinity + affinityGain);
        }
        
        // 设置新的冷却
        const newCooldownTicks = (config.cooldownSeconds * 20) | 0;
        aiPrivateCooldowns.set(score, currentTick + newCooldownTicks);
        
    } // else: 冷却中，不增加好感度

    // 5. 【消息逻辑】(无论是否冷却都会触发)
    if (Math.random() < config.messageChance) {
        
        // 【微优化】使用 | 0 进行最快取整
        const message = config.messages[(Math.random() * config.messages.length) | 0];
        const aiName = ai.nameTag || "AI Player";
        if (MOVEMENT_LOCK_CONFIG.enabled) {
ai.triggerEvent(MOVEMENT_LOCK_CONFIG.lockEvent);
            }
        
        // 延迟 1 秒发送消息，使其看起来更自然
        system.runTimeout(() => {
            if (ai.isValid) {
                world.sendMessage(`<${aiName}> ${message}`);
                if (MOVEMENT_LOCK_CONFIG.enabled) {
                    ai.triggerEvent(MOVEMENT_LOCK_CONFIG.unlockEvent);
                }
            }
        }, 50); 
    }
}

// =================================================================
// --- 导出函数 ---
// =================================================================

/**
 * 导出函数：初始化 AI 好感度监听系统。
 */
export function initializeAffinityListener() {
    // 尝试在启动时缓存计分板
    try {
        SCOREBOARD_OBJECTIVE = world.scoreboard.getObjective(SCOREBOARD_NAME);
    } catch (e) {
        
    }
    
    // 启动主循环
    system.runInterval(checkAffinityEvents, LOOP_INTERVAL_TICKS);
}
            