import { useState, useEffect } from "react";
import { getChats } from "../api/electronApi.js";

/**
 * Custom hook to asynchronously load the chat list from the IPC backend.
 * Handles loading, error, and unmount safety states.
 * 
 * @returns {{ chats: Array<Object>, loading: boolean, error: Error|null }}
 */
export function useChats() {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    getChats()
      .then((result) => {
        if (isMounted) {
          setChats(result || []);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { chats, loading, error };
}