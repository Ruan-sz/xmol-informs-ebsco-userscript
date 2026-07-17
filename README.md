# UTD Easy Reach

一个用于简化论文访问流程的 Tampermonkey 用户脚本。目前覆盖 SAGE、INFORMS、X-MOL 和 EBSCO。

## 功能

- 访问 `https://journals.sagepub.com/doi/abs/<DOI>` 时，在 `document-start` 阶段立即跳转到 `https://sage.cnpereading.com/doi/<DOI>`。
- 在 `pubsonline.informs.org` 论文页添加 `EBSCO 搜索` 按钮。
- 在 X-MOL 论文页中，仅当论文所属期刊位于 INFORMS 白名单时显示 `EBSCO 搜索` 按钮。
- INFORMS/X-MOL 的标题一旦出现在页面中就尝试显示按钮，不等待整页加载完成；完整布局出现后，按钮会自动移动到原有的首选位置。
- 点击按钮后复制论文标题并打开 EBSCO 搜索页；如果 EBSCO 先要求登录，登录完成后会继续进入原搜索结果。

## 安装与更新

推荐通过以下 Raw 地址安装：

<https://raw.githubusercontent.com/Ruan-sz/xmol-informs-ebsco-userscript/main/utd-easy-reach.user.js>

脚本包含固定的 `@updateURL`、`@downloadURL` 和递增的 `@version`。通过上述地址安装后，Tampermonkey 可以从 GitHub 检查后续版本。

### 从旧版升级

为避免 Tampermonkey 把升级版识别成全新的脚本，代码保留了旧版的基础 `@name` 和 `@namespace`，并通过本地化名称显示为 `UTD Easy Reach`。第一次升级时重新打开上面的 Raw 地址并安装，Tampermonkey 应提示更新或覆盖现有脚本，而不是新增副本。

仓库同时保留旧文件名 `informs-to-ebsco.user.js` 作为兼容入口，其内容与新版文件完全相同。曾经从旧 GitHub Raw 地址安装的用户仍可检查到 `0.7.0`，升级后会通过新的 `@updateURL` 转到 `utd-easy-reach.user.js`。

如果此前已经产生两个副本，请保留版本号较高的 `UTD Easy Reach`，停用或删除旧副本即可。

## Greasy Fork 同步

在 Greasy Fork 的“从 URL 导入”或现有脚本的“代码同步”页面填写以下地址，并选择自动同步：

```text
https://raw.githubusercontent.com/Ruan-sz/xmol-informs-ebsco-userscript/main/utd-easy-reach.user.js
```

必须使用这个指向 `main` 分支的 Raw `.user.js` 地址，不能使用 GitHub 仓库页、`blob` 页面或某次提交的固定地址。每次发布时同时提高 `@version`，Tampermonkey 才会识别到新版本。

## 支持站点

- `https://journals.sagepub.com/doi/abs/*`
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

## 项目结构

- `utd-easy-reach.user.js`：可直接安装和发布到 Greasy Fork 的完整用户脚本。
- `informs-to-ebsco.user.js`：与主脚本相同的旧地址兼容镜像，不用于新的 Greasy Fork 同步配置。
- `LICENSE`：MIT 许可证。

仓库暂时保留原名称，以保证现有链接稳定；脚本及文档统一使用 `UTD Easy Reach`。

## 许可证

MIT
