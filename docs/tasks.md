# 冥想課程平台 - 開發任務清單

## 專案概述
此專案為冥想課程平台的後端 API 開發和 SDK 開發，使用 NestJS 框架開發 API，提供 JavaScript/TypeScript SDK 給前端使用，部署於阿里雲 K8s 環境。

## 第一週任務 - 後端 API 和資料庫建設

### 1. 專案基礎設置
- [ ] 安裝必要的 NestJS 依賴套件
- [ ] 設定 TypeORM 和 MySQL 連線
- [ ] 設定 Redis 連線
- [ ] 配置環境變數管理 (ConfigModule)
- [ ] 設定全域錯誤處理和日誌系統

### 2. 資料庫設計和建置
- [ ] 建立 MySQL 資料庫 Schema
- [ ] 建立 devices 表（設備資訊管理）
- [ ] 建立 users 表（用戶資訊）
- [ ] 建立 user_auth_methods 表（用戶認證方式）
- [ ] 建立 device_user_sessions 表（設備用戶會話）
- [ ] 建立 courses 表（課程資訊）
- [ ] 建立 videos 表（影片資訊）
- [ ] 建立 user_course_access 表（用戶課程權限）
- [ ] 建立 playback_sessions 表（播放記錄）
- [ ] 建立 download_records 表（下載記錄）
- [ ] 建立 api_clients 表（API 客戶端管理）
- [ ] 設定資料庫 Migration 系統
- [ ] 建立預設 API 客戶端資料

### 3. 設備認證模組 (Device Auth Module)
- [ ] 建立 devices 模組結構
- [ ] 實作設備註冊和認證邏輯
- [ ] 實作設備匿名登入 API (POST /api/v1/auth/device)
- [ ] 實作設備 ID 生成和管理
- [ ] 實作設備會話管理

### 4. 用戶認證模組 (User Auth Module)
- [ ] 建立 auth 模組結構
- [ ] 實作 JWT 認證策略
- [ ] 實作帳號綁定 API (POST /api/v1/auth/bind)
- [ ] 實作 Email 綁定功能
- [ ] 實作手機號碼綁定功能
- [ ] 實作社交登入綁定（預留）
- [ ] 實作 Token 更新 API (POST /api/v1/auth/refresh)
- [ ] 實作多設備登入支援
- [ ] 建立 JWT Guard 和裝飾器
- [ ] 實作密碼加密和驗證

### 5. 用戶模組 (Users Module)
- [ ] 建立 users 模組結構
- [ ] 建立 User Entity
- [ ] 實作用戶 CRUD 服務
- [ ] 實作用戶訂閱管理功能
- [ ] 建立用戶 DTO 驗證

### 5. 課程模組 (Courses Module)
- [ ] 建立 courses 模組結構
- [ ] 建立 Course Entity
- [ ] 實作課程列表 API (GET /api/v1/courses)
- [ ] 實作課程詳情 API (GET /api/v1/courses/{courseId})
- [ ] 實作課程影片列表 API (GET /api/v1/courses/{courseId}/videos)
- [ ] 實作課程權限檢查邏輯

### 6. 影片模組 (Videos Module)
- [ ] 建立 videos 模組結構
- [ ] 建立 Video Entity
- [ ] 實作影片詳情 API (GET /api/v1/videos/{videoId})
- [ ] 實作影片權限驗證

### 7. 權限控制模組 (Access Module)
- [ ] 建立 access 模組結構
- [ ] 實作權限檢查 API (POST /api/v1/access/check)
- [ ] 實作影片 STS Token API (POST /api/v1/access/video-token)
- [ ] 實作用戶權限查詢 API (GET /api/v1/access/user-permissions)
- [ ] 整合阿里雲 STS 服務
- [ ] 實作 STS 憑證快取機制

### 8. 阿里雲 OSS 整合模組
- [ ] 建立 oss 模組結構
- [ ] 設定阿里雲 OSS SDK
- [ ] 實作 STS 臨時憑證生成
- [ ] 實作 OSS 檔案路徑管理
- [ ] 實作 CDN URL 簽名機制

### 9. Client 管理模組
- [ ] 建立 Client Entity 和 Service
- [ ] 實作 Client ID/Secret 認證 Guard
- [ ] 實作基於資料庫的客戶端驗證
- [ ] 建立 Client 管理 API（增刪改查）
- [ ] 實作 Client Secret 重新生成功能

### 10. 通用功能設置
- [ ] 實作 Rate Limiting 中間件（基於 client_id）
- [ ] 實作請求/響應日誌攔截器
- [ ] 實作 JSON 格式日誌輸出
- [ ] 實作敏感資料脫敏處理
- [ ] 設定 CORS 和安全 Headers

### 11. Redis 快取層
- [ ] 實作 Redis 服務封裝
- [ ] 實作用戶 Session 快取
- [ ] 實作 STS 憑證快取
- [ ] 實作課程權限快取
- [ ] 實作 Rate Limiting 計數器

## 第二週任務 - 進階功能和系統整合

### 12. 播放管理模組 (Playback Module)
- [ ] 建立 playback 模組結構
- [ ] 實作開始播放 API (POST /api/v1/playback/start)
- [ ] 實作進度更新 API (POST /api/v1/playback/progress)
- [ ] 實作播放歷史 API (GET /api/v1/playback/history)
- [ ] 實作播放進度同步機制
- [ ] 實作播放數據分析

### 12. 下載管理模組 (Download Module)
- [ ] 建立 download 模組結構
- [ ] 實作下載授權 API (POST /api/v1/download/authorize)
- [ ] 實作下載狀態 API (GET /api/v1/download/status)
- [ ] 實作下載完成回報 API (POST /api/v1/download/complete)
- [ ] 實作下載憑證管理

### 13. 健康檢查和監控
- [ ] 實作健康檢查端點
- [ ] 整合 Prometheus metrics
- [ ] 實作資料庫連線檢查
- [ ] 實作 Redis 連線檢查
- [ ] 實作 OSS 連線檢查

### 14. API 文檔和測試
- [ ] 設定 Swagger/OpenAPI 文檔
- [ ] 撰寫單元測試（各模組）
- [ ] 撰寫整合測試
- [ ] 撰寫 E2E 測試
- [ ] 實作 API 版本控制

### 15. 效能優化
- [ ] 實作資料庫查詢優化
- [ ] 實作 N+1 查詢防護
- [ ] 實作資料分頁機制
- [ ] 實作響應資料壓縮
- [ ] 優化 Redis 快取策略

### 16. 安全加固
- [ ] 實作 SQL Injection 防護
- [ ] 實作 XSS 防護
- [ ] 實作請求簽名驗證
- [ ] 實作敏感資料加密
- [ ] 實作安全 Headers 設定

### 17. K8s 部署準備
- [ ] 建立 Dockerfile
- [ ] 建立 K8s Deployment 配置
- [ ] 建立 ConfigMap 配置
- [ ] 建立 Secret 配置
- [ ] 實作優雅關閉機制

### 18. 日誌和監控整合
- [ ] 整合 Loki 日誌收集
- [ ] 設定結構化日誌格式
- [ ] 實作請求追蹤 (Request ID)
- [ ] 實作錯誤告警機制
- [ ] 建立 Grafana Dashboard

### 19. SDK Client 開發
- [ ] 設計 SDK 通用介面規範
- [ ] 建立 SDK 基礎架構
- [ ] 實作 JavaScript/TypeScript SDK
  - [ ] 初始化和配置管理
  - [ ] 認證模組 (登入、Token 管理)
  - [ ] 影片播放模組
  - [ ] 權限檢查模組
  - [ ] 下載管理模組
  - [ ] 播放進度同步
  - [ ] 錯誤處理和重試機制
- [ ] 建立 SDK 範例程式碼
- [ ] 撰寫 SDK 使用文檔
- [ ] 發布 npm 套件
- [ ] 建立 SDK 測試套件

### 20. SDK 整合功能
- [ ] 實作 STS 憑證自動更新機制
- [ ] 實作離線快取管理
- [ ] 實作斷點續播功能
- [ ] 實作自動品質調整
- [ ] 實作播放事件追蹤
- [ ] 實作下載隊列管理
- [ ] 實作加密存儲機制
- [ ] 優化 SDK 體積 (< 10MB)

### 21. 文檔撰寫
- [ ] 撰寫 API 使用文檔
- [ ] 撰寫 SDK 整合指南
- [ ] 撰寫部署指南
- [ ] 撰寫開發者指南
- [ ] 更新 README.md
- [ ] 建立 Postman Collection
- [ ] 建立 SDK Demo 專案

### 22. 最終測試和部署
- [ ] 執行完整的功能測試
- [ ] 執行效能壓力測試
- [ ] 執行安全掃描
- [ ] 部署到測試環境
- [ ] 部署到生產環境

## 驗收標準檢查清單

### 功能驗收
- [ ] 用戶可以成功登入和瀏覽課程
- [ ] 付費用戶可以播放高畫質影片
- [ ] 免費用戶只能存取免費內容
- [ ] 影片播放流暢，載入時間 < 2秒
- [ ] 離線下載功能正常運作
- [ ] 播放進度可跨設備同步
- [ ] SDK 可正確初始化和使用
- [ ] SDK 支援自動 Token 更新
- [ ] SDK 錯誤處理機制完善

### 技術指標
- [ ] API 響應時間 < 200ms
- [ ] 系統可用性 > 99.9%
- [ ] 支援併發 1000+ 請求
- [ ] 錯誤率 < 0.1%
- [ ] SDK 體積 < 10MB
- [ ] SDK 記憶體使用 < 50MB
- [ ] 影片切換延遲 < 1秒

### 安全要求
- [ ] 私有 OSS Bucket 已配置
- [ ] CDN URL 鑑權已實作
- [ ] API 請求簽名驗證已實作
- [ ] 敏感資料已加密存儲
- [ ] JWT 認證機制正常運作

## 注意事項
1. 所有 API 路徑都需要加上 `/api/v1` 前綴
2. 所有日誌必須為 JSON 格式，便於 Loki 收集
3. 敏感資料（密碼、Token）不可記錄在日誌中
4. 每個模組都需要包含單元測試
5. 遵循 NestJS 最佳實踐和專案的模組組織原則