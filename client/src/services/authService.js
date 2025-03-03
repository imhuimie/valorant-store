import axios from 'axios';

const API_URL = '/api/auth';

// 配置axios默认设置
axios.defaults.withCredentials = true;

/**
 * 使用用户名和密码登录
 * @param {string} username - 用户名
 * @param {string} password - 密码
 * @param {boolean} rememberMe - 是否记住登录状态
 * @returns {Promise<Object>} - 登录结果
 */
export const login = async (username, password, rememberMe = false) => {
  try {
    const response = await axios.post(`${API_URL}/login`, { username, password, rememberMe });
    return response.data;
  } catch (error) {
    console.error('登录错误:', error);
    throw error;
  }
};

/**
 * 提交双因素认证码
 * @param {string} code - 2FA验证码
 * @param {string} userId - 用户ID (如果会话丢失)
 * @param {boolean} rememberMe - 是否记住登录状态
 * @returns {Promise<Object>} - 验证结果
 */
export const verify2FA = async (code, userId = null, rememberMe = false) => {
  try {
    const response = await axios.post(`${API_URL}/2fa`, { code, userId, rememberMe });
    return response.data;
  } catch (error) {
    console.error('2FA验证错误:', error);
    throw error;
  }
};

/**
 * 使用cookies登录
 * @param {string} cookies - Cookie字符串
 * @param {boolean} rememberMe - 是否记住登录状态
 * @returns {Promise<Object>} - 登录结果
 */
export const loginWithCookies = async (cookies, rememberMe = false) => {
  try {
    const response = await axios.post(`${API_URL}/cookies`, { cookies, rememberMe });
    return response.data;
  } catch (error) {
    console.error('Cookie登录错误:', error);
    throw error;
  }
};

/**
 * 登出
 * @returns {Promise<Object>} - 登出结果
 */
export const logout = async () => {
  try {
    const response = await axios.post(`${API_URL}/logout`);
    return response.data;
  } catch (error) {
    console.error('登出错误:', error);
    throw error;
  }
};

/**
 * 检查用户是否已认证
 * @returns {Promise<Object>} - 认证状态
 */
export const checkAuth = async () => {
  try {
    const response = await axios.get(`${API_URL}/check`);
    return response.data;
  } catch (error) {
    console.error('认证检查错误:', error);
    return { success: false, authenticated: false };
  }
};
