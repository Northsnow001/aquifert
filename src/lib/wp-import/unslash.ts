/**
 * WordPress strips backslashes from post meta on save, so the old site's hedge JSON lost every
 * `\n` escape and kept a bare "n": "on holiday.nEgypt", "Whatncomes next", "USDn100".
 * These helpers put the breaks back. Prose never has a sentence end, "n" and a capital with no
 * space between, so that pattern marks damaged text and nothing else is touched.
 */

const DAMAGE = /[a-z0-9)%][.!?]["”’)]?n[A-Z“"(]/;

/** Very common words, so short splits like "aboventhe" resolve even with no other text to learn from. */
const BASE_WORDS = `a about above across after again against ahead all almost along already also although always among an and
any are around as at away back be because been before behind being below between both but by can cannot come comes coming
could current day days did do does down during each early earlier either end enough even ever every few first for from
further get gets give given go goes going good had has have having here high higher how however if in into is it its itself
just keep last late later least less like little long low lower made make makes many market markets may more most much
must near need needed needs never new next no not now of off on once one only or other others our out over own paper part
past per perhaps price prices properly put quite rather real really right same say see seen set should show shows side
since so some soon still such suggests take than that the their them then there these they this those though through
thus to today too toward under until up upon us very was we week weeks well were what when where whether which while who
why will with within without would year years yet you your tonne tonnes tonnage benchmark benchmarks perfectly uncertainty
demand supply index offer offers bid bids buyers sellers physical forward curve contango backwardation direction holiday`;

const words = (text: string) => text.toLowerCase().match(/[a-z]+/g) ?? [];

export function isUnslashedText(text: string) {
  return !text.includes("\n") && DAMAGE.test(text);
}

/** Known words for splitting run-together tokens: the base list plus every word in text that never went through WordPress meta. */
export function buildVocabulary(corpus: Iterable<string>) {
  const vocab = new Set(words(BASE_WORDS));
  for (const text of corpus) for (const word of words(text)) vocab.add(word);
  return vocab;
}

const SUFFIXES = ["s", "es", "ed", "d", "ing", "ly", "er", "est"];

function known(word: string, vocab: Set<string>) {
  if (vocab.has(word)) return true;
  return SUFFIXES.some((suffix) => word.length > suffix.length + 2 && word.endsWith(suffix) && vocab.has(word.slice(0, -suffix.length)));
}

/** "whatncomes" → "what comes" when the halves are real words; unknown or ambiguous tokens are left alone. */
function splitToken(token: string, vocab: Set<string>) {
  const lower = token.toLowerCase();
  if (!lower.includes("n") || known(lower, vocab)) return token;
  const both: number[] = [];
  const one: number[] = [];
  for (let i = 1; i < lower.length - 1; i++) {
    if (lower[i] !== "n") continue;
    const left = lower.slice(0, i);
    const right = lower.slice(i + 1);
    const leftKnown = left.length >= 3 && known(left, vocab);
    const rightKnown = right.length >= 3 && known(right, vocab);
    if (leftKnown && rightKnown) both.push(i);
    else if ((leftKnown && right.length >= 5) || (rightKnown && left.length >= 5)) one.push(i);
  }
  const at = both.length === 1 ? both[0] : both.length === 0 && one.length === 1 ? one[0] : -1;
  return at < 0 ? token : `${token.slice(0, at)} ${token.slice(at + 1)}`;
}

/** Restores the line breaks WordPress stripped: sentence ends become paragraph breaks, mid-sentence wraps become spaces. */
export function repairUnslashedText(text: string, vocab: Set<string>) {
  if (!isUnslashedText(text)) return text;
  return text
    .replace(/([.!?]["”’)]?)n(?=[A-Z“"(])/g, "$1\n\n")
    .replace(/([,;:%)\]])n(?=[A-Za-z(“"])/g, "$1 ")
    .replace(/(\d)n(?!d\b)(?=[A-Za-z])/g, "$1 ")
    .replace(/\b([A-Za-z]{2,})n(?=\d)/g, (match, head: string) => (head === head.toUpperCase() || known(head.toLowerCase(), vocab) ? `${head} ` : match))
    .replace(/[A-Za-z]{4,}/g, (token) => splitToken(token, vocab));
}
