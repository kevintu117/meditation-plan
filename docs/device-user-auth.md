# 設備ID + 用戶綁定認證設計

## 概述
採用**設備優先**的認證策略，用戶可以先使用設備ID匿名存取，後續再綁定各種認證方式（手機、email、社交登入等）。

## 認證模式演進

### 模式 1：匿名設備模式
```javascript
// SDK 初始化時自動生成或獲取設備ID
const sdk = new MeditationSDK({
  clientId: 'client-ios',
  clientSecret: 'xxx',
  deviceId: 'auto' // SDK 自動生成唯一設備ID
});

// 匿名認證
const session = await sdk.auth.loginAnonymous();
// 可以存取免費內容
```

### 模式 2：綁定認證模式
```javascript
// 用戶決定綁定帳號時
await sdk.auth.bindAccount({
  type: 'email',
  email: 'user@example.com',
  password: 'password'
});

// 或綁定手機
await sdk.auth.bindAccount({
  type: 'phone',
  phone: '+886912345678',
  verificationCode: '123456'
});

// 或社交登入綁定
await sdk.auth.bindAccount({
  type: 'google',
  googleToken: 'google_oauth_token'
});
```

## 資料庫設計

### 1. 設備表 (devices)
```sql
CREATE TABLE devices (
    id VARCHAR(50) PRIMARY KEY,                    -- UUID 或自定義格式
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

### 2. 用戶表重新設計 (users)
```sql
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,                    -- user-{uuid}
    primary_device_id VARCHAR(50),                 -- 主要設備ID
    subscription_level VARCHAR(50) DEFAULT 'free',
    subscription_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (primary_device_id) REFERENCES devices(id)
);
```

### 3. 用戶認證方式表 (user_auth_methods)
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

### 4. 設備用戶關聯表 (device_user_sessions)
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

## API 端點設計

### 1. 匿名設備認證
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
    "app_version": "1.0.0"
  }
}

Response:
{
  "success": true,
  "data": {
    "device_id": "device-ios-abc123",
    "session_token": "session_jwt_token",
    "user": {
      "id": null,                       # 匿名模式
      "type": "anonymous",
      "permissions": ["free_content"]
    },
    "expires_at": "2025-07-30T10:00:00Z"
  }
}
```

### 2. 綁定認證方式
```http
POST /api/v1/auth/bind
X-Client-ID: client-ios
X-Client-Secret: {client_secret}
Authorization: Bearer {session_token}
Content-Type: application/json

{
  "auth_type": "email",
  "email": "user@example.com",
  "password": "password"
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
    "session_token": "updated_session_token"
  }
}
```

### 3. 社交登入綁定
```http
POST /api/v1/auth/bind/social
Authorization: Bearer {session_token}

{
  "provider": "google",
  "access_token": "google_oauth_token",
  "provider_user_info": {
    "id": "google_user_id",
    "email": "user@gmail.com",
    "name": "User Name"
  }
}
```

## SDK 實作範例

### 1. 設備ID管理
```javascript
class MeditationSDK {
  constructor(config) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.deviceId = this.getOrGenerateDeviceId();
    this.sessionToken = null;
    this.userInfo = null;
  }

  // 獲取或生成設備ID
  getOrGenerateDeviceId() {
    // 嘗試從安全存儲讀取
    let deviceId = this.getFromSecureStorage('device_id');
    
    if (!deviceId) {
      // 生成新的設備ID
      deviceId = `device-${this.platform}-${this.generateUUID()}`;
      this.saveToSecureStorage('device_id', deviceId);
    }
    
    return deviceId;
  }

  // 匿名登入
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
    return data.data;
  }

  // 綁定 Email 認證
  async bindEmail(email, password) {
    const response = await this.makeRequest('/api/v1/auth/bind', {
      method: 'POST',
      body: JSON.stringify({
        auth_type: 'email',
        email,
        password
      })
    });

    const data = await response.json();
    this.sessionToken = data.data.session_token;
    this.userInfo = data.data.user;
    
    await this.saveSession();
    this.emit('userUpgraded', this.userInfo);
    return data.data;
  }

  // 檢查用戶狀態
  isAnonymous() {
    return !this.userInfo || this.userInfo.type === 'anonymous';
  }

  canAccessPremiumContent() {
    return this.userInfo && 
           this.userInfo.permissions.includes('premium_content');
  }
}
```

### 2. 多設備同步
```javascript
// 用戶在新設備登入已綁定的帳號
async loginWithExistingAccount(authMethod) {
  const response = await this.makeRequest('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      device_id: this.deviceId,
      ...authMethod
    })
  });

  const data = await response.json();
  
  // 如果用戶在多個設備有資料，提供合併選項
  if (data.data.merge_required) {
    this.emit('accountMergeRequired', data.data.merge_options);
  }
  
  return data.data;
}
```

## 業務邏輯優勢

### 1. 用戶體驗優化
- 📱 立即開始使用，無需強制註冊
- 🔄 無縫升級到完整帳號
- 📊 保留匿名期間的使用數據
- 🔗 支援多種認證方式綁定

### 2. 數據連續性
```javascript
// 用戶匿名使用期間的數據可以保留
const anonymousData = {
  watchHistory: [...],
  preferences: {...},
  progress: {...}
};

// 綁定帳號後數據遷移
await sdk.auth.bindEmail(email, password);
// SDK 自動將匿名數據關聯到新用戶帳號
```

### 3. 營運分析優勢
- 🎯 完整的用戶旅程追蹤
- 📈 匿名到註冊的轉換率分析
- 🔍 設備使用模式分析
- 📊 多設備用戶行為分析

## 安全考量

### 1. 設備指紋強化
```javascript
// 除了 device_id，還可以收集設備指紋
const deviceFingerprint = {
  screen: { width: 1179, height: 2556 },
  timezone: 'Asia/Taipei',
  language: 'zh-TW',
  // 不收集隱私敏感資訊
};
```

### 2. 異常設備檢測
- 短時間內大量新設備創建
- 同一設備頻繁切換用戶
- 異常地理位置登入

### 3. 數據保護
- 匿名數據定期清理政策
- 用戶數據刪除權（GDPR 合規）
- 設備資訊最小化收集

## 實作階段規劃

### Phase 1: 基礎設備認證
- ✅ 設計資料庫架構
- ✅ 實作設備註冊和認證
- ✅ SDK 設備ID管理

### Phase 2: 綁定功能
- 📧 Email/密碼綁定
- 📱 手機號碼綁定
- 🔗 社交登入整合

### Phase 3: 進階功能
- 🔄 多設備同步
- 📊 用戶行為分析
- 🛡️ 安全監控

這樣的設計讓您可以：
1. **立即開始開發**：先實作設備認證
2. **彈性擴充**：後續可以加入任何認證方式
3. **用戶友好**：不強制註冊，降低使用門檻
4. **數據完整**：保留完整的用戶使用軌跡