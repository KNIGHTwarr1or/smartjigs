import { cn } from "@/lib/utils";

interface StatusIndicatorProps {
  status: "active" | "idle" | "warning" | "error";
  label?: string;
  className?: string;
}

export const StatusIndicator = ({ status, label, className }: StatusIndicatorProps) => {
  const statusClasses = {
    active: "status-indicator-active",
    idle: "status-indicator-idle",
    warning: "status-indicator-warning",
    error: "status-indicator-error",
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("status-indicator", statusClasses[status])} />
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
    </div>
  );
};
