import { cn } from "@/lib/utils";
import { Check, Circle, Loader2 } from "lucide-react";

interface Operation {
  id: number;
  name: string;
  servoAngle: number;
  status: "pending" | "active" | "completed";
}

interface OperationProgressProps {
  operations: Operation[];
  className?: string;
}

export const OperationProgress = ({ operations, className }: OperationProgressProps) => {
  return (
    <div className={cn("space-y-4", className)}>
      {operations.map((op, index) => (
        <div
          key={op.id}
          className={cn(
            "flex items-center gap-4 p-4 rounded-lg border transition-all duration-300",
            op.status === "active" && "border-primary bg-primary/5",
            op.status === "completed" && "border-success/50 bg-success/5",
            op.status === "pending" && "border-border bg-card/50"
          )}
        >
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
              op.status === "active" && "border-primary text-primary animate-pulse",
              op.status === "completed" && "border-success bg-success text-success-foreground",
              op.status === "pending" && "border-muted-foreground text-muted-foreground"
            )}
          >
            {op.status === "completed" ? (
              <Check className="w-5 h-5" />
            ) : op.status === "active" ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Circle className="w-5 h-5" />
            )}
          </div>
          
          <div className="flex-1">
            <h4 className={cn(
              "font-medium",
              op.status === "active" && "text-primary",
              op.status === "completed" && "text-success",
              op.status === "pending" && "text-muted-foreground"
            )}>
              {op.name}
            </h4>
            <p className="text-sm text-muted-foreground">
              Servo Position: <span className="font-mono text-foreground">{op.servoAngle}°</span>
            </p>
          </div>

          {index < operations.length - 1 && (
            <div className="absolute left-[2.25rem] top-[3.5rem] w-0.5 h-8 bg-border" />
          )}
        </div>
      ))}
    </div>
  );
};
