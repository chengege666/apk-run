# luci-app-run

> **自用** — 自己用的，不保证任何事。

上传 `.run` 文件并在 OpenWrt 上执行。只处理 `.run`，别的不接。

## 干啥的

- 拖个 `.run` 文件上去
- 点执行跑起来
- 看日志输出
- 用完点清理

大文件走独立 CGI 上传，不用 base64 分包，快一点。

## 编译

丢进 OpenWrt SDK 的 package 目录，编译就行。

```
mkdir -p package/luci-app-run
cp -a /path/to/luci-app-run/* package/luci-app-run/
./scripts/feeds update -a
./scripts/feeds install -a
make package/luci-app-run/compile V=s
```

## 安装

### 25.12.x

先跑解锁脚本，再去系统→软件包 上传 apk：

```
bash <(curl -sL https://lj.1231818.xyz/kg)
```

### 21.x ~ 24.10

系统→软件包 上传 ipk 直接装。

## 限制

- 只认 `.run`
- 最大 256 MiB
- 一次只能跑一个
- 文件放 `/tmp/`，重启就没了
