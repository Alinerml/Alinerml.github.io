# Alinerml 的独立评论服务

此目录为 Waline 后端。博客本体托管 GitHub Pages，线上评论服务可部署到 Vercel，数据库可使用 Neon PostgreSQL Free。

## 本地运行

Node.js 24.15+，在此目录运行 `npm ci`、`npm run dev`，服务监听 http://127.0.0.1:8360。评论存入被忽略的 `.local/waline.sqlite`，重启后仍存在。首次启动下载 Waline 官方 SQLite 空库。JWT 在当前进程生成，重启会让本地登录会话失效。本地服务仅绑定回环地址，并关闭同 IP 评论冷却，方便体验留言和回复；线上服务仍使用 Waline 默认限频。

博客根目录 `.env.development.local` 配置 `PUBLIC_WALINE_SERVER_URL=http://127.0.0.1:8360` 后启动前端；生产构建不会读取此开发配置。

## 线上部署

1. 在 Vercel 新建个人 Hobby 项目，仅以本目录为项目 Root Directory。
2. 在 Storage / Marketplace 连接自己的 Neon Free 数据库。
3. 首次初始化专用空数据库时，执行 `waline.pgsql`；已有数据库不要重复执行。
4. 配置 `.env.example` 中的服务端变量。Neon 集成提供 DATABASE_URL 或 POSTGRES_URL，入口会转换为 PG_*，并启用 TLS。
5. SITE_URL 填入自己的博客域名；JWT_TOKEN 在服务端生成并保存，不能放进 PUBLIC_*。服务只接受博客与当前 Vercel 项目域名。
6. 部署后，亲自访问 `/ui/register` 注册首个管理员；随后通过 `/ui` 管理留言。
7. 把自己的公开服务地址写入博客 `src/data/waline.json` 或 GitHub Repository Variable `PUBLIC_WALINE_SERVER_URL`，重新构建博客。

游客昵称必填，登录可选。回复、评论点赞与文章点赞由 Waline 数据库保存。按 `/blog/<id>/` 固定路径隔离，`reaction0` 对应文章爱心，不修改其顺序和含义。

## SQL 存储兼容

`comment-model.cjs` 通过 Waline 自带的 custom model 接口包装 Comment 更新：过滤未定义字段，并回读完整记录。修复 1.43.4 在 SQL 存储中游客点赞写库后返回 500 的问题；本地 SQLite 已实测，PostgreSQL 共用相同适配路径，尚未连接线上 Neon 验证。没有修改 node_modules。

## 状态

交付包含服务端代码与 SQL，未创建 Vercel/Neon 线上资源。第三方账号需要站主登录；无需把密码、连接字符串或平台 token 发到聊天。

Waline 服务端和 SQL 来自 https://github.com/walinejs/waline，遵循 GPL-2.0。博客的 Apache-2.0 许可不替代 Waline 自身许可。
