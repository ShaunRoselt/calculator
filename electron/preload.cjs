const { contextBridge } = require('electron');
const nerdamer = require('../assets/vendor/nerdamer/all.min.js');

contextBridge.exposeInMainWorld('nerdamer', nerdamer);