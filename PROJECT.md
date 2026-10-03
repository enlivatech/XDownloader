# XDownloader（Media Harvest Fork）

- 项目标识：1144979e-ff76-49d3-a449-3222c86d0172
- 类别：Development
- 相对路径：Development/XDownloader（macOS 上曾是指向 `~/Developer/TwitterMediaHarvest` 的软链接）
- 交接入口：HANDOFF.md（决策历史在 docs/DECISION_LOG.md）
- 同步方式：git
- 获取来源：`origin` = git@github.com:enlivatech/XDownloader.git（fork），工作分支 `feature/custom`；`upstream` = EltonChou/TwitterMediaHarvest

## 目标与完成标准

从 X/Twitter 下载图片和视频的浏览器扩展（Media Harvest 的 fork），自加功能：Thread 导出长图。

## 约束与工作入口

- 规则：`AGENTS.md`（`CLAUDE.md`、`GEMINI.md` 指向它）。Node ≥ 22，用 `yarn`，不用 npm / npx。

## 环境与验证

`yarn test`、`yarn check:all`、`yarn build:chrome:all:dev`；真机测试需 Mac + Chrome（`yarn watch:chrome:all:dev` 加载扩展）。
