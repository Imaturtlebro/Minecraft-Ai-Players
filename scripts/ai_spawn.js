import { world, system, Player, Dimension, Block } from "@minecraft/server";
import { REAL_PLAYERS_CACHE } from "./newb_namer.js"; 
// =================================================================
// --- 全局核心配置 ---
// =================================================================

const AI_ENTITY_TYPE_ID = "zps:newb"; 
const GLOBAL_MONITOR_INTERVAL = 100; // 核心循环间隔：每 1 秒 (20 ticks) 运行一次生成逻辑
const PLAYER_SAMPLE_COUNT = 2; // 【机制一：全局抽样】每次循环随机抽取进行检查的玩家数量（多玩家服务器建议保持在 1-3）
const LIGHT_LEVEL_DAY_THRESHOLD = 7; // 主世界亮度大于 7 视为白天

// --- 生成范围配置 ---
const MIN_SPAWN_RADIUS = 32; // 离玩家最近 24 格 (环形区域内)
const MAX_SPAWN_RADIUS = 64; // 离玩家最远 64 格
const CHECK_Y_MIN = -63;     // 检查的最小 Y 坐标（例如：Y=-63）
const CHECK_Y_MAX = 255;     // 检查的最大 Y 坐标

// --- 【机制二/三：区域冷却】配置 ---
const ZONE_BLOCK_SIZE = 400; // 区域大小：400x400

// =================================================================
// --- 多维度/时间配置表 ---
// =================================================================
// 配置键用于追踪配置冷却 (Config Cooldown)
const SPAWN_CONFIGS = {
    
    // --- 默认回退配置 ---
    "default": {
        SPAWN_INTERVAL_SECONDS: 60,         // 【配置冷却】每 60 秒尝试生成一次
        SPAWN_CHANCE: 0.0,                  // 每次尝试的生成概率
        MAX_SPAWN_COUNT: 1,                 // 一次最多生成数量
        MAX_AI_NEARBY: 3,                   // 玩家周围 AI 数量上限（预检密度）
        NEARBY_RADIUS: 40,                  // 密度检查半径
        COOLDOWN_BASE_SECONDS: 120,         // 【动态区域冷却】基础冷却时间 (120 秒)
        COOLDOWN_MULTIPLIER_PER_AI: 60,     // 附近每 1 个 AI 增加的冷却时间 (60 秒/AI)
        EXCLUDED_BLOCKS: ["minecraft:dirt", "minecraft:stone"],
        UNDERGROUND_SPAWN_CHANCE: 0.4
    },
    
    // --- 主世界 - 白天 (亮度 > 7) ---
    "minecraft:overworld_day": {
        SPAWN_INTERVAL_SECONDS: 60, 
        SPAWN_CHANCE: 0.5,
        MAX_SPAWN_COUNT: 2,                 // 可生成 1-2 个
        MAX_AI_NEARBY: 3,           
        NEARBY_RADIUS: 128,          
        COOLDOWN_BASE_SECONDS: 120,         // 2 分钟基础冷却
        COOLDOWN_MULTIPLIER_PER_AI: 60,     // 
        EXCLUDED_BLOCKS: ["minecraft:air", "minecraft:lava"],
        UNDERGROUND_SPAWN_CHANCE: 0.4
    },
    
    // --- 主世界 - 夜晚 (亮度 <= 7) ---
    "minecraft:overworld_night": {
        SPAWN_INTERVAL_SECONDS: 60,
        SPAWN_CHANCE: 0.4,
        MAX_SPAWN_COUNT: 2,
        MAX_AI_NEARBY: 3, 
        NEARBY_RADIUS: 128,
        COOLDOWN_BASE_SECONDS: 180,          
        COOLDOWN_MULTIPLIER_PER_AI: 60,     
        EXCLUDED_BLOCKS: ["minecraft:air", "minecraft:lava"],
        UNDERGROUND_SPAWN_CHANCE: 0.4
    },
    
    // --- 下界 (地狱) ---
    "minecraft:nether": {
        SPAWN_INTERVAL_SECONDS: 75, 
        SPAWN_CHANCE: 0.3,
        MAX_SPAWN_COUNT: 1,                 // 只生成 1 个
        MAX_AI_NEARBY: 3,
        NEARBY_RADIUS: 128,
        COOLDOWN_BASE_SECONDS: 240,         // 4 分钟基础冷却
        COOLDOWN_MULTIPLIER_PER_AI: 90,     // 密度惩罚高
        EXCLUDED_BLOCKS: ["minecraft:air", "minecraft:lava"],
        UNDERGROUND_SPAWN_CHANCE: 0.4
    },
    
    // --- 末地 ---
    "minecraft:the_end": {
        SPAWN_INTERVAL_SECONDS: 90, 
        SPAWN_CHANCE: 0.2,
        MAX_SPAWN_COUNT: 1,                 // 只生成 1 个
        MAX_AI_NEARBY: 2,
        NEARBY_RADIUS: 128,
        COOLDOWN_BASE_SECONDS: 480,         // 8 分钟基础冷却
        COOLDOWN_MULTIPLIER_PER_AI: 120,    // 密度惩罚最高
        EXCLUDED_BLOCKS: ["minecraft:air", "minecraft:lava"],
        UNDERGROUND_SPAWN_CHANCE: 0.4
    }
};

// =================================================================
// --- 核心追踪器 ---
// =================================================================

const spawnCooldowns = new Map();     // 用于追踪配置冷却 (Config Cooldown)
const spawnZoneCooldowns = new Map(); // 用于追踪区域冷却 (Zone Cooldown)


// =================================================================
// --- 助手函数 ---
// =================================================================

/**
 * 根据维度和光照等级获取正确的配置和键。
 */
function getSpawnConfig(player) {
    const dimId = player.dimension.id;
    let key = dimId;
    
    if (dimId === "minecraft:overworld") {
        try {
            // 获取玩家所在位置的光照等级
            const lightLevel = player.dimension.getLightLevel(player.location);
            key = lightLevel > LIGHT_LEVEL_DAY_THRESHOLD ? "minecraft:overworld_day" : "minecraft:overworld_night";
        } catch (e) {
            // 默认白天，避免未加载区块导致的错误
            key = "minecraft:overworld_day"; 
        }
    }
    
    const config = SPAWN_CONFIGS[key] || SPAWN_CONFIGS["default"];
    return { config, key };
}

function getZoneKey(dimension, loc) {
    const xZone = (loc.x / ZONE_BLOCK_SIZE) | 0;
    const zZone = (loc.z / ZONE_BLOCK_SIZE) | 0;
    return `${dimension.id}_${xZone}_${zZone}`;
}


function getNearbyAICount(dimension, location, radius) {
    
    const nearbyEntities = dimension.getEntities({
        type: AI_ENTITY_TYPE_ID,
        maxDistance: radius,
        location: location
    });

    let untamedAICount = 0;

    
    for (const entity of nearbyEntities) {
        if (!entity || !entity.isValid) {
            continue;
        }
        
       
        const tameableComp = entity.getComponent('minecraft:tameable');

        if (!tameableComp || !tameableComp.isTamed) {
             untamedAICount++;
        }
    }

    return untamedAICount;
}

function isSafeSpawnLocation(dimension, loc, excludedBlocks) {
    
    // 【健壮性修正 1】确保 excludedBlocks 是一个数组
    const blacklist = Array.isArray(excludedBlocks) ? excludedBlocks : [];
    
    // 确保使用取整后的坐标进行查询
    const x = Math.floor(loc.x);
    const y = Math.floor(loc.y);
    const z = Math.floor(loc.z);
    
    
    try {
        // 1. 获取方块
        const floorBlock = dimension.getBlock({ x: x, y: y - 1, z: z }); // 下方方块
        const currentBlock = dimension.getBlock({ x: x, y: y, z: z });   // 自身方块
        const headBlock = dimension.getBlock({ x: x, y: y + 1, z: z }); // 上方方块

        // 检查 1: 下方方块 (floorBlock) 必须是实体可以站立的方块
        
        // 1.1 如果下方方块为 null (未加载区块)，直接返回 false。
        if (!floorBlock) {
            return false; 
        }
        
        
        // 1.2 检查是否在黑名单中 (空气和岩浆)
        if (blacklist.includes(floorBlock.typeId)) {
            return false;
        }
        
        // 2.1 检查当前方块 (Y)
        if (!currentBlock || currentBlock.typeId !== "minecraft:air") {
            return false;
        }

        // 2.2 检查上方方块 (Y+1)
        if (!headBlock || headBlock.typeId !== "minecraft:air") {
            return false;
        }
        return true;

    } catch (e) {
        return false;
    }
}





// =================================================================
// --- 核心生成逻辑 ---
// =================================================================

function trySpawnAI() {
    
    // 【核心优化 1】使用全局缓存 REAL_PLAYERS_CACHE，性能开销趋近于 0
    const allPlayers = REAL_PLAYERS_CACHE; 
    if (!allPlayers || allPlayers.length === 0) return; // 检查缓存
    
    // 1. 【全局抽样】选择本次循环要检查的玩家 (高性能关键)
    // 尽管 sort() 相对较慢，但由于 allPlayers 是缓存且数量不多，影响可接受。
    const playersToSample = allPlayers.length <= PLAYER_SAMPLE_COUNT
        ? allPlayers
        // 使用 slice() 随机抽样
        : [...allPlayers].sort(() => 0.5 - Math.random()).slice(0, PLAYER_SAMPLE_COUNT);

    for (const player of playersToSample) {
        const { config, key } = getSpawnConfig(player);
        const dimension = player.dimension;
        const currentTick = system.currentTick;
        const playerLoc = player.location;
        const zoneKey = getZoneKey(dimension, playerLoc);

        // 0. 【配置冷却检查】... (不变)
        const nextSpawnTick = spawnCooldowns.get(key) || 0;
        if (currentTick < nextSpawnTick) continue; 
        
        // 1. 【区域冷却检查】... (不变)
        const zoneCooldownExpiry = spawnZoneCooldowns.get(zoneKey) || 0;
        if (currentTick < zoneCooldownExpiry) continue; 
        
        // 2. 密度检查 (预检) ... (不变)
        const nearbyAI_pre = getNearbyAICount(dimension, playerLoc, config.NEARBY_RADIUS);
        if (nearbyAI_pre >= config.MAX_AI_NEARBY) continue;

        // 3. 概率检查... (不变)
        if (Math.random() > config.SPAWN_CHANCE) {
            const cooldownDuration = config.SPAWN_INTERVAL_SECONDS * 20;
            spawnCooldowns.set(key, currentTick + cooldownDuration);
            continue; 
        }
        
        // 4. 【极简优化】随机方向搜索
        
        const randomAngle = Math.random() * 2 * Math.PI; 
        const randomDistance = MIN_SPAWN_RADIUS + Math.random() * (MAX_SPAWN_RADIUS - MIN_SPAWN_RADIUS);

        const offsetX = Math.cos(randomAngle) * randomDistance;
        const offsetZ = Math.sin(randomAngle) * randomDistance;

        // 【微优化 2】使用 | 0 代替 Math.floor
        const baseLoc = { 
            x: (playerLoc.x + offsetX) | 0, 
            z: (playerLoc.z + offsetZ) | 0 
        };
        
        let safeLoc = null;
        const excludedBlocks = config.EXCLUDED_BLOCKS; 

        const roll = Math.random();
        const isUndergroundRoll = roll < config.UNDERGROUND_SPAWN_CHANCE;

        let yStart, yEnd, yStep;

        if (isUndergroundRoll) {
            yStart = CHECK_Y_MIN;
            yEnd = CHECK_Y_MAX;
            yStep = 1; 
        } else {
            yStart = CHECK_Y_MAX;
            yEnd = CHECK_Y_MIN;
            yStep = -1; 
        }

        // 【统一搜索循环】... (不变)
        for (let y = yStart; (yStep > 0 ? y <= yEnd : y >= yEnd); y += yStep) {
            const checkLoc = { x: baseLoc.x, y: y, z: baseLoc.z };
            
            if (isSafeSpawnLocation(dimension, checkLoc, excludedBlocks)) {
                safeLoc = checkLoc;
                break; 
            }
        }
        
        // 5. 如果未找到安全点... (不变)
        if (!safeLoc) {
            const cooldownDuration = config.SPAWN_INTERVAL_SECONDS * 20;
            spawnCooldowns.set(key, currentTick + cooldownDuration);
            continue;
        }

        // --- 找到安全点，执行生成 ---

        // A. 执行生成
        // 【微优化 3】使用 | 0 代替 Math.floor
        const spawnCount = config.MAX_SPAWN_COUNT === 1 
            ? 1 
            : ((Math.random() * config.MAX_SPAWN_COUNT) | 0) + 1; 

        for (let i = 0; i < spawnCount; i++) {
            // 随机偏移不需要 Math.floor
            const spawnLoc = { 
                x: safeLoc.x + 0.5 + Math.random() * 0.2 - 0.1, 
                y: safeLoc.y, 
                z: safeLoc.z + 0.5 + Math.random() * 0.2 - 0.1 
            };
            dimension.spawnEntity(AI_ENTITY_TYPE_ID, spawnLoc);
        }

        // B. 【激活配置冷却】
        const cooldownDuration = config.SPAWN_INTERVAL_SECONDS * 20;
        spawnCooldowns.set(key, currentTick + cooldownDuration);
        
        // C. 【激活动态区域冷却】
        const nearbyAI_post = getNearbyAICount(dimension, playerLoc, config.NEARBY_RADIUS);

        // 计算动态冷却时间 (Ticks)
        const baseCooldownTicks = config.COOLDOWN_BASE_SECONDS * 20; 
        const multiplierCooldownTicks = nearbyAI_post * (config.COOLDOWN_MULTIPLIER_PER_AI * 20); 

        // 【微优化 4】使用 | 0 确保最终冷却时间为整数
        const dynamicCooldownTicks = (baseCooldownTicks + multiplierCooldownTicks) | 0;

        spawnZoneCooldowns.set(zoneKey, currentTick + dynamicCooldownTicks);

    }
}



// =================================================================
// --- 导出初始化函数 ---
// =================================================================

/**
 * 导出函数：初始化 AI 玩家的定时生成系统。
 */
export function initializeAISpawner() {
    // 启动全局监控循环，它以固定的 GLOBAL_MONITOR_INTERVAL 运行
    system.runInterval(trySpawnAI, GLOBAL_MONITOR_INTERVAL);
    console.log(`[AI Spawner] 初始化完成，全局检查间隔为 ${GLOBAL_MONITOR_INTERVAL / 20} 秒。`);
}
