# 影修工坊

这是一个独立的静态修图网站原型，和 `C:\Destiny` 里的八字网站没有路由、后端、数据库或部署配置关联。

## 打开方式

直接用浏览器打开：

`C:\Destiny\photo-edit-studio\index.html`

## 当前功能

- 上传图片或拖拽图片
- 浏览器本地预览，不自动上传服务器
- 快速风格：清透、人像、暖调、冷调、黑白、胶片
- 亮度、对比度、饱和度、色温、锐化
- 框选裁剪，支持自由比例、1:1、4:3、3:4、16:9、9:16
- 左右旋转、水平/垂直翻转
- 添加文字或水印
- PNG、JPG、WebP 导出

## 后续独立上线

如果要公网访问，建议新建独立 GitHub 仓库和独立 Render Static Site，不要复用八字网站的仓库和 Render Web Service。

## Render 设置

如果在 Render 控制台手动创建 Static Site：

- Repository: `photo-edit-studio`
- Branch: `main`
- Build Command: `echo "No build required"`
- Publish Directory: `.`

仓库里也包含 `render.yaml`，可以用 Render Blueprint 创建同名静态站点。
