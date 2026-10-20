import "server-only";

import {
  createHash,
  createHmac,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import type { Actor } from "./audit";
import { extraRedirectUris, OAUTH_SCOPE } from "./config";

const PREFIX = "so1";

export const CODE_TTL_SECONDS = 5 * 60;
export const ACCESS_TTL_SECONDS = 8 * 60 * 60;
export const REFRESH_TTL_SECONDS = 60 * 24 * 60 * 60;

export type ClientAuthMethod = "none" | "client_secret_post" | "client_secret_basic";

type ClientPayload = {
  typ: "client";
  n: string;
  r: string[];
  m: ClientAuthMethod;
  iat: number;
};

type CodePayload = {
  typ: "code";
  cid: string;
  cn: string;
  r: string;
  cc: string;
  aud: string;
  scope: string;
  exp: number;
  jti: string;
};

type TokenPayload = {
  typ: "access" | "refresh";
  cid: string;
  cn: string;
  aud: string;
  scope: string;
  iat: number;
  exp: number;
  jti: string;
};

type Payload = ClientPayload | CodePayload | TokenPayload;

const nowSeconds = () => Math.floor(Date.now() / 1000);

function signingKey(secret: string): Buffer {
  return Buffer.from(
    hkdfSync("sha256", secret, "sober-oslo-mcp", "oauth-signing-v1", 32),
  );
}

function mac(secret: string, data: string): string {
  return createHmac("sha256", signingKey(secret)).update(data).digest("base64url");
}

function sign(payload: Payload, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${PREFIX}.${body}.${mac(secret, `${PREFIX}.${body}`)}`;
}

function verify<T extends Payload>(
  token: string,
  typ: T["typ"],
  secret: string,
): T | null {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== PREFIX) return null;

  const [, body, signature] = parts;
  if (!safeEqual(signature, mac(secret, `${PREFIX}.${body}`))) return null;

  let payload: Payload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Payload;
  } catch {
    return null;
  }

  if (payload.typ !== typ) return null;
  if ("exp" in payload && payload.exp <= nowSeconds()) return null;
  return payload as T;
}

export function safeEqual(a: string, b: string): boolean {
  const left = createHash("sha256").update(a).digest();
  const right = createHash("sha256").update(b).digest();
  return timingSafeEqual(left, right);
}

export function fingerprint(value: string): string {
  return createHash("sha256").update(value).digest("base64url").slice(0, 16);
}

const randomId = () => randomBytes(16).toString("base64url");

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function isAllowedRedirectUri(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.username || url.password || url.hash) return false;
  if (extraRedirectUris().includes(value)) return true;

  if (
    url.protocol === "https:" &&
    (url.hostname === "chatgpt.com" || url.hostname === "chat.openai.com") &&
    url.port === "" &&
    url.pathname.startsWith("/connector")
  ) {
    return true;
  }

  return url.protocol === "http:" && LOOPBACK_HOSTS.has(url.hostname);
}

export type RegisteredClient = {
  clientId: string;
  name: string;
  redirectUris: string[];
  authMethod: ClientAuthMethod;
  issuedAt: number;
};

export function registerClient(
  secret: string,
  name: string,
  redirectUris: string[],
  authMethod: ClientAuthMethod,
): RegisteredClient & { clientSecret?: string } {
  const issuedAt = nowSeconds();
  const clientId = sign(
    { typ: "client", n: name, r: redirectUris, m: authMethod, iat: issuedAt },
    secret,
  );

  return {
    clientId,
    name,
    redirectUris,
    authMethod,
    issuedAt,
    clientSecret: authMethod === "none" ? undefined : clientSecretFor(secret, clientId),
  };
}

export function readClient(secret: string, clientId: string): RegisteredClient | null {
  const payload = verify<ClientPayload>(clientId, "client", secret);
  if (!payload) return null;
  return {
    clientId,
    name: payload.n,
    redirectUris: payload.r,
    authMethod: payload.m,
    issuedAt: payload.iat,
  };
}

function clientSecretFor(secret: string, clientId: string): string {
  return mac(secret, `client-secret:${clientId}`);
}

export function isValidClientSecret(
  secret: string,
  clientId: string,
  provided: string | undefined,
): boolean {
  return !!provided && safeEqual(provided, clientSecretFor(secret, clientId));
}

const usedCodes = new Map<string, number>();

export function issueCode(
  secret: string,
  client: RegisteredClient,
  redirectUri: string,
  codeChallenge: string,
  audience: string,
): string {
  return sign(
    {
      typ: "code",
      cid: fingerprint(client.clientId),
      cn: client.name,
      r: redirectUri,
      cc: codeChallenge,
      aud: audience,
      scope: OAUTH_SCOPE,
      exp: nowSeconds() + CODE_TTL_SECONDS,
      jti: randomId(),
    },
    secret,
  );
}

export type CodeCheck =
  | { ok: true; payload: CodePayload }
  | { ok: false; description: string };

export function redeemCode(
  secret: string,
  code: string,
  clientId: string,
  redirectUri: string,
  codeVerifier: string,
): CodeCheck {
  const payload = verify<CodePayload>(code, "code", secret);
  if (!payload) return { ok: false, description: "Koden er ugyldig eller utløpt." };

  const now = nowSeconds();
  for (const [jti, exp] of usedCodes) if (exp <= now) usedCodes.delete(jti);
  if (usedCodes.has(payload.jti)) {
    return { ok: false, description: "Koden er allerede brukt." };
  }

  if (payload.cid !== fingerprint(clientId)) {
    return { ok: false, description: "Koden tilhører en annen klient." };
  }
  if (payload.r !== redirectUri) {
    return { ok: false, description: "redirect_uri stemmer ikke med autorisasjonen." };
  }
  if (!/^[A-Za-z0-9._~-]{43,128}$/.test(codeVerifier)) {
    return { ok: false, description: "code_verifier mangler eller har feil format." };
  }

  const challenge = createHash("sha256").update(codeVerifier).digest("base64url");
  if (!safeEqual(challenge, payload.cc)) {
    return { ok: false, description: "PKCE-kontrollen feilet." };
  }

  usedCodes.set(payload.jti, payload.exp);
  return { ok: true, payload };
}

export type TokenSet = {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
  scope: string;
};

export function issueTokens(
  secret: string,
  clientFingerprint: string,
  clientName: string,
  audience: string,
): TokenSet {
  const iat = nowSeconds();
  const base = { cid: clientFingerprint, cn: clientName, aud: audience, scope: OAUTH_SCOPE, iat };

  return {
    access_token: sign(
      { typ: "access", ...base, exp: iat + ACCESS_TTL_SECONDS, jti: randomId() },
      secret,
    ),
    token_type: "Bearer",
    expires_in: ACCESS_TTL_SECONDS,
    refresh_token: sign(
      { typ: "refresh", ...base, exp: iat + REFRESH_TTL_SECONDS, jti: randomId() },
      secret,
    ),
    scope: OAUTH_SCOPE,
  };
}

export function readRefreshToken(secret: string, token: string): TokenPayload | null {
  return verify<TokenPayload>(token, "refresh", secret);
}

export function authenticateBearer(
  secret: string,
  authorization: string | null,
  audience: string,
): Actor | null {
  const match = authorization?.match(/^Bearer\s+(\S+)$/i);
  if (!match) return null;
  const token = match[1];

  if (safeEqual(token, secret)) {
    return { name: "MCP_ACCESS_TOKEN", key: "direct" };
  }

  const payload = verify<TokenPayload>(token, "access", secret);
  if (!payload || payload.aud !== audience || payload.scope !== OAUTH_SCOPE) {
    return null;
  }
  return { name: payload.cn, key: payload.cid };
}
