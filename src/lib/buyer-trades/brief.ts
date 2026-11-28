/** The first thing a person said, without the quoted email chain, signature, or headers. */
export function briefMessage(raw: string, fallback: string) {
  const head = raw.split(/(?:>>+|-----Original|\bOn\s+(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\w*,.{0,40}?wrote:|Subject:|Sent from)/i)[0] ?? raw;
  let text = head
    .replace(/\[image:[^\]]*\]/gi, " ")
    .replace(/[*_>#|]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^(from|to|cc|bcc|date|sent|tel|email|wechat)\s*:\s*/i, "")
    .trim();
  text = text.split(/\b(kind regards|best regards|regards,|sent from my|www\.|https?:\/\/)/i)[0]?.trim() ?? text;
  text = text.replace(/\s+on\s+(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\w*,\s+\w+\s+\d{1,2}.+$/i, "").trim();
  const noisy = text.length < 12 || /@|tel\s*:|signature_|shelton street|email chain/i.test(text);
  if (noisy) return fallback;
  if (text.length > 140) return `${text.slice(0, 137).trim()}…`;
  return text;
}
