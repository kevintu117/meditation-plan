# 冥想課程平台產品需求文件 (PRD)

## 專案概述

### 產品名稱
冥想課程平台 (Meditation Course Platform)

### 產品目標
建立一個支援多平台的冥想課程串流平台，提供安全、流暢的影片播放體驗，支援離線下載和進度同步功能。

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
3. **資料庫** - 用戶資料和課程元資料
4. **阿里雲 OSS** - 影片文件存儲
5. **CDN** - 內容加速分發

---

## 手機 SDK 需求

### 功能需求

#### 1. 核心播放功能
**描述：** 提供影片播放的核心能力

**接口設計：**
```javascript
// 初始化 SDK
MeditationSDK.initialize({
  apiBase: 'https://api.meditation.com',
  apiKey: 'your_api_key',
  environment: 'production'
});

// 用戶登入
await sdk.auth.login(userToken);

// 播放影片
const player = await sdk.video.play({
  courseId: 'course-101',
  videoId: 'video-001',
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
- 支援 HLS 和 MP4 格式
- 自動品質調整
- 斷點續播
- 播放進度雲端同步

#### 2. 權限管理
**描述：** 管理用戶對不同課程的存取權限

**接口設計：**
```javascript
// 檢查課程權限
const hasAccess = await sdk.auth.checkCourseAccess('course-101');

// 獲取用戶已購買課程
const purchasedCourses = await sdk.user.getPurchasedCourses();

// 權限變更事件
sdk.auth.on('accessRevoked', (courseId) => {
  // 處理權限被撤銷
});
```

**技術實作：**
- STS 臨時憑證管理
- 權限快取機制
- 自動權限更新

#### 3. 離線下載
**描述：** 支援課程離線下載和管理

**接口設計：**
```javascript
// 下載課程
const downloadTask = await sdk.download.startCourse({
  courseId: 'course-101',
  quality: 'medium',
  includeSubtitles: true
});

// 監聽下載進度
downloadTask.on('progress', (downloaded, total) => {
  const percentage = (downloaded / total) * 100;
});

// 管理下載內容
const downloads = await sdk.download.getDownloadedCourses();
await sdk.download.deleteCourse('course-101');
```

**技術實作：**
- 分段下載和斷點續傳
- 存儲空間管理
- 下載隊列優化

#### 4. 用戶分析
**描述：** 收集用戶行為數據用於分析

**接口設計：**
```javascript
// 自動事件追蹤
sdk.analytics.trackVideoStart('course-101', 'video-001');
sdk.analytics.trackVideoComplete('course-101', 'video-001', watchDuration);

// 自定義事件
sdk.analytics.trackEvent('meditation_session_complete', {
  sessionDuration: 1200,
  courseType: 'mindfulness'
});
```

### 平台支援
- **iOS** (Swift, Objective-C)
- **Android** (Kotlin, Java)
- **React Native** (跨平台)
- **Flutter** (跨平台)

### 效能要求
- 播放啟動時間 < 2 秒
- 影片切換延遲 < 1 秒
- SDK 體積 < 10MB
- 記憶體使用 < 50MB

---

## 後端 API 需求

### API 架構設計

#### 1. 設備認證 API
```
POST /api/v1/auth/device              # 設備註冊/匿名登入
GET  /api/v1/auth/device/session      # 檢查設備會話狀態
```

#### 2. 用戶認證和綁定 API
```
POST /api/v1/auth/bind                # 綁定認證方式 (email/phone)
POST /api/v1/auth/bind/social         # 社交登入綁定
POST /api/v1/auth/login              # 已綁定帳號登入
POST /api/v1/auth/refresh            # Token 更新
POST /api/v1/auth/unbind             # 解除綁定
GET  /api/v1/auth/profile            # 獲取用戶資料
GET  /api/v1/auth/methods            # 獲取用戶認證方式
```

#### 3. 客戶端管理 API (管理員)
```
GET    /api/v1/admin/clients         # 獲取客戶端列表
POST   /api/v1/admin/clients         # 建立新客戶端
PUT    /api/v1/admin/clients/{id}    # 更新客戶端設定
DELETE /api/v1/admin/clients/{id}    # 刪除客戶端
POST   /api/v1/admin/clients/{id}/regenerate-secret  # 重新生成密鑰
GET    /api/v1/admin/clients/{id}/stats             # 客戶端使用統計
```

#### 4. 課程管理 API
```
GET  /api/v1/courses                    # 獲取課程列表
GET  /api/v1/courses/{courseId}         # 獲取課程詳情
GET  /api/v1/courses/{courseId}/videos  # 獲取課程影片列表
GET  /api/v1/videos/{videoId}           # 獲取影片詳情
```

#### 5. 權限控制 API
```
POST /api/v1/access/check               # 檢查存取權限
POST /api/v1/access/video-token         # 獲取影片存取 STS
GET  /api/v1/access/user-permissions    # 獲取用戶權限
```

#### 6. 播放管理 API
```
POST /api/v1/playback/start             # 開始播放
POST /api/v1/playback/progress          # 更新播放進度
GET  /api/v1/playback/history          # 獲取播放歷史
```

#### 7. 下載管理 API
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
    "user": {
      "id": null,                       # 匿名模式
      "type": "anonymous",
      "permissions": ["free_content"]
    },
    "expires_at": "2025-07-30T10:00:00Z"
  }
}
```

#### 帳號綁定 API
```http
POST /api/v1/auth/bind
X-Client-ID: client-ios
X-Client-Secret: {client_secret}
Authorization: Bearer {session_token}
Content-Type: application/json

# Email 綁定
{
  "auth_type": "email",
  "email": "user@example.com",
  "password": "securePassword123"
}

# 手機號碼綁定
{
  "auth_type": "phone",
  "phone": "+886912345678",
  "verification_code": "123456"
}

Response:
{
  "success": true,
  "data": {
    "user": {
      "id": "user-xyz789",
      "type": "registered",
      "auth_methods": ["email"],
      "primary_auth": "email",
      "permissions": ["free_content", "premium_content"]
    },
    "session_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### 社交登入綁定 API
```http
POST /api/v1/auth/bind/social
X-Client-ID: client-ios
X-Client-Secret: {client_secret}
Authorization: Bearer {session_token}
Content-Type: application/json

{
  "provider": "google",
  "access_token": "google_oauth_token",
  "provider_user_info": {
    "id": "google_user_id_12345",
    "email": "user@gmail.com",
    "name": "User Name",
    "avatar": "https://avatar.url"
  }
}

Response:
{
  "success": true,
  "data": {
    "user": {
      "id": "user-xyz789",
      "type": "registered",
      "auth_methods": ["google"],
      "primary_auth": "google",
      "profile": {
        "name": "User Name",
        "email": "user@gmail.com",
        "avatar": "https://avatar.url"
      }
    },
    "session_token": "updated_session_token",
    "access_token": "new_access_token",
    "refresh_token": "new_refresh_token"
  }
}
```

#### 影片存取權限 API
```http
POST /api/v1/access/video-token
Content-Type: application/json
Authorization: Bearer {user_token}

{
  "courseId": "course-101",
  "videoId": "video-001",
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
    "videoPath": "premium/course-101/video-001.mp4",
    "ossEndpoint": "https://meditation-videos.oss-cn-hangzhou.aliyuncs.com",
    "cdnUrl": "https://videos.meditation.com/premium/course-101/video-001.mp4",
    "expiresAt": 1722254400
  }
}
```

#### 播放進度同步 API
```http
POST /api/v1/playback/progress
Content-Type: application/json
Authorization: Bearer {user_token}

{
  "videoId": "video-001",
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
        "videoId": "video-002",
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
- **JWT** 用於用戶認證
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

#### 2. 用戶表 (users)
```sql
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,                    -- user-{uuid}
    primary_device_id VARCHAR(50),                 -- 主要設備ID
    subscription_level VARCHAR(50) DEFAULT 'free', -- free, basic, premium, vip
    subscription_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (primary_device_id) REFERENCES devices(id)
);

CREATE INDEX idx_users_subscription ON users(subscription_level, subscription_expires_at);
CREATE INDEX idx_users_device ON users(primary_device_id);
```

#### 3. 用戶認證方式表 (user_auth_methods)
```sql
CREATE TABLE user_auth_methods (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    auth_type ENUM('email', 'phone', 'google', 'apple', 'facebook') NOT NULL,
    auth_identifier VARCHAR(255) NOT NULL,         -- email、手機號、社交ID
    auth_credential VARCHAR(255),                  -- 加密後的密碼或 token
    is_verified BOOLEAN DEFAULT FALSE,
    is_primary BOOLEAN DEFAULT FALSE,              -- 主要認證方式
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE KEY unique_auth_method (auth_type, auth_identifier),
    INDEX idx_user_auth_methods (user_id, is_primary)
);
```

#### 4. 設備用戶會話表 (device_user_sessions)
```sql
CREATE TABLE device_user_sessions (
    id VARCHAR(50) PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL,
    user_id VARCHAR(50),                           -- NULL 表示匿名模式
    session_token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (device_id) REFERENCES devices(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_device_sessions (device_id, is_active),
    INDEX idx_user_sessions (user_id, is_active)
);
```

#### 5. API 客戶端表 (api_clients)
```sql
CREATE TABLE api_clients (
    id VARCHAR(50) PRIMARY KEY,              -- client-web, client-ios 等
    name VARCHAR(100) NOT NULL,              -- 客戶端名稱
    client_secret VARCHAR(255) NOT NULL,     -- 加密後的 secret
    client_type ENUM('web', 'mobile', 'sdk', 'partner') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    rate_limit_per_minute INTEGER DEFAULT 100,
    allowed_scopes JSON,                     -- ['auth', 'courses', 'videos', 'playback']
    metadata JSON,                           -- 額外資訊
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP
);

CREATE INDEX idx_api_clients_active ON api_clients(is_active);
CREATE INDEX idx_api_clients_type ON api_clients(client_type);
```

#### 6. 課程表 (courses)
```sql
CREATE TABLE courses (
    id VARCHAR(50) PRIMARY KEY, -- course-101
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructor_name VARCHAR(100),
    category VARCHAR(100), -- mindfulness, sleep, focus
    level VARCHAR(50), -- beginner, intermediate, advanced
    access_level VARCHAR(50) NOT NULL, -- free, basic, premium, vip
    duration_minutes INTEGER,
    thumbnail_url VARCHAR(500),
    preview_video_url VARCHAR(500),
    price DECIMAL(10,2),
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_courses_category ON courses(category);
CREATE INDEX idx_courses_access_level ON courses(access_level);
CREATE INDEX idx_courses_published ON courses(is_published);
```

#### 7. 影片表 (videos)
```sql
CREATE TABLE videos (
    id VARCHAR(50) PRIMARY KEY, -- video-001
    course_id VARCHAR(50) REFERENCES courses(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration_seconds INTEGER NOT NULL,
    order_index INTEGER NOT NULL,
    video_path VARCHAR(500) NOT NULL, -- OSS 中的檔案路徑
    thumbnail_path VARCHAR(500),
    subtitle_path VARCHAR(500),
    file_size_mb DECIMAL(10,2),
    resolution VARCHAR(20), -- 1080p, 720p, 480p
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_videos_course ON videos(course_id, order_index);
```

#### 8. 用戶課程權限表 (user_course_access)
```sql
CREATE TABLE user_course_access (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id),
    course_id VARCHAR(50) REFERENCES courses(id),
    access_type VARCHAR(50) NOT NULL, -- purchased, trial, subscription
    granted_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    UNIQUE(user_id, course_id)
);

CREATE INDEX idx_user_course_access ON user_course_access(user_id, is_active);
```

#### 9. 播放記錄表 (playback_sessions)
```sql
CREATE TABLE playback_sessions (
    id VARCHAR(50) PRIMARY KEY,
    device_id VARCHAR(50) REFERENCES devices(id),
    user_id VARCHAR(50) REFERENCES users(id),        -- 可為 NULL（匿名模式）
    video_id VARCHAR(50) REFERENCES videos(id),
    session_id VARCHAR(100) UNIQUE NOT NULL,
    started_at TIMESTAMP DEFAULT NOW(),
    last_position_seconds INTEGER DEFAULT 0,
    total_watched_seconds INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    quality VARCHAR(20),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_playback_device_video ON playback_sessions(device_id, video_id);
CREATE INDEX idx_playback_user_video ON playback_sessions(user_id, video_id);
CREATE INDEX idx_playback_session ON playback_sessions(session_id);
```

#### 10. 下載記錄表 (download_records)
```sql
CREATE TABLE download_records (
    id VARCHAR(50) PRIMARY KEY,
    device_id VARCHAR(50) REFERENCES devices(id),
    user_id VARCHAR(50) REFERENCES users(id),        -- 可為 NULL（匿名模式）
    video_id VARCHAR(50) REFERENCES videos(id),
    quality VARCHAR(20) NOT NULL,
    file_size_mb DECIMAL(10,2),
    downloaded_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_downloads_device ON download_records(device_id, is_active);
CREATE INDEX idx_downloads_user_device ON download_records(user_id, device_id, is_active);
```

### Redis 快取結構
```
# 設備會話快取
device:session:{device_id} -> {session_token, user_id, expires_at}

# 用戶 Session
user:session:{user_id} -> {jwt_token, expires_at}

# API 客戶端快取
client:{client_id} -> {client_info, rate_limit, scopes}

# STS 憑證快取
sts:video:{user_id}:{video_id} -> {credentials, expires_at}
sts:video:device:{device_id}:{video_id} -> {credentials, expires_at}

# 課程權限快取
user:access:{user_id} -> {course_ids: [array], expires_at}

# 播放進度快取
playback:{user_id}:{video_id} -> {position, updated_at}
playback:device:{device_id}:{video_id} -> {position, updated_at}

# API Rate Limiting
rate_limit:{client_id}:{window} -> {count, window_start}
```

---

## 阿里雲 OSS 存儲架構

### 存儲結構設計
```
meditation-videos/
├── public/                          # 公開內容 (縮圖、預覽)
│   ├── thumbnails/
│   │   ├── course-101-thumb.jpg
│   │   └── video-001-thumb.jpg
│   └── previews/
│       └── course-101-preview.mp4
├── course-free-001/                 # 免費課程
│   ├── video-001.mp4
│   ├── video-001-720p.mp4
│   └── video-001-480p.mp4
├── basic/                           # 基礎會員內容
│   ├── course-201/
│   └── course-202/
├── premium/                         # 付費會員內容
│   ├── course-301/
│   └── course-302/
├── vip/                            # VIP 會員內容
│   ├── course-401/
│   └── exclusive/
└── user-uploads/                   # 用戶上傳內容
    └── {user_id}/
```

### OSS 配置需求

#### 1. Bucket 政策
- **存取控制：** 私有 (Private)
- **版本控制：** 啟用
- **生命週期：** 30天後轉 IA，90天後轉 Archive
- **跨域設定：** 允許 SDK 直接存取

#### 2. CDN 設定
- **加速域名：** videos.meditation.com
- **快取策略：** 影片文件快取 7 天
- **URL 鑑權：** 啟用 Type A 鑑權

#### 3. 安全設定
- **防盜鏈：** 限制 Referer
- **IP 白名單：** 後端服務器 IP
- **加密：** 伺服器端 AES256 加密

---

## 系統整合流程

### 新用戶完整體驗流程

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

3. **匿名用戶瀏覽和使用**
   ```
   SDK → API: GET /api/v1/courses (免費內容)
   SDK → API: POST /api/v1/playback/start (匿名播放記錄)
   ```

4. **用戶決定註冊綁定**
   ```
   用戶輸入 Email → SDK → API: POST /api/v1/auth/bind
   API → Database: 建立用戶記錄，關聯設備
   API → SDK: 返回完整用戶 token
   ```

5. **升級後的完整功能**
   ```
   SDK → API: GET /api/v1/courses (包含付費內容)
   SDK → API: POST /api/v1/access/video-token (獲取付費內容權限)
   ```

### 用戶播放影片完整流程（含認證）

1. **三層認證檢查**
   ```
   SDK → API: 帶 Client + Device/User 認證
   API: ClientAuthGuard → RateLimitGuard → DeviceAuthGuard/JwtAuthGuard
   ```

2. **權限檢查**
   ```
   API → Database: 查詢用戶/設備權限
   API → Redis: 檢查權限快取
   ```

3. **獲取 STS 憑證**
   ```
   API → 阿里雲 STS: 申請臨時憑證
   API → Redis: 快取憑證 (50分鐘)
   ```

4. **播放和記錄**
   ```
   SDK → OSS/CDN: 直接播放影片
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
   SDK → OSS: 直接下載影片文件
   SDK → 本地存儲: 加密存儲影片
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
- **影片載入時間** < 2 秒
- **系統可用性** > 99.9%
- **錯誤率** < 0.1%

#### 2. 業務指標
- **日活躍用戶** (DAU)
- **影片完成率**
- **下載成功率**
- **用戶留存率**

### 日誌和監控

#### 1. 應用日誌
```json
{
  "timestamp": "2025-07-29T10:30:00Z",
  "level": "INFO",
  "service": "video-api",
  "user_id": "user-123",
  "action": "video_play_request",
  "course_id": "course-101",
  "video_id": "video-001",
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
- **OSS：** meditation-videos-dev
- **資料庫：** PostgreSQL 開發實例

#### 2. 生產環境
- **API：** https://api.meditation.com
- **OSS：** meditation-videos-prod
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
**風險：** 用戶憑證被第三方獲取
**應對：**
- 憑證有效期限制在 2 小時內
- 實施 IP 白名單限制
- 監控異常存取模式

#### 2. OSS 頻寬成本
**風險：** 大量用戶同時存取導致成本激增
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

#### 2. 用戶數據安全
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
1. 用戶可以成功登入和瀏覽課程
2. 付費用戶可以播放高畫質影片
3. 免費用戶只能存取免費內容
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