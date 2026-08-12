const { contextBridge, ipcRenderer } = require("electron");
// import { contextBridge, ipcRenderer } from "electron";


contextBridge.exposeInMainWorld("api",{
    getChats:() => ipcRenderer.invoke("get-chats")
})