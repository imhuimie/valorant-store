const fs = require('fs');
const path = require('path');

class LocalStorageAdapter {
  constructor() {
    this.usersDir = path.join(__dirname, '../data/users');
    this.cacheDir = path.join(__dirname, '../data/cache');
    
    // 确保目录存在
    if (!fs.existsSync(this.usersDir)) fs.mkdirSync(this.usersDir, { recursive: true });
    if (!fs.existsSync(this.cacheDir)) fs.mkdirSync(this.cacheDir, { recursive: true });
  }

  /**
   * 获取用户数据
   * @param {string} id - 用户ID
   * @returns {Object|null} - 用户数据或null
   */
  async getUser(id) {
    try {
      const filePath = path.join(this.usersDir, `${id}.json`);
      if (!fs.existsSync(filePath)) return null;
      
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to get user:', error);
      return null;
    }
  }

  /**
   * 保存用户数据
   * @param {Object} user - 用户数据
   * @returns {boolean} - 是否成功
   */
  async saveUser(user) {
    try {
      if (!user || !user.id) throw new Error('Invalid user data');
      
      const filePath = path.join(this.usersDir, `${user.id}.json`);
      fs.writeFileSync(filePath, JSON.stringify(user, null, 2));
      return true;
    } catch (error) {
      console.error('Failed to save user:', error);
      return false;
    }
  }

  /**
   * 删除用户数据
   * @param {string} id - 用户ID
   * @returns {boolean} - 是否成功
   */
  async deleteUser(id) {
    try {
      const filePath = path.join(this.usersDir, `${id}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return true;
    } catch (error) {
      console.error('Failed to delete user:', error);
      return false;
    }
  }

  /**
   * 获取所有用户ID
   * @returns {Array<string>} - 用户ID数组
   */
  async getAllUserIds() {
    try {
      return fs.readdirSync(this.usersDir)
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));
    } catch (error) {
      console.error('Failed to get all user IDs:', error);
      return [];
    }
  }

  /**
   * 获取缓存数据
   * @param {string} key - 缓存键名
   * @returns {Object|null} - 缓存数据或null
   */
  async getCache(key) {
    try {
      const filePath = path.join(this.cacheDir, `${key}.json`);
      if (!fs.existsSync(filePath)) return null;
      
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Failed to get cache for ${key}:`, error);
      return null;
    }
  }

  /**
   * 保存缓存数据
   * @param {string} key - 缓存键名
   * @param {Object} data - 缓存数据
   * @returns {boolean} - 是否成功
   */
  async saveCache(key, data) {
    try {
      if (!key || !data) throw new Error('Invalid cache data');
      
      const filePath = path.join(this.cacheDir, `${key}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error(`Failed to save cache for ${key}:`, error);
      return false;
    }
  }

  /**
   * 删除缓存数据
   * @param {string} key - 缓存键名
   * @returns {boolean} - 是否成功
   */
  async deleteCache(key) {
    try {
      const filePath = path.join(this.cacheDir, `${key}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return true;
    } catch (error) {
      console.error(`Failed to delete cache for ${key}:`, error);
      return false;
    }
  }

  /**
   * 获取商店缓存
   * @param {string} puuid - 用户PUUID
   * @returns {Object|null} - 商店缓存数据或null
   */
  async getShopCache(puuid) {
    try {
      const filePath = path.join(this.cacheDir, `shop_${puuid}.json`);
      if (!fs.existsSync(filePath)) return null;
      
      const data = fs.readFileSync(filePath, 'utf8');
      const shopCache = JSON.parse(data);
      
      // 检查是否过期
      const now = Math.floor(Date.now() / 1000);
      if (shopCache.offers && shopCache.offers.expires > now) {
        return shopCache;
      }
      
      return null;
    } catch (error) {
      console.error(`Failed to get shop cache for ${puuid}:`, error);
      return null;
    }
  }

  /**
   * 保存商店缓存
   * @param {string} puuid - 用户PUUID
   * @param {Object} data - 商店数据
   * @returns {boolean} - 是否成功
   */
  async saveShopCache(puuid, data) {
    try {
      if (!puuid || !data) throw new Error('Invalid shop cache data');
      
      const filePath = path.join(this.cacheDir, `shop_${puuid}.json`);
      fs.writeFileSync(filePath, JSON.stringify({
        ...data,
        timestamp: Date.now()
      }, null, 2));
      return true;
    } catch (error) {
      console.error(`Failed to save shop cache for ${puuid}:`, error);
      return false;
    }
  }
}

module.exports = LocalStorageAdapter;
