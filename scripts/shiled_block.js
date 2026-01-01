import { world, system } from "@minecraft/server";

// --- 常量配置 ---
const KNOCKBACK_TAG = "shield_knock"; // 要检测的标签
const KNOCKBACK_STRENGTH = 1.0; // 冲量强度（1.0 约等于 1 格的击退效果）
const VERTICAL_STRENGTH = 0.2; // 垂直冲量，让实体稍微抬升
const MONITOR_INTERVAL_TICKS = 3; // 每隔 1 刻检查一次 (尽可能实时)
const DEG_TO_RAD = Math.PI / 180; 
export function initializeShieldKnockback() {    
    system.runInterval(() => {
        
        // 1. 遍历所有维度
        const dimensionIdsToQuery = ["overworld", "nether", "the_end"];
        
        for (const dimId of dimensionIdsToQuery) {
            try {
                const dimension = world.getDimension(dimId);
                
                // 2. 筛选出带有 'shield_knock' 标签的实体
                const entitiesToKnockback = dimension.getEntities({ 
                    tags: [KNOCKBACK_TAG]
                });
                
                for (const entity of entitiesToKnockback) {
                    if (!entity.isValid) continue;

                    // 3. 计算反方向冲量
                    
                    // 获取实体当前的旋转角度 (Yaw, 偏航角)
                    const rotation = entity.getRotation();
                    
                    // 将 Yaw 转换为弧度，并进行调整：
                    // Minecraft 的 Yaw (Y轴旋转) 0度通常是南，我们希望 0度对应正 Z 轴（北）
                    // 并且三角函数计算时，0度通常是正 X 轴。
                    // 转换公式： (Yaw + 90) * (PI / 180) 可以将 Minecraft 的 Yaw 转换为适合计算的弧度。
                    const yawRadians = (rotation.y + 90) * DEG_TO_RAD;

                    // 计算实体面向的方向向量 (单位向量)
                    const directionVector = {
                        x: Math.cos(yawRadians),
                        z: Math.sin(yawRadians)
                    };

                    // 反方向冲量：将方向向量取反，并乘以强度
                    // 注意：这里使用标准的 JS 对象 { x, y, z } 作为 Vector3 的替代
                    const impulse = {
                        x: -directionVector.x * KNOCKBACK_STRENGTH, // X 轴反向冲量
                        y: VERTICAL_STRENGTH,                       // 垂直向上冲量
                        z: -directionVector.z * KNOCKBACK_STRENGTH  // Z 轴反向冲量
                    };

                    try {
                        // 4. 应用冲量
                        // entity.applyImpulse 接受 {x, y, z} 对象
                        entity.applyImpulse(impulse);
                        
                        // 5. 移除标签
                        entity.removeTag(KNOCKBACK_TAG);
                        
                    } catch (e) {
                        console.error(`[Knockback Error] 无法对实体 ${entity.typeId} 应用冲量或移除标签: ${e}`);
                    }
                }

            } catch (e) {
                // 忽略诸如维度不存在等错误
            }
        }
    }, MONITOR_INTERVAL_TICKS);
}
