# Design QA — 结构化 GUI 画布

## Evidence

- source visual truth path: `C:\Users\jiazh\AppData\Local\Temp\codex-clipboard-d4e49611-7248-4a66-8b3b-aaa7f596892c.png`
- implementation screenshot path: `C:\Users\jiazh\AppData\Local\Temp\t002-structured-gui-desktop.png`
- focused inspector screenshot path: `C:\Users\jiazh\AppData\Local\Temp\t002-structured-gui-inspector.png`
- mobile screenshot path: `C:\Users\jiazh\AppData\Local\Temp\t002-structured-gui-mobile.png`
- viewport: desktop `1600 × 1000`; mobile `390 × 844`
- state: 知乎回答项目，步骤 05「确认」，画布版本 8，交互测试数据已通过撤销恢复
- browser-rendered route: `http://127.0.0.1:3000/workspace/e4a72c96-153b-4737-ac35-96965986c59a`

源图来自 Windows 125% 显示缩放（文件为 2559 × 1347）。最终实现以用户当前 `1600 × 1000` 浏览器视口捕获；源图与实现图已放入同一视觉比较输入，比较重点是保持原有产品框架和视觉调性，并验证中央原始 JSON 区替换为 GUI 后的信息层级。

## Full-view comparison evidence

- Fonts and typography: 保留源图的宋体/衬线展示标题、紧凑无衬线工具文字和粗体紫色关键状态；GUI 使用业务标签、正文值和胶囊列表建立层级，没有等宽代码或 JSON 文本。
- Spacing and layout rhythm: 左侧导航、中央流程、右侧摘要三栏结构与源图一致；中央原始 JSON 区被同位置的画布工具栏、结构化节点、AI 指令区和无代码检查器替换。卡片边界、细分隔线和小圆角延续现有系统。
- Colors and tokens: 暖白纸张底色、梅紫主色、灰褐边框与低对比辅助文本均复用项目 token；没有新增渐变装饰或脱离产品调性的高饱和色。
- Image quality and asset fidelity: 继续使用现有方向预览图与 Lucide 图标；没有以 CSS 图形、emoji、手写 SVG 或占位资产替代源图资产。源图中的桌面宠物为运行环境叠层，不属于产品资产。
- Copy and content: 节点把内部字段转换为「创作意图」「目标读者」「必须避免」等业务文案；创作包字段 ID 和决策枚举会替换为中文标签，页面不显示 `core_judgment`、`ending-1` 等实现细节。
- Responsiveness: 390px 视口下页面框架无横向溢出；流程轨与画布分别保留内部滚动，工具栏保持可操作，标题和主按钮没有相互覆盖。

## Focused region comparison evidence

中央确认区是唯一发生语义变化的区域。桌面全图呈现结构化节点与整体层级；聚焦截图单独验证「关键决策」节点对应三个带可访问名称的业务下拉框、保存按钮和 AI 编辑区；移动截图验证窄屏工具栏与画布容器。右侧摘要、流程轨和导航在全图中已足够辨认。

## Primary interactions tested

1. 加载已有画布；GET 自动把旧版序列化文本节点升级为结构化数据，同时保留节点位置、尺寸和 revision。
2. 选择「关键决策」节点，检查器展示「表达立场」「证据策略」「结尾方式」三个下拉框及真实选项标签。
3. 将表达立场从「先给结论」改为「从经历切入」并保存；revision 从 6 增加到 7，节点和检查器同步更新。
4. 点击撤销；revision 增加到 8，表达立场恢复为「先给结论」，测试改动未留在项目中。
5. 检查 DOM 中不再出现 `core_judgment`、`target_readers`、`ending-1`，对应中文字段与决策标签可见。
6. 检查 1600 × 1000 和 390 × 844 视口；控制台无 error/warn，框架错误叠层为空。

## Findings and comparison history

### Iteration 1

- [P2] AI 可将节点移动到 1120px 画布横向边界之外。
  - evidence: 真实模型将 450px 宽节点移动到 x≈1052，导致节点主体超出画布。
  - fix: `canvas-core.ts` 对 insert/move/resize 统一钳制横向位置与宽度；模型指令同步声明 `x + width <= 1120`；新增边界测试。
  - post-fix evidence: 单元测试验证 x=5000 和 width=1800 均被安全限制，画布内容不再产生页级横向溢出。

- [P2] 确认步骤的 sticky 底部导航曾覆盖 AI 指令区。
  - evidence: AI dock 为 y=945.75–1035.75，下一步按钮为 y=959–1001，存在重叠。
  - fix: 仅在 `.uc-review-stage` 将阶段 footer 改为 static，保留其他步骤原有 sticky 行为。
  - post-fix evidence: AI dock bottom=1035.75，下一步按钮 top=1121.75，`overlap=false`；移动端截图也显示两块区域完全分离。

### Iteration 2

- 未发现可执行的 P0/P1/P2 差异。
- P3 follow-up: 超长分析文本仍以节点内滚动为主；后续可增加节点折叠与自动高度，但不影响当前编辑、AI 操作或生成流程。

### Iteration 3 — 结构化 GUI

- [P2] 首次 GUI 渲染仍在部分动态文案中暴露创作包字段 ID 与决策枚举。
  - evidence: 需求分析节点可见 `core_judgment`、`target_readers`，约束文案可见 `ending-1`。
  - fix: 将当前创作包输入字段标签和决策选项标签传入通用画布，在只读 GUI 与编辑器中统一替换独立标识符；底层 ArtifactSpec 保持不变。
  - post-fix evidence: 浏览器 DOM 检查三个内部标识符均为 false，页面显示「核心判断」「目标读者」「回到判断标准」。

- 未发现其他可执行的 P0/P1/P2 差异。
- P3 follow-up: 超长方案节点继续采用节点内滚动；后续可增加折叠和局部搜索，不阻塞当前结构化查看和编辑。

## Console and runtime

- desktop console errors/warnings: 0
- mobile console errors/warnings: 0
- framework error overlay: none
- blank-page check: passed
- persistent page controls covered or clipped: none after iteration 2

## Final result

final result: passed
