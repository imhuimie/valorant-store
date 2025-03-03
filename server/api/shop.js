const express = require('express');
const router = express.Router();
const shopService = require('../services/shopService');

/**
 * @route GET /api/shop/daily
 * @description 获取每日商店皮肤
 * @access Private
 */
router.get('/daily', async (req, res) => {
  try {
    const userId = req.session?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: '未认证，请先登录' 
      });
    }

    const result = await shopService.getOffers(userId);
    
    if (result.success) {
      res.json({
        success: true,
        offers: result.offers,
        expires: result.expires,
        accessory: result.accessory,
        cached: result.cached || false
      });
    } else if (result.maintenance) {
      res.json({
        success: false,
        maintenance: true,
        error: '服务器维护中，请稍后再试'
      });
    } else {
      res.json({
        success: false,
        error: result.error || '获取商店数据失败'
      });
    }
  } catch (error) {
    console.error('获取每日商店错误:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * @route GET /api/shop/bundles
 * @description 获取当前捆绑包
 * @access Private
 */
router.get('/bundles', async (req, res) => {
  try {
    const userId = req.session?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: '未认证，请先登录' 
      });
    }

    const result = await shopService.getBundles(userId);
    
    if (result.success) {
      res.json({
        success: true,
        bundles: result.bundles
      });
    } else if (result.maintenance) {
      res.json({
        success: false,
        maintenance: true,
        error: '服务器维护中，请稍后再试'
      });
    } else {
      res.json({
        success: false,
        error: result.error || '获取捆绑包数据失败'
      });
    }
  } catch (error) {
    console.error('获取捆绑包错误:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * @route GET /api/shop/nightmarket
 * @description 获取夜市数据
 * @access Private
 */
router.get('/nightmarket', async (req, res) => {
  try {
    const userId = req.session?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: '未认证，请先登录' 
      });
    }

    const result = await shopService.getNightMarket(userId);
    
    if (result.success) {
      res.json({
        success: true,
        offers: result.offers,
        expires: result.expires
      });
    } else if (result.maintenance) {
      res.json({
        success: false,
        maintenance: true,
        error: '服务器维护中，请稍后再试'
      });
    } else {
      res.json({
        success: false,
        error: result.error || '获取夜市数据失败'
      });
    }
  } catch (error) {
    console.error('获取夜市错误:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * @route GET /api/shop/balance
 * @description 获取用户余额
 * @access Private
 */
router.get('/balance', async (req, res) => {
  try {
    const userId = req.session?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: '未认证，请先登录' 
      });
    }

    const result = await shopService.getBalance(userId);
    
    if (result.success) {
      res.json({
        success: true,
        vp: result.vp,
        rad: result.rad,
        kc: result.kc
      });
    } else if (result.maintenance) {
      res.json({
        success: false,
        maintenance: true,
        error: '服务器维护中，请稍后再试'
      });
    } else {
      res.json({
        success: false,
        error: result.error || '获取余额数据失败'
      });
    }
  } catch (error) {
    console.error('获取余额错误:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * @route GET /api/shop/prices
 * @description 获取皮肤价格
 * @access Private
 */
router.get('/prices', async (req, res) => {
  try {
    const userId = req.session?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: '未认证，请先登录' 
      });
    }

    const result = await shopService.getPrices(userId);
    
    if (result.success) {
      res.json({
        success: true,
        prices: result.prices,
        cached: result.cached || false
      });
    } else if (result.maintenance) {
      res.json({
        success: false,
        maintenance: true,
        error: '服务器维护中，请稍后再试'
      });
    } else {
      res.json({
        success: false,
        error: result.error || '获取价格数据失败'
      });
    }
  } catch (error) {
    console.error('获取价格错误:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

module.exports = router;
