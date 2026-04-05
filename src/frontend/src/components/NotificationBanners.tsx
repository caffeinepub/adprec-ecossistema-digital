import { AlertTriangle, Bell, Cake, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { Member } from "../backend";
import { useActor } from "../hooks/useActor";
import { useAuth } from "../hooks/useAuth";

interface Notification {
  id: string;
  type: "birthday" | "birthday-admin" | "cantina" | "tithe";
  message: string;
}

export function NotificationBanners() {
  const { actor } = useActor();
  const { isAdmin, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!actor || !isAuthenticated) return;
    const newNotifs: Notification[] = [];

    try {
      const birthdays: Member[] = await actor.getTodaysBirthdays();
      for (const m of birthdays) {
        newNotifs.push({
          id: `bday-${m.name}`,
          type: "birthday",
          message: `🎉 Hoje é aniversário de ${m.name}! "Este é o dia que fez o Senhor; regozijemo-nos e alegremo-nos nele."`,
        });
      }
    } catch {}

    if (isAdmin) {
      try {
        const upcoming = await actor.getUpcomingBirthdays();
        for (const [m] of upcoming) {
          newNotifs.push({
            id: `bday-upcoming-${m.name}`,
            type: "birthday-admin",
            message: `⏰ Aniversário em breve: ${m.name} celebra em menos de 48h.`,
          });
        }
      } catch {}

      try {
        const overdue = await actor.getAllOverdueCantinaRecords();
        if (overdue.length > 0) {
          newNotifs.push({
            id: "cantina-overdue",
            type: "cantina",
            message: `⚠️ ${overdue.length} registro(s) da cantina com débito há mais de 30 dias.`,
          });
        }
      } catch {}

      try {
        const oldTithes = await actor.getMembersWithOldTithes();
        if (oldTithes.length > 0) {
          newNotifs.push({
            id: "tithe-overdue",
            type: "tithe",
            message: `💰 ${oldTithes.length} membro(s) sem registro de dízimo há mais de 30 dias.`,
          });
        }
      } catch {}
    }

    setNotifications(newNotifs);
  }, [actor, isAdmin, isAuthenticated]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = notifications.filter((n) => !dismissed.has(n.id));
  if (!visible.length) return null;

  const iconFor = (type: Notification["type"]) => {
    if (type === "birthday" || type === "birthday-admin") return Cake;
    return AlertTriangle;
  };
  void Bell; // used for type reference only

  return (
    <div className="flex flex-col gap-2 mb-6">
      {visible.map((n) => {
        const Icon = iconFor(n.type);
        return (
          <div
            key={n.id}
            className={`flex items-start justify-between gap-3 px-4 py-3 rounded-lg border text-sm ${
              n.type === "birthday" || n.type === "birthday-admin"
                ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400"
                : "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
            }`}
          >
            <Icon className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span className="flex-1">{n.message}</span>
            <button
              type="button"
              onClick={() => setDismissed((d) => new Set([...d, n.id]))}
              className="opacity-60 hover:opacity-100 flex-shrink-0 mt-0.5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
