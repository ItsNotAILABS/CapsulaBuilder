/**
 * GoogleSignIn — official "Sign in with Google" button, swapping to an
 * avatar chip with sign-out once the session is live.
 *
 * Uses Google Identity Services (button flow, no OAuth scopes — we only
 * need to know who you are). The ID token is verified server-side;
 * nothing client-claimed is trusted. Hides quietly when
 * VITE_GOOGLE_CLIENT_ID is unset so the terminal still works.
 */
import React, { useEffect, useRef } from "react";
import { useGoogleUser } from "./GoogleAuth.jsx";
import { api } from "./api.js";

const GIS_SRC = "https://accounts.google.com/gsi/client";

export function GoogleSignIn() {
  const { user, loading, refresh, signOut } = useGoogleUser();
  const buttonRef = useRef(null);
  const clientId = import.meta.env?.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (user || !clientId || !buttonRef.current) return;
    let cancelled = false;

    const init = () => {
      if (cancelled || !window.google?.accounts?.id || !buttonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (resp) => {
          try {
            await api("/api/auth/google", {
              method: "POST",
              credentials: "include",
              body: JSON.stringify({ credential: resp.credential }),
            });
            await refresh();
          } catch {
            /* keep the button up; the user can retry */
          }
        },
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        shape: "pill",
        text: "signin_with",
        width: 200,
      });
    };

    if (window.google?.accounts?.id) {
      init();
    } else {
      const script = document.createElement("script");
      script.src = GIS_SRC;
      script.async = true;
      script.defer = true;
      script.onload = init;
      document.head.appendChild(script);
    }
    return () => {
      cancelled = true;
    };
  }, [user, clientId, refresh]);

  if (!clientId) return null;
  if (loading) return <span style={{ width: 40, height: 32, display: "inline-block" }} />;

  if (user) {
    return (
      <span
        className="gchip"
        title={user.email || user.name}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "3px 10px 3px 3px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,.14)",
          background: "rgba(255,255,255,.05)",
        }}
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name}
            width={26}
            height={26}
            style={{ borderRadius: "50%" }}
            referrerPolicy="no-referrer"
          />
        ) : (
          <span
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: "#1a73e8",
              color: "#fff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 13,
            }}
          >
            {(user.name || "?").charAt(0).toUpperCase()}
          </span>
        )}
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            maxWidth: 100,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {(user.name || "").split(" ")[0]}
        </span>
        <button
          type="button"
          onClick={() => signOut()}
          className="ghost"
          style={{ padding: "2px 6px", fontSize: 11 }}
          title="Sign out"
        >
          ✕
        </button>
      </span>
    );
  }

  return <span ref={buttonRef} style={{ display: "inline-flex" }} />;
}
