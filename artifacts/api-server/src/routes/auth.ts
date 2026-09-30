/**
 * GitHub OAuth — Sign in with GitHub inside MonadBuilder+.
 *
 * Setup a GitHub OAuth App:
 *   Homepage URL: https://monados.medinatechlabs.net
 *   Callback URL: https://monados.medinatechlabs.net/api/auth/github/callback
 *
 * Configure GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, APP_BASE_URL, and
 * SESSION_SECRET through the active deployment secret store. Production is
 * Cloudflare-first; no Replit secret dependency is assumed.
 */
import { Router, Request, Response } from "express";
import { createPublicKey, createVerify } from "node:crypto";

const router = Router();

/** Google ID-token verification with zero new dependencies. */
const GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs";
let certCache: { keys: Array<Record<string, unknown>>; fetchedAt: number } | null = null;

async function googlePublicKeys(): Promise<Array<Record<string, unknown>>> {
  if (certCache && Date.now() - certCache.fetchedAt < 6 * 60 * 60 * 1000) return certCache.keys;
  const res = await fetch(GOOGLE_CERTS_URL);
  if (!res.ok) throw new Error("Failed to fetch Google certs");
  const data = (await res.json()) as { keys?: Array<Record<string, unknown>> };
  certCache = { keys: data.keys ?? [], fetchedAt: Date.now() };
  return certCache.keys;
}

function b64urlToBuffer(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

type GooglePayload = { sub?: string; email?: string; name?: string; picture?: string };

async function verifyGoogleToken(idToken: string, clientId: string): Promise<GooglePayload> {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Malformed token");
  const header = JSON.parse(b64urlToBuffer(parts[0]).toString("utf8")) as { alg?: string; kid?: string };
  if (header.alg !== "RS256" || !header.kid) throw new Error("Unexpected token algorithm");

  const keys = await googlePublicKeys();
  const jwk = keys.find((k) => k["kid"] === header.kid);
  if (!jwk) throw new Error("Unknown signing key");

  const publicKey = createPublicKey({ key: jwk as never, format: "jwk" });
  const ok = createVerify("RSA-SHA256")
    .update(`${parts[0]}.${parts[1]}`)
    .verify(publicKey, b64urlToBuffer(parts[2]));
  if (!ok) throw new Error("Bad signature");

  const payload = JSON.parse(b64urlToBuffer(parts[1]).toString("utf8")) as GooglePayload & {
    iss?: string;
    aud?: string;
    exp?: number;
  };
  const issOk = payload.iss === "https://accounts.google.com" || payload.iss === "accounts.google.com";
  if (!issOk || payload.aud !== clientId) throw new Error("Issuer/audience mismatch");
  if (!payload.exp || payload.exp * 1000 < Date.now()) throw new Error("Token expired");
  return payload;
}

const GITHUB_CLIENT_ID = process.env["GITHUB_CLIENT_ID"] ?? "";
const GITHUB_CLIENT_SECRET = process.env["GITHUB_CLIENT_SECRET"] ?? process.env["GITHUB_CLIENT_SECRETS"] ?? "";
const APP_BASE_URL = process.env["APP_BASE_URL"] ?? "https://monados.medinatechlabs.net";
const GITHUB_REDIRECT_URI = `${APP_BASE_URL}/api/auth/github/callback`;

type GitHubUser = {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  email: string | null;
};

type GitHubEmail = {
  email?: string;
  primary?: boolean;
};

declare module "express-session" {
  interface SessionData {
    user?: {
      id: number | string;
      login: string;
      name: string;
      avatarUrl: string;
      email: string | null;
      provider: "github" | "google";
    };
    oauthState?: string;
  }
}

function randomState() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

router.get("/github", (req: Request, res: Response): void => {
  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    res.status(503).json({
      error: "GitHub OAuth not configured",
      required: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET", "SESSION_SECRET"],
    });
    return;
  }

  const state = randomState();
  req.session.oauthState = state;

  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: GITHUB_REDIRECT_URI,
    scope: "read:user user:email",
    state,
  });

  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

router.get("/github/callback", async (req: Request, res: Response): Promise<void> => {
  const { code, state } = req.query as { code?: string; state?: string };

  if (!code) {
    res.redirect(`${APP_BASE_URL}/?auth=error&reason=no_code`);
    return;
  }

  if (!state || state !== req.session.oauthState) {
    res.redirect(`${APP_BASE_URL}/?auth=error&reason=state_mismatch`);
    return;
  }

  delete req.session.oauthState;

  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: GITHUB_REDIRECT_URI,
      }),
    });
    const tokenData = (await tokenRes.json()) as {
      access_token?: string;
      error?: string;
    };

    if (!tokenRes.ok || tokenData.error || !tokenData.access_token) {
      res.redirect(`${APP_BASE_URL}/?auth=error&reason=token_exchange`);
      return;
    }

    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "User-Agent": "MonadBuilder+",
      },
    });
    if (!userRes.ok) {
      res.redirect(`${APP_BASE_URL}/?auth=error&reason=user_fetch`);
      return;
    }
    const ghUser = (await userRes.json()) as GitHubUser;

    let email = ghUser.email;
    if (!email) {
      try {
        const emailRes = await fetch("https://api.github.com/user/emails", {
          headers: { Authorization: `Bearer ${tokenData.access_token}`, "User-Agent": "MonadBuilder+" },
        });
        if (emailRes.ok) {
          const emailPayload: unknown = await emailRes.json();
          const emails = Array.isArray(emailPayload) ? (emailPayload as GitHubEmail[]) : [];
          email = emails.find((entry) => entry.primary)?.email ?? null;
        }
      } catch {
        email = null;
      }
    }

    req.session.user = {
      id: ghUser.id,
      login: ghUser.login,
      name: ghUser.name ?? ghUser.login,
      avatarUrl: ghUser.avatar_url,
      email,
      provider: "github" as const,
    };

    res.redirect(`${APP_BASE_URL}/dashboard?auth=success&user=${encodeURIComponent(ghUser.login)}`);
  } catch {
    res.redirect(`${APP_BASE_URL}/?auth=error&reason=server`);
  }
});

const GOOGLE_CLIENT_ID = process.env["GOOGLE_CLIENT_ID"] ?? "";

/**
 * POST /auth/google — exchange a Google ID token (from the "Sign in with
 * Google" button) for an app session. The token is verified directly
 * against Google's public keys; profile fields come only from the
 * verified token, never from client claims.
 * Body: { credential: "<Google ID token>" }
 */
router.post("/google", async (req: Request, res: Response): Promise<void> => {
  if (!GOOGLE_CLIENT_ID) {
    res.status(503).json({
      error: "Google sign-in not configured",
      required: ["GOOGLE_CLIENT_ID"],
    });
    return;
  }

  const credential = (req.body as { credential?: unknown } | undefined)?.credential;
  if (!credential || typeof credential !== "string") {
    res.status(400).json({ error: "Missing credential" });
    return;
  }

  try {
    const payload = await verifyGoogleToken(credential, GOOGLE_CLIENT_ID);
    if (!payload.sub || !payload.email) {
      res.status(401).json({ error: "Google token is missing required claims" });
      return;
    }

    const user = {
      id: payload.sub,
      login: String(payload.email),
      name: String(payload.name ?? payload.email),
      avatarUrl: payload.picture ? String(payload.picture) : "",
      email: String(payload.email),
      provider: "google" as const,
    };
    req.session.user = user;
    req.session.save(() => {
      res.json({ ok: true, user });
    });
  } catch {
    res.status(401).json({ error: "Google token verification failed" });
  }
});

router.get("/me", (req: Request, res: Response): void => {
  const user = req.session.user;
  if (!user) {
    res.status(401).json({ authenticated: false });
    return;
  }
  res.json({ authenticated: true, user });
});

router.post("/logout", (req: Request, res: Response): void => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

export { router as authRouter };
