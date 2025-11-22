/*
 * ESP32 Marma Therapy Controller
 * Controls 4 motors for marma point therapy based on web app commands
 * 
 * Hardware Setup:
 * - ESP32 Development Board
 * - 4x Servo Motors (or Stepper Motors) for marma points
 * - Optional: LED indicators for each point
 * - Power supply for motors
 * 
 * WiFi Setup:
 * - Connect to your WiFi network
 * - ESP32 will create a web server to receive commands
 * 
 * Marma Points Mapping:
 * - Motor 1: Kshipra Marma (between first and second toe)
 * - Motor 2: Kurcha Marma (heel region)
 * - Motor 3: Talahridaya Marma (sole center)
 * - Motor 4: Kurchashira Marma (Achilles area)
 */

#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>

// ===== CONFIGURATION =====
const char* ssid = "YOUR_WIFI_SSID";        // Change to your WiFi name
const char* password = "YOUR_WIFI_PASSWORD"; // Change to your WiFi password

// If you want ESP32 to create its own hotspot (Access Point mode):
// Set USE_AP_MODE to true and configure AP_SSID/AP_PASSWORD
#define USE_AP_MODE false
const char* AP_SSID = "MarmaTherapy_ESP32";
const char* AP_PASSWORD = "marma1234";

// Server port
WebServer server(80);

// ===== MOTOR CONFIGURATION =====
// Define GPIO pins for each motor (adjust based on your wiring)
#define MOTOR1_PIN 2   // Kshipra Marma
#define MOTOR2_PIN 4   // Kurcha Marma
#define MOTOR3_PIN 5   // Talahridaya Marma
#define MOTOR4_PIN 18  // Kurchashira Marma

// If using Servo Motors:
Servo motor1, motor2, motor3, motor4;

// If using Stepper Motors or other actuators, include appropriate libraries
// #include <Stepper.h>

// Motor state tracking
struct MotorState {
  bool isRunning;
  unsigned long startTime;
  unsigned long duration; // in milliseconds
  int pointIndex;         // 0-3 for marma points
};

MotorState motors[4] = {
  {false, 0, 0, 0},  // Motor 1
  {false, 0, 0, 1},  // Motor 2
  {false, 0, 0, 2},  // Motor 3
  {false, 0, 0, 3}   // Motor 4
};

// LED pins for status indicators (optional)
#define LED1_PIN 19
#define LED2_PIN 21
#define LED3_PIN 22
#define LED4_PIN 23

// ===== SETUP =====
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n=== Marma Therapy ESP32 Controller ===");
  
  // Initialize motors (Servo example)
  motor1.attach(MOTOR1_PIN);
  motor2.attach(MOTOR2_PIN);
  motor3.attach(MOTOR3_PIN);
  motor4.attach(MOTOR4_PIN);
  
  // Set motors to initial position (0 degrees = off)
  motor1.write(0);
  motor2.write(0);
  motor3.write(0);
  motor4.write(0);
  
  // Initialize LED pins (optional)
  pinMode(LED1_PIN, OUTPUT);
  pinMode(LED2_PIN, OUTPUT);
  pinMode(LED3_PIN, OUTPUT);
  pinMode(LED4_PIN, OUTPUT);
  digitalWrite(LED1_PIN, LOW);
  digitalWrite(LED2_PIN, LOW);
  digitalWrite(LED3_PIN, LOW);
  digitalWrite(LED4_PIN, LOW);
  
  // Connect to WiFi
  if (USE_AP_MODE) {
    setupAPMode();
  } else {
    connectToWiFi();
  }
  
  // Setup web server routes
  setupRoutes();
  
  server.begin();
  Serial.println("HTTP server started");
  printNetworkInfo();
}

// ===== WIFI SETUP =====
void connectToWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nFailed to connect to WiFi. Please check credentials.");
    Serial.println("Switching to AP mode...");
    setupAPMode();
  }
}

void setupAPMode() {
  Serial.println("Setting up Access Point mode...");
  WiFi.mode(WIFI_AP);
  WiFi.softAP(AP_SSID, AP_PASSWORD);
  
  IPAddress IP = WiFi.softAPIP();
  Serial.print("AP IP address: ");
  Serial.println(IP);
  Serial.print("SSID: ");
  Serial.println(AP_SSID);
  Serial.print("Password: ");
  Serial.println(AP_PASSWORD);
}

void printNetworkInfo() {
  if (WiFi.getMode() == WIFI_AP) {
    Serial.print("AP Mode - IP: ");
    Serial.println(WiFi.softAPIP());
  } else {
    Serial.print("Station Mode - IP: ");
    Serial.println(WiFi.localIP());
  }
}

// ===== WEB SERVER ROUTES =====
void setupRoutes() {
  // Health check / status
  server.on("/status", HTTP_GET, handleStatus);
  
  // Start motor for specific marma point
  server.on("/motor/start", HTTP_GET, handleMotorStart);
  server.on("/motor/start", HTTP_POST, handleMotorStart);
  
  // Stop specific motor
  server.on("/motor/stop", HTTP_GET, handleMotorStop);
  server.on("/motor/stop", HTTP_POST, handleMotorStop);
  
  // Stop all motors
  server.on("/motor/stop-all", HTTP_GET, handleStopAll);
  server.on("/motor/stop-all", HTTP_POST, handleStopAll);
  
  // Get motor status
  server.on("/motor/status", HTTP_GET, handleMotorStatus);
  
  // 404 handler
  server.onNotFound(handleNotFound);
}

// ===== REQUEST HANDLERS =====
void handleStatus() {
  DynamicJsonDocument doc(1024);
  doc["status"] = "ok";
  doc["device"] = "ESP32 Marma Therapy Controller";
  doc["uptime"] = millis() / 1000;
  doc["wifi_mode"] = (WiFi.getMode() == WIFI_AP) ? "AP" : "Station";
  
  if (WiFi.getMode() == WIFI_AP) {
    doc["ip"] = WiFi.softAPIP().toString();
  } else {
    doc["ip"] = WiFi.localIP().toString();
  }
  
  String response;
  serializeJson(doc, response);
  
  server.send(200, "application/json", response);
}

void handleMotorStart() {
  // Get parameters from query string or JSON body
  int pointIndex = -1;
  int durationSec = 60; // default 60 seconds
  
  if (server.method() == HTTP_GET) {
    if (server.hasArg("pointIndex")) {
      pointIndex = server.arg("pointIndex").toInt();
    } else if (server.hasArg("m")) {
      pointIndex = server.arg("m").toInt() - 1; // Convert 1-4 to 0-3
    }
    if (server.hasArg("durationSec")) {
      durationSec = server.arg("durationSec").toInt();
    } else if (server.hasArg("sec")) {
      durationSec = server.arg("sec").toInt();
    }
  } else if (server.method() == HTTP_POST) {
    // Try to parse JSON body
    if (server.hasArg("plain")) {
      DynamicJsonDocument doc(512);
      deserializeJson(doc, server.arg("plain"));
      pointIndex = doc["pointIndex"] | -1;
      durationSec = doc["durationSec"] | 60;
    }
  }
  
  // Validate point index
  if (pointIndex < 0 || pointIndex > 3) {
    server.send(400, "application/json", "{\"error\":\"Invalid point index. Use 0-3.\"}");
    return;
  }
  
  // Validate duration
  if (durationSec < 1 || durationSec > 600) {
    server.send(400, "application/json", "{\"error\":\"Duration must be 1-600 seconds.\"}");
    return;
  }
  
  // Stop any currently running motor
  stopAllMotors();
  
  // Start the requested motor
  startMotor(pointIndex, durationSec);
  
  // Send success response
  DynamicJsonDocument doc(256);
  doc["ok"] = true;
  doc["pointIndex"] = pointIndex;
  doc["durationSec"] = durationSec;
  doc["message"] = "Motor started";
  
  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

void handleMotorStop() {
  int pointIndex = -1;
  
  if (server.method() == HTTP_GET) {
    if (server.hasArg("pointIndex")) {
      pointIndex = server.arg("pointIndex").toInt();
    } else if (server.hasArg("m")) {
      pointIndex = server.arg("m").toInt() - 1;
    }
  } else if (server.method() == HTTP_POST) {
    if (server.hasArg("plain")) {
      DynamicJsonDocument doc(256);
      deserializeJson(doc, server.arg("plain"));
      pointIndex = doc["pointIndex"] | -1;
    }
  }
  
  if (pointIndex >= 0 && pointIndex < 4) {
    stopMotor(pointIndex);
    server.send(200, "application/json", "{\"ok\":true,\"message\":\"Motor stopped\"}");
  } else {
    server.send(400, "application/json", "{\"error\":\"Invalid point index\"}");
  }
}

void handleStopAll() {
  stopAllMotors();
  server.send(200, "application/json", "{\"ok\":true,\"message\":\"All motors stopped\"}");
}

void handleMotorStatus() {
  DynamicJsonDocument doc(2048);
  JsonArray motorsArray = doc.createNestedArray("motors");
  
  for (int i = 0; i < 4; i++) {
    JsonObject motor = motorsArray.createNestedObject();
    motor["pointIndex"] = i;
    motor["isRunning"] = motors[i].isRunning;
    motor["remainingMs"] = motors[i].isRunning ? 
      max(0, (long)(motors[i].duration - (millis() - motors[i].startTime))) : 0;
    motor["remainingSec"] = motor["remainingMs"].as<long>() / 1000;
  }
  
  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

void handleNotFound() {
  server.send(404, "application/json", "{\"error\":\"Not found\"}");
}

// ===== MOTOR CONTROL FUNCTIONS =====
void startMotor(int pointIndex, int durationSec) {
  if (pointIndex < 0 || pointIndex > 3) return;
  
  // Stop motor if already running
  if (motors[pointIndex].isRunning) {
    stopMotor(pointIndex);
  }
  
  // Update motor state
  motors[pointIndex].isRunning = true;
  motors[pointIndex].startTime = millis();
  motors[pointIndex].duration = durationSec * 1000; // Convert to milliseconds
  motors[pointIndex].pointIndex = pointIndex;
  
  // Activate motor based on type
  // For Servo: move to active position (e.g., 90 degrees)
  // For Stepper: start rotation
  // For Vibration motor: turn on
  
  switch(pointIndex) {
    case 0:
      motor1.write(90); // Servo to 90 degrees (adjust as needed)
      digitalWrite(LED1_PIN, HIGH);
      Serial.println("Motor 1 (Kshipra) started for " + String(durationSec) + " seconds");
      break;
    case 1:
      motor2.write(90);
      digitalWrite(LED2_PIN, HIGH);
      Serial.println("Motor 2 (Kurcha) started for " + String(durationSec) + " seconds");
      break;
    case 2:
      motor3.write(90);
      digitalWrite(LED3_PIN, HIGH);
      Serial.println("Motor 3 (Talahridaya) started for " + String(durationSec) + " seconds");
      break;
    case 3:
      motor4.write(90);
      digitalWrite(LED4_PIN, HIGH);
      Serial.println("Motor 4 (Kurchashira) started for " + String(durationSec) + " seconds");
      break;
  }
}

void stopMotor(int pointIndex) {
  if (pointIndex < 0 || pointIndex > 3) return;
  
  if (!motors[pointIndex].isRunning) return;
  
  motors[pointIndex].isRunning = false;
  motors[pointIndex].startTime = 0;
  motors[pointIndex].duration = 0;
  
  // Deactivate motor
  switch(pointIndex) {
    case 0:
      motor1.write(0); // Return to neutral position
      digitalWrite(LED1_PIN, LOW);
      Serial.println("Motor 1 stopped");
      break;
    case 1:
      motor2.write(0);
      digitalWrite(LED2_PIN, LOW);
      Serial.println("Motor 2 stopped");
      break;
    case 2:
      motor3.write(0);
      digitalWrite(LED3_PIN, LOW);
      Serial.println("Motor 3 stopped");
      break;
    case 3:
      motor4.write(0);
      digitalWrite(LED4_PIN, LOW);
      Serial.println("Motor 4 stopped");
      break;
  }
}

void stopAllMotors() {
  for (int i = 0; i < 4; i++) {
    if (motors[i].isRunning) {
      stopMotor(i);
    }
  }
  Serial.println("All motors stopped");
}

// ===== MAIN LOOP =====
void loop() {
  server.handleClient();
  
  // Check if any motor has exceeded its duration
  unsigned long currentTime = millis();
  for (int i = 0; i < 4; i++) {
    if (motors[i].isRunning) {
      unsigned long elapsed = currentTime - motors[i].startTime;
      if (elapsed >= motors[i].duration) {
        stopMotor(i);
        Serial.println("Motor " + String(i + 1) + " auto-stopped (duration completed)");
      }
    }
  }
  
  delay(10); // Small delay to prevent watchdog issues
}

