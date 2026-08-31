import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { unreadMessageCount } from "@/lib/messaging";
import { useI18n } from "@/lib/i18n";

export default function InboxButton() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }
    unreadMessageCount(user.id).then(setUnread);
    const id = window.setInterval(() => unreadMessageCount(user.id).then(setUnread), 45_000);
    return () => window.clearInterval(id);
  }, [user?.id]);

  if (!user) return null;
  return (
    <Button asChild variant="ghost" size="icon" className="relative h-9 w-9" title={t("nav.messages")}>
      <Link to="/messages">
        <MessageSquare className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -end-0.5 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] leading-4 text-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Link>
    </Button>
  );
}
