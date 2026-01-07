import { cn } from "@/lib/utils";
import { MessageSquare, Clock } from "lucide-react";

interface Notification {
  id: number;
  message: string;
  timestamp: string;
  sent: boolean;
}

interface NotificationLogProps {
  notifications: Notification[];
  className?: string;
}

export const NotificationLog = ({ notifications, className }: NotificationLogProps) => {
  return (
    <div className={cn("card-industrial p-6", className)}>
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">SMS Notifications</h3>
      </div>
      
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No notifications yet</p>
        ) : (
          notifications.map((notification, index) => (
            <div
              key={notification.id}
              className={cn(
                "p-3 rounded-lg bg-secondary/50 border border-border animate-fade-in-up",
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <p className="text-sm text-foreground mb-2">{notification.message}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{notification.timestamp}</span>
                {notification.sent && (
                  <span className="ml-auto text-success">✓ Sent</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
