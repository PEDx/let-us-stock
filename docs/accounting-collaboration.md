# 复式记账多人协作设计（Firebase）

本文档描述复式记账在多人协作（家庭账本）场景下的权限、写入一致性和审计策略。

## 目标
- 多人协作且角色权限清晰。
- 并发写入时余额一致。
- 可审计、可恢复。
- 分录内单币种、允许同账户多行。

## 核心原则
- **分录是唯一真实来源**，账户余额为可重建缓存。
- **单分录单币种**，分录内所有账户币种必须一致。
- **修改 = 回滚旧影响 + 应用新影响**。
- **软删除优先**（保留 `deletedAt` 便于审计/恢复）。

## 数据模型（逻辑结构）
- 账簿 Book
  - id, name, defaultCurrency, mainLedgerId, createdAt, updatedAt
- 成员 Member
  - bookId, uid, role(owner/admin/member), joinedAt, status
- 账本 Ledger
  - id, name, type, defaultCurrency, createdAt, updatedAt
- 账户 Account
  - id, name, type, currency, parentId, path, balance(缓存), archived
- 分录 Entry
  - id, date(YYYY-MM-DD), description, currency, tags, payee, note
  - transferId(可选), createdAt, updatedAt, deletedAt(可选)
- 分录行 EntryLine
  - id, entryId, accountId, type(debit/credit), amount, note
  - date, currency（冗余用于索引）
- 分录修订 EntryRevision（可选）
  - entryId, snapshot, createdAt, createdBy

## 角色与权限
- **Owner**：成员管理、账户/账本/分录管理
- **Admin**：账户/分录管理
- **Member**：分录新增/修改/删除

## 写入一致性（事务）

所有分录写入必须在 Firestore Transaction 中完成：

### 新增分录
1. 读取涉及的账户
2. 校验单币种与借贷平衡
3. 写入 entry 与 entryLines
4. 更新账户余额缓存
5. 更新 ledger.updatedAt

### 修改分录
1. 读取旧 entry + lines + accounts
2. 回滚旧 lines 对余额的影响
3. 校验新 lines
4. 应用新 lines 的影响
5. 写入 entry + lines
6. 可选：写入 revision 备份

### 删除分录
1. 读取 entry + lines
2. 回滚余额
3. 软删除 entry（设置 deletedAt）

## 并发冲突
- 每条分录维护 `updatedAt` 或 `entryVersion`。
- 客户端更新时带上版本，事务内校验，冲突则拒绝写入。
- 前端提示用户刷新后重试。

## 审计与恢复
- 可选 `EntryRevision` 保存旧快照。
- 软删避免数据不可逆丢失。
- 提供“重建余额”工具校验一致性。

## 余额重建策略
- 全量重建：
  - 所有账户余额置 0
  - 按日期重放所有分录（<= today）
  - 逐条应用 line delta

## 历史余额（按日期还原）
- 查询某日 D 的余额：重放 `date <= D` 的分录。
- 规模增长后可加“月度快照”，用快照 + 增量分录计算。

## 跨币种转账
- 不允许单条分录跨币种。
- 使用两条分录（分别属于不同币种）并用 `transferId` 关联。
- UI 端合并展示为一次交易。

## UI 协作提示
- 展示“最后更新人/时间”
- 删除或修改共享分录时需确认
- 冲突时提示刷新

## 待定问题
- entryLines 是否独立集合还是子集合
- 快照粒度（月/周）
- 是否引入历史汇率换算净资产
