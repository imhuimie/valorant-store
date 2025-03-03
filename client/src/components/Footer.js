import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container footer-container">
        <div className="footer-info">
          <p>Valorant 每日商店查看应用</p>
          <p>基于 SkinPeek 项目开发</p>
          <p>此应用不隶属于 Riot Games</p>
        </div>
        <div className="footer-links">
          <p>
            <a href="https://github.com/giorgi-o/SkinPeek" target="_blank" rel="noopener noreferrer">
              SkinPeek 原始项目
            </a>
          </p>
          <p>
            <a href="https://playvalorant.com/" target="_blank" rel="noopener noreferrer">
              Valorant 官方网站
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
