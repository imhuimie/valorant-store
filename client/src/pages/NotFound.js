import React from 'react';
import { Link } from 'react-router-dom';
import './NotFound.css';

const NotFound = () => {
  return (
    <div className="not-found">
      <div className="not-found-content">
        <h1>404</h1>
        <h2>页面未找到</h2>
        <p>您尝试访问的页面不存在或已被移除。</p>
        <Link to="/" className="home-link">返回首页</Link>
      </div>
    </div>
  );
};

export default NotFound;
