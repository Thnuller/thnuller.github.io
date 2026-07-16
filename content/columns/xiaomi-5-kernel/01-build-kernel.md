---
title: 第一章 编译 xiaomi 5 内核
date: 2026-02-02T13:00:24+08:00
description: "在 Ubuntu 22.04 上编译小米 5 Android 8.0 内核。"
weight: 10
aliases: ["/posts/834c9e/"]
---

## 系统要求
- **必须使用小米5 Android 8 miui版本**  
## 1. 获取源码
```bash
git clone https://github.com/MiCode/Xiaomi_Kernel_OpenSource.git -b scorpio-o-oss
```

## 2. 工具链配置
```bash
repo init -u https://mirrors.tuna.tsinghua.edu.cn/git/AOSP/platform/manifest -b android-8.0.0_r1
repo sync
```

## 3. 安装依赖
```bash
sudo apt install unzip zip libssl-dev libffi-dev gnupg flex bison gperf \
build-essential curl zlib1g-dev gcc-multilib g++-multilib libc6-dev-i386 \
lib32ncurses5-dev x11proto-core-dev libx11-dev libz-dev ccache \
libgl1-mesa-dev libxml2-utils xsltproc
```

## 4. 环境变量
```bash
export ARCH=arm64
export SUBARCH=arm64
export CROSS_COMPILE=/path/to/android-8/prebuilts/gcc/linux-x86/aarch64/aarch64-linux-android-4.9/bin/aarch64-linux-android-
```

## 5. 编译流程
```bash
# 修复WiFi问题
修改Xiaomi_Kernel_OpenSource-scorpio-o-oss/arch/arm64/configs/gemini_user_defconfig 文件
修改为CONFIG_MODULE_SIG_FORCE=n

make O=output gemini_user_defconfig
make O=output -j$(nproc)

# 编译成功，用anykernel3刷入即可
Xiaomi_Kernel_OpenSource-scorpio-o-oss/output/arch/arm64/boot/Image.gz-dtb
```

## 常见问题
### 1. yylloc多重定义
修改 `scripts/dtc/dtc-lexer.lex.c_shipped`：
```c
extern YYLTYPE yylloc;  # 原定义为 YYLTYPE yylloc;
```



## 注意事项
1. 目录路径不要含中文
2. 建议Ubuntu 22.04环境
