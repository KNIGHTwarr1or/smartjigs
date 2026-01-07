import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Cog, Gauge, Zap, Timer, Drill, LogOut, Loader2 } from "lucide-react";
import { SystemCard } from "@/components/SystemCard";
import { OperationProgress } from "@/components/OperationProgress";
import { NotificationLog } from "@/components/NotificationLog";
import { ControlPanel } from "@/components/ControlPanel";
import { ServoGauge } from "@/components/ServoGauge";
import { OperationHistory } from "@/components/OperationHistory";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useOperationHistory } from "@/hooks/useOperationHistory";

const DEVICE_ID = "esp32-drill-001"; // Default device ID

const Index = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { operations: historyOperations, loading: historyLoading, startOperation, completeOperation } = useOperationHistory(DEVICE_ID);
  
  const [isConnected, setIsConnected] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [currentOperation, setCurrentOperation] = useState(0);
  const [servoAngle, setServoAngle] = useState(0);
  const [motorStatus, setMotorStatus] = useState<"active" | "idle">("idle");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentOperationId, setCurrentOperationId] = useState<string | null>(null);
  const [operationStartTime, setOperationStartTime] = useState<number | null>(null);

  type OperationStatus = "pending" | "active" | "completed";
  
  interface Operation {
    id: number;
    name: string;
    servoAngle: number;
    status: OperationStatus;
  }

  const [operations, setOperations] = useState<Operation[]>([
    { id: 1, name: "Operation 1 - Initial Drilling", servoAngle: 0, status: "pending" },
    { id: 2, name: "Operation 2 - Position 120°", servoAngle: 120, status: "pending" },
    { id: 3, name: "Operation 3 - Position 240°", servoAngle: 240, status: "pending" },
  ]);

  const [notifications, setNotifications] = useState([
    { id: 1, message: "System is ready to drill the holes.", timestamp: "10:00:05", sent: true },
  ]);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Timer effect
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  // Operation sequence effect
  useEffect(() => {
    if (!isRunning || !user) return;

    const runSequence = async () => {
      // Operation 1
      setMotorStatus("active");
      setCurrentOperation(1);
      updateOperationStatus(1, "active");
      
      const op1 = await startOperation("Operation 1 - Initial Drilling", 0);
      if (op1) {
        setCurrentOperationId(op1.id);
        setOperationStartTime(Date.now());
      }

      setTimeout(async () => {
        setMotorStatus("idle");
        updateOperationStatus(1, "completed");
        addNotification("Operation 1 completed. Ready for operation 2.");
        if (op1) await completeOperation(op1.id, 5000);

        // Operation 2
        setTimeout(async () => {
          setServoAngle(120);
          setCurrentOperation(2);
          updateOperationStatus(2, "active");
          setMotorStatus("active");
          
          const op2 = await startOperation("Operation 2 - Position 120°", 120);

          setTimeout(async () => {
            setMotorStatus("idle");
            updateOperationStatus(2, "completed");
            addNotification("Operation 2 completed. Ready for operation 3.");
            if (op2) await completeOperation(op2.id, 5000);

            // Operation 3
            setTimeout(async () => {
              setServoAngle(240);
              setCurrentOperation(3);
              updateOperationStatus(3, "active");
              setMotorStatus("active");
              
              const op3 = await startOperation("Operation 3 - Position 240°", 240);

              setTimeout(async () => {
                setMotorStatus("idle");
                updateOperationStatus(3, "completed");
                addNotification("All 3 drilling operations are completed.");
                if (op3) await completeOperation(op3.id, 5000);
                setIsRunning(false);
              }, 5000);
            }, 1000);
          }, 5000);
        }, 1000);
      }, 5000);
    };

    runSequence();
  }, [isRunning, user]);

  const updateOperationStatus = (id: number, status: OperationStatus) => {
    setOperations((prev) =>
      prev.map((op) => (op.id === id ? { ...op, status } : op))
    );
  };

  const addNotification = (message: string) => {
    const now = new Date();
    const timestamp = now.toLocaleTimeString();
    setNotifications((prev) => [
      ...prev,
      { id: Date.now(), message, timestamp, sent: true },
    ]);
  };

  const handleStart = () => {
    setIsRunning(true);
    setElapsedTime(0);
    setServoAngle(0);
    setOperations((prev) => prev.map((op) => ({ ...op, status: "pending" as const })));
    setNotifications([{ id: 1, message: "System is ready to drill the holes.", timestamp: new Date().toLocaleTimeString(), sent: true }]);
  };

  const handleStop = () => {
    setIsRunning(false);
    setMotorStatus("idle");
  };

  const handleReset = () => {
    setServoAngle(0);
    setCurrentOperation(0);
    setElapsedTime(0);
    setOperations((prev) => prev.map((op) => ({ ...op, status: "pending" as const })));
    setNotifications([]);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen p-6 md:p-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Drill className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                ESP Drill <span className="text-primary glow-text">Controller</span>
              </h1>
              <p className="text-muted-foreground text-sm">Automated Drilling System Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden md:block">
              {user.email}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Status Cards */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <SystemCard
              title="Motor Status"
              value={motorStatus === "active" ? "ON" : "OFF"}
              icon={Cog}
              status={motorStatus}
            />
            <SystemCard
              title="Current Op"
              value={currentOperation || "-"}
              icon={Gauge}
              status={currentOperation > 0 ? "active" : "idle"}
            />
            <SystemCard
              title="Speed"
              value={motorStatus === "active" ? 1200 : 0}
              unit="RPM"
              icon={Zap}
              status={motorStatus}
            />
            <SystemCard
              title="Elapsed"
              value={formatTime(elapsedTime)}
              icon={Timer}
              status={isRunning ? "active" : "idle"}
            />
          </div>

          <ServoGauge angle={servoAngle} />
        </div>

        {/* Middle Column - Operations */}
        <div className="space-y-6">
          <div className="card-industrial p-6">
            <h3 className="font-semibold mb-4">Operation Sequence</h3>
            <OperationProgress operations={operations} />
          </div>
          
          <OperationHistory operations={historyOperations} loading={historyLoading} />
        </div>

        {/* Right Column - Controls & Notifications */}
        <div className="space-y-6">
          <ControlPanel
            isConnected={isConnected}
            isRunning={isRunning}
            onStart={handleStart}
            onStop={handleStop}
            onReset={handleReset}
          />
          
          <NotificationLog notifications={notifications} />
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 text-center text-xs text-muted-foreground">
        <p>ESP32 Drilling System Controller • WiFi-Enabled IoT Dashboard</p>
      </footer>
    </div>
  );
};

export default Index;
