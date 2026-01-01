import { world, system } from "@minecraft/server";
// 【核心修改】导入 AI 实体缓存
import { ALL_AI_CACHE } from "./greeting.js"; 

const AI_ENTITY_TYPE_ID = "zps:newb";
const ANTI_TRAP_INTERVAL_TICKS = 60; // 每 3 秒 (60 ticks) 检查一次
const ANTI_TRAP_RADIUS = 3;       
const TRAP_VEHICLE_TYPES = [         
    "minecraft:minecart",
    "minecraft:boat",
    "minecraft:chest_boat"
];


export function initializeAntiTrapBehavior() {
    system.runInterval(() => {
     
        // -----------------------------------------------------------
        // 【极限优化】使用全局缓存 ALL_AI_CACHE 替代昂贵的维度查询循环
        // -----------------------------------------------------------
        const allAis = ALL_AI_CACHE;
        if (!allAis || allAis.length === 0) return;
        
        for (const ai of allAis) {
            // 【微优化】检查实体是否仍然有效
            if (!ai.isValid) continue; 
            
            // 【必要的 API 开销】查询 AI 附近 3 格内的实体 (实时性要求，无法缓存)
            const nearbyEntities = ai.dimension.getEntities({
                location: ai.location,
                maxDistance: ANTI_TRAP_RADIUS,
                // 排除常见生物，提高查询效率
                excludeFamilies: [ "player", "monster", "animal" ] 
            });

            for (const entity of nearbyEntities) {
                // 【微优化】在检查 typeId前，确保实体有效
                if (entity.isValid && TRAP_VEHICLE_TYPES.includes(entity.typeId)) {
                    
                    // 找到了陷阱载具，将其杀死以挣脱
                    entity.kill();
                    
                    // 【优化】一旦挣脱，立即跳出内部循环，进入下一个 AI 的检查
                    break;
                }
            }
        }
    }, ANTI_TRAP_INTERVAL_TICKS);
}
