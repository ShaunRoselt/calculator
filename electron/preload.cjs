const { contextBridge, ipcRenderer } = require('electron');
const nerdamer = require('../assets/vendor/nerdamer/all.min.js');

contextBridge.exposeInMainWorld('nerdamer', nerdamer);
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