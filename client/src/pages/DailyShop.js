import axios from 'axios';
import React, { useEffect, useState } from 'react';
import LoadingScreen from '../components/LoadingScreen';
import { getDailyShop } from '../services/shopService';
import './DailyShop.css';

const DailyShop = () => {
  const [skins, setSkins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expires, setExpires] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  
  // 获取商店数据
  useEffect(() => {
    const fetchShopData = async () => {
      try {
        setLoading(true);
        
        // 获取每日商店数据
        const shopResponse = await getDailyShop();
        
        if (!shopResponse.success) {
          setError(shopResponse.error || '获取商店数据失败');
          setLoading(false);
          return;
        }
        
        // 设置过期时间
        setExpires(shopResponse.expires);
        
        // 获取皮肤的详细信息
        const offers = shopResponse.offers;
        
        // 使用 /api/skins/shop 接口获取皮肤详情
        try {
          const skinsResponse = await axios.post('/api/skins/shop', { uuids: offers });
          
          if (skinsResponse.data.success) {
            setSkins(skinsResponse.data.skins);
          } else {
            throw new Error(skinsResponse.data.error || '获取皮肤详情失败');
          }
        } catch (skinError) {
          console.error('获取皮肤详情错误:', skinError);
          // 如果获取详情失败，使用默认方式展示
          const skinsData = offers.map(uuid => ({
            uuid,
            name: '未知皮肤',
            icon: `https://valorant-api.com/v1/weapons/skinlevels/${uuid}/displayicon.png`,
            price: null
          }));
          setSkins(skinsData);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('获取商店数据错误:', error);
        setError('无法加载商店数据，请稍后再试');
        setLoading(false);
      }
    };
    
    fetchShopData();
  }, []);
  
  // 计算剩余时间
  useEffect(() => {
    if (!expires) return;
    
    const calculateTimeLeft = () => {
      const now = Math.floor(Date.now() / 1000);
      const difference = expires - now;
      
      if (difference <= 0) {
        setTimeLeft(null);
        // 商店已重置，应刷新数据
        window.location.reload();
        return;
      }
      
      const hours = Math.floor(difference / 3600);
      const minutes = Math.floor((difference % 3600) / 60);
      const seconds = difference % 60;
      
      setTimeLeft({
        hours: hours.toString().padStart(2, '0'),
        minutes: minutes.toString().padStart(2, '0'),
        seconds: seconds.toString().padStart(2, '0')
      });
    };
    
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    
    return () => clearInterval(timer);
  }, [expires]);
  
  // 格式化价格显示
  const formatPrice = (price) => {
    if (!price) return '未知';
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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
    <div className="daily-shop">
      <div className="shop-header">
        <h1>每日商店</h1>
        {timeLeft && (
          <div className="shop-timer">
            <span>重置倒计时: </span>
            <span className="time">{timeLeft.hours}:{timeLeft.minutes}:{timeLeft.seconds}</span>
          </div>
        )}
      </div>
      
      <div className="skins-grid">
        {skins.map(skin => (
          <div key={skin.uuid} className="skin-card">
            <div className="skin-image">
              <img src={skin.icon} alt={skin.name} onError={(e) => {
                e.target.src = "https://via.placeholder.com/512x256?text=图片加载失败";
              }} />
            </div>
            <div className="skin-info">
              <h3 className="skin-name">{skin.name}</h3>
              <div className="skin-price">
                <span className="price-label">价格:</span>
                <span className="price-value">{formatPrice(skin.price)} VP</span>
              </div>
              {skin.weapon && skin.weapon.name && (
                <div className="skin-weapon">
                  <span className="weapon-label">武器:</span>
                  <span className="weapon-value">{skin.weapon.name}</span>
                </div>
              )}
              {skin.rarity && skin.rarity.name && (
                <div className="skin-rarity">
                  <span className="rarity-label">等级:</span>
                  <span className="rarity-value">{skin.rarity.name}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {skins.length === 0 && (
        <div className="no-skins">
          <p>今日商店中没有可用的皮肤</p>
        </div>
      )}
    </div>
  );
};

export default DailyShop;
