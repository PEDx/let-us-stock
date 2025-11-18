# Let US Stock 📈

一个现代化的美股行情查看工具，提供实时股票报价和市场情绪指标。

## ✨ 功能特性

- 📊 **股票报价表格** - 显示多只热门美股的关键指标
  - 实时价格和涨跌幅
  - 市盈率（PE Ratio）
  - 市净率（Price to Book）
  - 市值（Market Cap）
- 📉 **恐惧贪婪指数** - 实时显示市场情绪指标
- 🌓 **主题切换** - 支持深色/浅色模式
- 🎨 **现代化 UI** - 基于 Tailwind CSS 和 Radix UI 组件

## 🛠️ 技术栈

- **框架**: React Router v7 (SSR)
- **UI 库**: React 19
- **样式**: Tailwind CSS v4
- **类型**: TypeScript
- **数据源**: Yahoo Finance API
- **构建工具**: Vite
- **包管理**: pnpm

## 📦 安装

确保已安装 Node.js 和 pnpm：

```bash
# 安装依赖
pnpm install
```

## 🚀 开发

```bash
# 启动开发服务器
pnpm dev
```

应用将在 `http://localhost:5173` 运行。

## 🏗️ 构建

```bash
# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start
```

## 🐳 Docker 部署

项目包含 Dockerfile，可以使用 Docker 进行部署：

```bash
# 构建镜像
docker build -t let-us-stock .

# 运行容器
docker run -p 3000:3000 let-us-stock
```

## 📁 项目结构

```
let-us-stock/
├── app/
│   ├── components/          # React 组件
│   │   ├── fear-greed-index.tsx  # 恐惧贪婪指数组件
│   │   ├── quote-table.tsx       # 股票报价表格
│   │   ├── header.tsx            # 页面头部
│   │   ├── footer.tsx            # 页面底部
│   │   └── ui/                   # UI 基础组件
│   ├── routes/              # 路由页面
│   │   └── home.tsx         # 首页
│   ├── lib/                 # 工具函数
│   └── root.tsx             # 根组件
├── public/                  # 静态资源
└── package.json            # 项目配置
```

## 📊 当前跟踪的股票

- AAPL (Apple)
- TSLA (Tesla)
- GOOG (Google)
- MSFT (Microsoft)
- NVDA (NVIDIA)
- META (Meta)
- AMZN (Amazon)
- NFLX (Netflix)
- GOOGL (Google Class A)
- INTC (Intel)
- CSCO (Cisco)
- IBM (IBM)
- ORCL (Oracle)
- SAP (SAP)
- QQQ (Invesco QQQ Trust)

## 🔧 可用脚本

- `pnpm dev` - 启动开发服务器
- `pnpm build` - 构建生产版本
- `pnpm start` - 启动生产服务器
- `pnpm typecheck` - 类型检查

## 📝 许可证

私有项目

