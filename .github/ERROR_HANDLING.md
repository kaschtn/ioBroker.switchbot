# Error Handling Documentation

## Overview
This adapter implements comprehensive error handling following ioBroker best practices to ensure stability, proper resource cleanup, and user-friendly error messages.

## Key Features

### 1. Shutdown Flag
- **Property**: `this.isShuttingDown`
- **Purpose**: Prevents new operations during adapter shutdown
- **Usage**: Checked before polling and state changes
- **Benefit**: Prevents race conditions and "adapter not running" errors

### 2. Resource Cleanup (`onUnload`)
The `onUnload()` method implements proper cleanup:
- ✅ Sets shutdown flag immediately
- ✅ Clears all timers and intervals
- ✅ Nullifies all manager instances
- ✅ Sets connection state to false
- ✅ **Always calls callback** (critical for proper shutdown)
- ✅ Logs all cleanup steps for debugging

### 3. User-Friendly Error Messages
Instead of technical errors, users see helpful messages:
- ❌ ~~"HTTP 401"~~ 
- ✅ "Authentication failed. Please check your API token and secret."

- ❌ ~~"ECONNREFUSED"~~
- ✅ "Unable to connect to SwitchBot API. Please check your internet connection."

- ❌ ~~"ETIMEDOUT"~~
- ✅ "Connection timeout. SwitchBot API is not responding."

### 4. Defensive Programming
All methods check preconditions:
```javascript
// onStateChange checks
if (!state || state.ack || this.isShuttingDown) return;
if (!this.isConnected) { /* warn user */ return; }
if (!this.deviceManager) { /* log error */ return; }
```

### 5. Startup Error Handling
The `onReady()` method has granular error handling:
- Configuration validation errors stop initialization
- API client initialization failures logged separately
- Device discovery failures allow adapter to continue (degraded mode)
- Polling failures logged but don't crash adapter
- Connection state always set appropriately

### 6. Enhanced Test Connection
The `testConnection()` method:
- Validates API response structure
- Provides context-specific error messages
- Maps technical errors to user-friendly messages
- Properly sets connection state

### 7. Message Handling
The `onMessage()` method:
- Validates all input parameters
- Trims whitespace from credentials
- Validates data types
- Provides detailed success messages
- Maps all error types to user-friendly messages
- Warns about unknown commands

### 8. Polling Protection
The `pollDevices()` method:
- Checks shutdown flag first
- Warns if not connected (instead of failing silently)
- Uses safe execution with error handler
- Logs debug information for troubleshooting

## Error Message Categories

### Authentication Errors
- **Trigger**: HTTP 401 or authentication failures
- **Message**: "Authentication failed. Please verify your token and secret are correct."
- **User Action**: Check adapter configuration

### Network Errors
- **Trigger**: Network connectivity issues
- **Message**: "Network error. Please check your internet connection and try again."
- **User Action**: Check internet connection, firewall settings

### Timeout Errors
- **Trigger**: API doesn't respond in time
- **Message**: "Connection timeout. SwitchBot API is not responding."
- **User Action**: Wait and retry, check SwitchBot service status

### Rate Limit Errors
- **Trigger**: Too many API requests
- **Message**: "Rate limit exceeded. Please reduce command frequency or increase poll interval."
- **User Action**: Adjust poll interval in configuration

### Configuration Errors
- **Trigger**: Missing or invalid configuration
- **Message**: Specific details about what's wrong
- **User Action**: Fix adapter configuration

### Invalid Command Errors
- **Trigger**: Unsupported device command
- **Message**: "Invalid command or device configuration. Please check device settings."
- **User Action**: Verify device type supports the command

## Best Practices Implemented

### ✅ Always Call Callback
The `onUnload()` method ALWAYS calls the callback, even on error:
```javascript
onUnload(callback) {
    try {
        // ... cleanup code ...
        callback();
    } catch (error) {
        // ALWAYS call callback
        this.log.error(`Error during unload: ${error.message}`);
        callback();
    }
}
```

### ✅ Proper Timer Cleanup
```javascript
if (this.pollTimer) {
    this.clearInterval(this.pollTimer);
    this.pollTimer = null;
}
```

### ✅ Null Safety
All objects are nullified after cleanup:
```javascript
this.errorHandler = null;
this.deviceManager = null;
this.api = null;
```

### ✅ Graceful Degradation
If device discovery fails, adapter continues in degraded mode:
- Connection works
- Manual device commands still possible
- User informed of limitation

### ✅ Debug Logging
All major operations log debug information for troubleshooting:
- Configuration validation
- API client initialization
- Device manager initialization
- Cleanup steps

## Testing Error Handling

To test error handling:

1. **Invalid Credentials**: Test with wrong token/secret
2. **Network Failure**: Disconnect internet during startup
3. **Rate Limiting**: Make many rapid requests
4. **Shutdown During Poll**: Restart adapter while polling
5. **Missing Configuration**: Remove required config values

All scenarios should:
- Not crash the adapter
- Log appropriate error messages
- Set connection state correctly
- Clean up resources properly

## Visual Indicators

The adapter uses emoji indicators in logs:
- ✅ Success operations
- ❌ Failure operations
- ⚠️ Warning/degraded operations

This makes it easy to scan logs for issues.
