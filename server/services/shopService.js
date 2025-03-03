const fetch = require('node-fetch');
const config = require('../config');
const storage = require('../storage');
const { authUser } = require('./authService');
const { isMaintenance, formatBundle, formatNightMarket } = require('../utils/riot');

/**
 * 获取用户的商店数据
 * @param {string} id - 用户ID
 * @param {string} [puuid] - 可选的PUUID
 * @returns {Promise<Object>} - 带有success字段的响应对象
 */
const getShop = async (id, puuid = null) => {
  try {
    // 首先验证用户身份
    const authSuccess = await authUser(id, puuid);
    if (!authSuccess.success) return authSuccess;

    const user = authSuccess.user;
    console.log(`获取 ${user.username} 的商店数据...`);

    // 尝试从缓存获取
    const shopCache = await storage.getShopCache(user.puuid);
    if (shopCache) {
      console.log(`使用缓存的商店数据，用户: ${user.username}`);
      return { success: true, shop: shopCache, cached: true };
    }

    // 从Valorant API获取商店数据
    try {
      // 确保用户有必要的令牌
      if (!user.auth.rso || !user.auth.ent) {
        console.error('用户令牌不完整，无法获取商店数据');
        return { success: false, error: 'incomplete_tokens' };
      }

      console.log('获取商店数据的令牌:', {
        region: user.region,
        puuid: user.puuid,
        rsoToken: user.auth.rso ? user.auth.rso.substring(0, 10) + '...' : 'null',
        entToken: user.auth.ent ? (user.auth.ent === 'limited-access' ? 'limited-access' : user.auth.ent.substring(0, 10) + '...') : 'null'
      });

      // 使用userRegion函数获取处理后的区域代码
      const riot = require('../utils/riot');
      const region = riot.userRegion(user);
      const url = `https://pd.${region}.a.pvp.net/store/v3/storefront/${user.puuid}`;
      console.log('请求URL:', url);
      console.log('使用处理后区域:', region, '(原始区域:', user.region, ')');

      // 直接使用POST方法，与SkinPeek保持一致
      console.log('使用POST方法请求商店数据...');
      
      // 获取Riot客户端头
      const riotHeaders = await require('../utils/riot').getRiotClientHeaders();
      console.log('使用Riot客户端头:', JSON.stringify(riotHeaders, null, 2));
      
      const req = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + user.auth.rso,
          "X-Riot-Entitlements-JWT": user.auth.ent,
          ...riotHeaders
        },
        body: JSON.stringify({})
      });
      
      if (req.status !== 200) {
        console.error(`获取商店数据失败，状态码: ${req.status}`);
        
        // 尝试获取错误响应的详细内容
        try {
          const errorText = await req.text();
          console.error('错误响应详情:', errorText);
        } catch (e) {
          console.error('无法读取错误响应详情');
        }
        
        return { success: false };
      }
      
      const json = await req.json();
      
      // 检查错误
      if (json.httpStatus === 400 && json.errorCode === "BAD_CLAIMS") {
        console.error('无效的令牌:', json);
        return { success: false, error: 'invalid_token' };
      } else if (isMaintenance(json)) {
        return { success: false, maintenance: true };
      }
      
      // 缓存商店数据
      await storage.saveShopCache(user.puuid, json);
      
      return { success: true, shop: json };
    } catch (error) {
      console.error('获取商店数据时发生异常:', error);
      return { success: false, error: error.message };
    }
  } catch (error) {
    console.error('获取商店数据失败:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 获取每日商店皮肤
 * @param {string} id - 用户ID
 * @param {string} [puuid] - 可选的PUUID
 * @returns {Promise<Object>} - 带有success字段和offers数据的响应对象
 */
const getOffers = async (id, puuid = null) => {
  try {
    // 检查缓存
    if (puuid) {
      const shopCache = await storage.getShopCache(puuid);
      if (shopCache && shopCache.SkinsPanelLayout) {
        return {
          success: true,
          cached: true,
          offers: shopCache.SkinsPanelLayout.SingleItemOffers,
          expires: Math.floor(Date.now() / 1000) + shopCache.SkinsPanelLayout.SingleItemOffersRemainingDurationInSeconds
        };
      }
    }

    // 获取商店数据
    const resp = await getShop(id, puuid);
    if (!resp.success) return resp;

    const shop = resp.shop;
    return {
      success: true,
      cached: resp.cached || false,
      offers: shop.SkinsPanelLayout.SingleItemOffers,
      expires: Math.floor(Date.now() / 1000) + shop.SkinsPanelLayout.SingleItemOffersRemainingDurationInSeconds,
      accessory: {
        offers: (shop.AccessoryStore.AccessoryStoreOffers || []).map(rawAccessory => {
          return {
            cost: rawAccessory.Offer.Cost["85ca954a-41f2-ce94-9b45-8ca3dd39a00d"],
            rewards: rawAccessory.Offer.Rewards,
            contractID: rawAccessory.ContractID
          };
        }),
        expires: Math.floor(Date.now() / 1000) + shop.AccessoryStore.AccessoryStoreRemainingDurationInSeconds
      }
    };
  } catch (error) {
    console.error('获取每日商店皮肤失败:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 获取当前捆绑包
 * @param {string} id - 用户ID
 * @param {string} [puuid] - 可选的PUUID
 * @returns {Promise<Object>} - 带有success字段和bundles数据的响应对象
 */
const getBundles = async (id, puuid = null) => {
  try {
    // 获取商店数据
    const resp = await getShop(id, puuid);
    if (!resp.success) return resp;

    const shop = resp.shop;
    const formatted = await Promise.all(
      shop.FeaturedBundle.Bundles.map(rawBundle => formatBundle(rawBundle))
    );

    return { success: true, bundles: formatted };
  } catch (error) {
    console.error('获取捆绑包失败:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 获取夜市数据
 * @param {string} id - 用户ID
 * @param {string} [puuid] - 可选的PUUID
 * @returns {Promise<Object>} - 带有success字段和night market数据的响应对象
 */
const getNightMarket = async (id, puuid = null) => {
  try {
    // 获取商店数据
    const resp = await getShop(id, puuid);
    if (!resp.success) return resp;

    const shop = resp.shop;

    // 检查夜市是否存在
    if (!shop.BonusStore) {
      return { success: true, offers: false };
    }

    return { success: true, ...(await formatNightMarket(shop.BonusStore)) };
  } catch (error) {
    console.error('获取夜市数据失败:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 获取用户余额
 * @param {string} id - 用户ID
 * @param {string} [puuid] - 可选的PUUID
 * @returns {Promise<Object>} - 带有success字段和余额数据的响应对象
 */
const getBalance = async (id, puuid = null) => {
  try {
    // 验证用户身份
    const authSuccess = await authUser(id, puuid);
    if (!authSuccess.success) return authSuccess;

    const user = authSuccess.user;
    console.log(`获取 ${user.username} 的余额...`);

    // 获取Riot客户端头
    const riotHeaders = await require('../utils/riot').getRiotClientHeaders();
    
    // 使用userRegion函数获取处理后的区域代码
    const riot = require('../utils/riot');
    const region = riot.userRegion(user);
    
    // 请求余额数据
    const url = `https://pd.${region}.a.pvp.net/store/v1/wallet/${user.puuid}`;
    console.log('请求余额URL:', url);
    console.log('使用处理后区域:', region, '(原始区域:', user.region, ')');
    
    const req = await fetch(url, {
      headers: {
        "Authorization": "Bearer " + user.auth.rso,
        "X-Riot-Entitlements-JWT": user.auth.ent,
        ...riotHeaders
      }
    });

    if (req.status !== 200) {
      console.error(`获取余额失败，状态码: ${req.status}`);
      return { success: false };
    }

    const json = await req.json();
    
    // 检查错误
    if (json.httpStatus === 400 && json.errorCode === "BAD_CLAIMS") {
      console.error('无效的令牌:', json);
      return { success: false, error: 'invalid_token' };
    } else if (isMaintenance(json)) {
      return { success: false, maintenance: true };
    }

    return {
      success: true,
      vp: json.Balances["85ad13f7-3d1b-5128-9eb2-7cd8ee0b5741"],  // Valorant Points
      rad: json.Balances["e59aa87c-4cbf-517a-5983-6e81511be9b7"], // Radianite Points
      kc: json.Balances["85ca954a-41f2-ce94-9b45-8ca3dd39a00d"]   // Kingdom Credits
    };
  } catch (error) {
    console.error('获取余额失败:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 获取皮肤价格
 * @param {string} id - 用户ID
 * @param {string} [puuid] - 可选的PUUID
 * @returns {Promise<Object>} - 带有success字段和价格数据的响应对象
 */
const getPrices = async (id, puuid = null) => {
  try {
    // 验证用户身份
    const authSuccess = await authUser(id, puuid);
    if (!authSuccess.success) return authSuccess;

    const user = authSuccess.user;
    console.log(`获取皮肤价格，用户: ${user.username}...`);

    // 检查缓存
    const pricesCache = await storage.getCache('prices');
    const now = Date.now();
    if (pricesCache && pricesCache.timestamp && (now - pricesCache.timestamp < config.cache.expiry.prices)) {
      console.log('使用缓存的价格数据');
      return { success: true, prices: pricesCache.data, cached: true };
    }

    // 获取Riot客户端头
    const riotHeaders = await require('../utils/riot').getRiotClientHeaders();
    
    // 使用userRegion函数获取处理后的区域代码
    const riot = require('../utils/riot');
    const region = riot.userRegion(user);
    
    // 请求价格数据
    const url = `https://pd.${region}.a.pvp.net/store/v1/offers/`;
    console.log('请求价格URL:', url);
    console.log('使用处理后区域:', region, '(原始区域:', user.region, ')');
    console.log('使用POST方法请求价格数据...');
    
    const req = await fetch(url, {
      method: "POST",  // 使用POST方法，与获取商店数据一致
      headers: {
        "Authorization": "Bearer " + user.auth.rso,
        "X-Riot-Entitlements-JWT": user.auth.ent,
        ...riotHeaders
      },
      body: JSON.stringify({})  // 发送空对象作为请求体
    });

    if (req.status !== 200) {
      console.error(`获取价格失败，状态码: ${req.status}`);
      return { success: false };
    }

    const json = await req.json();
    
    // 检查错误
    if (json.httpStatus === 400 && json.errorCode === "BAD_CLAIMS") {
      console.error('无效的令牌:', json);
      return { success: false, error: 'invalid_token' };
    } else if (isMaintenance(json)) {
      return { success: false, maintenance: true };
    }

    // 处理和缓存价格数据
    const prices = {};
    for (const offer of json.Offers) {
      prices[offer.OfferID] = offer.Cost[Object.keys(offer.Cost)[0]];
    }

    await storage.saveCache('prices', {
      data: prices,
      timestamp: now
    });

    return { success: true, prices };
  } catch (error) {
    console.error('获取价格失败:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  getShop,
  getOffers,
  getBundles,
  getNightMarket,
  getBalance,
  getPrices
};
