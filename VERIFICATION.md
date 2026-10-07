# 验证与交付状态

验证日期：2026-10-07。本地检查及公网浏览器检查已通过，网站已发布到 [GitHub Pages](https://alinerml.github.io/)，并接入独立 Waline 服务。

## Waline 线上服务

- Vercel Hobby 专用项目、Neon Free 专用 PostgreSQL 数据库已创建，官方 SQL 表结构已初始化。
- 公开服务 URL：https://alinerml-waline.vercel.app；管理员入口：`/ui`。
- 公开评论读取、文章计数读取及 GitHub 域名的跨域预检通过；公开注册和 OAuth 已关闭。
- 管理员通过仅绑定本机回环地址的临时入口亲自注册，数据库已确认存在一个 administrator；临时入口已关闭。
- 已轮换初始化日志中出现的旧数据库密码，更新 Vercel 配置并关闭 SQL/连接日志。真实 Neon 连接的私有 HTTP 检查通过，TLS 校验服务端证书，日志不包含连接凭据或 SQL。
- GitHub Pages 正在更新评论入口，最终公网评论、回复、点赞及持久化验证进行中。

## 线上发布已验证

- 源码已推送到公开仓库 [Alinerml/Alinerml.github.io](https://github.com/Alinerml/Alinerml.github.io)，Pages 使用 GitHub Actions 构建。
- [首次 Astro 发布工作流](https://github.com/Alinerml/Alinerml.github.io/actions/runs/37639422092)成功完成依赖安装、类型检查、生产构建、输出验证和部署。
- 公网首页返回 HTTP 200，站点标题、个人简介和头像正确。
- 公网 Edge 浏览器验证通过：主题切换与刷新保留、终端及文章内联阅读、快捷搜索、数学公式和代码复制。
- 搜索索引、终端文章数据、RSS 和 sitemap 均可公开访问。
- 390px 手机宽度下主要页面无横向溢出，导航展开和跳转正常。
- 首次静态发布检查中，未出现站内 HTTP 4xx/5xx、未捕获脚本错误或对本地评论服务的请求。当时线上评论地址为空，评论区正确隐藏。

## 本地验证已通过

- Astro 类型检查：71 个文件，0 errors / 0 warnings / 0 hints。
- 生产构建：22 个页面；另有兼容跳转页面。
- 输出检查：27 个 HTML 页面、全部站内资源链接、8 条搜索索引及项目排序。
- Edge 无头浏览器验证（真实本地静态站与 Waline SQLite）：
  - 首页身份与个人内容。
  - 深浅主题切换与刷新保留。
  - 首页终端 whoami。
  - 全屏终端、文章内联阅读、数学公式和复制。
  - 快捷搜索与文章命中。
  - 搜索项目命中。
  - 正文数学、代码复制和目录锚点。
  - 游客评论提交。
  - 评论回复。
  - 文章点赞与键盘操作。
  - 评论点赞。
  - 刷新后评论、回复、评论点赞与文章点赞持久化。
  - 联系方式复制。
  - 390px 手机宽度九个页面无横向溢出。
  - 手机导航展开与跳转。
  - 页面无未捕获脚本错误。
- 一次受控 HTTP 503：评论区显示重新加载，点击后恢复连接真实服务。
- 重启本地 Waline 后，已创建的留言与回复仍存在。
- 已移除测试昵称“本地测试”的自动化留言，并撤回测试文章点赞。

## 仍待验证

- 线上评论、回复、点赞完整浏览器验证进行中。
- 管理员在正式公开 `/ui` 的登录尚未自动化验证；密码由站主私下输入，助手不收集。
- 邮件通知未配置或验证。
- Astro Pure 使用的旧 Markdown 插件接口仍会产生依赖弃用提示，当前检查、构建和浏览器功能通过。

## 运行

推荐 Node.js 24.15+。在博客根目录执行 npm ci；在 services/waline 执行 npm ci 与 npm run dev；然后在根目录执行 npm run demo，打开 http://127.0.0.1:4173/。

编辑内容时使用 npm run dev；正式发布前执行 npm run check、npm run build、npm run verify。完整部署与内容编辑说明见 README.md。
