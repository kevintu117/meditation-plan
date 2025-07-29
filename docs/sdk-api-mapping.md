# SDK 與 API 對應關係文檔

## SDK 功能模組與 API 端點對應

### 1. 設備認證模組 (device auth)
SDK 方法與對應的 API：

```javascript
// SDK: 設備匿名登入（SDK 初始化時自動調用）
const session = await sdk.auth.loginAnonymous();
// API: POST /api/v1/auth/device

// SDK: 檢查當前會話狀態
const isValid = await sdk.auth.isSessionValid();
// 內部檢查：JWT token 是否有效
```

### 2. 用戶認證模組 (user auth)
SDK 方法與對應的 API：

```javascript
// SDK: 綁定 Email 帳號
await sdk.auth.bindEmail(email, password);
// API: POST /api/v1/auth/bind

// SDK: 綁定手機號碼
await sdk.auth.bindPhone(phone, verificationCode);
// API: POST /api/v1/auth/bind

// SDK: 社交登入綁定
await sdk.auth.bindSocial('google', googleToken);
// API: POST /api/v1/auth/bind/social

// SDK: Token 更新（自動處理）
// API: POST /api/v1/auth/refresh

// SDK: 獲取用戶資料
await sdk.auth.getProfile();
// API: GET /api/v1/auth/profile
```

### 3. 課程瀏覽模組
SDK 方法與對應的 API：

```javascript
// SDK: 獲取課程列表
const courses = await sdk.courses.getList();
// API: GET /api/v1/courses

// SDK: 獲取課程詳情
const course = await sdk.courses.getDetail('course-101');
// API: GET /api/v1/courses/{courseId}

// SDK: 獲取課程影片列表
const videos = await sdk.courses.getVideos('course-101');
// API: GET /api/v1/courses/{courseId}/videos
```

### 4. 權限檢查模組
SDK 方法與對應的 API：

```javascript
// SDK: 檢查課程權限
const hasAccess = await sdk.auth.checkCourseAccess('course-101');
// API: POST /api/v1/access/check

// SDK: 獲取用戶已購買課程
const purchasedCourses = await sdk.user.getPurchasedCourses();
// API: GET /api/v1/access/user-permissions
```

### 5. 影片播放模組
SDK 方法與對應的 API：

```javascript
// SDK: 獲取影片詳情
const videoInfo = await sdk.video.getDetail('video-001');
// API: GET /api/v1/videos/{videoId}

// SDK: 播放影片（獲取播放憑證）
const player = await sdk.video.play({
  courseId: 'course-101',
  videoId: 'video-001',
  quality: 'medium'
});
// API: POST /api/v1/access/video-token (獲取 STS 憑證)
// API: POST /api/v1/playback/start (記錄播放開始)
```

### 6. 播放進度管理
SDK 方法與對應的 API：

```javascript
// SDK: 自動同步播放進度（每30秒）
player.on('progress', (currentTime, totalTime) => {
  // SDK 內部自動調用
});
// API: POST /api/v1/playback/progress

// SDK: 獲取播放歷史
const history = await sdk.playback.getHistory();
// API: GET /api/v1/playback/history
```

### 7. 下載管理模組
SDK 方法與對應的 API：

```javascript
// SDK: 開始下載課程
const downloadTask = await sdk.download.startCourse({
  courseId: 'course-101',
  quality: 'medium'
});
// API: POST /api/v1/download/authorize (獲取下載權限和憑證)

// SDK: 檢查下載狀態
const status = await sdk.download.getStatus('course-101');
// API: GET /api/v1/download/status

// SDK: 下載完成回報
await sdk.download.markComplete('course-101');
// API: POST /api/v1/download/complete
```

## SDK 內部處理邏輯

### 1. Client 認證
- SDK 初始化時設定 client_id 和 client_secret
- 所有 API 請求自動帶上 Client 認證 headers
- Client 認證失敗時觸發錯誤事件

### 2. Token 管理
- SDK 自動管理 JWT Token 的存儲和更新
- Token 過期前自動調用 refresh API
- 所有 API 請求自動帶上 Authorization header

### 3. STS 憑證管理
- SDK 快取 STS 憑證，避免重複請求
- 憑證過期前自動更新
- 使用 STS 憑證直接訪問阿里雲 OSS

### 4. 錯誤處理
- API 錯誤自動重試（網路錯誤）
- Token 過期自動更新後重試
- Client 認證失敗觸發錯誤事件
- 權限錯誤觸發相應事件

### 5. 事件系統
```javascript
// 權限變更事件
sdk.auth.on('accessRevoked', (courseId) => {
  // 處理權限被撤銷
});

// 播放錯誤事件
player.on('error', (error) => {
  // 處理播放錯誤
});

// 下載進度事件
downloadTask.on('progress', (downloaded, total) => {
  // 更新下載進度
});
```

## API 請求流程示例

### 播放影片完整流程：
1. `POST /api/v1/access/check` - 檢查用戶權限
2. `POST /api/v1/access/video-token` - 獲取 STS 憑證
3. `POST /api/v1/playback/start` - 記錄播放開始
4. 使用 STS 憑證直接從 OSS/CDN 獲取影片
5. `POST /api/v1/playback/progress` - 定期同步進度（每30秒）

### 下載影片完整流程：
1. `POST /api/v1/access/check` - 檢查用戶權限
2. `POST /api/v1/download/authorize` - 獲取下載憑證
3. 使用 STS 憑證直接從 OSS 下載影片
4. `POST /api/v1/download/complete` - 回報下載完成

## SDK 不直接調用的 API
以下 API 主要用於管理後台或其他用途，SDK 不直接使用：
- 用戶管理相關 API（由管理後台使用）
- 課程管理相關 API（由管理後台使用）
- 數據分析相關 API（由分析系統使用）