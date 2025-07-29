# Client ID 認證機制設計文檔

## 概述
為了確保 API 安全性，系統實作 Client ID 認證機制，只允許特定的客戶端應用程式存取 API。

## 資料庫驅動的 Client 管理

### API Clients 資料表設計
```sql
CREATE TABLE api_clients (
    id VARCHAR(50) PRIMARY KEY,              -- client-web, client-ios 等
    name VARCHAR(100) NOT NULL,              -- 客戶端名稱
    client_secret VARCHAR(255) NOT NULL,     -- 加密後的 secret
    client_type ENUM('web', 'mobile', 'sdk', 'partner') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    rate_limit_per_minute INTEGER DEFAULT 100,
    allowed_scopes JSON,                     -- ['auth', 'audios', 'playback']
    metadata JSON,                           -- 額外資訊 (version, platform 等)
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP
);

-- 建立索引
CREATE INDEX idx_api_clients_active ON api_clients(is_active);
CREATE INDEX idx_api_clients_type ON api_clients(client_type);
```

### 預設客戶端資料
```sql
INSERT INTO api_clients (id, name, client_secret, client_type, rate_limit_per_minute, allowed_scopes) VALUES
('client-web', '官方網頁版', '$2b$10$...', 'web', 200, '["auth", "audios", "playback"]'),
('client-ios', '官方 iOS App', '$2b$10$...', 'mobile', 150, '["auth", "audios", "playback", "download"]'),
('client-android', '官方 Android App', '$2b$10$...', 'mobile', 150, '["auth", "audios", "playback", "download"]'),
('client-sdk', 'JavaScript SDK', '$2b$10$...', 'sdk', 500, '["auth", "audios", "playback", "download"]');
```

## 認證流程

### Client 認證機制
系統採用 **Client 認證**機制：
1. **Client 認證** - 驗證請求來源的合法性
2. **Device 認證** - 驗證設備身份

### 完整認證流程

#### 1. 設備認證流程
```http
POST /api/v1/auth/device
X-Client-ID: client-sdk
X-Client-Secret: {client_secret}
Content-Type: application/json

{
  "device_id": "device-ios-abc123",
  "device_info": {
    "model": "iPhone 15 Pro",
    "os_version": "iOS 17.1"
  }
}
```

**處理順序：**
1. 系統先驗證 Client ID/Secret（ClientAuthGuard）
2. 通過後註冊/驗證設備
3. 返回設備 Session Token

#### 2. 後續 API 請求
```http
GET /api/v1/audios
X-Client-ID: client-sdk
X-Client-Secret: {client_secret}
Authorization: Bearer {device_session_token}
```

**處理順序：**
1. 驗證 Client 認證（必需）
2. 驗證 Device Session Token
3. 檢查設備權限和 API Scope

#### 3. 不需要設備認證的 API
某些 API 只需要 Client 認證：
```http
GET /api/v1/health
X-Client-ID: client-sdk
X-Client-Secret: {client_secret}
```

#### 4. 公開 API
少數完全公開的 API（如健康檢查）可能不需要任何認證。

### 3. SDK 整合範例
```javascript
// SDK 初始化時設定 Client ID
MeditationSDK.initialize({
  apiBase: 'https://api.meditation.com',
  clientId: 'client-sdk',
  clientSecret: process.env.CLIENT_SECRET, // 從環境變數讀取
  environment: 'production'
});

// SDK 內部自動在每個請求加上 Client 認證
async function makeApiCall(endpoint, data) {
  const response = await fetch(`${apiBase}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-ID': this.clientId,
      'X-Client-Secret': this.clientSecret,
      'Authorization': `Bearer ${this.sessionToken}`
    },
    body: JSON.stringify(data)
  });
  return response.json();
}
```

## 實作細節

### 1. Client Entity 實作
```typescript
// api-client.entity.ts
@Entity('api_clients')
export class ApiClient {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column()
  client_secret: string;

  @Column({
    type: 'enum',
    enum: ['web', 'mobile', 'sdk', 'partner']
  })
  client_type: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ default: 100 })
  rate_limit_per_minute: number;

  @Column('json')
  allowed_scopes: string[];

  @Column('json', { nullable: true })
  metadata: any;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ nullable: true })
  last_used_at: Date;
}
```

### 2. Client Service 實作
```typescript
// client.service.ts
@Injectable()
export class ClientService {
  constructor(
    @InjectRepository(ApiClient)
    private clientRepository: Repository<ApiClient>,
  ) {}

  async validateClient(clientId: string, clientSecret: string): Promise<ApiClient | null> {
    const client = await this.clientRepository.findOne({
      where: { id: clientId, is_active: true }
    });

    if (!client) {
      return null;
    }

    // 驗證 secret（使用 bcrypt）
    const isSecretValid = await bcrypt.compare(clientSecret, client.client_secret);
    if (!isSecretValid) {
      return null;
    }

    // 更新最後使用時間
    await this.clientRepository.update(clientId, { 
      last_used_at: new Date() 
    });

    return client;
  }

  async hasScope(client: ApiClient, requiredScope: string): boolean {
    return client.allowed_scopes.includes(requiredScope);
  }
}
```

### 3. NestJS Guard 實作
```typescript
// client-auth.guard.ts
@Injectable()
export class ClientAuthGuard implements CanActivate {
  constructor(
    private clientService: ClientService,
    private logger: Logger,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const clientId = request.headers['x-client-id'] || request.body.client_id;
    const clientSecret = request.headers['x-client-secret'] || request.body.client_secret;

    if (!clientId || !clientSecret) {
      this.logger.warn('Missing client credentials');
      throw new UnauthorizedException('Client authentication required');
    }

    // 從資料庫驗證客戶端
    const client = await this.clientService.validateClient(clientId, clientSecret);
    if (!client) {
      this.logger.warn(`Invalid client credentials: ${clientId}`);
      throw new UnauthorizedException('Invalid client credentials');
    }

    // 將 client 資訊加入 request
    request.client = client;
    
    // 記錄安全日誌
    this.logger.log({
      event: 'client_auth_success',
      clientId,
      clientType: client.client_type,
      ip: request.ip,
      userAgent: request.headers['user-agent']
    });

    return true;
  }
}
```

### 4. Guard 執行順序設定
```typescript
// app.module.ts
@Module({
  providers: [
    // Guard 執行順序很重要：先 Client 認證，再 User 認證
    {
      provide: APP_GUARD,
      useClass: ClientAuthGuard, // 第一個執行
    },
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,  // 第二個執行（基於 client 資訊）
    },
    {
      provide: APP_GUARD,
      useClass: DeviceAuthGuard, // 第三個執行（基於需要）
    },
  ],
})
export class AppModule {}
```

### 5. API 端點權限控制
```typescript
// auth.controller.ts
@Controller('auth')
export class AuthController {
  
  // 設備註冊：只需要 Client 認證，不需要 Device 認證
  @Post('device')
  @SkipDeviceAuth() // 跳過 Device 驗證
  async registerDevice(
    @Body() deviceDto: DeviceRegisterDto,
    @Request() req
  ) {
    // req.client 已由 ClientAuthGuard 設定
    const client = req.client;
    
    // 檢查 client 是否有 auth scope
    if (!client.allowed_scopes.includes('auth')) {
      throw new ForbiddenException('Client not authorized for auth operations');
    }
    
    // 執行設備註冊邏輯
    return this.authService.registerDevice(deviceDto);
  }
  
  // 檢查設備會話：需要設備認證
  @Get('device/session')
  @UseGuards(DeviceAuthGuard) // 明確需要設備認證
  async getDeviceSession(@Request() req) {
    // req.client 來自 ClientAuthGuard
    // req.device 來自 DeviceAuthGuard
    return this.authService.getDeviceSession(req.device.id);
  }
}
```

### 3. 特定路由豁免
```typescript
// 健康檢查端點不需要 client 認證
@Controller('health')
export class HealthController {
  @Get()
  @SkipClientAuth() // 自定義裝飾器
  check() {
    return { status: 'ok' };
  }
}
```

## 安全考量

### 1. Client Secret 管理
- 不同環境使用不同的 secrets
- 定期輪換 secrets
- 使用環境變數或 K8s Secrets 存儲
- 絕不在程式碼中硬編碼

### 2. 傳輸安全
- 強制使用 HTTPS
- 實施 Certificate Pinning（移動端）
- 使用請求簽名機制

### 3. Rate Limiting
- 基於 client_id 的限流
- 從資料庫讀取每個客戶端的限制設定
- 支援動態調整限流設定

```typescript
// rate-limit.guard.ts
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private redis: Redis,
    private logger: Logger,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const client = request.client; // 從 ClientAuthGuard 獲取

    if (!client) {
      return true; // 如果沒有 client 資訊，跳過限流
    }

    const key = `rate_limit:${client.id}:${Math.floor(Date.now() / 60000)}`;
    const current = await this.redis.incr(key);
    
    if (current === 1) {
      await this.redis.expire(key, 60); // 60 秒過期
    }

    if (current > client.rate_limit_per_minute) {
      this.logger.warn(`Rate limit exceeded for client: ${client.id}`);
      throw new TooManyRequestsException('Rate limit exceeded');
    }

    return true;
  }
}
```

### 4. 監控和告警
- 記錄所有認證失敗
- 異常流量告警
- Client 使用情況分析

## 錯誤處理

### 認證失敗響應
```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Invalid client credentials",
  "timestamp": "2025-07-29T10:30:00.123Z"
}
```

### 日誌記錄
```json
{
  "timestamp": "2025-07-29T10:30:00.123Z",
  "level": "WARN",
  "context": "ClientAuthGuard",
  "event": "client_auth_failed",
  "clientId": "unknown-client",
  "ip": "192.168.1.1",
  "userAgent": "SDK/1.0.0",
  "reason": "Invalid client_id"
}
```

## 未來擴充

### 1. 設備管理強化
- 設備指紋識別
- 異常設備偵測
- 設備黑名單管理

### 2. API Scope 管理
- 不同 client 有不同的 API 存取權限
- 細粒度的權限控制

### 3. 動態 Client 管理
- 管理後台動態新增/刪除 client
- Client 權限即時更新