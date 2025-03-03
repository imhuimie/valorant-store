const express = require('express');
const router = express.Router();
const { updateSkinDatabase } = require('../utils/skinsDatabaseManager');
const skinsService = require('../services/skinsService');

/**
 * @route GET /api/skins/update-database
 * @description 更新皮肤数据库（仅限管理员）
 * @access Admin
 */
router.get('/update-database', async (req, res) => {
  try {
    // 检查是否为管理员（简单实现，实际应用中应当有更严格的验证）
    const userId = req.session?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '未认证，请先登录'
      });
    }
    
    console.log(`用户 ${userId} 请求更新皮肤数据库`);
    
    // 触发数据库更新
    const result = await updateSkinDatabase();
    
    if (result.success) {
      res.json({
        success: true,
        message: '皮肤数据库更新成功',
        stats: {
          newSkins: result.newSkins,
          updatedSkins: result.updatedSkins,
          totalSkins: result.totalSkins
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || '更新皮肤数据库失败'
      });
    }
  } catch (error) {
    console.error('更新皮肤数据库错误:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * @route GET /api/skins/check
 * @description 检查皮肤数据库状态
 * @access Private
 */
router.get('/check', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const SKINS_DATA_PATH = path.join(__dirname, '../data/skins_data.json');
    
    if (!fs.existsSync(SKINS_DATA_PATH)) {
      return res.json({
        success: true,
        exists: false,
        message: '皮肤数据库文件不存在'
      });
    }
    
    const stats = fs.statSync(SKINS_DATA_PATH);
    const fileSizeInMB = stats.size / (1024 * 1024);
    
    const rawData = fs.readFileSync(SKINS_DATA_PATH, 'utf8');
    const data = JSON.parse(rawData);
    
    res.json({
      success: true,
      exists: true,
      stats: {
        lastUpdated: data.last_updated || '未知',
        skinCount: Object.keys(data.skins || {}).length,
        weaponCount: Object.keys(data.weapons || {}).length,
        fileSize: fileSizeInMB.toFixed(2) + ' MB'
      }
    });
  } catch (error) {
    console.error('检查皮肤数据库错误:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * @route POST /api/skins/shop
 * @description 获取商店中皮肤的详细信息
 * @access Private
 */
router.post('/shop', async (req, res) => {
  try {
    const userId = req.session?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: '未认证，请先登录'
      });
    }
    
    const { uuids } = req.body;
    
    if (!uuids || !Array.isArray(uuids) || uuids.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请提供有效的皮肤UUID数组'
      });
    }
    
    console.log(`用户 ${userId} 请求获取 ${uuids.length} 个皮肤的详细信息`);
    
    // 使用skinsService获取皮肤详细信息
    const skins = await skinsService.getShopSkins(uuids, userId);
    
    res.json({
      success: true,
      skins
    });
  } catch (error) {
    console.error('获取皮肤详情错误:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

module.exports = router;
