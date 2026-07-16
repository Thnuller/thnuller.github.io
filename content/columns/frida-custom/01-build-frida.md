---
title: 第一章 编译Frida源码
date: 2026-02-02T13:00:24+08:00
description: "编译 Frida 16.5.6 Android arm64 版本的完整流程。"
weight: 10
aliases: ["/posts/6c130c/"]
---

## 0. 拉取源码（指定版本为16.5.6）

```bash
git clone -b 16.5.6 --recurse-submodules https://github.com/frida/frida
```



## 1. 生成 Android-arm64 构建配置

```bash
./configure --host=android-arm64
```

执行完毕后，当前目录会出现 `build/` 文件夹，里面即是 ninja 所需的构建文件。



## 2. 第一次 `ninja` 报错

```bash
cd build
ninja
```

大概率会报错：  
**系统自带的 `/usr/bin/ninja` 版本过旧，无法识别 Frida 构建文件中的新语法。**



## 3. 切换到 Frida 自带 ninja

把 Frida 预置的 toolchain 置顶到 `PATH`，让系统优先使用新版本的 ninja：

```bash
export PATH=$HOME/Frida/frida/deps/toolchain-linux-x86_64/bin:$PATH
```

验证是否切换成功：

```bash
which ninja
# 预期输出
# /home/yiren/Frida/frida/deps/toolchain-linux-x86_64/bin/ninja
```

> 若仍显示 `/usr/bin/ninja`，检查路径拼写或重新打开终端。



## 4. 继续编译

```bash
cd ~/Frida/frida/build
ninja
```

 
终端无报错即视为编译成功。



## 5. 验证成品

查看可执行文件是否存在：

```bash
ls -lh subprojects/frida-core/server/frida-server
```

确认架构：

```bash
file subprojects/frida-core/server/frida-server
# 输出示例
# frida-server: ELF 64-bit LSB executable, ARM aarch64, ...
```

出现 `ARM aarch64` 即表示目标架构正确，编译完成。
