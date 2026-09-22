import { useEffect } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Tip } from "@/components/shared/Tip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { timeAgo } from "@/lib/format";

export function NotificationsBell() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const { data: count } = trpc.notifications.unreadCount.useQuery(undefined, {
    refetchInterval: 15_000,
  });
  const { data: items } = trpc.notifications.list.useQuery(undefined, {
    refetchInterval: 30_000,
  });
  const poll = trpc.notifications.poll.useMutation({
    onSuccess: (r) => {
      if (r.created) {
        utils.notifications.unreadCount.invalidate();
        utils.notifications.list.invalidate();
      }
    },
  });
  // Demo real-time simulation, new notification every ~30s
  useEffect(() => {
    const t = setInterval(() => poll.mutate(), 30_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.unreadCount.invalidate();
      utils.notifications.list.invalidate();
    },
  });
  const markAll = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.unreadCount.invalidate();
      utils.notifications.list.invalidate();
    },
  });

  return (
    <Popover>
      <Tip label="Notifications">
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
            <Bell className="h-5 w-5" />
            {(count ?? 0) > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                {count! > 9 ? "9+" : count}
              </span>
            )}
          </Button>
        </PopoverTrigger>
      </Tip>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <p className="text-sm font-semibold">Notifications</p>
          <button
            className="inline-flex items-center gap-1 text-xs text-teal-600 hover:underline"
            onClick={() => markAll.mutate()}
          >
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </button>
        </div>
        <div className="aqf-scroll max-h-96 overflow-y-auto">
          {(items ?? []).length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">You're all caught up.</p>
          )}
          {(items ?? []).map((n) => (
            <button
              key={n.id}
              className={`block w-full px-4 py-3 text-left transition-colors hover:bg-muted/60 ${!n.read ? "bg-teal-50/60 dark:bg-teal-500/5" : ""}`}
              onClick={() => {
                markRead.mutate({ id: n.id });
                if (n.actionUrl) navigate(n.actionUrl);
              }}
            >
              <div className="flex items-start gap-2">
                {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-teal-500" />}
                <div className={!n.read ? "" : "pl-4"}>
                  <p className="text-sm font-medium leading-snug">{n.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-snug">{n.message}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground/70">{timeAgo(n.createdAt)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
