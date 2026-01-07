import { useState, useEffect, useCallback, useRef } from 'react';

export interface ESP32State {
  motorStatus: 'active' | 'idle';
  servoAngle: number;
  currentOperation: number;
  isRunning: boolean;
}

export interface ESP32Message {
  type: string;
  deviceId?: string;
  status?: string;
  state?: Partial<ESP32State>;
  message?: string;
  timestamp?: string;
}

interface UseESP32WebSocketOptions {
  deviceId: string;
  onMessage?: (message: ESP32Message) => void;
  onStateUpdate?: (state: Partial<ESP32State>) => void;
  onDeviceStatusChange?: (isOnline: boolean) => void;
}

const WS_URL = 'wss://ixpawqgimqdsrqaezzzp.functions.supabase.co/esp32-websocket';

export const useESP32WebSocket = ({
  deviceId,
  onMessage,
  onStateUpdate,
  onDeviceStatusChange,
}: UseESP32WebSocketOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isDeviceOnline, setIsDeviceOnline] = useState(false);
  const [lastMessage, setLastMessage] = useState<ESP32Message | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const url = `${WS_URL}?type=client&deviceId=${encodeURIComponent(deviceId)}`;
      console.log('[ESP32 WS] Connecting to:', url);
      
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[ESP32 WS] Connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message: ESP32Message = JSON.parse(event.data);
          console.log('[ESP32 WS] Received:', message);
          setLastMessage(message);

          if (message.type === 'device_status') {
            const online = message.status === 'online';
            setIsDeviceOnline(online);
            onDeviceStatusChange?.(online);
          } else if (message.type === 'state_update' && message.state) {
            onStateUpdate?.(message.state);
          }

          onMessage?.(message);
        } catch (error) {
          console.error('[ESP32 WS] Error parsing message:', error);
        }
      };

      ws.onclose = () => {
        console.log('[ESP32 WS] Disconnected');
        setIsConnected(false);
        setIsDeviceOnline(false);
        wsRef.current = null;

        // Attempt to reconnect
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(`[ESP32 WS] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1})`);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('[ESP32 WS] Error:', error);
      };
    } catch (error) {
      console.error('[ESP32 WS] Connection error:', error);
    }
  }, [deviceId, onMessage, onStateUpdate, onDeviceStatusChange]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsDeviceOnline(false);
  }, []);

  const sendCommand = useCallback((command: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = JSON.stringify(command);
      console.log('[ESP32 WS] Sending:', command);
      wsRef.current.send(message);
      return true;
    }
    console.warn('[ESP32 WS] Cannot send - not connected');
    return false;
  }, []);

  // Control commands
  const startDrilling = useCallback(() => {
    return sendCommand({ type: 'command', action: 'start' });
  }, [sendCommand]);

  const stopDrilling = useCallback(() => {
    return sendCommand({ type: 'command', action: 'stop' });
  }, [sendCommand]);

  const resetSystem = useCallback(() => {
    return sendCommand({ type: 'command', action: 'reset' });
  }, [sendCommand]);

  const setServoAngle = useCallback((angle: number) => {
    return sendCommand({ type: 'command', action: 'servo', angle });
  }, [sendCommand]);

  const setMotor = useCallback((enabled: boolean) => {
    return sendCommand({ type: 'command', action: 'motor', enabled });
  }, [sendCommand]);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    isConnected,
    isDeviceOnline,
    lastMessage,
    connect,
    disconnect,
    sendCommand,
    startDrilling,
    stopDrilling,
    resetSystem,
    setServoAngle,
    setMotor,
  };
};
