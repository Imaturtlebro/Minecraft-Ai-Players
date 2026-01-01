import { world, system } from "@minecraft/server";
import { ALL_AI_CACHE } from "./greeting.js";
const AI_ENTITY_TYPE_ID = "zps:newb"; 
const EVENT_NAME_TO_TRIGGER = "stroll_switch";

const MIN_INTERVAL_SECONDS = 10; 
const MAX_INTERVAL_SECONDS = 60; 
const POPULATION_CHECK_INTERVAL_TICKS = 100; 


const trackedAis = new Set();


function scheduleNextStrollSwitch(ai) {

    if (!ai.isValid) {
        trackedAis.delete(ai.id);
        return;
    }
  
    // 【极限优化】使用 | 0 代替 Math.floor
    const randomDelayTicks = ((MIN_INTERVAL_SECONDS + Math.random() * (MAX_INTERVAL_SECONDS - MIN_INTERVAL_SECONDS)) * 20) | 0;

    system.runTimeout(() => {
 
        if (!ai.isValid) {
            trackedAis.delete(ai.id);
            return;
        }

        ai.triggerEvent(EVENT_NAME_TO_TRIGGER);

        scheduleNextStrollSwitch(ai);

    }, randomDelayTicks);
}



export function initializeStrollSwitcherBehavior() {

    system.runInterval(() => {
        
        // -----------------------------------------------------------
        // 【核心优化】使用全局缓存 ALL_AI_CACHE 替代昂贵的维度查询循环
        // -----------------------------------------------------------
        const allAis = ALL_AI_CACHE;
        if (!allAis || allAis.length === 0) {
            return; // 缓存为空，提前退出
        }

        for (const ai of allAis) {
            // 【微优化】确保 AI 有效，避免 Map 溢出和不必要的处理
            if (!ai.isValid) {
                trackedAis.delete(ai.id);
                continue;
            }

            // 检查 AI 是否已经在追踪列表中，如果是新 AI 则开始调度
            if (!trackedAis.has(ai.id)) {
                trackedAis.add(ai.id);
                scheduleNextStrollSwitch(ai);
            }
        }
        
        // 【优化】清理逻辑：移除缓存中不存在的 AI
        const currentAiIds = new Set(allAis.map(ai => ai.id));
        for (const storedId of trackedAis.keys()) {
            if (!currentAiIds.has(storedId)) {
                trackedAis.delete(storedId);
            }
        }

    }, POPULATION_CHECK_INTERVAL_TICKS);
}