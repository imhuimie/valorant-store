import axios from 'axios';

const API_URL = '/api/shop';

/**
 * 获取每日商店物品
 * @returns {Promise<Object>} - 每日商店数据
 */
export const getDailyShop = async () => {
  try {
    const response = await axios.get(`${API_URL}/daily`);
    return response.data;
  } catch (error) {
    console.error('获取每日商店错误:', error);
    throw error;
  }
};

/**
 * 获取当前捆绑包
 * @returns {Promise<Object>} - 捆绑包数据
 */
export const getBundles = async () => {
  try {
    const response = await axios.get(`${API_URL}/bundles`);
    return response.data;
  } catch (error) {
    console.error('获取捆绑包错误:', error);
    throw error;
  }
};

/**
 * 获取夜市数据
 * @returns {Promise<Object>} - 夜市数据
 */
export const getNightMarket = async () => {
  try {
    const response = await axios.get(`${API_URL}/nightmarket`);
    return response.data;
  } catch (error) {
    console.error('获取夜市错误:', error);
    throw error;
  }
};

/**
 * 获取账户余额
 * @returns {Promise<Object>} - 余额数据
 */
export const getBalance = async () => {
  try {
    const response = await axios.get(`${API_URL}/balance`);
    return response.data;
  } catch (error) {
    console.error('获取余额错误:', error);
    throw error;
  }
};

/**
 * 获取皮肤价格数据
 * @returns {Promise<Object>} - 价格数据
 */
export const getPrices = async () => {
  try {
    const response = await axios.get(`${API_URL}/prices`);
    return response.data;
  } catch (error) {
    console.error('获取价格错误:', error);
    throw error;
  }
};

/**
 * 获取皮肤完整数据
 * 将API返回的UUID数组转换为包含详细信息的对象
 * @param {Array} offers - 皮肤UUID数组
 * @returns {Promise<Array>} - 包含详细信息的皮肤数组
 */
export const getSkinDetails = async (offers) => {
  try {
    // 获取价格数据
    const pricesResponse = await getPrices();
    
    if (!pricesResponse.success) {
      throw new Error('获取价格失败');
    }
    
    const prices = pricesResponse.prices;
    
    // 理想情况下，我们会调用一个API来获取皮肤详情
    // 但目前我们只有UUID，所以只返回价格信息
    return offers.map(uuid => {
      return {
        uuid,
        price: prices[uuid] || null,
      };
    });
  } catch (error) {
    console.error('获取皮肤详情错误:', error);
    throw error;
  }
};
