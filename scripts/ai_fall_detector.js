import { world, system } from "@minecraft/server";
import { ALL_AI_CACHE } from "./greeting.js";


const AI_ENTITY_TYPE_ID = "zps:newb"; 
const FALLING_TAG = "falling";
const CHECK_INTERVAL_TICKS = 5;


export function initializeFallDetectorBehavior() {
    system.runInterval(() => {
        const allAis = ALL_AI_CACHE;
        if (!allAis || allAis.length === 0) return;        
        for (const ai of allAis) {           
            if (!ai.isValid) continue;             
            const isCurrentlyFalling = ai.isFalling;
            const hasTheTag = ai.hasTag(FALLING_TAG);
            if (isCurrentlyFalling && !hasTheTag) {
                ai.addTag(FALLING_TAG);
            } else if (!isCurrentlyFalling && hasTheTag) {
                ai.removeTag(FALLING_TAG);
            }
        }
    }, CHECK_INTERVAL_TICKS);
}