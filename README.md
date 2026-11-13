# wkk.tools

本地处理的 JSON 格式化与 Unix 时间戳转换工具。原生 HTML / CSS / JavaScript，无运行时第三方依赖，无后端。

## 本地运行

安装 Node.js 20 或以上，在项目目录执行：

```sh
node scripts/serve.mjs
```

浏览器打开 http://127.0.0.1:5173 。修改 public/ 下的文件后刷新页面即可。服务仅监听本机，Ctrl+C 停止。设置 PORT 环境变量可更换端口。有 npm 时也可以使用 `npm run dev`，不需要先安装依赖。

## 功能

- 顶部横向导航；JSON 页只有一个文本框及左下方格式化按钮。
- JSON 使用 Tab 和真实换行；直接整理原始词法内容，保留大整数、数字写法、字符串转义和字段顺序。格式化失败保留输入。支持 Ctrl/Cmd+Enter。输入上限约 2 百万字符。
- HTML textarea 按浏览器规范将换行规范化为 LF；格式化函数产生 CRLF，界面换行与缩进正常显示，系统剪贴板的行尾遵循浏览器行为。
- 时间戳分三行：实时时间、Unix 转日期字符串、日期字符串转 Unix。
- Unix 输入的整数部分少于 13 位默认秒，13 位及以上默认毫秒；负号和小数点不计入位数。可通过下拉框手动选择秒(s)或毫秒(ms)，修改输入后重新按位数设置默认值。秒支持最多三位小数，毫秒须为整数；超出日期范围会提示错误。
- 日期字符串按系统时区解析，格式 `YYYY-MM-DD HH:mm:ss`，可附加 1–3 位毫秒小数；反向输出匹配输入精度：带小数（含 .000）输出整数 Unix 毫秒，无小数输出 Unix 秒；输出单位同步更新。非法日期、夏令时不存在/重复时间均提示错误。
- 无数据上传、远程字体、统计请求、登录或持久存储。切换工具保留当前输入，刷新页面会清空。

## 测试及构建

```sh
node --test tests/core.test.mjs
node scripts/build.mjs
```

`dist/` 是部署目录，只包含网站文件。可用 `npm test`、`npm run build` 执行同样操作。

核心测试可分别在 `TZ=Asia/Singapore`、`TZ=UTC`、`TZ=America/New_York` 环境运行；Windows PowerShell 用 `$env:TZ='America/New_York'` 设置。

可选浏览器回归测试：安装 Playwright 并确保 Chrome 可用，启动本地服务后执行 `node tests/browser.mjs`。也支持将 `PLAYWRIGHT_MODULE` 设置为现有 Playwright 包路径、`TEST_URL` 设置为测试地址。测试截图写入 artifacts/。

## 后续部署到 Cloudflare Pages

本轮未发布，也未修改域名 DNS。

Git 集成方式：将代码推送到自己的 GitHub/GitLab 仓库，在 Cloudflare Pages 创建项目并连接仓库：

| 配置 | 值 |
| --- | --- |
| Framework preset | None |
| Build command | `node scripts/build.mjs` |
| Build output directory | `dist` |
| Root directory | 项目根目录 |

也可以先本地构建，再把 dist/ 作为静态站点上传到 Pages。不要上传整个项目目录。

部署成功后，在该 Pages 项目的 **Custom domains → Set up a domain** 中添加自有域名，并跟随引导配置 DNS。根域名通常需要把域名接入 Cloudflare 并配置 nameservers；子域名可以按官方流程配置 CNAME。先在 Pages 添加域名，再设置对应 DNS。

官方说明：[静态 HTML 部署](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/)、[绑定自定义域名](https://developers.cloudflare.com/pages/configuration/custom-domains/)。

## 文件结构

public/ 存放站点；public/core.js 是纯转换逻辑；public/app.js 负责交互；scripts/ 提供开发服务与构建；tests/ 提供验证；design/ 保存历次设计稿。

时间转换区使用上下两排：输入、可选择的时间戳单位（日期转换的输出单位自动匹配）、系统时区；结果和转换按钮。时区仅显示 UTC 偏移（如 UTC+08:00）。结果悬浮或键盘聚焦时显示复制图标，触屏设备常显。空结果不可复制，复制失败保留结果并提示手动复制。





## XML 格式化
新增 #xml 页面，沿用 JSON 的单文本框、左侧行号和格式化按钮，支持 Ctrl/Cmd+Enter。自动整理结构缩进，保留混合文本、xml:space=preserve、注释和 CDATA；格式错误保留原文并提示位置。XML 声明保留；含 DOCTYPE/DTD 的内容暂不支持，以免解析再序列化丢失声明。内容仅在浏览器解析，不插入页面。XML 浏览器回归：node tests/xml-browser.mjs（依赖与主浏览器测试相同）。

