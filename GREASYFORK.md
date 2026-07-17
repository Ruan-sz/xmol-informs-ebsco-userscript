# UTD Easy Reach

快速跳转 SAGE 中图易阅，并从 INFORMS/X-MOL 一键检索 EBSCO。

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

- SAGE：访问 `https://journals.sagepub.com/doi/abs/<DOI>` 后，自动跳转到 `https://sage.cnpereading.com/doi/<DOI>`。
- INFORMS：进入论文详情页，标题出现后点击 `EBSCO 搜索`。
- X-MOL：属于支持期刊的论文页会显示 `EBSCO 搜索` 按钮。
- EBSCO：如果先要求登录，完成登录后会继续进入原搜索结果。

## 主要功能

- 在页面加载初期完成 SAGE 重定向，不等待全文页面渲染。
- INFORMS/X-MOL 标题出现后尽快显示按钮，不等待整页加载完成。
- 自动复制论文标题并构造 EBSCO 搜索链接。
- 记住登录前的 EBSCO 搜索，登录完成后自动续跳。
- 仅在指定 INFORMS 期刊的 X-MOL 页面显示按钮。

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
- 点击按钮时只读取并复制当前论文标题。
- EBSCO 待续跳记录仅保存在用户脚本本地存储中，并会在完成或过期后清除。
- 本脚本用于简化合法订阅资源的访问流程，不绕过网站登录或机构授权。

许可证：MIT
