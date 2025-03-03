import React, { useEffect, useState } from 'react';
import LoadingScreen from '../components/LoadingScreen';
import { getNightMarket, getPrices } from '../services/shopService';
import './NightMarket.css';

const NightMarket = () => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expires, setExpires] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [hasNightMarket, setHasNightMarket] = useState(true);
  
  useEffect(() => {
    const fetchNightMarket = async () => {
      try {
        setLoading(true);
        
        // 获取夜市数据
        const response = await getNightMarket();
        
        if (!response.success) {
          setError(response.error || '获取夜市数据失败');
          setLoading(false);
          return;
        }
        
        // 检查夜市是否存在
        if (!response.offers) {
          setHasNightMarket(false);
          setLoading(false);
          return;
        }
        
        // 获取价格数据
        const pricesResponse = await getPrices();
        const prices = pricesResponse.success ? pricesResponse.prices : {};
        
        // 处理皮肤数据 - 从服务器获取名称和图片
        const nightMarketOffers = response.offers.map(offer => ({
          uuid: offer.uuid,
          regularPrice: offer.realPrice,
          discountPrice: offer.nmPrice,
          discountPercent: offer.percent,
          imageUrl: offer.icon || `https://valorant-api.com/v1/weapons/skinlevels/${offer.uuid}/displayicon`,
          name: offer.name || offer.uuid
        }));
        
        setOffers(nightMarketOffers);
        setExpires(response.expires);
        setLoading(false);
      } catch (error) {
        console.error('获取夜市数据错误:', error);
        setError('无法加载夜市数据，请稍后再试');
        setLoading(false);
      }
    };
    
    fetchNightMarket();
  }, []);
  
  // 计算剩余时间
  useEffect(() => {
    if (!expires) return;
    
    const calculateTimeLeft = () => {
      const now = Math.floor(Date.now() / 1000);
      const difference = expires - now;
      
      if (difference <= 0) {
        setTimeLeft(null);
        // 夜市已过期，应刷新数据
        window.location.reload();
        return;
      }
      
      const days = Math.floor(difference / (24 * 3600));
      const hours = Math.floor((difference % (24 * 3600)) / 3600);
      const minutes = Math.floor((difference % 3600) / 60);
      const seconds = difference % 60;
      
      setTimeLeft({
        days: days.toString().padStart(2, '0'),
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
    if (!price && price !== 0) return '未知';
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
  
  if (!hasNightMarket) {
    return (
      <div className="night-market-unavailable">
        <h1>夜市目前不可用</h1>
        <p>夜市是限时活动，仅在特定时间开放。请稍后再来查看！</p>
      </div>
    );
  }
  
  return (
    <div className="night-market">
      <div className="night-market-header">
        <h1>夜市特惠</h1>
        {timeLeft && (
          <div className="timer">
            <span>剩余时间: </span>
            <div className="countdown">
              <div className="time-unit">
                <span className="value">{timeLeft.days}</span>
                <span className="label">天</span>
              </div>
              <div className="time-separator">:</div>
              <div className="time-unit">
                <span className="value">{timeLeft.hours}</span>
                <span className="label">时</span>
              </div>
              <div className="time-separator">:</div>
              <div className="time-unit">
                <span className="value">{timeLeft.minutes}</span>
                <span className="label">分</span>
              </div>
              <div className="time-separator">:</div>
              <div className="time-unit">
                <span className="value">{timeLeft.seconds}</span>
                <span className="label">秒</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="offers-grid">
        {offers.map(offer => (
          <div key={offer.uuid} className="night-market-card">
            <div className="discount-badge">-{offer.discountPercent}%</div>
            <div className="skin-image">
              <img src={offer.imageUrl} alt={offer.name} onError={(e) => {
                e.target.src = "https://via.placeholder.com/512x256?text=图片加载失败";
              }} />
            </div>
            <div className="skin-info">
              <h3 className="skin-name">{offer.name}</h3>
              <div className="price-container">
                <div className="original-price">{formatPrice(offer.regularPrice)} VP</div>
                <div className="discount-price">{formatPrice(offer.discountPrice)} VP</div>
              </div>
              <div className="savings">
                节省 {formatPrice(offer.regularPrice - offer.discountPrice)} VP
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NightMarket;
