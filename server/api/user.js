const express = require('express');
const router = express.Router();
const authService = require('../services/authService');

/**
 * @route GET /api/user/profile
 * @description 获取当前用户资料
 * @access Private
 */
router.get('/profile', async (req, res) => {
  try {
    const userId = req.session?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: '未认证，请先登录' 
      });
    }

    const authResult = await authService.authUser(userId);
    
    if (!authResult.success) {
      return res.status(401).json({ 
        success: false, 
        error: '认证已过期，请重新登录' 
      });
    }

    const user = authResult.user;
    
    res.json({
      success: true,
      user: {
        username: user.username,
        region: user.region,
        puuid: user.puuid,
        lastFetchedData: user.lastFetchedData
      }
    });
  } catch (error) {
    console.error('获取用户资料错误:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * @route DELETE /api/user/account
 * @description 删除用户账号和认证信息
 * @access Private
 */
router.delete('/account', async (req, res) => {
  try {
    const userId = req.session?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: '未认证，请先登录' 
      });
    }

    // 获取用户
    const user = await authService.getUser(userId);
    
    if (!user) {
      return res.json({ success: true });
    }

    // 删除用户认证信息
    await authService.deleteUserAuth(user);
    
    res.json({ success: true });
  } catch (error) {
    console.error('删除账号错误:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * @route GET /api/user/region
 * @description 获取用户区域
 * @access Private
 */
router.get('/region', async (req, res) => {
  try {
    const userId = req.session?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: '未认证，请先登录' 
      });
    }

    const authResult = await authService.authUser(userId);
    
    if (!authResult.success) {
      return res.status(401).json({ 
        success: false, 
        error: '认证已过期，请重新登录' 
      });
    }

    res.json({
      success: true,
      region: authResult.user.region
    });
  } catch (error) {
    console.error('获取用户区域错误:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * @route POST /api/user/refresh
 * @description 刷新用户令牌
 * @access Private
 */
router.post('/refresh', async (req, res) => {
  try {
    const userId = req.session?.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: '未认证，请先登录' 
      });
    }

    const refreshResult = await authService.refreshToken(userId);
    
    if (refreshResult.success) {
      res.json({
        success: true,
        user: {
          username: refreshResult.user.username,
          region: refreshResult.user.region,
          puuid: refreshResult.user.puuid
        }
      });
    } else {
      res.status(401).json({
        success: false,
        error: refreshResult.error || '令牌刷新失败，请重新登录'
      });
    }
  } catch (error) {
    console.error('刷新令牌错误:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

module.exports = router;
