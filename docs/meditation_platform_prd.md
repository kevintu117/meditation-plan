# 冥想音檔平台產品需求文件 (PRD)

## 專案概述

### 產品名稱
冥想音檔平台 (Meditation Audio Platform)

### 產品目標
建立一個支援多平台的冥想音檔串流平台，提供安全、流暢的音檔播放體驗，支援離線下載和進度同步功能。

### 開發時程
**總開發週期：** 2 週
- 第 1 週：後端 API 和資料庫建設
- 第 2 週：SDK 開發和系統整合

---

## 技術架構

### 整體架構圖
```
[手機 App] → [SDK] → [API Gateway] → [後端服務] → [資料庫 + 阿里雲 OSS]
```

### 核心組件
1. **手機 SDK** - 提供統一的開發接口
2. **後端 API** - 業務邏輯和權限控制
3. **資料庫** - 設備資料和音檔元資料
4. **阿里雲 OSS** - 音檔文件存儲
5. **CDN** - 內容加速分發

---

## 手機 SDK 需求

### 功能需求

#### 1. 核心播放功能
**描述：** 提供音檔播放的核心能力

**接口設計：**
```javascript
// 初始化 SDK
MeditationSDK.initialize({
  apiBase: 'https://api.meditation.com',
  apiKey: 'your_api_key',
  environment: 'production'
});

// 設備認證
await sdk.auth.loginDevice();

// 播放音檔
const player = await sdk.audio.play({
  audioId: 'audio-001',
  quality: 'medium' // low, medium, high, auto
});

// 監聽播放事件
player.on('progress', (currentTime, totalTime) => {
  // 更新播放進度
});

player.on('error', (error) => {
  // 處理播放錯誤
});
```

**技術實作：**
- 支援 MP3 和 AAC 格式
- 自動品質調整
- 斷點續播
- 播放進度雲端同步

#### 2. 權限管理
**描述：** 管理設備對不同音檔的存取權限

**接口設計：**
```javascript
// 檢查音檔權限
const hasAccess = await sdk.auth.checkAudioAccess('audio-101');

// 獲取設備可存取音檔
const accessibleAudios = await sdk.device.getAccessibleAudios();

// 權限變更事件
sdk.auth.on('accessRevoked', (audioId) => {
  // 處理權限被撤銷
});
```

**技術實作：**
- STS 臨時憑證管理
- 權限快取機制
- 自動權限更新

#### 3. 離線下載
**描述：** 支援音檔離線下載和管理

**接口設計：**
```javascript
// 下載音檔
const downloadTask = await sdk.download.startAudio({
  audioId: 'audio-101',
  quality: 'medium'
});

// 監聽下載進度
downloadTask.on('progress', (downloaded, total) => {
  const percentage = (downloaded / total) * 100;
});

// 管理下載內容
const downloads = await sdk.download.getDownloadedAudios();
await sdk.download.deleteAudio('audio-101');
```

**技術實作：**
- 分段下載和斷點續傳
- 存儲空間管理
- 下載隊列優化

#### 4. 使用分析
**描述：** 收集設備使用行為數據用於分析

**接口設計：**
```javascript
// 自動事件追蹤
sdk.analytics.trackAudioStart('audio-001');
sdk.analytics.trackAudioComplete('audio-001', listenDuration);

// 自定義事件
sdk.analytics.trackEvent('meditation_session_complete', {
  sessionDuration: 1200,
  audioType: 'mindfulness'
});
```

### 平台支援
- **iOS** (Swift, Objective-C)
- **Android** (Kotlin, Java)
- **React Native** (跨平台)
- **Flutter** (跨平台)

### 效能要求
- 播放啟動時間 < 2 秒
- 音檔切換延遲 < 1 秒
- SDK 體積 < 10MB
- 記憶體使用 < 50MB

---

## 後端 API 需求

### API 架構設計

#### 1. 設備認證 API
```
POST /api/v1/auth/device              # 設備認證
GET  /api/v1/auth/device/session      # 檢查設備會話狀態
```

#### 2. 客戶端管理 API (管理員)
```
GET    /api/v1/admin/clients         # 獲取客戶端列表
POST   /api/v1/admin/clients         # 建立新客戶端
PUT    /api/v1/admin/clients/{id}    # 更新客戶端設定
DELETE /api/v1/admin/clients/{id}    # 刪除客戶端
POST   /api/v1/admin/clients/{id}/regenerate-secret  # 重新生成密鑰
GET    /api/v1/admin/clients/{id}/stats             # 客戶端使用統計
```

#### 3. 音檔管理 API
```
GET  /api/v1/audios                    # 獲取音檔列表
GET  /api/v1/audios/{audioId}          # 獲取音檔詳情
GET  /api/v1/audios/categories         # 獲取音檔分類
```

#### 4. 權限控制 API
```
POST /api/v1/access/check               # 檢查存取權限
POST /api/v1/access/audio-token         # 獲取音檔存取 STS
GET  /api/v1/access/device-permissions   # 獲取設備權限
```

#### 5. 播放管理 API
```
POST /api/v1/playback/start             # 開始播放
POST /api/v1/playback/progress          # 更新播放進度
GET  /api/v1/playback/history          # 獲取播放歷史
```

#### 6. 下載管理 API
```
POST /api/v1/download/authorize         # 授權下載
GET  /api/v1/download/status           # 下載狀態查詢
POST /api/v1/download/complete         # 下載完成回報
```

### API 詳細規格

#### 設備匿名認證 API
```http
POST /api/v1/auth/device
X-Client-ID: client-ios
X-Client-Secret: {client_secret}
Content-Type: application/json

{
  "device_id": "device-ios-abc123",     # 可選，不提供則自動生成
  "device_info": {
    "model": "iPhone 15 Pro",
    "os_version": "iOS 17.1",
    "app_version": "1.0.0",
    "screen": { "width": 1179, "height": 2556 }
  }
}

Response:
{
  "success": true,
  "data": {
    "device_id": "device-ios-abc123",
    "session_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "device": {
      "type": "device",
      "permissions": ["audio_access"]
    },
    "expires_at": "2025-07-30T10:00:00Z"
  }
}
```

#### 音檔存取權限 API
```http
POST /api/v1/access/audio-token
Content-Type: application/json
Authorization: Bearer {session_token}

{
  "audioId": "audio-001",
  "quality": "medium"
}

Response:
{
  "success": true,
  "data": {
    "credentials": {
      "AccessKeyId": "STS.xxx",
      "AccessKeySecret": "xxx",
      "SecurityToken": "xxx",
      "Expiration": "2025-07-29T10:00:00Z"
    },
    "audioPath": "premium/audio-001.mp3",
    "ossEndpoint": "https://meditation-audios.oss-cn-hangzhou.aliyuncs.com",
    "cdnUrl": "https://audios.meditation.com/premium/audio-001.mp3",
    "expiresAt": 1722254400
  }
}
```

#### 播放進度同步 API
```http
POST /api/v1/playback/progress
Content-Type: application/json
Authorization: Bearer {session_token}

{
  "audioId": "audio-001",
  "currentTime": 125.5,
  "totalTime": 1800,
  "sessionId": "session-uuid",
  "quality": "medium"
}

Response:
{
  "success": true,
  "data": {
    "progressSaved": true,
    "recommendations": [
      {
        "audioId": "audio-002",
        "title": "接下來的冥想練習"
      }
    ]
  }
}
```

### 技術實作要求

#### 1. 框架選擇
- **Node.js + Express** 或 **Python + FastAPI**
- **TypeScript** 用於型別安全
- **JWT** 用於設備認證
- **Redis** 用於快取和 session

#### 2. 安全機制
- API Rate Limiting (每分鐘 100 次請求)
- 請求簽名驗證
- STS 權限最小化
- 敏感資料加密存儲

#### 3. 效能要求
- API 響應時間 < 200ms
- 支援併發 1000+ 請求
- 99.9% 可用性

---

## 資料庫設計

### 資料庫選擇
**主資料庫：** MySQL
**快取資料庫：** Redis
**分析資料庫：** ClickHouse (可選)

### 核心資料表

#### 1. 設備表 (devices)
```sql
CREATE TABLE devices (
    id VARCHAR(50) PRIMARY KEY,                    -- device-ios-abc123
    device_type ENUM('ios', 'android', 'web') NOT NULL,
    device_info JSON,                              -- 設備資訊
    first_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_devices_type ON devices(device_type);
CREATE INDEX idx_devices_active ON devices(is_active, last_seen_at);
```

#### 2. 設備權限表 (device_permissions)
```sql
CREATE TABLE device_permissions (
    id VARCHAR(50) PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL,
    permission_level ENUM('basic', 'premium', 'vip') DEFAULT 'basic',
    granted_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (device_id) REFERENCES devices(id),
    INDEX idx_device_permissions (device_id, is_active)
);
```

#### 3. 設備會話表 (device_sessions)
```sql
CREATE TABLE device_sessions (
    id VARCHAR(50) PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL,
    session_token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (device_id) REFERENCES devices(id),
    INDEX idx_device_sessions (device_id, is_active)
);
```

#### 4. API 客戶端表 (api_clients)
```sql
CREATE TABLE api_clients (
    id VARCHAR(50) PRIMARY KEY,              -- client-web, client-ios 等
    name VARCHAR(100) NOT NULL,              -- 客戶端名稱
    client_secret VARCHAR(255) NOT NULL,     -- 加密後的 secret
    client_type ENUM('web', 'mobile', 'sdk', 'partner') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    rate_limit_per_minute INTEGER DEFAULT 100,
    allowed_scopes JSON,                     -- ['auth', 'audios', 'playback']
    metadata JSON,                           -- 額外資訊
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP
);

CREATE INDEX idx_api_clients_active ON api_clients(is_active);
CREATE INDEX idx_api_clients_type ON api_clients(client_type);
```

#### 5. 音檔表 (audios)
```sql
CREATE TABLE audios (
    id VARCHAR(50) PRIMARY KEY, -- audio-101
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructor_name VARCHAR(100),
    category VARCHAR(100), -- mindfulness, sleep, focus
    level VARCHAR(50), -- beginner, intermediate, advanced
    access_level VARCHAR(50) NOT NULL, -- free, basic, premium, vip
    duration_seconds INTEGER,
    thumbnail_url VARCHAR(500),
    audio_path VARCHAR(500) NOT NULL, -- OSS 中的檔案路徑
    file_size_mb DECIMAL(10,2),
    bitrate INTEGER, -- 128, 192, 320 kbps
    price DECIMAL(10,2),
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audios_category ON audios(category);
CREATE INDEX idx_audios_access_level ON audios(access_level);
CREATE INDEX idx_audios_published ON audios(is_published);
```

#### 6. 設備音檔權限表 (device_audio_access)
```sql
CREATE TABLE device_audio_access (
    id VARCHAR(50) PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL,
    audio_id VARCHAR(50) NOT NULL,
    access_type VARCHAR(50) NOT NULL, -- granted, purchased
    granted_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (device_id) REFERENCES devices(id),
    FOREIGN KEY (audio_id) REFERENCES audios(id),
    UNIQUE KEY unique_device_audio (device_id, audio_id)
);

CREATE INDEX idx_device_audio_access ON device_audio_access(device_id, audio_id);
```

#### 7. 播放記錄表 (playback_sessions)
```sql
CREATE TABLE playback_sessions (
    id VARCHAR(50) PRIMARY KEY,
    device_id VARCHAR(50) REFERENCES devices(id),
    device_id VARCHAR(50) REFERENCES devices(id),
    audio_id VARCHAR(50) REFERENCES audios(id),
    session_id VARCHAR(100) UNIQUE NOT NULL,
    started_at TIMESTAMP DEFAULT NOW(),
    last_position_seconds INTEGER DEFAULT 0,
    total_watched_seconds INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    quality VARCHAR(20),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_playback_device_audio ON playback_sessions(device_id, audio_id);
CREATE INDEX idx_playback_device_audio ON playback_sessions(device_id, audio_id);
CREATE INDEX idx_playback_session ON playback_sessions(session_id);
```

#### 8. 下載記錄表 (download_records)
```sql
CREATE TABLE download_records (
    id VARCHAR(50) PRIMARY KEY,
    device_id VARCHAR(50) REFERENCES devices(id),
    device_id VARCHAR(50) REFERENCES devices(id),
    audio_id VARCHAR(50) REFERENCES audios(id),
    quality VARCHAR(20) NOT NULL,
    file_size_mb DECIMAL(10,2),
    downloaded_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_downloads_device ON download_records(device_id, is_active);
CREATE INDEX idx_downloads_device ON download_records(device_id, is_active);
```

### Redis 快取結構
```
# 設備會話快取
device:session:{device_id} -> {session_token, expires_at}

# 設備 Token 快取
device:token:{device_id} -> {jwt_token, expires_at}

# API 客戶端快取
client:{client_id} -> {client_info, rate_limit, scopes}

# STS 憑證快取
sts:audio:device:{device_id}:{audio_id} -> {credentials, expires_at}
sts:audio:device:{device_id}:{audio_id} -> {credentials, expires_at}

# 音檔權限快取
device:access:{device_id} -> {audio_ids: [array], expires_at}

# 播放進度快取
playback:device:{device_id}:{audio_id} -> {position, updated_at}
playback:device:{device_id}:{audio_id} -> {position, updated_at}

# API Rate Limiting
rate_limit:{client_id}:{window} -> {count, window_start}
```

---

## 阿里雲 OSS 存儲架構

### 存儲結構設計
```
meditation-audios/
├── public/                          # 公開內容 (縮圖、預覽)
│   ├── thumbnails/
│   │   └── audio-001-thumb.jpg
│   └── previews/
│       └── audio-001-preview.mp3
├── free/                            # 免費音檔
│   ├── audio-001.mp3
│   ├── audio-001-128k.mp3
│   └── audio-001-320k.mp3
├── basic/                           # 基礎會員內容
│   ├── audio-201.mp3
│   └── audio-202.mp3
├── premium/                         # 付費會員內容
│   ├── audio-301.mp3
│   └── audio-302.mp3
├── vip/                            # VIP 會員內容
│   ├── audio-401.mp3
│   └── exclusive/
└── device-uploads/                 # 設備上傳內容
    └── {device_id}/
```

### OSS 配置需求

#### 1. Bucket 政策
- **存取控制：** 私有 (Private)
- **版本控制：** 啟用
- **生命週期：** 30天後轉 IA，90天後轉 Archive
- **跨域設定：** 允許 SDK 直接存取

#### 2. CDN 設定
- **加速域名：** audios.meditation.com
- **快取策略：** 音檔文件快取 7 天
- **URL 鑑權：** 啟用 Type A 鑑權

#### 3. 安全設定
- **防盜鏈：** 限制 Referer
- **IP 白名單：** 後端服務器 IP
- **加密：** 伺服器端 AES256 加密

---

## 系統整合流程

### 新設備完整體驗流程

1. **App 啟動和 SDK 初始化**
   ```
   App 啟動 → SDK 初始化 → 生成/獲取設備ID → 設備認證
   ```

2. **匿名設備認證**
   ```
   SDK → API: POST /api/v1/auth/device
   API → Database: 註冊/更新設備資訊
   API → SDK: 返回 session_token (匿名模式)
   ```

3. **設備瀏覽和使用**
   ```
   SDK → API: GET /api/v1/audios (音檔列表)
   SDK → API: POST /api/v1/playback/start (播放記錄)
   ```

4. **音檔播放權限檢查**
   ```
   SDK → API: POST /api/v1/access/check (檢查設備權限)
   SDK → API: POST /api/v1/access/audio-token (獲取 STS 憑證)
   ```

### 設備播放音檔完整流程（含認證）

1. **三層認證檢查**
   ```
   SDK → API: 帶 Client + Device/User 認證
   API: ClientAuthGuard → RateLimitGuard → DeviceAuthGuard/JwtAuthGuard
   ```

2. **權限檢查**
   ```
   API → Database: 查詢設備權限
   API → Redis: 檢查權限快取
   ```

3. **獲取 STS 憑證**
   ```
   API → 阿里雲 STS: 申請臨時憑證
   API → Redis: 快取憑證 (50分鐘)
   ```

4. **播放和記錄**
   ```
   SDK → OSS/CDN: 直接播放音檔
   SDK → API: POST /api/v1/playback/progress (進度同步)
   ```

### 離線下載流程

1. **授權下載**
   ```
   SDK → API: POST /api/v1/download/authorize
   ```

2. **獲取下載憑證**
   ```
   API → STS: 申請下載專用憑證 (2小時有效)
   ```

3. **分段下載**
   ```
   SDK → OSS: 直接下載音檔文件
   SDK → 本地存儲: 加密存儲音檔
   ```

4. **下載完成**
   ```
   SDK → API: POST /api/v1/download/complete
   ```

---

## 監控和分析

### 關鍵指標 (KPI)

#### 1. 技術指標
- **API 響應時間** < 200ms
- **音檔載入時間** < 2 秒
- **系統可用性** > 99.9%
- **錯誤率** < 0.1%

#### 2. 業務指標
- **日活躍設備** (DAD)
- **音檔完成率**
- **下載成功率**
- **設備留存率**

### 日誌和監控

#### 1. 應用日誌
```json
{
  "timestamp": "2025-07-29T10:30:00Z",
  "level": "INFO",
  "service": "audio-api",
  "device_id": "device-123",
  "action": "audio_play_request",
  "audio_id": "audio-001",
  "duration": 150,
  "status": "success"
}
```

#### 2. 錯誤追蹤
- **Sentry** 用於錯誤收集
- **ELK Stack** 用於日誌分析
- **Prometheus + Grafana** 用於監控

---

## 部署和維運

### 環境配置

#### 1. 開發環境
- **API：** https://dev-api.meditation.com
- **OSS：** meditation-audios-dev
- **資料庫：** PostgreSQL 開發實例

#### 2. 生產環境
- **API：** https://api.meditation.com
- **OSS：** meditation-audios-prod
- **資料庫：** PostgreSQL 主從架構

### CI/CD 流程

1. **代碼提交** → GitLab/GitHub
2. **自動測試** → Unit Tests + Integration Tests
3. **建置 Docker 映像**
4. **部署到測試環境**
5. **自動化測試驗證**
6. **部署到生產環境**

### 備份策略

- **資料庫：** 每日全量備份 + 即時 WAL 備份
- **OSS：** 跨區域複製
- **配置文件：** Git 版本控制

---

## 風險評估和應對

### 技術風險

#### 1. STS 憑證洩露
**風險：** 設備憑證被第三方獲取
**應對：**
- 憑證有效期限制在 2 小時內
- 實施 IP 白名單限制
- 監控異常存取模式

#### 2. OSS 頻寬成本
**風險：** 大量設備同時存取導致成本激增
**應對：**
- CDN 分流減少 OSS 直接存取
- 實施頻寬限制
- 預算告警機制

#### 3. 併發量突增
**風險：** 系統無法處理突發流量
**應對：**
- 水平擴展架構
- 負載均衡配置
- 自動伸縮機制

### 業務風險

#### 1. 內容盜版
**風險：** 付費內容被非法複製分發
**應對：**
- DRM 內容保護
- 水印技術
- 法律追溯機制

#### 2. 設備數據安全
**風險：** 個人資料洩露
**應對：**
- 資料加密存儲
- 存取日誌審計
- GDPR 合規性

---

## 成功標準

### 2週開發目標

#### 第1週里程碑
- ✅ 完成資料庫設計和建置
- ✅ 實作核心 API (認證、課程、權限)
- ✅ 設定 OSS 和 STS 集成
- ✅ 基礎監控系統建立

#### 第2週里程碑
- ✅ 完成 SDK 核心功能 (播放、下載)
- ✅ 實作端到端測試
- ✅ 效能優化和安全加固
- ✅ 文檔撰寫和部署

### 驗收標準
1. 設備可以成功認證和瀏覽音檔
2. 設備可以播放高品質音檔
3. 設備權限控制正常運作
4. 影片播放流暢，載入時間 < 2秒
5. 離線下載功能正常運作
6. 播放進度可跨設備同步

---

## 附錄

### A. API 文檔
詳細的 API 規格說明 (Swagger/OpenAPI)

### B. SDK 使用指南
各平台 SDK 的整合和使用說明

### C. 資料庫 Schema
完整的資料表結構和關係圖

### D. 部署手冊
系統部署和維運指南

### E. 測試用例
功能測試和效能測試規格

---

**文檔版本：** v1.0
**最後更新：** 2025-07-29
**負責人：** 開發團隊
**審核人：** 產品經理