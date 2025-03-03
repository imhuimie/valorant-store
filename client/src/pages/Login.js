import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, loginWithCookies, verify2FA } from '../services/authService';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  
  // 登录表单状态
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [cookies, setCookies] = useState('');
  const [loginMethod, setLoginMethod] = useState('credentials'); // 'credentials' 或 'cookies'
  const [rememberMe, setRememberMe] = useState(true); // 默认选中"记住我"
  
  // 2FA (双因素认证) 状态
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorEmail, setTwoFactorEmail] = useState('');
  const [userId, setUserId] = useState(null);
  
  // 错误和加载状态
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // 处理表单提交
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      let response;
      
      if (loginMethod === 'credentials') {
        // 使用用户名密码登录
        if (!username || !password) {
          setError('请输入用户名和密码');
          setLoading(false);
          return;
        }
        
        response = await login(username, password, rememberMe);
      } else {
        // 使用cookies登录
        if (!cookies) {
          setError('请输入Cookies');
          setLoading(false);
          return;
        }
        
        response = await loginWithCookies(cookies, rememberMe);
      }
      
      if (response.success) {
        // 登录成功，保存认证状态到本地存储
        localStorage.setItem('authState', 'true');
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
        }
        // 重定向到首页
        navigate('/');
      } else if (response.mfa) {
        // 需要双因素认证
        setShowTwoFactor(true);
        setTwoFactorEmail(response.email);
        setUserId(response.userId);
      } else {
        // 登录失败
        setError(response.error || '登录失败，请检查您的凭据');
      }
    } catch (error) {
      console.error('登录过程中发生错误:', error);
      setError('登录过程中发生错误，请稍后再试');
    } finally {
      setLoading(false);
    }
  };
  
  // 处理2FA验证码提交
  const handleTwoFactorSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (!twoFactorCode) {
        setError('请输入验证码');
        setLoading(false);
        return;
      }
      
      const response = await verify2FA(twoFactorCode, userId, rememberMe);
      
      if (response.success) {
        // 2FA验证成功，保存认证状态到本地存储
        localStorage.setItem('authState', 'true');
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
        }
        // 重定向到首页
        navigate('/');
      } else {
        // 2FA验证失败
        setError(response.error || '验证码无效，请重试');
      }
    } catch (error) {
      console.error('2FA验证过程中发生错误:', error);
      setError('验证过程中发生错误，请稍后再试');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>VALORANT 每日商店</h1>
          <p>登录以查看您的商店</p>
        </div>
        
        {showTwoFactor ? (
          // 显示2FA表单
          <form className="login-form" onSubmit={handleTwoFactorSubmit}>
            <div className="form-group">
              <label>验证码已发送至: {twoFactorEmail}</label>
              <input
                type="text"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                placeholder="输入验证码"
                maxLength="6"
              />
            </div>
            
            {error && <div className="error-message">{error}</div>}
            
            <button type="submit" disabled={loading}>
              {loading ? '验证中...' : '验证'}
            </button>
          </form>
        ) : (
          // 显示登录表单
          <>
            <div className="login-tabs">
              <button 
                className={loginMethod === 'credentials' ? 'active' : ''}
                onClick={() => setLoginMethod('credentials')}
              >
                用户名/密码
              </button>
              <button 
                className={loginMethod === 'cookies' ? 'active' : ''}
                onClick={() => setLoginMethod('cookies')}
              >
                Cookies
              </button>
            </div>
            
            <form className="login-form" onSubmit={handleSubmit}>
              {loginMethod === 'credentials' ? (
                // 用户名密码登录表单
                <>
                  <div className="form-group">
                    <label>Riot 用户名</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="输入用户名"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>密码</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="输入密码"
                    />
                  </div>
                  
                  <div className="form-group checkbox-group">
                    <label className="checkbox-container">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      <span className="checkmark"></span>
                      记住我（保持登录状态）
                    </label>
                  </div>
                </>
              ) : (
                // Cookies登录表单
                <div className="form-group">
                  <label>Riot Cookie字符串</label>
                  <textarea
                    value={cookies}
                    onChange={(e) => setCookies(e.target.value)}
                    placeholder="粘贴您的Cookies"
                    rows="5"
                  />
                  <div className="help-text">
                    <a href="https://github.com/giorgi-o/SkinPeek/wiki/How-to-get-your-Riot-cookies" target="_blank" rel="noopener noreferrer">
                      如何获取您的Cookies? (英文)
                    </a>
                  </div>
                  
                  <div className="form-group checkbox-group">
                    <label className="checkbox-container">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      <span className="checkmark"></span>
                      记住我（保持登录状态）
                    </label>
                  </div>
                </div>
              )}
              
              {error && <div className="error-message">{error}</div>}
              
              <button type="submit" disabled={loading}>
                {loading ? '登录中...' : '登录'}
              </button>
            </form>
          </>
        )}
        
        <div className="login-footer">
          <p className="disclaimer">
            此应用程序仅在本地存储您的凭据，并且只将它们发送到Riot官方服务器。
          </p>
          <p className="disclaimer">
            此应用不隶属于Riot Games，使用Riot API是安全的。
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
