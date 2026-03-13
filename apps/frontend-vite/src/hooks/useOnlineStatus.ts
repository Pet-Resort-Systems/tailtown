/**
 * Online Status Hook
 * Detects network connectivity and provides offline handling utilities
 */

import { useState, useEffect, useCallback } from "react";

export interface OnlineStatus {
  isOnline: boolean;
  wasOffline: boolean;
  lastOnline: Date | null;
  checkConnection: () => Promise<boolean>;
}

export interface PendingAction {
  id: string;
  type: string;
  data: any;
  timestamp: Date;
  retryCount: number;
}

const PENDING_ACTIONS_KEY = "tailtown_pending_actions";

/**
 * Hook to monitor online/offline status
 */
export const useOnlineStatus = (): OnlineStatus => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const [lastOnline, setLastOnline] = useState<Date | null>(
    navigator.onLine ? new Date() : null
  );

  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch("/api/health", {
        method: "HEAD",
        cache: "no-store",
      });
      return response.ok;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastOnline(new Date());
      if (wasOffline) {
        // Connection restored - could trigger sync here
        console.log("Connection restored");
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      console.warn("Connection lost");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [wasOffline]);

  return { isOnline, wasOffline, lastOnline, checkConnection };
};

/**
 * Queue an action to be retried when back online
 */
export const queuePendingAction = (
  action: Omit<PendingAction, "id" | "timestamp" | "retryCount">
) => {
  const pending = getPendingActions();
  const newAction: PendingAction = {
    ...action,
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    retryCount: 0,
  };
  pending.push(newAction);
  localStorage.setItem(PENDING_ACTIONS_KEY, JSON.stringify(pending));
  return newAction;
};

/**
 * Get all pending actions
 */
export const getPendingActions = (): PendingAction[] => {
  try {
    const stored = localStorage.getItem(PENDING_ACTIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

/**
 * Remove a pending action after successful completion
 */
export const removePendingAction = (actionId: string) => {
  const pending = getPendingActions().filter((a) => a.id !== actionId);
  localStorage.setItem(PENDING_ACTIONS_KEY, JSON.stringify(pending));
};

/**
 * Clear all pending actions
 */
export const clearPendingActions = () => {
  localStorage.removeItem(PENDING_ACTIONS_KEY);
};

export default useOnlineStatus;
