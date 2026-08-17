import { ipcMain } from "electron";

export function registerChatHandlers(chatService){
    ipcMain.handle("get-chats",()=>{
        return chatService.getChats();
    })

    ipcMain.handle("get-messages",(_ , chatId)=>{
        return chatService.getMessages(chatId);
    })

    ipcMain.handle("delete-chat", (_, chat_id)=>{
        return chatService.deleteChat(chat_id)
    })
}