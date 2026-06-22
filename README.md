# INFORMS / X-MOL -> EBSCO Userscript

一个面向 `INFORMS` 与 `X-MOL` 的油猴脚本。

它会在以下页面添加一个 `EBSCO 搜索` 按钮：

- `pubsonline.informs.org` 的论文页
- `x-mol.com` 的论文页，但仅当期刊属于指定的 `INFORMS` 期刊白名单

点击按钮后，脚本会：

1. 读取当前论文标题
2. 复制标题到剪贴板
3. 打开 `EBSCO` 搜索结果页
4. 如果 `EBSCO` 先要求登录，登录后自动续跳到对应搜索页

## 支持站点

- `https://pubsonline.informs.org/*`
- `https://research.ebsco.com/*`
- `https://www.x-mol.com/paper/*`

## X-MOL 白名单期刊

- Decision Analysis
- Information Systems Research
- INFORMS Journal on Applied Analytics
- INFORMS Journal on Computing
- INFORMS Journal on Data Science
- INFORMS Journal on Optimization
- INFORMS Transactions on Education
- Management Science
- Manufacturing & Service Operations Management
- Marketing Science
- Mathematics of Operations Research
- Operations Research
- Organization Science
- Service Science
- Stochastic Systems
- Strategy Science
- Transportation Science

## 安装

1. 安装 Tampermonkey。
2. 导入 [informs-to-ebsco.user.js](./informs-to-ebsco.user.js)。
3. 在浏览器扩展设置中允许用户脚本运行。

## 维护说明

脚本主体是单文件 userscript，便于直接发布到：

- Tampermonkey
- Greasy Fork
- GitHub

如果后续需要扩展新的来源站点，优先新增：

- 来源页识别函数
- 标题提取函数
- 按钮插入位置函数

## 许可证

MIT
