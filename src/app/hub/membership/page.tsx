import { moved } from "@/app/hub/account/moved";

export default function MembershipMoved({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return moved("/hub/account/membership", searchParams);
}
