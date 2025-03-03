/**
 * 提取皮肤数据工具
 * 
 * 此脚本用于从商店缓存文件中提取皮肤数据并更新到本地数据库
 * 用法: node extractShopData.js [缓存文件路径]
 */

const fs = require('fs');
const path = require('path');
const skinsManager = require('./skinsDatabaseManager');

// 默认缓存目录
const DEFAULT_CACHE_DIR = path.join(__dirname, '../data/cache');
const SKINS_DATA_PATH = path.join(__dirname, '../data/skins_data.json');

/**
 * 从目录中找到所有缓存文件
 * @param {string} dirPath - 缓存目录路径
 * @returns {Array<string>} 缓存文件路径数组
 */
function findCacheFiles(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      console.log(`目录 ${dirPath} 不存在`);
      return [];
    }

    const files = fs.readdirSync(dirPath);
    return files
      .filter(file => file.startsWith('shop_') && file.endsWith('.json'))
      .map(file => path.join(dirPath, file));
  } catch (error) {
    console.error('搜索缓存文件时出错:', error);
    return [];
  }
}

/**
 * 从缓存文件中提取皮肤数据
 * @param {string|null} cachePath - 指定的缓存文件路径
 */
async function extractFromCache(cachePath = null) {
  let cacheFiles = [];
  
  if (cachePath) {
    // 如果指定了具体文件
    if (fs.existsSync(cachePath)) {
      cacheFiles = [cachePath];
    } else {
      console.error(`指定的缓存文件 ${cachePath} 不存在`);
      return;
    }
  } else {
    // 查找所有缓存文件
    cacheFiles = findCacheFiles(DEFAULT_CACHE_DIR);
    if (cacheFiles.length === 0) {
      console.log('未找到任何商店缓存文件');
      return;
    }
  }

  // 确保skins_data.json存在
  if (!fs.existsSync(SKINS_DATA_PATH)) {
    console.log('初始化空的皮肤数据文件...');
    const initialData = skinsManager.loadSkinsData(); // 会创建默认结构
    skinsManager.saveSkinsData(initialData);
  }

  // 处理所有缓存文件
  let totalAdded = 0;
  console.log(`找到 ${cacheFiles.length} 个缓存文件...`);
  
  for (let i = 0; i < cacheFiles.length; i++) {
    const file = cacheFiles[i];
    console.log(`[${i+1}/${cacheFiles.length}] 处理文件: ${path.basename(file)}`);
    
    try {
      const addedCount = await skinsManager.extractSkinsFromCacheFile(file);
      totalAdded += addedCount;
      console.log(`  从文件 ${path.basename(file)} 中添加/更新了 ${addedCount} 个皮肤`);
    } catch (error) {
      console.error(`  处理文件 ${file} 时出错:`, error);
    }
  }

  const totalSkins = skinsManager.getSkinCount();
  console.log('\n完成! 统计数据:');
  console.log(`- 添加/更新的皮肤: ${totalAdded}`);
  console.log(`- 数据库中总皮肤数: ${totalSkins}`);
  console.log(`- 皮肤数据文件位置: ${SKINS_DATA_PATH}`);
}

// 主函数
async function main() {
  // 获取命令行参数
  const args = process.argv.slice(2);
  const specifiedPath = args[0];
  
  if (specifiedPath) {
    await extractFromCache(specifiedPath);
  } else {
    await extractFromCache();
  }
}

// 执行主函数
main().catch(error => {
  console.error('执行时发生错误:', error);
  process.exit(1);
});
