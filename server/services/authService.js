const fetch = require('node-fetch');
const config = require('../config');
const storage = require('../storage');
const { 
  parseSetCookie, 
  stringifyCookies, 
  extractTokensFromUri,
  tokenExpiry,
  decodeToken
} = require('../utils/riot');

/**
 * 用户类 - 表示一个已认证的Valorant用户
 */
class User {
  constructor({
    id,
    puuid,
    auth = {},
    username,
    region,
    authFailures = 0,
    lastFetchedData = 0
  }) {
    this.id = id;                     // 用户唯一ID
    this.puuid = puuid;               // Riot PUUID
    this.auth = auth;                 // 认证信息 (rso, idt, ent令牌)
    this.username = username;         // 游戏内用户名
    this.region = region;             // 游戏区域
    this.authFailures = authFailures; // 认证失败次数
    this.lastFetchedData = lastFetchedData; // 上次获取数据的时间戳
  }
}

/**
 * 根据ID和PUUID获取用户
 * @param {string} id - 用户ID
 * @param {string} [puuid] - 可选的PUUID (用于多账号场景)
 * @returns {Promise<User|null>} - 用户对象或null
 */
const getUser = async (id, puuid = null) => {
  const userData = await storage.getUser(id);
  if (!userData) return null;

  // 如果提供了PUUID，并且用户有多个账号，找到匹配的账号
  if (puuid && userData.accounts && userData.accounts.length > 0) {
    const account = userData.accounts.find(a => a.puuid === puuid);
    if (account) return new User(account);
  }

  // 否则返回主账号
  return new User(userData);
};

/**
 * 检查用户认证状态，如果令牌过期则刷新
 * @param {string} id - 用户ID
 * @param {string} [puuid] - 可选的PUUID
 * @returns {Promise<Object>} - 带有success字段的响应对象
 */
const authUser = async (id, puuid = null) => {
  // 获取用户
  const user = await getUser(id, puuid);
  if (!user || !user.auth || !user.auth.rso) return { success: false };

  // 检查令牌是否过期
  const rsoExpiry = tokenExpiry(user.auth.rso);
  if (rsoExpiry - Date.now() > 10_000) return { success: true, user };

  // 令牌已过期，尝试刷新
  return await refreshToken(id, puuid);
};

/**
 * 使用用户名和密码进行认证
 * @param {string} id - 用户ID
 * @param {string} username - Riot用户名
 * @param {string} password - Riot密码
 * @returns {Promise<Object>} - 认证结果
 */
const loginWithUsernamePassword = async (id, username, password) => {
  try {
    // 准备认证请求的cookies
    const cookieReq = await fetch(config.riotAPI.auth.authorization, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...config.riotClientHeaders
      },
      body: JSON.stringify({
        client_id: 'riot-client',
        nonce: '1',
        redirect_uri: 'http://localhost/redirect',
        response_type: 'token id_token',
        scope: 'openid link ban lol_region'
      })
    });

    if (cookieReq.status !== 200) {
      console.error(`Auth request cookies status code is ${cookieReq.status}`);
      return { success: false };
    }

    // 解析set-cookie头
    let cookies = parseSetCookie(cookieReq.headers.raw()['set-cookie']);

    // 发送认证请求
    const authReq = await fetch(config.riotAPI.auth.authorization, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': stringifyCookies(cookies),
        ...config.riotClientHeaders
      },
      body: JSON.stringify({
        type: 'auth',
        username: username,
        password: password,
        remember: true
      })
    });

    if (authReq.status !== 200) {
      console.error(`Auth status code is ${authReq.status}`);
      return { success: false };
    }

    // 更新cookies
    cookies = {
      ...cookies,
      ...parseSetCookie(authReq.headers.raw()['set-cookie'])
    };

    const authJson = await authReq.json();

    // 处理认证错误
    if (authJson.type === 'error') {
      if (authJson.error === 'auth_failure') {
        console.error('Authentication failure!', authJson);
      } else {
        console.error('Unknown auth error!', JSON.stringify(authJson, null, 2));
      }
      return { success: false };
    }

    // 处理双因素认证
    if (authJson.type === 'multifactor') {
      // 创建新用户，标记等待2FA
      const user = new User({ id });
      user.auth = {
        waiting2FA: Date.now(),
        cookies: cookies
      };

      if (config.user.storePasswords) {
        user.auth.login = username;
        user.auth.password = Buffer.from(password).toString('base64');
      }

      await storage.saveUser(user);
      return { 
        success: false, 
        mfa: true, 
        method: authJson.multifactor.method, 
        email: authJson.multifactor.email 
      };
    }

    // 处理成功响应
    if (authJson.type === 'response') {
      const user = await processAuthResponse(id, { 
        login: username, 
        password, 
        cookies 
      }, authJson.response.parameters.uri);
      
      await storage.saveUser(user);
      return { success: true, user };
    }

    return { success: false };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 验证双因素认证代码
 * @param {string} id - 用户ID
 * @param {string} code - 2FA代码
 * @returns {Promise<Object>} - 认证结果
 */
const verify2FACode = async (id, code) => {
  try {
    let user = await getUser(id);
    if (!user || !user.auth || !user.auth.waiting2FA || !user.auth.cookies) {
      return { success: false };
    }

    const req = await fetch(config.riotAPI.auth.authorization, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': stringifyCookies(user.auth.cookies),
        ...config.riotClientHeaders
      },
      body: JSON.stringify({
        type: 'multifactor',
        code: code.toString(),
        rememberDevice: true
      })
    });

    if (req.status !== 200) {
      console.error(`2FA status code is ${req.status}`);
      return { success: false };
    }

    user.auth = {
      ...user.auth,
      cookies: {
        ...user.auth.cookies,
        ...parseSetCookie(req.headers.raw()['set-cookie'])
      }
    };

    const json = await req.json();
    if (json.error === 'multifactor_attempt_failed' || json.type === 'error') {
      console.error('Authentication failure!', json);
      return { success: false };
    }

    // 处理认证响应
    const password = user.auth.password ? 
      Buffer.from(user.auth.password, 'base64').toString() : '';
    
    user = await processAuthResponse(id, { 
      login: user.auth.login, 
      password, 
      cookies: user.auth.cookies 
    }, json.response.parameters.uri, user);

    delete user.auth.waiting2FA;
    await storage.saveUser(user);

    return { success: true, user };
  } catch (error) {
    console.error('2FA verification error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 使用cookies进行认证
 * @param {string} id - 用户ID
 * @param {string} cookies - Cookie字符串
 * @returns {Promise<Object>} - 认证结果
 */
const loginWithCookies = async (id, cookies) => {
  try {
    console.log('开始通过Cookie登录...');
    
    // 解析Cookie字符串（如果传入的是字符串而不是对象）
    let cookieObj = cookies;
    if (typeof cookies === 'string') {
      cookieObj = {};
      // 首先确保处理多行cookie字符串
      const cleanCookieStr = cookies.replace(/\r?\n/g, ''); // 移除所有换行符
      cleanCookieStr.split(/;\s*/).forEach(part => {
        if (!part.trim()) return; // 跳过空部分
        
        // 安全地分割cookie
        const firstEqualIndex = part.indexOf('=');
        if (firstEqualIndex === -1) return; // 没有等号，跳过
        
        const name = part.substring(0, firstEqualIndex).trim();
        const value = part.substring(firstEqualIndex + 1);
        
        if (name) {
          cookieObj[name] = value;
        }
      });
    }
    
    // 只保留必要的Cookie，这样可以避免头部过长的问题
    const essentialCookies = ['ssid', 'sub', 'csid', 'clid', 'tdid'];
    const cleanCookiesObj = {};
    
    essentialCookies.forEach(name => {
      if (cookieObj[name]) {
        cleanCookiesObj[name] = cookieObj[name];
      }
    });
    
    // 如果没有找到任何必要的Cookie，返回错误
    if (Object.keys(cleanCookiesObj).length === 0) {
      console.log('没有找到必要的Cookie');
      return { success: false, error: '未找到必要的认证Cookie' };
    }
    
    // 转换成Cookie字符串
    const cleanCookiesStr = stringifyCookies(cleanCookiesObj);
    console.log('尝试使用清理后的Cookie登录...');
    
    // 使用SkinPeek的方法直接请求授权接口
    // 使用特殊的User-Agent绕过hCaptcha
    const customHeaders = {
      ...config.riotClientHeaders,
      'User-Agent': 'ShooterGame/13 Windows/10.0.19043.1.256.64bit'
    };
    
    console.log('尝试使用Cookie登录获取令牌...');
    
    // 使用authorize端点获取令牌
    const req = await fetch("https://auth.riotgames.com/authorize?redirect_uri=https%3A%2F%2Fplayvalorant.com%2Fopt_in&client_id=play-valorant-web-prod&response_type=token%20id_token&scope=account%20openid&nonce=1", {
      headers: {
        'Cookie': cleanCookiesStr,
        ...customHeaders
      },
      redirect: 'manual' // 不自动跟随重定向
    });
    
    // 检查状态码，应该是302或303（重定向）
    if (req.status !== 302 && req.status !== 303) {
      console.error(`Cookie重定向请求失败，状态码: ${req.status}`);
      return { success: false, error: '获取令牌失败' };
    }
    
    // 获取Location头部
    const location = req.headers.get('location');
    if (!location || location.startsWith('/login')) {
      return { success: false, error: 'Cookie无效或已过期' };
    }
    
    if (!location.includes('access_token=')) {
      console.error('令牌未在重定向中返回');
      return { success: false, error: '无法从响应中提取令牌' };
    }
    
    // 提取令牌并处理认证
    const [rso, idt] = extractTokensFromUri(location);
    if (!rso || !idt) {
      console.error('无法从重定向中提取令牌');
      return { success: false, error: '无法从响应中提取令牌' };
    }
    
    console.log('成功获取令牌，正在处理认证...');
    
    // 创建用户对象
    const user = new User({ id });
    user.auth = {
      rso: rso,
      idt: idt,
      cookies: cleanCookiesObj // 保存清理后的cookies，而不是所有cookies
    };
    
    // 从令牌获取PUUID
    user.puuid = decodeToken(rso).sub;
    
    // 解析令牌获取基本用户信息
    const tokenData = decodeToken(rso);
    if (tokenData.acct) {
      user.username = `${tokenData.acct.game_name}#${tokenData.acct.tag_line}`;
    } else {
      user.username = `玩家-${user.puuid.substring(0, 8)}`;
    }
    
    try {
      // 获取entitlements令牌
      console.log('获取entitlements令牌...');
      try {
        user.auth.ent = await getEntitlements(user);
        if (user.auth.ent === "limited-access") {
          console.error('获取到无效的entitlements令牌');
          return { success: false, error: '无法获取有效的entitlements令牌' };
        }
      } catch (error) {
        console.error('无法获取entitlements令牌:', error.message);
        return { success: false, error: '无法获取entitlements令牌' };
      }
      
      // 获取区域信息 - 但如果失败不要中断流程
      console.log('获取区域信息...');
      try {
        user.region = await getRegion(user);
      } catch (error) {
        console.warn('无法获取区域信息，使用默认区域:', error.message);
        user.region = "ap"; // 默认使用亚太区域
      }
      
      // 尝试获取更详细的用户信息 - 如果失败，上面已设置基本信息
      try {
        console.log('获取用户详细信息...');
        const userInfo = await getUserInfo(user);
        user.username = userInfo.username;
      } catch (error) {
        console.log('无法获取用户详细信息，使用令牌中的信息代替:', error.message);
      }
      
      user.lastFetchedData = Date.now();
      user.authFailures = 0;
      await storage.saveUser(user);
      
      console.log('认证成功，用户信息已保存');
      return { success: true, user };
    } catch (error) {
      console.error('获取用户信息或令牌失败:', error);
      return { success: false, error: '验证令牌有效性失败' };
    }
  } catch (error) {
    console.error('Cookie登录错误:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 刷新令牌
 * @param {string} id - 用户ID
 * @param {string} [puuid] - 可选的PUUID
 * @returns {Promise<Object>} - 刷新结果
 */
const refreshToken = async (id, puuid = null) => {
  try {
    console.log(`Refreshing token for ${id}...`);
    let response = { success: false };
    
    const user = await getUser(id, puuid);
    if (!user) return response;

    // 尝试使用cookies刷新
    if (user.auth.cookies) {
      response = await loginWithCookies(id, stringifyCookies(user.auth.cookies));
    }
    
    // 尝试使用用户名和密码刷新
    if (!response.success && user.auth.login && user.auth.password) {
      const password = Buffer.from(user.auth.password, 'base64').toString();
      response = await loginWithUsernamePassword(id, user.auth.login, password);
    }

    // 如果所有刷新方法都失败，并且不是等待2FA或受限，则删除用户认证
    if (!response.success && !response.mfa && !response.rateLimit) {
      await deleteUserAuth(user);
    }

    return response;
  } catch (error) {
    console.error('Token refresh error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 处理认证响应
 * @param {string} id - 用户ID
 * @param {Object} authData - 认证数据 (login, password, cookies)
 * @param {string} redirect - 重定向URI
 * @param {User} [existingUser] - 可选的现有用户对象
 * @returns {Promise<User>} - 用户对象
 */
const processAuthResponse = async (id, authData, redirect, existingUser = null) => {
  // 创建用户对象或使用现有用户
  let user = existingUser || new User({ id });
  
  // 从重定向URI提取令牌
  const [rso, idt] = extractTokensFromUri(redirect);
  if (rso == null) {
    throw new Error("Riot servers didn't return an RSO token!");
  }

  // 设置认证信息
  user.auth = {
    ...user.auth,
    rso: rso,
    idt: idt,
  };

  // 根据配置保存cookies或用户名/密码
  if (authData.login && config.user.storePasswords && !user.auth.waiting2FA) {
    user.auth.login = authData.login;
    user.auth.password = Buffer.from(authData.password).toString('base64');
    delete user.auth.cookies;
  } else {
    user.auth.cookies = authData.cookies;
    delete user.auth.login;
    delete user.auth.password;
  }

  // 从令牌获取PUUID
  user.puuid = decodeToken(rso).sub;

  // 检查是否是现有账号
  const existingUserData = await storage.getUser(id);
  if (existingUserData && existingUserData.accounts) {
    const existingAccount = existingUserData.accounts.find(a => a.puuid === user.puuid);
    if (existingAccount) {
      user.username = existingAccount.username;
      user.region = existingAccount.region;
      if (existingAccount.auth) user.auth.ent = existingAccount.auth.ent;
    }
  }

  // 获取用户信息 - 尝试获取，但如果失败，使用令牌信息
  try {
    const userInfo = await getUserInfo(user);
    user.username = userInfo.username;
  } catch (error) {
    console.warn('获取用户信息失败，使用令牌信息:', error.message);
    // 从令牌中提取基本用户信息
    const tokenData = decodeToken(rso);
    if (tokenData.acct) {
      user.username = `${tokenData.acct.game_name}#${tokenData.acct.tag_line}`;
    } else {
      user.username = `玩家-${user.puuid.substring(0, 8)}`;
    }
  }

  // 获取entitlements令牌
  if (!user.auth.ent) {
    try {
      user.auth.ent = await getEntitlements(user);
    } catch (error) {
      console.error('获取entitlements令牌失败:', error.message);
      throw error; // 将错误向上传递，而不是使用限制模式
    }
  }

  // 获取区域 - 如果失败，使用默认区域
  if (!user.region) {
    try {
      user.region = await getRegion(user);
    } catch (error) {
      console.warn('获取区域信息失败，使用默认区域:', error.message);
      user.region = "ap"; // 默认亚太区域
    }
  }

  user.lastFetchedData = Date.now();
  user.authFailures = 0;
  
  return user;
};

/**
 * 获取用户信息
 * @param {User} user - 用户对象
 * @returns {Promise<Object>} - 用户信息
 */
const getUserInfo = async (user) => {
  try {
    // 尝试使用特殊的User-Agent
    const customHeaders = {
      'Authorization': 'Bearer ' + user.auth.rso,
      'User-Agent': 'ShooterGame/13 Windows/10.0.19043.1.256.64bit'
    };
    
    const req = await fetch(config.riotAPI.auth.userInfo, {
      headers: customHeaders
    });

    if (req.status !== 200) {
      console.error(`User info status code is ${req.status}`);
      // 如果是403错误，尝试从令牌中解析用户信息
      if (req.status === 403) {
        const tokenData = decodeToken(user.auth.rso);
        if (tokenData.acct) {
          return {
            puuid: tokenData.sub,
            username: tokenData.acct.game_name && tokenData.acct.game_name + '#' + tokenData.acct.tag_line
          };
        }
      }
      throw new Error(`Failed to get user info: ${req.status}`);
    }

    const json = await req.json();
    if (json.acct) {
      return {
        puuid: json.sub,
        username: json.acct.game_name && json.acct.game_name + '#' + json.acct.tag_line
      };
    }
    
    throw new Error('Failed to get user info: Invalid response');
  } catch (error) {
    console.error('获取用户信息失败:', error.message);
    
    // 尝试从令牌解析基本信息作为备选方案
    try {
      const tokenData = decodeToken(user.auth.rso);
      if (tokenData && tokenData.sub) {
        return {
          puuid: tokenData.sub,
          username: tokenData.acct?.game_name ? 
            `${tokenData.acct.game_name}#${tokenData.acct.tag_line}` : 
            `玩家-${tokenData.sub.substring(0, 8)}`
        };
      }
    } catch (e) {
      console.error('无法从令牌中提取用户信息');
    }
    
    throw error;
  }
};

/**
 * 获取entitlements令牌
 * @param {User} user - 用户对象
 * @returns {Promise<string>} - entitlements令牌
 */
const getEntitlements = async (user) => {
  try {
    // 尝试使用特殊的User-Agent，与SkinPeek一致
    const customHeaders = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + user.auth.rso,
      'User-Agent': 'ShooterGame/13 Windows/10.0.19043.1.256.64bit'
    };
    
    const req = await fetch(config.riotAPI.auth.entitlements, {
      method: 'POST',
      headers: customHeaders
    });

    if (req.status !== 200) {
      console.error(`Entitlements status code is ${req.status}`);
      if (req.status === 403) {
        throw new Error(`无法获取entitlements令牌: 状态码403`);
      }
      throw new Error(`无法获取entitlements令牌: 状态码${req.status}`);
    }

    const json = await req.json();
    if (!json.entitlements_token) {
      throw new Error('Riot API返回的响应中没有entitlements_token');
    }
    
    return json.entitlements_token;
  } catch (error) {
    console.error('获取entitlements令牌失败:', error.message);
    throw error; // 将错误向上传递，而不是返回特殊值
  }
};

/**
 * 获取用户区域
 * @param {User} user - 用户对象
 * @returns {Promise<string>} - 区域代码
 */
const getRegion = async (user) => {
  try {
    // 使用特殊的User-Agent
    const customHeaders = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + user.auth.rso,
      'User-Agent': 'ShooterGame/13 Windows/10.0.19043.1.256.64bit'
    };
    
    const req = await fetch(config.riotAPI.auth.region, {
      method: 'PUT',
      headers: customHeaders,
      body: JSON.stringify({
        id_token: user.auth.idt
      })
    });

    if (req.status !== 200) {
      console.error(`Region status code is ${req.status}`);
      // 返回默认区域，允许用户继续登录
      if (req.status === 403) {
        console.log('获取区域信息返回403，使用默认区域');
        return "ap"; // 亚太区域作为默认
      }
      throw new Error(`Failed to get region: ${req.status}`);
    }

    const json = await req.json();
    return json.affinities.live;
  } catch (error) {
    console.error('获取区域信息失败:', error.message);
    
    // 返回一个默认区域，使用户能够登录
    return "ap"; // 亚太区域作为默认
  }
};

/**
 * 删除用户认证信息
 * @param {User} user - 用户对象
 * @returns {Promise<boolean>} - 是否成功
 */
const deleteUserAuth = async (user) => {
  user.auth = null;
  return await storage.saveUser(user);
};

module.exports = {
  User,
  getUser,
  authUser,
  loginWithUsernamePassword,
  verify2FACode,
  loginWithCookies,
  refreshToken,
  getUserInfo,
  getRegion,
  deleteUserAuth
};
