---
title: "安静的防线：最小权限实践笔记"
date: 2026-07-10
description: "把最小权限从口号变成可以验证的工程约束。"
tags: ["零信任", "权限治理"]
---

# 0成本App全栈架构文档（2026 Q1 修订版）

> 目标：日活 1k 以内零租金运行「上传 + 认证 + 存储 + 缓存」；  



## 1. 架构总览

|层级|技术选型|免费上限|本方案实际负载|备注|
|--|--|--|--|--|
|客户端|Flutter App|无|0|存储运行时直传|
|边缘鉴权|Cloudflare Workers|10 万次/日|1 次/上传|无状态 JWT 验签|
|对象存储|Cloudflare R2|10 GB / 100 万次 A 类|1 PUT/上传|出站流量 0|
|主应用|Bun → Fly.io 免费容器|3 GB 出站/月|纯 JSON ≈ 1 kB/接口|日活 1k 内安全|
|缓存|Upstash Redis (Serverless)|**500k 命令/月** 50 GB 带宽 256 MB 存储|登录/刷新缓存|BetterAuth 外部缓存|
|数据库|Supabase Postgres|500 MB / 50 连接|只存 key & 元数据|几乎无限|



## 2. 核心流程（无代码版）

1. Flutter App 登录 → 拿到 BetterAuth JWT（本地存）
2. 需要上传时，App 带 JWT 请求边缘函数  
`GET /api/upload/policy?filename=xxx`
3. 边缘函数（Cloudflare Worker）
   - 用 BetterAuth 公钥验 JWT（无状态，不连库）
   - 生成一次性 R2 PUT 预签名 URL（60 s）
   - 立即返回 `{url, key}`，**Worker 退出**
4. App 直连 R2 域名执行 PUT 上传（文件字节永不经过 Worker）
5. 上传完成，App 可选调用主应用 `/api/complete` 回写业务库
6. 主应用（Bun on Fly.io）
   - 只跑 BetterAuth 登录/刷新/业务 JSON
   - 外部缓存：Upstash Redis 缓存会话、JWT 黑名单、速率限制
   - 写行为日志到 Supabase（1 行）



## 3. 免费额度核算（含 Redis）

|资源|上限|本方案消耗|安全倍数|
|--|--|--|--|
|Fly 出站|3 GB/月|1k 用户 × 100 请求 × 1kB = 0.3 GB/月|10×|
|Worker 调用|10 万/日|1k 上传/日|100×|
|R2 A 类|100 万/月|1k 上传/月|1000×|
|R2 存储|10 GB|5 MB × 1k = 5 GB|2×|
|Upstash 命令|**500k/月**|登录 3 次 + 刷新 2 次 ≈ 5k/月|**100×**|
|Supa 查询|10 万/月|5k/月|20×|
|Supa 连接|50 条|单实例 + pgbouncer 复用|足够|



## 4. 关键设计决策

|决策|理由|
|--|--|
|**客户端直传 R2**|零带宽、零 CPU、零租金|
|**边缘函数只验签**|无状态，<2 ms CPU，不碰 TCP|
|**接口 JSON 不缓存**|一致性优先，TTL=0|
|**Upstash 外部缓存**|减少 Postgres 读次数，防 50 万月命令撞线|
|**Supabase 只存 key**|500 MB 可存 5 千万行，数据量不再是瓶颈|


## 5. 超量逃生路径（5 分钟升级）

|场景|一键方案|预估费用|
|--|--|--|
|Fly 出站 > 3 GB|控制台绑卡 → 按量 $0.02/GB|100 GB = $2|
|Worker 调用 > 10 万/日|升级到 Workers Paid|$5/月|
|R2 存储 > 10 GB|自动计费|$0.015/GB/月|
|Upstash 命令 > 500k/月|升级到 $5/月档|$5/月|
|Supabase 查询/连接|换 Neon 免费 10 万次/月|$0|



## 6. 上线 checklist

- [ ] Flutter 实现客户端直传 R2（PUT 预签名）
- [ ] Worker 配置 ENV：R2_BUCKET、BETTERAUTH_PUBLIC_PEM
- [ ] Fly.io 配置 ENV：DATABASE_URL（pgbouncer 6543）、UPSTASH_REDIS_REST_URL
- [ ] R2 桶 CORS 允许 `app://*` PUT
- [ ] Supabase 开启 PgBouncer
- [ ] Upstash Redis 创建免费库，BetterAuth 外部缓存指向 REST URL



## 7. 一句话总结

**JWT 验签放边缘、文件直传 R2、主应用只 JSON、Redis 缓存挡查询、Supabase 存 key——**  
**日活 1k 内零租金，十万级 DAU 才用 5 刀/月。**