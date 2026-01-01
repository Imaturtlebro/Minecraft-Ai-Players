import { world, system, EntityEquippableComponent, EquipmentSlot } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";

// --- Configuration ---
const AI_ENTITY_TYPE_ID = "zps:newb";         
const AFFINITY_BASE_KEY = "affinity_player_"; 
const TARGET_ITEM_ID = "zps:friend_offer";
const FRIEND_LIST_ITEM_ID = "zps:friend_list_opener"; 

// --- Persistence & Status Keys (Dynamic Properties) ---
const AI_PERSISTENT_ID_KEY = "zps:p_id";             // 存储在 AI 实体上：持久化唯一 ID
const FRIEND_STATUS_BASE_KEY = "friend_status_";    // 存储在 AI 实体上：针对特定玩家的好友状态
const FRIEND_COOLDOWN_BASE_KEY = "friend_cooldown_"; // 存储在 AI 实体上：申请冷却截止时间
const PLAYER_FRIENDS_DATA_KEY = "zps:friends_list_data"; // 存储在玩家实体上：好友列表

// --- World Global Status Key ---
const DEAD_AI_LIST_KEY = "zps:dead_ais"; // 存储在世界属性上：已死亡 AI 的 P-ID 列表
const REVIVE_COOLDOWN_BASE_KEY = "zps:revive_cd_"; // 存储在世界属性上: zps:revive_cd_[persistentId]
const TELEPORT_COOLDOWN_BASE_KEY = "zps:tp_cd_";   // 存储在 AI 实体上: zps:tp_cd_[playerId]

// --- Cooldowns and Delays ---
const FRIEND_COOLDOWN_SECONDS = 120;                // 2分钟
const MIN_RESPONSE_DELAY_TICKS = 100;               // 5秒
const MAX_RESPONSE_DELAY_TICKS = 600;              // 30秒
const GLOBAL_REVIVE_COOLDOWN_SECONDS = 300; // 5 分钟
const TELEPORT_COOLDOWN_SECONDS = 60;       // 1 分钟

//复活重置
const PROGRESSION_PROPERTY = "zps:progression_points"; 
const FACTION_TAGS = ['crazy', 'bad', 'good'];
const LV_TAGS = ['lv1', 'lv2', 'lv3', 'lv4', 'lv5', 'lv6'];
const TIER_TAGS = ['wooden', 'stone', 'copper', 'iron', 'diamond', 'diamond_pro'];
const ALL_CLEANUP_TAGS = [...FACTION_TAGS, ...LV_TAGS, ...TIER_TAGS, 'captain'];

//功能
const FOLLOW_AI_TAG = 'follow_player';
const CAN_FOLLOW_PLAYER_TAG = 'can_followed';
const LOCK_EQUIPMENT_TAG = 'suoding';
const PROHIBIT_BUILDING_TAG = 'prohibit_building';

// --- NEW: Item and Initialization Keys ---
const ITEM_FRIEND_OFFER = "zps:friend_offer";
const ITEM_FRIEND_LIST_OPENER = "zps:friend_list_opener";
const PLAYER_INIT_FLAG_KEY = "zps:initialized_player"; // 存储在玩家实体上


// --- 【新增功能】负好感度自动移除好友 ---

/**
 * 每分钟运行一次，检查玩家的好友列表中是否有AI好感度过低。
 * 满足条件（好感度 < 0）时，有 Math.abs(affinity)% 的几率主动移除好友。
 * 判定范围：已加载的 AI 实体上的好感度，以及已死亡的 AI 在世界缓存中的好感度。
 */
function checkNegativeAffinityUnfriend() {
    // 1. 玩家循环
    for (const player of world.getAllPlayers()) {
        if (!player.isValid) continue;

        let friendsList = getPlayerFriends(player); //
        let updatedList = [];
        let playerListChanged = false;

        // 2. 好友循环
        for (const friendData of friendsList) {
            const persistentId = friendData.id;
            const aiName = friendData.name;
            
            // 尝试获取 AI 实体 (加载状态)
            const ai = getAiByPersistentId(persistentId); //
            const isDead = getDeadAiIds().has(persistentId); //

            let affinity = 0;
            let dataAvailable = false;
            const AFFINITY_CACHE_KEY = `zps:dead_ai_affinity_${persistentId}`;
            
            // 1. 获取好感度值 (优先从在线实体获取，否则从死亡缓存获取)
            if (ai && ai.isValid) {
                // 情况 A: AI 在线/已加载 (实时数据)
                affinity = ai.getDynamicProperty(AFFINITY_BASE_KEY + player.id) || 0; //
                dataAvailable = true;
            } else if (isDead) {
                // 情况 B: AI 已死亡 (使用缓存数据)
                try {
                    const affinityDataStr = world.getDynamicProperty(AFFINITY_CACHE_KEY); //
                    if (affinityDataStr) {
                        const affinityData = JSON.parse(affinityDataStr);
                        if (affinityData[player.id] !== undefined) {
                            affinity = affinityData[player.id];
                            dataAvailable = true;
                        }
                    }
                } catch (e) { /* 忽略读取错误 */ }
            }
            
            // 2. 只有当好感度数据可用 (在线或死亡缓存) 且好感度 < 0 时才进行判定
            if (dataAvailable && affinity < 0) {
                const unfriendChance = Math.abs(affinity); // 1% 每点负好感度
                
                if (Math.random() * 100 < unfriendChance) {
                    // --- 执行移除逻辑 ---
                    
                    // A. 清理在线/加载实体上的状态 (如果存在)
                    if (ai && ai.isValid) {
                        ai.setDynamicProperty(FRIEND_STATUS_BASE_KEY + player.id, null);
                        ai.setDynamicProperty(FRIEND_COOLDOWN_BASE_KEY + player.id, null);
                        ai.setDynamicProperty(AFFINITY_BASE_KEY + player.id, null); 
                        ai.removeTag(FOLLOW_AI_TAG); //
                        player.removeTag(CAN_FOLLOW_PLAYER_TAG); //
                    }

                    // B. 清理死亡缓存中的好感度 (确保下次复活不会被恢复)
                    if (isDead) {
                        try {
                            const affinityDataStr = world.getDynamicProperty(AFFINITY_CACHE_KEY);
                            if (affinityDataStr) {
                                let affinityData = JSON.parse(affinityDataStr);
                                delete affinityData[player.id];
                                world.setDynamicProperty(AFFINITY_CACHE_KEY, JSON.stringify(affinityData));
                            }
                        } catch (e) { /* 忽略清理错误 */ }
                    }
                    
                    // C. 通知玩家
                    player.sendMessage(`§c§l${aiName}§r§c has unfriended you.`);
                    playerListChanged = true;
                    
                    // D. 跳过添加到 updatedList (即被移除)
                    continue;
                }
            }
            
            // 3. 如果未被移除，或者数据不可用 (AI 未加载且未死亡)，则保留在列表中
            updatedList.push(friendData);
        }
        
        // 4. 只有在发生移除时才更新玩家的好友列表
        if (playerListChanged) {
            setPlayerFriends(player, updatedList); //
        }
    }
}




function runProbabilisticAction({
    player, ai, actionType, requestSentMessage,
    baseChance, affinity, 
    cooldownKey, cooldownSeconds, cooldownScope,
    onSuccess, onFailure = () => {},
    successMessage, failureMessage, cooldownMessage
}) {
    if (!ai.isValid || !player.isValid) return;

    const aiName = ai.nameTag;
    const cdKey = cooldownKey + player.id;
    const currentTime = Date.now();
    const expiry = ai.getDynamicProperty(cdKey) || 0;
    const PENDING_KEY = "zps:pending_action"; // Global request lock

    // 1. [New] Check if AI is already processing another request
    const pendingAction = ai.getDynamicProperty(PENDING_KEY);
    if (pendingAction) {
        player.sendMessage(`§8[${aiName}] Is processing the previous request, please wait...`);
        return;
    }

    // 2. Check player's personal cooldown
    if (expiry > currentTime) {
        const remaining = Math.ceil((expiry - currentTime) / 1000);
        
        // [Core Fix: Cooldown message]
        let cdMsg = `§8[${aiName}] Cooldown for this action, please wait ${remaining} seconds.`;
        if (actionType === 'assist') {
            cdMsg = `§8[${aiName}] Assist request on cooldown, please wait ${remaining} seconds before trying again.`;
        } else if (actionType === 'follow') {
            cdMsg = `§8[${aiName}] Follow request on cooldown, please wait ${remaining} seconds before trying again.`;
        }
        player.sendMessage(cdMsg);
        return;
    }


    // 3. 计算概率
    let finalChance = baseChance + affinity;
    finalChance = Math.max(0, Math.min(100, finalChance)); // 确保概率在 0-100 之间
    const isSuccess = Math.random() * 100 < finalChance;

    // 4. 设置延迟 (3-10 秒)
    const delayTicks = Math.floor(Math.random() * (200 - 60 + 1)) + 60; // 60 (3s) 到 200 (10s) 刻

    // 5. 【新增】设置全局锁并发送即时消息
    ai.setDynamicProperty(PENDING_KEY, actionType);
    if (requestSentMessage) {
        player.sendMessage(requestSentMessage);
    }

    // 6. 延迟执行
    system.runTimeout(() => {
        // 延迟后无论如何都要清理锁
        ai.setDynamicProperty(PENDING_KEY, null);
        
        if (!ai.isValid || !player.isValid) return; // 延迟后再次检查

        const newExpiry = currentTime + (cooldownSeconds * 1000);

        if (isSuccess) {
            // 成功
            player.sendMessage(`§a§l[${aiName}] ${successMessage}`);
            onSuccess();
            if (cooldownScope === 'always' || cooldownScope === 'success') {
                ai.setDynamicProperty(cdKey, newExpiry);
            }
        } else {
            // 失败
            player.sendMessage(`§c§l[${aiName}] ${failureMessage}`);
            onFailure();
            if (cooldownScope === 'always' || cooldownScope === 'failure') {
                ai.setDynamicProperty(cdKey, newExpiry);
            }
        }
        
        // 刷新菜单
        system.runTimeout(() => {
             if (ai.isValid && player.isValid) {
                showFriendActionMenu(player, ai, friendDataFromCache(ai, player));
             }
        }, 5); 

    }, delayTicks);
}

// 辅助函数，用于刷新菜单时获取最新的 friendData
function friendDataFromCache(ai, player) {
    const persistentId = ai.getDynamicProperty(AI_PERSISTENT_ID_KEY);
    return getPlayerFriends(player).find(f => f.id === persistentId);
}

function giveFriendConfigItems(player) {
    player.runCommand(`give @s ${ITEM_FRIEND_OFFER}`);
    player.runCommand(`give @s ${ITEM_FRIEND_LIST_OPENER}`);
}

function triggerFactionalEvent(ai, baseEventName) {
    if (!ai?.isValid) return;

    if (ai.hasTag("good")) {
        ai.triggerEvent(`zps:good_${baseEventName}`);
    } else if (ai.hasTag("bad")) {
        ai.triggerEvent(`zps:bad_${baseEventName}`);
    } else if (ai.hasTag("crazy")) {
        ai.triggerEvent(`zps:crazy_${baseEventName}`);
    } else {
        
        ai.triggerEvent(`zps:${baseEventName}`);
    }
}

//获取或初始化玩家的好友列表数组
function getPlayerFriends(player) {
    try {
        const data = player.getDynamicProperty(PLAYER_FRIENDS_DATA_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        return [];
    }
}

//存储玩家好友列表
function setPlayerFriends(player, friendsList) {
    player.setDynamicProperty(PLAYER_FRIENDS_DATA_KEY, JSON.stringify(friendsList));
}

//获取世界动态属性中存储的已死亡 AI ID 列表
function getDeadAiIds() {
    const data = world.getDynamicProperty(DEAD_AI_LIST_KEY);
    return data ? new Set(JSON.parse(data)) : new Set();
}

//存储已死亡 AI ID 列表到世界动态属性
function setDeadAiIds(deadAiSet) {
    world.setDynamicProperty(DEAD_AI_LIST_KEY, JSON.stringify(Array.from(deadAiSet)));
}

//通过持久化 ID 查找加载区块中的 AI 实体
function getAiByPersistentId(persistentId) {
    const dimensionIds = ["overworld", "nether", "the_end"];    
    // 1. 先查找实体
    for (const dimId of dimensionIds) {
        try {
            const dimension = world.getDimension(dimId);
            const entities = dimension.getEntities({
                type: AI_ENTITY_TYPE_ID,
            });            
            for (const entity of entities) {
                const entityPId = entity.getDynamicProperty(AI_PERSISTENT_ID_KEY);                  if (entityPId === persistentId) {
                    if (!entity.hasTag('online')) {
                        entity.addTag('online');
                    }                   
                    return entity;
                }
            }
        } catch (e) { 
        }
    }
    return null;
}


//确保 AI 实体拥有持久化 ID。如果 AI 是新的，生成一个 GUID
function ensurePersistentId(ai) {
    let pId = ai.getDynamicProperty(AI_PERSISTENT_ID_KEY);
    if (!pId) {
        pId = `${Date.now()}-${Math.floor(Math.random() * 10000)}-${ai.id}`; 
        ai.setDynamicProperty(AI_PERSISTENT_ID_KEY, pId);
    }
    return pId;
}


// --- Action Functions ---

//复活逻辑
function resurrectAI(player, friendData) {
    const persistentId = friendData.id;
    const deadAiSet = getDeadAiIds();
    const reviveCooldownKey = REVIVE_COOLDOWN_BASE_KEY + persistentId;
    const reviveExpiry = world.getDynamicProperty(reviveCooldownKey) || 0;
    const currentTime = Date.now();
    
    if (reviveExpiry > currentTime) {
        const remainingSeconds = Math.ceil((reviveExpiry - currentTime) / 1000);
        player.sendMessage(`§c[System] Please wait ${remainingSeconds} seconds before trying again.`);
        return;
    }

    // 1. Core check: Death mark
    if (!deadAiSet.has(persistentId)) {
        player.sendMessage(`§e[System] ${friendData.name} has only temporarily departed and cannot be invited online.`);
        return; 
    }
    
    // 2. Anti-clone check (secondary insurance)
    const existingAi = getAiByPersistentId(persistentId);
    if (existingAi) {
        player.sendMessage(`§e[System] ${friendData.name} is already online.`);
        deadAiSet.delete(persistentId);
        setDeadAiIds(deadAiSet);
        showFriendActionMenu(player, existingAi, friendData); 
        return; 
    }

    // --- 检查通过，执行生成 ---
    const dimension = player.dimension;
    const spawnLoc = player.location;
    
    try {
        const RESURRECT_TAG = "zps:resurrected_ai"; 
        const newAi = dimension.spawnEntity(AI_ENTITY_TYPE_ID, spawnLoc);
        
        // A. 立即设置复活标记和持久化 ID，并设置名字
        newAi.addTag(RESURRECT_TAG); 
        newAi.setDynamicProperty(AI_PERSISTENT_ID_KEY, persistentId); 
        newAi.nameTag = friendData.name; 
        
        // B. 清理标记：复活成功，移除死亡标记
        deadAiSet.delete(persistentId);
        setDeadAiIds(deadAiSet);
        const newReviveExpiry = currentTime + (GLOBAL_REVIVE_COOLDOWN_SECONDS * 1000);
        world.setDynamicProperty(reviveCooldownKey, newReviveExpiry);
        player.sendMessage(`§e${friendData.name} joined the game`);

        // C. 【关键修改】引入延迟清理和状态恢复
        system.runTimeout(() => {
            if (!newAi.isValid) return; 

            // --- 状态恢复逻辑 ---
            
            // 1. 清除所有与等级、派系、装备相关的旧标签 (包括 json 中可能设置的随机标签)
            for (const tag of ALL_CLEANUP_TAGS) {
                newAi.removeTag(tag);
            }
            
            // 2. 重置进度和设置初始装备标签
            newAi.setDynamicProperty(PROGRESSION_PROPERTY, 0); // 点数重置为0
            newAi.addTag('wooden'); // 设置最低装备等级

            // 3. 恢复存储的标签
            if (friendData.factionTag) {
                newAi.addTag(friendData.factionTag);
            }
            if (friendData.lvTag) {
                newAi.addTag(friendData.lvTag);
            }
            
            if (!newAi.hasTag('online')) {
                        newAi.addTag('online');
            }
            
            // --- 【新增逻辑：恢复好感度】 ---
            const INTERACTED_PLAYERS_KEY = "zps:interacted_players_list";
            const AFFINITY_CACHE_KEY = `zps:dead_ai_affinity_${persistentId}`;
            
            try {
                // 1. 恢复玩家列表
                const playersListData = world.getDynamicProperty(INTERACTED_PLAYERS_KEY + "_" + persistentId);
                if (playersListData) {
                    newAi.setDynamicProperty(INTERACTED_PLAYERS_KEY, playersListData);
                    world.setDynamicProperty(INTERACTED_PLAYERS_KEY + "_" + persistentId, null); // 清除缓存
                }
                
                // 2. 恢复好感度数据
                const affinityDataStr = world.getDynamicProperty(AFFINITY_CACHE_KEY);
                if (affinityDataStr) {
                    const affinityData = JSON.parse(affinityDataStr);
                    for (const playerId in affinityData) {
                        newAi.setDynamicProperty(AFFINITY_BASE_KEY + playerId, affinityData[playerId]);
                    }
                    world.setDynamicProperty(AFFINITY_CACHE_KEY, null); // 清除缓存
                }
            } catch (e) {
                console.warn(`[AI Resurrect] Failed to restore affinity data for AI ${persistentId}: ${e}`);
            }
            // --- 【新增逻辑 结束】
            
             // 4. 【新增】皮肤变种恢复逻辑
            if (friendData.variantId !== null && friendData.variantId !== undefined) {
                const variantId = friendData.variantId;
                
                // 4.1 触发清除所有材质的事件
                newAi.triggerEvent("delete_tx"); 
                
                // 4.2 根据ID触发对应事件 (ID 0 -> tx01, ID 1 -> tx02)
                if (variantId >= 0) {
                    // 使用 padStart(2, '0') 确保是 tx01, tx02 格式
                    const variantEvent = `become_tx${(variantId + 1).toString().padStart(2, '0')}`;
                    newAi.triggerEvent(variantEvent);
                }
            }
            
            // 5. 清空库存 (主手, 副手, 盔甲) - 使用指令
            const commands = [
                `replaceitem entity @s slot.weapon.mainhand 0 air`,
                `replaceitem entity @s slot.weapon.offhand 0 air`,
                `replaceitem entity @s slot.armor.head 0 air`,
                `replaceitem entity @s slot.armor.chest 0 air`,
                `replaceitem entity @s slot.armor.legs 0 air`,
                `replaceitem entity @s slot.armor.feet 0 air`
            ];

            const TEMP_TARGET_TAG = "zps:temp_target_ai";
            newAi.addTag(TEMP_TARGET_TAG);
            
            commands.forEach(cmd => {
                const finalCmd = cmd.replace(/@s/, `@e[tag=${TEMP_TARGET_TAG},c=1]`);
                dimension.runCommand(finalCmd);
            });
            
            newAi.removeTag(TEMP_TARGET_TAG); 

        }, 10); 
        
    } catch (e) {
        player.sendMessage(`§c[System] Can't Invite: ${friendData.name}。`);
    }
}


/**
 * 询问 AI 当前坐标。
 */
function askCoordinates(ai, player) {
    if (!ai.isValid || !player.isValid) return;

    const loc = ai.location;
    const dim = ai.dimension.id.split(':')[1]; 
    
    player.sendMessage(`§a[${ai.nameTag}] §fCurrent coordinates: §bX: ${loc.x.toFixed(1)}, Y: ${loc.y.toFixed(1)}, Z: ${loc.z.toFixed(1)} (§e${dim}§f)`);
}

/**
 * 【修正】删除好友操作，改为施加好感度惩罚，并保留好感度数据。
 */
function unfriendAI(player, persistentId, aiName) {
    
    // 1. 【新增】计算好感度惩罚 (20-40点)
    const penalty = Math.floor(Math.random() * 21) + 20; //

    // 2. 清理 AI 实体上的状态 (如果存活)
    const ai = getAiByPersistentId(persistentId); //
    if (ai) {
        // 移除好友状态和跟随状态
        ai.setDynamicProperty(FRIEND_STATUS_BASE_KEY + player.id, null); //
        ai.setDynamicProperty(FRIEND_COOLDOWN_BASE_KEY + player.id, null); //
        ai.removeTag(FOLLOW_AI_TAG); //
        player.removeTag(CAN_FOLLOW_PLAYER_TAG); //

        // 【修改】不再设置好感度为 null，而是施加惩罚
        let currentAffinity = ai.getDynamicProperty(AFFINITY_BASE_KEY + player.id) || 0;
        let newAffinity = Math.max(-100, currentAffinity - penalty); // 假设-100为下限
        ai.setDynamicProperty(AFFINITY_BASE_KEY + player.id, newAffinity);
    }

    // 3. 清理玩家好友列表 (保持不变)
    const friends = getPlayerFriends(player); //
    const updatedFriends = friends.filter(f => f.id !== persistentId);
    setPlayerFriends(player, updatedFriends); //

    // 4. 【移除】不再清理死亡标记 (Block 3)
    // (移除 deadAiSet.delete(persistentId) 逻辑)

    // 5. 【修改】更新死亡好感度缓存 (施加惩罚)
    const AFFINITY_CACHE_KEY = `zps:dead_ai_affinity_${persistentId}`; //
     try {
        const affinityDataStr = world.getDynamicProperty(AFFINITY_CACHE_KEY);
        if (affinityDataStr) {
            let affinityData = JSON.parse(affinityDataStr);
            
            // 【修改】不再删除，而是应用惩罚
            let currentAffinity = affinityData[player.id] || 0;
            affinityData[player.id] = Math.max(-100, currentAffinity - penalty); 
            
            world.setDynamicProperty(AFFINITY_CACHE_KEY, JSON.stringify(affinityData));
        }
    } catch (e) { /* 忽略清理错误 */ }

    // 6. 【修改】更新提示消息
    player.sendMessage(`§cYou have unfriended §l${aiName}§r§c.`);
}



function inviteOnline(ai, player) {
    if (!ai.isValid || !player.isValid) {
        player.sendMessage("§cTarget is no longer valid.");
        return;
    }
    
    if (ai.hasTag('online')) {
    const playerId = player.id;
        const aiName = ai.nameTag;
    const tpCooldownKey = TELEPORT_COOLDOWN_BASE_KEY + playerId;
        const tpExpiry = ai.getDynamicProperty(tpCooldownKey) || 0;
        const currentTime = Date.now();

        if (tpExpiry > currentTime) {
            const remainingSeconds = Math.ceil((tpExpiry - currentTime) / 1000);
            player.sendMessage(`§c[${aiName}] Teleport is on cooldown, please wait ${remainingSeconds} seconds before trying again.`);
            return;
        }
        
        // 1. Check if dimensions match
        if (ai.dimension.id !== player.dimension.id) {
            const playerDimName = player.dimension.id.split(':')[1] || "Unknown";
            
            player.sendMessage(`§c[${ai.nameTag}] is currently in a different dimension (${playerDimName}), cannot teleport.`);
            player.sendMessage("§e[Tip] Please go to their dimension first.");
            return; // Prevent teleport
        }
        
        // 2. Dimensions match, execute teleport
        player.sendMessage(`§e[System] Teleporting you, please wait...`);
        
        // Use try-catch for added safety
        try {
            ai.teleport(player.location, player.dimension);
            player.sendMessage(`§a[System] ${ai.nameTag} has been teleported to your side.`);
            const newTpExpiry = currentTime + (TELEPORT_COOLDOWN_SECONDS * 1000);
            ai.setDynamicProperty(tpCooldownKey, newTpExpiry);
        } catch (e) {
             player.sendMessage(`§c[System] Teleport failed, please check the friend's location.`);
        }
        
    } else {
        // AI Offline state (isOnline = false)
        player.sendMessage(`§c[${ai.nameTag}] is currently offline, cannot teleport.`);
    }
}


/**
 * 处理好友申请的延迟、判定和状态更新。
 * (已更新为存储持久化 ID)
 */
function handleFriendRequest(ai, player, affinity) {
    if (!ai.isValid || !player.isValid) return;

    const playerId = player.id;
    const aiName = ai.nameTag || "AI Player";
    
    const delayTicks = Math.floor(Math.random() * (MAX_RESPONSE_DELAY_TICKS - MIN_RESPONSE_DELAY_TICKS + 1)) + MIN_RESPONSE_DELAY_TICKS;

    ai.setDynamicProperty(FRIEND_STATUS_BASE_KEY + playerId, "requested");
    player.sendMessage(`§a§lYour friend request has been submitted to [${aiName}].`);

    system.runTimeout(() => {
        if (!ai.isValid || !player.isValid) return;

        let isAccepted = false;
        let responseMessage = "";
        
        // --- Logic check ---
        if (affinity < 0) {
            // Affinity < 0: Directly refused
            responseMessage = `§c§l[${aiName}] refused your friend request.`;
            isAccepted = false;
            
        } else {
            // Affinity >= 0: Conduct probability check
            let successRate = 20 + affinity; // Base 20% + 1% per affinity point
            successRate = Math.min(successRate, 100); 
            
            if (Math.random() * 100 < successRate) {
                // Accepted
                responseMessage = `§a§l[${aiName}] accepted your friend request.`;
                isAccepted = true;
            } else {
                // Refused (Probability failed)
                responseMessage = `§c§l[${aiName}] refused your friend request.`;
                isAccepted = false;
            }
        }
        
        if (isAccepted) {
            // A. 同意：设置永久接受状态
            ai.setDynamicProperty(FRIEND_STATUS_BASE_KEY + playerId, "accepted");
            ai.setDynamicProperty(FRIEND_COOLDOWN_BASE_KEY + playerId, 0); 
            if (ai.isValid && !ai.hasTag('online')) { 
                ai.addTag('online');
            }
             let variantId = null;
            try {
                const variantComp = ai.getComponent('minecraft:variant');
                if (variantComp) {
                    variantId = variantComp.value; // 获取变种ID (数字)
                }
            } catch (e) {
                console.warn(`[HandleFriend] Failed to get variant component for AI: ${e}`);
            }
            // 存储 AI 信息到玩家的动态属性 (使用持久化 ID)
            const persistentId = ensurePersistentId(ai); // 确保 AI 有一个 P-ID
            const friends = getPlayerFriends(player);
            const existingIndex = friends.findIndex(f => f.id === persistentId);
            if (existingIndex === -1) {
                const storedFactionTag = FACTION_TAGS.find(tag => ai.hasTag(tag)) || null;
                const storedLvTag = LV_TAGS.find(tag => ai.hasTag(tag)) || null;

                friends.push({ 
                    id: persistentId, 
                    name: aiName, 
                    isTamed: false, 
                    factionTag: storedFactionTag, 
                    lvTag: storedLvTag,            
                    variantId: variantId
                });
                setPlayerFriends(player, friends);
            }
        } else {
            // B. 拒绝：设置冷却状态
            ai.setDynamicProperty(FRIEND_STATUS_BASE_KEY + playerId, "cooldown");
            const expiryTick = system.currentTick + (FRIEND_COOLDOWN_SECONDS * 20);
            ai.setDynamicProperty(FRIEND_COOLDOWN_BASE_KEY + playerId, expiryTick);
        }

        player.sendMessage(responseMessage);
        player.sendMessage("§b[Tip] Please re-open the menu to check the new friend status.");


    }, delayTicks);
}


// --- UI Functions ---

//好友申请界面 (非好友状态)
function showAiInfoMenu(player, ai, affinity) {
    
    const playerId = player.id;
    const aiName = ai.nameTag;

    
    const friendStatus = ai.getDynamicProperty(FRIEND_STATUS_BASE_KEY + playerId) || "";
    const cooldownExpiry = ai.getDynamicProperty(FRIEND_COOLDOWN_BASE_KEY + playerId) || 0;
    const currentTick = system.currentTick;
    
    let isCoolingDown = (friendStatus === "cooldown" && currentTick < cooldownExpiry);
    let isRequested = (friendStatus === "requested");

    // 3. 创建 UI
    const form = new ActionFormData();
    form.title(aiName);

    let affinityText;
    if (affinity >= 50) affinityText = `§a${affinity} (Friendly)`;
    else if (affinity > 20) affinityText = `§e${affinity} (Warm)`;
    else if (affinity >= -20) affinityText = `§f${affinity} (Neutral)`;
    else affinityText = `§c${affinity} (Hostile)`;

    let bodyText = `§8Your affinity with this person:\n§f${affinityText}\n\n`;
    form.body(bodyText);


    // 4. 【条件渲染】添加按钮
    let buttonText;
    let buttonIcon;
    let buttonAction; // 0: Request Logic, 1: Close

    if (isCoolingDown) {
        const remainingTicks = cooldownExpiry - currentTick;
        const remainingSeconds = (remainingTicks / 20).toFixed(0);
        
        buttonText = `§e§lCooldown (${remainingSeconds}s)`; 
        buttonIcon = "textures/items/clock_item";
        buttonAction = 1; 
    } else if (isRequested) {
        buttonText = `§9Request Pending...`; 
        buttonIcon = "textures/items/paper";
        buttonAction = 1; 
    } else {
        buttonText = "§lFriend Request";
        buttonIcon = "textures/items/emerald";
        buttonAction = 0; 
    }
    
    form.button(buttonText, buttonIcon); // Button 0
    form.button("§cClose"); // Button 1


    // 5. 显示 UI 并处理点击
    form.show(player).then(response => {
        if (response.isCanceled || response.selection === 1) {
            return; 
        }

        if (response.selection === 0 && buttonAction === 0) {
            handleFriendRequest(ai, player, affinity);
        }
    });
}

// ai_interaction_ui.js

function showFriendActionMenu(player, ai, friendData) {
    
    // 1. 核心状态判断
    const persistentId = friendData.id;
    const isAlive = !!ai; // 是否在加载区块中
    const isDead = getDeadAiIds().has(persistentId); // 是否被标记为死亡
    const isOnline = isAlive ? ai.hasTag('online') : false;
    const currentTime = Date.now(); 

    // --- 【修改：好感度获取逻辑】 ---
    let affinity = 0;
    let affinityText = "§8Unknown";

    if (isAlive) {
        affinity = ai.getDynamicProperty(AFFINITY_BASE_KEY + player.id) || 0;
        affinityText = `§f${affinity}`;
    } else if (isDead) {
        // AI 已死亡，尝试从世界缓存读取
        try {
            const AFFINITY_CACHE_KEY = `zps:dead_ai_affinity_${persistentId}`;
            const affinityDataStr = world.getDynamicProperty(AFFINITY_CACHE_KEY);
            if (affinityDataStr) {
                const affinityData = JSON.parse(affinityDataStr);
                // 检查这个玩家的好感度是否在缓存中
                if (affinityData[player.id] !== undefined) {
                    affinity = affinityData[player.id];
                    affinityText = `§f${affinity} (Offline)`;
                }
            }
        } catch (e) { /* 忽略读取错误 */ }
    }
    // 如果 isAlive=false 且 isDead=false (即未加载)，affinity 保持 0, affinityText 保持 "未知"
    // --- 【修改 结束】 ---

    // --- 动作码 ---
    const ACTION_INVITE_RESURRECT = 0; 
    const ACTION_ASK_COORDS = 1; 
    const ACTION_REQUEST_ASSISTANCE = 2; // 驯服
    const ACTION_TOGGLE_FOLLOW = 3;      // 跟随
    const ACTION_TOGGLE_EQUIPMENT_LOCK = 4; // 锁定装备
    const ACTION_TOGGLE_BUILDING_PROHIBITION = 5; // 禁止建造
    const ACTION_UNFRIEND = 6;
    
    // --- 【修改】读取所有冷却和全局锁 ---
    const reviveCooldownKey = REVIVE_COOLDOWN_BASE_KEY + persistentId;
    const reviveExpiry = world.getDynamicProperty(reviveCooldownKey) || 0;
    const reviveOnCooldown = reviveExpiry > currentTime;
    const reviveRemaining = reviveOnCooldown ? Math.ceil((reviveExpiry - currentTime) / 1000) : 0;
    
    // 【新增】读取全局请求锁
    const PENDING_KEY = "zps:pending_action";
    const pendingAction = isAlive ? (ai.getDynamicProperty(PENDING_KEY) || null) : null;
    
    let tpRemaining = 0;
    let assistRemaining = 0;
    let followRemaining = 0;
    let tpOnCooldown = false;
    let assistOnCooldown = false;
    let followOnCooldown = false;

    if (isAlive) {
        const tpExpiry = ai.getDynamicProperty(TELEPORT_COOLDOWN_BASE_KEY + player.id) || 0;
        if (tpExpiry > currentTime) {
            tpOnCooldown = true;
            tpRemaining = Math.ceil((tpExpiry - currentTime) / 1000);
        }
        
        // 【新增】读取协助冷却
        const assistExpiry = ai.getDynamicProperty("zps:prob_tame_cd_" + player.id) || 0;
        if (assistExpiry > currentTime) {
            assistOnCooldown = true;
            assistRemaining = Math.ceil((assistExpiry - currentTime) / 1000);
        }
        
        // 【新增】读取跟随冷却
        const followExpiry = ai.getDynamicProperty("zps:prob_follow_cd_" + player.id) || 0;
        if (followExpiry > currentTime) {
            followOnCooldown = true;
            followRemaining = Math.ceil((followExpiry - currentTime) / 1000);
        }
    }
    
    const aiName = friendData.name;
    const form = new ActionFormData();
    form.title(`§aFriend Actions: ${aiName}`);

    let statusText = isAlive ? '§aOnline' : (isDead ? '§8Offline' : '§8Offline');
    form.body(`Current Status: ${statusText}\n§8Your affinity with this person: ${affinityText}\n\nPlease select the action you want to perform.`);


    // --- 按钮 0: 邀请上线 / 复活 ---
    let inviteText;
    let inviteIcon;
    let inviteEnabled = true;

    if (isDead) {
        if (reviveOnCooldown) {
            inviteText = `§8§lRevive Cooldown (${reviveRemaining}s)`;
            inviteIcon = "textures/items/clock_item";
            inviteEnabled = false;
        } else {
            inviteText = "§b§lInvite Online";
            inviteIcon = "textures/ui/worldsIcon";
        }
    } else if (isAlive) {
        // [Modification] Add Pending status check
        if (pendingAction) {
            inviteText = "§9Request being processed...";
            inviteIcon = "textures/items/paper";
            inviteEnabled = false;
        } else if (tpOnCooldown) {
            inviteText = `§8§lTeleport Cooldown (${tpRemaining}s)`;
            inviteIcon = "textures/items/clock_item";
            inviteEnabled = false;
        } else {
            inviteText = isOnline ? "§6§lRequest Teleport" : "§8Offline (Cannot teleport)";
            inviteIcon = isOnline ? "textures/items/ender_eye" : "textures/items/bush";
            inviteEnabled = isOnline;
        }
    } else {
        inviteText = "§8Too far away to operate";
        inviteIcon = "textures/items/clock_item";
        inviteEnabled = false;
    }
    form.button(inviteText, inviteIcon); 

    // --- 按钮 1: 询问坐标 ---
    let coordsText;
    let coordsIcon = "textures/items/compass_item";
    let coordsEnabled = isAlive;
    coordsText = isAlive ? "§fAsk for Coordinates" : "§8Ask for Coordinates";
    form.button(coordsText, coordsIcon);  

    // --- 按钮 2: 请求协助 (驯服) ---
    let assistText, assistIcon, assistEnabled = false;
    let isTamed = false;
    if (isAlive) {
        try {
            const tameable = ai.getComponent('minecraft:tameable');
            isTamed = tameable ? tameable.isTamed : false;
        } catch (e) { /* 无驯服组件 */ }
    }
    
    // 【修改】增加 Pending 和 Cooldown 状态检查
    if (isTamed) {
        assistText = "§aRequest Assistance";
        assistIcon = "textures/ui/check";
        assistEnabled = false;
    } else if (pendingAction) {
        assistText = "§9Request being processed...";
        assistIcon = "textures/items/paper";
        assistEnabled = false;
    } else if (assistOnCooldown) {
        assistText = `§8Assist Cooldown (${assistRemaining}s)`;
        assistIcon = "textures/items/clock_item";
        assistEnabled = false;
    } else if (isAlive) {
        assistText = "§6Request Assistance";
        assistIcon = "textures/items/lead";
        assistEnabled = true;
    } else {
        assistText = "§8Request Assistance (Offline)";
        assistIcon = "textures/items/lead";
        assistEnabled = false;
    }
    form.button(assistText, assistIcon);


    // --- 按钮 3: 请求/取消跟随 ---
    let followText, followIcon, followEnabled = false;
    const isPlayerFollowed = player.hasTag(CAN_FOLLOW_PLAYER_TAG);

    // 【修改】增加 Pending 和 Cooldown 状态检查
    if (isPlayerFollowed) {
        followText = "§cCancel Follow"; // Cancel operation is immediate, no lock required
        followIcon = "textures/ui/cancel";
        followEnabled = isAlive;
    } else if (pendingAction) {
        followText = "§9Request being processed...";
        followIcon = "textures/items/paper";
        followEnabled = false;
    } else if (followOnCooldown) {
        followText = `§8Follow Cooldown (${followRemaining}s)`;
        followIcon = "textures/items/clock_item";
        followEnabled = false;
    } else if (isAlive) {
        followText = "§6Request Follow";
        followIcon = "textures/items/stick";
        followEnabled = true;
    }
    
    if (!isAlive && !isPlayerFollowed) { // Ensure "Cancel Follow" is still shown when offline
        followText = "§8Follow (Offline)";
        followIcon = "textures/items/stick";
        followEnabled = false;
    }
    form.button(followText, followIcon);

    // --- 按钮 4-7: (保持不变) ---
    // (锁定装备和禁止建造是立即切换的，不需要全局锁)
    let lockText, lockIcon, lockEnabled = false;
    let buildText, buildIcon, buildEnabled = false;
    const isEquipmentLocked = isAlive && ai.hasTag(LOCK_EQUIPMENT_TAG);
    lockText = isEquipmentLocked ? "§aUnlock Equipment" : "§cLock Equipment";
    lockIcon = isEquipmentLocked ? "textures/ui/armor_full" : "textures/ui/armor_full";
    if (!isAlive) {
        lockText = "§8Lock Equipment (Offline)";
        lockIcon = "textures/ui/armor_empty";
    }
    lockEnabled = isAlive;
    form.button(lockText, lockIcon);

    const isBuildingProhibited = isAlive && ai.hasTag(PROHIBIT_BUILDING_TAG);
    buildText = isBuildingProhibited ? "§aAllow Building" : "§cProhibit Building";
    buildIcon = isBuildingProhibited ? "textures/items/iron_pickaxe" : "textures/ui/cancel";
    if (!isAlive) {
        buildText = "§8Prohibit Building (Offline)";
        buildIcon = "textures/items/iron_pickaxe";
    }
    buildEnabled = isAlive;
    form.button(buildText, buildIcon);
    
    form.button("§cDelete Friend", "textures/ui/icon_trash"); 
    form.button("§eBack", "textures/ui/icon_import");


    // --- 【修改：switch 语句】 ---
    form.show(player).then(response => {
        if (response.isCanceled || response.selection === 7) return;

        // ... (统一检查 AI 是否有效) ...
        if (response.selection >= ACTION_INVITE_RESURRECT && response.selection !== ACTION_UNFRIEND && (!isAlive && !isDead)) {
             if(response.selection === ACTION_INVITE_RESURRECT || response.selection === ACTION_ASK_COORDS) {
                 player.sendMessage(`§8[System] ${aiName} is too far away from you to operate.`);
             } else {
                 player.sendMessage(`§8[System] Operation failed: The target is not nearby or is offline.`);
             }
             return;
        }

        switch (response.selection) {
            
            case ACTION_INVITE_RESURRECT: // 0: 传送 / 复活
                if (isDead && !reviveOnCooldown) {
                    resurrectAI(player, friendData); 
                } else if (isAlive && isOnline) {
                    // 【修改】调用 runProbabilisticAction
                    runProbabilisticAction({
                        player: player, ai: ai,
                        actionType: 'teleport', // 全局锁类型
                        requestSentMessage: `§e[${aiName}] Your teleport request has been sent...`, // Instant message
                        baseChance: 20, affinity: affinity,
                        cooldownKey: TELEPORT_COOLDOWN_BASE_KEY, 
                        cooldownSeconds: 60,
                        cooldownScope: 'always', 
                        onSuccess: () => {
                            if (ai.isValid) inviteOnline(ai, player); 
                        },
                        successMessage: "agreed to your teleport request.",
                        failureMessage: "refused your teleport request."
                    });
                } else if (isAlive && !isOnline) {
                     player.sendMessage("§8Offline (Cannot teleport)");
                } else {
                     player.sendMessage("§8[System] Operation failed: The action is on cooldown or friend status does not match.");
                }
                break;


            case ACTION_ASK_COORDS: // 1: Ask for Coordinates (Keep unchanged)
                if (coordsEnabled) {
                    askCoordinates(ai, player);
                } else {
                    player.sendMessage(`§8[System] ${aiName} The target is not online.`);
                }
                break;

            case ACTION_REQUEST_ASSISTANCE: // 2: Request Assistance (Taming)
                if (isAlive && !isTamed) {
                    // [Modification] Call runProbabilisticAction
                    runProbabilisticAction({
                        player: player, ai: ai,
                        actionType: 'assist', // Global lock type
                        requestSentMessage: `§e[${aiName}] Your assistance request has been sent...`, // Instant message
                        baseChance: 10, affinity: affinity,
                        cooldownKey: "zps:prob_tame_cd_", 
                        cooldownSeconds: 60,
                        cooldownScope: 'failure', 
                        onSuccess: () => {
                            try {
                                const tameable = ai.getComponent('minecraft:tameable');
                                if (tameable) tameable.tame(player);
                            } catch (e) { /* Ignore error */ }
                        },
                        successMessage: "accepted your assistance request.",
                        failureMessage: "refused your assistance request."
                    });
                } else {
                     player.sendMessage(isTamed ? `§8[System] The target is currently assisting someone else.` : `§8[System] Operation failed: The target is not nearby or is offline.`);
                }
                break;


            case ACTION_TOGGLE_FOLLOW: // 3: Request/Cancel Follow
                if (isAlive) {
                    if (isPlayerFollowed) {
                        // Cancel Follow (Keep unchanged, execute immediately)
                        triggerFactionalEvent(ai, "no_follow");
                        ai.removeTag(FOLLOW_AI_TAG);
                        player.removeTag(CAN_FOLLOW_PLAYER_TAG);
                        player.sendMessage(`§a[System] ${aiName} has stopped following.`);
                        system.runTimeout(() => showFriendActionMenu(player, ai, friendData), 5);
                    } else {
                        // [Modification] Call runProbabilisticAction
                        runProbabilisticAction({
                            player: player, ai: ai,
                            actionType: 'follow', // Global lock type
                            requestSentMessage: `§e[${aiName}] Your follow request has been sent...`, // Instant message
                            baseChance: 20, affinity: affinity,
                            cooldownKey: "zps:prob_follow_cd_", 
                            cooldownSeconds: 60,
                            cooldownScope: 'failure', 
                            onSuccess: () => {
                                triggerFactionalEvent(ai, "follow");
                                ai.addTag(FOLLOW_AI_TAG);
                                player.addTag(CAN_FOLLOW_PLAYER_TAG);
                            },
                            successMessage: "agreed to your follow request.",
                            failureMessage: "refused your follow request."
                        });
                    }
                }
                break;


            // --- 其他按钮 (锁定装备, 禁止建造, 删除好友) 保持不变 ---
            case ACTION_TOGGLE_EQUIPMENT_LOCK: // 4
                if (isAlive) {
                    if (isEquipmentLocked) {
                        ai.removeTag(LOCK_EQUIPMENT_TAG);
                        ai.triggerEvent("jiechu");
                        player.sendMessage(`§a[System] ${aiName}'s equipment has been unlocked.`);
                    } else {
                        ai.addTag(LOCK_EQUIPMENT_TAG);
                        ai.triggerEvent("suoding");
                        player.sendMessage(`§c[System] ${aiName}'s equipment has been locked.`);
                    }
                    system.runTimeout(() => showFriendActionMenu(player, ai, friendData), 5);
                }
                break;

            case ACTION_TOGGLE_BUILDING_PROHIBITION: // 5
                if (isAlive) {
                    if (isBuildingProhibited) {
                        ai.removeTag(PROHIBIT_BUILDING_TAG);
                        player.sendMessage(`§a[System] ${aiName} is now allowed to build.`);
                    } else {
                        ai.addTag(PROHIBIT_BUILDING_TAG);
                        player.sendMessage(`§c[System] ${aiName} is now prohibited from building.`);
                    }
                    system.runTimeout(() => showFriendActionMenu(player, ai, friendData), 5);
                }
                break;


            case ACTION_UNFRIEND: // 6
                unfriendAI(player, persistentId, aiName);
                break;
        }
    });
}





/**
 * Level 1: 好友总列表 UI
 */
function showFriendListUI(player) {
    const friends = getPlayerFriends(player);
    const form = new ActionFormData();
    form.title("§b§lFriend List");
    
    if (friends.length === 0) {
        form.body("You don't have any friends yet. Go interact with other players!");
    } else {
        form.body("Please select a friend to interact with:");
        
        friends.forEach(friend => {
            // Check in real-time if the AI is alive or dead
            const isAlive = !!getAiByPersistentId(friend.id); 
            const isDead = getDeadAiIds().has(friend.id);
            
            let status;
            if (isAlive) {
                status = '§aOnline';
            } else if (isDead) {
                status = '§cOffline';
            } else {
                status = '§eNot Loaded';
            }
            form.button(`[${friend.name}] - ${status}`, 'textures/ui/icon_steve');
        });
    }

    form.button("§cClose");


    form.show(player).then(response => {
        // 修正：确保在 selection 为 undefined 时直接返回 (小叉关闭)
        if (response.isCanceled || response.selection === undefined) return;
        
        if (response.selection === friends.length) { // 最后一个按钮是关闭
            return;
        }

        const selectedFriendData = friends[response.selection];
        const targetAi = getAiByPersistentId(selectedFriendData.id); // 查找加载的实体
        
        // 【关键】直接进入 Level 3 操作菜单
        showFriendActionMenu(player, targetAi, selectedFriendData); 
    });
}


// --- Event Handlers and Initialization ---

function handleItemUse(event) {
    const { source, itemStack } = event;

    if (source.typeId === "minecraft:player" && itemStack?.typeId === FRIEND_LIST_ITEM_ID) {
        if (!source.isValid) return;

        showFriendListUI(source);
    }
}

// 2. 监听玩家对 AI 实体使用铜剑 (打开菜单)
function handleEntityInteract(event) {
    const { player, target, itemStack } = event; 

    // 过滤器 1: 目标必须是我们的 AI
    if (target.typeId !== AI_ENTITY_TYPE_ID) return;

    // 过滤器 2: 玩家必须手持指定的物品
    if (!itemStack || itemStack.typeId !== TARGET_ITEM_ID) return;

    const ai = target;
    const playerId = player.id;
    
    // 【关键】获取AI的持久化ID
    const persistentId = ensurePersistentId(ai); 

    // 获取/初始化好感度
    const affinityKey = AFFINITY_BASE_KEY + playerId;
    let affinity = ai.getDynamicProperty(affinityKey);
    if (affinity === undefined || affinity === null) {
        affinity = Math.floor(Math.random() * 51) - 30; 
        ai.setDynamicProperty(affinityKey, affinity); 
    }
    
    // --- 【新增逻辑：追踪互动过的玩家】 ---
    const INTERACTED_PLAYERS_KEY = "zps:interacted_players_list";
    let interactedPlayers = [];
    try {
        const data = ai.getDynamicProperty(INTERACTED_PLAYERS_KEY);
        if (data) {
            interactedPlayers = JSON.parse(data);
        }
    } catch (e) { /* 忽略解析错误 */ }
    
    if (!interactedPlayers.includes(playerId)) {
        interactedPlayers.push(playerId);
        ai.setDynamicProperty(INTERACTED_PLAYERS_KEY, JSON.stringify(interactedPlayers));
    }
    // --- 【新增逻辑 结束】 ---
    
    // --- 核心好友状态检查修正 ---
    
    // 1. 首先检查 AI 实体上的状态（常规/非复活情况）
    let friendStatus = ai.getDynamicProperty(FRIEND_STATUS_BASE_KEY + playerId) || "";
    let isFriend = (friendStatus === "accepted");
    
    // 2. 【修复 Bug 逻辑】如果 AI 实体状态不是“接受”，但 AI 是复活的（即状态缺失），则检查玩家列表
    if (!isFriend) {
        const friendsList = getPlayerFriends(player);
        const friendData = friendsList.find(f => f.id === persistentId);

        if (friendData) {
            // 玩家列表确认是好友！这是复活后状态丢失的情况。
            isFriend = true; 
            
            // 【关键修正】将好友状态写回新的 AI 实体，以确保后续逻辑正确
            ai.setDynamicProperty(FRIEND_STATUS_BASE_KEY + playerId, "accepted");
        }
    }
    
    // --- 最终判定 ---
    
    if (isFriend) {
        // 【已是好友】直接进入 Level 3 操作菜单
        const friendData = getPlayerFriends(player).find(f => f.id === persistentId);
        
        if (friendData) {
            showFriendActionMenu(player, ai, friendData); 
        } else {
            // 极少数情况：AI是accepted，但玩家列表丢失了，需要进入申请界面重新加回
            showAiInfoMenu(player, ai, affinity);
        }
    } else {
        // 【非好友】进入 Level 2A 好友申请菜单
        showAiInfoMenu(player, ai, affinity);
    }
}



// -------------------------------------------------------------------
// 导出初始化函数
// -------------------------------------------------------------------
export function initializeInteractionUI() {
system.runInterval(checkNegativeAffinityUnfriend, 600);
    // 玩家手持申请物品与 AI 交互 (Level 2A / Level 3 入口)
    world.afterEvents.playerInteractWithEntity.subscribe(handleEntityInteract);
    
    // 玩家使用好友列表物品 (Level 1 入口)
    world.afterEvents.itemUse.subscribe(handleItemUse);
        
// 玩家首次进入世界触发器
world.afterEvents.playerSpawn.subscribe(event => {
    const { player, initialSpawn } = event;
    
    // A. 检查是否是首次进入
    const isInitialized = player.getDynamicProperty(PLAYER_INIT_FLAG_KEY);
    
    // 只有当是首次加载世界（initialSpawn为true）且未被初始化过时才给予
    if (initialSpawn && !isInitialized) {
        giveFriendConfigItems(player);
        player.setDynamicProperty(PLAYER_INIT_FLAG_KEY, true); // 设置初始化标记
        player.sendMessage("§a[Server] Welcome to our server! Friend configuration items have been given. Please try interacting with a friendly AI player while holding the 'Friend Request' item!");
    }
    
    // --- 【3. 玩家复活触发器】 ---
    // B. 复活时给予物品
    // 在 playerSpawn 事件中，如果不是首次生成（initialSpawn=false）通常意味着复活或跨维度。
    // 我们在这里仅处理复活逻辑：如果不是首次生成，且玩家是有效的，就给予。
    if (!initialSpawn && player.isValid) {
        giveFriendConfigItems(player);
    }
});

// 1. 聊天命令触发器
world.afterEvents.chatSend.subscribe(event => {
    const { message, sender } = event;
    
    // 检查是否是秘密命令
    if (message.toLowerCase() === "!givemefriendconfig") {
        event.cancel = true; // 阻止命令在聊天中显示
        giveFriendConfigItems(sender);
        sender.sendMessage("§a[Server] Friend system configuration items have been given.");
    }
});
    
    // 【核心】监听实体死亡事件，标记 AI 为已死亡
    world.afterEvents.entityDie.subscribe(event => {
        const { deadEntity } = event;        
        if (deadEntity.typeId === AI_ENTITY_TYPE_ID) {
        deadEntity.removeTag('online')
            const pId = deadEntity.getDynamicProperty(AI_PERSISTENT_ID_KEY);

            if (pId) {
                const deadAiSet = getDeadAiIds();
                deadAiSet.add(pId);
                setDeadAiIds(deadAiSet);
                // --- 【新增逻辑：存储好感度】 ---
                const INTERACTED_PLAYERS_KEY = "zps:interacted_players_list";
                const AFFINITY_CACHE_KEY = `zps:dead_ai_affinity_${pId}`;
                let affinityData = {};
                // 【核心修正：获取击杀者 ID】
                let killerPlayerId = null;
                // 检查 event.damageSource 是否存在，且 damageEntity 是否是玩家
                if (event.damageSource && event.damageSource.damagingEntity && event.damageSource.damagingEntity.typeId === 'minecraft:player') {
                    killerPlayerId = event.damageSource.damagingEntity.id;
                }
                try {
                    const data = deadEntity.getDynamicProperty(INTERACTED_PLAYERS_KEY);
                    if (data) {
                        const interactedPlayers = JSON.parse(data);
                        for (const playerId of interactedPlayers) {
                            let affinity = deadEntity.getDynamicProperty(AFFINITY_BASE_KEY + playerId);
                            if (affinity !== undefined) {
                                if (playerId === killerPlayerId) {
                                    const penalty = Math.floor(Math.random() * 21) + 10; // 随机 10-30 点
                                    affinity -= penalty;
                                    try {
                                    } catch(e){}
                                }
                                // ---                               
                                affinityData[playerId] = affinity;
                            }
                        }
                        // 存储好感度缓存到世界
                        world.setDynamicProperty(AFFINITY_CACHE_KEY, JSON.stringify(affinityData));
                        // 存储玩家列表本身
                        world.setDynamicProperty(INTERACTED_PLAYERS_KEY + "_" + pId, data); 
                    }
                } catch (e) {
                    console.warn(`[AI Death] Failed to save affinity data for AI ${pId}: ${e}`);
                }
                // --- 【新增逻辑 结束】 ---
            }
        }
    });
}
