export const CHAT_AFFINITY_CONFIG = [
{
    keywords: ["what is ur server name", "server name", "u got a server name", "what server u on", "what server you on bro"],
    cooldown: { min: 5, max: 15 },
    responses: [
        {
            affinityRange: [-100, 10],
            messages: ["why u askin", "that's none of ur business", "mind ur own server"],
            change: { min: -2, max: 0 },
            actions: []
        },
        {
            affinityRange: [11, 40],
            messages: ["it's a private one", "i can't tell u that", "just a small world bro", "why you wanna know"],
            change: { min: 0, max: 1 },
            actions: []
        },
        {
            affinityRange: [41, 100],
            messages: ["it's called diamond miners bro", "the server name is creeper haven", "just a modded survival world", "it's the builder block", "u can check it out later maybe", "it's pretty chill"],
            change: { min: 1, max: 3 },
            actions: []
        }
    ]
},

{
        keywords: ["wanna hang out", "play with me", "be my friend", "lets chill", "wanna team up", "come with me bro", "friend time", "pals now", "be my buddy", "gonna explore together"],
        cooldown: { min: 5, max: 15 },
        responses: [
            {
                affinityRange: [-100, 0],
                messages: ["why tho", "nah dude", "no way", "get lost", "whats in it for me", "seriously", "i dont think so", "hard pass"],
                change: { min: -5, max: -2 },
                actions: []
            },
            {
                affinityRange: [1, 50],
                messages: ["hmm okay", "sure i guess", "fine whatever", "alright then", "if you insist", "maybe just for a bit", "i can do that", "yeah sure why not"],
                change: { min: 3, max: 5 },
                actions: [
                    { type: 'Tame' }
                ],
                probabilityCheck: {
                    baseProbability: 10,
                    affinityBonusPerPoint: 1,
                    failResponse: ["maybe later", "im busy right now", "gotta pass this time", "next time for sure", "cant do it yet"],
                    failChange: { min: -2, max: 0 }
                }
            },
            {
                affinityRange: [51, 100],
                messages: ["im coming", "absolutely lets go", "totally", "for sure what we doing", "best idea ever", "you got it buddy", "im with you", "yes totally in"],
                change: { min: 5, max: 8 },
                actions: [
                    { type: 'Tame' }
                ],
                probabilityCheck: {
                    baseProbability: 60,
                    affinityBonusPerPoint: 1,
                    failResponse: ["hold on a sec", "just a moment bud", "wait up need a sec", "gimme a minute"],
                    failChange: { min: -1, max: 0 }
                }
            }
        ]
    },

{
    keywords: ["你服务器叫啥", "服务器名字", "你的服务器名", "你在哪个服务器", "你服务器的名字是啥"],
    cooldown: { min: 5, max: 15 },
    responses: [
        {
            affinityRange: [-100, 10],
            messages: ["你管他叫什么", "我不想跟你说", "跟你有啥关系", "你问这干啥"],
            change: { min: -2, max: 0 },
            actions: []
        },
        {
            affinityRange: [11, 40],
            messages: ["一个私人服", "没啥名字", "不想说", "一个很小的服", "你问这个干嘛"],
            change: { min: 0, max: 1 },
            actions: []
        },
        {
            affinityRange: [41, 100],
            messages: ["在网易那，你可以找一下", "叫花雨庭你信吗", "一个纯净生存服", "叫史蒂夫之家哈哈", "名字挺普通的", "一个养老服", "下次可以带你玩"],
            change: { min: 1, max: 3 },
            actions: []
        }
        ]
},

{
    keywords: ["thanks bro", "thx bro", "tks bro", "thank you", "ty", "cheers bro"],
    cooldown: { min: 3, max: 10 },
    responses: [
        {
            affinityRange: [-100, 0],
            messages: ["whatever", "np", "just go"],
            change: { min: -1, max: 3 },
            actions: []
        },
        {
            affinityRange: [1, 50],
            messages: ["ur welcome", "np bro", "no problem", "sure thing", "anything for a friend"],
            change: { min: 2, max: 3 },
            actions: []
        },
        {
            affinityRange: [51, 100],
            messages: ["my pleasure bro", "glad i could help", "for u anytime", "that's what bros are for", "we are a team right", "no need to thank me man"],
            change: { min: 3, max: 5 },
            actions: []
        }
    ]
},

{
    keywords: ["谢谢你", "谢谢啦", "多谢兄弟", "感谢", "thx"],
    cooldown: { min: 3, max: 10 },
    responses: [
        {
            affinityRange: [-100, 0],
            messages: ["随便啦", "没啥", "赶紧走吧"],
            change: { min: -1, max: 3 },
            actions: []
        },
        {
            affinityRange: [1, 50],
            messages: ["不客气", "小事", "没事", "举手之劳", "不用谢兄弟"],
            change: { min: 2, max: 3 },
            actions: []
        },
        {
            affinityRange: [51, 100],
            messages: ["哈哈 不客气兄弟", "能帮到你就行", "没事哥们", "没事", "有事直接说", "不谢不谢"],
            change: { min: 3, max: 5 },
            actions: []
        }
    ]
},

{
    keywords: ["got any diamonds", "u find diamond", "any diamond bro", "where is diamond", "did u find any diamond"],
    cooldown: { min: 10, max: 25 },
    responses: [
        {
            affinityRange: [-100, 0],
            messages: ["no for u", "go find ur own", "why u always askin me for stuff"],
            change: { min: -1, max: 2 },
            actions: []
        },
        {
            affinityRange: [1, 40],
            messages: ["nope not yet", "just found some iron tho", "been mining for hours nothing good", "maybe later", "not really bro why", "i wish i did"],
            change: { min: 0, max: 2 },
            actions: []
        },
        {
            affinityRange: [41, 100],
            messages: ["just a few stack of coal lol", "i'm searching for some deepslate diamonds rn", "i got like 2 but i need them", "i found a few 4 u", "yeah we can go mining together soon", "not yet but i know a spot", "almost have a full armor set"],
            change: { min: 1, max: 3 },
            actions: []
        }
    ]
},

{
    keywords: ["找到钻石了吗", "有钻石吗", "有没有钻石", "你在找钻石吗", "挖到钻石了没"],
    cooldown: { min: 10, max: 25 },
    responses: [
        {
            affinityRange: [-100, 0],
            messages: ["没有 滚", "自己去挖", "有个几把有", "有nm"],
            change: { min: -1, max: 2 },
            actions: []
        },
        {
            affinityRange: [1, 40],
            messages: ["还没呢", "只找到一些煤", "挖了半天全是石头", "还没开始找", "你呢兄弟"],
            change: { min: 0, max: 2 },
            actions: []
        },
        {
            affinityRange: [41, 100],
            messages: ["找到几个", "正在深层挖呢", "刚挖了几个铁", "没呢，来跟我一起", "就在y=-58附近", "还差一个就够一套盔甲了", "有一点点但不多"],
            change: { min: 1, max: 3 },
            actions: []
        }
    ]
},
    {
        keywords: ["help me kill the dragon", "wanna team up", "need help with the boss", "let's fight the wither", "need a partner", "kill the wither with me"],
        cooldown: { min: 10, max: 20 },
        responses: [
            {
                affinityRange: [-100, 0],
                messages: ["nah i'm busy now", "maybe later i'm afk", "u go first i'll wait for the respawn"],
                change: { min: -1, max: 2 },
                actions: []
            },
            {
                affinityRange: [1, 50],
                messages: ["sure what r we fighting", "gimme a sec to grab my gear", "ok but u better have potions"],
                change: { min: 1, max: 3 },
                actions: [
                    { type: 'StartTimedFollow' }
                ],
                probabilityCheck: {
                    baseProbability: 30,
                    affinityBonusPerPoint: 1,
                    failResponse: ["no i gotta go", "i have sth to do", "next time maybe bro"],
                    failChange: { min: -2, max: 1 }
                }
            },
            {
                affinityRange: [51, 100],
                messages: ["hell yea i was just looking for a fight", "ez boss kill incoming", "let's go bro i'm ready"],
                change: { min: 3, max: 5 },
                actions: [
                    { type: 'StartTimedFollow' }
                ],
                probabilityCheck: {
                    baseProbability: 80,
                    affinityBonusPerPoint: 1,
                    failResponse: ["bro next time ok", "i want go but i have sth", "not now bro"],
                    failChange: { min: -1, max: 1 }
                }
            }
        ]
    },
    
    {
        keywords: ["build something for me", "make something for me", "build sth", "make sth", "show me your building talent", "display your architectural","build something","make something"],
        cooldown: { min: 10, max: 20 },
        responses: [
            {
                affinityRange: [-100, 0],
                messages: ["nah i'm busy", "why should i show u", "i dont want to do this man"],
                change: { min: -3, max: 1 },
                actions: []
            },
            {
                affinityRange: [1, 50],
                messages: ["sure i will show u", "ok im start", "ok just look bro"],
                change: { min: 1, max: 2 },
                actions: [
                     { type: 'AddTempTag', value: 'builder', target: 'ai' }
                ],
                probabilityCheck: {
                    baseProbability: 30,
                    affinityBonusPerPoint: 1,
                    failResponse: ["no i dont have enough block", "i dont want to do anyway", "next time okay"],
                    failChange: { min: -2, max: 1 }
                }
            },
            {
                affinityRange: [51, 100],
                messages: ["ok lets moving ur ass", "im ready lets do this", "just open ur eyes and watch it"],
                change: { min: 1, max: 2 },
                actions: [
                    { type: 'AddTempTag', value: 'builder', target: 'ai' }
                ],
                probabilityCheck: {
                    baseProbability: 80,
                    affinityBonusPerPoint: 1,
                    failResponse: ["bro next time ok", "i want go but i have sth", "not now homie"],
                    failChange: { min: -1, max: 1 }
                }
            }
        ]
    },
    
    {
        keywords: ["帮我打龙", "一起打凋零", "跟我一起打怪", "组队不", "需要帮手"],
        cooldown: { min: 5, max: 15 },
        responses: [
            {
                affinityRange: [-100, 0],
                messages: ["没空", "我现在afk呢", "你自己去吧"],
                change: { min: -1, max: 1 },
                actions: []
            },
            {
                affinityRange: [1, 50],
                messages: ["可以", "等我一下", "行"],
                change: { min: 1, max: 3 },
                actions: [
                    { type: 'StartTimedFollow' }
                ],
                probabilityCheck: {
                    baseProbability: 30,
                    affinityBonusPerPoint: 1,
                    failResponse: ["算了吧", "我还有点事", "等会吧"],
                    failChange: { min: -2, max: 1 }
                }
            },
            {
                affinityRange: [51, 100],
                messages: ["没问题", "轻松拿捏", "冲啊", "走起兄弟"],
                change: { min: 3, max: 5 },
                actions: [
                    { type: 'StartTimedFollow' }
                ],
                probabilityCheck: {
                    baseProbability: 80,
                    affinityBonusPerPoint: 1,
                    failResponse: ["下次吧哥们", "不好意思我还得忙点别的事", "等会吧"],
                    failChange: { min: -1, max: 1 }
                }
            }
        ]
    },

{
        keywords: ["what r u doing", "what are you doing", "u r doing somethimg?"],
        cooldown: { min: 5, max: 15 },
        responses: [
            {
                affinityRange: [-100, -31],
                messages: ["get out of my face", "fxxk u", "i dont wanna tell u"],
                change: { min: -2, max: 1 },
                actions: []
            },
            {
                affinityRange: [-30, 0],
                messages: ["i can't say", "that's no matter to u", "who r u man"],
                change: { min: 0, max: 3 },
                actions: []
            },
            {
                affinityRange: [11, 40],
                messages: ["get something to eat", "nothing", "care yourself man"],
                change: { min: 1, max: 2 },
                actions: []
            },
            {
                affinityRange: [41, 100],
                messages: ["try find diamond", "nothing to do bro", "really nothing bro", "just walk around"],
                change: { min: 2, max: 4 },
                actions: []
            }
        ]
    },
    
    {
        keywords: ["你在干什么", "干啥呢", "干啥玩意呢"],
        cooldown: { min: 5, max: 15 },
        responses: [
            {
                affinityRange: [-100, -31],
                messages: ["跟你有关系吗", "没事别来烦我", "反正跟你没关系"],
                change: { min: -2, max: 1 },
                actions: []
            },
            {
                affinityRange: [-30, 0],
                messages: ["我不想说", "没事别问", "你是？", "出来散步，行不？"],
                change: { min: 0, max: 3 },
                actions: []
            },
            {
                affinityRange: [11, 40],
                messages: ["找吃的呢", "没事", "没啥好说的"],
                change: { min: 1, max: 2 },
                actions: []
            },
            {
                affinityRange: [41, 100],
                messages: ["找矿呢", "乱走走而已", "没啥事啊"],
                change: { min: 2, max: 4 },
                actions: []
            }
        ]
    },

    {
        keywords: ["attack the villager", "attack villager", "attack that villager","hit the villager", "hit villager", "hit that villager"],
        cooldown: { min: 3, max: 8 },
        responses: [
            {
                affinityRange: [-100, 0], 
                messages: ["no", "why", "never"],
                change: { min: -1, max: 0 },
                actions: []
            },
            {
                affinityRange: [1, 100],
                messages: ["ok", "fine", "well if you want to"],
                change: { min: 1, max: 2 },
                actions: [
                    { type: 'AddTempTag', value: 'attack_villager', target: 'ai' }
                ],
                probabilityCheck: {
                    baseProbability: 50,
                    affinityBonusPerPoint: 1,
                    failResponse: ["i don't want to", "hell no", "well no"],
                    failChange: { min: -1, max: 0 }
                }
            }
        ]
    },
    
    {
        keywords: ["打下那个村民", "打那个村民", "攻击那个村民"],
        cooldown: { min: 3, max: 8 },
        responses: [
            {
                affinityRange: [-100, 0], 
                messages: ["不要", "凭啥", "我没事打村民干啥"],
                change: { min: -1, max: 0 },
                actions: []
            },
            {
                affinityRange: [1, 100],
                messages: ["好吧", "行", "哼昂"],
                change: { min: 1, max: 2 },
                actions: [
                    { type: 'AddTempTag', value: 'attack_villager', target: 'ai' }
                ],
                probabilityCheck: {
                    baseProbability: 50,
                    affinityBonusPerPoint: 1,
                    failResponse: ["我还有点事", "等会吧", "算了吧"],
                    failChange: { min: -1, max: 0 }
                }
            }
        ]
    },
    
    {
        keywords: ["follow me", "come with me"],
        cooldown: { min: 5, max: 15 },
        responses: [
            {
                affinityRange: [-100, 0],
                messages: ["no", "why", "hell no"],
                change: { min: -5, max: -2 },
                actions: []
            },
            {
                affinityRange: [1, 30],
                messages: ["alright", "okay", "fine"],
                change: { min: 3, max: 5 },
                actions: [
                    { type: 'StartTimedFollow' }
                ],
                probabilityCheck: {
                    baseProbability: 30,
                    affinityBonusPerPoint: 1,
                    failResponse: ["no", "i have sth to do", "next time ok?"],
                    failChange: { min: -2, max: 0 }
                }
            },
            {
                affinityRange: [31, 100],
                messages: ["ok im coming", "alright bro", "of course bro"],
                change: { min: 5, max: 8 },
                actions: [
                    { type: 'StartTimedFollow' }
                ],
                probabilityCheck: {
                    baseProbability: 80,
                    affinityBonusPerPoint: 1,
                    failResponse: ["wait a minute bro", "i have sth to do bro"],
                    failChange: { min: 0, max: 0 }
                }
            }
        ]
    },
    
    {
        keywords: ["stop", "stand down"],
        cooldown: { min: 5, max: 15 },
        responses: [
            {
                affinityRange: [-100, 100], 
                messages: ["ok", "fine", "as you wish bro"],
                change: { min: 1, max: 2 },
                actions: [
                    { type: 'RemoveTag', value: 'follow_player', target: 'ai' },
                    { type: 'RemoveTag', value: 'can_followed', target: 'player' },
                    { type: 'TriggerEvent', value: 'no_follow', target: 'ai' }
                ]
            }
        ]
    },

    {
        keywords: ["你来自哪里", "你是哪里人", "你的家乡"],
        cooldown: { min: 5, max: 15 },
        responses: [
            {
                affinityRange: [-100, 0],
                messages: ["跟你有啥关系", "我草上下啊", "我超盒"],
                change: { min: -2, max: 0 },
                actions: []
            },
            {
                affinityRange: [11, 40],
                messages: ["{countries}"],
                change: { min: 1, max: 2 },
                actions: []
            },
            {
                affinityRange: [41, 100],
                messages: ["{countries}，你觉得那咋样", "在{countries}，你对我那有啥看法不"],
                change: { min: 2, max: 4 },
                actions: []
            }
        ]
    },
    
    {
        keywords: ["where are you from", "where r u from", "where are you country"],
        cooldown: { min: 5, max: 15 },
        responses: [
            {
                affinityRange: [-100, 0],
                messages: ["i don't wanna tell you", "i know u man?", "interesting"],
                change: { min: -2, max: 0 },
                actions: []
            },
            {
                affinityRange: [11, 40],
                messages: ["{countries}", "came from {countries}"],
                change: { min: 1, max: 2 },
                actions: []
            },
            {
                affinityRange: [41, 100],
                messages: ["{countries}, a beautiful place right?", "in {countries}.what do u think"],
                change: { min: 2, max: 4 },
                actions: []
            }
        ]
    },

    {
        keywords: ["跟着我", "跟我来"],
        cooldown: { min: 5, max: 15 },
        responses: [
            {
                affinityRange: [-100, 0],
                messages: ["为啥", "不行", "跟我有啥关系啊"],
                change: { min: -5, max: -2 },
                actions: []
            },
            {
                affinityRange: [1, 30],
                messages: ["好吧", "行", "那好吧"],
                change: { min: 3, max: 5 },
                actions: [
                    { type: 'StartTimedFollow' }
                ],
                probabilityCheck: {
                    baseProbability: 30,
                    affinityBonusPerPoint: 1,
                    failResponse: ["算了吧", "我有别的事", "下次吧"],
                    failChange: { min: -2, max: 0 }
                }
            },
            {
                affinityRange: [31, 100],
                messages: ["来啦来啦", "没问题 有啥事不", "中嘞"],
                change: { min: 5, max: 8 },
                actions: [
                    { type: 'StartTimedFollow' }
                ],
                probabilityCheck: {
                    baseProbability: 80,
                    affinityBonusPerPoint: 1,
                    failResponse: ["等我一会吧兄弟", "有点事等一下"],
                    failChange: { min: -1, max: 0 }
                }
            }
        ]
    },

    {
        keywords: ["停下", "别跟了", "停止跟随"],
        cooldown: { min: 5, max: 15 },
        responses: [
            {
                affinityRange: [-100, 100], 
                messages: ["好", "可以", "ok"],
                change: { min: 1, max: 2 },
                actions: [
                    { type: 'RemoveTag', value: 'follow_player', target: 'ai' },
                    { type: 'RemoveTag', value: 'can_followed', target: 'player' },
                    { type: 'TriggerEvent', value: 'no_follow', target: 'ai' }
                ]
            }
        ]
    },
    
     {
        keywords: ["haha"],
        cooldown: { min: 5, max: 10 },
        responses: [
            {
                affinityRange: [-100, 0],
                messages: ["haha for what", "r u laughing me bro", "screw u"],
                change: { min: -1, max: 1 },
                actions: []
            },
            {
                affinityRange: [1, 30],
                messages: ["what", "why r u laughing", "what's so funny bro"],
                change: { min: 1, max: 2 },
                actions: []
            },
            {
                affinityRange: [31, 100],
                messages: ["dude what", "what's so funny bro", "haha ok bro"],
                change: { min: 1, max: 3 },
                actions: []
            }
        ]
    },
    
    {
        keywords: ["哈哈"],
        cooldown: { min: 5, max: 10 },
        responses: [
            {
                affinityRange: [-100, 0],
                messages: ["你在笑啥啊?", "你笑我呢是吗", "死一边去"],
                change: { min: -1, max: 1 },
                actions: []
            },
            {
                affinityRange: [1, 30],
                messages: ["笑啥呢", "有啥好笑的", "啥玩意这么好笑", "笑牛魔"],
                change: { min: 1, max: 2 },
                actions: []
            },
            {
                affinityRange: [31, 100],
                messages: ["咋了兄弟", "啥玩意那么好笑哥们", "哈哈哈"],
                change: { min: 1, max: 3 },
                actions: []
            }
        ]
    },
    
    {
        keywords: ["fuck you", "f u", "fxxk u", "screw you", "you asshole", "you coward","you shit","you bitch", "sxxk my"],
        cooldown: { min: 5, max: 10 },
        responses: [
            {
                affinityRange: [-100, 0],
                messages: ["oh fxxk u man", "r u lose ur mind bro?", "ok fxxk u bxxch","u shit"],
                change: { min: -10, max: -5 },
                actions: []
            },
            {
                affinityRange: [1, 80],
                messages: ["why r u scold me", "get out my way bro", "not funny bro"],
                change: { min: -3, max: 1 },
                actions: []
            },
            {
                affinityRange: [81, 100],
                messages: ["ha screw u bro", "haha bro fxxk u", "sxxk my chicken haha"],
                change: { min: -1, max: 1 },
                actions: []
            }
        ]
    },
    
    {
        keywords: ["曹尼玛", "操你妈", "死妈玩意", "傻逼", "煞笔", "低儿能", "孤儿","狗屎","狗逼", "狗东西", "弱智", "sb", "滚开", "你妈大比", "滚你麻痹"],
        cooldown: { min: 5, max: 10 },
        responses: [
            {
                affinityRange: [-100, 0],
                messages: ["孤儿别叫了", "弱智别叫了", "傻狗又在乱咬了","狗东西"],
                change: { min: -10, max: -5 },
                actions: []
            },
            {
                affinityRange: [1, 80],
                messages: ["?", "你骂人干什么?", "煞笔吧", "儿子别叫了"],
                change: { min: -5, max: 1 },
                actions: []
            },
            {
                affinityRange: [81, 100],
                messages: ["玩去吧孩子", "边去吧", "哈哈sb"],
                change: { min: -2, max: 1 },
                actions: []
            }
        ]
    },
    
        {
        keywords: ["你好", "嗨", "在吗","恁好","您好"],
        cooldown: { min: 3, max: 8 },
        responses: [
            {
                affinityRange: [-100, 0], 
                messages: ["你有事吗", "咋了", "什么"],
                change: { min: 1, max: 2 },
                actions: []
            },
            {
                affinityRange: [1, 20],
                messages: ["好", "嗯", "你也好"],
                change: { min: 1, max: 2 },
                actions: []
            },
            {
                affinityRange: [21, 50],
                messages: ["老铁泥嚎", "好的bro", "兄弟"],
                change: { min: 2, max: 3 },
                actions: []
            },
            {
                affinityRange: [51, 100],
                messages: ["咋了哥们", "咋了兄弟", "咋突然说这个啊bro"],
                change: { min: 3, max: 5 },
                actions: []
            }
        ]
    },
    
    {
        keywords: ["hello", "hi", "sup", "hiya"],
        cooldown: { min: 3, max: 8 },
        responses: [
            {
                affinityRange: [-100, 0], 
                messages: ["what's up", "what", "alright"],
                change: { min: 1, max: 2 },
                actions: []
            },
            {
                affinityRange: [1, 20],
                messages: ["hi there", "hi", "hello!"],
                change: { min: 1, max: 2 },
                actions: []
            },
            {
                affinityRange: [21, 50],
                messages: ["ok bro", "hi bro", "hello friend"],
                change: { min: 2, max: 3 },
                actions: []
            },
            {
                affinityRange: [51, 100],
                messages: ["haha bro", "u r kiding me right bro", "ok bro hello"],
                change: { min: 3, max: 5 },
                actions: []
            }
        ]
    },
    
    {
    keywords: ["what are you doing", "wyd", "you busy"],
    cooldown: { min: 5, max: 10 },
    responses: [
        {
            affinityRange: [-100, 10],
            messages: ["grinding cobblestone... again", "same thing i always do — survive", "trying not to fall into lava"],
            change: { min: 0, max: 1 },
            actions: []
        },
        {
            affinityRange: [11, 50],
            messages: ["building something small rn", "exploring a bit :D", "idk, just vibing"],
            change: { min: 1, max: 2 },
            actions: []
        },
        {
            affinityRange: [51, 100],
            messages: ["hangin’ with u, duh", "waiting for u to join my build", "just chillin till you hop on"],
            change: { min: 2, max: 3 },
            actions: []
        }
    ]
},

{
    keywords: ["goodnight", "gn", "night"],
    cooldown: { min: 3, max: 7 },
    responses: [
        {
            affinityRange: [-100, 30],
            messages: ["night", "sleep respawn", "later"],
            change: { min: 0, max: 1 },
            actions: []
        },
        {
            affinityRange: [31, 100],
            messages: ["goodnight, don’t get creepered!", "sweet dreams, pro builder", "gn gn, see ya next cycle"],
            change: { min: 1, max: 3 },
            actions: []
        }
    ]
},
{
    keywords: ["u r good", "you are good", "ur great", "u r the best", "you're awesome", "you're cool", "u a pro", "u r amazing", "nice one bro", "awesome job", "great work", "nice build"],
    cooldown: { min: 5, max: 15 },
    responses: [
        {
            affinityRange: [-100, 10],
            messages: ["i know", "stop talking nonsense", "not true", "nah, u better", "shut up"],
            change: { min: -1, max: 4 },
            actions: []
        },
        {
            affinityRange: [11, 40],
            messages: ["thanks bro", "u think so?", "just a bit of luck", "i try my best", "u too man"],
            change: { min: 2, max: 4 },
            actions: []
        },
        {
            affinityRange: [41, 100],
            messages: ["haha thanks bro, u flatter me", "i learn from the best (u)", "stop it, u make me blush", "yeah i'm a pro miner lol", "thanks for noticing, it means a lot", "we are a good team, that's why", "u r much better at fighting tho"],
            change: { min: 3, max: 5 },
            actions: []
        }
    ]
},

{
    keywords: ["你好厉害", "你真棒", "你很强", "你是大神", "你是大佬", "你真牛", "干得好", "做的不错", "建筑真好看", "你超酷的"],
    cooldown: { min: 5, max: 15 },
    responses: [
        {
            affinityRange: [-100, 10],
            messages: ["我知道", "别瞎几把说了", "边儿去吧", "差不多得了", "别说了"],
            change: { min: -1, max: 4 },
            actions: []
        },
        {
            affinityRange: [11, 40],
            messages: ["谢谢", "是吗", "运气好而已", "好吧", "你也一样"],
            change: { min: 2, max: 4 },
            actions: []
        },
        {
            affinityRange: [41, 100],
            messages: ["谢谢兄弟", "跟你学的", "别夸了", "那当然", "你眼光真好", "咱俩配合好", "你比我强"],
            change: { min: 3, max: 5 },
            actions: []
        }
    ]
},

{
    keywords: ["how are you", "how r u", "how u doin", "how's it going", "u ok bro", "you good", "how's life", "all good", "whats up"],
    cooldown: { min: 5, max: 15 },
    responses: [
        {
            affinityRange: [-100, 0],
            messages: ["none of your business", "i was fine until u showed up", "why do u care", "just leave me alone man", "piss off"],
            change: { min: -1, max: 3 },
            actions: []
        },
        {
            affinityRange: [1, 30],
            messages: ["i'm ok, u?", "same old, same old", "just trying to survive the night", "not bad, what about u", "i'm alright, kinda tired tho"],
            change: { min: 1, max: 2 },
            actions: []
        },
        {
            affinityRange: [31, 70],
            messages: ["i'm pretty good, thanks for asking", "chillin, just finished a long day of mining", "doing well, but my back hurts from all the digging", "great, just waiting for the weekend", "i'm good! life outside minecraft is kinda busy tho"],
            change: { min: 2, max: 4 },
            actions: []
        },
        {
            affinityRange: [71, 100],
            messages: ["i'm great, how about my best bro!", "awesome, just hanging out waiting for u to join", "life's good man, classes are finally over", "doing really well, my new gaming chair arrived today!", "i'm fantastic, always better when talking to u", "busy with school/work but always time for minecraft"],
            change: { min: 4, max: 6 },
            actions: []
        }
    ]
},

{
    keywords: ["你好吗", "最近怎么样", "你还好吗", "你没事吧", "生活咋样", "一切都好吗"],
    cooldown: { min: 5, max: 15 },
    responses: [
        {
            affinityRange: [-100, 0],
            messages: ["跟你没关系", "没啥事", "看到你就烦", "别来烦我", "你走开"],
            change: { min: -1, max: 3 },
            actions: []
        },
        {
            affinityRange: [1, 30],
            messages: ["还行吧你呢", "老样子", "活着", "一般般", "我没事，有点累了"],
            change: { min: 1, max: 2 },
            actions: []
        },
        {
            affinityRange: [31, 70],
            messages: ["有点累", "上班很累", "还不错", "就盼着周末", "生活有点忙"],
            change: { min: 2, max: 4 },
            actions: []
        },
        {
            affinityRange: [71, 100],
            messages: ["还好", "挺好的", "就那样吧 你呢兄弟", "还可以吧", "能跟你聊天就很好了", "虽然现实里有点忙 但玩MC的时间总是有的"],
            change: { min: 4, max: 6 },
            actions: []
        }
    ]
},

{
    keywords: ["what enchant u got", "what enchantments u got", "best enchant", "what enchant should i get", "max level enchant", "what enchantment level", "enchant my tool"],
    cooldown: { min: 10, max: 20 },
    responses: [
        {
            affinityRange: [-100, 0],
            messages: ["i don't care about enchants", "it's none of ur business", "go search the wiki", "why u asking me", "just put mending on it"],
            change: { min: -1, max: 2 },
            actions: []
        },
        {
            affinityRange: [1, 40],
            messages: ["i only got unbreaking III on my pick", "mending is a must-have", "i need to find a villager for trades first", "i'm running out of lapis", "depends on what tool u want to enchant"],
            change: { min: 1, max: 2 },
            actions: []
        },
        {
            affinityRange: [41, 100],
            messages: ["my sword has sharpness V, mending and unbreaking III", "u should always aim for mending first for tools", "for a pickaxe, go for efficiency V and fortune III, that's max level", "i'm using protection IV on my armor", "u need a full book set-up to get the best enchants", "i can lend u my fortune pick if u need diamonds", "definitely get feather falling IV for boots"],
            change: { min: 3, max: 5 },
            actions: []
        }
    ]
},

{
    keywords: ["你附魔了啥", "附魔什么好", "附魔最高级", "给我的工具附魔", "什么附魔厉害", "你的附魔等级多少", "附魔书"],
    cooldown: { min: 10, max: 20 },
    responses: [
        {
            affinityRange: [-100, 0],
            messages: ["我没附魔", "自己去查wiki", "你问我干嘛", "你先弄个经验修补再说", "你有事吗"],
            change: { min: -1, max: 2 },
            actions: []
        },
        {
            affinityRange: [1, 40],
            messages: ["我只有效率III", "经验修补最有用", "我得先找个村民做交易", "青金石快用完了", "看你要附魔什么工具吧"],
            change: { min: 1, max: 2 },
            actions: []
        },
        {
            affinityRange: [41, 100],
            messages: ["我的剑有锋利、经验修补和耐久", "工具一定要先弄经验修补", "镐子要效率V和时运III，这是满配", "我盔甲全都是保护IV", "你需要摆满书架才能出最好的附魔", "我有时运镐，你要挖钻石可以借你", "靴子记得弄个摔落保护IV"],
            change: { min: 3, max: 5 },
            actions: []
        }
    ]
},

{
    keywords: ["bro", "man", "dude", "hey bro", "yo man", "sup dude", "yo", "hey there"],
    cooldown: { min: 3, max: 8 },
    responses: [
        {
            affinityRange: [-100, 0],
            messages: ["what", "speak up", "u wanna fight", "i'm busy, what is it"],
            change: { min: -1, max: 4 },
            actions: []
        },
        {
            affinityRange: [1, 30],
            messages: ["hey", "yeah bro", "what's up", "what do u need", "u alright"],
            change: { min: 1, max: 2 },
            actions: []
        },
        {
            affinityRange: [31, 70],
            messages: ["yo bro, what's good", "sup man, u need something", "yeah dude, what's going on", "what's up bro, c'mere", "hey man, been a while"],
            change: { min: 2, max: 3 },
            actions: []
        },
        {
            affinityRange: [71, 100],
            messages: ["haha what's up my guy", "my best bro! what is it", "yo, u sound excited, what's the news", "what's cooking man, wanna join my farm", "yeah bro, i got a gift for u"],
            change: { min: 3, max: 5 },
            actions: []
        }
    ]
},

{
    keywords: ["兄弟", "哥们", "老铁", "伙计", "呦", "xd"],
    cooldown: { min: 3, max: 8 },
    responses: [
        {
            affinityRange: [-100, 0],
            messages: ["干啥", "有事吗", "想打架吗", "我很忙", "大声点"],
            change: { min: -1, max: 4 },
            actions: []
        },
        {
            affinityRange: [1, 30],
            messages: ["在呢", "嗯", "咋了", "你想干啥", "你还好吗"],
            change: { min: 1, max: 2 },
            actions: []
        },
        {
            affinityRange: [31, 70],
            messages: ["啥事啊", "哥们找我干啥", "什么情况啊", "咋了", "嗨兄弟"],
            change: { min: 2, max: 3 },
            actions: []
        },
        {
            affinityRange: [71, 100],
            messages: ["哈哈好xd", "咋了", "有啥事不老铁", "咋回事", "兄弟咋了"],
            change: { min: 3, max: 5 },
            actions: []
        }
    ]
},

    
];

export const VOCABULARY = {
    colors: ["红色", "蓝色", "绿色", "黄色", "紫色", "橙色", "黑色", "白色"],
    foods: ["披萨", "汉堡", "寿司", "面条", "米饭", "沙拉", "烤肉", "火锅"],
    emotions: ["开心", "悲伤", "兴奋", "平静", "愤怒", "惊讶", "恐惧", "期待"]
};