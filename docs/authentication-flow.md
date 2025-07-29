# 完整認證流程設計

## 認證層級架構

### 三層認證模型
```
1. Client 認證 (ClientAuthGuard)     - 驗證請求來源合法性
   ↓
2. Rate Limiting (RateLimitGuard)    - 基於 client_id 的流量控制
   ↓
3. User 認證 (JwtAuthGuard)          - 驗證用戶身份（按需）
```

## SDK 初始化和認證流程

### 1. SDK 初始化
```javascript
// 手機 SDK 初始化
const sdk = new MeditationSDK({
  apiBase: 'https://api.meditation.com',
  clientId: 'client-ios',        // 由 App Store 配置提供
  clientSecret: 'xxx',           // 從安全存儲讀取
  environment: 'production'
});
```

### 2. 設備匿名認證流程
```mermaid
sequenceDiagram
    participant App as 手機 App
    participant SDK as Meditation SDK
    participant API as API Server
    participant DB as Database

    App->>SDK: SDK 初始化
    
    Note over SDK: 1. 生成或獲取設備ID
    SDK->>SDK: getOrGenerateDeviceId()
    
    Note over SDK: 2. 設備匿名登入
    SDK->>API: POST /api/v1/auth/device
    Note over SDK,API: Headers: X-Client-ID, X-Client-Secret
    Note over SDK,API: Body: { device_id, device_info }
    
    Note over API: 3. ClientAuthGuard 驗證
    API->>DB: 查詢 api_clients 表
    DB-->>API: 返回 client 資訊
    
    Note over API: 4. 設備註冊/更新
    API->>DB: 註冊或更新 devices 表
    DB-->>API: 設備資訊
    
    Note over API: 5. 創建匿名會話
    API->>DB: 創建 device_user_sessions (user_id = null)
    
    Note over API: 6. 生成 Session Token
    API-->>SDK: 返回 { device_id, session_token, user: { type: "anonymous" } }
    
    SDK-->>App: 匿名登入成功，可存取免費內容
```

### 3. Email 綁定認證流程
```mermaid
sequenceDiagram
    participant App as 手機 App
    participant SDK as Meditation SDK
    participant API as API Server
    participant DB as Database

    Note over App: 用戶決定註冊帳號
    App->>SDK: sdk.auth.bindEmail(email, password)
    
    Note over SDK: 1. 使用現有 session_token
    SDK->>API: POST /api/v1/auth/bind
    Note over SDK,API: Headers: X-Client-ID, X-Client-Secret, Authorization: Bearer {session_token}
    Note over SDK,API: Body: { auth_type: "email", email, password }
    
    Note over API: 2. 三層認證檢查
    API->>API: ClientAuthGuard + RateLimitGuard + DeviceAuthGuard
    
    Note over API: 3. Email 驗證
    API->>DB: 檢查 email 是否已存在
    alt Email 不存在
        Note over API: 4a. 創建新用戶
        API->>DB: 創建 users 表記錄
        API->>DB: 創建 user_auth_methods 表記錄 (email)
        API->>DB: 更新 device_user_sessions (關聯 user_id)
    else Email 已存在
        Note over API: 4b. 綁定現有用戶
        API->>DB: 驗證密碼
        API->>DB: 更新 device_user_sessions (關聯 user_id)
        Note over API: 可選：提供資料合併選項
    end
    
    Note over API: 5. 生成完整 JWT Token
    API->>API: 生成 access_token + refresh_token
    
    API-->>SDK: 返回 { user: { type: "registered" }, access_token, refresh_token }
    
    SDK-->>App: 綁定成功，升級為完整帳號
```

### 4. 已綁定用戶登入流程
```mermaid
sequenceDiagram
    participant App as 手機 App
    participant SDK as Meditation SDK
    participant API as API Server
    participant DB as Database

    Note over App: 用戶在新設備使用已有帳號
    App->>SDK: sdk.auth.loginWithEmail(email, password)
    
    SDK->>API: POST /api/v1/auth/login
    Note over SDK,API: Headers: X-Client-ID, X-Client-Secret
    Note over SDK,API: Body: { device_id, auth_type: "email", email, password }
    
    Note over API: 1. 三層認證檢查
    API->>API: ClientAuthGuard + RateLimitGuard
    
    Note over API: 2. 用戶驗證
    API->>DB: 查詢 user_auth_methods 表
    API->>DB: 驗證 email + password
    
    Note over API: 3. 設備會話管理
    API->>DB: 註冊/更新 devices 表
    API->>DB: 創建新的 device_user_sessions
    
    Note over API: 4. 生成 Tokens
    API-->>SDK: 返回 { access_token, refresh_token, user_info }
    
    SDK-->>App: 登入成功，恢復完整功能
```

## 業務流程示例 - 取得課程

### 5. 匿名用戶瀏覽課程流程
```mermaid
sequenceDiagram
    participant App as 手機 App
    participant SDK as Meditation SDK
    participant API as API Server
    participant DB as Database
    participant Cache as Redis

    Note over App: 匿名用戶瀏覽課程
    App->>SDK: sdk.courses.getList()
    
    Note over SDK: 使用 session_token
    SDK->>API: GET /api/v1/courses
    Note over SDK,API: Headers: X-Client-ID, X-Client-Secret, Authorization: Bearer {session_token}
    
    Note over API: 1. 三層認證檢查
    API->>API: ClientAuthGuard + RateLimitGuard + DeviceAuthGuard
    
    Note over API: 2. 檢查快取
    API->>Cache: 查詢課程快取
    
    alt 快取未命中
        Note over API: 3. 查詢資料庫
        API->>DB: SELECT * FROM courses WHERE access_level IN ('free')
        DB-->>API: 返回免費課程列表
        
        Note over API: 4. 更新快取
        API->>Cache: 快取課程資料 (30分鐘)
    end
    
    Note over API: 5. 權限過濾
    API->>API: 過濾匿名用戶可存取的課程
    
    API-->>SDK: 返回 { courses: [...], user_access_level: "anonymous" }
    SDK-->>App: 顯示免費課程 + 付費課程預覽
```

### 6. 註冊用戶取得完整課程流程
```mermaid
sequenceDiagram
    participant App as 手機 App
    participant SDK as Meditation SDK
    participant API as API Server
    participant DB as Database
    participant Cache as Redis

    Note over App: 註冊用戶瀏覽所有課程
    App->>SDK: sdk.courses.getList()
    
    Note over SDK: 使用 access_token
    SDK->>API: GET /api/v1/courses
    Note over SDK,API: Headers: X-Client-ID, X-Client-Secret, Authorization: Bearer {access_token}
    
    Note over API: 1. 三層認證檢查
    API->>API: ClientAuthGuard + RateLimitGuard + JwtAuthGuard
    
    Note over API: 2. 獲取用戶訂閱資訊
    API->>Cache: 查詢用戶權限快取
    
    alt 快取未命中
        API->>DB: 查詢 users 表獲取 subscription_level
        API->>DB: 查詢 user_course_access 表獲取課程權限
        API->>Cache: 快取用戶權限 (15分鐘)
    end
    
    Note over API: 3. 查詢課程列表
    API->>Cache: 查詢完整課程快取
    
    alt 快取未命中
        API->>DB: SELECT * FROM courses WHERE is_published = true
        DB-->>API: 返回所有已發布課程
        API->>Cache: 快取課程資料 (30分鐘)
    end
    
    Note over API: 4. 應用權限邏輯
    API->>API: 根據用戶訂閱等級過濾課程
    API->>API: 標記用戶可存取的課程
    
    API-->>SDK: 返回 { courses: [...], user_access: {...} }
    SDK-->>App: 顯示完整課程列表 + 權限狀態
```

### 7. 課程詳情和影片權限檢查流程
```mermaid
sequenceDiagram
    participant App as 手機 App
    participant SDK as Meditation SDK
    participant API as API Server
    participant DB as Database
    participant Cache as Redis
    participant OSS as 阿里雲 OSS

    Note over App: 用戶點擊課程進入詳情
    App->>SDK: sdk.courses.getDetail('course-101')
    
    SDK->>API: GET /api/v1/courses/course-101
    Note over SDK,API: Headers: 完整認證資訊
    
    Note over API: 1. 認證檢查
    API->>API: 完整三層認證
    
    Note over API: 2. 課程權限檢查
    SDK->>API: POST /api/v1/access/check
    Note over SDK,API: Body: { course_id: "course-101" }
    
    API->>Cache: 檢查權限快取
    
    alt 需要檢查權限
        API->>DB: 查詢課程 access_level
        API->>DB: 查詢用戶訂閱和課程權限
        API->>API: 計算存取權限
        API->>Cache: 快取權限結果 (10分鐘)
    end
    
    alt 有存取權限
        Note over API: 3. 返回課程詳情
        API->>DB: 查詢課程和影片列表
        API-->>SDK: 返回 { course: {...}, videos: [...], access: true }
        
        Note over App: 用戶點擊播放影片
        App->>SDK: sdk.video.play({ courseId, videoId })
        
        Note over SDK: 4. 獲取播放憑證
        SDK->>API: POST /api/v1/access/video-token
        Note over SDK,API: Body: { courseId, videoId, quality: "medium" }
        
        API->>API: 再次驗證影片存取權限
        API->>OSS: 申請 STS 臨時憑證
        OSS-->>API: 返回 STS 憑證
        
        API-->>SDK: 返回 { credentials: {...}, videoPath: "...", cdnUrl: "..." }
        
        Note over SDK: 5. 直接從 OSS/CDN 播放
        SDK->>OSS: 使用 STS 憑證存取影片
        OSS-->>SDK: 返回影片串流
        
        SDK-->>App: 開始播放影片
        
    else 無存取權限
        API-->>SDK: 返回 { access: false, upgrade_required: true }
        SDK-->>App: 顯示升級提示
    end
```

### 3. 後續 API 請求流程
```mermaid
sequenceDiagram
    participant App as 手機 App
    participant SDK as Meditation SDK
    participant API as API Server

    App->>SDK: sdk.courses.getList()
    
    Note over SDK: SDK 自動附加認證資訊
    SDK->>API: GET /api/v1/courses
    Note over SDK,API: Headers: X-Client-ID, X-Client-Secret, Authorization: Bearer {jwt}
    
    Note over API: 1. ClientAuthGuard（必需）
    API->>API: 驗證 Client 認證
    
    Note over API: 2. RateLimitGuard
    API->>API: 檢查流量限制
    
    Note over API: 3. JwtAuthGuard
    API->>API: 驗證 User JWT Token
    
    Note over API: 4. 業務邏輯處理
    API-->>SDK: 返回課程列表
    SDK-->>App: 處理後的課程資料
```

## 不同 API 的認證需求

### A. 只需要 Client 認證
```typescript
// 健康檢查、基本資訊等
@Get('health')
@SkipUserAuth()
async healthCheck() {
  // 只通過 ClientAuthGuard
  // 不需要用戶登入
}
```

### B. 需要雙重認證
```typescript
// 用戶個人資料、課程內容等
@Get('profile')
@UseGuards(JwtAuthGuard)
async getProfile() {
  // 通過 ClientAuthGuard + JwtAuthGuard
  // 需要 client 和 user 都認證
}
```

### C. 完全公開
```typescript
// 系統狀態、公開資訊等
@Get('status')
@SkipClientAuth()
@SkipUserAuth()
async getStatus() {
  // 跳過所有認證
}
```

## 認證失敗處理

### 1. Client 認證失敗
```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Invalid client credentials",
  "code": "CLIENT_AUTH_FAILED"
}
```

### 2. User 認證失敗
```json
{
  "statusCode": 401,
  "error": "Unauthorized", 
  "message": "Invalid or expired token",
  "code": "USER_AUTH_FAILED"
}
```

### 3. Rate Limit 超出
```json
{
  "statusCode": 429,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 60
}
```

### 4. Email 認證相關錯誤

#### 4a. Email 已存在 (註冊時)
```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "Email already registered",
  "code": "EMAIL_ALREADY_EXISTS"
}
```

#### 4b. Email 不存在 (登入時)
```json
{
  "statusCode": 404,
  "error": "Not Found", 
  "message": "Email not found",
  "code": "EMAIL_NOT_FOUND"
}
```

#### 4c. 密碼錯誤
```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Invalid email or password",
  "code": "INVALID_CREDENTIALS"
}
```

#### 4d. Email 格式錯誤
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Invalid email format",
  "code": "INVALID_EMAIL_FORMAT"
}
```

#### 4e. 密碼強度不足
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Password must be at least 8 characters",
  "code": "WEAK_PASSWORD"
}
```

### 5. 課程存取相關錯誤

#### 5a. 課程不存在
```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Course not found",
  "code": "COURSE_NOT_FOUND"
}
```

#### 5b. 課程存取權限不足
```json
{
  "statusCode": 403,
  "error": "Forbidden",
  "message": "Insufficient permission to access this course",
  "code": "COURSE_ACCESS_DENIED",
  "required_subscription": "premium"
}
```

#### 5c. 影片不存在
```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Video not found",
  "code": "VIDEO_NOT_FOUND"
}
```

#### 5d. STS 憑證獲取失敗
```json
{
  "statusCode": 500,
  "error": "Internal Server Error",
  "message": "Failed to generate video access token",
  "code": "STS_TOKEN_FAILED"
}
```

#### 5e. 訂閱已過期
```json
{
  "statusCode": 402,
  "error": "Payment Required",
  "message": "Subscription has expired",
  "code": "SUBSCRIPTION_EXPIRED",
  "expired_at": "2025-07-15T00:00:00Z"
}
```

## SDK 內部處理邏輯

### 1. 自動認證管理
```javascript
class MeditationSDK {
  constructor(config) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.deviceId = this.getOrGenerateDeviceId();
    this.sessionToken = null;      // 設備會話 token
    this.accessToken = null;       // 用戶 access token  
    this.refreshToken = null;      // 用戶 refresh token
    this.userInfo = null;
  }

  // 設備匿名登入
  async loginAnonymous() {
    const response = await this.makeRequest('/api/v1/auth/device', {
      method: 'POST',
      body: JSON.stringify({
        device_id: this.deviceId,
        device_info: this.getDeviceInfo()
      })
    });

    const data = await response.json();
    this.sessionToken = data.data.session_token;
    this.userInfo = data.data.user;
    
    await this.saveSession();
    this.emit('anonymousLogin', data.data);
    return data.data;
  }

  // Email 綁定
  async bindEmail(email, password) {
    if (!this.sessionToken) {
      throw new Error('需要先進行設備認證');
    }

    const response = await this.makeRequest('/api/v1/auth/bind', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.sessionToken}`
      },
      body: JSON.stringify({
        auth_type: 'email',
        email,
        password
      })
    });

    const data = await response.json();
    
    // 升級為完整用戶 token
    this.userInfo = data.data.user;
    this.accessToken = data.data.access_token;
    this.refreshToken = data.data.refresh_token;
    
    await this.saveSession();
    this.emit('userUpgraded', this.userInfo);
    return data.data;
  }

  // Email 登入 (新設備)
  async loginWithEmail(email, password) {
    const response = await this.makeRequest('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        device_id: this.deviceId,
        auth_type: 'email',
        email,
        password
      })
    });

    const data = await response.json();
    
    this.userInfo = data.data.user;
    this.accessToken = data.data.access_token;
    this.refreshToken = data.data.refresh_token;
    
    await this.saveSession();
    this.emit('userLogin', this.userInfo);
    return data.data;
  }

  // 檢查用戶狀態
  isAnonymous() {
    return !this.userInfo || this.userInfo.type === 'anonymous';
  }

  isRegistered() {
    return this.userInfo && this.userInfo.type === 'registered';
  }

  // 課程相關方法
  async getCourseList() {
    const response = await this.makeRequest('/api/v1/courses');
    const data = await response.json();
    return data.data;
  }

  async getCourseDetail(courseId) {
    const response = await this.makeRequest(`/api/v1/courses/${courseId}`);
    const data = await response.json();
    return data.data;
  }

  async checkCourseAccess(courseId) {
    const response = await this.makeRequest('/api/v1/access/check', {
      method: 'POST',
      body: JSON.stringify({ course_id: courseId })
    });
    const data = await response.json();
    return data.data;
  }

  async getVideoToken(courseId, videoId, quality = 'medium') {
    const response = await this.makeRequest('/api/v1/access/video-token', {
      method: 'POST',
      body: JSON.stringify({ courseId, videoId, quality })
    });
    const data = await response.json();
    return data.data;
  }

  // 播放影片的完整流程
  async playVideo(courseId, videoId, quality = 'medium') {
    try {
      // 1. 檢查課程權限
      const accessCheck = await this.checkCourseAccess(courseId);
      if (!accessCheck.access) {
        throw new Error('無權限存取此課程');
      }

      // 2. 獲取播放憑證
      const tokenData = await this.getVideoToken(courseId, videoId, quality);
      
      // 3. 記錄播放開始
      await this.makeRequest('/api/v1/playback/start', {
        method: 'POST',
        body: JSON.stringify({
          course_id: courseId,
          video_id: videoId,
          quality
        })
      });

      // 4. 返回播放資訊
      return {
        videoUrl: tokenData.cdnUrl,
        credentials: tokenData.credentials,
        sessionId: this.generateSessionId()
      };
    } catch (error) {
      this.emit('playbackError', { courseId, videoId, error });
      throw error;
    }
  }

  // 所有 API 請求都會自動附加認證
  async makeRequest(endpoint, options = {}) {
    const headers = {
      'X-Client-ID': this.clientId,
      'X-Client-Secret': this.clientSecret,
      'Content-Type': 'application/json',
      ...options.headers
    };

    // 根據用戶狀態選擇合適的 token
    if (this.accessToken) {
      // 已綁定用戶：使用 access_token
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    } else if (this.sessionToken) {
      // 匿名設備：使用 session_token
      headers['Authorization'] = `Bearer ${this.sessionToken}`;
    }

    try {
      const response = await fetch(`${this.apiBase}${endpoint}`, {
        ...options,
        headers
      });

      // 處理認證錯誤
      if (response.status === 401) {
        const error = await response.json();
        
        if (error.code === 'CLIENT_AUTH_FAILED') {
          // Client 認證失敗 - 可能是配置問題
          this.emit('clientAuthError', error);
          throw new Error('Client authentication failed');
        }
        
        if (error.code === 'USER_AUTH_FAILED') {
          // Token 過期，嘗試刷新
          const refreshed = await this.refreshAccessToken();
          if (refreshed) {
            // 重試原請求
            return this.makeRequest(endpoint, options);
          } else {
            // 刷新也失敗，需要重新登入
            this.emit('authRequired');
            throw new Error('Authentication required');
          }
        }
      }

      return response;
    } catch (error) {
      this.handleApiError(error);
      throw error;
    }
  }
}
```

### 2. Token 自動刷新
```javascript
async refreshAccessToken() {
  if (!this.refreshToken) {
    return false;
  }

  try {
    const response = await fetch(`${this.apiBase}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'X-Client-ID': this.clientId,
        'X-Client-Secret': this.clientSecret,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        refresh_token: this.refreshToken
      })
    });

    if (response.ok) {
      const data = await response.json();
      this.accessToken = data.access_token;
      this.refreshToken = data.refresh_token;
      
      // 更新本地存儲
      await this.saveTokensSecurely();
      return true;
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
  }

  return false;
}
```

## 安全最佳實踐

1. **Client Secret 保護**：
   - 移動端：使用 Keychain/Keystore 安全存儲
   - Web 端：避免在前端暴露，考慮使用 BFF 模式

2. **Token 管理**：
   - 使用短期 access_token（15-30 分鐘）
   - 長期 refresh_token（7-30 天）
   - 安全存儲和自動刷新

3. **請求安全**：
   - 強制 HTTPS
   - 實施 Certificate Pinning
   - 考慮請求簽名機制

4. **監控和告警**：
   - 異常認證模式告警
   - Client 使用統計分析
   - 安全事件記錄和追蹤