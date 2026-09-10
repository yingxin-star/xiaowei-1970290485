# 哈吉米小马抽象媒体站

一个打开就能“哈”起来的静态梗站：看小马动效、点随机抽梗、听原创 Web Audio 小曲，也可以接入你拥有使用权的 GIF、图片和音频。

## 现在有什么

- 原生 HTML/CSS/JavaScript，无框架、无后端、无登录。
- 小马抽象动画舞台、梗图卡片、标签筛选和随机内容。
- 图片/GIF + 音频组合播放，音频需要用户点击后才会启动。
- 现成的原创 CSS/SVG 小马动效和 Web Audio 音效，不依赖外部媒体文件也能演示。
- 来源链接、素材说明和失败回退。

## 本地运行

```bash
python3 -m http.server 8000
```

然后打开 <http://localhost:8000>。

不要直接双击 `index.html`：浏览器会阻止本地文件读取 `content/manifest.json`，用上面的静态服务器即可。

## 添加素材

内容清单在 [`content/manifest.json`](content/manifest.json)。每一项可以使用：

- `visual`：内置原创动画名称，例如 `pony-gallop`。
- `media`：仓库内的图片/GIF 路径，或构建时同步的 HTTPS 直链。
- `audio`：仓库内音频路径、HTTPS 直链，或 `{ "kind": "synth", "pattern": "spark" }`。
- `sourceUrl`、`sourceName`、`licenseNote`：来源和使用说明。

本地文件建议放在 `media/` 目录。构建时同步脚本只接受明确列入清单的图片、GIF 和音频，不抓取视频、不绕过平台限制。远程地址需要把域名加入清单的 `allowedHosts`，并满足大小和 MIME 类型限制。

## GitHub Pages

仓库包含 `.github/workflows/pages.yml`：推送到 `main`、手动触发或每周定时运行时，会先构建媒体清单，再发布到 GitHub Pages。

首次使用时，在仓库 Settings → Pages → Build and deployment → Source 选择 **GitHub Actions**。部署完成后通常可以从以下地址访问：

<https://yingxin-star.github.io/xiaowei-1970290485/>

## 素材与版权

这是个人同人/迷因实验，不代表 Bilibili、《赛马娘》或其他原作者、品牌和平台。网页上没有写“禁止使用”、非商业用途或标注来源，并不自动等于获得再分发授权。

默认内容为本项目原创的 SVG/CSS 动效和 Web Audio 音效。接入第三方素材前，请确认你拥有使用权或素材具有明确的开放许可，并保留原作者、来源链接和许可说明；收到权利人合理通知后应及时移除相关内容。

## 贡献

欢迎提交原创小马动效、授权素材、音效和新梗。请在内容清单中同时填写来源与许可说明，不要提交大视频、密码、Cookie 或私人链接。
