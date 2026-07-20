---
title: "Qemu 虚拟机:使用 TAP 设备实现虚拟机与宿主机同网段通信"
date: 2026-07-20
description: "只有热点，没有网线，如何实现虚拟机与宿主机同网段通信？"
tags: ["虚拟机", "qemu"]
---

# Linux 虚拟机 - TAP 网络配置方案

## 概述

为 Linux 虚拟机配置 TAP 设备，使其与 Ubuntu 宿主机处于同一网段（`192.168.2.0/24`），并实现访问外网。



## 网络拓扑

```
宿主机 (Ubuntu)
    IP: 192.168.2.x (无线网卡 wlo1)
    └── tap-vm0 (192.168.2.100) → Linux 虚拟机
```



## Ubuntu 宿主机配置

### 1. 创建 TAP 设备配置脚本

```bash
sudo nano /usr/local/sbin/vm-tap-setup
```

```bash
#!/bin/sh
set -eu

PATH=/usr/sbin:/usr/bin:/sbin:/bin

# 创建 TAP 设备，归属 libvirt-qemu 用户
if ! ip link show dev tap-vm0 >/dev/null 2>&1; then
    ip tuntap add dev tap-vm0 mode tap user libvirt-qemu
fi

# 启用 TAP 设备并添加路由
ip link set dev tap-vm0 up
ip route replace 192.168.2.100/32 dev tap-vm0

# 内核参数调优
sysctl -w net.ipv4.ip_forward=1
sysctl -w net.ipv4.conf.wlo1.proxy_arp=1
sysctl -w net.ipv4.conf.tap-vm0.proxy_arp=1
sysctl -w net.ipv4.conf.wlo1.rp_filter=2
sysctl -w net.ipv4.conf.tap-vm0.rp_filter=2

# iptables 转发规则
iptables -w -C FORWARD -i tap-vm0 -o wlo1 -j ACCEPT 2>/dev/null || \
    iptables -w -I FORWARD 1 -i tap-vm0 -o wlo1 -j ACCEPT

iptables -w -C FORWARD -i wlo1 -o tap-vm0 -j ACCEPT 2>/dev/null || \
    iptables -w -I FORWARD 1 -i wlo1 -o tap-vm0 -j ACCEPT
```

赋予执行权限：

```bash
sudo chmod +x /usr/local/sbin/vm-tap-setup
```

---

### 2. 创建 Systemd 服务（开机自启）

```bash
sudo nano /etc/systemd/system/vm-tap.service
```

```ini
[Unit]
Description=Routed TAP interface for Linux virtual machine
Wants=network-online.target
After=network-online.target
Before=libvirtd.service virtqemud.service

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/vm-tap-setup
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
```

启用并启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable vm-tap.service
sudo systemctl start vm-tap.service
```

验证服务状态：

```bash
sudo systemctl status vm-tap.service
ip link show tap-vm0
```



### 3. Linux 虚拟机 XML 配置

编辑虚拟机配置，在虚拟网络接口修改：

```xml
<interface type="ethernet">
  <mac address="53:54:00:12:2d:7e"/>
  <target dev="tap-vm0" managed="no"/>
  <model type="virtio"/>
  <address type="pci" domain="0x0000" bus="0x01" slot="0x00" function="0x0"/>
</interface>
```

启动虚拟机



### 4. Linux 虚拟机内部 IP 配置

- NetworkManager（nmcli）

```bash
# 查看网卡名称
nmcli device status

# 设置静态 IP
nmcli con mod "Wired connection 1" ipv4.addresses 192.168.2.100/24
nmcli con mod "Wired connection 1" ipv4.gateway 192.168.2.1
nmcli con mod "Wired connection 1" ipv4.dns "8.8.8.8 114.114.114.114"
nmcli con mod "Wired connection 1" ipv4.method manual
nmcli con down "Wired connection 1" && nmcli con up "Wired connection 1"
```



### 5. 连通性验证

#### 在 Linux 虚拟机内部

```bash
# 查看 IP
ip addr show

# 测试连通性
ping 192.168.2.1      # 网关/宿主机
ping 8.8.8.8          # 外网
ping google.com       # DNS 解析测试
```

#### 在宿主机上

```bash
# 查看 TAP 设备
ip link show tap-vm0

# 查看路由
ip route | grep 192.168.2.100

# ping 虚拟机
ping 192.168.2.100
```



### 注意事项

- **无线网卡名称**：脚本中使用 `wlo1`，如果您的网卡名不同（如 `wlan0`），请修改脚本中所有 `wlo1` 为实际网卡名。
   ```bash
   ip link show | grep -E "^[0-9]+: w"
   ```

- **IP 地址冲突**：确保 `192.168.2.100` 没有被网络中其他设备占用。

- **防火墙**：如果虚拟机无法访问外网，检查宿主机防火墙是否放行。



# Windows 虚拟机（win11）- TAP 网络配置方案

## 概述

为 Windows 虚拟机（名称：`win11`）配置 TAP 设备，使其与 Ubuntu 宿主机处于同一网段（`192.168.2.0/24`），并实现访问外网。



## 网络拓扑

```
宿主机 (Ubuntu)
    IP: 192.168.2.x (无线网卡 wlo1)
    └── tap-vm1 (192.168.2.101) → Windows 虚拟机 (win11)
```



## Ubuntu 宿主机配置

### 1. 创建 TAP 设备配置脚本

```bash
sudo nano /usr/local/sbin/vm-tap-setup-win
```

```bash
#!/bin/sh
set -eu

PATH=/usr/sbin:/usr/bin:/sbin:/bin

# 创建 TAP 设备，归属 libvirt-qemu 用户
if ! ip link show dev tap-vm1 >/dev/null 2>&1; then
    ip tuntap add dev tap-vm1 mode tap user libvirt-qemu
fi

# 启用 TAP 设备并添加路由
ip link set dev tap-vm1 up
ip route replace 192.168.2.101/32 dev tap-vm1

# 内核参数调优
sysctl -w net.ipv4.ip_forward=1
sysctl -w net.ipv4.conf.wlo1.proxy_arp=1
sysctl -w net.ipv4.conf.tap-vm1.proxy_arp=1
sysctl -w net.ipv4.conf.wlo1.rp_filter=2
sysctl -w net.ipv4.conf.tap-vm1.rp_filter=2

# iptables 转发规则
iptables -w -C FORWARD -i tap-vm1 -o wlo1 -j ACCEPT 2>/dev/null || \
    iptables -w -I FORWARD 1 -i tap-vm1 -o wlo1 -j ACCEPT

iptables -w -C FORWARD -i wlo1 -o tap-vm1 -j ACCEPT 2>/dev/null || \
    iptables -w -I FORWARD 1 -i wlo1 -o tap-vm1 -j ACCEPT
```

赋予执行权限：

```bash
sudo chmod +x /usr/local/sbin/vm-tap-setup-win
```



### 2. 创建 Systemd 服务（开机自启）

```bash
sudo nano /etc/systemd/system/vm-tap-win.service
```

```ini
[Unit]
Description=Routed TAP interface for Windows virtual machine
Wants=network-online.target
After=network-online.target
Before=libvirtd.service virtqemud.service

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/vm-tap-setup-win
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
```

启用并启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable vm-tap-win.service
sudo systemctl start vm-tap-win.service
```

验证服务状态：

```bash
sudo systemctl status vm-tap-win.service
ip link show tap-vm1
```

---

### 3. Windows 虚拟机 XML 配置

编辑虚拟机配置，修改虚拟网络接口：

```xml
<interface type="ethernet">
  <mac address="52:52:00:11:2d:6f"/>
  <target dev="tap-vm1" managed="no"/>
  <model type="e1000e"/>
  <address type="pci" domain="0x0000" bus="0x01" slot="0x00" function="0x0"/>
</interface>
```

> **网卡模型选择**：
> - `e1000e`：推荐，Windows 自带驱动，无需额外安装


启动虚拟机



### 4. Windows 虚拟机内部 IP 配置


1. 按 `Win + R`，输入 `ncpa.cpl`，回车
2. 右键点击网卡 → **属性**
3. 双击 **Internet 协议版本 4 (TCP/IPv4)**
4. 选择 **使用下面的 IP 地址**，填写：

   | 项目 | 值 |
   |------|-----|
   | IP 地址 | `192.168.2.101` |
   | 子网掩码 | `255.255.255.0` |
   | 默认网关 | `192.168.2.1` |
   | 首选 DNS | `8.8.8.8` |
   | 备用 DNS | `114.114.114.114` |





### 5. 连通性验证

#### 在 Windows 虚拟机内部（CMD）

```cmd
# 查看 IP 配置
ipconfig

# 测试连通性
ping 192.168.2.1      # 网关/宿主机
ping 192.168.2.100    # Linux 虚拟机
ping 8.8.8.8          # 外网
ping google.com       # DNS 解析测试
```

#### 在宿主机上

```bash
# 查看 TAP 设备
ip link show tap-vm1

# 查看路由
ip route | grep 192.168.2.101

# ping Windows 虚拟机
ping 192.168.2.101
```


###  注意事项

- **网卡名称**：Windows 中网卡名可能是"以太网"、"Ethernet"或"本地连接"，请根据实际情况替换命令中的网卡名。

- **无线网卡名称**：宿主机脚本中使用 `wlo1`，如果您的网卡名不同（如 `wlan0`），请修改脚本中所有 `wlo1` 为实际网卡名。

- **IP 地址冲突**：确保 `192.168.2.101` 没有被网络中其他设备占用。

- **virtio 驱动**：如果使用 `virtio` 网卡模型，Windows 需要安装驱动。使用 `e1000e` 可避免此问题。

- **防火墙**：Windows 防火墙可能会阻止 ICMP（ping），测试时可临时关闭防火墙进行排查。



