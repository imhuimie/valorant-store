# Valorant 商店应用

一个方便玩家查看 Valorant 游戏内皮肤商店的网页应用，无需打开游戏即可查看每日商店、捆绑包和夜市。

![Valorant Shop App Preview](https://your-screenshot-url-here.png)

## ✨ 功能特点

- **每日商店** - 查看每日更新的四个皮肤及其价格
- **捆绑包** - 浏览当前可用的皮肤捆绑包
- **夜市** - 当夜市活动开启时，查看您的折扣皮肤
- **账户管理** - 支持多种登录方式，包括用户名/密码和Cookies
- **安全登录** - 支持二次验证(2FA)
- **缓存机制** - 减少请求次数，加快加载速度
- **余额显示** - 查看您的VP（Valorant Points）、RP（Radianite Points）和KC（Kingdom Credits）余额
- **倒计时提醒** - 显示商店刷新倒计时

## 🖼️ 预览

*在此处添加应用截图*

## 🚀 安装与使用

### 前提条件

- Node.js (v14.0.0 或更高版本)
- npm (v6.0.0 或更高版本)

### 安装步骤

1. 克隆仓库
```bash
git clone https://github.com/your-username/valorant-shop-app.git
cd valorant-shop-app
```

2. 安装依赖
```bash
# 安装服务器依赖
npm install

# 安装客户端依赖
cd client
npm install
cd ..
```

3. 配置环境变量
```bash
# 复制示例环境变量文件
cp .env.example .env

# 编辑.env文件，设置必要的环境变量
```

4. 启动应用程序
```bash
# 开发模式（同时运行前端和后端）
npm run dev:full

# 或者只运行后端
npm run server

# 或者只运行前端
npm run client
```

5. 打开浏览器访问 http://localhost:3000

### 生产环境部署

1. 构建前端应用
```bash
cd client
npm run build
cd ..
```

2. 设置环境变量
```bash
# 设置NODE_ENV为production
export NODE_ENV=production
```

3. 启动服务器
```bash
npm start
```

## 🔒 安全与隐私

- 用户凭据存储在本地，默认情况下不会发送到任何第三方服务器
- 支持"记住我"功能，可以在会话之间保持登录状态
- 所有与Riot服务器的通信都通过您的本地服务器进行，不经过第三方
- 令牌自动刷新机制，减少重新登录的需求

## 🛠️ 技术栈

### 前端
- React
- React Router
- Axios
- CSS (自定义样式)

### 后端
- Node.js
- Express
- node-fetch
- 本地文件存储

## ❓ 常见问题

**Q: 这个应用是官方开发的吗？**  
A: 不是，这是一个非官方的第三方应用，不隶属于Riot Games。

**Q: 使用这个应用会被封号吗？**  
A: 该应用使用官方API进行通信，与使用官方网站查看商店的风险相同。然而，Riot的政策可能随时改变，使用风险自负。

**Q: 为什么我需要输入我的Riot账号信息？**  
A: 该应用需要您的凭据来与Riot服务器进行认证，以获取您个人商店的数据。您的凭据仅在本地使用，不会发送到第三方服务器。

**Q: 如何添加多个账号？**  
A: 目前支持单个账号登录。多账号支持功能将在未来版本中添加。

**Q: 如果遇到"Auth Failed"错误怎么办？**  
A: 这通常是由于登录凭据过期或无效。尝试重新登录，或者使用Cookie登录方法。

## 📝 许可证

该项目采用 [ISC 许可证](LICENSE) 进行许可。

## 致谢

- [Valorant API](https://valorant-api.com/) - 提供皮肤信息和图标
- Riot Games - 为Valorant游戏及其API
- [SkinPeek](https://github.com/giorgi-o/SkinPeek) - 提供了一些实现思路和参考

---

**免责声明:** 本项目不隶属于Riot Games或任何直接与其相关的人员。所有相关的商标、资源和内容均属于各自所有者。

Valorant和Riot Games是Riot Games, Inc.的商标或注册商标。
