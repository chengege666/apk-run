include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-run
PKG_VERSION:=1.0.0
PKG_RELEASE:=3

LUCI_TITLE:=LuCI support for running makeself .run installers
LUCI_DESCRIPTION:=Upload and execute makeself-generated .run installers from LuCI.
LUCI_DEPENDS:=+luci-base +rpcd +libubox
LUCI_PKGARCH:=all


include $(TOPDIR)/feeds/luci/luci.mk

define Package/$(PKG_NAME)/install
	$(INSTALL_DIR) $(1)/usr/libexec/rpcd
	$(INSTALL_DIR) $(1)/www/cgi-bin
	$(INSTALL_DIR) $(1)/usr/share/luci/menu.d
	$(INSTALL_DIR) $(1)/usr/share/rpcd/acl.d
	$(INSTALL_DIR) $(1)/www/luci-static/resources/view/run
	$(INSTALL_BIN) ./root/usr/libexec/rpcd/luci-app-run $(1)/usr/libexec/rpcd/
	$(INSTALL_BIN) ./root/www/cgi-bin/luci-app-run-upload $(1)/www/cgi-bin/
	$(INSTALL_DATA) ./root/usr/share/luci/menu.d/luci-app-run.json $(1)/usr/share/luci/menu.d/
	$(INSTALL_DATA) ./root/usr/share/rpcd/acl.d/luci-app-run.json $(1)/usr/share/rpcd/acl.d/
	$(INSTALL_DATA) ./htdocs/luci-static/resources/view/run/index.js $(1)/www/luci-static/resources/view/run/
endef

# call BuildPackage - OpenWrt buildroot signature
