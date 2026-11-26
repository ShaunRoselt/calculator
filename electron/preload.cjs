const { contextBridge, ipcRenderer, webFrame } = require('electron');

let displayScale = 1;
let zoomPercent = 100;
let resolutionQuery;

function applyZoom() {
	const factor = zoomPercent / 100 / displayScale;
	if (Math.abs(webFrame.getZoomFactor() - factor) > 0.001) {
		webFrame.setZoomFactor(factor);
	}
}

function watchDisplayScale() {
	resolutionQuery?.removeEventListener('change', watchDisplayScale);

	// Chromium's DPR includes page zoom. The Wayland screen API can report an
	// integer scale even when this surface is rendered at a fractional scale.
	const currentScale = window.devicePixelRatio / webFrame.getZoomFactor();
	const nextScale = Math.max(0.25, Math.min(1, Math.round(currentScale * 1000) / 1000));
	if (nextScale !== displayScale) {
		displayScale = nextScale;
		ipcRenderer.send('app:display-scale', displayScale);
		applyZoom();
	}

	const dpr = window.devicePixelRatio;
	resolutionQuery = window.matchMedia(`(min-resolution: ${dpr - 0.001}dppx) and (max-resolution: ${dpr + 0.001}dppx)`);
	resolutionQuery.addEventListener('change', watchDisplayScale);
}

if (process.platform === 'linux') {
	watchDisplayScale();
}

contextBridge.exposeInMainWorld('appWindow', {
	setZoomPercent: (percent) => {
		if (Number.isInteger(percent) && percent >= 50 && percent <= 200) {
			zoomPercent = percent;
			applyZoom();
		}
	},
	getFullscreen: () => ipcRenderer.invoke('app:get-fullscreen'),
	showGamepadKeyboard: (mode, bounds) => ipcRenderer.invoke('app:show-gamepad-keyboard', mode, bounds),
	setFullscreen: (enabled) => ipcRenderer.invoke('app:set-fullscreen', enabled),
	onFullscreenChanged: (listener) => {
		if (typeof listener !== 'function') {
			return () => undefined;
		}

		const wrappedListener = (_event, enabled) => listener(Boolean(enabled));
		ipcRenderer.on('app:fullscreen-changed', wrappedListener);
		return () => ipcRenderer.removeListener('app:fullscreen-changed', wrappedListener);
	}
});
contextBridge.exposeInMainWorld('settingsFile', {
	load: () => ipcRenderer.invoke('settings-file:load'),
	save: (settings) => ipcRenderer.invoke('settings-file:save', settings),
	flush: () => ipcRenderer.invoke('settings-file:flush'),
	getPath: () => ipcRenderer.invoke('settings-file:get-path')
});
