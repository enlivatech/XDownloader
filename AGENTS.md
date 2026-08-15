# AGENTS.md — XDownloader（Media Harvest Fork）

> 本文件是所有 Agent 的共同工作协议，跟随 Git 同步。
> 跨项目偏好读 Vault 根目录 `USER.md`；项目断点读 Vault `Projects/XDownloader/NOTES.md`。

## 项目

Media Harvest（XDownloader）— 从 X/Twitter 下载图片/视频的浏览器扩展。

Fork 自 [EltonChou/TwitterMediaHarvest](https://github.com/EltonChou/TwitterMediaHarvest)，远程仓库 `enlivatech/XDownloader`。

## Vault 与路径

| 项                   | 值                                                    |
| -------------------- | ----------------------------------------------------- |
| 环境变量             | `OBSIDIAN_VAULT`（必须已设置）                        |
| macOS Vault 物理路径 | `/Users/A.Z/Documents/Obsidian/AZ`                    |
| 项目断点             | `$OBSIDIAN_VAULT/Projects/XDownloader/NOTES.md`       |
| 通用偏好             | `$OBSIDIAN_VAULT/USER.md`                             |
| 代码根目录（macOS）  | `~/Projects/XDownloader`                              |
| 代码实际路径         | `~/Developer/TwitterMediaHarvest`（symlink 指向此处） |

Agent 必须先读 `USER.md`，再读本项目 `NOTES.md`。Vault 与 Git 对账凭证是 commit 短哈希。

## 三个口令

同一语义，所有 Agent 通用：

| 口令         | 动作                                   | 边界                                                            |
| ------------ | -------------------------------------- | --------------------------------------------------------------- |
| **继续项目** | 安全 pull → 读规则与断点 → 核对 → 开工 | 工作区有未提交改动时不得 pull/stash/覆盖；冲突/认证失败必须停止 |
| **项目进度** | 只读核对 Git + Vault → 报告            | 不编辑文件、不 pull、不 commit、不 push、不更新 Vault           |
| **交接项目** | 验证 → commit → push → 写断点          | 无改动不空提交；push 失败仍写断点并记录阻塞原因                 |

### 继续项目

1. 检查 `git status`；工作区干净才 `git pull --ff-only`
2. 重新读取本文件、`USER.md`、`NOTES.md`
3. 核对分支、最近 commit、断点「下一步」，报告后继续

### 项目进度

1. 只读：读三个文件 + `git status` / `git log -3` / `git remote -v`
2. 报告：当前目标、已完成、代码状态、未提交改动、下一步、阻塞
3. 不可访问的来源标「未验证」

### 交接项目

1. 审查 `git diff`，排除 `.env`、密钥、缓存
2. 按风险运行验证（见下方命令）
3. 中文 commit message；普通 `git push`；禁止 force push
4. push 成功后更新 `NOTES.md` 断点五行 + append 决策日志
5. 只能说「本机 Vault 已写入」，不能宣称跨设备已同步

## 安全边界

- 工作区有未提交改动 → 不要 pull / stash / reset
- 本地与远端分叉 → 停止，报告双方 commit，不自动 merge/rebase
- 发现 `.env` / key / token → 停止暂存和推送
- 禁止：`git reset --hard`、`git push --force`、`git add -A`（含无关文件）

## 架构

DDD 分层：

- `domain/` — 实体、值对象、领域服务
- `applicationUseCases/` — 应用层编排
- `infra/` — 基础设施实现
- `contentScript/` / `serviceWorker/` — 扩展入口

## 验证命令

```sh
yarn typecheck                              # 类型检查
yarn test                                   # typecheck + 单元测试
yarn test src/libs/XApi/parsers/threadConversation.test.ts  # Thread 解析测试
yarn build:chrome:all:dev                   # Chrome 开发构建
yarn check:all                              # 提交前全量检查（含 changelog/locale）
yarn lint                                   # ESLint + Prettier
```

## 常用脚本

```sh
yarn watch:chrome:all:dev    # 开发 watch 模式
yarn build:all                 # 全浏览器生产构建
yarn locale:extract            # 提取 i18n 字符串
```

## 开发约定

- 使用 `yarn`，不用 `npm` / `npx`
- TDD：测试与实现同步
- 领域逻辑不依赖基础设施
- 匹配现有命名与文件结构

## Git Remotes

- `origin` → `git@github.com:enlivatech/XDownloader.git`（你的 fork）
- `upstream` → `git@github.com:EltonChou/TwitterMediaHarvest.git`（上游）
