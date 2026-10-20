# Duo截图生成器

[在线使用](https://bingee.github.io/duo-screenshot/)

上传头像、输入名字，生成展开内屏与合起外屏两张 Duo 设置页截图。免费使用，纯 HTML / CSS / JavaScript，无后端、无运行时依赖。

- 手机、平板、电脑自适应布局，支持键盘操作。
- 本地读取头像，居中圆形裁切；名字支持中文、emoji 和长名字。
- 每次生成随机时间，排除固定的 09:41；两张图使用相同的名字、头像和时间。
- 保留底图原尺寸：内屏 2853 × 2007，外屏 1398 × 2034。
- 电脑一键下载包含两张 PNG 的 ZIP；支持文件分享的手机使用系统保存面板。也可分别下载 PNG。
- 不上传头像、名字或生成结果；不使用分析统计、广告、第三方字体或 CDN，不持久保存个人信息。关闭页面后重新输入。

## 本地运行

```sh
python3 -m http.server 4173
```

打开 `http://localhost:4173`。需通过 HTTP 服务打开，ES modules 不支持直接双击 `index.html`。也可以使用任意静态网站托管。

## 发布 GitHub Pages

在仓库 Settings → Pages 中选择 Deploy from a branch，分支 `main`，目录 `/(root)`。资源路径均为相对路径，支持项目子路径部署。

## 验证

```sh
npm ci
npm test
```

单元测试覆盖名字清理、随机时间、ZIP 结构、透明/横向头像裁切和两种模板的区域外像素保留。浏览器验收还会检查实际下载的两张 PNG。支持现代 Chrome、Safari、Firefox、Edge；系统分享/相册选项随浏览器和系统变化，受限浏览器可改用 PNG 链接或 ZIP。

## 目录

- `index.html` / `styles.css`：页面和响应式布局
- `js/app.mjs`：编辑状态、预览、头像读取和保存
- `js/composer.mjs`：原尺寸 Canvas 合成
- `js/templates.mjs`：底图尺寸与可修改区域
- `js/zip.mjs`：无压缩 ZIP 打包，包含 CRC-32 校验
- `assets/`：模板与图标

## 许可和素材

原创代码及图标采用 MIT License。系统截图素材、其中的第三方界面及商标不包含在 MIT 授权范围内，来源和哈希见 [SOURCES.md](SOURCES.md)。本工具是独立项目。
