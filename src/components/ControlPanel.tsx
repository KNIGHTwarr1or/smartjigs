import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Play, Square, RotateCcw, Wifi, WifiOff } from "lucide-react";

interface ControlPanelProps {
  isConnected: boolean;
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  className?: string;
}

export const ControlPanel = ({
  isConnected,
  isRunning,
  onStart,
  onStop,
  onReset,
  className,
}: ControlPanelProps) => {
  return (
    <div className={cn("card-industrial p-6", className)}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold">Control Panel</h3>
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm",
          isConnected ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
        )}>
          {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          {isConnected ? "Connected" : "Disconnected"}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Button
          onClick={onStart}
          disabled={!isConnected || isRunning}
          className="bg-success hover:bg-success/90 text-success-foreground disabled:opacity-50"
        >
          <Play className="w-4 h-4 mr-2" />
          Start
        </Button>
        
        <Button
          onClick={onStop}
          disabled={!isConnected || !isRunning}
          variant="destructive"
        >
          <Square className="w-4 h-4 mr-2" />
          Stop
        </Button>
        
        <Button
          onClick={onReset}
          disabled={!isConnected || isRunning}
          variant="secondary"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset
        </Button>
      </div>

      <div className="mt-4 p-3 rounded-lg bg-secondary/50 border border-border">
        <p className="text-xs text-muted-foreground">
          <span className="text-primary font-mono">ESP IP:</span>{" "}
          {isConnected ? "192.168.1.100" : "Not connected"}
        </p>
      </div>
    </div>
  );
};
