# Client 管理 API 設計

## 概述
提供管理 API 客戶端的後台管理功能，支援動態新增、修改、刪除客戶端。

## 管理 API 端點

### 1. 獲取客戶端列表
```http
GET /api/v1/admin/clients
Authorization: Bearer {admin_token}

Response:
{
  "success": true,
  "data": {
    "clients": [
      {
        "id": "client-web",
        "name": "官方網頁版",
        "client_type": "web",
        "is_active": true,
        "rate_limit_per_minute": 200,
        "allowed_scopes": ["auth", "courses", "videos", "playback"],
        "created_at": "2025-07-29T10:00:00Z",
        "last_used_at": "2025-07-29T15:30:00Z"
      }
    ],
    "total": 4
  }
}
```

### 2. 建立新客戶端
```http
POST /api/v1/admin/clients
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "id": "client-partner-abc",
  "name": "合作夥伴 ABC",
  "client_type": "partner",
  "rate_limit_per_minute": 50,
  "allowed_scopes": ["auth", "courses"],
  "metadata": {
    "contact": "admin@partner-abc.com",
    "description": "第三方合作夥伴"
  }
}

Response:
{
  "success": true,
  "data": {
    "client": {
      "id": "client-partner-abc",
      "client_secret": "generated-secret-key"
    }
  }
}
```

### 3. 更新客戶端設定
```http
PUT /api/v1/admin/clients/{clientId}
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "name": "更新後的名稱",
  "rate_limit_per_minute": 100,
  "allowed_scopes": ["auth", "courses", "videos"],
  "is_active": true
}
```

### 4. 重新生成 Client Secret
```http
POST /api/v1/admin/clients/{clientId}/regenerate-secret
Authorization: Bearer {admin_token}

Response:
{
  "success": true,
  "data": {
    "client_secret": "new-generated-secret-key"
  }
}
```

### 5. 刪除客戶端
```http
DELETE /api/v1/admin/clients/{clientId}
Authorization: Bearer {admin_token}
```

### 6. 客戶端使用統計
```http
GET /api/v1/admin/clients/{clientId}/stats
Authorization: Bearer {admin_token}

Response:
{
  "success": true,
  "data": {
    "client_id": "client-web",
    "stats": {
      "total_requests_today": 15420,
      "total_requests_this_month": 456789,
      "last_24h_requests": [
        {"hour": "2025-07-29T14:00:00Z", "count": 234},
        {"hour": "2025-07-29T15:00:00Z", "count": 189}
      ],
      "top_endpoints": [
        {"/api/v1/courses": 5432},
        {"/api/v1/auth/login": 3210}
      ]
    }
  }
}
```

## Controller 實作範例

```typescript
// admin/clients.controller.ts
@Controller('admin/clients')
@UseGuards(AdminAuthGuard) // 管理員認證
export class AdminClientsController {
  constructor(
    private clientService: ClientService,
    private clientStatsService: ClientStatsService,
  ) {}

  @Get()
  async getClients(@Query() query: GetClientsDto) {
    const { page = 1, limit = 20, client_type, is_active } = query;
    
    const [clients, total] = await this.clientService.findAndCount({
      where: { 
        ...(client_type && { client_type }),
        ...(is_active !== undefined && { is_active })
      },
      skip: (page - 1) * limit,
      take: limit,
      order: { created_at: 'DESC' }
    });

    return {
      success: true,
      data: { clients, total }
    };
  }

  @Post()
  async createClient(@Body() createClientDto: CreateClientDto) {
    // 生成隨機 client_secret
    const clientSecret = crypto.randomBytes(32).toString('hex');
    const hashedSecret = await bcrypt.hash(clientSecret, 10);

    const client = await this.clientService.create({
      ...createClientDto,
      client_secret: hashedSecret
    });

    return {
      success: true,
      data: {
        client: {
          id: client.id,
          client_secret: clientSecret // 只在建立時返回明文
        }
      }
    };
  }

  @Put(':clientId')
  async updateClient(
    @Param('clientId') clientId: string,
    @Body() updateClientDto: UpdateClientDto
  ) {
    await this.clientService.update(clientId, updateClientDto);
    return { success: true };
  }

  @Post(':clientId/regenerate-secret')
  async regenerateSecret(@Param('clientId') clientId: string) {
    const newSecret = crypto.randomBytes(32).toString('hex');
    const hashedSecret = await bcrypt.hash(newSecret, 10);

    await this.clientService.update(clientId, {
      client_secret: hashedSecret
    });

    return {
      success: true,
      data: { client_secret: newSecret }
    };
  }

  @Get(':clientId/stats')
  async getClientStats(@Param('clientId') clientId: string) {
    const stats = await this.clientStatsService.getStats(clientId);
    return {
      success: true,
      data: { client_id: clientId, stats }
    };
  }

  @Delete(':clientId')
  async deleteClient(@Param('clientId') clientId: string) {
    await this.clientService.softDelete(clientId);
    return { success: true };
  }
}
```

## DTO 定義

```typescript
// dto/create-client.dto.ts
export class CreateClientDto {
  @IsString()
  @Matches(/^client-[a-z0-9-]+$/)
  id: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsEnum(['web', 'mobile', 'sdk', 'partner'])
  client_type: string;

  @IsNumber()
  @Min(1)
  @Max(10000)
  rate_limit_per_minute: number;

  @IsArray()
  @ArrayMinSize(1)
  allowed_scopes: string[];

  @IsOptional()
  @IsObject()
  metadata?: any;
}

// dto/update-client.dto.ts
export class UpdateClientDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000)
  rate_limit_per_minute?: number;

  @IsOptional()
  @IsArray()
  allowed_scopes?: string[];

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: any;
}
```

## 安全考量

1. **管理員權限**：只有具備管理員權限的用戶才能管理客戶端
2. **Secret 安全**：client_secret 只在建立和重新生成時以明文返回一次
3. **操作日誌**：記錄所有管理操作的詳細日誌
4. **軟刪除**：使用軟刪除避免誤刪重要客戶端

## Redis 快取策略

```typescript
// 快取活躍客戶端資訊，減少資料庫查詢
const cacheKey = `client:${clientId}`;
await redis.setex(cacheKey, 300, JSON.stringify(client)); // 5 分鐘快取
```

## 未來擴充

1. **API Scope 細分**：更細粒度的權限控制
2. **客戶端版本管理**：支援不同版本的客戶端
3. **自動化管理**：透過 CI/CD 自動管理客戶端
4. **監控告警**：異常使用模式自動告警