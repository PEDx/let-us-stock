# 存储优化方案

## 方案 1: 增量同步（推荐）

### 核心思路
只同步变更的数据，而不是全量数据。

### 实现方式

```typescript
// 变更日志结构
interface ChangeLog {
  id: string;
  type: 'entry_added' | 'entry_updated' | 'entry_deleted' | 'account_changed';
  ledgerId: string;
  entryId?: string;
  data: unknown;
  timestamp: string;
}

interface SyncState {
  lastSyncAt: string;
  changeLogs: ChangeLog[];
  // 全量数据只在首次同步或冲突时使用
  fullData?: BookData;
}
```

### 优点
- ✅ 传输量小（只传变更）
- ✅ 同步速度快
- ✅ 支持多设备实时同步
- ✅ 可以保留历史变更记录

### 缺点
- ⚠️ 实现复杂度较高
- ⚠️ 需要处理冲突合并

---

## 方案 2: 数据压缩 + 分块存储

### 核心思路
将数据压缩后分块存储到多个 Gist 文件。

### 实现方式

```typescript
// 分块存储
interface ChunkedBookData {
  chunks: {
    id: string;
    ledgerId: string;
    entries: JournalEntryData[]; // 每块 1000-2000 条
    checksum: string;
  }[];
  metadata: {
    totalEntries: number;
    chunkCount: number;
    lastUpdated: string;
  };
}
```

### 优点
- ✅ 可以突破单文件大小限制
- ✅ 可以并行加载
- ✅ 支持按需加载（懒加载）

### 缺点
- ⚠️ 需要管理多个 Gist
- ⚠️ 同步逻辑复杂
- ⚠️ 可能达到 Gist 数量限制（1000 个）

---

## 方案 3: 使用专门的数据库服务

### 推荐服务
- **Supabase** (PostgreSQL) - 免费额度大，实时同步
- **Firebase Firestore** - Google 出品，实时同步
- **PlanetScale** (MySQL) - 无服务器，按需扩展
- **Turso** (SQLite) - 边缘数据库，低延迟

### 优点
- ✅ 专为大数据设计
- ✅ 支持增量同步
- ✅ 实时同步
- ✅ 查询性能好
- ✅ 有完善的权限管理

### 缺点
- ⚠️ 需要引入新的依赖
- ⚠️ 可能需要付费（超出免费额度）
- ⚠️ 迁移成本较高

---

## 方案 4: 混合方案（本地优先 + 定期备份）

### 核心思路
- 日常使用：完全依赖本地 IndexedDB
- 云端备份：定期（如每天/每周）全量备份到 Gist
- 恢复：从备份恢复

### 实现方式

```typescript
// 备份策略
interface BackupStrategy {
  // 自动备份间隔（小时）
  autoBackupInterval: number;
  // 手动备份
  manualBackup: () => Promise<void>;
  // 恢复备份
  restoreBackup: (backupId: string) => Promise<void>;
}
```

### 优点
- ✅ 实现简单
- ✅ 日常使用快（无网络延迟）
- ✅ 可以保留多个历史备份

### 缺点
- ⚠️ 不是实时同步
- ⚠️ 多设备同步需要手动触发

---

## 方案 5: 数据归档 + 活跃数据分离

### 核心思路
- 将旧数据（如 1 年前）归档到单独的 Gist
- 只同步最近 1 年的活跃数据
- 需要历史数据时按需加载

### 优点
- ✅ 大幅减少同步数据量
- ✅ 保持实时同步的响应速度
- ✅ 历史数据仍然可访问

### 缺点
- ⚠️ 需要实现归档逻辑
- ⚠️ 查询历史数据需要额外请求

---

## 推荐实施路径

### 短期（立即实施）
1. **数据压缩**：使用 `pako` 或 `lz-string` 压缩 JSON
   ```typescript
   import pako from 'pako';
   const compressed = pako.deflate(JSON.stringify(data));
   ```
   - 可以减少 70-80% 的数据量
   - 50MB → 10-15MB

2. **优化数据结构**：移除冗余字段
   - 不存储计算字段（如账户余额，实时计算）
   - 使用更短的 ID（如 nanoid 而不是 UUID）

### 中期（1-2 周）
3. **实现增量同步**
   - 添加变更日志
   - 只同步变更的数据
   - 处理冲突合并

### 长期（1-2 月）
4. **考虑迁移到专业数据库**
   - 如果数据量继续增长
   - 如果需要更复杂的查询
   - 如果需要实时协作

---

## 快速修复：数据压缩实现

```typescript
// app/lib/storage/compression.ts
import pako from 'pako';

export function compress(data: unknown): string {
  const json = JSON.stringify(data);
  const compressed = pako.deflate(json, { to: 'string' });
  return btoa(compressed); // Base64 编码
}

export function decompress(compressed: string): unknown {
  const binary = atob(compressed);
  const decompressed = pako.inflate(binary, { to: 'string' });
  return JSON.parse(decompressed);
}
```

在 `api.sync.ts` 中使用：
```typescript
const content = compress(storedData); // 而不是 JSON.stringify
```
