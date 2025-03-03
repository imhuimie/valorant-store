const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// Import routes
const authRoutes = require('./api/auth');
const shopRoutes = require('./api/shop');
const userRoutes = require('./api/user');
const skinsRoutes = require('./api/skins');

// 导入皮肤数据库管理器
const { updateSkinDatabase } = require('./utils/skinsDatabaseManager');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Ensure data directories exist
const usersDir = path.join(__dirname, 'data/users');
const cacheDir = path.join(__dirname, 'data/cache');
if (!fs.existsSync(usersDir)) fs.mkdirSync(usersDir, { recursive: true });
if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session setup
app.use(session({
  secret: process.env.SESSION_SECRET || 'valorant-shop-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
  }
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/user', userRoutes);
app.use('/api/skins', skinsRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// Start server
app.listen(PORT, async () => {
  console.log(`服务器运行在端口 ${PORT}`);
  
  // 服务器启动后自动更新皮肤数据库
  console.log('正在初始化皮肤数据库...');
  try {
    const result = await updateSkinDatabase();
    if (result.success) {
      console.log(`皮肤数据库初始化成功! 添加了 ${result.newSkins} 个新皮肤，更新了 ${result.updatedSkins} 个现有皮肤。`);
      console.log(`当前数据库共有 ${result.totalSkins} 个皮肤。`);
    } else {
      console.error('皮肤数据库初始化失败:', result.error);
    }
  } catch (error) {
    console.error('皮肤数据库初始化过程中出错:', error);
  }
});

module.exports = app;
