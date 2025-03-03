const LocalStorageAdapter = require('./localAdapter');

/**
 * 存储管理器 - 负责管理数据存储和检索
 * 提供统一的接口，隐藏底层存储实现细节
 * 设计为在未来能够轻松切换到MySQL存储
 */
class StorageManager {
  /**
   * 创建存储管理器实例
   * @param {string} type - 存储类型，默认为'local'
   */
  constructor(type = 'local') {
    // 目前仅支持本地存储，未来会添加MySQL支持
    this.adapter = new LocalStorageAdapter();
  }

  // ===== 用户管理 =====

  /**
   * 获取用户数据
   * @param {string} id - 用户ID
   * @returns {Promise<Object|null>} - 用户数据或null
   */
  async getUser(id) {
    return await this.adapter.getUser(id);
  }

  /**
   * 保存用户数据
   * @param {Object} user - 用户数据
   * @returns {Promise<boolean>} - 是否成功
   */
  async saveUser(user) {
    return await this.adapter.saveUser(user);
  }

  /**
   * 删除用户数据
   * @param {string} id - 用户ID
   * @returns {Promise<boolean>} - 是否成功
   */
  async deleteUser(id) {
    return await this.adapter.deleteUser(id);
  }

  /**
   * 获取所有用户ID
   * @returns {Promise<Array<string>>} - 用户ID数组
   */
  async getAllUserIds() {
    return await this.adapter.getAllUserIds();
  }

  // ===== 缓存管理 =====

  /**
   * 获取缓存数据
   * @param {string} key - 缓存键名
   * @returns {Promise<Object|null>} - 缓存数据或null
   */
  async getCache(key) {
    return await this.adapter.getCache(key);
  }

  /**
   * 保存缓存数据
   * @param {string} key - 缓存键名
   * @param {Object} data - 缓存数据
   * @returns {Promise<boolean>} - 是否成功
   */
  async saveCache(key, data) {
    return await this.adapter.saveCache(key, data);
  }

  /**
   * 删除缓存数据
   * @param {string} key - 缓存键名
   * @returns {Promise<boolean>} - 是否成功
   */
  async deleteCache(key) {
    return await this.adapter.deleteCache(key);
  }

  // ===== 商店缓存 =====

  /**
   * 获取商店缓存
   * @param {string} puuid - 用户PUUID
   * @returns {Promise<Object|null>} - 商店缓存数据或null
   */
  async getShopCache(puuid) {
    return await this.adapter.getShopCache(puuid);
  }

  /**
   * 保存商店缓存
   * @param {string} puuid - 用户PUUID
   * @param {Object} data - 商店数据
   * @returns {Promise<boolean>} - 是否成功
   */
  async saveShopCache(puuid, data) {
    return await this.adapter.saveShopCache(puuid, data);
  }
}

// 创建并导出单例存储管理器实例
const storageManager = new StorageManager();
module.exports = storageManager;
