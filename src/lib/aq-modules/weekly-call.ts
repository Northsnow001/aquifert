import type { CommunityCall } from "@/lib/aq-modules/types";

/** Registration page for the Weekly Market Call; it emails each member their joining link. */
export const WEEKLY_CALL_REGISTER_URL =
  "https://events.teams.microsoft.com/event/54379816-6b06-464b-be5c-63b55ace655b@358f44e8-ed7b-4bca-951c-dde5da69f33e";

export const callRegisterUrl = (call?: Pick<CommunityCall, "registerUrl"> | null) => call?.registerUrl || WEEKLY_CALL_REGISTER_URL;
