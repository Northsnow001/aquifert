import { Fragment, type ReactNode } from "react";

type Options = { images: boolean };
type Align = "left" | "center" | "right";

/**
 * Renders a Markdown subset as React elements (no raw HTML): headings, bold, italic, code, code blocks,
 * quotes, lists, links, rules and pipe tables with alignment. Images render only when `images` is set,
 * so model output can never load third-party URLs.
 */
export function Markdown({ text, className = "text-[14px]", images = false }: { text: string; className?: string; images?: boolean }) {
  return <div className={`space-y-2.5 leading-relaxed ${className}`}>{blocks(text, { images })}</div>;
}

function inline(text: string, keyBase: string, options: Options = { images: false }): ReactNode[] {
  const out: ReactNode[] = [];
  const pattern = /(!\[[^\]]*\]\((https:\/\/[^\s)]+)\)|\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\[[^\]]+\]\((https?:\/\/[^\s)]+)\)|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > last) out.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyBase}-${index++}`;
    if (token.startsWith("![")) {
      const alt = token.slice(2, token.indexOf("]("));
      out.push(
        options.images ? (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote hosts, sized by the reader
          <img key={key} src={match[2]} alt={alt} loading="lazy" referrerPolicy="no-referrer" className="my-1 max-h-[420px] max-w-full rounded-lg border border-border" />
        ) : (
          alt
        ),
      );
    } else if (token.startsWith("**") || token.startsWith("__")) out.push(<strong key={key} className="font-semibold text-ink">{inline(token.slice(2, -2), key, options)}</strong>);
    else if (token.startsWith("`")) out.push(<code key={key} className="rounded bg-s2 px-1 py-px font-mono text-[12.5px]">{token.slice(1, -1)}</code>);
    else if (token.startsWith("[")) {
      const label = token.slice(1, token.indexOf("]("));
      out.push(
        <a key={key} href={match[3]} target="_blank" rel="noreferrer noopener" className="text-blue underline underline-offset-2">
          {label}
        </a>,
      );
    } else out.push(<em key={key}>{inline(token.slice(1, -1), key, options)}</em>);
    last = match.index + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function isTableRow(line: string) {
  return /^\s*\|.*\|\s*$/.test(line);
}

function cells(line: string) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

function isSeparator(line: string) {
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);
}

function alignments(line: string): Align[] {
  return cells(line).map((cell) => (cell.startsWith(":") && cell.endsWith(":") ? "center" : cell.endsWith(":") ? "right" : "left"));
}

const ALIGN_CLASS: Record<Align, string> = { left: "text-left", center: "text-center", right: "text-right" };

const isRule = (line: string) => /^\s*([-*_])(\s*\1){2,}\s*$/.test(line);

function blocks(text: string, options: Options): ReactNode[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (line.trim().startsWith("```")) {
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith("```")) code.push(lines[i++]);
      i += 1;
      out.push(
        <pre key={key++} className="overflow-x-auto rounded-lg bg-s2 px-3 py-2 font-mono text-[12.5px]">
          {code.join("\n")}
        </pre>,
      );
      continue;
    }

    if (isRule(line)) {
      out.push(<hr key={key++} className="border-border" />);
      i += 1;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const size = heading[1].length <= 2 ? "text-[15.5px]" : "text-[14.5px]";
      out.push(
        <p key={key++} className={`pt-1 font-bold text-ink ${size}`}>
          {inline(heading[2], `h${key}`, options)}
        </p>,
      );
      i += 1;
      continue;
    }

    if (isTableRow(line) && i + 1 < lines.length && isSeparator(lines[i + 1])) {
      const head = cells(line);
      const align = alignments(lines[i + 1]);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i])) rows.push(cells(lines[i++]));
      out.push(
        <div key={key++} className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-s2">
              <tr>
                {head.map((cell, c) => (
                  <th key={c} className={`px-3 py-1.5 font-semibold text-ink ${ALIGN_CLASS[align[c] ?? "left"]}`}>
                    {inline(cell, `th${key}-${c}`, options)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td key={c} className={`px-3 py-1.5 align-top ${ALIGN_CLASS[align[c] ?? "left"]}`}>
                      {inline(cell, `td${key}-${r}-${c}`, options)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (/^\s*([-*•])\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items: { text: string; nested: boolean }[] = [];
      while (i < lines.length && (/^\s*([-*•])\s+/.test(lines[i]) || /^\s*\d+[.)]\s+/.test(lines[i]))) {
        items.push({ text: lines[i].replace(/^\s*([-*•]|\d+[.)])\s+/, ""), nested: /^\s{2,}/.test(lines[i]) });
        i += 1;
      }
      const List = ordered ? "ol" : "ul";
      out.push(
        <List key={key++} className={`space-y-1 pl-5 ${ordered ? "list-decimal" : "list-disc"} marker:text-dim`}>
          {items.map((item, n) => (
            <li key={n} className={item.nested ? "ml-4" : ""}>
              {inline(item.text, `li${key}-${n}`, options)}
            </li>
          ))}
        </List>,
      );
      continue;
    }

    if (line.trim().startsWith(">")) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) quote.push(lines[i++].replace(/^\s*>\s?/, ""));
      out.push(
        <blockquote key={key++} className="border-l-2 border-border pl-3 text-mid">
          {inline(quote.join(" "), `q${key}`, options)}
        </blockquote>,
      );
      continue;
    }

    const paragraph: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|```|\s*[-*•]\s|\s*\d+[.)]\s|\s*>)/.test(lines[i]) && !isTableRow(lines[i]) && !isRule(lines[i])) paragraph.push(lines[i++]);
    if (paragraph.length === 0) paragraph.push(lines[i++]);
    out.push(
      <p key={key++}>
        {paragraph.map((part, n) => (
          <Fragment key={n}>
            {n > 0 ? <br /> : null}
            {inline(part, `p${key}-${n}`, options)}
          </Fragment>
        ))}
      </p>,
    );
  }
  return out;
}
