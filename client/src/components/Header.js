import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { logout } from '../services/authService';
import './Header.css';

const Header = () => {
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('登出错误:', error);
    }
  };
  
  return (
    <header className="header">
      <div className="container header-container">
        <div className="logo">
          <Link to="/">VALORANT 每日商店</Link>
        </div>
        
        <nav className="nav">
          <ul>
            <li>
              <Link to="/">每日商店</Link>
            </li>
            <li>
              <Link to="/bundles">捆绑包</Link>
            </li>
            <li>
              <Link to="/nightmarket">夜市</Link>
            </li>
          </ul>
        </nav>
        
        <div className="auth-actions">
          <button onClick={handleLogout} className="logout-btn">
            登出
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
