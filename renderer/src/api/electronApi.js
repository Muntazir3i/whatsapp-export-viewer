export function getChats(){
    return window.api.getChats();
}

export function getMessages(chatId){
    return window.api.getMessages(chatId)
}

export function deleteChat(chatId){
    return window.api.deleteChat(chatId)
}