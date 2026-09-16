import { useState, useEffect, useCallback } from "react";
import { getChats } from "../api/electronApi.js";

/**
 * Custom hook to asynchronously load the chat list from the IPC backend.
 * Handles loading, error, unmount safety, and manual refetch capabilities for list updates.
 * 
 * @returns {{ chats: Array<Object>, loading: boolean, error: Error|null, refetch: Function }}
 */
export function useChats() {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refetchIndex, setRefetchIndex] = useState(0);

  /**
   * Triggers a state update to re-run the chat list fetch effect.
   */
  const refetch = useCallback(() => {
    setRefetchIndex((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;

    getChats()
      .then((result) => {
        if (isMounted) {
          setChats(result || []);
          setError(null);
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
  }, [refetchIndex]);

  return { chats, loading, error, refetch };
}