/**
 * Google sign-in state for the MonadBuilder+ web terminal.
 *
 * useGoogleUser() -> { user, loading, refresh, signOut }
 * The user object comes only from the server-verified session cookie
 * (GET /api/auth/me), never from client claims.
 */
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "./api.js";

const Ctx = createContext({
  user: null,
  loading: true,
  refresh: async () => {},
  signOut: async () => {},
});

export function GoogleAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api("/api/auth/me", { credentials: "include" });
      setUser(data?.authenticated && data.user ? data.user : null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    try {
      await api("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      /* cookie may already be gone; still drop local state */
    }
    setUser(null);
  }, []);

  return <Ctx.Provider value={{ user, loading, refresh, signOut }}>{children}</Ctx.Provider>;
}

export function useGoogleUser() {
  return useContext(Ctx);
}
