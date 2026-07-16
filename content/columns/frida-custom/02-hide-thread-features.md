---
title: 第二章 抹掉线程特征
date: 2026-02-02T13:00:24+08:00
description: "分析并修改 Frida 常见线程名称特征。"
weight: 20
aliases: ["/posts/47934e/"]
---

## 0. 背景  
上篇我们把官方 16.5.6 编译出来了，但一上机就被 `/proc/*/status` 里的几条线程名出卖：  
- `gmain` / `gdbus`  
- `pool-frida`  

---

## 1. 发现特征：现场抓包  
一条命令看目标进程所有线程名：

**Linux**

```sh
adb shell "
PID=\$(ps -A | grep com.yimian.envcheck | awk '{print \$2}' | head -n1);
[ -n \"\$PID\" ] && \
for d in /proc/\$PID/task/*; do grep '^Name:' \$d/status; done
"
```

**Windows PowerShell**

```powershell
adb shell @"
PID=`$(ps -A | grep com.yimian.envcheck | awk '{print `$2}' | head -n1);
if [ -n "`$PID" ]; then
  for taskdir in /proc/`$PID/task/*; do
    cat "`$taskdir/status" | grep '^Name:' || true;
  done;
else
  echo 'Process my.app not found';
fi
"@
```

输出当场暴露：  
```
Name:	gmain  
Name:	gdbus  
Name:	pool-frida  
```

---

## 2. 用户态补丁：改掉静态字符串  
GLib 的 `gmain`、`gdbus` 都是编译期写死的常量，直接二进制替换最快。  
脚本（Python + lief，零依赖，支持任意 ELF）：

```python
# patch_thread_names.py
import lief, sys, random, string
def rng(n): return ''.join(random.choices(string.ascii_letters, k=n))

elf = lief.parse(sys.argv[1])
data = open(sys.argv[1], 'rb').read()

for old in (b'gmain', b'gdbus'):
    new = rng(len(old)).encode()
    print(f'[*] {old} -> {new}')
    data = data.replace(old, new)

open(sys.argv[1], 'wb').write(data)
print('[+] 用户态补丁完成')
```

执行：  
```bash
python patch_thread_names.py frida-server
```

推回手机，重启注入，再看 `/proc/*/status`：  
```
Name:	aZqW          ← gmain 已消失  
Name: XtVb          ← gdbus 已消失  
Name: pool-frida    ← 还在！
```

---

## 3. 内核态劫持：让 `pool-frida` 原地蒸发  
`pool-frida` 是运行时通过 `prctl(PR_SET_NAME, …)` 设置的，单纯改二进制无效，直接给内核加个小后门：  

```c
// kernel/sys.c  @@prctl
case PR_SET_NAME:
    if (strncpy_from_user(comm, (char __user *)arg2, sizeof(me->comm)-1) < 0)
        return -EFAULT;
    /* 新增拦截 */
    if (!strcmp(comm, "pool-frida")) {
        strcpy(comm, "peel-fucka");          // 想叫啥叫啥
        pr_info("renamed pool-frida -> %s (pid=%d)\n", comm, me->pid);
    }
    break;
```

编译 boot.img，刷机重启。

---

## 4. 另一种方法：不需要改内核  
如果不想动内核，可在 Frida 源码里直接把线程名改掉，只需两行补丁：

1. 改掉主线程名  
```diff
From 0f3391327c044f6c2af0ee3322085904b0afa2c5 Mon Sep 17 00:00:00 2001
From: Ylarod <me@ylarod.cn>
Date: Thu, 20 Jul 2023 10:01:20 +0800
Subject: [PATCH] Florida: pool-frida

---
 src/frida-glue.c | 2 ++
 1 file changed, 2 insertions(+)

diff --git a/src/frida-glue.c b/src/frida-glue.c
index ee8f0737..43cc8167 100644
--- a/src/frida-glue.c
+++ b/src/frida-glue.c
@@ -40,6 +40,8 @@ frida_init_with_runtime (FridaRuntime rt)
     g_io_module_openssl_register ();
 #endif
 
+    g_set_prgname ("ggbond");
+
     if (runtime == FRIDA_RUNTIME_OTHER)
     {
       main_context = g_main_context_ref (g_main_context_default ());
```

2. 改掉线程池后缀  
```diff
From 649c04e3b6d0c1d1a5e26ff34b Mon Sep 17 00:00:00 2001
From: Ylarod <me@ylarod.cn>
Date: Thu, 20 Jul 2023 10:26:34 +0800
Subject: [PATCH] Florida: pool-frida

---
 gum/gum.c | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)

diff --git a/gum/gum.c b/gum/gum.c
index f6e6243f..3305f629 100644
--- a/gum/gum.c
+++ b/gum/gum.c
@@ -304,7 +304,7 @@ gum_init_embedded (void)
   g_log_set_default_handler (gum_on_log_message, NULL);
   gum_do_init ();
 
-  g_set_prgname ("frida");
+  g_set_prgname ("ggbond");
 
 #if defined (HAVE_LINUX) && defined (HAVE_GLIBC)
   gum_libdl_prevent_unload ();
```

编译后重新部署，线程名瞬间"洗白"：
```
Name:	BxCon
Name:	XgEni
Name:	pool-ggbond   ← 曾经叫 pool-frida
```

---

## 5. 历史遗留特征：gum-js-loop（12.8.0 以及其他老版本）

以 Frida 12.8.0 为例，Gum 的 JavaScript 引擎会单独起一个线程负责执行 JS，线程名被硬编码为`gum-js-loop`。  
这条特征随着架构调整被彻底移除，因此**只影响老版本**。  
如果你在旧机旧包上作业，记得把它一起干掉：

```bash
# 老版本现场可能长这样
Name:	gmain
Name:	gdbus
Name:	pool-frida
Name:	gum-js-loop    ← 多出来这位
```

---

至此，所有可疑线程名全部消失，现场干净。
