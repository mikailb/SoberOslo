import "server-only";

import { randomBytes } from "node:crypto";

import { safeLinkHref } from "@/lib/urls";

type Span = { _type: "span"; _key: string; text: string; marks: string[] };
type LinkDef = { _type: "link"; _key: string; href: string };

export type TextBlock = {
  _type: "block";
  _key: string;
  style: "normal" | "h3" | "blockquote";
  markDefs: LinkDef[];
  children: Span[];
  listItem?: "bullet" | "number";
  level?: number;
};

export const newKey = () => randomBytes(6).toString("hex");

const INLINE_PATTERN = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)|\*(?!\s)(.+?)\*/g;

function parseInline(text: string): Pick<TextBlock, "markDefs" | "children"> {
  const markDefs: LinkDef[] = [];
  const children: Span[] = [];
  const push = (value: string, marks: string[] = []) => {
    if (value) children.push({ _type: "span", _key: newKey(), text: value, marks });
  };

  let last = 0;
  for (const match of text.matchAll(INLINE_PATTERN)) {
    push(text.slice(last, match.index));
    const [, bold, linkText, linkHref, italic] = match;

    if (bold !== undefined) push(bold, ["strong"]);
    else if (italic !== undefined) push(italic, ["em"]);
    else {
      const href = safeLinkHref(linkHref);
      if (href && !href.startsWith("/")) {
        const key = newKey();
        markDefs.push({ _type: "link", _key: key, href });
        push(linkText, [key]);
      } else {
        push(linkText);
      }
    }
    last = (match.index ?? 0) + match[0].length;
  }
  push(text.slice(last));

  if (children.length === 0) push(" ");
  return { markDefs, children };
}

function block(
  text: string,
  style: TextBlock["style"] = "normal",
  listItem?: TextBlock["listItem"],
): TextBlock {
  return {
    _type: "block",
    _key: newKey(),
    style,
    ...parseInline(text),
    ...(listItem ? { listItem, level: 1 } : {}),
  };
}

export function textToBlocks(text: string): TextBlock[] {
  const blocks: TextBlock[] = [];
  let paragraph: string[] = [];

  const flush = () => {
    if (paragraph.length) blocks.push(block(paragraph.join("\n")));
    paragraph = [];
  };

  for (const rawLine of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = rawLine.trim();
    let match: RegExpMatchArray | null;

    if (!line) {
      flush();
    } else if ((match = line.match(/^[-*•]\s+(.*)$/))) {
      flush();
      blocks.push(block(match[1], "normal", "bullet"));
    } else if ((match = line.match(/^\d+[.)]\s+(.*)$/))) {
      flush();
      blocks.push(block(match[1], "normal", "number"));
    } else if ((match = line.match(/^#{1,6}\s+(.*)$/))) {
      flush();
      blocks.push(block(match[1], "h3"));
    } else if ((match = line.match(/^>\s?(.*)$/))) {
      flush();
      blocks.push(block(match[1], "blockquote"));
    } else {
      paragraph.push(line);
    }
  }
  flush();

  return blocks;
}

type LooseBlock = {
  _type?: string;
  style?: string;
  listItem?: string;
  markDefs?: { _key?: string; _type?: string; href?: string }[];
  children?: { text?: string; marks?: string[] }[];
};

export function blocksToText(blocks: unknown): string {
  if (!Array.isArray(blocks)) return "";

  const items = (blocks as LooseBlock[]).filter((item) => item?._type === "block");

  const lines = items.map((item) => {
    const links = new Map(
      (item.markDefs ?? [])
        .filter((def) => def._type === "link" && def._key)
        .map((def) => [def._key as string, def.href ?? ""]),
    );

    const text = (item.children ?? [])
      .map((child) => {
        const value = child.text ?? "";
        const marks = child.marks ?? [];
        const href = marks.map((mark) => links.get(mark)).find(Boolean);
        let out = value;
        if (marks.includes("em")) out = `*${out}*`;
        if (marks.includes("strong")) out = `**${out}**`;
        if (href) out = `[${out}](${href})`;
        return out;
      })
      .join("");

    if (item.listItem === "bullet") return `- ${text}`;
    if (item.listItem === "number") return `1. ${text}`;
    if (item.style === "h3") return `### ${text}`;
    if (item.style === "blockquote") return `> ${text}`;
    return text;
  });

  return lines
    .map((line, index) =>
      index === 0
        ? line
        : `${items[index].listItem && items[index - 1].listItem ? "\n" : "\n\n"}${line}`,
    )
    .join("");
}
