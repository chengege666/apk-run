'use strict';
'require view';
'require rpc';
'require ui';
'require poll';

// ====================== 纯JSON国际化 · 中英双语 ======================
const RUN_LANG = (function () {
	try {
		const m = document.cookie.match(/luci_lang=([a-zA-Z-]+)/);
		if (m) return m[1].substring(0, 2).toLowerCase();
		if (window.L && L.env && L.env.lang)
			return L.env.lang.substring(0, 2).toLowerCase();
		return 'zh';
	} catch (e) {
		return 'zh';
	}
})();

const I18N = {
	zh: {
		title: "Run安装工具",
		desc: "在路由器上上传并执行 makeself 生成的 .run 安装包。",
		drop_tip: "拖入一个 makeself .run 文件，或从电脑选择。",
		choose_file: "选择文件",
		execute: "执行安装",
		clean_up: "清理",
		upload_title: "上传 .run 安装包",
		log_title: "执行日志",
		clean_done: "临时文件与日志已清理。",
		only_run: "仅支持 .run 文件。",
		prepare_upload: "准备上传：%s (%s)",
		upload_failed: "上传失败。",
		uploading: "正在上传 %s：%d%%",
		upload_err: "上传请求失败。",
		upload_invalid: "上传返回格式无效。",
		upload_done: "上传完成：%s (%s)",
		starting: "正在启动安装器...",
		started: "安装器已启动，PID %d。",
		running: "安装器正在运行。",
		last_file: "上一次安装包：%s",
		status_idle: "就绪",
		status_running: "运行中",
		status_uploading: "上传中"
	},
	en: {
		title: "Run Install Tool",
		desc: "Upload and execute a makeself-generated .run package on this router.",
		drop_tip: "Drop a makeself .run file here, or choose one from your computer.",
		choose_file: "Choose File",
		execute: "Execute",
		clean_up: "Clean Up",
		upload_title: "Upload .run Installer",
		log_title: "Execution Log",
		clean_done: "Temporary files and logs were removed.",
		only_run: "Only .run files are accepted.",
		prepare_upload: "Preparing upload: %s (%s)",
		upload_failed: "Upload failed.",
		uploading: "Uploading %s: %d%%",
		upload_err: "Upload request failed.",
		upload_invalid: "Invalid upload response.",
		upload_done: "Upload complete: %s (%s)",
		starting: "Starting installer...",
		started: "Installer started, PID %d.",
		running: "Installer is running.",
		last_file: "Last installer: %s",
		status_idle: "Ready",
		status_running: "Running",
		status_uploading: "Uploading"
	}
};

function _(key) {
	const str = I18N[RUN_LANG]?.[key] || I18N.zh[key] || key;
	return str.format.apply(str, Array.prototype.slice.call(arguments, 1));
}
// ====================================================================

var uploadStart = rpc.declare({
	object: 'luci-app-run',
	method: 'upload_start',
	params: ['filename', 'size']
});

var uploadChunk = rpc.declare({
	object: 'luci-app-run',
	method: 'upload_chunk',
	params: ['id', 'data', 'index']
});

var uploadFinish = rpc.declare({
	object: 'luci-app-run',
	method: 'upload_finish',
	params: ['id']
});

var runInstaller = rpc.declare({
	object: 'luci-app-run',
	method: 'run',
	params: ['id']
});

var getStatus = rpc.declare({
	object: 'luci-app-run',
	method: 'status'
});

var readLog = rpc.declare({
	object: 'luci-app-run',
	method: 'read_log',
	params: ['offset']
});

var cleanup = rpc.declare({
	object: 'luci-app-run',
	method: 'cleanup'
});

function formatBytes(size) {
	if (size >= 1024 * 1024)
		return '%.1f MiB'.format(size / 1024 / 1024);
	if (size >= 1024)
		return '%.1f KiB'.format(size / 1024);
	return '%d B'.format(size);
}

function bufferToBase64(buffer) {
	var bytes = new Uint8Array(buffer);
	var parts = [];
	var chunk = 0x8000;
	for (var i = 0; i < bytes.length; i += chunk)
		parts.push(String.fromCharCode.apply(null, bytes.subarray(i, i + chunk)));
	return btoa(parts.join(''));
}

// =================== 内联样式 ===================
var STYLE_ID = 'luci-app-run-style';
(function injectStyle() {
	if (document.getElementById(STYLE_ID)) return;
	var css = document.createElement('style');
	css.id = STYLE_ID;
	css.textContent = [
		/* 卡片通用 */
		'.run-card {',
		'  background: var(--card-bg, #fff);',
		'  border-radius: 10px;',
		'  box-shadow: 0 1px 6px rgba(0,0,0,.08), 0 1px 3px rgba(0,0,0,.05);',
		'  padding: 24px 28px;',
		'  margin-bottom: 20px;',
		'  border: 1px solid var(--border-color, #e0e0e0);',
		'}',
		/* 上传区域 */
		'.run-dropzone {',
		'  border: 2px dashed var(--border-color-soft, #c0c0c0);',
		'  border-radius: 12px;',
		'  padding: 40px 20px;',
		'  text-align: center;',
		'  cursor: pointer;',
		'  transition: all .25s ease;',
		'  background: var(--dropzone-bg, #fafafa);',
		'  position: relative;',
		'}',
		'.run-dropzone:hover {',
		'  border-color: var(--primary, #1976d2);',
		'  background: var(--dropzone-hover-bg, #f0f7ff);',
		'}',
		'.run-dropzone.dragover {',
		'  border-style: solid;',
		'  border-color: var(--primary, #1976d2);',
		'  background: var(--dropzone-active-bg, #e3f2fd);',
		'  box-shadow: 0 0 0 4px rgba(25,118,210,.12);',
		'}',
		'.run-dropzone-icon {',
		'  font-size: 48px;',
		'  line-height: 1;',
		'  margin-bottom: 12px;',
		'  opacity: .6;',
		'}',
		'.run-dropzone-title {',
		'  font-size: 16px;',
		'  font-weight: 600;',
		'  margin-bottom: 6px;',
		'  color: var(--text-primary, #333);',
		'}',
		/* 状态标签 */
		'.run-badge {',
		'  display: inline-block;',
		'  padding: 3px 12px;',
		'  border-radius: 12px;',
		'  font-size: 12px;',
		'  font-weight: 600;',
		'  text-transform: uppercase;',
		'  letter-spacing: .3px;',
		'}',
		'.run-badge-idle {',
		'  background: #e8e8e8;',
		'  color: #666;',
		'}',
		'.run-badge-uploading {',
		'  background: #fff3e0;',
		'  color: #e65100;',
		'}',
		'.run-badge-running {',
		'  background: #e8f5e9;',
		'  color: #2e7d32;',
		'}',
		/* 进度条 */
		'.run-progress {',
		'  width: 100%;',
		'  height: 8px;',
		'  background: var(--progress-track, #e0e0e0);',
		'  border-radius: 4px;',
		'  overflow: hidden;',
		'  margin-top: 16px;',
		'  display: none;',
		'}',
		'.run-progress-bar {',
		'  height: 100%;',
		'  width: 0%;',
		'  background: linear-gradient(90deg, #42a5f5, #1976d2);',
		'  border-radius: 4px;',
		'  transition: width .3s ease;',
		'}',
		'.run-progress-text {',
		'  font-size: 12px;',
		'  color: var(--text-secondary, #888);',
		'  margin-top: 4px;',
		'  text-align: right;',
		'}',
		/* 按钮组 */
		'.run-actions {',
		'  margin-top: 20px;',
		'  display: flex;',
		'  gap: 12px;',
		'  justify-content: center;',
		'  flex-wrap: wrap;',
		'}',
		'.run-btn {',
		'  display: inline-flex;',
		'  align-items: center;',
		'  gap: 6px;',
		'  padding: 10px 28px;',
		'  border-radius: 8px;',
		'  font-size: 14px;',
		'  font-weight: 600;',
		'  border: none;',
		'  cursor: pointer;',
		'  transition: all .2s ease;',
		'  text-decoration: none;',
		'  line-height: 1.4;',
		'}',
		'.run-btn:disabled {',
		'  opacity: .45;',
		'  cursor: not-allowed;',
		'  transform: none !important;',
		'  box-shadow: none !important;',
		'}',
		'.run-btn-primary {',
		'  background: var(--primary, #1976d2);',
		'  color: #fff;',
		'  box-shadow: 0 2px 6px rgba(25,118,210,.25);',
		'}',
		'.run-btn-primary:not(:disabled):hover {',
		'  background: #1565c0;',
		'  transform: translateY(-1px);',
		'  box-shadow: 0 4px 12px rgba(25,118,210,.35);',
		'}',
		'.run-btn-primary:not(:disabled):active {',
		'  transform: translateY(0);',
		'}',
		'.run-btn-secondary {',
		'  background: var(--btn-secondary-bg, #f5f5f5);',
		'  color: var(--text-primary, #333);',
		'  border: 1px solid var(--border-color, #ddd);',
		'}',
		'.run-btn-secondary:not(:disabled):hover {',
		'  background: #eeeeee;',
		'  border-color: #ccc;',
		'}',
		'.run-btn-danger {',
		'  background: transparent;',
		'  color: var(--text-secondary, #888);',
		'  border: 1px solid var(--border-color, #ddd);',
		'}',
		'.run-btn-danger:not(:disabled):hover {',
		'  color: #d32f2f;',
		'  border-color: #e57373;',
		'  background: #fff5f5;',
		'}',
		/* 日志终端 */
		'.run-terminal {',
		'  background: #1a1d23;',
		'  border-radius: 8px;',
		'  padding: 16px 20px;',
		'  min-height: 200px;',
		'  max-height: 400px;',
		'  overflow: auto;',
		'  font-family: "Cascadia Code", "Fira Code", "JetBrains Mono", Consolas, monospace;',
		'  font-size: 13px;',
		'  line-height: 1.6;',
		'  color: #a8d4a8;',
		'  white-space: pre-wrap;',
		'  word-break: break-all;',
		'  scrollbar-width: thin;',
		'  scrollbar-color: #3a3d45 transparent;',
		'  margin-top: 12px;',
		'  border: 1px solid #2a2d33;',
		'}',
		'.run-terminal::-webkit-scrollbar {',
		'  width: 6px;',
		'  height: 6px;',
		'}',
		'.run-terminal::-webkit-scrollbar-track {',
		'  background: transparent;',
		'}',
		'.run-terminal::-webkit-scrollbar-thumb {',
		'  background: #3a3d45;',
		'  border-radius: 3px;',
		'}',
		'.run-terminal::-webkit-scrollbar-thumb:hover {',
		'  background: #4a4d55;',
		'}',
		/* 文件信息 */
		'.run-fileinfo {',
		'  font-size: 13px;',
		'  color: var(--text-secondary, #888);',
		'  margin-top: 12px;',
		'  padding: 8px 12px;',
		'  background: var(--infobar-bg, #f5f7fa);',
		'  border-radius: 6px;',
		'  display: none;',
		'}',
		/* 暗色主题适配 */
		'.dark .run-card,',
		'.dark-mode .run-card {',
		'  background: var(--card-bg-dark, #2a2d33);',
		'  border-color: var(--border-color-dark, #3a3d45);',
		'}',
		'.dark .run-dropzone {',
		'  background: var(--dropzone-bg-dark, #23262b);',
		'  border-color: var(--border-color-dark, #3a3d45);',
		'}',
		'.dark .run-dropzone:hover,',
		'.dark-mode .run-dropzone.dragover {',
		'  background: rgba(25,118,210,.1);',
		'}',
		'.dark .run-btn-secondary {',
		'  background: #33363d;',
		'  border-color: #4a4d55;',
		'  color: #ddd;',
		'}',
		'.dark .run-btn-danger {',
		'  background: transparent;',
		'  border-color: #4a4d55;',
		'  color: #aaa;',
		'}',
		'.dark .run-fileinfo {',
		'  background: #23262b;',
		'}',
		'.dark .run-badge-idle {',
		'  background: #3a3d45;',
		'  color: #aaa;',
		'}'
	].join('\n');
	document.head.appendChild(css);
})();
// =================================================

return view.extend({
	// ====================== 底部按钮正确隐藏 ======================
	handleSave: null,
	handleReset: null,
	handleSaveApply: null,

	logOffset: 0,
	currentUploadId: null,

	load: function () {
		return getStatus().catch(function () {
			return {};
		});
	},

	render: function (status) {
		var self = this;

		// ---------- 文件输入 ----------
		var fileInput = E('input', {
			'type': 'file',
			accept: '.run,application/x-sh,application/octet-stream',
			style: 'display:none'
		});

		// ---------- 进度条 ----------
		var progressBar = E('div', { 'class': 'run-progress-bar' });
		var progressText = E('div', { 'class': 'run-progress-text' });
		var progressWrap = E('div', { 'class': 'run-progress' }, [progressBar, progressText]);

		// ---------- 状态标签 ----------
		var badge = E('span', { 'class': 'run-badge run-badge-idle' }, [_('status_idle')]);

		// ---------- 文件信息 ----------
		var fileInfo = E('div', { 'class': 'run-fileinfo' });

		// ---------- 状态描述（提示文字） ----------
		var state = E('div', {
			'class': 'run-dropzone-title',
			style: 'font-weight:400;font-size:14px;color:var(--text-secondary,#888)'
		}, [_('drop_tip')]);

		// ---------- 日志终端 ----------
		var log = E('pre', { 'class': 'run-terminal' }, ['']);

		// ---------- 按钮 ----------
		var pickButton = E('button', {
			class: 'run-btn run-btn-secondary',
			click: function (ev) {
				ev.preventDefault();
				fileInput.click();
			}
		}, ['📁 ', _('choose_file')]);

		var runButton = E('button', {
			class: 'run-btn run-btn-primary',
			disabled: true,
			click: function (ev) {
				ev.preventDefault();
				self.startRun(runButton, state, badge);
			}
		}, ['▶ ', _('execute')]);

		var cleanButton = E('button', {
			class: 'run-btn run-btn-danger',
			click: function (ev) {
				ev.preventDefault();
				cleanup().then(function (res) {
					if (res && res.error)
						throw new Error(res.error);
					self.currentUploadId = null;
					self.logOffset = 0;
					runButton.disabled = true;
					log.textContent = '';
					progressWrap.style.display = 'none';
					fileInfo.style.display = 'none';
					badge.className = 'run-badge run-badge-idle';
					badge.textContent = _('status_idle');
					state.textContent = _('drop_tip');
				}).catch(function (err) {
					ui.addNotification(null, E('p', [err.message || err]), 'danger');
				});
			}
		}, ['🗑 ', _('clean_up')]);

		// ---------- 拖拽区域 ----------
		var dropIcon = E('div', { 'class': 'run-dropzone-icon' }, ['📦']);
		var dropTitle = E('div', { 'class': 'run-dropzone-title' }, [_('upload_title')]);

		var dropzone = E('div', {
			class: 'run-dropzone',
			dragover: function (ev) {
				ev.preventDefault();
				dropzone.classList.add('dragover');
			},
			dragleave: function () {
				dropzone.classList.remove('dragover');
			},
			drop: function (ev) {
				ev.preventDefault();
				dropzone.classList.remove('dragover');
				if (ev.dataTransfer.files && ev.dataTransfer.files.length)
					self.uploadFile(ev.dataTransfer.files[0], progressWrap, progressBar, progressText, state, runButton, badge, fileInfo);
			}
		}, [dropIcon, dropTitle, state]);

		// ---------- 上传卡片 ----------
		var uploadCard = E('div', { 'class': 'run-card' }, [
			E('div', { style: 'display:flex;align-items:center;justify-content:space-between;margin-bottom:16px' }, [
				E('div', { style: 'font-size:16px;font-weight:600' }, [_('upload_title')]),
				badge
			]),
			dropzone,
			fileInfo,
			progressWrap,
			E('div', { 'class': 'run-actions' }, [
				pickButton,
				runButton,
				cleanButton
			]),
			fileInput
		]);

		// ---------- 日志卡片 ----------
		var logCard = E('div', { 'class': 'run-card' }, [
			E('div', { style: 'font-size:16px;font-weight:600;margin-bottom:4px' }, [_('log_title')]),
			log
		]);

		// ---------- 文件选择事件 ----------
		fileInput.addEventListener('change', function () {
			if (fileInput.files && fileInput.files.length)
				self.uploadFile(fileInput.files[0], progressWrap, progressBar, progressText, state, runButton, badge, fileInfo);
		});

		// ---------- 日志轮询 ----------
		poll.add(function () {
			return self.refreshLog(log, state, badge);
		}, 1);

		// ---------- 恢复状态 ----------
		this.applyStatus(status, state, badge, runButton);

		// ---------- 返回页面 ----------
		return E('div', { class: 'cbi-map', style: 'max-width:900px;margin:0 auto' }, [
			E('h2', { style: 'font-size:22px;margin-bottom:4px' }, [_('title')]),
			E('div', { class: 'cbi-map-descr', style: 'margin-bottom:20px;color:var(--text-secondary,#888)' }, [_('desc')]),
			uploadCard,
			logCard
		]);
	},

	applyStatus: function (status, state, badge, runButton) {
		if (!status)
			return;
		if (status.running) {
			state.textContent = _('running');
			badge.className = 'run-badge run-badge-running';
			badge.textContent = _('status_running');
			if (runButton) runButton.disabled = true;
		} else if (status.file) {
			state.textContent = _('last_file', status.file);
		}
	},

	uploadFile: function (file, progressWrap, progressBar, progressText, state, runButton, badge, fileInfo) {
		var self = this;
		if (!file.name.match(/\.run$/i)) {
			ui.addNotification(null, E('p', [_('only_run')]), 'danger');
			return Promise.reject();
		}

		progressWrap.style.display = '';
		progressBar.style.width = '0%';
		progressText.textContent = '0%';
		runButton.disabled = true;
		badge.className = 'run-badge run-badge-uploading';
		badge.textContent = _('status_uploading');

		// 显示文件信息
		fileInfo.style.display = 'block';
		fileInfo.innerHTML = '📄 ' + file.name + ' &nbsp;·&nbsp; ' + formatBytes(file.size);

		state.textContent = _('prepare_upload', file.name, formatBytes(file.size));

		return uploadStart(file.name, file.size).then(function (res) {
			if (res && res.error)
				throw new Error(res.error);
			self.currentUploadId = res.id;
			return self.uploadFileFast(res, file, progressWrap, progressBar, progressText, state, runButton, badge);
		}).catch(function (err) {
			progressWrap.style.display = 'none';
			badge.className = 'run-badge run-badge-idle';
			badge.textContent = _('status_idle');
			state.textContent = _('upload_failed');
			ui.addNotification(null, E('p', [err.message || err]), 'danger');
		});
	},

	uploadFileFast: function (session, file, progressWrap, progressBar, progressText, state, runButton, badge) {
		var self = this;

		var url = '/cgi-bin/luci-app-run-upload?id=' +
			encodeURIComponent(session.id) + '&token=' + encodeURIComponent(session.token);

		return new Promise(function (resolve, reject) {
			var xhr = new XMLHttpRequest();
			xhr.open('POST', url, true);
			xhr.setRequestHeader('Content-Type', 'application/octet-stream');

			xhr.upload.onprogress = function (ev) {
				if (!ev.lengthComputable)
					return;
				var pct = Math.floor(ev.loaded * 100 / ev.total);
				progressBar.style.width = pct + '%';
				progressText.textContent = pct + '%';
				state.textContent = _('uploading', file.name, pct);
			};

			xhr.onerror = function () {
				document.querySelector('.run-btn-primary').disabled = false;
				reject(new Error(_('upload_err')));
			};

			xhr.onload = function () {
				document.querySelector('.run-btn-primary').disabled = false;
				progressBar.style.width = '100%';
				progressText.textContent = '100%';

				try { JSON.parse(xhr.responseText); } catch (e) { }

				uploadFinish(session.id).then(function () {
					state.textContent = _('upload_done', file.name, formatBytes(file.size));
				}).catch(function () {
					state.textContent = _('upload_done', file.name, formatBytes(file.size));
				});
				badge.className = 'run-badge run-badge-idle';
				badge.textContent = _('status_idle');
				resolve();
			};

			xhr.send(file);
		});
	},

	startRun: function (runButton, state, badge) {
		var self = this;
		if (!this.currentUploadId)
			return;

		runButton.disabled = true;
		badge.className = 'run-badge run-badge-running';
		badge.textContent = _('status_running');
		state.textContent = _('starting');

		return runInstaller(this.currentUploadId).then(function (res) {
			if (res && res.error)
				throw new Error(res.error);
			self.logOffset = 0;
			state.textContent = _('started', res.pid);
		}).catch(function (err) {
			runButton.disabled = false;
			badge.className = 'run-badge run-badge-idle';
			badge.textContent = _('status_idle');
			ui.addNotification(null, E('p', [err.message || err]), 'danger');
		});
	},

	refreshLog: function (log, state, badge) {
		var self = this;
		return readLog(this.logOffset).then(function (res) {
			if (!res || res.error)
				return;
			if (res.data) {
				log.textContent += res.data;
				log.scrollTop = log.scrollHeight;
			}
			self.logOffset = res.offset || self.logOffset;
			if (res.running) {
				state.textContent = _('running');
				if (badge) {
					badge.className = 'run-badge run-badge-running';
					badge.textContent = _('status_running');
				}
			}
		}).catch(function () { });
	}
});
