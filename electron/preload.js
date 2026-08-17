const { contextBridge, ipcRenderer } = require("electron");
// import { contextBridge, ipcRenderer } from "electron";


contextBridge.exposeInMainWorld("api",{
    getChats:() => ipcRenderer.invoke("get-chats"),
    getMessages:(chatId) => ipcRenderer.invoke("get-messages", chatId),
    deleteChat:(chatId) => ipcRenderer.invoke("delete-chat", chatId)
})