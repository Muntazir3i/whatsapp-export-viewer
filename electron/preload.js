const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
    getVersion: () => ipcRenderer.invoke("get-app-version")
});

contextBridge.exposeInIsolatedWorld("api",{
    getChats:() => ipcRenderer.invoke("get-chats")
})