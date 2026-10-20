import { getAccessSecret, mcpEndpoints, publicOrigin } from "@/lib/mcp/config";
import { clientIp, readParams } from "@/lib/mcp/http";
import {
  isAllowedRedirectUri,
  issueCode,
  readClient,
  safeEqual,
  type RegisteredClient,
} from "@/lib/mcp/oauth";
import { rateLimit } from "@/lib/mcp/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOGIN_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

type AuthorizeRequest = {
  client: RegisteredClient;
  redirectUri: string;
  codeChallenge: string;
  state?: string;
  audience: string;
  issuer: string;
};

type Parsed =
  | { kind: "ok"; request: AuthorizeRequest }
  | { kind: "page"; message: string }
  | { kind: "redirect"; response: Response };

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

function redirectTo(
  redirectUri: string,
  issuer: string,
  state: string | undefined,
  values: Record<string, string>,
): Response {
  const url = new URL(redirectUri);
  for (const [key, value] of Object.entries(values)) url.searchParams.set(key, value);
  if (state) url.searchParams.set("state", state);
  url.searchParams.set("iss", issuer);
  return new Response(null, {
    status: 303,
    headers: { Location: url.toString(), "Cache-Control": "no-store" },
  });
}

function parse(request: Request, params: Record<string, string>, secret: string): Parsed {
  const endpoints = mcpEndpoints(publicOrigin(request));

  const client = params.client_id ? readClient(secret, params.client_id) : null;
  if (!client) {
    return { kind: "page", message: "Ukjent klient. Fjern tilkoblingen i ChatGPT og legg den til på nytt." };
  }

  const redirectUri =
    params.redirect_uri ||
    (client.redirectUris.length === 1 ? client.redirectUris[0] : "");
  if (!client.redirectUris.includes(redirectUri) || !isAllowedRedirectUri(redirectUri)) {
    return { kind: "page", message: "Ugyldig redirect-adresse." };
  }

  const state = params.state?.slice(0, 2000) || undefined;
  const fail = (error: string, description: string): Parsed => ({
    kind: "redirect",
    response: redirectTo(redirectUri, endpoints.issuer, state, {
      error,
      error_description: description,
    }),
  });

  if (params.response_type !== "code") {
    return fail("unsupported_response_type", "Bare response_type=code støttes.");
  }
  if (!params.code_challenge || params.code_challenge_method !== "S256") {
    return fail("invalid_request", "PKCE med S256 er påkrevd.");
  }
  if (!/^[A-Za-z0-9_-]{43,128}$/.test(params.code_challenge)) {
    return fail("invalid_request", "code_challenge har feil format.");
  }
  if (params.resource && params.resource.replace(/\/$/, "") !== endpoints.resource) {
    return fail("invalid_target", "Ukjent resource.");
  }

  return {
    kind: "ok",
    request: {
      client,
      redirectUri,
      codeChallenge: params.code_challenge,
      state,
      audience: endpoints.resource,
      issuer: endpoints.issuer,
    },
  };
}

function page(
  body: string,
  status: number,
  formTarget?: string,
): Response {
  const formAction = ["'self'", formTarget ? new URL(formTarget).origin : ""]
    .filter(Boolean)
    .join(" ");

  const html = `<!doctype html>
<html lang="nb">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Koble til Sober Oslo</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 16px;
    background: #f6f3ec; color: #16191a; font: 16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { width: 100%; max-width: 420px; background: #fffcf5; border-radius: 16px; padding: 32px 28px;
    box-shadow: 0 1px 2px rgba(0,0,0,.06), 0 8px 24px rgba(0,0,0,.06); }
  h1 { font-size: 1.5rem; line-height: 1.2; margin: 0 0 8px; color: #14624a; }
  p { margin: 0 0 16px; color: #5d6460; }
  label { display: block; font-weight: 600; margin: 20px 0 6px; }
  input[type=password] { width: 100%; padding: 12px 14px; font: inherit; border: 1px solid #c9ccc6;
    border-radius: 10px; background: #fff; }
  input[type=password]:focus { outline: 3px solid #14624a; outline-offset: 1px; }
  .actions { display: flex; gap: 12px; margin-top: 20px; }
  button { flex: 1; padding: 12px 16px; font: inherit; font-weight: 600; border-radius: 999px; cursor: pointer;
    border: 1px solid #14624a; }
  .primary { background: #14624a; color: #fff; }
  .secondary { background: transparent; color: #14624a; }
  .error { background: #fde8e2; color: #8a2a12; padding: 10px 14px; border-radius: 10px; margin-bottom: 16px; }
  .small { font-size: .875rem; }
</style>
</head>
<body><main>${body}</main></body>
</html>`;

  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy": [
        "default-src 'none'",
        "style-src 'unsafe-inline'",
        `form-action ${formAction}`,
        "frame-ancestors 'none'",
        "base-uri 'none'",
      ].join("; "),
    },
  });
}

function errorPage(message: string, status = 400): Response {
  return page(`<h1>Kan ikke koble til</h1><p>${escapeHtml(message)}</p>`, status);
}

function loginForm(
  params: Record<string, string>,
  request: AuthorizeRequest,
  error?: string,
  status = 200,
): Response {
  const keep = [
    "response_type",
    "client_id",
    "redirect_uri",
    "code_challenge",
    "code_challenge_method",
    "state",
    "scope",
    "resource",
  ];
  const hidden = keep
    .filter((key) => params[key])
    .map(
      (key) =>
        `<input type="hidden" name="${key}" value="${escapeHtml(params[key])}">`,
    )
    .join("");

  const destination = new URL(request.redirectUri).host;

  return page(
    `<h1>Koble ${escapeHtml(request.client.name)} til Sober Oslo</h1>
<p>${escapeHtml(request.client.name)} ber om tilgang til å vise, opprette og endre aktiviteter på nettsiden.</p>
${error ? `<p class="error" role="alert">${escapeHtml(error)}</p>` : ""}
<form method="post" action="/api/oauth/authorize">
${hidden}
<label for="password">Styrets passord for tilkoblingen</label>
<input id="password" name="password" type="password" autocomplete="current-password" required autofocus>
<div class="actions">
<button class="secondary" type="submit" name="action" value="deny" formnovalidate>Avbryt</button>
<button class="primary" type="submit" name="action" value="allow">Gi tilgang</button>
</div>
</form>
<p class="small" style="margin-top:20px">Du sendes tilbake til ${escapeHtml(destination)}.</p>`,
    status,
    request.redirectUri,
  );
}

export async function GET(request: Request): Promise<Response> {
  const secret = getAccessSecret();
  if (!secret) return errorPage("Tilkoblingen er ikke satt opp på serveren.", 503);

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = parse(request, params, secret);
  if (parsed.kind === "page") return errorPage(parsed.message);
  if (parsed.kind === "redirect") return parsed.response;

  return loginForm(params, parsed.request);
}

export async function POST(request: Request): Promise<Response> {
  const secret = getAccessSecret();
  if (!secret) return errorPage("Tilkoblingen er ikke satt opp på serveren.", 503);

  const params = await readParams(request);
  const parsed = parse(request, params, secret);
  if (parsed.kind === "page") return errorPage(parsed.message);
  if (parsed.kind === "redirect") return parsed.response;

  const { client, redirectUri, codeChallenge, state, audience, issuer } = parsed.request;

  if (params.action === "deny") {
    return redirectTo(redirectUri, issuer, state, {
      error: "access_denied",
      error_description: "Tilgang ble avslått.",
    });
  }

  const ip = clientIp(request);
  const limit = rateLimit(`oauth-login:${ip}`, LOGIN_ATTEMPTS, LOGIN_WINDOW_MS);
  if (!limit.ok) {
    return loginForm(
      params,
      parsed.request,
      `For mange forsøk. Vent ${Math.ceil(limit.retryAfter / 60)} minutter og prøv igjen.`,
      429,
    );
  }

  if (!safeEqual(params.password ?? "", secret)) {
    console.warn(
      `[mcp-audit] ${JSON.stringify({ at: new Date().toISOString(), event: "login_failed", client: client.name })}`,
    );
    return loginForm(params, parsed.request, "Feil passord.", 401);
  }

  console.info(
    `[mcp-audit] ${JSON.stringify({ at: new Date().toISOString(), event: "login_ok", client: client.name })}`,
  );
  const code = issueCode(secret, client, redirectUri, codeChallenge, audience);
  return redirectTo(redirectUri, issuer, state, { code });
}
