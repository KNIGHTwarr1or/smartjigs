/*
 * ESP32 Drilling System - WebSocket Client
 * 
 * This code connects to the Supabase Edge Function WebSocket
 * and controls the drilling system based on commands from the web dashboard.
 * 
 * Hardware:
 * - ESP32 board
 * - Servo motor on GPIO 5
 * - DC Motor/Relay on GPIO 4
 * 
 * Libraries needed:
 * - WiFi.h (built-in)
 * - WebSocketsClient.h (by Markus Sattler)
 * - ArduinoJson.h (by Benoit Blanchon)
 * - ESP32Servo.h
 */

#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>

// ============== CONFIGURATION ==============
// WiFi credentials
const char* ssid = "Sharvesh's iPhone";
const char* password = "Sharvesh47";

// WebSocket server details
const char* wsHost = "ixpawqgimqdsrqaezzzp.functions.supabase.co";
const int wsPort = 443;
const char* wsPath = "/esp32-websocket?type=device&deviceId=esp32-drill-001";

// Pin definitions
const int SERVO_PIN = 5;
const int MOTOR_PIN = 4;

// ============================================

WebSocketsClient webSocket;
Servo myServo;

// State variables
bool isRunning = false;
int currentOperation = 0;
int servoAngle = 0;
bool motorOn = false;
unsigned long lastHeartbeat = 0;
const unsigned long HEARTBEAT_INTERVAL = 30000; // 30 seconds

void setup() {
  Serial.begin(115200);
  Serial.println("\n\nESP32 Drilling System Starting...");

  // Initialize pins
  pinMode(MOTOR_PIN, OUTPUT);
  digitalWrite(MOTOR_PIN, LOW);
  
  myServo.attach(SERVO_PIN);
  myServo.write(0);

  // Connect to WiFi
  connectWiFi();

  // Setup WebSocket
  setupWebSocket();
}

void loop() {
  webSocket.loop();

  // Send periodic heartbeat
  if (millis() - lastHeartbeat > HEARTBEAT_INTERVAL) {
    sendState();
    lastHeartbeat = millis();
  }

  // Handle any ongoing operations
  handleOperations();
}

void connectWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWiFi connection failed! Restarting...");
    ESP.restart();
  }
}

void setupWebSocket() {
  Serial.println("Connecting to WebSocket server...");
  
  // Use SSL for secure connection
  webSocket.beginSSL(wsHost, wsPort, wsPath);
  
  // Set event handler
  webSocket.onEvent(webSocketEvent);
  
  // Set reconnect interval
  webSocket.setReconnectInterval(5000);
  
  // Enable heartbeat
  webSocket.enableHeartbeat(15000, 3000, 2);
}

void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      Serial.println("[WS] Disconnected");
      // Stop motor for safety
      stopMotor();
      break;
      
    case WStype_CONNECTED:
      Serial.print("[WS] Connected to: ");
      Serial.println((char*)payload);
      // Send initial state
      sendState();
      sendNotification("ESP32 device connected and ready.");
      break;
      
    case WStype_TEXT:
      Serial.print("[WS] Received: ");
      Serial.println((char*)payload);
      handleCommand((char*)payload);
      break;
      
    case WStype_ERROR:
      Serial.println("[WS] Error");
      break;
      
    case WStype_PING:
      Serial.println("[WS] Ping");
      break;
      
    case WStype_PONG:
      Serial.println("[WS] Pong");
      break;
  }
}

void handleCommand(const char* payload) {
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, payload);
  
  if (error) {
    Serial.print("[WS] JSON parse error: ");
    Serial.println(error.c_str());
    return;
  }
  
  const char* type = doc["type"];
  const char* action = doc["action"];
  
  if (strcmp(type, "command") == 0) {
    if (strcmp(action, "start") == 0) {
      startDrillingSequence();
    } else if (strcmp(action, "stop") == 0) {
      stopDrillingSequence();
    } else if (strcmp(action, "reset") == 0) {
      resetSystem();
    } else if (strcmp(action, "servo") == 0) {
      int angle = doc["angle"];
      setServoAngle(angle);
    } else if (strcmp(action, "motor") == 0) {
      bool enabled = doc["enabled"];
      if (enabled) {
        startMotor();
      } else {
        stopMotor();
      }
    }
  }
}

void startDrillingSequence() {
  Serial.println("Starting drilling sequence...");
  isRunning = true;
  currentOperation = 1;
  sendState();
  sendNotification("Drilling sequence started.");
  
  // Start operation 1
  setServoAngle(0);
  startMotor();
  sendOperationStart(1);
}

void stopDrillingSequence() {
  Serial.println("Stopping drilling sequence...");
  isRunning = false;
  stopMotor();
  sendState();
  sendNotification("Drilling sequence stopped.");
}

void resetSystem() {
  Serial.println("Resetting system...");
  isRunning = false;
  currentOperation = 0;
  setServoAngle(0);
  stopMotor();
  sendState();
  sendNotification("System reset complete.");
}

void setServoAngle(int angle) {
  Serial.print("Setting servo angle: ");
  Serial.println(angle);
  servoAngle = angle;
  myServo.write(angle);
  sendState();
}

void startMotor() {
  Serial.println("Motor ON");
  motorOn = true;
  digitalWrite(MOTOR_PIN, HIGH);
  sendState();
}

void stopMotor() {
  Serial.println("Motor OFF");
  motorOn = false;
  digitalWrite(MOTOR_PIN, LOW);
  sendState();
}

void handleOperations() {
  // This would contain the actual drilling operation logic
  // For now, it's controlled by the web dashboard
}

void sendState() {
  StaticJsonDocument<256> doc;
  doc["type"] = "state_update";
  
  JsonObject state = doc.createNestedObject("state");
  state["motorStatus"] = motorOn ? "active" : "idle";
  state["servoAngle"] = servoAngle;
  state["currentOperation"] = currentOperation;
  state["isRunning"] = isRunning;
  
  String output;
  serializeJson(doc, output);
  webSocket.sendTXT(output);
  
  Serial.print("[WS] Sent state: ");
  Serial.println(output);
}

void sendNotification(const char* message) {
  StaticJsonDocument<256> doc;
  doc["type"] = "notification";
  doc["message"] = message;
  
  String output;
  serializeJson(doc, output);
  webSocket.sendTXT(output);
}

void sendOperationStart(int opNumber) {
  StaticJsonDocument<256> doc;
  doc["type"] = "operation_start";
  
  JsonObject state = doc.createNestedObject("state");
  state["currentOperation"] = opNumber;
  
  String output;
  serializeJson(doc, output);
  webSocket.sendTXT(output);
}

void sendOperationComplete(int opNumber) {
  StaticJsonDocument<256> doc;
  doc["type"] = "operation_complete";
  
  JsonObject state = doc.createNestedObject("state");
  state["currentOperation"] = opNumber;
  
  String output;
  serializeJson(doc, output);
  webSocket.sendTXT(output);
}
