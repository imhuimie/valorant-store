const fetch = require('node-fetch');
const config = require('../config');
const storage = require('../storage');
const fs = require('fs');
const path = require('path');

// 格式版本，用于检查缓存是否需要更新
const FORMAT_VERSION = 1;

// 本地皮肤数据文件路径
const SKINS_DATA_PATH = path.join(__dirname, '../data/skins_data.json');

// 全局缓存
let weapons = null;
let skins = null;
let rarities = null;
let gameVersion = null;

/**
 * 获取Valorant游戏版本
 * @returns {Promise<Object>} - 版本信息
 */
const getValorantVersion = async () => {
  console.log('获取Valorant当前版本...');
  
  try {
    const response = await fetch(config.riotAPI.valorantApi.version);
    if (!response.ok) {
      throw new Error(`获取版本失败: ${response.status}`);
    }
    
    const json = await response.json();
    if (json.status !== 200) {
      throw new Error(`Valorant版本数据状态码: ${json.status}`);
    }
    
    return json.data;
  } catch (error) {
    console.error('获取Valorant版本失败:', error);
    throw error;
  }
};

/**
 * 加载皮肤数据
 * @returns {Promise<boolean>} - 是否成功
 */
const loadSkinsData = async () => {
  try {
    // 尝试从缓存加载
    const skinsCache = await storage.getCache('skins');
    
    if (skinsCache && skinsCache.formatVersion === FORMAT_VERSION) {
      weapons = skinsCache.weapons;
      skins = skinsCache.skins;
      rarities = skinsCache.rarities;
      gameVersion = skinsCache.gameVersion;
      console.log('从缓存加载皮肤数据成功');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('加载皮肤数据失败:', error);
    return false;
  }
};

/**
 * 保存皮肤数据到缓存
 * @returns {Promise<boolean>} - 是否成功
 */
const saveSkinsData = async () => {
  try {
    const cacheData = {
      formatVersion: FORMAT_VERSION,
      gameVersion,
      weapons,
      skins,
      rarities,
      timestamp: Date.now()
    };
    
    await storage.saveCache('skins', cacheData);
    console.log('皮肤数据已缓存');
    return true;
  } catch (error) {
    console.error('保存皮肤数据失败:', error);
    return false;
  }
};

/**
 * 获取所有皮肤数据
 * @param {boolean} [forceRefresh=false] - 是否强制刷新
 * @returns {Promise<Object>} - 皮肤数据
 */
const fetchSkinsData = async (forceRefresh = false) => {
  try {
    // 获取当前游戏版本
    const versionData = await getValorantVersion();
    const currentVersion = versionData.manifestId;
    
    // 如果不是强制刷新，并且缓存数据的版本与当前游戏版本一致，则使用缓存数据
    if (!forceRefresh) {
      const loaded = await loadSkinsData();
      if (loaded && gameVersion === currentVersion) {
        return { weapons, skins, rarities };
      }
    }
    
    // 更新游戏版本
    gameVersion = currentVersion;
    
    // 获取武器和皮肤数据
    await fetchWeaponsAndSkins();
    
    // 获取稀有度数据
    await fetchRarities();
    
    // 保存到缓存
    await saveSkinsData();
    
    return { weapons, skins, rarities };
  } catch (error) {
    console.error('获取皮肤数据失败:', error);
    throw error;
  }
};

/**
 * 获取武器和皮肤数据
 * @returns {Promise<void>}
 */
const fetchWeaponsAndSkins = async () => {
  console.log('获取武器和皮肤数据...');
  
  try {
    const response = await fetch(config.riotAPI.valorantApi.weapons);
    if (!response.ok) {
      throw new Error(`获取武器数据失败: ${response.status}`);
    }
    
    const json = await response.json();
    if (json.status !== 200) {
      throw new Error(`武器数据状态码: ${json.status}`);
    }
    
    // 初始化武器和皮肤对象
    weapons = {};
    skins = {};
    
    // 处理每个武器
    for (const weapon of json.data) {
      // 保存武器信息
      weapons[weapon.uuid] = {
        uuid: weapon.uuid,
        names: weapon.displayName,
        icon: weapon.displayIcon,
        defaultSkinUuid: weapon.defaultSkinUuid,
        category: weapon.category.split('::').pop(), // 例如："EEquippableCategory::Heavy" -> "Heavy"
        shopData: weapon.shopData
      };
      
      // 处理每个皮肤
      for (const skin of weapon.skins) {
        const levelOne = skin.levels[0];
        
        // 查找适合的图标
        let icon;
        if (skin.themeUuid === "5a629df4-4765-0214-bd40-fbb96542941f") { // 默认皮肤
          icon = skin.chromas[0] && skin.chromas[0].fullRender;
        } else {
          // 尝试从皮肤级别中找到图标
          for (let i = 0; i < skin.levels.length; i++) {
            if (skin.levels[i] && skin.levels[i].displayIcon) {
              icon = skin.levels[i].displayIcon;
              break;
            }
          }
        }
        
        // 如果没有找到图标，尝试使用色彩变种的图标
        if (!icon && skin.chromas && skin.chromas.length > 0) {
          icon = skin.chromas[0].fullRender || skin.chromas[0].displayIcon;
        }
        
        // 如果仍然没有图标，使用武器的图标
        if (!icon) {
          icon = weapon.displayIcon;
        }
        
        // 保存皮肤信息
        skins[levelOne.uuid] = {
          uuid: levelOne.uuid,
          skinUuid: skin.uuid,
          weapon: weapon.uuid,
          names: skin.displayName,
          icon: icon,
          rarity: skin.contentTierUuid,
          defaultSkinUuid: weapon.defaultSkinUuid,
          levels: skin.levels.map(level => ({
            uuid: level.uuid,
            names: level.displayName,
            icon: level.displayIcon,
            streamedVideo: level.streamedVideo
          })),
          chromas: skin.chromas.map(chroma => ({
            uuid: chroma.uuid,
            names: chroma.displayName,
            icon: chroma.displayIcon,
            fullRender: chroma.fullRender,
            swatch: chroma.swatch
          }))
        };
      }
    }
    
    console.log(`已获取 ${Object.keys(weapons).length} 种武器和 ${Object.keys(skins).length} 种皮肤`);
  } catch (error) {
    console.error('获取武器和皮肤数据失败:', error);
    throw error;
  }
};

/**
 * 获取皮肤稀有度数据
 * @returns {Promise<void>}
 */
const fetchRarities = async () => {
  console.log('获取皮肤稀有度数据...');
  
  try {
    const response = await fetch(config.riotAPI.valorantApi.tiers);
    if (!response.ok) {
      throw new Error(`获取稀有度数据失败: ${response.status}`);
    }
    
    const json = await response.json();
    if (json.status !== 200) {
      throw new Error(`稀有度数据状态码: ${json.status}`);
    }
    
    // 初始化稀有度对象
    rarities = {};
    
    // 处理每个稀有度
    for (const rarity of json.data) {
      rarities[rarity.uuid] = {
        uuid: rarity.uuid,
        name: rarity.devName,
        icon: rarity.displayIcon,
        color: rarity.highlightColor,
        rank: rarity.rank
      };
    }
    
    console.log(`已获取 ${Object.keys(rarities).length} 种稀有度`);
  } catch (error) {
    console.error('获取稀有度数据失败:', error);
    throw error;
  }
};

/**
 * 从本地文件加载皮肤数据
 * @returns {Promise<Object|null>} - 皮肤数据或null
 */
const loadLocalSkinsData = async () => {
  try {
    if (fs.existsSync(SKINS_DATA_PATH)) {
      const rawData = fs.readFileSync(SKINS_DATA_PATH, 'utf8');
      const data = JSON.parse(rawData);
      console.log('从本地文件加载皮肤数据成功');
      
      // 检查所有皮肤是否有图片URL
      let missingImageCount = 0;
      if (data.skins) {
        for (const [uuid, skin] of Object.entries(data.skins)) {
          if (!skin.image_url) {
            console.warn(`皮肤 ${uuid} (${skin.name}) 缺少图片URL`);
            missingImageCount++;
            
            // 尝试构建一个默认的图片URL
            skin.image_url = `https://media.valorant-api.com/weaponskinlevels/${uuid}/displayicon.png`;
          }
        }
        if (missingImageCount > 0) {
          console.log(`已为 ${missingImageCount} 个皮肤添加默认图片URL`);
        }
      }
      
      return data;
    }
    return null;
  } catch (error) {
    console.error('加载本地皮肤数据失败:', error);
    return null;
  }
};

/**
 * 获取皮肤价格数据
 * @param {string} id - 用户ID
 * @param {string} [puuid] - 可选的PUUID
 * @returns {Promise<Object>} - 价格数据
 */
const fetchPrices = async (id, puuid = null) => {
  try {
    // 先尝试从缓存获取价格数据
    const pricesCache = await storage.getCache('prices');
    if (pricesCache && pricesCache.data && Object.keys(pricesCache.data).length > 0) {
      console.log('使用缓存的价格数据');
      return pricesCache.data;
    }
    
    // 如果没有缓存，尝试从shopService获取价格
    try {
      const shopService = require('./shopService');
      const pricesData = await shopService.getPrices(id, puuid);
      
      if (pricesData.success && pricesData.prices && Object.keys(pricesData.prices).length > 0) {
        console.log(`成功从API获取了 ${Object.keys(pricesData.prices).length} 个价格数据`);
        
        // 保存到缓存中以备后用
        await storage.saveCache('prices', {
          data: pricesData.prices,
          timestamp: Date.now()
        });
        
        return pricesData.prices;
      }
    } catch (apiError) {
      console.error('从API获取价格数据失败:', apiError);
    }
    
    console.log('无法从API获取价格数据，尝试从本地文件获取');
    
    // 尝试从本地文件获取价格
    try {
      const localData = await loadLocalSkinsData();
      if (localData && localData.skins) {
        const prices = {};
        // 从本地数据构建价格映射
        Object.entries(localData.skins).forEach(([uuid, skin]) => {
          if (skin.price) {
            prices[uuid] = skin.price;
          }
        });
        
        if (Object.keys(prices).length > 0) {
          console.log(`从本地文件加载了 ${Object.keys(prices).length} 个皮肤价格`);
          
          // 保存到缓存中以备后用
          await storage.saveCache('prices', {
            data: prices,
            timestamp: Date.now()
          });
          
          return prices;
        }
      }
    } catch (localError) {
      console.error('从本地文件获取价格失败:', localError);
    }
    
    console.log('无法获取价格数据，使用默认价格映射');
    
    // 创建一个更广泛的默认价格映射，基于常见的价格点
    // 按武器类型和稀有度分类
    const defaultPrices = {};
    
    // 常见的皮肤价格点（以VP为单位）
    const pricePoints = {
      pistol: { standard: 875, deluxe: 1275, premium: 1775, exclusive: 2175, ultimate: 2475 },
      smg: { standard: 875, deluxe: 1275, premium: 1775, exclusive: 2175, ultimate: 2475 },
      shotgun: { standard: 875, deluxe: 1275, premium: 1775, exclusive: 2175, ultimate: 2475 },
      rifle: { standard: 875, deluxe: 1275, premium: 1775, exclusive: 2175, ultimate: 2475 },
      sniper: { standard: 875, deluxe: 1275, premium: 1775, exclusive: 2175, ultimate: 2475 },
      heavy: { standard: 875, deluxe: 1275, premium: 1775, exclusive: 2175, ultimate: 2475 },
      melee: { standard: 875, deluxe: 1275, premium: 1775, exclusive: 2175, ultimate: 4350 }
    };
    
    // 如果有皮肤数据可用，尝试基于皮肤的稀有度和武器类型推断价格
    if (skins) {
      Object.entries(skins).forEach(([uuid, skin]) => {
        if (!skin) return;
        
        const weapon = weapons[skin.weapon];
        const category = weapon ? weapon.category.toLowerCase() : 'rifle';
        const rarity = rarities[skin.rarity];
        const rarityRank = rarity ? rarity.rank : 2;
        
        // 基于稀有度排名设置价格
        let priceTier;
        if (rarityRank <= 1) priceTier = 'standard';
        else if (rarityRank === 2) priceTier = 'deluxe';
        else if (rarityRank === 3) priceTier = 'premium';
        else if (rarityRank === 4) priceTier = 'exclusive';
        else priceTier = 'ultimate';
        
        // 为每个皮肤设置一个合理的默认价格
        defaultPrices[uuid] = pricePoints[category] ? 
          pricePoints[category][priceTier] : 
          pricePoints.rifle[priceTier];
      });
    }
    
    // 如果没有找到任何基于皮肤数据的价格，至少提供一些常见的价格
    if (Object.keys(defaultPrices).length === 0) {
      defaultPrices['default_price_1'] = 875;   // 低级皮肤
      defaultPrices['default_price_2'] = 1275;  // 中级皮肤
      defaultPrices['default_price_3'] = 1775;  // 高级皮肤
      defaultPrices['default_price_4'] = 2175;  // 超级皮肤
      defaultPrices['default_price_5'] = 2475;  // 至尊皮肤
      defaultPrices['default_price_6'] = 4350;  // 稀有近战武器
    }
    
    return defaultPrices;
  } catch (error) {
    console.error('获取价格数据失败:', error);
    return {};
  }
};

/**
 * 根据UUID获取皮肤信息
 * @param {string} uuid - 皮肤UUID
 * @param {string} [userId] - 可选的用户ID，用于获取价格信息
 * @param {string} [puuid] - 可选的PUUID，用于获取价格信息
 * @returns {Promise<Object|null>} - 皮肤信息或null
 */
const getSkinByUUID = async (uuid, userId = null, puuid = null) => {
  try {
    // 先尝试从本地数据获取 - 这样可以确保有图片URL和价格
    console.log(`尝试从本地文件获取UUID为 ${uuid} 的皮肤数据`);
    const localData = await loadLocalSkinsData();
    
    if (localData && localData.skins && localData.skins[uuid]) {
      // 获取价格信息 - 无论是否找到皮肤都会尝试获取价格
      let price = null;
      if (userId) {
        try {
          const prices = await fetchPrices(userId, puuid);
          price = prices[uuid] || null;
          console.log(`为皮肤 ${uuid} 获取到价格: ${price}`);
        } catch (priceError) {
          console.error(`获取皮肤 ${uuid} 的价格失败:`, priceError);
        }
      }
      
      const localSkin = localData.skins[uuid];
      const weaponInfo = localData.weapons && localSkin.weapon ? localData.weapons[localSkin.weapon] : null;
      
      // 价格优先级: 1.API获取的价格 2.本地文件中的价格 3.null
      const finalPrice = price || localSkin.price || null;
      
      return {
        uuid: uuid,
        name: localSkin.name || "未知皮肤",
        icon: localSkin.image_url || null,
        weapon: {
          uuid: weaponInfo ? weaponInfo.uuid : null,
          name: weaponInfo ? weaponInfo.name : (localSkin.weapon || "未知武器"),
          icon: weaponInfo ? weaponInfo.icon : null,
          category: null
        },
        rarity: {
          uuid: null,
          name: localSkin.tier || "未知等级",
          icon: null,
          color: null
        },
        price: finalPrice,
        levels: [],
        chromas: []
      };
    }
    
    // 如果本地数据中没有找到，尝试从API获取
    console.log(`本地文件中未找到UUID为 ${uuid} 的皮肤，尝试从API获取`);
    
    // 确保已加载API皮肤数据
    if (!skins) {
      await fetchSkinsData();
    }
    
    // 获取价格信息
    let price = null;
    if (userId) {
      try {
        const prices = await fetchPrices(userId, puuid);
        price = prices[uuid] || null;
        console.log(`为皮肤 ${uuid} 获取到价格: ${price}`);
      } catch (priceError) {
        console.error(`获取皮肤 ${uuid} 的价格失败:`, priceError);
      }
    }
    
    // 从API数据中获取皮肤信息
    const skin = skins[uuid];
    if (skin) {
      // 获取武器信息
      const weapon = weapons[skin.weapon];
      
      // 获取稀有度信息
      const rarity = rarities[skin.rarity];
      
      // 返回完整的皮肤信息
      return {
        uuid: skin.uuid,
        name: skin.names,
        icon: skin.icon || `https://media.valorant-api.com/weaponskinlevels/${uuid}/displayicon.png`,
        weapon: {
          uuid: weapon.uuid,
          name: weapon.names,
          icon: weapon.icon,
          category: weapon.category
        },
        rarity: rarity ? {
          uuid: rarity.uuid,
          name: rarity.name,
          icon: rarity.icon,
          color: rarity.color
        } : null,
        price,
        levels: skin.levels,
        chromas: skin.chromas
      };
    }
    
    // 如果仍然找不到皮肤信息，构建一个基本的默认对象并返回
    console.warn(`从API和本地数据中均未找到UUID为 ${uuid} 的皮肤，创建基本信息对象`);
    // 尝试建立默认图片URL
    const defaultImageUrl = `https://media.valorant-api.com/weaponskinlevels/${uuid}/displayicon.png`;
    
    // 尝试获取皮肤信息
    let skinName = "未知皮肤";
    let skinIcon = defaultImageUrl;
    try {
      const response = await fetch(`https://valorant-api.com/v1/weapons/skinlevels/${uuid}`);
      if (response.ok) {
        const data = await response.json();
        if (data.status === 200 && data.data) {
          console.log(`从valorant-api.com为${uuid}获取到皮肤信息`);
          skinName = data.data.displayName || skinName;
          skinIcon = data.data.displayIcon || data.data.fullRender || defaultImageUrl;
          
          // 保存到本地皮肤数据库中，以便下次使用
          if (skinName !== "未知皮肤" && skinIcon) {
            try {
              const localData = await loadLocalSkinsData() || { skins: {}, weapons: {}, format_version: 1 };
              if (!localData.skins) localData.skins = {};
              
              localData.skins[uuid] = {
                name: skinName,
                image_url: skinIcon,
                price: price || null,
                tier: "standard" // 默认等级
              };
              
              // 保存回文件
              fs.writeFileSync(SKINS_DATA_PATH, JSON.stringify(localData, null, 2), 'utf8');
              console.log(`已将皮肤 ${uuid} (${skinName}) 保存到本地数据库`);
            } catch (saveError) {
              console.error(`保存皮肤 ${uuid} 到本地数据库失败:`, saveError);
            }
          }
        }
      }
    } catch (apiError) {
      console.error(`尝试从API获取皮肤${uuid}信息失败:`, apiError);
    }
    
    // 返回基本信息
    return {
      uuid: uuid,
      name: skinName,
      icon: skinIcon,
      weapon: {
        uuid: null,
        name: "未知武器",
        icon: null,
        category: null
      },
      rarity: {
        uuid: null,
        name: "未知等级",
        icon: null,
        color: null
      },
      price: price || null,
      levels: [],
      chromas: []
    };
    // 返回基本信息
    return {
      uuid: uuid,
      name: skinName,
      icon: skinIcon,
      weapon: {
        uuid: null,
        name: "未知武器",
        icon: null,
        category: null
      },
      rarity: {
        uuid: null,
        name: "未知等级",
        icon: null,
        color: null
      },
      price: price || null,
      levels: [],
      chromas: []
    };
  } catch (error) {
    console.error(`获取皮肤 ${uuid} 失败:`, error);
    
    // 即使出错也返回一个基本信息对象
    // 尝试建立默认图片URL
    const defaultImageUrl = `https://media.valorant-api.com/weaponskinlevels/${uuid}/displayicon.png`;
    
    return {
      uuid: uuid,
      name: "加载失败的皮肤",
      icon: defaultImageUrl,
      price: null,
      error: error.message
    };
  }
};

/**
 * 获取商店中皮肤的详细信息
 * @param {Array<string>} uuids - 皮肤UUID数组
 * @param {string} userId - 用户ID
 * @param {string} [puuid] - 可选的PUUID
 * @returns {Promise<Array<Object>>} - 皮肤详细信息数组
 */
const getShopSkins = async (uuids, userId, puuid = null) => {
  try {
    console.log(`获取商店皮肤详情，UUID列表: ${uuids.join(', ')}`);
    
    // 获取价格数据
    const prices = await fetchPrices(userId, puuid);
    console.log(`获取到价格数据: ${Object.keys(prices).length} 条`);
    
    // 加载本地皮肤数据
    const localData = await loadLocalSkinsData();
    console.log(`加载本地皮肤数据: ${localData ? `成功，含 ${Object.keys(localData.skins || {}).length} 个皮肤` : '失败'}`);
    
    // 确保已加载API皮肤数据
    if (!skins) {
      console.log('API皮肤数据未加载，正在获取...');
      await fetchSkinsData();
      console.log(`API皮肤数据加载完成，含 ${Object.keys(skins || {}).length} 个皮肤`);
    }
    
    // 获取每个皮肤的详细信息
    const shopSkins = [];
    for (const uuid of uuids) {
      try {
        // 使用getSkinByUUID方法获取皮肤信息
        const skinInfo = await getSkinByUUID(uuid, userId, puuid);
        
        // 如果能获取到信息，添加到结果数组
        if (skinInfo) {
          // 确保价格信息已包含
          if (!skinInfo.price && prices[uuid]) {
            skinInfo.price = prices[uuid];
          }
          shopSkins.push(skinInfo);
        } else {
          // 如果仍然无法获取信息，添加基本占位信息
          console.warn(`getShopSkins无法通过getSkinByUUID找到 ${uuid} 的皮肤信息`);
          
          // 尝试建立默认图片URL
          const defaultImageUrl = `https://media.valorant-api.com/weaponskinlevels/${uuid}/displayicon.png`;
          
          shopSkins.push({
            uuid,
            name: '未知皮肤',
            icon: defaultImageUrl,
            price: prices[uuid] || null,
            weapon: { name: '未知武器', icon: null },
            rarity: { name: '未知等级', color: null }
          });
        }
      } catch (error) {
        console.error(`在getShopSkins中处理 ${uuid} 时发生错误:`, error);
        
        // 添加错误状态的皮肤信息
        // 尝试建立默认图片URL
        const defaultImageUrl = `https://media.valorant-api.com/weaponskinlevels/${uuid}/displayicon.png`;
        
        shopSkins.push({
          uuid,
          name: '加载失败的皮肤',
          icon: defaultImageUrl,
          price: prices[uuid] || null,
          error: error.message
        });
      }
    }
    
    return shopSkins;
  } catch (error) {
    console.error('获取商店皮肤详细信息失败:', error);
    
    // 出错时提供基本的皮肤信息，确保前端不会显示未知皮肤
    return uuids.map(uuid => ({
      uuid,
      name: '数据获取失败',
      icon: `https://media.valorant-api.com/weaponskinlevels/${uuid}/displayicon.png`,
      price: null,
      weapon: { name: '未知武器', icon: null },
      rarity: { name: '未知等级', color: null },
      error: error.message
    }));
  }
};

/**
 * 获取武器列表
 * @returns {Promise<Array<Object>>} - 武器列表
 */
const getWeapons = async () => {
  try {
    // 确保已加载皮肤数据
    if (!weapons) {
      await fetchSkinsData();
    }
    
    return Object.values(weapons);
  } catch (error) {
    console.error('获取武器列表失败:', error);
    return [];
  }
};

/**
 * 获取武器的所有皮肤
 * @param {string} weaponUuid - 武器UUID
 * @returns {Promise<Array<Object>>} - 皮肤列表
 */
const getWeaponSkins = async (weaponUuid) => {
  try {
    // 确保已加载皮肤数据
    if (!skins) {
      await fetchSkinsData();
    }
    
    // 过滤出指定武器的皮肤
    const weaponSkins = Object.values(skins).filter(skin => skin.weapon === weaponUuid);
    
    return weaponSkins.map(skin => {
      const rarity = rarities[skin.rarity];
      return {
        uuid: skin.uuid,
        name: skin.names,
        icon: skin.icon || `https://media.valorant-api.com/weaponskinlevels/${skin.uuid}/displayicon.png`,
        rarity: rarity ? {
          uuid: rarity.uuid,
          name: rarity.name,
          icon: rarity.icon,
          color: rarity.color
        } : null
      };
    });
  } catch (error) {
    console.error(`获取武器 ${weaponUuid} 的皮肤失败:`, error);
    return [];
  }
};

/**
 * 搜索皮肤
 * @param {string} query - 搜索关键词
 * @param {number} [limit=20] - 最大结果数
 * @returns {Promise<Array<Object>>} - 搜索结果
 */
const searchSkins = async (query, limit = 20) => {
  try {
    // 确保已加载皮肤数据
    if (!skins) {
      await fetchSkinsData();
    }
    
    // 加载本地皮肤数据作为备份
    const localData = await loadLocalSkinsData();
    
    // 转换为小写以进行不区分大小写的搜索
    const lowercaseQuery = query.toLowerCase();
    
    // 从API数据中过滤皮肤
    let results = Object.values(skins)
      .filter(skin => {
        // 检查皮肤名称是否包含查询字符串
        if (typeof skin.names === 'string') {
          return skin.names.toLowerCase().includes(lowercaseQuery);
        } else if (typeof skin.names === 'object') {
          // 检查多语言名称
          return Object.values(skin.names).some(name => 
            typeof name === 'string' && name.toLowerCase().includes(lowercaseQuery)
          );
        }
        return false;
      })
      .slice(0, limit)
      .map(skin => {
        const weapon = weapons[skin.weapon];
        const rarity = rarities[skin.rarity];
        
        return {
          uuid: skin.uuid,
          name: skin.names,
          icon: skin.icon || `https://media.valorant-api.com/weaponskinlevels/${skin.uuid}/displayicon.png`,
          weapon: {
            uuid: weapon.uuid,
            name: weapon.names,
            icon: weapon.icon,
            category: weapon.category
          },
          rarity: rarity ? {
            uuid: rarity.uuid,
            name: rarity.name,
            icon: rarity.icon,
            color: rarity.color
          } : null
        };
      });
    
    // 如果本地数据存在，也从本地数据中搜索
    if (localData && localData.skins) {
      const localResults = Object.entries(localData.skins)
        .filter(([uuid, skin]) => {
          // 检查是否已经在API结果中
          if (results.some(result => result.uuid === uuid)) return false;
          
          // 检查名称是否匹配
          return skin.name && skin.name.toLowerCase().includes(lowercaseQuery);
        })
        .slice(0, limit - results.length)
        .map(([uuid, skin]) => {
          const weaponInfo = localData.weapons && skin.weapon ? localData.weapons[skin.weapon] : null;
          
          return {
            uuid: uuid,
            name: skin.name,
            icon: skin.image_url || `https://media.valorant-api.com/weaponskinlevels/${uuid}/displayicon.png`,
            weapon: {
              uuid: weaponInfo ? weaponInfo.uuid : null,
              name: weaponInfo ? weaponInfo.name : (skin.weapon || "未知武器"),
              icon: null,
              category: null
            },
            rarity: {
              uuid: null,
              name: skin.tier || "未知等级",
              icon: null,
              color: null
            }
          };
        });
      
      // 合并结果
      results = [...results, ...localResults];
    }
    
    return results;
  } catch (error) {
    console.error(`搜索皮肤 "${query}" 失败:`, error);
    return [];
  }
};

module.exports = {
  fetchSkinsData,
  getSkinByUUID,
  getShopSkins,
  getWeapons,
  getWeaponSkins,
  searchSkins
};
