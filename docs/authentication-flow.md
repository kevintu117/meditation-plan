# 完整認證流程設計

## 認證層級架構

### 三層認證模型
```
1. Client 認證 (ClientAuthGuard)     - 驗證請求來源合法性
   ↓
2. Rate Limiting (RateLimitGuard)    - 基於 client_id 的流量控制
   ↓
3. Device 認證 (DeviceAuthGuard)     - 驗證設備身份
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

### 2. 設備認證流程
```mermaid
sequenceDiagram
    participant App as 手機 App
    participant SDK as Meditation SDK
    participant API as API Server
    participant DB as Database

    App->>SDK: SDK 初始化
    
    Note over SDK: 1. 生成或獲取設備ID
    SDK->>SDK: getOrGenerateDeviceId()
    
    Note over SDK: 2. 設備認證
    SDK->>API: POST /api/v1/auth/device
    Note over SDK,API: Headers: X-Client-ID, X-Client-Secret
    Note over SDK,API: Body: { device_id, device_info }
    
    Note over API: 3. ClientAuthGuard 驗證
    API->>DB: 查詢 api_clients 表
    DB-->>API: 返回 client 資訊
    
    Note over API: 4. 設備註冊/更新
    API->>DB: 註冊或更新 devices 表
    DB-->>API: 設備資訊
    
    Note over API: 5. 創建設備會話
    API->>DB: 創建 device_sessions
    
    Note over API: 6. 生成 Session Token
    API-->>SDK: 返回 { device_id, session_token, permissions }
    
    SDK-->>App: 設備認證成功，可存取音檔
```

## 業務流程示例 - 取得音檔

### 3. 設備瀏覽音檔流程
```mermaid
sequenceDiagram
    participant App as 手機 App
    participant SDK as Meditation SDK
    participant API as API Server
    participant DB as Database
    participant Cache as Redis

    Note over App: 設備瀏覽音檔
    App->>SDK: sdk.audios.getList()
    
    Note over SDK: 使用 session_token
    SDK->>API: GET /api/v1/audios
    Note over SDK,API: Headers: X-Client-ID, X-Client-Secret, Authorization: Bearer {session_token}
    
    Note over API: 1. 三層認證檢查
    API->>API: ClientAuthGuard + RateLimitGuard + DeviceAuthGuard
    
    Note over API: 2. 檢查快取
    API->>Cache: 查詢音檔快取
    
    alt 快取未命中
        Note over API: 3. 查詢資料庫
        API->>DB: SELECT * FROM audios WHERE is_published = true
        DB-->>API: 返回已發布音檔
        
        Note over API: 4. 更新快取
        API->>Cache: 快取音檔資料 (30分鐘)
    end
    
    Note over API: 5. 權限過濾
    API->>API: 根據設備權限過濾音檔
    
    API-->>SDK: 返回 { audios: [...], device_permissions: {...} }
    SDK-->>App: 顯示可存取的音檔列表
```

### 4. 音檔詳情和播放流程
```mermaid
sequenceDiagram
    participant App as 手機 App
    participant SDK as Meditation SDK
    participant API as API Server
    participant DB as Database
    participant Cache as Redis
    participant OSS as 阿里雲 OSS

    Note over App: 設備點擊音檔進入詳情
    App->>SDK: sdk.audios.getDetail('audio-101')
    
    SDK->>API: GET /api/v1/audios/audio-101
    Note over SDK,API: Headers: 完整認證資訊
    
    Note over API: 1. 認證檢查
    API->>API: 完整三層認證
    
    Note over API: 2. 音檔權限檢查
    SDK->>API: POST /api/v1/access/check
    Note over SDK,API: Body: { audio_id: "audio-101" }
    
    API->>Cache: 檢查權限快取
    
    alt 需要檢查權限
        API->>DB: 查詢音檔 access_level
        API->>DB: 查詢設備權限
        API->>API: 計算存取權限
        API->>Cache: 快取權限結果 (10分鐘)
    end
    
    alt 有存取權限
        Note over API: 3. 返回音檔詳情
        API->>DB: 查詢音檔詳細資訊
        API-->>SDK: 返回 { audio: {...}, access: true }
        
        Note over App: 設備點擊播放音檔
        App->>SDK: sdk.audio.play({ audioId })
        
        Note over SDK: 4. 獲取播放憑證
        SDK->>API: POST /api/v1/access/audio-token
        Note over SDK,API: Body: { audioId, quality: "medium" }
        
        API->>API: 再次驗證音檔存取權限
        API->>OSS: 申請 STS 臨時憑證
        OSS-->>API: 返回 STS 憑證
        
        API-->>SDK: 返回 { credentials: {...}, audioPath: "...", cdnUrl: "..." }
        
        Note over SDK: 5. 直接從 OSS/CDN 播放
        SDK->>OSS: 使用 STS 憑證存取音檔
        OSS-->>SDK: 返回音檔串流
        
        SDK-->>App: 開始播放音檔
        
    else 無存取權限
        API-->>SDK: 返回 { access: false, upgrade_required: true }
        SDK-->>App: 顯示升級提示
    end
```

### 5. 後續 API 請求流程
```mermaid
sequenceDiagram
    participant App as 手機 App
    participant SDK as Meditation SDK
    participant API as API Server

    App->>SDK: sdk.audios.getList()
    
    Note over SDK: SDK 自動附加認證資訊
    SDK->>API: GET /api/v1/audios
    Note over SDK,API: Headers: X-Client-ID, X-Client-Secret, Authorization: Bearer {session_token}
    
    Note over API: 1. ClientAuthGuard（必需）
    API->>API: 驗證 Client 認證
    
    Note over API: 2. RateLimitGuard
    API->>API: 檢查流量限制
    
    Note over API: 3. DeviceAuthGuard
    API->>API: 驗證 Device Session Token
    
    Note over API: 4. 業務邏輯處理
    API-->>SDK: 返回音檔列表
    SDK-->>App: 處理後的音檔資料
```

## 不同 API 的認證需求

### A. 只需要 Client 認證
```typescript
// 健康檢查、基本資訊等
@Get('health')
@SkipDeviceAuth()
async healthCheck() {
  // 只通過 ClientAuthGuard
  // 不需要設備認證
}
```

### B. 需要完整認證
```typescript
// 音檔內容、播放等
@Get('audios')
@UseGuards(DeviceAuthGuard)
async getAudios() {
  // 通過 ClientAuthGuard + DeviceAuthGuard
  // 需要 client 和 device 都認證
}
```

### C. 完全公開
```typescript
// 系統狀態、公開資訊等
@Get('status')
@SkipClientAuth()
@SkipDeviceAuth()
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

### 2. Device 認證失敗
```json
{
  "statusCode": 401,
  "error": "Unauthorized", 
  "message": "Invalid or expired device token",
  "code": "DEVICE_AUTH_FAILED"
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

### 4. 音檔存取相關錯誤

#### 4a. 音檔不存在
```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Audio not found",
  "code": "AUDIO_NOT_FOUND"
}
```

#### 4b. 音檔存取權限不足
```json
{
  "statusCode": 403,
  "error": "Forbidden",
  "message": "Insufficient permission to access this audio",
  "code": "AUDIO_ACCESS_DENIED",
  "required_subscription": "premium"
}
```

#### 4c. STS 憑證獲取失敗
```json
{
  "statusCode": 500,
  "error": "Internal Server Error",
  "message": "Failed to generate audio access token",
  "code": "STS_TOKEN_FAILED"
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
    this.deviceInfo = null;
  }

  // 設備認證
  async authenticateDevice() {
    const response = await this.makeRequest('/api/v1/auth/device', {
      method: 'POST',
      body: JSON.stringify({
        device_id: this.deviceId,
        device_info: this.getDeviceInfo()
      })
    });

    const data = await response.json();
    this.sessionToken = data.data.session_token;
    this.deviceInfo = data.data.device;
    
    await this.saveSession();
    this.emit('deviceAuthenticated', data.data);
    return data.data;
  }

  // 檢查設備狀態
  isAuthenticated() {
    return !!this.sessionToken;
  }

  // 音檔相關方法
  async getAudioList() {
    const response = await this.makeRequest('/api/v1/audios');
    const data = await response.json();
    return data.data;
  }

  async getAudioDetail(audioId) {
    const response = await this.makeRequest(`/api/v1/audios/${audioId}`);
    const data = await response.json();
    return data.data;
  }

  async checkAudioAccess(audioId) {
    const response = await this.makeRequest('/api/v1/access/check', {
      method: 'POST',
      body: JSON.stringify({ audio_id: audioId })
    });
    const data = await response.json();
    return data.data;
  }

  async getAudioToken(audioId, quality = 'medium') {
    const response = await this.makeRequest('/api/v1/access/audio-token', {
      method: 'POST',
      body: JSON.stringify({ audioId, quality })
    });
    const data = await response.json();
    return data.data;
  }

  // 播放音檔的完整流程
  async playAudio(audioId, quality = 'medium') {
    try {
      // 1. 檢查音檔權限
      const accessCheck = await this.checkAudioAccess(audioId);
      if (!accessCheck.access) {
        throw new Error('無權限存取此音檔');
      }

      // 2. 獲取播放憑證
      const tokenData = await this.getAudioToken(audioId, quality);
      
      // 3. 記錄播放開始
      await this.makeRequest('/api/v1/playback/start', {
        method: 'POST',
        body: JSON.stringify({
          audio_id: audioId,
          quality
        })
      });

      // 4. 返回播放資訊
      return {
        audioUrl: tokenData.cdnUrl,
        credentials: tokenData.credentials,
        sessionId: this.generateSessionId()
      };
    } catch (error) {
      this.emit('playbackError', { audioId, error });
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

    // 附加設備 token
    if (this.sessionToken) {
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
          this.emit('clientAuthError', error);
          throw new Error('Client authentication failed');
        }
        
        if (error.code === 'DEVICE_AUTH_FAILED') {
          // Token 過期，重新認證
          const refreshed = await this.authenticateDevice();
          if (refreshed) {
            // 重試原請求
            return this.makeRequest(endpoint, options);
          } else {
            this.emit('authRequired');
            throw new Error('Device authentication required');
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

### 2. Token 自動更新
```javascript
async refreshDeviceToken() {
  if (!this.deviceId) {
    return false;
  }

  try {
    const response = await this.authenticateDevice();
    return !!response;
  } catch (error) {
    console.error('Device token refresh failed:', error);
    return false;
  }
}
```

## 安全最佳實踐

1. **Client Secret 保護**：
   - 移動端：使用 Keychain/Keystore 安全存儲
   - Web 端：避免在前端暴露，考慮使用 BFF 模式

2. **Token 管理**：
   - 使用短期 session_token（2-4 小時）
   - 自動重新認證機制
   - 安全存儲和自動更新

3. **請求安全**：
   - 強制 HTTPS
   - 實施 Certificate Pinning
   - 考慮請求簽名機制

4. **監控和告警**：
   - 異常認證模式告警
   - Client 使用統計分析
   - 安全事件記錄和追蹤