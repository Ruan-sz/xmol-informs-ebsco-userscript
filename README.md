# UTD Easy Reach

一个简化论文访问流程的 Tampermonkey 用户脚本。支持 SAGE/Wiley POMS 到中图易阅的即时跳转、INFORMS/X-MOL 到 EBSCO 的一键检索，以及 EBSCO PDF 按作者、年份、期刊代码和标题命名。

## 安装与使用

### 1. 安装 Tampermonkey

> 已经安装 Tampermonkey 且能够正常运行用户脚本的用户，可以直接跳到第 2 步。

1. 打开 [Tampermonkey 官方网站](https://www.tampermonkey.net/)。
2. 选择正在使用的浏览器，并从浏览器扩展商店安装 Tampermonkey。
3. Chrome 或 Edge 如果提示“请启用允许用户脚本”，请进入扩展管理页，打开 Tampermonkey 的“允许用户脚本”选项。

### 2. 安装 UTD Easy Reach

如果正在 Greasy Fork 查看本脚本，点击页面顶部的“安装此脚本”，然后在 Tampermonkey 安装页确认安装。

也可以直接打开 GitHub Raw 安装地址：

<https://raw.githubusercontent.com/Ruan-sz/xmol-informs-ebsco-userscript/main/utd-easy-reach.user.js>

### 3. 使用脚本

- SAGE：访问 `https://journals.sagepub.com/doi/<DOI>`、`/doi/abs/<DOI>` 等 DOI 页面后，脚本会立即跳转到 `https://sage.cnpereading.com/doi/<DOI>`，无需点击按钮。
- Wiley POMS：访问 `https://onlinelibrary.wiley.com/doi/.../10.1111/poms.*` 的 POMS 旧页面时，同样会立即跳转到中图易阅；其他 Wiley 期刊不受影响。
- INFORMS：进入论文详情页，标题出现后页面会显示 `EBSCO 搜索` 按钮；点击后复制标题并打开 EBSCO 搜索结果。
- X-MOL：当论文属于下方 INFORMS 期刊白名单时显示 `EBSCO 搜索` 按钮。
- EBSCO：如果第一次进入时要求登录，完成登录后脚本会继续进入原本的搜索结果页。
- EBSCO PDF：照常点击阅读器的“下载”，选择 PDF 后确认，文件名会自动使用“第一作者姓氏 + 年份 + 期刊代码. 论文标题”，例如 `Akkas2019mnsc. Drivers of Retail Performance.pdf`。

### EBSCO PDF 文件名

更新到 `0.10.0` 后，刷新已打开的 EBSCO 页面，再使用原来的下载按钮。脚本自动替换 `EBSCO-FullText-日期.pdf`；不需要新增操作，也不会重新请求 PDF。

命名格式为 `第一作者姓氏年份期刊代码. 论文标题.pdf`。年份使用文献发表年份；期刊代码使用下表中 INFORMS 期刊网址的代码。作者、年份或期刊代码缺失时省略对应部分，标题始终保留。

例如，页面标注第一作者为 `Xiao, Jin`、发表日期为 `20230901`、期刊为 `INFORMS Journal on Computing` 时，文件名为：

```text
Xiao2023ijoc. Black-Box Attack-Based Security Evaluation Framework for Credit Card Fraud Detection Models.pdf
```

- Windows 禁用的 `<>:"/\|?*` 和控制字符替换为空格，移除文件名末尾的句点、空格。
- `CON`、`NUL`、`COM1` 等系统保留名称会加 `_` 前缀；过长标题会截短，并保留完整的 `.pdf` 扩展名。
- 找不到单篇论文标题时保留原名；音频、HTML、压缩包和已自定义文件名不受影响。
- 此功能针对 EBSCO 网页下载按钮，不修改浏览器自带 PDF 阅读器的“另存为”或已下载到本地的文件。

脚本新增的 `unsafeWindow` 权限用于在 EBSCO 网页生成下载链接时修改文件名。

## 支持站点

- `https://journals.sagepub.com/doi/*`
- `https://onlinelibrary.wiley.com/doi/*`（仅重定向 `10.1111/poms.*`）
- `https://pubsonline.informs.org/*`
- `https://research.ebsco.com/*`
- `https://www.x-mol.com/paper/*`

## INFORMS 期刊代码

这份列表同时用于 X-MOL 按钮白名单和 EBSCO PDF 文件名。代码与 `pubsonline.informs.org/journal/<代码>` 一致。

| 期刊 | 代码 |
| --- | --- |
| Decision Analysis | `deca` |
| Information Systems Research | `isre` |
| INFORMS Journal on Applied Analytics | `ijaa` |
| INFORMS Journal on Computing | `ijoc` |
| INFORMS Journal on Data Science | `ijds` |
| INFORMS Journal on Optimization | `ijoo` |
| INFORMS Transactions on Education | `ited` |
| Management Science | `mnsc` |
| Manufacturing & Service Operations Management | `msom` |
| Marketing Science | `mksc` |
| Mathematics of Operations Research | `moor` |
| Operations Research | `opre` |
| Organization Science | `orsc` |
| Service Science | `serv` |
| Stochastic Systems | `stsy` |
| Strategy Science | `stsc` |
| Transportation Science | `trsc` |

## 更新与 Greasy Fork 同步

脚本包含 `@updateURL`、`@downloadURL` 和递增的 `@version`，通过 Greasy Fork 或 GitHub Raw 安装后，可由 Tampermonkey 检查后续更新。

Greasy Fork 的源码与附加信息需要在脚本的“管理 / Admin”页分别设置同步地址：

代码同步地址：

```text
https://raw.githubusercontent.com/Ruan-sz/xmol-informs-ebsco-userscript/main/utd-easy-reach.user.js
```

附加信息同步地址：

```text
https://raw.githubusercontent.com/Ruan-sz/xmol-informs-ebsco-userscript/main/GREASYFORK.md
```

两项都应指向 `main` 分支上的 Raw 文件，而不是 GitHub 的仓库页、`blob` 页面或某次提交的固定地址。`GREASYFORK.md` 也可以直接复制到 Greasy Fork 的“附加信息”编辑框，并选择 Markdown。

## 从旧版升级

`0.8.0` 起基础标题正式改为 `UTD Easy Reach`，但继续保留原 `@namespace`、更新地址和旧文件名兼容入口。通过原更新渠道升级通常会直接改名；如果手动安装后出现两个副本，请保留版本号较高的 `UTD Easy Reach`，停用或删除旧版。

仓库中的 `informs-to-ebsco.user.js` 与主脚本内容完全相同，仅用于兼容曾从旧 GitHub Raw 地址安装的用户。

## 隐私与使用范围

- 脚本不收集或上传个人数据。
- EBSCO 检索和 PDF 命名仅读取当前论文的标题、作者、年份和期刊等题录信息；检索按钮只将标题复制到剪贴板。
- EBSCO 待续跳记录仅保存在用户脚本本地存储中，并会在完成或过期后清除。
- 脚本用于简化合法订阅资源的访问流程，不绕过网站登录或机构授权。

## 项目结构

- `utd-easy-reach.user.js`：主用户脚本，也是 Greasy Fork 的代码同步来源。
- `informs-to-ebsco.user.js`：旧地址兼容镜像。
- `GREASYFORK.md`：Greasy Fork 附加信息的同步来源及可复制 Markdown。
- `CHANGELOG.md`：版本更新记录。
- `tests/redirect-smoke.cjs`：SAGE/Wiley DOI 重定向冒烟测试。
- `tests/ebsco-download-browser.cjs`：浏览器实际下载与文件命名回归测试（需要 Playwright 和 Chrome）。
- `LICENSE`：MIT 许可证。

仓库暂时保留原名称，以保证已有链接稳定；脚本和文档统一使用 `UTD Easy Reach`。

运行重定向测试：

```powershell
node tests/redirect-smoke.cjs
```

在已安装 Playwright 和 Chrome 的环境中运行下载测试：

```powershell
node tests/ebsco-download-browser.cjs
```

## 许可证

MIT
