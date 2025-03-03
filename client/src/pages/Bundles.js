import React, { useEffect, useState } from 'react';
import LoadingScreen from '../components/LoadingScreen';
import { getBundles } from '../services/shopService';
import './Bundles.css';

const Bundles = () => {
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchBundles = async () => {
      try {
        setLoading(true);
        
        const response = await getBundles();
        
        if (!response.success) {
          setError(response.error || '获取捆绑包数据失败');
          setLoading(false);
          return;
        }
        
        setBundles(response.bundles);
        setLoading(false);
      } catch (error) {
        console.error('获取捆绑包错误:', error);
        setError('无法加载捆绑包数据，请稍后再试');
        setLoading(false);
      }
    };
    
    fetchBundles();
  }, []);
  
  // 格式化价格显示
  const formatPrice = (price) => {
    if (!price && price !== 0) return '未知';
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  
  // 计算剩余时间
  const calculateTimeLeft = (expiryTimestamp) => {
    const now = Math.floor(Date.now() / 1000);
    const difference = expiryTimestamp - now;
    
    if (difference <= 0) return '已过期';
    
    const days = Math.floor(difference / (3600 * 24));
    const hours = Math.floor((difference % (3600 * 24)) / 3600);
    
    if (days > 0) {
      return `${days}天 ${hours}小时`;
    } else {
      const minutes = Math.floor((difference % 3600) / 60);
      return `${hours}小时 ${minutes}分钟`;
    }
  };
  
  if (loading) return <LoadingScreen />;
  
  if (error) {
    return (
      <div className="error-container">
        <h2>加载失败</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>重试</button>
      </div>
    );
  }
  
  return (
    <div className="bundles-page">
      <div className="page-header">
        <h1>当前捆绑包</h1>
      </div>
      
      {bundles.length > 0 ? (
        <div className="bundles-container">
          {bundles.map(bundle => (
            <div key={bundle.uuid} className="bundle-card">
              <div className="bundle-image">
                <img src={bundle.icon} alt={bundle.name} onError={(e) => {
                  e.target.src = "https://via.placeholder.com/512x256?text=图片加载失败";
                }} />
              </div>
              
              <div className="bundle-info">
                <h2 className="bundle-name">{bundle.name || '未知捆绑包'}</h2>
                
                <div className="bundle-price">
                  <div className="price">
                    <span className="price-label">价格:</span>
                    <span className="price-value">{formatPrice(bundle.price)} VP</span>
                  </div>
                  
                  <div className="expiry">
                    <span className="expiry-label">剩余时间:</span>
                    <span className="expiry-value">{calculateTimeLeft(bundle.expires)}</span>
                  </div>
                </div>
                
                <div className="bundle-items">
                  <h3>包含物品 ({bundle.items ? bundle.items.length : 0})</h3>
                  {bundle.items && bundle.items.length > 0 ? (
                    <ul className="items-list">
                      {bundle.items.map((item, index) => (
                        <li key={index} className="bundle-item">
                          <div className="item-img-container">
                            <img src={item.icon} alt={item.name} className="item-img" onError={(e) => {
                              e.target.src = "https://via.placeholder.com/64?text=图片";
                            }} />
                          </div>
                          <span className="item-name">{item.name || item.uuid}</span>
                          <span className="item-price">{formatPrice(item.price)} VP</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="no-items">没有可用的物品信息</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-bundles">
          <p>当前没有可用的捆绑包</p>
        </div>
      )}
    </div>
  );
};

export default Bundles;
