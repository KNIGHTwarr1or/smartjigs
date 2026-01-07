import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Store active connections
const deviceConnections = new Map<string, WebSocket>();
const clientConnections = new Map<string, Set<WebSocket>>();

serve(async (req) => {
  const url = new URL(req.url);
  const { headers } = req;
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const upgradeHeader = headers.get("upgrade") || "";
  
  // Check if it's a WebSocket upgrade request
  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response(JSON.stringify({ error: "Expected WebSocket connection" }), { 
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Get connection type and device ID from query params
  const connectionType = url.searchParams.get("type"); // "device" or "client"
  const deviceId = url.searchParams.get("deviceId");

  if (!deviceId) {
    return new Response(JSON.stringify({ error: "Device ID required" }), { 
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  console.log(`[WebSocket] New ${connectionType} connection for device: ${deviceId}`);

  const { socket, response } = Deno.upgradeWebSocket(req);

  socket.onopen = () => {
    console.log(`[WebSocket] Connection opened: ${connectionType} - ${deviceId}`);
    
    if (connectionType === "device") {
      // ESP32 device connection
      deviceConnections.set(deviceId, socket);
      
      // Notify all clients that device is online
      broadcastToClients(deviceId, {
        type: "device_status",
        deviceId,
        status: "online",
        timestamp: new Date().toISOString()
      });
    } else {
      // Web client connection
      if (!clientConnections.has(deviceId)) {
        clientConnections.set(deviceId, new Set());
      }
      clientConnections.get(deviceId)!.add(socket);
      
      // Send current device status to new client
      const isDeviceOnline = deviceConnections.has(deviceId);
      socket.send(JSON.stringify({
        type: "device_status",
        deviceId,
        status: isDeviceOnline ? "online" : "offline",
        timestamp: new Date().toISOString()
      }));
    }
  };

  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      console.log(`[WebSocket] Message from ${connectionType} (${deviceId}):`, message);

      if (connectionType === "device") {
        // Message from ESP32 - forward to all connected clients
        broadcastToClients(deviceId, {
          ...message,
          deviceId,
          timestamp: new Date().toISOString()
        });
      } else {
        // Message from web client - forward to ESP32 device
        const deviceSocket = deviceConnections.get(deviceId);
        if (deviceSocket && deviceSocket.readyState === WebSocket.OPEN) {
          deviceSocket.send(JSON.stringify(message));
          console.log(`[WebSocket] Forwarded command to device ${deviceId}:`, message);
        } else {
          // Device not connected, send error back to client
          socket.send(JSON.stringify({
            type: "error",
            message: "Device not connected",
            deviceId,
            timestamp: new Date().toISOString()
          }));
        }
      }
    } catch (error) {
      console.error(`[WebSocket] Error processing message:`, error);
      socket.send(JSON.stringify({
        type: "error",
        message: "Invalid message format",
        timestamp: new Date().toISOString()
      }));
    }
  };

  socket.onclose = () => {
    console.log(`[WebSocket] Connection closed: ${connectionType} - ${deviceId}`);
    
    if (connectionType === "device") {
      deviceConnections.delete(deviceId);
      
      // Notify all clients that device is offline
      broadcastToClients(deviceId, {
        type: "device_status",
        deviceId,
        status: "offline",
        timestamp: new Date().toISOString()
      });
    } else {
      const clients = clientConnections.get(deviceId);
      if (clients) {
        clients.delete(socket);
        if (clients.size === 0) {
          clientConnections.delete(deviceId);
        }
      }
    }
  };

  socket.onerror = (error) => {
    console.error(`[WebSocket] Error for ${connectionType} (${deviceId}):`, error);
  };

  return response;
});

function broadcastToClients(deviceId: string, message: object) {
  const clients = clientConnections.get(deviceId);
  if (clients) {
    const messageStr = JSON.stringify(message);
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }
}
