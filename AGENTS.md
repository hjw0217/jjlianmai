# AGENTS.md — 声乐连麦预约管理应用

## 项目概览
中老年在线声乐教育连麦课程预约网页应用，支持试听连麦预约、分时段预约机制、预约确认卡片下载、管理员后台时段管理。

## 技术栈
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 + Design Token (教育风格)
- **UI**: shadcn/ui (Radix UI)
- **Data**: JSON 文件存储 (`data/` 目录)
- **Auth**: 内存 Session + Token 认证

## 目录结构
```
src/
├── app/
│   ├── page.tsx              # 首页（连麦课程预约页）
│   ├── confirmation/page.tsx # 预约确认页
│   ├── admin-login/page.tsx  # 管理员登录
│   ├── admin/page.tsx        # 管理后台
│   ├── api/
│   │   ├── auth/login/route.ts   # POST 管理员登录
│   │   ├── auth/verify/route.ts  # POST Token 验证
│   │   ├── courses/route.ts      # GET 课程列表
│   │   ├── timeslots/route.ts    # GET/POST/PUT/DELETE 时段 CRUD
│   │   └── bookings/route.ts     # GET/POST 预约管理
│   ├── layout.tsx            # 根布局
│   └── globals.css           # 全局样式 + Design Token
├── components/
│   └── navbar.tsx            # 全局导航栏
└── lib/
    └── store.ts              # 数据层（JSON 读写 + 认证逻辑）
```

## 构建与运行命令
- 开发: `pnpm run dev` (端口 5000)
- 构建: `pnpm run build`
- 启动: `pnpm run start`
- 类型检查: `pnpm ts-check`
- Lint: `pnpm lint`

## API 接口清单
| 路径 | 方法 | 功能 | 认证 |
|------|------|------|------|
| `/api/courses` | GET | 获取课程列表 | 否 |
| `/api/timeslots` | GET | 获取时段列表（支持 `?date=` 筛选） | 否 |
| `/api/timeslots` | POST | 时段增删改（需 `action` + `token`） | 是 |
| `/api/timeslots` | PUT | 更新时段（需 `token` + `id`） | 是 |
| `/api/timeslots` | DELETE | 删除时段（需 `token` + `id`） | 是 |
| `/api/bookings` | GET | 获取预约列表 | 否 |
| `/api/bookings` | POST | 创建/取消预约（`action: create/cancel`） | 否 |
| `/api/auth/login` | POST | 管理员登录 | 否 |
| `/api/auth/verify` | POST | Token 验证 | 否 |

## 管理员凭据
- 用户名: `admin`
- 密码: `admin123`

## 代码风格
- 组件使用 `'use client'` 标记客户端组件
- 表单使用原生 HTML 元素 + Tailwind class
- 数据通过 `fetch` 调用 API，不直接导入 store
- 所有交互状态使用 React `useState` 管理
