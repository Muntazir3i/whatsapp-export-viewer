import { useState } from "react";
import { useEffect } from "react";
import { getMessages } from "../api/electronApi.js";

export function useMessages(chatId) {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!chatId) {
            setLoading(false)
            return;
        }

        setLoading(true)
        setMessages([])
        setError(null)
        
        const message = getMessages(chatId);
        

        message.then((result) => {
            setMessages(result)
        }).catch((err) => {
            setError(err)
        }).finally(() => {
            setLoading(false)
        });
    }, [chatId])

    return { messages: messages, loading: loading, error: error }

}