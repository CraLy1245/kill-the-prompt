# Design QA — AI HTML 方案页

## Evidence

- source visual truth path: `C:\Users\jiazh\AppData\Local\Temp\codex-clipboard-d4e49611-7248-4a66-8b3b-aaa7f596892c.png`
- implementation screenshot path: `C:\Users\jiazh\AppData\Local\Temp\t002-ai-html-desktop.png`
- mobile-frame screenshot path: `C:\Users\jiazh\AppData\Local\Temp\t002-ai-html-mobile-frame.png`
- browser-rendered route: `http://127.0.0.1:3000/workspace/e4a72c96-153b-4737-ac35-96965986c59a`
- viewport: desktop `1600 × 1000` capture（实际图像 `1585 × 991`，浏览器滚动条占用剩余像素）；HTML 手机框 `390px`
- state: 知乎回答项目，步骤 05「确认」，AI HTML 版本 42，测试修改已通过撤销恢复

源图为 `2559 × 1347`，来自 Windows 125% 显示缩放。源图和当前实现已在同一次视觉比较输入中打开；比较以相同的三栏工作区、确认步骤和真实项目内容为基准。当前实现有意把源图中央原始 JSON 区替换为渲染后的 HTML 方案页，其余产品框架保持一致。

## Full-view comparison evidence

- Fonts and typography: 外层继续使用宋体/衬线展示标题和紧凑无衬线工具文字；HTML 页复用衬线大标题、梅紫眉题和克制正文层级。没有等宽源码、JSON 或 Schema 文本泄漏。
- Spacing and layout rhythm: 左侧导航、中央流程与右侧摘要三栏比例延续参考图；HTML 页在原中央框内渲染，工具栏、预览区、自然语言编辑区和阶段按钮保持清晰分层。细边框、小圆角、低阴影与参考产品一致。
- Colors and tokens: 暖白纸张、深墨正文、梅紫主色、灰褐分隔线均来自现有产品 token；AI 页没有引入脱离调性的高饱和色或通用蓝色 SaaS 风格。
- Image quality and asset fidelity: 方向预览继续使用项目已有图片；图标统一来自 Lucide。参考图中的桌面宠物是运行环境叠层，不属于产品资产；实现没有用 emoji、手写 SVG、CSS 插画或占位图替代产品素材。
- Copy and content: 固定文案清楚说明「AI HTML 方案页」「安全预览」「不需要接触源码」；动态页面以真实项目目标、方向、决策、成果结构和约束组织内容，不出现内部 ID。
- Responsiveness: 桌面、平板和手机框按钮均可用；390px HTML 手机框内标题、摘要卡、列表和正文正常换行，无横向溢出或控件遮挡。
- Icons and affordances: 预览尺寸、撤销、重新生成、执行修改均使用同一线性图标体系；激活尺寸有梅紫底色，按钮标签和 iframe title 可被辅助技术读取。

## Focused region comparison evidence

不需要额外裁切：原始分辨率下的同屏比较已经能清楚辨认中央工具栏、HTML 首屏、右侧摘要和流程轨。另以手机框截图验证了最容易发生布局漂移的窄宽状态。

## Primary interactions tested

1. 刷新已有项目，版本 42 的 AI HTML 直接恢复，没有重新触发模型或回退为基础模板。
2. 桌面、平板、手机三个预览按钮均可切换，当前尺寸状态可见。
3. 真实分析模型生成完整 HTML；自然语言要求「突出核心目标并调整发布场景/篇幅布局」后，页面重新排版并保存新版本。
4. 点击撤销恢复上一版 HTML；测试修改未留在交付状态。
5. 页面 DOM 中未出现 `core_judgment`、`ending-1`、`JSON` 或 `Schema`。
6. iframe 使用空 `sandbox`、`no-referrer` 和注入 CSP；服务端安全校验覆盖脚本、事件处理器、外链和网络调用。
7. 检查浏览器日志：0 error，0 warning；仅有 React DevTools 与 HMR 开发信息。

## Findings and comparison history

### Earlier canvas iterations

- [P2] AI 节点曾可移动到画布横向边界之外。
  - fix: 对旧版语义节点动作统一钳制横向位置与宽度，并补充边界测试。
  - post-fix evidence: 边界测试通过；本次 HTML 页面以 iframe 内部滚动取代自由节点定位。
- [P2] 确认步骤的 sticky 底部导航曾覆盖 AI 指令区。
  - fix: 确认步骤 footer 改为静态流布局。
  - post-fix evidence: 当前桌面截图中自然语言编辑区与阶段导航无重叠。
- [P2] 结构化 GUI 曾暴露字段 ID 与决策枚举。
  - fix: 先映射业务标签；本次进一步改为 AI 直接输出用户可读 HTML。
  - post-fix evidence: DOM 检查内部标识、JSON 和 Schema 均不存在。

### AI HTML iteration

- 未发现可执行的 P0/P1/P2 差异。
- P3 follow-up: 当前 AI 页面采用内部滚动以维持参考图的工作区高度；未来可增加「全屏查看」作为长方案阅读增强，不影响本次生成、修改、撤销或最终成果流程。

## Console and runtime

- desktop console errors/warnings: 0 / 0
- framework error overlay: none
- blank-page check: passed
- persistent controls covered or clipped: none
- HTML desktop/mobile-frame overflow: none

## Final result

final result: passed
