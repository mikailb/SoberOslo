#!/usr/bin/env node
/**
 * Quick check of the ChatGPT connection before it is added in ChatGPT.
 *
 *   MCP_ACCESS_TOKEN=... npm run mcp:test                 read-only checks
 *   MCP_ACCESS_TOKEN=... npm run mcp:test -- --write      also creates, edits,
 *                                                          hides and deletes a
 *                                                          hidden test activity
 *
 * MCP_URL defaults to http://localhost:3000/api/mcp. Point it at the live site
 * to check a deployment: MCP_URL=https://soberoslo.no/api/mcp
 */

const url = process.env.MCP_URL ?? "http://localhost:3000/api/mcp";
const token = process.env.MCP_ACCESS_TOKEN;
const write = process.argv.includes("--write");

if (!token) {
  console.error("Sett MCP_ACCESS_TOKEN i miljøet først.");
  process.exit(1);
}

let failures = 0;
const check = (ok, label, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
};

let nextId = 1;
async function rpc(method, params, auth = token) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "MCP-Protocol-Version": "2025-06-18",
      ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: nextId++, method, params }),
  });
  const text = await response.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: response.status, headers: response.headers, body };
}

async function callTool(name, args) {
  const { body } = await rpc("tools/call", { name, arguments: args });
  const result = body?.result ?? {};
  const text = result.content?.[0]?.text ?? JSON.stringify(body);
  return { isError: !!result.isError, text, data: result.structuredContent };
}

const origin = new URL(url).origin;

// 1. Without a token the endpoint must refuse and point at the OAuth metadata.
const anonymous = await rpc("tools/list", {}, null);
check(anonymous.status === 401, "Avviser forespørsel uten token", `HTTP ${anonymous.status}`);
check(
  (anonymous.headers.get("www-authenticate") ?? "").includes("resource_metadata="),
  "Sender WWW-Authenticate med resource_metadata",
);

const wrong = await rpc("tools/list", {}, "feil-token");
check(wrong.status === 401, "Avviser feil token", `HTTP ${wrong.status}`);

// 2. OAuth discovery documents.
const prm = await fetch(`${origin}/.well-known/oauth-protected-resource`).then((r) => r.json());
check(prm.resource === url, "Protected resource metadata", prm.resource);
const asMeta = await fetch(`${origin}/.well-known/oauth-authorization-server`).then((r) => r.json());
check(
  asMeta.issuer === origin && asMeta.code_challenge_methods_supported?.includes("S256"),
  "Authorization server metadata",
  asMeta.issuer,
);

// 3. MCP handshake and tool list.
const init = await rpc("initialize", {
  protocolVersion: "2025-06-18",
  capabilities: {},
  clientInfo: { name: "mcp-smoke-test", version: "1.0.0" },
});
check(init.status === 200 && !!init.body?.result?.serverInfo, "initialize", init.body?.result?.serverInfo?.name);

const list = await rpc("tools/list", {});
const tools = list.body?.result?.tools ?? [];
const expected = [
  "list_activities",
  "get_activity",
  "create_activity",
  "update_activity",
  "set_activity_visibility",
  "delete_activity",
  "upload_activity_image",
];
check(
  expected.every((name) => tools.some((tool) => tool.name === name)),
  "Alle sju verktøy finnes",
  tools.map((tool) => tool.name).join(", "),
);
const readOnly = tools.filter((tool) => tool.annotations?.readOnlyHint).map((tool) => tool.name);
check(
  readOnly.length === 2 && readOnly.includes("list_activities") && readOnly.includes("get_activity"),
  "Bare lese-verktøyene er merket read-only",
);

// 4. A read and a validation error.
const upcoming = await callTool("list_activities", {});
check(!upcoming.isError, "list_activities", upcoming.isError ? upcoming.text : `${upcoming.data?.count} kommende`);

const invalid = await callTool("create_activity", {
  title: "Test",
  date: "23.10.2026",
  location: "Oslo",
  shortDescription: "Test",
});
check(invalid.isError && /ÅÅÅÅ-MM-DD/.test(invalid.text), "Feil datoformat gir norsk feilmelding");

// 5. Optional full write cycle on a hidden activity.
if (write) {
  const title = `MCP-test ${new Date().toISOString().slice(0, 19)}`;
  const created = await callTool("create_activity", {
    title,
    date: "2099-12-31",
    startTime: "18:00",
    endTime: "20:00",
    location: "Testveien 1",
    shortDescription: "Automatisk test. Kan slettes.",
    description: "Første avsnitt med **fet** tekst.\n\n- punkt én\n- punkt to",
    isPublished: false,
  });
  check(!created.isError, "create_activity (skjult)", created.isError ? created.text : created.data?.slug);
  const id = created.data?.id;

  if (id) {
    const updated = await callTool("update_activity", { activity: id, price: "Gratis" });
    check(!updated.isError, "update_activity", updated.isError ? updated.text : "");

    const fetched = await callTool("get_activity", { activity: id });
    check(fetched.data?.activity?.price === "Gratis", "get_activity viser endringen");

    const hidden = await callTool("set_activity_visibility", { activity: id, isPublished: false });
    check(!hidden.isError, "set_activity_visibility", hidden.isError ? hidden.text : "");

    const refused = await callTool("delete_activity", {
      activity: id,
      confirm: true,
      confirmTitle: "feil tittel",
    });
    check(refused.isError, "delete_activity avviser feil tittel");

    const deleted = await callTool("delete_activity", { activity: id, confirm: true, confirmTitle: title });
    check(!deleted.isError, "delete_activity", deleted.isError ? deleted.text : "");
  }
}

console.log(failures ? `\n${failures} sjekk(er) feilet.` : "\nAlt OK.");
process.exit(failures ? 1 : 0);
