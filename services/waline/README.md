# Alinerml 的独立评论服务

此目录为 Waline 后端。博客本体托管 GitHub Pages，线上评论服务已部署到 https://alinerml-waline.vercel.app，使用专用 Neon PostgreSQL 数据库，当前方案为 Vercel Hobby / Neon Free。

## 本地运行

Node.js 24.15+，在此目录运行 `npm ci`、`npm run dev`，服务监听 http://127.0.0.1:8360。评论存入被忽略的 `.local/waline.sqlite`，重启后仍存在。首次启动下载 Waline 官方 SQLite 空库。JWT 在当前进程生成，重启会让本地登录会话失效。本地服务仅绑定回环地址，并关闭同 IP 评论冷却，方便体验留言和回复；线上服务仍使用 Waline 默认限频。

博客根目录 `.env.development.local` 配置 `PUBLIC_WALINE_SERVER_URL=http://127.0.0.1:8360` 后启动前端；生产构建不会读取此开发配置。

## 线上部署

1. 在 Vercel 新建个人 Hobby 项目，仅以本目录为项目 Root Directory。
2. 在 Storage / Marketplace 连接自己的 Neon Free 数据库。
3. 首次初始化专用空数据库时，执行 `waline.pgsql`；已有数据库不要重复执行。
4. 配置 `.env.example` 中的服务端变量。Neon 集成提供 DATABASE_URL 或 POSTGRES_URL，入口会转换为 PG_*，并启用 TLS。
5. SITE_URL 填入自己的博客域名；JWT_TOKEN 在服务端生成并保存，不能放进 PUBLIC_*。服务只接受博客与当前 Vercel 项目域名。
6. 通过仅绑定本机回环地址的临时 Waline 服务（连接自己的数据库），或者开启 Vercel 登录保护的独立初始化部署，亲自注册首个管理员。初始化服务可用 `registrationGuard(handler, { registrationEnabled: true })` 显式开启；该选项只能用于私有入口，创建管理员后立即关闭。随后通过公开服务 `/ui` 登录管理留言。
7. 把自己的公开服务地址写入博客 `src/data/waline.json` 或 GitHub Repository Variable `PUBLIC_WALINE_SERVER_URL`，重新构建博客。

当前博客采用游客评论，昵称必填；管理员后台登录与游客入口独立。回复、评论点赞与文章点赞由 Waline 数据库保存。按 `/blog/<id>/` 固定路径隔离，`reaction0` 对应文章爱心，不修改其顺序和含义。

## 公开注册保护

`registration-guard.cjs` 默认禁止注册和 OAuth 创建账号，保留游客评论、回复、点赞和已有管理员登录。覆盖当前 `/api/user`、旧版 `/user`、OAuth 以及 ThinkJS 兼容别名。Waline 1.43.4 不支持 `REGISTER=false`，不能用该环境变量代替本守卫。

博客目前隐藏访客登录入口，游客填写昵称即可留言。公开注册保持关闭，管理员凭据由站主在私有初始化页面亲自输入，不提交到仓库或博客构建。

保护路由测试：`node test/registration-guard.test.cjs`；SQL 日志、TLS 与更新回读测试：`node --test test/sql-model.test.cjs`。GitHub Actions 中独立的 Waline 工作流执行这些检查。

## 站点访问统计

`/api/site-stats` 复用当前 PostgreSQL，首次启用时在已有数据库执行 `site-stats.pgsql`。此脚本仅幂等新增 `blog_site_stats` 和 `blog_site_visitors` 两张表、初始化一行总计，不修改任何 Waline 表或已有评论。请求过程中不会自动创建表。

接口仅接受 `SITE_URL` 对应的 Origin。`GET` 读取 `{ visitors, views, startedAt }`；`POST` 接受唯一字段 `{ visitorId: "浏览器生成的 UUID" }`，返回相同格式；`OPTIONS` 用于预检。JSON 请求体上限 2 KB，响应不缓存；生产环境不会开放 localhost。单独调试 PostgreSQL 统计时，可在非生产进程显式设置 `SITE_STATS_DEV_ORIGINS=http://localhost:4173`。

访客按浏览器保存的随机 ID 去重，不代表实名人数；清除浏览器数据或使用另一浏览器会计为新访客。数据库只保存该随机 ID 的 SHA-256 散列和全站累计数字，不记录访问路径、IP 或浏览器信息。没有可持久保存的浏览器 ID 时，前端只读取数字。计数从此迁移首次执行起累积，不补造之前的数据；每次完整页面访问只提交一次 POST，失败时仅 GET 重读，避免重试重复计数。

统计服务测试：`node --test test/site-stats.test.cjs`，覆盖 Origin、方法、请求体限制、UUID 校验、事务回滚和 Waline 透传。并发与真实数据库验证范围以博客根目录 `VERIFICATION.md` 为准。本地 SQLite 评论演示不连接线上 PostgreSQL，也不提供统计接口。

## SQL 存储兼容

`comment-model.cjs` 通过 Waline 自带的 custom model 接口包装 Comment 更新：过滤未定义字段，并回读完整记录。修复 1.43.4 在 SQL 存储中游客点赞写库后返回 500 的问题；本地 SQLite 已实测，线上 PostgreSQL 的最终读写验证见 `VERIFICATION.md`。没有修改 node_modules。

所有 SQL 模型在创建连接前关闭原生连接字符串和 SQL 日志，避免输出数据库密码、管理员密码哈希或访客内容。PostgreSQL TLS 会校验服务端证书。管理员初始化过程中发现的旧数据库密码已轮换，服务使用新凭据；密码值不会写入交付文档。

## 状态

线上 Vercel 项目和 Neon 数据库已创建并完成初始化，公开读取和跨域预检已通过。运行时密钥仅保存在 Vercel；仓库仅包含公开服务 URL。公网留言、回复、点赞及持久化的最终验证状态见博客根目录 `VERIFICATION.md`。

后端使用 Vercel CLI 部署。当前 Vercel 账号尚未连接 GitHub 登录方式，后端不会随 GitHub 推送自动发布；如修改本目录，需要重新使用 Vercel CLI 部署，或在 Vercel 连接自己的 GitHub 并将项目 Root Directory 设为 `services/waline`。博客前端仍由 GitHub Actions 自动发布。

Waline 服务端和 SQL 来自 https://github.com/walinejs/waline，遵循 GPL-2.0。博客的 Apache-2.0 许可不替代 Waline 自身许可。
