const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// 本地皮肤数据文件路径
const SKINS_DATA_PATH = path.join(__dirname, '../data/skins_data.json');

/**
 * 从 Valorant API 获取所有皮肤数据
 * @returns {Promise<Object>} - 皮肤数据响应
 */
const fetchSkinsFromAPI = async () => {
  try {
    console.log('从 Valorant API 获取皮肤数据...');
    const response = await fetch('https://valorant-api.com/v1/weapons/skins?language=zh-CN');
    
    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`成功获取 ${data.data.length} 个皮肤数据`);
    return data;
  } catch (error) {
    console.error('获取皮肤数据失败:', error);
    throw error;
  }
};

/**
 * 从 Valorant API 获取武器数据
 * @returns {Promise<Object>} - 武器数据响应
 */
const fetchWeaponsFromAPI = async () => {
  try {
    console.log('从 Valorant API 获取武器数据...');
    const response = await fetch('https://valorant-api.com/v1/weapons?language=zh-CN');
    
    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`成功获取 ${data.data.length} 个武器数据`);
    return data;
  } catch (error) {
    console.error('获取武器数据失败:', error);
    throw error;
  }
};

/**
 * 从 Valorant API 获取皮肤稀有度数据
 * @returns {Promise<Object>} - 稀有度数据响应
 */
const fetchTiersFromAPI = async () => {
  try {
    console.log('从 Valorant API 获取皮肤稀有度数据...');
    const response = await fetch('https://valorant-api.com/v1/contenttiers?language=zh-CN');
    
    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`成功获取 ${data.data.length} 个稀有度数据`);
    return data;
  } catch (error) {
    console.error('获取稀有度数据失败:', error);
    throw error;
  }
};

/**
 * 读取本地皮肤数据库
 * @returns {Promise<Object>} - 本地皮肤数据库
 */
const readLocalDatabase = async () => {
  try {
    if (fs.existsSync(SKINS_DATA_PATH)) {
      const rawData = fs.readFileSync(SKINS_DATA_PATH, 'utf8');
      return JSON.parse(rawData);
    }
    
    // 如果文件不存在，返回一个基本结构
    return {
      format_version: 1,
      description: "Valorant皮肤数据 - 包含UUID, 名称, 价格和图片URL",
      last_updated: new Date().toISOString().split('T')[0],
      skin_tiers: {},
      price_tiers: {
        standard: { price: 875, description: "标准价格" },
        deluxe: { price: 1275, description: "豪华价格" },
        premium: { price: 1775, description: "高级价格" },
        ultra: { price: 2175, description: "至尊价格" },
        exclusive: { price: 2475, description: "独家价格" }
      },
      weapons: {},
      skins: {}
    };
  } catch (error) {
    console.error('读取本地数据库失败:', error);
    throw error;
  }
};

/**
 * 将稀有度等级名称转换为价格等级名称
 * @param {string} tierName - 稀有度名称
 * @returns {string} - 价格等级名称
 */
const tierToPriceTier = (tierName) => {
  const tierMap = {
    'Select': 'standard',
    'Deluxe': 'deluxe', 
    'Premium': 'premium',
    'Ultra': 'ultra',
    'Exclusive': 'exclusive',
    '标准版': 'standard',
    '豪华版': 'deluxe',
    '高级版': 'premium',
    '至尊版': 'ultra',
    '独家版': 'exclusive'
  };
  
  return tierMap[tierName] || 'standard';
};

/**
 * 更新皮肤数据库
 * @returns {Promise<void>}
 */
const updateSkinDatabase = async () => {
  try {
    // 读取本地数据库
    const localDB = await readLocalDatabase();
    console.log(`当前本地数据库包含 ${Object.keys(localDB.skins).length} 个皮肤`);
    
    // 获取API数据
    const [tiersResponse, weaponsResponse, skinsResponse] = await Promise.all([
      fetchTiersFromAPI(),
      fetchWeaponsFromAPI(),
      fetchSkinsFromAPI()
    ]);
    
    // 处理稀有度数据
    tiersResponse.data.forEach(tier => {
      localDB.skin_tiers[tier.uuid] = {
        name: tier.devName || tier.displayName,
        rank: tier.rank
      };
    });
    
    // 处理武器数据
    const weaponMap = {};
    weaponsResponse.data.forEach(weapon => {
      const weaponType = weapon.displayName;
      const weaponId = weapon.uuid;
      
      // 将武器名称转换为简化的标识符
      let weaponKey = weaponType.toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
        
      if (weaponKey === 'classic' || weaponKey === 'sheriff' || weaponKey === 'phantom' || 
          weaponKey === 'vandal' || weaponKey === 'operator' || weaponKey === 'knife') {
        // 这些是英文名字较为通用的武器，保留英文
      } else if (weaponType === '制式手枪') weaponKey = 'classic';
      else if (weaponType === '短管霰弹枪') weaponKey = 'shorty';
      else if (weaponType === '狂热手枪') weaponKey = 'frenzy';
      else if (weaponType === '幽灵手枪') weaponKey = 'ghost';
      else if (weaponType === '警长手枪') weaponKey = 'sheriff';
      else if (weaponType === '刺针冲锋枪') weaponKey = 'stinger';
      else if (weaponType === '幽灵战友') weaponKey = 'spectre';
      else if (weaponType === '腥风霰弹枪') weaponKey = 'bucky';
      else if (weaponType === '判官霰弹枪') weaponKey = 'judge';
      else if (weaponType === '斗牛犬') weaponKey = 'bulldog';
      else if (weaponType === '捍卫者') weaponKey = 'guardian';
      else if (weaponType === '幻影') weaponKey = 'phantom';
      else if (weaponType === '暴徒') weaponKey = 'vandal';
      else if (weaponType === '警长步枪') weaponKey = 'marshal';
      else if (weaponType === '战神机枪') weaponKey = 'ares';
      else if (weaponType === '奥丁机枪') weaponKey = 'odin';
      else if (weaponType === '近战武器' || weaponType === '近战') weaponKey = 'knife';
      
      weaponMap[weaponId] = weaponKey;
      
      // 添加到本地数据库
      localDB.weapons[weaponKey] = {
        name: weaponType,
        uuid: weaponId
      };
    });
    
    // 处理皮肤数据
    let newSkinsCount = 0;
    let updatedSkinsCount = 0;
    
    for (const skin of skinsResponse.data) {
      // 对于每个皮肤
      for (const level of skin.levels) {
        const skinUuid = level.uuid;
        
        // 如果皮肤已经存在，检查是否需要更新
        if (localDB.skins[skinUuid]) {
          // 如果图片URL为空，更新它
          if (!localDB.skins[skinUuid].image_url) {
            localDB.skins[skinUuid].image_url = level.displayIcon || 
              skin.chromas[0]?.fullRender || 
              `https://media.valorant-api.com/weaponskinlevels/${skinUuid}/displayicon.png`;
            updatedSkinsCount++;
          }
          continue; // 跳过已有的皮肤
        }
        
        // 获取武器类型
        const weaponId = skin.weaponUuid;
        const weaponKey = weaponMap[weaponId] || 'unknown';
        
        // 获取皮肤稀有度
        let tierName = '标准版';
        let priceTier = 'standard';
        
        if (skin.contentTierUuid) {
          const tier = localDB.skin_tiers[skin.contentTierUuid];
          if (tier) {
            tierName = tier.name;
            priceTier = tierToPriceTier(tierName);
          }
        }
        
        // 计算价格
        const price = localDB.price_tiers[priceTier]?.price || 875;
        
        // 获取图片URL
        let imageUrl = level.displayIcon;
        if (!imageUrl && skin.chromas && skin.chromas.length > 0) {
          imageUrl = skin.chromas[0].fullRender || skin.chromas[0].displayIcon;
        }
        if (!imageUrl) {
          imageUrl = `https://media.valorant-api.com/weaponskinlevels/${skinUuid}/displayicon.png`;
        }
        
        // 添加到本地数据库
        localDB.skins[skinUuid] = {
          name: level.displayName || skin.displayName,
          weapon: weaponKey,
          tier: priceTier,
          price: price,
          image_url: imageUrl
        };
        
        newSkinsCount++;
      }
    }
    
    // 更新最后更新时间
    localDB.last_updated = new Date().toISOString().split('T')[0];
    
    // 保存到文件
    fs.writeFileSync(SKINS_DATA_PATH, JSON.stringify(localDB, null, 2), 'utf8');
    
    console.log(`数据库更新完成! 添加了 ${newSkinsCount} 个新皮肤，更新了 ${updatedSkinsCount} 个现有皮肤。`);
    console.log(`当前数据库共有 ${Object.keys(localDB.skins).length} 个皮肤`);
    
    return {
      success: true,
      newSkins: newSkinsCount,
      updatedSkins: updatedSkinsCount,
      totalSkins: Object.keys(localDB.skins).length
    };
  } catch (error) {
    console.error('更新皮肤数据库失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// 如果直接运行此文件，则执行更新
if (require.main === module) {
  updateSkinDatabase()
    .then(result => {
      if (result.success) {
        console.log('皮肤数据库更新成功!');
      } else {
        console.error('皮肤数据库更新失败:', result.error);
      }
    })
    .catch(error => {
      console.error('执行更新时出错:', error);
    });
}

module.exports = {
  updateSkinDatabase,
  fetchSkinsFromAPI,
  fetchWeaponsFromAPI,
  fetchTiersFromAPI
};
