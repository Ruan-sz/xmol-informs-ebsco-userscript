# UTD Easy Reach

一个简化论文访问流程的 Tampermonkey 用户脚本。目前支持 SAGE 与 Wiley POMS 旧链接到中图易阅的即时跳转，以及 INFORMS/X-MOL 到 EBSCO 的一键检索。

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

## 支持站点

- `https://journals.sagepub.com/doi/*`
- `https://onlinelibrary.wiley.com/doi/*`（仅重定向 `10.1111/poms.*`）
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
- 点击 EBSCO 按钮时，只会读取并复制当前论文标题。
- EBSCO 待续跳记录仅保存在用户脚本本地存储中，并会在完成或过期后清除。
- 脚本用于简化合法订阅资源的访问流程，不绕过网站登录或机构授权。

## 项目结构

- `utd-easy-reach.user.js`：主用户脚本，也是 Greasy Fork 的代码同步来源。
- `informs-to-ebsco.user.js`：旧地址兼容镜像。
- `GREASYFORK.md`：Greasy Fork 附加信息的同步来源及可复制 Markdown。
- `CHANGELOG.md`：版本更新记录。
- `tests/redirect-smoke.cjs`：SAGE/Wiley DOI 重定向冒烟测试。
- `LICENSE`：MIT 许可证。

仓库暂时保留原名称，以保证已有链接稳定；脚本和文档统一使用 `UTD Easy Reach`。

运行重定向测试：

```powershell
node tests/redirect-smoke.cjs
```

## 许可证

MIT
