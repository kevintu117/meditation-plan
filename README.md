# GoMore 冥想課程平台 API

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

## 專案簡介

冥想課程平台的後端 API 服務，採用 NestJS + MySQL + Redis 架構，提供影片串流、用戶認證、權限管理等功能。支援多平台 SDK 整合，部署於阿里雲 Kubernetes 環境。

### 核心功能
- 🔐 設備優先認證 + 用戶綁定機制
- 📱 多平台 SDK 支援 (iOS, Android, Web)
- 🎥 影片串流和離線下載管理
- 🛡️ 基於客戶端的 API 存取控制
- ☁️ 阿里雲 OSS/STS 整合
- 📊 結構化日誌 (Loki) 和監控

### 技術棧
- **框架**: NestJS v11
- **資料庫**: MySQL + Redis
- **認證**: JWT + Passport
- **雲端服務**: 阿里雲 OSS/STS
- **部署**: Kubernetes + Docker
- **監控**: Loki + Grafana

## 文檔目錄

### 核心文檔
- 📋 [產品需求文件 (PRD)](./docs/meditation_platform_prd.md) - 完整的產品規格和技術架構
- ✅ [開發任務清單](./docs/tasks.md) - 詳細的開發計劃和里程碑

### 技術設計
- 🔐 [認證流程設計](./docs/authentication-flow.md) - 三層認證模型和完整流程
- 📱 [設備用戶認證](./docs/device-user-auth.md) - 設備優先的認證策略
- 🛡️ [客戶端認證管理](./docs/client-authentication.md) - API 客戶端管理機制
- 🔗 [SDK API 對應關係](./docs/sdk-api-mapping.md) - SDK 功能與 API 端點對應
- 👑 [客戶端管理 API](./docs/client-management-api.md) - 管理員客戶端管理接口

## 快速開始

### 1. 環境設定

```bash
# 複製環境變數檔案
cp .env.example .env

# 安裝依賴套件
npm install
```

### 2. 資料庫設定

```bash
# 建立 MySQL 資料庫
mysql -u root -p
CREATE DATABASE meditation_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 設定 Redis (如使用 Docker)
docker run -d -p 6379:6379 --name meditation-redis redis:alpine
```

### 3. 啟動應用程式

```bash
# 開發模式
npm run start:dev

# 除錯模式
npm run start:debug

# 生產模式
npm run start:prod
```

### 4. API 文檔
啟動後可訪問 Swagger 文檔：`http://localhost:3000/docs`

## 開發指令

```bash
# 程式碼格式化
npm run format

# 程式碼檢查
npm run lint

# 單元測試
npm run test

# E2E 測試
npm run test:e2e

# 測試覆蓋率
npm run test:cov

# 建置應用程式
npm run build
```

## 專案結構

```
src/
├── config/          # 配置檔案
├── modules/         # 功能模組
│   ├── auth/        # 認證模組
│   ├── users/       # 用戶模組
│   ├── courses/     # 課程模組
│   ├── videos/      # 影片模組
│   └── ...
├── common/          # 共用功能
│   ├── guards/      # 守衛
│   ├── decorators/  # 裝飾器
│   ├── filters/     # 過濾器
│   └── interceptors/# 攔截器
├── database/        # 資料庫相關
│   ├── entities/    # 實體
│   └── migrations/  # 遷移檔案
└── main.ts          # 應用程式入口
```

## 部署

### Docker 部署
```bash
# 建置 Docker 映像
docker build -t meditation-api .

# 啟動容器
docker run -p 3000:3000 meditation-api
```

### Kubernetes 部署
請參考 `k8s/` 目錄下的配置檔案。

## 開發規範

1. **程式碼風格**: 遵循 ESLint 和 Prettier 設定
2. **提交規範**: 使用 Conventional Commits 格式
3. **測試要求**: 新功能需包含單元測試
4. **文檔更新**: 重要變更需更新相關文檔

## 相關連結

- [NestJS 官方文檔](https://docs.nestjs.com)
- [TypeORM 文檔](https://typeorm.io/)
- [MySQL 文檔](https://dev.mysql.com/doc/)
- [Redis 文檔](https://redis.io/documentation)
