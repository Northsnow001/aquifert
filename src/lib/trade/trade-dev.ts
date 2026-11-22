/** Temporary admin quote generator. Set TRADE_DEV_TOOLS=0 to hide it. */
export function tradeDevToolsEnabled() {
  const flag = process.env.TRADE_DEV_TOOLS?.trim().toLowerCase();
  if (flag === "0" || flag === "false" || flag === "off") return false;
  return true;
}
