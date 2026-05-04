import type { ReactNode } from "react";

interface MarkdownContentProps {
  content: string;
  className?: string;
  maxLength?: number;
}

function safeHref(value: string) {
  const trimmed = value.trim();
  if (/^(https?:|mailto:)/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) return trimmed;
  return "#";
}

function parseInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let rest = text;
  let index = 0;
  const pattern = /(\[([^\]]+)\]\(([^)]+)\))|(`([^`]+)`)|(\*\*([^*]+)\*\*)|(__([^_]+)__)|(\*([^*]+)\*)|(_([^_]+)_)/;

  while (rest) {
    const match = rest.match(pattern);
    if (!match || match.index === undefined) {
      nodes.push(rest);
      break;
    }

    if (match.index > 0) nodes.push(rest.slice(0, match.index));
    const key = `${keyPrefix}-inline-${index++}`;

    if (match[2] && match[3]) {
      nodes.push(
        <a key={key} href={safeHref(match[3])} target="_blank" rel="noopener noreferrer" className="text-cabinet-blue hover:underline break-words">
          {parseInline(match[2], key)}
        </a>
      );
    } else if (match[5]) {
      nodes.push(<code key={key} className="rounded bg-cabinet-itemBg px-1 py-0.5 text-[0.92em]">{match[5]}</code>);
    } else if (match[7] || match[9]) {
      nodes.push(<strong key={key} className="font-semibold">{parseInline(match[7] || match[9], key)}</strong>);
    } else if (match[11] || match[13]) {
      nodes.push(<em key={key} className="italic">{parseInline(match[11] || match[13], key)}</em>);
    }

    rest = rest.slice(match.index + match[0].length);
  }

  return nodes;
}

function parseTable(lines: string[], keyPrefix: string) {
  if (lines.length < 2) return null;
  const separator = lines[1].trim();
  if (!/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(separator)) return null;
  const split = (line: string) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
  const headers = split(lines[0]);
  const rows = lines.slice(2).map(split);
  return (
    <div key={`${keyPrefix}-table`} className="my-4 overflow-x-auto rounded-2xl border border-cabinet-border">
      <table className="min-w-full text-left text-[14px]">
        <thead className="bg-cabinet-bg text-cabinet-ink">
          <tr>
            {headers.map((header, idx) => (
              <th key={`${keyPrefix}-th-${idx}`} className="border-b border-cabinet-border px-3 py-2 font-semibold">
                {parseInline(header, `${keyPrefix}-th-${idx}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr key={`${keyPrefix}-tr-${rowIdx}`} className="odd:bg-cabinet-paper even:bg-cabinet-bg/50">
              {headers.map((_, cellIdx) => (
                <td key={`${keyPrefix}-td-${rowIdx}-${cellIdx}`} className="border-t border-cabinet-border px-3 py-2 align-top">
                  {parseInline(row[cellIdx] || "", `${keyPrefix}-td-${rowIdx}-${cellIdx}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function flushParagraph(paragraph: string[], blocks: ReactNode[], keyPrefix: string) {
  if (!paragraph.length) return;
  const text = paragraph.join("\n").trim();
  if (!text) return;
  blocks.push(
    <p key={`${keyPrefix}-p-${blocks.length}`} className="my-3 leading-[1.75] whitespace-pre-wrap break-words">
      {parseInline(text, `${keyPrefix}-p-${blocks.length}`)}
    </p>
  );
  paragraph.length = 0;
}

export default function MarkdownContent({ content, className = "", maxLength }: MarkdownContentProps) {
  const raw = String(content || "").trim();
  const source = maxLength && raw.length > maxLength ? `${raw.slice(0, maxLength)}…` : raw;
  if (!source) return null;

  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  const paragraph: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();
    const keyPrefix = `md-${index}-${blocks.length}`;

    if (!trimmed) {
      flushParagraph(paragraph, blocks, keyPrefix);
      index += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      flushParagraph(paragraph, blocks, keyPrefix);
      const language = trimmed.slice(3).trim();
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        code.push(lines[index]);
        index += 1;
      }
      blocks.push(
        <pre key={`${keyPrefix}-code`} className="my-4 max-h-[520px] overflow-auto rounded-2xl border border-cabinet-border bg-cabinet-bg p-4 text-[13px] leading-relaxed text-cabinet-ink whitespace-pre-wrap break-words">
          {language && <div className="mb-2 text-[12px] text-cabinet-inkMuted">{language}</div>}
          <code>{code.join("\n")}</code>
        </pre>
      );
      index += 1;
      continue;
    }

    const table = parseTable(lines.slice(index, index + Math.max(2, lines.length - index)).filter((item) => item.trim().includes("|")), keyPrefix);
    if (trimmed.includes("|") && index + 1 < lines.length && lines[index + 1].includes("|") && table) {
      flushParagraph(paragraph, blocks, keyPrefix);
      const tableLines: string[] = [];
      while (index < lines.length && lines[index].trim().includes("|")) {
        tableLines.push(lines[index]);
        index += 1;
      }
      blocks.push(parseTable(tableLines, keyPrefix));
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph(paragraph, blocks, keyPrefix);
      const level = heading[1].length;
      const sizes = ["text-[22px]", "text-[19px]", "text-[17px]", "text-[15px]", "text-[14px]", "text-[13px]"];
      blocks.push(
        <div key={`${keyPrefix}-h`} className={`${sizes[level - 1]} mt-5 mb-2 font-semibold leading-snug text-cabinet-ink break-words`}>
          {parseInline(heading[2], `${keyPrefix}-h`)}
        </div>
      );
      index += 1;
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      flushParagraph(paragraph, blocks, keyPrefix);
      const quote: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index].trim())) {
        quote.push(lines[index].trim().replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push(
        <blockquote key={`${keyPrefix}-quote`} className="my-4 border-l-4 border-cabinet-blue bg-cabinet-bg px-4 py-3 text-[14px] text-cabinet-inkMuted">
          {parseInline(quote.join("\n"), `${keyPrefix}-quote`)}
        </blockquote>
      );
      continue;
    }

    if (/^([-*+] |\d+[.)]\s+)/.test(trimmed)) {
      flushParagraph(paragraph, blocks, keyPrefix);
      const ordered = /^\d+[.)]\s+/.test(trimmed);
      const items: string[] = [];
      while (index < lines.length && /^([-*+] |\d+[.)]\s+)/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^([-*+] |\d+[.)]\s+)/, ""));
        index += 1;
      }
      const Tag = ordered ? "ol" : "ul";
      blocks.push(
        <Tag key={`${keyPrefix}-list`} className={`my-3 space-y-1 pl-5 text-[15px] leading-[1.7] ${ordered ? "list-decimal" : "list-disc"}`}>
          {items.map((item, itemIdx) => (
            <li key={`${keyPrefix}-li-${itemIdx}`} className="break-words">
              {parseInline(item, `${keyPrefix}-li-${itemIdx}`)}
            </li>
          ))}
        </Tag>
      );
      continue;
    }

    paragraph.push(line);
    index += 1;
  }

  flushParagraph(paragraph, blocks, "md-end");

  return <div className={`text-[15px] leading-[1.7] text-cabinet-ink ${className}`}>{blocks}</div>;
}
