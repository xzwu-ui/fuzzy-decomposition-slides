# 网页讲义检查记录

检查日期：2026-10-13。对象：`web.html` 和 `web-standalone.html`。

- 六个讲义章节、完整的四个包含证明、桌面目录与手机折叠目录均已完成；第 07 章提供 14 页报告的 PDF 阅读入口。
- 实际使用 Chrome 检查 1440×1000、1024×768、768×1024、390×844、320×720；均无页面横向溢出、无公式容器溢出。
- 普通／强截集切换、λ=1 的空强截集、SVG 阈值拖动和重置通过。
- H 的临界成员选择、α 高度切换及夹逼合法性通过。
- 左右恢复结果、单步、进度条、精确证书、播放／暂停、离开视口后暂停通过。
- 中点探索器正确显示 0.7605 和 0.7595，临界相等与空索引族端点通过。
- 六元素例子的交集 `{a,b,c}`、并集 `{a,b}` 在 c 的两种边界选择下保持一致。
- 手机目录跳转、目录关闭、当前章节高亮、100% 阅读进度通过。
- 新增报告卡片的电脑与手机截图已检查；滚到页面底部时，目录正确高亮报告章节。网页仅提供 PDF 阅读按钮。
- 阻止全部 HTTP／HTTPS 请求后，本地多文件与单文件版均可运行；无页面脚本错误，无网络请求。
- 原有演示入口仍能打开八页幻灯片，公式渲染正常。
- 原有数学回归检查通过 160,160 组恢复情况。

可复查的结果位于 `tests/web-browser-report.json`，代表截图位于 `tests/qa-web/`。

检查命令：`node tests/math-tests.cjs`、`node tests/web-browser-tests.cjs`。浏览器检查直接使用本机 Chrome，不需要安装 Playwright。若浏览器位于其他目录，可设置 `BROWSER_EXECUTABLE`。

网站发布地址：[GitHub Pages 公开讲义](https://xzwu-ui.github.io/fuzzy-decomposition-slides/)和 [Sites 私有讲义](https://fuzzy-cut-lecture.flowy-smile-8706.chatgpt.site)。发布包包含讲义、演示版、报告 PDF 与对应托管配置。
