# Changelog

## 0.8.1

- 支持 SAGE 的 `/doi/<DOI>` 以及 `abs`、`full`、`pdf`、`epdf` DOI 路径。
- 支持将 Wiley 上 `10.1111/poms.*` 的 POMS 旧链接跳转到 SAGE 中图易阅。
- Wiley 重定向严格限制为 POMS DOI，避免影响其他 Wiley 期刊。

## 0.8.0

- 基础脚本标题正式改为 `UTD Easy Reach`，并缩短中英文简介。
- 新增可供 Greasy Fork 单独同步或手动复制的 `GREASYFORK.md`。
- 重写 GitHub 安装文档，从 Tampermonkey 下载、权限设置到脚本使用完整说明。

## 0.7.1

- 补齐 `@name:en`、`@name:zh` 对应的本地化 `@description`，修复 Greasy Fork URL 同步校验错误。

## 0.7.0

- 新增 SAGE DOI 页面到中图易阅的 `document-start` 即时重定向。
- INFORMS 与 X-MOL 按钮改为从 `document-start` 观察页面，在标题出现后提前挂载。
- 新增 GitHub Raw 自动更新元数据及 Greasy Fork URL 同步说明。
- 中文显示名升级为 `UTD Easy Reach`，同时保留旧基础标识以降低重复安装风险。
- 保留旧文件名兼容镜像，使曾从旧 GitHub Raw 地址安装的脚本也能迁移到新版更新地址。

## 0.6.0

- 支持在 INFORMS 论文页和符合期刊白名单的 X-MOL 页面搜索 EBSCO。
- 支持 EBSCO 登录完成后继续进入目标搜索页。
