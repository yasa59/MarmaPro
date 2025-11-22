# 🚀 ESP32 IoT Integration Guide for Marma Therapy

Complete guide to integrate ESP32 hardware with your iMarma Therapy web application.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Hardware Requirements](#hardware-requirements)
3. [Software Setup](#software-setup)
4. [Wiring Diagram](#wiring-diagram)
5. [ESP32 Code Setup](#esp32-code-setup)
6. [Backend Configuration](#backend-configuration)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)
9. [Marma Point Mapping](#marma-point-mapping)

---

## 🎯 Overview

This integration allows patients to control their therapy session through the web app. When a doctor creates a therapy plan with marma points and durations, the patient can:

1. View their therapy plan on the web app
2. Click "Start" button for any marma point
3. ESP32 receives the command and activates the corresponding motor
4. Motor runs for the specified duration
5. Patient can stop manually or wait for auto-stop

**Flow:**
```
Web App → Backend API → ESP32 → Motor Control → Therapy
```

---

## 🔧 Hardware Requirements

### Required Components:

1. **ESP32 Development Board** (ESP32-WROOM-32 or similar)
   - WiFi capability
   - Multiple GPIO pins
   - 3.3V logic

2. **Motors/Actuators** (Choose one type):
   - **Option A: Servo Motors** (4x SG90 or similar)
     - Good for precise positioning
     - 5V power supply needed
   - **Option B: Vibration Motors** (4x small DC motors)
     - Good for massage therapy
     - Requires motor driver (L298N or similar)
   - **Option C: Stepper Motors** (4x small steppers)
     - Most precise control
     - Requires stepper driver (A4988 or similar)

3. **Power Supply**
   - 5V/2A for servos
   - 12V/2A for steppers/vibration motors
   - USB power for ESP32 (or integrated power)

4. **Optional Components:**
   - 4x LEDs (for status indicators)
   - 4x 220Ω resistors (for LEDs)
   - Breadboard and jumper wires
   - Motor driver boards (if using DC/stepper motors)

### Recommended ESP32 Board:
- **ESP32 DevKit V1** (most common)
- **ESP32-WROOM-32** (built-in antenna)
- Any ESP32 with WiFi

---

## 💻 Software Setup

### 1. Install Arduino IDE

1. Download from: https://www.arduino.cc/en/software
2. Install Arduino IDE
3. Open Arduino IDE

### 2. Install ESP32 Board Support

1. Go to **File → Preferences**
2. In "Additional Board Manager URLs", add:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. Go to **Tools → Board → Boards Manager**
4. Search for "ESP32"
5. Install "esp32 by Espressif Systems"
6. Select your board: **Tools → Board → ESP32 Arduino → ESP32 Dev Module**

### 3. Install Required Libraries

Go to **Sketch → Include Library → Manage Libraries** and install:

1. **ArduinoJson** (by Benoit Blanchon)
   - Version 6.x or 7.x
   - Used for JSON parsing

2. **ESP32Servo** (if using servo motors)
   - Built-in with ESP32 board support

3. **WiFi** (built-in, no installation needed)

### 4. Download the Code

1. Copy `esp32/marma_therapy_controller.ino` to your Arduino sketch folder
2. Open it in Arduino IDE

---

## 🔌 Wiring Diagram

### For Servo Motors:

```
ESP32          Servo Motors
------         -----------
GPIO 2   →     Servo 1 (Signal - Orange/Yellow wire)
GPIO 4   →     Servo 2 (Signal)
GPIO 5   →     Servo 3 (Signal)
GPIO 18  →     Servo 4 (Signal)

5V       →     All Servos (Red wire - Power)
GND      →     All Servos (Brown/Black wire - Ground)

Optional LEDs:
GPIO 19  →     LED1 (via 220Ω resistor) → GND
GPIO 21  →     LED2 (via 220Ω resistor) → GND
GPIO 22  →     LED3 (via 220Ω resistor) → GND
GPIO 23  →     LED4 (via 220Ω resistor) → GND
```

### For Vibration Motors (with L298N driver):

```
ESP32          L298N Driver          Motors
------         -----------           ------
GPIO 2   →     IN1                   Motor 1
GPIO 4   →     IN2                   Motor 2
GPIO 5   →     IN3                   Motor 3
GPIO 18  →     IN4                   Motor 4

12V      →     VCC (Power)
GND      →     GND (Ground)

L298N OUT1/OUT2 → Motor 1
L298N OUT3/OUT4 → Motor 2
(etc.)
```

**⚠️ Important:**
- Servos need 5V power (can use ESP32 5V pin for small servos)
- For multiple servos, use external 5V power supply
- Connect all grounds together (ESP32 GND, servo GND, power supply GND)

---

## 📝 ESP32 Code Setup

### Step 1: Configure WiFi

Open `marma_therapy_controller.ino` and update these lines:

```cpp
const char* ssid = "YOUR_WIFI_SSID";        // Your WiFi name
const char* password = "YOUR_WIFI_PASSWORD"; // Your WiFi password
```

**OR** use Access Point mode (ESP32 creates its own WiFi):

```cpp
#define USE_AP_MODE true
const char* AP_SSID = "MarmaTherapy_ESP32";
const char* AP_PASSWORD = "marma1234";
```

### Step 2: Configure Motor Pins (if different)

If your wiring uses different GPIO pins, update:

```cpp
#define MOTOR1_PIN 2   // Change if needed
#define MOTOR2_PIN 4   // Change if needed
#define MOTOR3_PIN 5   // Change if needed
#define MOTOR4_PIN 18  // Change if needed
```

### Step 3: Adjust Motor Control (if not using servos)

If using vibration motors or steppers, modify the `startMotor()` function:

**For Vibration Motors:**
```cpp
case 0:
  digitalWrite(MOTOR1_PIN, HIGH); // Turn on motor
  break;
```

**For Stepper Motors:**
```cpp
case 0:
  stepper1.step(100); // Move stepper
  break;
```

### Step 4: Upload Code

1. Connect ESP32 to computer via USB
2. Select correct port: **Tools → Port → COM3** (or your port)
3. Click **Upload** button (→)
4. Wait for "Done uploading" message
5. Open Serial Monitor: **Tools → Serial Monitor** (set to 115200 baud)

### Step 5: Get ESP32 IP Address

After upload, check Serial Monitor. You'll see:
```
WiFi connected!
IP address: 192.168.1.100
```

**Save this IP address** - you'll need it for backend configuration.

---

## ⚙️ Backend Configuration

### Step 1: Set Environment Variable

Add ESP32 IP address to your backend environment:

**For local development (.env file):**
```env
ESP32_BASE_URL=http://192.168.1.100
```

**For production (Vercel/Railway):**
1. Go to your project settings
2. Add environment variable:
   - Key: `ESP32_BASE_URL`
   - Value: `http://YOUR_ESP32_IP` (e.g., `http://192.168.1.100`)

**⚠️ Important Notes:**
- ESP32 and backend server must be on the **same network**
- For production, ESP32 needs a **static IP** or use **port forwarding**
- Consider using **MQTT** or **WebSocket** for remote connections

### Step 2: Test Backend Connection

The backend will automatically forward commands to ESP32 when:
- `ESP32_BASE_URL` is set
- Patient clicks "Start" button
- API endpoint `/api/sessions/:id/control` is called

---

## 🧪 Testing

### Test 1: ESP32 Status

Open browser and go to:
```
http://YOUR_ESP32_IP/status
```

You should see:
```json
{
  "status": "ok",
  "device": "ESP32 Marma Therapy Controller",
  "uptime": 123,
  "wifi_mode": "Station",
  "ip": "192.168.1.100"
}
```

### Test 2: Manual Motor Control

**Start Motor 1 for 30 seconds:**
```
http://YOUR_ESP32_IP/motor/start?pointIndex=0&durationSec=30
```

**Stop Motor 1:**
```
http://YOUR_ESP32_IP/motor/stop?pointIndex=0
```

**Stop All Motors:**
```
http://YOUR_ESP32_IP/motor/stop-all
```

**Check Motor Status:**
```
http://YOUR_ESP32_IP/motor/status
```

### Test 3: Web App Integration

1. Login as a patient
2. Go to a therapy session
3. Click "Start" button on any marma point
4. ESP32 should activate the corresponding motor
5. Motor should run for the duration specified by doctor
6. Click "Stop" to stop manually

---

## 🗺️ Marma Point Mapping

The system maps marma points from foot photos to ESP32 motors:

| Marma Point | Point Index | Motor | GPIO Pin | Location |
|------------|-------------|-------|----------|----------|
| **Kshipra Marma** | 0 | Motor 1 | GPIO 2 | Between first and second toe |
| **Kurcha Marma** | 1 | Motor 2 | GPIO 4 | Heel region |
| **Talahridaya Marma** | 2 | Motor 3 | GPIO 5 | Sole center |
| **Kurchashira Marma** | 3 | Motor 4 | GPIO 18 | Achilles area |

**How it works:**
1. Doctor uploads foot photo → AI detects 4 marma points
2. Doctor creates therapy plan with durations for each point
3. Patient sees therapy plan with "Start" buttons
4. When patient clicks "Start" on "Marma 1":
   - Frontend calls: `POST /api/sessions/:id/control` with `{pointIndex: 0, action: "start"}`
   - Backend forwards to: `GET http://ESP32_IP/motor/start?pointIndex=0&durationSec=60`
   - ESP32 activates Motor 1 (GPIO 2) for 60 seconds

---

## 🔍 Troubleshooting

### Problem: ESP32 won't connect to WiFi

**Solutions:**
- Check WiFi credentials in code
- Ensure 2.4GHz WiFi (ESP32 doesn't support 5GHz)
- Move ESP32 closer to router
- Use Access Point mode instead

### Problem: Can't access ESP32 web server

**Solutions:**
- Check IP address in Serial Monitor
- Ensure ESP32 and computer are on same network
- Disable firewall temporarily
- Try pinging ESP32: `ping 192.168.1.100`

### Problem: Motors not moving

**Solutions:**
- Check wiring connections
- Verify power supply (servos need 5V, steppers need 12V)
- Test motors directly (bypass ESP32)
- Check Serial Monitor for error messages
- Verify GPIO pins in code match wiring

### Problem: Backend can't reach ESP32

**Solutions:**
- Verify `ESP32_BASE_URL` environment variable
- Check ESP32 IP address hasn't changed (use static IP)
- Test ESP32 status endpoint manually
- Check backend logs for error messages

### Problem: Motor runs but stops immediately

**Solutions:**
- Check duration is being sent correctly
- Verify motor control code in `startMotor()` function
- Check power supply (low power can cause issues)

### Problem: Multiple motors running at once

**Solutions:**
- Code should stop previous motor before starting new one
- Check `stopAllMotors()` is being called
- Verify only one "Start" button is clicked at a time

---

## 📡 Advanced: Remote Access

### Option 1: Static IP + Port Forwarding

1. Set ESP32 to static IP in router settings
2. Forward port 80 to ESP32 IP
3. Use public IP: `http://YOUR_PUBLIC_IP:80`

### Option 2: MQTT Broker

Use MQTT for better remote communication:
- ESP32 subscribes to MQTT topics
- Backend publishes commands to MQTT
- Works over internet (not just local network)

### Option 3: WebSocket Server

Implement WebSocket on ESP32:
- Real-time bidirectional communication
- Lower latency
- Better for real-time control

---

## 📚 Additional Resources

- **ESP32 Documentation**: https://docs.espressif.com/projects/esp-idf/en/latest/esp32/
- **ArduinoJson Library**: https://arduinojson.org/
- **ESP32 Servo Library**: https://github.com/madhephaestus/ESP32Servo
- **WiFi Configuration**: https://randomnerdtutorials.com/esp32-wi-fi-manager-asyncwebserver/

---

## ✅ Checklist

Before going live:

- [ ] ESP32 code uploaded and running
- [ ] WiFi connected and IP address noted
- [ ] All motors wired and tested
- [ ] Backend `ESP32_BASE_URL` configured
- [ ] Tested manual motor control via browser
- [ ] Tested web app integration
- [ ] Verified all 4 marma points work
- [ ] Tested start/stop functionality
- [ ] Tested auto-stop after duration
- [ ] Checked Serial Monitor for errors

---

## 🎉 You're Ready!

Your ESP32 is now integrated with the iMarma Therapy system. Patients can control their therapy sessions directly from the web app!

**Need Help?** Check the troubleshooting section or review the code comments in `marma_therapy_controller.ino`.

