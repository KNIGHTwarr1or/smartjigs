import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface SystemCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  status?: "active" | "idle" | "warning" | "error";
  className?: string;
}

export const SystemCard = ({ title, value, unit, icon: Icon, status = "idle", className }: SystemCardProps) => {
  const statusColors = {
    active: "text-success",
    idle: "text-muted-foreground",
    warning: "text-warning",
    error: "text-destructive",
  };

  const glowStyles = {
    active: "shadow-[0_0_20px_hsl(145_70%_45%/0.2)]",
    idle: "",
    warning: "shadow-[0_0_20px_hsl(40_90%_55%/0.2)]",
    error: "shadow-[0_0_20px_hsl(0_70%_55%/0.2)]",
  };

  return (
    <div className={cn(
      "card-industrial p-6 transition-all duration-300 hover:border-primary/50",
      glowStyles[status],
      className
    )}>
      <div className="flex items-start justify-between mb-4">
        <div className={cn("p-2 rounded-lg bg-secondary", statusColors[status])}>
          <Icon className="w-5 h-5" />
        </div>
        <div className={cn("status-indicator", {
          "status-indicator-active": status === "active",
          "status-indicator-idle": status === "idle",
          "status-indicator-warning": status === "warning",
          "status-indicator-error": status === "error",
        })} />
      </div>
      <p className="text-sm text-muted-foreground mb-1">{title}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-mono font-semibold text-foreground">{value}</span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
};
