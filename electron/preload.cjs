const { contextBridge } = require('electron');
const nerdamer = require('nerdamer/all.min.js');

contextBridge.exposeInMainWorld('nerdamer', nerdamer);