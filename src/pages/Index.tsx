import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Cog, Gauge, Zap, Timer, Drill, LogOut, Loader2, Wifi, WifiOff, BarChart3 } from "lucide-react";
import { SystemCard } from "@/components/SystemCard";
import { OperationProgress } from "@/components/OperationProgress";
import { NotificationLog } from "@/components/NotificationLog";
import { ControlPanel } from "@/components/ControlPanel";
import { ServoGauge } from "@/components/ServoGauge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useOperationHistory } from "@/hooks/useOperationHistory";
import { useESP32WebSocket, ESP32Message, ESP32State } from "@/hooks/useESP32WebSocket";
import { Badge } from "@/components/ui/badge";

const DEVICE_ID = "esp32-drill-001";

const Index = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { startOperation, completeOperation } = useOperationHistory(DEVICE_ID);
  
  const [isRunning, setIsRunning] = useState(false);
  const [currentOperation, setCurrentOperation] = useState(0);
  const [servoAngle, setServoAngle] = useState(0);
  const [motorStatus, setMotorStatus] = useState<"active" | "idle">("idle");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [useSimulation, setUseSimulation] = useState(false);

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
    { id: 1, message: "System initialized. Waiting for device connection.", timestamp: new Date().toLocaleTimeString(), sent: true },
  ]);

  const handleStateUpdate = useCallback((state: Partial<ESP32State>) => {
    if (state.motorStatus !== undefined) setMotorStatus(state.motorStatus);
    if (state.servoAngle !== undefined) setServoAngle(state.servoAngle);
    if (state.currentOperation !== undefined) setCurrentOperation(state.currentOperation);
    if (state.isRunning !== undefined) setIsRunning(state.isRunning);
  }, []);

  const handleDeviceStatusChange = useCallback((isOnline: boolean) => {
    addNotification(isOnline ? "ESP32 device connected." : "ESP32 device disconnected.");
    if (!isOnline) {
      setUseSimulation(true);
    }
  }, []);

  const handleMessage = useCallback((message: ESP32Message) => {
    if (message.type === 'notification' && message.message) {
      addNotification(message.message);
    } else if (message.type === 'operation_complete') {
      const opId = message.state?.currentOperation;
      if (opId) {
        updateOperationStatus(opId, "completed");
      }
    } else if (message.type === 'operation_start') {
      const opId = message.state?.currentOperation;
      if (opId) {
        updateOperationStatus(opId, "active");
      }
    }
  }, []);

  const {
    isConnected,
    isDeviceOnline,
    startDrilling,
    stopDrilling,
    resetSystem,
  } = useESP32WebSocket({
    deviceId: DEVICE_ID,
    onStateUpdate: handleStateUpdate,
    onDeviceStatusChange: handleDeviceStatusChange,
    onMessage: handleMessage,
  });

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

  // Simulation mode for when ESP32 is not connected
  useEffect(() => {
    if (!isRunning || !useSimulation || !user) return;

    const runSimulation = async () => {
      setMotorStatus("active");
      setCurrentOperation(1);
      updateOperationStatus(1, "active");
      
      const op1 = await startOperation("Operation 1 - Initial Drilling", 0);

      setTimeout(async () => {
        setMotorStatus("idle");
        updateOperationStatus(1, "completed");
        addNotification("Operation 1 completed. Ready for operation 2.");
        if (op1) await completeOperation(op1.id, 5000);

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

    runSimulation();
  }, [isRunning, useSimulation, user]);

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
    if (isDeviceOnline) {
      startDrilling();
    } else {
      setUseSimulation(true);
    }
    setIsRunning(true);
    setElapsedTime(0);
    setServoAngle(0);
    setOperations((prev) => prev.map((op) => ({ ...op, status: "pending" as const })));
    setNotifications([{ id: 1, message: "Starting drilling sequence...", timestamp: new Date().toLocaleTimeString(), sent: true }]);
  };

  const handleStop = () => {
    if (isDeviceOnline) {
      stopDrilling();
    }
    setIsRunning(false);
    setMotorStatus("idle");
    addNotification("Drilling stopped by user.");
  };

  const handleReset = () => {
    if (isDeviceOnline) {
      resetSystem();
    }
    setServoAngle(0);
    setCurrentOperation(0);
    setElapsedTime(0);
    setOperations((prev) => prev.map((op) => ({ ...op, status: "pending" as const })));
    setNotifications([]);
    addNotification("System reset.");
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
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              <Badge 
                variant={isDeviceOnline ? "default" : "secondary"}
                className={`gap-1.5 ${isDeviceOnline ? 'bg-success text-success-foreground' : ''}`}
              >
                {isDeviceOnline ? (
                  <Wifi className="w-3 h-3" />
                ) : (
                  <WifiOff className="w-3 h-3" />
                )}
                {isDeviceOnline ? 'ESP32 Online' : 'Simulation Mode'}
              </Badge>
            </div>
            <Link to="/analytics">
              <Button variant="outline" size="sm" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                <span className="hidden md:inline">Analytics</span>
              </Button>
            </Link>
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
          
          <Link to="/analytics" className="block">
            <div className="card-industrial p-6 hover:border-primary/50 transition-colors cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <div>
                    <h3 className="font-semibold">View Analytics</h3>
                    <p className="text-sm text-muted-foreground">Parts completed, machine uptime & more</p>
                  </div>
                </div>
                <div className="text-primary">→</div>
              </div>
            </div>
          </Link>
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
        <p>ESP32 Drilling System Controller • WiFi-Enabled IoT Dashboard • {isDeviceOnline ? 'Connected' : 'Simulation Mode'}</p>
      </footer>
    </div>
  );
};

export default Index;
