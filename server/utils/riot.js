const fetch = require('node-fetch');
const config = require('../config');

/**
 * Parse Set-Cookie headers into an object
 * @param {Array|string} cookies - Set-Cookie headers
 * @returns {Object} - Cookie object
 */
const parseSetCookie = (cookies) => {
    if (!cookies) return {};
    const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
    return cookieArray.reduce((obj, cookie) => {
        const [name, ...parts] = cookie.split(';')[0].trim().split('=');
        obj[name] = parts.join('=');
        return obj;
    }, {});
};

/**
 * Stringify cookie object into a cookie header string
 * @param {Object} cookies - Cookie object
 * @returns {string} - Cookie header string
 */
const stringifyCookies = (cookies) => {
    return Object.entries(cookies)
        .map(([name, value]) => `${name}=${value}`)
        .join('; ');
};

/**
 * Extract tokens from redirect URI
 * @param {string} uri - Redirect URI containing tokens
 * @returns {Array} - [rso token, idt token]
 */
const extractTokensFromUri = (uri) => {
    try {
        const url = new URL(uri);
        const fragment = url.hash.substring(1);
        const params = new URLSearchParams(fragment);
        return [params.get('access_token'), params.get('id_token')];
    } catch (e) {
        console.error('Failed to extract tokens:', e);
        return [null, null];
    }
};

/**
 * Get token expiry timestamp
 * @param {string} token - JWT token
 * @returns {number} - Expiry timestamp in milliseconds
 */
const tokenExpiry = (token) => {
    try {
        const payload = token.split('.')[1];
        const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
        return decoded.exp * 1000; // Convert to milliseconds
    } catch (e) {
        console.error('Failed to get token expiry:', e);
        return 0;
    }
};

/**
 * Decode a JWT token
 * @param {string} token - JWT token
 * @returns {Object} - Decoded token payload
 */
const decodeToken = (token) => {
    try {
        const payload = token.split('.')[1];
        return JSON.parse(Buffer.from(payload, 'base64').toString());
    } catch (e) {
        console.error('Failed to decode token:', e);
        return {};
    }
};

/**
 * Check if response indicates maintenance
 * @param {Object} json - Response JSON
 * @returns {boolean} - True if maintenance
 */
const isMaintenance = (json) => {
    return json && typeof json === 'object' && 
        (json.httpStatus === 403 && json.errorCode === 'SCHEDULED_DOWNTIME') || 
        (json.httpStatus === 429 && json.errorCode === 'RESOURCE_EXHAUSTED');
};

// 存储Valorant版本数据
let valorantVersionData = null;

/**
 * 获取Valorant游戏版本
 * @returns {Promise<Object>} - 版本信息
 */
const getValorantVersion = async () => {
    try {
        if (valorantVersionData) return valorantVersionData;
        
        const response = await fetch(config.riotAPI.valorantApi.version);
        if (!response.ok) {
            throw new Error(`获取Valorant版本失败: ${response.status}`);
        }
        
        const json = await response.json();
        valorantVersionData = json.data;
        console.log('成功获取到Valorant版本信息:', json.data.riotClientVersion);
        
        return valorantVersionData;
    } catch (error) {
        console.error('获取Valorant版本失败:', error);
        // 返回一个默认的版本数据，以防API请求失败
        return {
            riotClientVersion: "release-08.11-shipping-14-2539458"
        };
    }
};

/**
 * 处理用户区域映射，与SkinPeek保持一致
 * @param {Object} user - 用户对象
 * @returns {string} - 处理后的区域代码
 */
const userRegion = (user) => {
    if(!user.region || user.region === "latam" || user.region === "br") return "na";
    return user.region;
};

/**
 * 获取Riot客户端平台头信息，与SkinPeek保持一致
 * @returns {Object} - 客户端平台头信息
 */
const getRiotClientHeaders = async () => {
    const platformOsVersion = "10.0.19042.1.256.64bit"; // 客户端操作系统版本
    
    const clientPlatformData = {
        platformType: "PC",
        platformOS: "Windows",
        platformOSVersion: platformOsVersion,
        platformChipset: "Unknown",
    };

    // JSON stringify使用制表符和\r\n换行，然后Base64编码
    const clientPlatformDataJson = JSON.stringify(clientPlatformData, null, "\t");
    const clientPlatformDataBuffer = Buffer.from(clientPlatformDataJson.replace(/\n/g, "\r\n"));
    const clientPlatformDataBase64 = clientPlatformDataBuffer.toString("base64");

    // 获取最新的客户端版本
    const versionData = await getValorantVersion();
    
    // 返回专门的Riot头信息，增加SkinPeek使用的额外头信息
    // 使用特殊的User-Agent绕过hCaptcha (从SkinPeek项目复制)
    return {
        "Content-Type": "application/json",
        "User-Agent": "ShooterGame/13 Windows/10.0.19043.1.256.64bit", // 特殊的User-Agent
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.5",
        "cookie": "dummy=cookie",
        "X-Riot-ClientPlatform": clientPlatformDataBase64,
        "X-Riot-ClientVersion": versionData.riotClientVersion // 使用最新版本
    };
};

/**
 * Format date as ISO string without milliseconds
 * @param {Date} date - Date object
 * @returns {string} - Formatted date string
 */
const formatDate = (date) => {
    return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
};

/**
 * Check if two dates are the same calendar day
 * @param {number} timestamp1 - First timestamp
 * @param {number} timestamp2 - Second timestamp
 * @returns {boolean} - True if same day
 */
const isSameDay = (timestamp1, timestamp2) => {
    if (!timestamp1 || !timestamp2) return false;
    const date1 = new Date(timestamp1);
    const date2 = new Date(timestamp2);
    return date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate();
};

/**
 * Format a bundle for display
 * @param {Object} rawBundle - Bundle data from API
 * @returns {Promise<Object>} - Formatted bundle
 */
const formatBundle = async (rawBundle) => {
    try {
        // 捆绑包的基本信息
        const bundleUuid = rawBundle.DataAssetID;
        let bundleName = rawBundle.DisplayName || '未知捆绑包';
        let bundleIcon = null;
        
        // 尝试获取捆绑包图标
        if (rawBundle.ExtraData && rawBundle.ExtraData.DisplayIcon) {
            bundleIcon = rawBundle.ExtraData.DisplayIcon;
        } else if (rawBundle.DisplayIcon) {
            bundleIcon = rawBundle.DisplayIcon;
        }
        
        // 如果没有图标，尝试从Valorant API获取
        if (!bundleIcon) {
            try {
                const response = await fetch(`https://valorant-api.com/v1/bundles/${bundleUuid}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.status === 200 && data.data) {
                        // 如果API返回了结果，使用它的名称和图标
                        bundleName = data.data.displayName || bundleName;
                        bundleIcon = data.data.displayIcon || bundleIcon;
                    }
                }
            } catch (error) {
                console.error(`获取捆绑包数据从API失败: ${error.message}`);
            }
        }
        
        // 如果仍然没有图标，使用默认图标
        if (!bundleIcon) {
            bundleIcon = "https://media.valorant-api.com/bundles/placeholder.png";
        }
        
        // 处理捆绑包中的每个物品，获取详细信息
        const itemsWithDetails = await Promise.all((rawBundle.Items || []).map(async item => {
            const uuid = item.Item.ItemID;
            const type = item.Item.ItemTypeID;
            let name = "未知物品";
            let icon = null;
            
            // 获取皮肤详情
            if (type === "e7c63390-eda7-46e0-bb7a-a6abdacd2433") { // 皮肤物品类型ID
                try {
                    // 尝试从Valorant API获取皮肤信息
                    const response = await fetch(`https://valorant-api.com/v1/weapons/skinlevels/${uuid}`);
                    if (response.ok) {
                        const data = await response.json();
                        if (data.status === 200 && data.data) {
                            name = data.data.displayName || name;
                            icon = data.data.displayIcon || data.data.fullRender || null;
                        }
                    }
                } catch (error) {
                    console.error(`获取皮肤 ${uuid} 详情失败: ${error.message}`);
                }
            }
            
            // 如果没有图标，使用默认图标
            if (!icon) {
                icon = `https://media.valorant-api.com/weaponskinlevels/${uuid}/displayicon.png`;
            }
            
            return {
                uuid,
                type,
                name,
                icon,
                price: item.DiscountedPrice,
                basePrice: item.BasePrice,
                discount: item.DiscountPercent,
                amount: item.Item.Amount
            };
        }));
        
        // 返回格式化后的捆绑包数据
        return {
            uuid: bundleUuid,
            name: bundleName,
            icon: bundleIcon,
            items: itemsWithDetails,
            price: rawBundle.Price,
            basePrice: rawBundle.TotalBaseCost || rawBundle.Price,
            expires: Math.floor(Date.now() / 1000) + rawBundle.DurationRemainingInSeconds
        };
    } catch (error) {
        console.error(`格式化捆绑包失败: ${error.message}`);
        // 返回基本信息，避免前端崩溃
        return {
            uuid: rawBundle.DataAssetID || '未知ID',
            name: '加载失败的捆绑包',
            icon: "https://media.valorant-api.com/bundles/placeholder.png",
            items: [],
            price: rawBundle.Price || 0,
            basePrice: rawBundle.TotalBaseCost || rawBundle.Price || 0,
            expires: Math.floor(Date.now() / 1000) + (rawBundle.DurationRemainingInSeconds || 0)
        };
    }
};

/**
 * Format night market for display
 * @param {Object} bonusStore - Night market data from API
 * @returns {Promise<Object>} - Formatted night market
 */
const formatNightMarket = async (bonusStore) => {
    if (!bonusStore) return { offers: false };
    
    // 处理每个夜市皮肤的详细信息
    const offersWithDetails = await Promise.all(bonusStore.BonusStoreOffers.map(async offer => {
        const uuid = offer.Offer.OfferID;
        let name = "未知皮肤";
        let icon = null;
        
        // 尝试从Valorant API获取皮肤信息
        try {
            const response = await fetch(`https://valorant-api.com/v1/weapons/skinlevels/${uuid}?language=zh-CN`);
            if (response.ok) {
                const data = await response.json();
                if (data.status === 200 && data.data) {
                    name = data.data.displayName || name;
                    icon = data.data.displayIcon || data.data.fullRender || null;
                }
            }
        } catch (error) {
            console.error(`获取夜市皮肤 ${uuid} 详情失败: ${error.message}`);
        }
        
        // 如果没有图标，使用默认图标
        if (!icon) {
            icon = `https://media.valorant-api.com/weaponskinlevels/${uuid}/displayicon.png`;
        }
        
        return {
            uuid,
            name,
            icon,
            realPrice: offer.Offer.Cost[Object.keys(offer.Offer.Cost)[0]],
            nmPrice: offer.DiscountCosts[Object.keys(offer.DiscountCosts)[0]],
            percent: offer.DiscountPercent
        };
    }));
    
    return {
        offers: offersWithDetails,
        expires: Math.floor(Date.now() / 1000) + bonusStore.BonusStoreRemainingDurationInSeconds
    };
};

module.exports = {
    parseSetCookie,
    stringifyCookies,
    extractTokensFromUri,
    tokenExpiry,
    decodeToken,
    isMaintenance,
    getValorantVersion,
    formatDate,
    isSameDay,
    formatBundle,
    formatNightMarket,
    getRiotClientHeaders, // 导出新添加的函数
    userRegion           // 导出用户区域处理函数
};
