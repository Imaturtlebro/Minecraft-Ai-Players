import { world, system } from "@minecraft/server";
import { CHAT_AFFINITY_CONFIG, VOCABULARY } from './config/chat_config.js';

// 全局索引对象，在系统初始化时填充
const keywordIndex = {
   
    trieRoot: { children: {}, configId: null },
    
    invertedIndex: new Map(),
    
    configMap: new Map()
};

let nextConfigId = 1;

const AI_ENTITY_TYPE_ID = "zps:newb";
const COOLDOWN_KEY = "affinity_cooldown_until";
const AFFINITY_BASE_KEY = "affinity_player_";
const INTERACTION_RANGE = 96; 
const COUNTRY_KEY = "ai_home_country";

const COOLDOWN_CONFIG = {
    default: { min: 10, max: 30 },
    perConversation: true 
};

const MOVEMENT_LOCK_CONFIG = {
    enabled: true,
    lockEvent: "lock_movement", 
    unlockEvent: "unlock_movement"
};

function buildKeywordIndex(config) {
    keywordIndex.trieRoot = { children: {}, configId: null };
    keywordIndex.invertedIndex.clear();
    keywordIndex.configMap.clear();
    nextConfigId = 1;

    for (const configItem of config) {
        // 1. 给配置添加唯一ID并存入 Map
        const configId = nextConfigId++;
        const itemWithId = { ...configItem, id: configId };
        keywordIndex.configMap.set(configId, itemWithId);

        for (const keyword of configItem.keywords) {
            const normalizedKeyword = keyword.toLowerCase().trim();
            if (normalizedKeyword.length === 0) continue; // 跳过空关键词

            // --- A. 构建 Trie 树 (用于精确和前缀匹配) ---
            let node = keywordIndex.trieRoot;
            for (const char of normalizedKeyword) {
                if (!node.children[char]) {
                    node.children[char] = { children: {}, configId: null };
                }
                node = node.children[char];
            }
            // 标记路径的终点为当前配置的ID
            node.configId = configId;

            // --- B. 构建倒排索引 (用于关键词定位) ---
            let tokens;
            
            // 智能 Tokenization 逻辑：
            if (/\s/.test(normalizedKeyword)) {
                // 如果包含空格，通常是英文/拼音，按空格分割成单词
                tokens = normalizedKeyword.split(/\s+/).filter(t => t.length > 0);
            } else {
                // 如果不含空格，通常是中文短语，按单个字符分割
                // 这样当用户输入“干啥”时，可以命中“你在干什么”
                tokens = normalizedKeyword.split('');
            }
            
            for (const token of tokens) {
                if (!keywordIndex.invertedIndex.has(token)) {
                    keywordIndex.invertedIndex.set(token, new Set());
                }
                // 使用 Set 确保每个配置只被添加一次
                keywordIndex.invertedIndex.get(token).add(itemWithId);
            }
        }
    }
}



function getCooldownKey(conversationId = 'global') {
    return `${COOLDOWN_KEY}_${conversationId}`;
}

function calculateCooldownDuration(cooldownConfig) {
    if (!cooldownConfig) {
        cooldownConfig = COOLDOWN_CONFIG.default;
    }
    const min = cooldownConfig.min || COOLDOWN_CONFIG.default.min;
    const max = cooldownConfig.max || COOLDOWN_CONFIG.default.max;
    return (Math.floor(Math.random() * (max - min + 1)) + min) * 1000;
}

const MIN_FOLLOW_DURATION_SECONDS = 30;
const MAX_FOLLOW_DURATION_SECONDS = 60;
const FOLLOW_LEAVE_MESSAGES = ["alright i gotta go", "c u around bro", "see u later bro", "look i gotta go", "bye bro"];

const COUNTRIES = ["china", "jp", "usa", "uk", "france", "ger", "brazil", "india", "rus", "aus"];

function initializeAiCountry(ai) {
    if (!ai.getDynamicProperty(COUNTRY_KEY)) {
        const randomCountry = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
        ai.setDynamicProperty(COUNTRY_KEY, randomCountry);
    }
}

function replaceVocabularyPlaceholders(message, ai = null) {
    return message.replace(/\{(\w+)\}/g, (match, vocabKey) => {
     
        if (vocabKey === 'countries' && ai && ai.isValid) {
            const aiCountry = ai.getDynamicProperty(COUNTRY_KEY);
            if (aiCountry) {
                return aiCountry;
            }
        }
        const vocabArray = VOCABULARY[vocabKey];
        if (vocabArray && vocabArray.length > 0) {
            return vocabArray[Math.floor(Math.random() * vocabArray.length)];
        }
        return match; 
    });
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


function calculateRandomChange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}


function calculateProbabilityCheck(baseProbability, affinityBonusPerPoint, currentAffinity, threshold) {
 
    const successProbability = baseProbability + 
        Math.max(0, currentAffinity - threshold) * affinityBonusPerPoint;
    
    const finalProbability = Math.min(100, Math.max(0, successProbability));
    
    const randomValue = Math.random() * 100;
    return {
        success: randomValue <= finalProbability,
        probability: finalProbability,
        randomValue: randomValue
    };
}

const WEIGHTS = {
    LEVENSHTEIN: 0.5,   // 编辑距离 (越低越好, 转换为分数)
    NGRAM: 0.3,         // N-Gram 相似度
    JACCARD: 0.2        // Jaccard 相似度
};
const LEVENSHTEIN_THRESHOLD = 3; // 超过这个距离，权重急剧下降

/**
 * 查找精确匹配（Trie 树）
 */
function findExactMatch(message) {
    let node = keywordIndex.trieRoot;
    for (const char of message) {
        if (!node.children[char]) return null;
        node = node.children[char];
    }
    return node.configId ? keywordIndex.configMap.get(node.configId) : null;
}


/**
 * 优化后的核心匹配函数 (权重 + 剪枝)
 */
function findBestMatchConfigOptimized(message) {
    const normalizedMessage = message.toLowerCase().trim();

    // 1. A. 精确匹配 (Trie 树): 优先级最高，最快
    const exactMatch = findExactMatch(normalizedMessage);
    if (exactMatch) {
        return { config: exactMatch, method: "exact (Trie)" };
    }

    // 1. B. 剪枝 (倒排索引): 生成候选配置列表
    const tokenize = (s) => /\s/.test(s) ? s.split(/\s+/) : s.split('');
    const messageTokens = tokenize(normalizedMessage).filter(t => t.length > 0);
    const candidateSet = new Set();
    
    // 聚合所有包含消息中任一单词的配置
    for (const token of messageTokens) {
        if (keywordIndex.invertedIndex.has(token)) {
            keywordIndex.invertedIndex.get(token).forEach(config => candidateSet.add(config));
        }
    }

    // 如果没有候选，直接返回 null
    if (candidateSet.size === 0) return null;

    // 2. 对候选列表进行加权评分
    let bestScore = -1;
    let bestConfig = null;
    let bestKeyword = "";
    let bestIndividualScores = { levenshtein: 0, nGram: 0, jaccard: 0 }; 
    
    // 遍历候选配置
    for (const config of candidateSet) {
        for (const keyword of config.keywords) {
            const normalizedKeyword = keyword.toLowerCase();

            // 相似度计算
            const dist = levenshtein(normalizedMessage, normalizedKeyword);
            const nGramSim = nGramSimilarity(normalizedMessage, normalizedKeyword, 2);
            const jaccardSim = jaccardSimilarity(normalizedMessage, normalizedKeyword);
            
            // 将 Levenshtein 距离转换为分数 (越低越好 -> 越高越好)
            // 距离越近，分数越高。超过阈值则分数迅速归零。
            const levenshteinScore = dist <= LEVENSHTEIN_THRESHOLD 
                ? (1 - (dist / Math.max(normalizedMessage.length, normalizedKeyword.length, 1))) 
                : 0; 
                
            // 综合加权评分
                        // 综合加权评分
            const score = (WEIGHTS.LEVENSHTEIN * levenshteinScore) +
                          (WEIGHTS.NGRAM * nGramSim) +
                          (WEIGHTS.JACCARD * jaccardSim);

            if (score > bestScore) {
                bestScore = score;
                bestConfig = config;
                bestKeyword = keyword;
                // 关键改动：记录产生最高加权分时的原始分数
                bestIndividualScores.levenshtein = levenshteinScore;
                bestIndividualScores.nGram = nGramSim;
                bestIndividualScores.jaccard = jaccardSim;
            }
        }
    }
    
    // 3. 最终决策: 设定一个最低分数阈值，避免匹配到不相关的配置
        // 3. 最终决策: 混合判断逻辑
    
    const MIN_SCORE_THRESHOLD = 0.33; // 加权总分的最低要求 (可调)
    // 【新门槛】任一单项算法的极高自信度门槛 (可调，建议 0.8 以上)
    const CONFIDENT_SCORE_THRESHOLD = 0.8; 
    
    // 如果没有找到任何匹配项（理论上不会，但以防万一）
    if (!bestConfig) return null;

    // 找出最佳匹配的三个算法中的最高分（用于“自信度”判断）
    const maxIndividualScore = Math.max(
        bestIndividualScores.levenshtein,
        bestIndividualScores.nGram,
        bestIndividualScores.jaccard
    );

    // 核心匹配逻辑：
    // 1. 通过加权总分 (要求综合实力过硬)
    // OR
    // 2. 通过自信度 (要求任一算法得分极高，覆盖旧版单项冠军场景)
    if (bestScore >= MIN_SCORE_THRESHOLD || maxIndividualScore >= CONFIDENT_SCORE_THRESHOLD) {
        
        // 决定返回哪种方法说明（方便调试）
        let method = `weighted_score (${bestScore.toFixed(2)} based on: ${bestKeyword})`;
        if (maxIndividualScore >= CONFIDENT_SCORE_THRESHOLD && bestScore < MIN_SCORE_THRESHOLD) {
             method = `individual_score (${maxIndividualScore.toFixed(2)} based on: ${bestKeyword})`;
        }

        return { config: bestConfig, method: method };
    }

    // 如果两种门槛都没有达到，则返回 null
    return null;
} // 函数结束


function executeAiActions(ai, actions, player) {
    const SEARCH_RANGE = 16; 
    
    for (const action of actions) {

        let targetEntity = ai; 
        if (action.target === 'player') {
            targetEntity = player;
        }
        
        switch (action.type) {
            case 'AddTag':
            case 'RemoveTag':
                if (targetEntity && targetEntity.isValid) {
                 
                    targetEntity[action.type === 'AddTag' ? 'addTag' : 'removeTag'](action.value);
                }
                break;
                
            case 'RunCommand':
                const command = action.value.replace(/@s/g, `@e[id="${ai.id}"]`);
                try {
                    ai.dimension.runCommand(command);
                } catch (e) {
                    console.error(`Failed to run command: ${command}. Error: ${e}`);
                }
                break;
                
                case 'Tame':
                if (ai.isValid && player.isValid) {
                    try {
                        const tameable = ai.getComponent('minecraft:tameable');
                        if (tameable && !tameable.isTamed) {
                            const isTamed = tameable.tame(player);
                        } else {
                            
                        }
                    } catch (e) {
                        console.error(`Failed to execute Tame action for AI ${ai.id}. Error: ${e}`);
                    }
                }
                break;
                
                case 'AddTempTag': 
                targetEntity.addTag(action.value);
                
                system.runTimeout(() => {
                    if (targetEntity.isValid) {
                        targetEntity.removeTag(action.value);
                    }
                }, 20);
                break;
                
                case 'TriggerEvent': 

                 if (targetEntity && targetEntity.isValid) {

                    triggerFactionalEvent(targetEntity, action.value);
                 }
                break;
                
                        case 'StartTimedFollow':
                if (!ai.isValid || !player.isValid) return;

                const affinityKey = AFFINITY_BASE_KEY + player.id;
                const affinity = ai.getDynamicProperty(affinityKey) ?? 0;

                if (affinity >= 80) {
                    ai.addTag('follow_player');
                    player.addTag('can_followed');
                    triggerFactionalEvent(ai, "follow");
                    
                } else {
    
                    const baseDurationSeconds = 60;
      
                    const affinityBonusSeconds = Math.max(0, affinity) * 5;
                    const totalFollowDurationSeconds = baseDurationSeconds + affinityBonusSeconds;
                    const totalFollowDurationTicks = Math.floor(totalFollowDurationSeconds * 20);

                    ai.addTag('follow_player');
                    player.addTag('can_followed');
                    triggerFactionalEvent(ai, "follow");

    
                    system.runTimeout(() => {
                        if (player?.isValid) player.removeTag('can_followed');
                        if (ai?.isValid) {
                            ai.removeTag('follow_player');
                            triggerFactionalEvent(ai, "no_follow");
                            
                            const response = FOLLOW_LEAVE_MESSAGES[Math.floor(Math.random() * FOLLOW_LEAVE_MESSAGES.length)];
                            const aiName = ai.nameTag || AI_ENTITY_TYPE_ID;
                            
                            system.runTimeout(() => {
                               if (!ai?.isValid) return;
                               world.sendMessage(`<${aiName}> ${response}`);
                            }, 40); 
                        }
                    }, totalFollowDurationTicks);
                }
                break;
        }
    }
}


function findMatchingResponse(affinity, responseConfigs) {
    return responseConfigs.find(config => 
        affinity >= config.affinityRange[0] && affinity <= config.affinityRange[1]
    );
}

function levenshtein(a, b) {
    const tmp = [];
    for (let i = 0; i <= a.length; i++) {
        tmp[i] = [i];
    }
    for (let j = 0; j <= b.length; j++) {
        tmp[0][j] = j;
    }
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            tmp[i][j] = Math.min(
                tmp[i - 1][j] + 1,
                tmp[i][j - 1] + 1,
                tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
            );
        }
    }
    return tmp[a.length][b.length];
}


function nGrams(str, n = 2) {
    const result = [];
    for (let i = 0; i < str.length - n + 1; i++) {
        result.push(str.slice(i, i + n));
    }
    return result;
}

function nGramSimilarity(str1, str2, n = 2) {
    const ngrams1 = nGrams(str1, n);
    const ngrams2 = nGrams(str2, n);
    
    const intersection = ngrams1.filter(ngram => ngrams2.includes(ngram));
    return intersection.length / Math.max(ngrams1.length, ngrams2.length);
}

function jaccardSimilarity(str1, str2) {
    // 如果字符串不含空格，则按字符分割；否则按空格分割。
    const tokenize = (s) => /\s/.test(s) ? s.split(/\s+/) : s.split('');

    const set1 = new Set(tokenize(str1)); 
    const set2 = new Set(tokenize(str2));

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    // 避免除以零
    return union.size === 0 ? 0 : intersection.size / union.size;
}

function longestCommonSubstring(str1, str2) {
    const dp = Array(str1.length + 1).fill().map(() => Array(str2.length + 1).fill(0));
    let maxLength = 0;
    let endIndex = -1;

    for (let i = 1; i <= str1.length; i++) {
        for (let j = 1; j <= str2.length; j++) {
            if (str1[i - 1] === str2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
                if (dp[i][j] > maxLength) {
                    maxLength = dp[i][j];
                    endIndex = i - 1;
                }
            }
        }
    }

    return str1.slice(endIndex - maxLength + 1, endIndex + 1);
}

function hammingDistance(str1, str2) {
    if (str1.length !== str2.length) {
        throw new Error("Strings must be of the same length");
    }

    let distance = 0;
    for (let i = 0; i < str1.length; i++) {
        if (str1[i] !== str2[i]) {
            distance++;
        }
    }

    return distance;
}

function findBestMatchConfig(message) {
    let matchedConfig = null;

    
    matchedConfig = CHAT_AFFINITY_CONFIG.find(config => 
        config.keywords.some(keyword => 
            message === keyword || 
            message.startsWith(keyword + " ") || 
            message.endsWith(" " + keyword) ||
            message.includes(" " + keyword + " ")
        )
    );
    if (matchedConfig) return { config: matchedConfig, method: "exact" };

    
    let bestLevenshtein = { distance: Infinity, config: null };
    for (const config of CHAT_AFFINITY_CONFIG) {
        for (const keyword of config.keywords) {
            const distance = levenshtein(message, keyword);
            if (distance < bestLevenshtein.distance && distance <= 3) {
                bestLevenshtein = { distance, config };
            }
        }
    }
    if (bestLevenshtein.config) return { config: bestLevenshtein.config, method: "levenshtein" };

    
    let bestNGram = { similarity: 0, config: null };
    for (const config of CHAT_AFFINITY_CONFIG) {
        for (const keyword of config.keywords) {
            const similarity = nGramSimilarity(message, keyword, 2);
            if (similarity > bestNGram.similarity && similarity >= 0.5) {
                bestNGram = { similarity, config };
            }
        }
    }
    if (bestNGram.config) return { config: bestNGram.config, method: "ngram" };

    
    let bestJaccard = { similarity: 0, config: null };
    for (const config of CHAT_AFFINITY_CONFIG) {
        for (const keyword of config.keywords) {
            const similarity = jaccardSimilarity(message, keyword);
            if (similarity > bestJaccard.similarity && similarity >= 0.5) {
                bestJaccard = { similarity, config };
            }
        }
    }
    if (bestJaccard.config) return { config: bestJaccard.config, method: "jaccard" };

    
    let bestLCS = { length: 0, config: null };
    for (const config of CHAT_AFFINITY_CONFIG) {
        for (const keyword of config.keywords) {
            const lcs = longestCommonSubstring(message, keyword);
            if (lcs.length > bestLCS.length && lcs.length >= 3) {
                bestLCS = { length: lcs.length, config };
            }
        }
    }
    if (bestLCS.config) return { config: bestLCS.config, method: "lcs" };

    
    let bestHamming = { distance: Infinity, config: null };
    for (const config of CHAT_AFFINITY_CONFIG) {
        for (const keyword of config.keywords) {
            
            if (message.length === keyword.length) {
                try {
                    const distance = hammingDistance(message, keyword);
                    if (distance < bestHamming.distance && distance <= 2) {
                        bestHamming = { distance, config };
                    }
                } catch (e) {
                    
                }
            }
        }
    }
    if (bestHamming.config) return { config: bestHamming.config, method: "hamming" };

    return null;
}



export function initializeAffinitySystem() {
    buildKeywordIndex(CHAT_AFFINITY_CONFIG);
    world.afterEvents.chatSend.subscribe(event => {
        
        const player = event.sender;
        const message = event.message.toLowerCase();

        const aiEntities = player.dimension.getEntities({
            type: AI_ENTITY_TYPE_ID,
            location: player.location,
            maxDistance: INTERACTION_RANGE
        });

        if (aiEntities.length === 0) return;
        
        const matchResult = findBestMatchConfigOptimized(message);
        if (!matchResult) return;

        const { config: matchedConfig, method: matchMethod } = matchResult;

        for (const ai of aiEntities) {
            
            if (!ai.isValid) continue;

            if (ai.target && ai.target.isValid) continue; 
             
            initializeAiCountry(ai);

            const affinityKey = AFFINITY_BASE_KEY + player.id;
            let affinity = ai.getDynamicProperty(affinityKey);
            if (affinity === undefined) {
                affinity = Math.floor(Math.random() * 51) - 30;
                ai.setDynamicProperty(affinityKey, affinity);
            }

            const conversationCooldownKey = getCooldownKey(matchedConfig.keywords[0]);
            const cooldownUntil = ai.getDynamicProperty(conversationCooldownKey);
            if (cooldownUntil && Date.now() < cooldownUntil) return;

            let responseConfig = matchedConfig.responses.find(resp => 
                affinity >= resp.affinityRange[0] && affinity <= resp.affinityRange[1]
            );

            if (!responseConfig) {
                responseConfig = matchedConfig.responses[0];
            }

            let changeRange = responseConfig.change;
            let responseList = responseConfig.messages;
            let shouldExecuteActions = true;

            if (responseConfig.probabilityCheck) {
                const probCheck = calculateProbabilityCheck(
                    responseConfig.probabilityCheck.baseProbability,
                    responseConfig.probabilityCheck.affinityBonusPerPoint,
                    affinity,
                    responseConfig.affinityRange[0]
                );
                
                if (probCheck.success) {
                } else {
        responseList = responseConfig.probabilityCheck.failResponse;
                    changeRange = responseConfig.probabilityCheck.failChange;
                    shouldExecuteActions = false;
                }
            }

            if (shouldExecuteActions && responseConfig.actions) {
                executeAiActions(ai, responseConfig.actions, player);
            }

            const changeValue = calculateRandomChange(changeRange.min, changeRange.max);

            affinity = Math.min(100, Math.max(-100, affinity + changeValue));
            ai.setDynamicProperty(affinityKey, affinity);

            const cooldownDurationMs = calculateCooldownDuration(matchedConfig.cooldown);
            ai.setDynamicProperty(conversationCooldownKey, Date.now() + cooldownDurationMs);

            const responseDelayTicks = Math.floor(Math.random() * 60) + 60;

            if (MOVEMENT_LOCK_CONFIG.enabled) {
ai.triggerEvent(MOVEMENT_LOCK_CONFIG.lockEvent);
            }

            system.runTimeout(() => {
                if (!ai.isValid) {
                    console.warn("AI实体已无效，跳过回复");
                    return;
                }

                const aiName = ai.nameTag || AI_ENTITY_TYPE_ID;
                const rawResponse = responseList[Math.floor(Math.random() * responseList.length)];
                
                const finalResponse = replaceVocabularyPlaceholders(rawResponse, ai);

                world.sendMessage(`<${aiName}> ${finalResponse}`);

                if (MOVEMENT_LOCK_CONFIG.enabled) {
                    ai.triggerEvent(MOVEMENT_LOCK_CONFIG.unlockEvent);
                }

            }, responseDelayTicks);

            break;
        }
    });
}