# 决策与踩坑日志 — XDownloader

只追加、不改写；新决定推翻旧决定时另起一行写明替代关系。2026-10-03 前的记录从 Obsidian vault 的 `Projects/XDownloader/NOTES.md` 原样迁入；当前断点见根目录 `HANDOFF.md`。

- 2026-08-15 GitHub fork 命名为 XDownloader（非 TwitterMediaHarvest）。(—)
- 2026-08-15 Thread 导出采用 Canvas 2D 渲染，不引入 html2canvas。(—)
- 2026-08-15 lint-staged 对 sass 加 `--ignore-unknown`，修复 macOS pre-commit 失败。(b00b1ce)
- 2026-08-15 husky/common.sh CRLF 转 LF，修复 macOS bash 语法错误。(b00b1ce)
- 2026-10-03 [决策] 交接记录从 Obsidian vault 迁入仓库（AZ-WORKFLOW v2）：`PROJECT.md` + `HANDOFF.md` + 本日志，随 git 推送；vault 笔记只留迁移说明，项目管理不再使用 Obsidian
- 2026-10-03 [决策] 规则升到 AZ-WORKFLOW v2.2：开工时对照 git 记录补齐断点之后的进展；每完成一个阶段性成果就更新 HANDOFF.md 并提交；交接前跑 check-projects.sh --here
