---
title: 第二章 Anykernel3 刷入
date: 2026-02-02T13:00:24+08:00
description: "使用 AnyKernel3 打包并刷入小米 5 内核。"
weight: 20
aliases: ["/posts/7310e8/"]
---

本文介绍如何使用 AnyKernel3 刷入编译好的小米5内核。

## 1. 下载 AnyKernel3

```bash
git clone https://github.com/osm0sis/AnyKernel3.git
```

## 2. 准备内核文件

将编译生成的 `Image.gz-dtb` 复制到 AnyKernel3 目录：

```bash
cp output/arch/arm64/boot/Image.gz-dtb AnyKernel3/
```

## 3. 配置 anykernel.sh

编辑 `anykernel.sh` 文件，设置设备信息：

```bash
# AnyKernel3 配置

BLOCK=/dev/block/platform/soc/624000.ufshc/by-name/boot;

device.name1=gemini
```

## 4. 打包刷机包

```bash
cd AnyKernel3
zip -r9 Mi5_Kernel_$(date +%Y%m%d).zip * 
```

## 5. 刷入内核

1. 将生成的 zip 包复制到手机
2. 进入 TWRP Recovery
3. 选择 Install，找到 zip 包刷入
4. 重启系统

## 注意事项

- 刷入前请备份原有内核
- 确保 TWRP 版本支持当前系统
- 如遇问题，可通过 TWRP 恢复备份
