# Alinerml · 工程笔记

个人博客与工程实践记录。基于 Astro、Pure、React 和 UnoCSS，沿用参考站的布局、导航与交互终端，内容为 Alinerml 个人版本。

在线访问：[Alinerml · 工程笔记](https://alinerml.github.io/) · [源码仓库](https://github.com/Alinerml/Alinerml.github.io)。GitHub Pages 已发布，评论服务为 [独立 Waline 服务](https://alinerml-waline.vercel.app)。验证范围见 `VERIFICATION.md`。

## 本地运行

推荐 Node.js 24.15+（已用 24 系列验证）。

```bash
npm ci
npm run dev
```

打开 http://127.0.0.1:4173/。完整体验评论与点赞时，另开一个终端：

```bash
cd services/waline
npm ci
npm run dev
```

博客根目录的 `.env.development.local` 设置 `PUBLIC_WALINE_SERVER_URL=http://127.0.0.1:8360`。当前测试目录已配置此项；该文件不提交。评论使用独立本地 SQLite 数据库，首次启动从 Waline 官方下载空库结构，不需要 Vercel/Neon 账号。

也可在博客根目录运行 `npm run demo`，将包含本地评论入口的网站构建到独立的 `.local-preview/` 并预览。评论服务仍需在另一个终端运行；停止 `npm run dev` 后再启动此演示，避免占用同一端口。正式发布使用的 `dist/` 不受此演示影响。

生产检查：

```bash
npm run check
npm run build
npm run verify
npm run preview
```

## 功能

- 首页、关于、联系、资源链接、工程实践列表及详情。
- Markdown 博客、分类标签、归档、目录、阅读进度和回顶部。
- 静态全文搜索；Ctrl/Cmd K 打开搜索页。
- 深浅主题与系统主题，偏好保存在当前浏览器。
- 首页终端、全屏 dev mode、文章内联阅读；支持 help、whoami、ls、cd、cat、open、search、theme、clear 等命令。不执行系统命令。
- 代码高亮与复制、KaTeX 数学、图片放大、RSS、sitemap。
- Waline 评论、回复、文章点赞、评论点赞与服务失败重试；需要自己的评论服务。

## 修改内容

| 内容 | 文件 |
| --- | --- |
| 站名、简介、GitHub、可选邮箱与微信二维码 | `src/data/site.ts` |
| 工程方向卡 | `src/data/projects.json` |
| 博客文章 | `src/content/articles/*.md` |
| 工程详情 | `src/content/cases/*.md` |
| 导航、主题与功能开关 | `src/site.config.ts` |
| 可选评论服务地址 | `src/data/waline.json` 或 `PUBLIC_WALINE_SERVER_URL` |

新文章保留 title、description、category、updated、order 元数据。修改后索引、终端清单与 RSS 会一起重新生成。本站不推断姓名、学校、雇主、职位、城市或联系方式；邮箱与二维码未填写时不展示。

## GitHub Pages

已配置 `.github/workflows/pages.yml`，公开仓库为 `Alinerml/Alinerml.github.io`，Pages 的 Source 为 GitHub Actions。提交到 main 后，会检查、构建并发布 dist。

站点使用根路径，因此若改为项目仓库子路径，需要进一步适配 Astro base 和站内资源路径。`PUBLIC_SITE_URL` 可以覆盖 canonical/RSS 基准域名；自定义域名时也要同步 robots、Actions 与 SITE_URL。

公开托管仅发布网站源码与静态内容，不包含数据库凭证、评论数据库、本地 work 或 node_modules。源码仓库为 https://github.com/Alinerml/Alinerml.github.io，网站由 GitHub Actions 构建发布；部署验证见 VERIFICATION.md。

## 评论与点赞

独立服务源码、数据库初始化与部署步骤在 `services/waline/`。博客使用 Vercel 上的 Waline 和 Neon PostgreSQL 专用数据库，GitHub Pages 只托管博客。管理员入口为 https://alinerml-waline.vercel.app/ui。

迁移到其他账号时，在 Vercel Hobby 部署 `services/waline`，连接 Neon Free，并在专用空数据库执行该目录的 `waline.pgsql`。配置 SITE_URL、SITE_NAME 和服务端 JWT_TOKEN，再把自己的服务地址填入 `src/data/waline.json`，或设置 GitHub Repository Variable `PUBLIC_WALINE_SERVER_URL`。数据库连接凭据与 JWT 密钥只配置在 Vercel 服务端。

当前评论以游客方式开放，昵称必填。公开注册和 OAuth 默认关闭，防止首个管理员被他人注册占用；管理员只能先经私有本机入口或受保护部署初始化，再使用公开 `/ui` 登录管理。详见服务目录的 README。

未配置评论服务时隐藏评论区；服务故障时显示重新加载。没有使用原作者评论地址，也不以浏览器存储假装共享评论。Vercel/Neon 免费方案均有额度限制，Vercel Hobby 限个人非商业用途。

## 内容与来源

目前包含 4 篇原创工程笔记和 4 个工程方向。根据已知技术实践编写，以方法和关注点为主，不作为生产测试报告或独立开源作品声明。公开个人入口为 https://github.com/Alinerml；头像取自该账号的公开 GitHub 头像。

模板归属与依赖许可见 `NOTICE.md`、`LICENSE` 和 `services/waline/LICENSE`。

验证结果与线上边界见 `VERIFICATION.md`。
