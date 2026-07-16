---
title: 第一章 编译Redmi Note 8 Pro内核
date: 2026-02-02T13:00:24+08:00
description: "在 Ubuntu 22.04 上构建 Redmi Note 8 Pro 内核。"
weight: 10
aliases: ["/posts/6f7a9f/"]
---

> 主机环境：Ubuntu 22.04 
> 工具链：Android NDK r20b（LLVM/Clang）



## 1. 准备源码与工具链

```bash
# 1. 拉取内核源码（示例）
git clone https://github.com/AgentFabulous/begonia.git
```
```bash
# 2. 下载并解压 NDK（若未安装）
wget https://dl.google.com/android/repository/android-ndk-r20b-linux-x86_64.zip
```



## 2. 导出临时环境变量

> **建议：** 把以下变量写进 `env.sh`，每次编译前执行 `source env.sh`。

```bash
#!/usr/bash
# env.sh
export ARCH=arm64 # 给配置阶段用

export NDK=~/Android/android-ndk-r20b
export PATH=$NDK/toolchains/llvm/prebuilt/linux-x86_64/bin:$PATH
```

```bash
chmod +x env.sh
source env.sh
```



## 3. 生成默认配置

```bash
mkdir output
make O=output begonia_user_defconfig
```



## 4. 全速编译（Release）

```bash
make O=output ARCH=arm64 \
     CC=clang \
     CLANG_TRIPLE=aarch64-linux-gnu- \
     CROSS_COMPILE=aarch64-linux-android- \
     -j$(nproc)
```

编译产物：  
`output/arch/arm64/boot/Image.gz-dtb`（刷机包所需内核）



## 5. 单线程排错（Debug）

当编译失败、需定位错误时，改用单线程并输出详细日志：

```bash
make O=output ARCH=arm64 \
     CC=clang \
     CLANG_TRIPLE=aarch64-linux-gnu- \
     CROSS_COMPILE=aarch64-linux-android- \
     -j1 V=1 2>&1 | tee fail.log
```

`fail.log` 会记录完整命令与报错，便于检索。


## 6. 清理与重置

| 目的 | 命令 |
|---|---|
| 仅清理编译产物（保留 `.config`） | `make O=output clean` |
| 深度清理（含 `.config`） | `make O=output mrproper` |




至此，Begonia 内核的完整编译流程整理完毕，祝编译顺利！
