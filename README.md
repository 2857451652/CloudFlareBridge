# Cloudflare Bridge

这是一个 Cloudflare Workers 项目，用于将 `www.cisg.ai` 的请求反向代理到 HuggingFace Space `https://jnsecret-metarec.hf.space/`，同时保持 URL 不变。

## 功能特性

- ✅ 反向代理：将所有请求转发到 HuggingFace Space
- ✅ URL 保持：浏览器地址栏始终显示 `www.cisg.ai`
- ✅ HTML 重写：自动重写 HTML 中的链接和资源路径
- ✅ 资源代理：CSS、JS、图片等资源也通过代理加载

## 项目结构

```
.
├── src/
│   └── index.js      # Worker 主代码
├── wrangler.toml     # Cloudflare Workers 配置
├── package.json      # 项目依赖
└── README.md         # 项目说明
```

## 安装和部署

### 1. 安装依赖

```bash
npm install
```

### 2. 配置 Cloudflare

在 `wrangler.toml` 中配置你的域名。确保：
- 你的域名已经在 Cloudflare 上
- 你已经将域名添加到 Cloudflare Workers 的路由中

### 3. 登录 Cloudflare

```bash
npx wrangler login
```

### 4. 本地开发

```bash
npm run dev
```

### 5. 部署到 Cloudflare

```bash
npm run deploy
```

## 配置说明

### wrangler.toml

- `name`: Worker 名称
- `routes`: 域名路由配置
- `compatibility_date`: Cloudflare Workers 兼容性日期

### src/index.js

- `TARGET_URL`: 目标 HuggingFace Space 的 URL
- 可以根据需要修改代理逻辑

## 注意事项

1. **域名配置**：确保 `www.cisg.ai` 和 `cisg.ai` 都已添加到 Cloudflare，并且 DNS 已正确配置
2. **路由设置**：在 Cloudflare Dashboard 中，需要将域名路由到该 Worker
3. **HTTPS**：Cloudflare 会自动提供 HTTPS 支持
4. **性能**：Worker 会缓存响应以提高性能

## 故障排除

如果遇到问题：

1. 检查 Cloudflare Dashboard 中的 Worker 日志
2. 确认域名 DNS 配置正确
3. 验证 `wrangler.toml` 中的路由配置
4. 检查目标 HuggingFace Space 是否可访问

## 许可证

MIT

