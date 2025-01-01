const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('ipcAPI', {
    on: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(event, ...args)),
    send: (channel, ...args) => ipcRenderer.send(channel, ...args),
    sendSync: (channel, ...args) => ipcRenderer.sendSync(channel, ...args),
    invoke: async (channel, ...args) => {
        return await ipcRenderer.invoke(channel, ...args);
    },
});