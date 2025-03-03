import React from 'react';
import './LoadingScreen.css';

const LoadingScreen = () => {
  return (
    <div className="loading-screen">
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
      <p className="loading-text">加载中...</p>
    </div>
  );
};

export default LoadingScreen;
