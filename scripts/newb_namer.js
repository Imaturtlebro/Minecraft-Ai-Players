import { world, system, EntityDamageCause, EntityHealthComponent,  EntityEquippableComponent, EntityComponentTypes, ItemStack, EquipmentSlot, Player, Container, EntityInventoryComponent, EffectType } from "@minecraft/server";
import { initializeAffinityListener } from "./ai_affinity_listener.js";
import { initializeInteractionUI } from "./ai_interaction_ui.js";
import { ALL_AI_CACHE } from "./greeting.js";
import { initializeStrafingBehavior } from "./zouwei.js";
import { initializeAISpawner } from "./ai_spawn.js";
import { initializeBuilderSystem } from "./ai_builder.js";
import { DOGS_PER_TIER } from './config/ai_wolf_num.js';
import { regularChatMessages } from './config/message_language.js';
import { action } from './config/join_message_language.js';
import { mobNames, environmentalDeathMessages } from './config/died_message_language.js';
import { serverAnnouncements } from './config/server_message_language.js';
import { namePartA_Adjectives, namePartB_Conjunctions, namePartC_Nouns, presetNames } from './config/name_language.js';
import { initializeAffinitySystem } from "./chat.js";
import { initializeFallDetectorBehavior } from "./ai_fall_detector.js";
import { initializePeacemakerBehavior } from "./ai_peacemaker.js";
import { initializeFoodSystem } from "./eat_food.js";
import { initializeShieldKnockback } from "./shiled_block.js";
import { initializeGreetingBehavior } from "./greeting.js";
import { initializeProgressionSystem } from "./upgrade.js";
import { initializeStrollSwitcherBehavior } from "./ai_stroll_switcher.js";
import { initializeAttackPermissionBehavior } from "./ai_attack_permission.js";
import { initializeAntiTrapBehavior } from "./ai_anti_trap.js";
const YOUR_NAMESPACE = "zps";
const AI_ENTITY_TYPE_ID = `${YOUR_NAMESPACE}:newb`;
const COMPANION_WOLF_TYPE_ID = "minecraft:wolf"; 
const WOLF_TELEPORT_FOLLOW_CHECK_INTERVAL_TICKS = 60; 
const WOLF_MAX_DISTANCE_BEFORE_TELEPORT = 12;       
const WOLF_TELEPORT_TARGET_RADIUS_MIN = 2;        
const WOLF_TELEPORT_TARGET_RADIUS_MAX = 5;        
const WOLF_DEFEND_MODE_DURATION_TICKS = 300;  
const DEFEND_TARGET_TAG = "zps_target_for_wolves_DEFEND";
const ASSIST_TARGET_TAG = "zps_target_for_wolves_ASSIST";
const WOLF_ASSIST_MODE_DURATION_TICKS = 300;
const SAFE_SEARCH_RANGE = 5;


const GLOBAL_BUNNY_HOP_CHECK_INTERVAL_TICKS = 2;
const BUNNY_HOP_SPEED_THRESHOLD = 0.37;
const BUNNY_HOP_STRENGTH = 0.42; 
const FORWARD_HOP_STRENGTH = 0.2; 
const BUNNY_HOP_COOLDOWN_TICKS = 8;
const PLAYER_PROXIMITY_CHECK_RADIUS = 24; // 例如，32格半径

// 消息生成器结构
const MESSAGE_GENERATORS = [
    { threshold: 0.60, generator: generateRegularChatMessage },
    { threshold: 0.80, generator: generateJoinLeaveMessage },
    { threshold: 0.90, generator: generateCombatDeathMessage },
    { threshold: 1.00, generator: generateEnvironmentalDeathMessage }
];

export let REAL_PLAYERS_CACHE = []; 
const PLAYER_CACHE_REFRESH_INTERVAL_TICKS = 600;

function getRandomInt(min, max) {
    return ((Math.random() * (max - min + 1)) | 0) + min;
}


const structureNameMap = {
    "minecraft:ocean_monument": "ocean monument",
    "minecraft:village": "village",
    "minecraft:pillager_outpost": "outpost",
    "minecraft:mineshaft": "mineshaft",
    "minecraft:ruined_portal": "portal"
};
const STRUCTURE_IDS = Object.keys(structureNameMap);

function generateRandomPlayerName() {
    if (Math.random() < 0.5) {
        const partA = getRandomElement(namePartA_Adjectives);
        const partB = getRandomElement(namePartB_Conjunctions);
        const partC = getRandomElement(namePartC_Nouns);
        const partD = getRandomTwoDigitNumber();
        
        if (partA && partB && partC) {
            return `${partA}${partB}${partC}${partD}`;
        }
    }
    
    return getRandomElement(presetNames) || "Steve";
}


function scheduleNextMessage() {
    const randomDelayTicks = 200 + Math.floor(Math.random() * 400); 
    system.runTimeout(() => {
        const realPlayersCache = REAL_PLAYERS_CACHE;        
        const messageTypeRoll = Math.random();
        let messageToSend = null;
        for (const item of MESSAGE_GENERATORS) {
            if (messageTypeRoll < item.threshold) {
                if (item.generator === generateRegularChatMessage) {
                    messageToSend = item.generator(realPlayersCache); 
                } else {
                    messageToSend = item.generator();
                }
                break;
            }
        }
        try {
            if (messageToSend && messageToSend instanceof Promise) {
                messageToSend.then(msg => {
                    if (msg) world.sendMessage(msg);
                }).catch(error => console.warn(`[ChatSim] Async message failed: ${error}`));
            } else if (messageToSend) {
                world.sendMessage(messageToSend);
            }
        } catch (e) {
             console.warn(`[ChatSim] Failed to send message: ${e}`);
        }
        scheduleNextMessage();
    }, randomDelayTicks);
}



system.runInterval(() => {
    const announcement = getRandomElement(serverAnnouncements);
    world.sendMessage(`§7§o[Server] ${announcement}`);
}, 2400); 

scheduleNextMessage();

system.runInterval(() => {
    try {
        REAL_PLAYERS_CACHE = world.getAllPlayers();
    } catch (e) {
        console.warn(`[Cache] Failed to refresh player cache: ${e}`);
        REAL_PLAYERS_CACHE = [];
    }
}, PLAYER_CACHE_REFRESH_INTERVAL_TICKS);




function generateRegularChatMessage(realPlayers) {
    const name = generateRandomPlayerName();
    let content = getRandomElement(regularChatMessages);
    if (content.includes("{real_player}")) {
        let replacementName;
        if (realPlayers.length > 0) {
            const randomPlayer = getRandomElement(realPlayers);
            replacementName = `§e@${randomPlayer.name}§r`; 
        } else {
            replacementName = generateRandomPlayerName(); 
        }
        content = content.replace("{real_player}", replacementName);
    }
    if (content.includes("{structure_coords}")) {
        const randX = ((Math.random() * 5000) | 0) - 2500;
        const randZ = ((Math.random() * 5000) | 0) - 2500;
        const coords = `${randX} ~ ${randZ}`;
        const randomStructureId = getRandomElement(STRUCTURE_IDS);
        const structureName = structureNameMap[randomStructureId] || "a strucutre";
        content = content
            .replace("{structure_coords}", `§a${coords}§r`)
            .replace("{structure_name}", `§b${structureName}§r`);
    }
    return `§f<${name}> ${content}`;
}



function generateJoinLeaveMessage() {
    const name = generateRandomPlayerName();
    return `§e${name} ${action}`; 
}

function generateCombatDeathMessage() {
    const victim = generateRandomPlayerName();
    let killer = "";

    if (Math.random() < 0.5) {
        killer = getRandomElement(mobNames);
    } else {
        killer = generateRandomPlayerName();
        while (killer === victim) {
            killer = generateRandomPlayerName();
        }
    }
    return `§f${victim} was killed by ${killer}`;
}

function generateEnvironmentalDeathMessage() {
    const victim = generateRandomPlayerName();
    const reason = getRandomElement(environmentalDeathMessages);
    return `§f${victim} ${reason}`;
}




function getRandomElement(arr) {
    if (!arr || arr.length === 0) {
        return ""; 
    }
    const randomIndex = (Math.random() * arr.length) | 0;
    return arr[randomIndex];
}



function getRandomTwoDigitNumber() {
    return ((Math.random() * 90) | 0) + 10;
}



system.runInterval(() => {
    const allAiPlayers = ALL_AI_CACHE;
    if (!allAiPlayers || allAiPlayers.length === 0) {
        return;
    }    
    for (const aiPlayer of allAiPlayers) {
        if (!aiPlayer.isValid) continue; 
        let companionWolves;
        try {
            companionWolves = aiPlayer.dimension.getEntities({
                type: COMPANION_WOLF_TYPE_ID,
                location: aiPlayer.location,
                maxDistance: WOLF_MAX_DISTANCE_BEFORE_TELEPORT * 2
            });
        } catch (e) { continue; }

        for (const wolf of companionWolves) {
            if (!wolf || !wolf.isValid) continue;

            const masterId = wolf.getDynamicProperty(`${YOUR_NAMESPACE}:ai_master_id`);
            if (masterId === aiPlayer.id) { 
                const wolfIsInCombat = wolf.getDynamicProperty(`${YOUR_NAMESPACE}:is_in_combat`) || false;
                if (wolfIsInCombat) {
                    continue; 
                }
                const wolfLoc = wolf.location;
                const aiLoc = aiPlayer.location;
                const dx = wolfLoc.x - aiLoc.x;
                const dy = wolfLoc.y - aiLoc.y;
                const dz = wolfLoc.z - aiLoc.z;
                const distanceSquared = dx * dx + dy * dy + dz * dz;
                
                const maxDistanceSquared = WOLF_MAX_DISTANCE_BEFORE_TELEPORT * WOLF_MAX_DISTANCE_BEFORE_TELEPORT;

                if (distanceSquared > maxDistanceSquared) {
                    const safeTargetLoc = { 
                        x: aiLoc.x + 0.5, 
                        y: aiLoc.y, 
                        z: aiLoc.z + 0.5
                    };
                    
                    try {
                        wolf.teleport(safeTargetLoc, {
                            dimension: aiPlayer.dimension,
                            checkForBlocks: true,      
                            facingLocation: aiLoc
                        });
                    } catch (e_teleport) {
                    }
                }
            }
        }
    }
}, WOLF_TELEPORT_FOLLOW_CHECK_INTERVAL_TICKS);




function maintainHopRotation(entityToLock) {
    const isLocking = entityToLock?.getDynamicProperty(`${YOUR_NAMESPACE}:is_hop_view_locking`);
    if (!entityToLock || !entityToLock.isValid || isLocking !== true) {
        if (entityToLock && entityToLock.isValid) {
            entityToLock.setDynamicProperty(`${YOUR_NAMESPACE}:is_hop_view_locking`, false);
        }
        return;
    }
    if (entityToLock.isOnGround) {
        entityToLock.setDynamicProperty(`${YOUR_NAMESPACE}:is_hop_view_locking`, false);
        return;
    }
    const lockedYaw = entityToLock.getDynamicProperty(`${YOUR_NAMESPACE}:hop_target_yaw`);
    const lockedPitch = entityToLock.getDynamicProperty(`${YOUR_NAMESPACE}:hop_target_pitch`);
    if (typeof lockedYaw === 'number' && typeof lockedPitch === 'number') {
        try {
            entityToLock.setRotation({ x: lockedPitch, y: lockedYaw });
        } catch (e) {
            entityToLock.setDynamicProperty(`${YOUR_NAMESPACE}:is_hop_view_locking`, false);
            return;
        }
    } else {
        entityToLock.setDynamicProperty(`${YOUR_NAMESPACE}:is_hop_view_locking`, false);
        return;
    }
    system.run(() => maintainHopRotation(entityToLock));
}




system.runInterval(() => {
    const allRealPlayers = REAL_PLAYERS_CACHE;
    if (allRealPlayers.length === 0) {
        return;
    }
    let aiPlayersToProcess = new Set();    
    for (const player of allRealPlayers) {
        if (!player || !player.isValid) continue;

        try {
            const dimension = player.dimension;
            const entitiesInProximity = dimension.getEntities({
                type: AI_ENTITY_TYPE_ID,
                location: player.location,
                maxDistance: PLAYER_PROXIMITY_CHECK_RADIUS
            });
            for (const entity of entitiesInProximity) {
                aiPlayersToProcess.add(entity);
            }
        } catch (e) {
            console.warn(`[Bunny Hop] Error querying entities near player ${player.name}: ${e}`);
        }
    }
    for (const entity of aiPlayersToProcess) {
        if (!entity || !entity.isValid || entity.getDynamicProperty(`${YOUR_NAMESPACE}:is_hop_view_locking`)) {
            continue;
        }

        const currentTick = system.currentTick;
        const lastHopTick = entity.getDynamicProperty(`${YOUR_NAMESPACE}:last_bunny_hop_tick`) || 0;

        if (currentTick < lastHopTick + BUNNY_HOP_COOLDOWN_TICKS) {
            continue;
        }

        if (entity.isOnGround) {
            try {
                const velocity = entity.getVelocity();
                const horizontalSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);

                if (horizontalSpeed > BUNNY_HOP_SPEED_THRESHOLD) {
                    let impulseX = 0;
                    let impulseZ = 0;

                    if (horizontalSpeed > 0.01) {
                        const normalizedForwardX = velocity.x / horizontalSpeed;
                        const normalizedForwardZ = velocity.z / horizontalSpeed;
                        impulseX = normalizedForwardX * FORWARD_HOP_STRENGTH;
                        impulseZ = normalizedForwardZ * FORWARD_HOP_STRENGTH;
                    }

                    entity.applyImpulse({ x: impulseX, y: BUNNY_HOP_STRENGTH, z: impulseZ });
                    entity.setDynamicProperty(`${YOUR_NAMESPACE}:last_bunny_hop_tick`, currentTick);

                    
                    if (horizontalSpeed > 0.01) {
                        const initialRotation = entity.getRotation();
                        const targetYaw = Math.atan2(-velocity.x, velocity.z) * (180 / Math.PI);
                        
                        entity.setDynamicProperty(`${YOUR_NAMESPACE}:hop_target_yaw`, targetYaw);
                        entity.setDynamicProperty(`${YOUR_NAMESPACE}:hop_target_pitch`, initialRotation.x); 
                        entity.setDynamicProperty(`${YOUR_NAMESPACE}:is_hop_view_locking`, true);
                        system.run(() => maintainHopRotation(entity)); 
                    }
                }
            } catch (e_vel) { /* ... */ }
        }
    }
}, GLOBAL_BUNNY_HOP_CHECK_INTERVAL_TICKS);



world.afterEvents.entitySpawn.subscribe(event => {
    const { entity } = event;
   if (entity.typeId !== "zps:newb") {
        return; 
    }
    if (entity.hasTag('zps:resurrected_ai')) {
        entity.removeTag('zps:resurrected_ai'); 
        return;
    }
    if (entity.typeId === AI_ENTITY_TYPE_ID) {
        
        let finalName = "AI_Player";

      
        if (Math.random() < 0.5) {
            
            const partA = getRandomElement(namePartA_Adjectives);
            const partB = getRandomElement(namePartB_Conjunctions);
            const partC = getRandomElement(namePartC_Nouns);
            const partD = getRandomTwoDigitNumber();

           
            if (partA && partB && partC) {
                finalName = `${partA}${partB}${partC}${partD}`;
            } else {
                 console.warn(`[AI Namer] Failed to generate a composite name due to empty part arrays.`);
            }

        } else {
           
            finalName = getRandomElement(presetNames);
            if (!finalName) {
                console.warn(`[AI Namer] Failed to get a preset name because the list is empty.`);
                finalName = "AI_Player_Preset_Fallback"; 
            }
        }

      
        try {
            entity.nameTag = finalName;
        } catch (e) {
            console.warn(`[AI Namer] Failed to set nameTag for entity ${entity.id}. Error: ${e}`);
        }

        system.run(() => {
            try {
                if (!entity.isValid) return;
                entity.setDynamicProperty(`${YOUR_NAMESPACE}:isInDanger`, false);
                entity.setDynamicProperty(`${YOUR_NAMESPACE}:lastHostileTick`, 0);
                entity.setDynamicProperty(`${YOUR_NAMESPACE}:lastPostCombatChatTick`, 0);
	
                let numDogs = 0;
                const tiers = Object.keys(DOGS_PER_TIER).reverse();
                for (const tier of tiers) {
                    if (entity.hasTag(tier)) {
                        const tierConfig = DOGS_PER_TIER[tier];
                        numDogs = getRandomInt(tierConfig.min, tierConfig.max);
                        break; 
                    }
                }
                if (numDogs > 0) {
                    system.runTimeout(() => {
                        if (!entity.isValid) return;

                        for (let i = 0; i < numDogs; i++) {
                            try {
                                const spawnLoc = entity.location;
                                const offsetSpawnLoc = {
                                    x: spawnLoc.x + (Math.random() * 1.6 - 0.8),
                                    y: spawnLoc.y,
                                    z: spawnLoc.z + (Math.random() * 1.6 - 0.8)
                                };
                                if (entity.dimension.isChunkLoaded(offsetSpawnLoc)) { 
                    
                    const wolf = entity.dimension.spawnEntity(COMPANION_WOLF_TYPE_ID, offsetSpawnLoc);

                    if (wolf && wolf.isValid) {

                        wolf.setDynamicProperty(`${YOUR_NAMESPACE}:ai_master_id`, entity.id);

                        const tameableComp = wolf.getComponent(EntityComponentTypes.Tameable);
                        if (tameableComp && !tameableComp.isTamed) { 
                            wolf.triggerEvent("minecraft:on_tame"); 
                        }
                    }
                    
                } else {
                }
            } catch (e_dog) {
                console.error(`[AI_DOGS] Error spawning/setting up dog for AI ${entity.nameTag || entity.typeId}: ${e_dog}\nStack: ${e_dog.stack}`);
            }
        }
    }, 5); 
}
             
            } catch (error) {
                console.error(`[AI Namer] Error initializing ${entity.typeId}: ${error}`);
            }
        });
    }}
);

world.afterEvents.entityDie.subscribe(event => {
    const { deadEntity, damageSource } = event;
    if (deadEntity.typeId !== "zps:newb") {
        return; 
    }

   
    if (deadEntity.typeId === "zps:newb") {
        const newbName = deadEntity.nameTag || "A Player";
        let deathMessage = `${newbName} died`;

       
        let realAttacker;
        if (damageSource?.damagingProjectile?.owner) {
            realAttacker = damageSource.damagingProjectile.owner;
        } 
        else if (damageSource?.damagingEntity && damageSource.damagingEntity.typeId !== "zps:melee_strike_projectile") {
            realAttacker = damageSource.damagingEntity;
        }

        if (realAttacker && realAttacker.isValid) {
            const attackerName = realAttacker.nameTag || realAttacker.typeId.replace("zps:", "").replace("minecraft:", "");
 
            if (damageSource.damagingProjectile) {
   
                if (damageSource.damagingProjectile.typeId === "zps:melee_strike_projectile") {
                   
                    deathMessage = `${newbName} was killed by ${attackerName}`;
                } else {
                    
                    deathMessage = `${newbName} was shot by ${attackerName}`;
                }
            } else {
               
                deathMessage = `${newbName} was killed by ${attackerName}`;
            }

        } 

        else {
            const cause = damageSource?.cause;
            switch (cause) {
                case EntityDamageCause.fall:
                    deathMessage = `${newbName} fell from a high place`;
                    break;
                case EntityDamageCause.lava:
                    deathMessage = `${newbName} tried to swim in lava`;
                    break;
                case EntityDamageCause.fire:
                case EntityDamageCause.fireTick:
                    deathMessage = `${newbName} was roasted to a crisp`;
                    break;
                case EntityDamageCause.drowning:
                    deathMessage = `${newbName} drowned`;
                    break;
                case EntityDamageCause.suffocation:
                    deathMessage = `${newbName} suffocated in a wall`;
                    break;
                case EntityDamageCause.starve:
                    deathMessage = `${newbName} starved to death`;
                    break;
                case EntityDamageCause.void:
                    deathMessage = `${newbName} fell out of the world`;
                    break;
                case EntityDamageCause.lightning:
                    deathMessage = `${newbName} was struck by lightning`;
                    break;
                case EntityDamageCause.blockExplosion:
                    deathMessage = `${newbName} was blown up`;
                    break;
                case EntityDamageCause.magic:
                    deathMessage = `${newbName} was killed by magic`;
                    break;
                case EntityDamageCause.wither:
                    deathMessage = `${newbName} withered away`;
                    break;
                case EntityDamageCause.freezing:
                    deathMessage = `${newbName} froze to death`;
                    break;
                case undefined:
                case EntityDamageCause.none:
                    deathMessage = `${newbName} died mysteriously`;
                    break;
            }
        }


        world.sendMessage(deathMessage);
    }
});

world.afterEvents.entityHurt.subscribe(event => {
    const { hurtEntity, damageSource } = event;
    if (hurtEntity.typeId !== "zps:newb") {
        return; 
    }
    if (hurtEntity.typeId === AI_ENTITY_TYPE_ID && damageSource.damagingEntity && damageSource.damagingEntity.isValid) {
        const aiPlayer = hurtEntity;
        const attacker = damageSource.damagingEntity;

        if (attacker.id === aiPlayer.id) return;
  

        attacker.addTag(DEFEND_TARGET_TAG); 

        const companionWolves = aiPlayer.dimension.getEntities({
            type: COMPANION_WOLF_TYPE_ID,
            location: aiPlayer.location,
            maxDistance: 30 
        });

        for (const wolf of companionWolves) {
            if (wolf.isValid && wolf.getDynamicProperty(`${YOUR_NAMESPACE}:ai_master_id`) === aiPlayer.id) {

                wolf.triggerEvent("app:event_wolf_enter_defend_mode");
                wolf.setDynamicProperty(`${YOUR_NAMESPACE}:is_in_combat`, true); 
            }
        }

        system.runTimeout(() => {
            if (attacker.isValid) {
                attacker.removeTag(DEFEND_TARGET_TAG);
            }
           
			if (!aiPlayer || !aiPlayer.isValid) {
     
                return; 
            }

            if (attacker && attacker.isValid) { 
                attacker.removeTag(DEFEND_TARGET_TAG);
     
            }
            const currentWolvesAfterDefend = aiPlayer.dimension.getEntities({
                type: COMPANION_WOLF_TYPE_ID,
                location: aiPlayer.location, 
                maxDistance: 30
            });
            for (const wolf of currentWolvesAfterDefend) {
                if (wolf.isValid && wolf.getDynamicProperty(`${YOUR_NAMESPACE}:ai_master_id`) === aiPlayer.id) {
                    wolf.triggerEvent("app:event_wolf_exit_defend_mode");
                    wolf.setDynamicProperty(`${YOUR_NAMESPACE}:is_in_combat`, false); 
                }
            }
        }, WOLF_DEFEND_MODE_DURATION_TICKS);
    }
});


world.afterEvents.projectileHitEntity.subscribe(event => {
    const projectile = event.projectile;
    const shooter = event.source;       
    const hitInfo = event.getEntityHit();

 if (!shooter || !shooter.isValid) {
        return;
    }
    if (shooter.typeId !== AI_ENTITY_TYPE_ID) {
        return;
    }
    if (!hitInfo) {
        return;
    }
    const entityHit = hitInfo.entity;
    if (!entityHit || !entityHit.isValid) {
        return;
    }
    if (projectile && projectile.isValid) {
        if (projectile.typeId !== "zps:melee_strike_projectile") {
            return; 
        }
    } else if (projectile) {
        if (projectile.typeId !== "zps:melee_strike_projectile"){
             return;
        }

    } else {
        return;
    }
  
    if (entityHit.id === shooter.id) {
        return;
    }
    const ownerName = shooter.nameTag || shooter.typeId;

    
    const companionWolves = shooter.dimension.getEntities({
        type: COMPANION_WOLF_TYPE_ID,
        location: shooter.location,
        maxDistance: 30 
    });

    for (const wolf of companionWolves) {
        if (wolf.isValid && wolf.getDynamicProperty(`${YOUR_NAMESPACE}:ai_master_id`) === shooter.id) {
            
            const isWolfDefending = wolf.getDynamicProperty(`${YOUR_NAMESPACE}:is_in_combat`) || false;
         
            
            if (isWolfDefending) {
    
                continue; 
            }

            try {
                
                entityHit.addTag(ASSIST_TARGET_TAG);
            } catch (e_tag_add) {
                 console.error(`[AI_DOGS_ASSIST] Error adding assist tag to ${entityHit.nameTag || entityHit.typeId}: ${e_tag_add}`);
                 continue;
            }

            wolf.triggerEvent("app:event_wolf_enter_assist_mode");
            system.runTimeout(() => {
                if (entityHit.isValid) { 
                    entityHit.removeTag(ASSIST_TARGET_TAG);
                }
                if (wolf.isValid) {
                    if (!wolf.getDynamicProperty(`${YOUR_NAMESPACE}:is_in_combat`)) {
                        wolf.triggerEvent("app:event_wolf_exit_assist_mode");
                    }
                }
            }, WOLF_ASSIST_MODE_DURATION_TICKS);
        }
    }
});


world.afterEvents.entityDie.subscribe(event => {
    const { deadEntity, damageSource } = event; 

    if (deadEntity.typeId !== "zps:newb") {
        return; 
    }
    if (deadEntity.typeId === AI_ENTITY_TYPE_ID) {
        const deadAiPlayerId = deadEntity.id;
        const deadAiPlayerName = deadEntity.nameTag || deadEntity.typeId;

  
        let potentialOrphanedWolves;
        try {
            potentialOrphanedWolves = deadEntity.dimension.getEntities({
                type: COMPANION_WOLF_TYPE_ID,
            });
        } catch (e) {
  
            return;
        }


        for (const wolf of potentialOrphanedWolves) {
            if (wolf.isValid) {
                const masterId = wolf.getDynamicProperty(`${YOUR_NAMESPACE}:ai_master_id`);
                if (masterId === deadAiPlayerId) { 

                    
                    wolf.setDynamicProperty(`${YOUR_NAMESPACE}:ai_master_id`, "none_orphaned"); 

                    
                    wolf.triggerEvent("app:event_wolf_exit_defend_mode"); 
                    wolf.setDynamicProperty(`${YOUR_NAMESPACE}:is_in_combat`, false); 
                     wolf.triggerEvent("zps:event_start_despawn_timer");
                }
            }
        }
    }
});

initializeStrafingBehavior();
initializeGreetingBehavior();
initializeAttackPermissionBehavior();
initializeStrollSwitcherBehavior();
initializeAntiTrapBehavior();
initializeProgressionSystem();
initializeFallDetectorBehavior();
initializePeacemakerBehavior();
initializeAffinitySystem();
initializeBuilderSystem();
initializeShieldKnockback();
initializeFoodSystem();
initializeAISpawner();
initializeAffinityListener();
initializeInteractionUI();

console.warn(`[${YOUR_NAMESPACE.toUpperCase()} AI Script] Main script loaded (Sound effects temporarily disabled).`);