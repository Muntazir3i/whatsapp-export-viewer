import { useState } from "react";
import { useEffect } from "react";
import { getChats } from "../api/electronApi.js";

export function useChats() {
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const chats = getChats();
        chats.then((result) => {
            setChats(result)
        }).catch((err) => {
            setError(err)
        }).finally(()=>{
            setLoading(false)
        })
    }, [])

    return {chats:chats, loading:loading, error:error}
}