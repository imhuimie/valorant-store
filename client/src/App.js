import React, { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

// 导入页面组件
import Bundles from './pages/Bundles';
import DailyShop from './pages/DailyShop';
import Login from './pages/Login';
import NightMarket from './pages/NightMarket';
import NotFound from './pages/NotFound';

// 导入其他组件
import Footer from './components/Footer';
import Header from './components/Header';
import LoadingScreen from './components/LoadingScreen';

// 导入API服务
import { checkAuth } from './services/authService';

// 创建需要认证的路由包装器
const PrivateRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 5; // 最大重试次数
  
  // 在本地存储中检查缓存的认证状态和记住我选项
  const cachedAuth = localStorage.getItem('authState');
  const isRemembered = localStorage.getItem('rememberMe') === 'true';
  
  useEffect(() => {
    // 先检查是否有缓存的认证状态，有则直接使用
    if (cachedAuth === 'true' && isAuthenticated === null) {
      setIsAuthenticated(true);
    }
    
    // 无论是否有缓存，都尝试验证认证状态
    const verifyAuth = async () => {
      try {
        const response = await checkAuth();
        setIsAuthenticated(response.authenticated);
        
        // 更新缓存的认证状态
        localStorage.setItem('authState', response.authenticated);
        
        // 重置重试计数
        if (retryCount > 0) setRetryCount(0);
      } catch (error) {
        console.error('认证检查失败:', error);
        
        // 如果有缓存的认证状态，并且用户选择了"记住我"，暂时相信它
        if (cachedAuth === 'true' && isRemembered) {
          console.log('使用缓存的认证状态，等待重试...');
          // 不设置isAuthenticated为false，保持当前状态
          
          // 如果重试次数未达到最大值，则在延迟后重试
          if (retryCount < maxRetries) {
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
            }, 1000 * (retryCount + 1)); // 逐渐增加重试间隔
          } else {
            // 达到最大重试次数，设置为未认证
            setIsAuthenticated(false);
            localStorage.removeItem('authState');
          }
        } else {
          // 没有缓存的认证状态，直接设置为未认证
          setIsAuthenticated(false);
        }
      }
    };
    
    verifyAuth();
  }, [retryCount]); // 依赖retryCount，这样当重试计数器更新时会重新执行
  
  if (isAuthenticated === null) {
    return <LoadingScreen />;
  }
  
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <div className="app">
      <Header />
      <main className="container">
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route 
            path="/" 
            element={
              <PrivateRoute>
                <DailyShop />
              </PrivateRoute>
            } 
          />
          
          <Route 
            path="/bundles" 
            element={
              <PrivateRoute>
                <Bundles />
              </PrivateRoute>
            } 
          />
          
          <Route 
            path="/nightmarket" 
            element={
              <PrivateRoute>
                <NightMarket />
              </PrivateRoute>
            } 
          />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
