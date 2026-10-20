# UTD Easy Reach

快速将 SAGE 与 Wiley POMS 旧链接跳转到中图易阅，从 INFORMS/X-MOL 一键检索 EBSCO，并以论文标题命名 EBSCO PDF。

## 安装与使用

### 1. 安装 Tampermonkey

> 已经安装 Tampermonkey 且能够正常运行用户脚本的用户，可以直接跳到第 2 步。

1. 打开 [Tampermonkey 官方网站](https://www.tampermonkey.net/)。
2. 选择正在使用的浏览器，并从浏览器扩展商店安装 Tampermonkey。
3. Chrome 或 Edge 如果提示“请启用允许用户脚本”，请进入扩展管理页，打开 Tampermonkey 的“允许用户脚本”选项。

### 2. 安装 UTD Easy Reach

点击本页面顶部的“安装此脚本”，然后在 Tampermonkey 安装页确认安装。

也可以使用 GitHub Raw 安装地址：

<https://raw.githubusercontent.com/Ruan-sz/xmol-informs-ebsco-userscript/main/utd-easy-reach.user.js>

### 3. 使用脚本

- SAGE：访问 `https://journals.sagepub.com/doi/<DOI>`、`/doi/abs/<DOI>` 等 DOI 页面后，自动跳转到 `https://sage.cnpereading.com/doi/<DOI>`。
- Wiley POMS：访问 `https://onlinelibrary.wiley.com/doi/.../10.1111/poms.*` 的旧页面时自动跳转；其他 Wiley 期刊不受影响。
- INFORMS：进入论文详情页，标题出现后点击 `EBSCO 搜索`。
- X-MOL：属于支持期刊的论文页会显示 `EBSCO 搜索` 按钮。
- EBSCO：如果先要求登录，完成登录后会继续进入原搜索结果。
- EBSCO PDF：照常点击阅读器的“下载”，选择 PDF 后确认，保存的文件会以论文标题命名。

## 主要功能

- 在页面加载初期完成 SAGE/Wiley POMS 重定向，不等待全文页面渲染。
- INFORMS/X-MOL 标题出现后尽快显示按钮，不等待整页加载完成。
- 自动复制论文标题并构造 EBSCO 搜索链接。
- 记住登录前的 EBSCO 搜索，登录完成后自动续跳。
- 仅在指定 INFORMS 期刊的 X-MOL 页面显示按钮。
- 将 EBSCO 默认的 `EBSCO-FullText-日期.pdf` 自动改为论文标题，处理非法文件名符号、系统保留名称和过长标题。

## EBSCO 下载说明

更新脚本后请刷新已打开的 EBSCO 页面，再使用原来的下载按钮。脚本会移除标题末尾的句点，将 Windows 文件名禁用的符号替换为空格，并保留 `.pdf` 扩展名。

例如：`Black-Box Attack-Based Security Evaluation Framework for Credit Card Fraud Detection Models.pdf`

找不到论文标题时保留原名。HTML、音频、压缩包和自定义文件名不受影响；此功能不修改浏览器自带 PDF 阅读器的“另存为”或已经下载的本地文件。

新增的 `unsafeWindow` 权限用于在 EBSCO 网页生成下载链接时修改文件名。

## X-MOL 支持期刊

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

## 更新

脚本可通过 Greasy Fork 或 GitHub Raw 检查更新。项目源码、更新记录和问题反馈入口：

<https://github.com/Ruan-sz/xmol-informs-ebsco-userscript>

## 隐私说明

- 不收集或上传个人数据。
- 检索和 PDF 命名仅读取当前论文标题；检索按钮同时将标题复制到剪贴板。
- EBSCO 待续跳记录仅保存在用户脚本本地存储中，并会在完成或过期后清除。
- 本脚本用于简化合法订阅资源的访问流程，不绕过网站登录或机构授权。

许可证：MIT
