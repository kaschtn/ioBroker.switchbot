# Changelog

## 0.9.0 (2025-11-11)

### Features
- Initial release of SwitchBot adapter for ioBroker
- Full support for SwitchBot API v1.1 with improved authentication
- Support for physical devices:
  - Bot (press, turn on/off)
  - Curtain/Curtain 3 (open/close, position control)
  - Lock/Lock Pro/Lock Ultra (lock/unlock)
  - Meter/Meter Plus/Outdoor Meter (temperature, humidity monitoring)
  - Plug/Plug Mini (power control, energy monitoring)
  - Color Bulb (power, brightness, color, color temperature)
  - Strip Light (power, brightness, color)
  - Humidifier (power, mode control)
  - Motion Sensor (motion detection, brightness)
  - Contact Sensor (door/window state, motion)
- Support for infrared remote devices (TV, AC, Light, Fan, etc.)
- Comprehensive error handling with automatic retry logic
- Rate limiting to respect API quotas (10,000 requests/day)
- Configurable polling interval (minimum 10 seconds)
- Multi-language admin interface (English, German)
- Connection testing functionality
- Real-time device status updates
- Proper ioBroker object structure with roles and units

### Technical Details
- HMAC-SHA256 authentication with nonce and timestamp
- Exponential backoff retry mechanism
- Safe JSON parsing and async operation handling
- Memory-efficient device state management
- Proper cleanup on adapter shutdown
- Debug logging for troubleshooting

### Requirements
- Node.js >= 18
- ioBroker >= 3.3.22
- SwitchBot app version 6.14 or later
- Valid SwitchBot API credentials (token and secret)
- Cloud Service enabled for BLE devices