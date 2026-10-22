#!/usr/bin/env node

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

const anonymous = await rpc("tools/list", {}, null);
check(anonymous.status === 401, "Avviser forespørsel uten token", `HTTP ${anonymous.status}`);
check(
  (anonymous.headers.get("www-authenticate") ?? "").includes("resource_metadata="),
  "Sender WWW-Authenticate med resource_metadata",
);

const wrong = await rpc("tools/list", {}, "feil-token");
check(wrong.status === 401, "Avviser feil token", `HTTP ${wrong.status}`);

const prm = await fetch(`${origin}/.well-known/oauth-protected-resource`).then((r) => r.json());
check(prm.resource === url, "Protected resource metadata", prm.resource);
const asMeta = await fetch(`${origin}/.well-known/oauth-authorization-server`).then((r) => r.json());
check(
  asMeta.issuer === origin && asMeta.code_challenge_methods_supported?.includes("S256"),
  "Authorization server metadata",
  asMeta.issuer,
);

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
  "get_merch_page",
  "update_merch_page",
  "add_merch_product",
  "update_merch_product",
  "remove_merch_product",
  "upload_merch_product_image",
  "get_surprise_ideas",
  "add_surprise_ideas",
  "update_surprise_idea",
  "remove_surprise_idea",
  "update_surprise_page",
];
check(
  expected.every((name) => tools.some((tool) => tool.name === name)),
  `Alle ${expected.length} verktøy finnes`,
  tools.map((tool) => tool.name).join(", "),
);
const readOnly = tools
  .filter((tool) => tool.annotations?.readOnlyHint)
  .map((tool) => tool.name)
  .sort();
check(
  readOnly.join() ===
    ["get_activity", "get_merch_page", "get_surprise_ideas", "list_activities"].join(),
  "Bare lese-verktøyene er merket read-only",
  readOnly.join(", "),
);

const upcoming = await callTool("list_activities", {});
check(!upcoming.isError, "list_activities", upcoming.isError ? upcoming.text : `${upcoming.data?.count} kommende`);

const invalid = await callTool("create_activity", {
  title: "Test",
  date: "23.10.2026",
  location: "Oslo",
  shortDescription: "Test",
});
check(invalid.isError && /ÅÅÅÅ-MM-DD/.test(invalid.text), "Feil datoformat gir norsk feilmelding");

const merch = await callTool("get_merch_page", {});
check(!merch.isError, "get_merch_page", merch.isError ? merch.text : `${merch.data?.products?.length ?? 0} produkter`);

const badShop = await callTool("update_merch_page", { shopUrl: "http://butikk.no" });
check(badShop.isError && /https:\/\//.test(badShop.text), "Butikklenke uten https gir norsk feilmelding");

const surprise = await callTool("get_surprise_ideas", {});
check(!surprise.isError, "get_surprise_ideas", surprise.isError ? surprise.text : `${surprise.data?.ideas?.length ?? 0} ideer`);

const longIdea = await callTool("add_surprise_ideas", { ideas: [{ title: "x".repeat(41) }] });
check(longIdea.isError && /maks 40 tegn/.test(longIdea.text), "For lang idé gir norsk feilmelding");

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

  const productName = `MCP-test ${Date.now()}`;
  const added = await callTool("add_merch_product", {
    name: productName,
    price: "1 kr",
    soldOut: true,
    position: "last",
  });
  check(!added.isError, "add_merch_product", added.isError ? added.text : added.data?.key);
  const key = added.data?.key;

  if (key) {
    const changed = await callTool("update_merch_product", {
      product: key,
      price: "2 kr",
      moveTo: "first",
    });
    check(!changed.isError, "update_merch_product (pris og flytting)", changed.isError ? changed.text : "");

    const page = await callTool("get_merch_page", {});
    const first = page.data?.products?.[0];
    check(first?.key === key && first?.price === "2 kr", "get_merch_page viser endringen først i listen");

    const removed = await callTool("remove_merch_product", {
      product: key,
      confirm: true,
      confirmName: productName,
    });
    check(!removed.isError, "remove_merch_product", removed.isError ? removed.text : "");
  }

  const ideaTitle = `MCP-test ${Date.now()}`.slice(0, 40);
  const ideas = await callTool("add_surprise_ideas", {
    ideas: [{ title: ideaTitle, note: "Automatisk test." }, { title: ideaTitle }],
  });
  check(
    !ideas.isError && ideas.data?.added?.length === 1 && ideas.data?.skippedAsDuplicates?.length === 1,
    "add_surprise_ideas (hopper over dublett)",
    ideas.isError ? ideas.text : "",
  );
  const ideaKey = ideas.data?.added?.[0]?.key;

  if (ideaKey) {
    const changed = await callTool("update_surprise_idea", { idea: ideaKey, note: "Endret." });
    check(!changed.isError, "update_surprise_idea", changed.isError ? changed.text : "");

    const removed = await callTool("remove_surprise_idea", {
      idea: ideaKey,
      confirm: true,
      confirmTitle: ideaTitle,
    });
    check(!removed.isError, "remove_surprise_idea", removed.isError ? removed.text : "");
  }
}

console.log(failures ? `\n${failures} sjekk(er) feilet.` : "\nAlt OK.");
process.exit(failures ? 1 : 0);
