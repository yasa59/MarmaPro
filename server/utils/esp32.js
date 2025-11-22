// server/utils/esp32.js
const axios = require('axios');

const base = process.env.ESP32_BASE_URL || 'http://192.168.4.1';

/**
 * Start a motor for a specific marma point
 * @param {number} pointIndex - 0-3 for marma points
 * @param {number} durationSec - Duration in seconds
 */
async function startMotor(pointIndex, durationSec) {
  if (!base) {
    throw new Error('ESP32_BASE_URL not configured');
  }
  
  try {
    const response = await axios.get(`${base}/motor/start`, {
      params: {
        pointIndex: pointIndex,
        durationSec: durationSec
      },
      timeout: 5000
    });
    return { ok: true, data: response.data };
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('ESP32 startMotor error:', error.message);
    }
    return { ok: false, error: error.message };
  }
}

/**
 * Stop a specific motor
 * @param {number} pointIndex - 0-3 for marma points
 */
async function stopMotor(pointIndex) {
  if (!base) {
    throw new Error('ESP32_BASE_URL not configured');
  }
  
  try {
    const response = await axios.get(`${base}/motor/stop`, {
      params: { pointIndex: pointIndex },
      timeout: 5000
    });
    return { ok: true, data: response.data };
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('ESP32 stopMotor error:', error.message);
    }
    return { ok: false, error: error.message };
  }
}

/**
 * Stop all motors
 */
async function stopAll() {
  if (!base) {
    throw new Error('ESP32_BASE_URL not configured');
  }
  
  try {
    const response = await axios.get(`${base}/motor/stop-all`, {
      timeout: 5000
    });
    return { ok: true, data: response.data };
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('ESP32 stopAll error:', error.message);
    }
    return { ok: false, error: error.message };
  }
}

/**
 * Get ESP32 status and motor states
 */
async function getStatus() {
  if (!base) {
    throw new Error('ESP32_BASE_URL not configured');
  }
  
  try {
    const response = await axios.get(`${base}/status`, {
      timeout: 5000
    });
    return { ok: true, data: response.data };
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('ESP32 getStatus error:', error.message);
    }
    return { ok: false, error: error.message };
  }
}

/**
 * Get motor status (which motors are running)
 */
async function getMotorStatus() {
  if (!base) {
    throw new Error('ESP32_BASE_URL not configured');
  }
  
  try {
    const response = await axios.get(`${base}/motor/status`, {
      timeout: 5000
    });
    return { ok: true, data: response.data };
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('ESP32 getMotorStatus error:', error.message);
    }
    return { ok: false, error: error.message };
  }
}

module.exports = {
  startMotor,
  stopMotor,
  stopAll,
  getStatus,
  getMotorStatus,
};
