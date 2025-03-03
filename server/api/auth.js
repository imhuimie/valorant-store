const express = require('express');
const router = express.Router();
const authService = require('../services/authService');

/**
 * @route POST /api/auth/login
 * @description 使用用户名和密码登录
 * @access Public
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password, rememberMe } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: '用户名和密码不能为空' 
      });
    }

    // 根据rememberMe设置会话cookie过期时间
    if (rememberMe) {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30天
    } else {
      req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // 1天
    }

    // 为每个会话生成一个唯一ID
    const userId = req.session?.id || Date.now().toString();
    
    const result = await authService.loginWithUsernamePassword(userId, username, password);
    
    if (result.success) {
      // 登录成功
      res.json({
        success: true,
        user: {
          username: result.user.username,
          region: result.user.region,
          puuid: result.user.puuid
        }
      });
    } else if (result.mfa) {
      // 需要双因素认证
      res.json({
        success: false,
        mfa: true,
        method: result.method,
        email: result.email
      });
    } else {
      // 登录失败
      res.json({
        success: false,
        error: result.error || '登录失败，请检查用户名和密码'
      });
    }
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * @route POST /api/auth/2fa
 * @description 验证双因素认证代码
 * @access Public
 */
router.post('/2fa', async (req, res) => {
  try {
    const { code, rememberMe } = req.body;
    const userId = req.session?.id || req.body.userId;
    
    // 根据rememberMe设置会话cookie过期时间
    if (rememberMe) {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30天
    } else {
      req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // 1天
    }
    
    if (!code) {
      return res.status(400).json({
        success: false,
        error: '验证码不能为空'
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: '无效的会话'
      });
    }

    const result = await authService.verify2FACode(userId, code);
    
    if (result.success) {
      res.json({
        success: true,
        user: {
          username: result.user.username,
          region: result.user.region,
          puuid: result.user.puuid
        }
      });
    } else {
      res.json({
        success: false,
        error: result.error || '验证码无效'
      });
    }
  } catch (error) {
    console.error('2FA验证错误:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * @route POST /api/auth/cookies
 * @description 使用cookies登录
 * @access Public
 */
router.post('/cookies', async (req, res) => {
  try {
    const { cookies, rememberMe } = req.body;
    const userId = req.session?.id || Date.now().toString();
    
    // 根据rememberMe设置会话cookie过期时间
    if (rememberMe) {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30天
    } else {
      req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // 1天
    }
    
    if (!cookies) {
      return res.status(400).json({
        success: false,
        error: 'Cookies不能为空'
      });
    }

    const result = await authService.loginWithCookies(userId, cookies);
    
    if (result.success) {
      res.json({
        success: true,
        user: {
          username: result.user.username,
          region: result.user.region,
          puuid: result.user.puuid
        }
      });
    } else {
      res.json({
        success: false,
        error: result.error || '登录失败，Cookies可能已过期'
      });
    }
  } catch (error) {
    console.error('Cookies登录错误:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * @route POST /api/auth/logout
 * @description 登出当前用户
 * @access Public
 */
router.post('/logout', async (req, res) => {
  try {
    const userId = req.session?.id;
    
    if (!userId) {
      return res.json({ success: true });
    }

    // 获取用户
    const user = await authService.getUser(userId);
    
    if (!user) {
      return res.json({ success: true });
    }

    // 删除认证信息
    await authService.deleteUserAuth(user);
    
    res.json({ success: true });
  } catch (error) {
    console.error('登出错误:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * @route GET /api/auth/check
 * @description 检查当前用户的认证状态
 * @access Public
 */
router.get('/check', async (req, res) => {
  try {
    const userId = req.session?.id;
    
    if (!userId) {
      return res.json({ success: false, authenticated: false });
    }

    const result = await authService.authUser(userId);
    
    if (result.success) {
      res.json({
        success: true,
        authenticated: true,
        user: {
          username: result.user.username,
          region: result.user.region,
          puuid: result.user.puuid
        }
      });
    } else {
      res.json({
        success: true,
        authenticated: false
      });
    }
  } catch (error) {
    console.error('认证检查错误:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

module.exports = router;
