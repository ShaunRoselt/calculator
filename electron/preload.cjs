const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('appWindow', {
	getFullscreen: () => ipcRenderer.invoke('app:get-fullscreen'),
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
