/**
 * Device Manager
 * 
 * Handles device discover            'Meter Pro': { 
                type: 'meterplus', 
                commands: [],
                states: { temperature: 'number', humidity: 'number', battery: 'number' }
            },
            'MeterPro(CO2)': { 
                type: 'meterproco2', 
                commands: [],
                states: { temperature: 'number', humidity: 'number', CO2: 'number', battery: 'number' }
            },
            'Outdoor Meter': { 
                type: 'outdoormeter', 
                commands: [],
                states: { temperature: 'number', humidity: 'number', battery: 'number' }
            },, and state management
 */

'use strict';

class DeviceManager {
    constructor(adapter, api, errorHandler) {
        this.adapter = adapter;
        this.api = api;
        this.errorHandler = errorHandler;
        this.log = adapter.log;
        this.devices = new Map();
        this.deviceStates = new Map();
        
        // Device type mappings
        this.deviceTypes = {
            // Physical devices
            'Bot': { 
                type: 'bot', 
                commands: ['turnOn', 'turnOff', 'press'],
                states: { power: 'boolean', battery: 'number' }
            },
            'Curtain': { 
                type: 'curtain', 
                commands: ['turnOn', 'turnOff', 'setPosition'],
                states: { slidePosition: 'number', moving: 'boolean', battery: 'number' }
            },
            'Curtain3': { 
                type: 'curtain3', 
                commands: ['turnOn', 'turnOff', 'setPosition'],
                states: { slidePosition: 'number', moving: 'boolean', battery: 'number' }
            },
            'Smart Lock': { 
                type: 'lock', 
                commands: ['lock', 'unlock'],
                states: { lockState: 'string', battery: 'number' }
            },
            'Smart Lock Pro': { 
                type: 'lockpro', 
                commands: ['lock', 'unlock'],
                states: { lockState: 'string', battery: 'number' }
            },
            'Smart Lock Ultra': { 
                type: 'lockultra', 
                commands: ['lock', 'unlock'],
                states: { lockState: 'string', battery: 'number' }
            },
            'Meter': { 
                type: 'meter', 
                commands: [],
                states: { temperature: 'number', humidity: 'number', battery: 'number' }
            },
            'MeterPlus': { 
                type: 'meterplus', 
                commands: [],
                states: { temperature: 'number', humidity: 'number', battery: 'number' }
            },
            'MeterPro': { 
                type: 'meterpro', 
                commands: [],
                states: { temperature: 'number', humidity: 'number', battery: 'number' }
            },
            'WoIOSensor': { 
                type: 'outdoormeter', 
                commands: [],
                states: { temperature: 'number', humidity: 'number', battery: 'number' }
            },
            'Plug': { 
                type: 'plug', 
                commands: ['turnOn', 'turnOff'],
                states: { power: 'boolean', voltage: 'number', weight: 'number', electricityOfDay: 'number' }
            },
            'Plug Mini (US)': { 
                type: 'plugminus', 
                commands: ['turnOn', 'turnOff'],
                states: { power: 'boolean' }
            },
            'Plug Mini (JP)': { 
                type: 'plugminijp', 
                commands: ['turnOn', 'turnOff'],
                states: { power: 'boolean' }
            },
            'Plug Mini (EU)': { 
                type: 'plugminieu', 
                commands: ['turnOn', 'turnOff'],
                states: { power: 'boolean' }
            },
            'Color Bulb': { 
                type: 'colorbulb', 
                commands: ['turnOn', 'turnOff', 'setBrightness', 'setColor', 'setColorTemperature'],
                states: { power: 'boolean', brightness: 'number', color: 'string', colorTemperature: 'number' }
            },
            'Strip Light': { 
                type: 'striplight', 
                commands: ['turnOn', 'turnOff', 'setBrightness', 'setColor'],
                states: { power: 'boolean', brightness: 'number', color: 'string' }
            },
            'Humidifier': { 
                type: 'humidifier', 
                commands: ['turnOn', 'turnOff', 'setMode'],
                states: { power: 'boolean', humidity: 'number', temperature: 'number', nebulizationEfficiency: 'number', auto: 'boolean', childLock: 'boolean', sound: 'boolean', lackWater: 'boolean' }
            },
            'Motion Sensor': { 
                type: 'motionsensor', 
                commands: [],
                states: { moveDetected: 'boolean', brightness: 'string', battery: 'number' }
            },
            'Contact Sensor': { 
                type: 'contactsensor', 
                commands: [],
                states: { openState: 'string', moveDetected: 'boolean', brightness: 'string', battery: 'number' }
            }
        };
    }

    /**
     * Discover and create all devices
     */
    async discoverDevices() {
        try {
            this.log.info('Starting device discovery...');
            const deviceData = await this.api.getDevices();
            
            // Process physical devices
            for (const device of deviceData.deviceList) {
                await this.createDevice(device, 'physical');
            }
            
            // Process IR remote devices
            for (const device of deviceData.infraredRemoteList) {
                await this.createDevice(device, 'infrared');
            }
            
            this.log.info(`Device discovery completed. Found ${this.devices.size} devices.`);
            
        } catch (error) {
            this.log.error(`Device discovery failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Create device objects and states
     */
    async createDevice(deviceInfo, category) {
        const deviceId = deviceInfo.deviceId;
        const deviceName = deviceInfo.deviceName || deviceId;
        const deviceType = deviceInfo.deviceType || deviceInfo.remoteType;
        
        this.log.debug(`Creating device: ${deviceName} (${deviceType})`);
        
        // Store device info
        this.devices.set(deviceId, {
            ...deviceInfo,
            category,
            type: deviceType
        });
        
        // Create device channel
        await this.adapter.setObjectNotExistsAsync(deviceId, {
            type: 'channel',
            common: {
                name: deviceName,
                type: deviceType
            },
            native: deviceInfo
        });
        
        // Create device states based on type
        if (category === 'physical') {
            await this.createPhysicalDeviceStates(deviceId, deviceType);
        } else {
            await this.createInfraredDeviceStates(deviceId, deviceType);
        }
        
        // Subscribe to state changes for controllable devices
        if (this.hasControllableStates(deviceType)) {
            this.adapter.subscribeStates(`${deviceId}.*`);
        }
    }

    /**
     * Create states for physical devices
     */
    async createPhysicalDeviceStates(deviceId, deviceType) {
        const typeInfo = this.deviceTypes[deviceType];
        if (!typeInfo) {
            this.log.warn(`Unknown device type: ${deviceType}. Creating basic states.`);
            return;
        }
        
        // Create common info states
        await this.adapter.setObjectNotExistsAsync(`${deviceId}.info`, {
            type: 'channel',
            common: { name: 'Device Information' },
            native: {}
        });
        
        await this.adapter.setObjectNotExistsAsync(`${deviceId}.info.deviceType`, {
            type: 'state',
            common: {
                name: 'Device Type',
                type: 'string',
                role: 'info.name',
                read: true,
                write: false
            },
            native: {}
        });
        
        await this.adapter.setStateAsync(`${deviceId}.info.deviceType`, deviceType, true);
        
        // Create status states based on device type
        for (const [stateName, stateType] of Object.entries(typeInfo.states)) {
            await this.createDeviceState(deviceId, stateName, stateType, false);
        }
        
        // Create command states for controllable devices
        for (const command of typeInfo.commands) {
            await this.createCommandState(deviceId, command);
        }
    }

    /**
     * Create states for infrared devices
     */
    async createInfraredDeviceStates(deviceId, deviceType) {
        // Create basic info for IR devices
        await this.adapter.setObjectNotExistsAsync(`${deviceId}.info`, {
            type: 'channel',
            common: { name: 'Device Information' },
            native: {}
        });
        
        await this.adapter.setObjectNotExistsAsync(`${deviceId}.info.remoteType`, {
            type: 'state',
            common: {
                name: 'Remote Type',
                type: 'string',
                role: 'info.name',
                read: true,
                write: false
            },
            native: {}
        });
        
        await this.adapter.setStateAsync(`${deviceId}.info.remoteType`, deviceType, true);
        
        // Create basic control state for IR devices
        await this.adapter.setObjectNotExistsAsync(`${deviceId}.command`, {
            type: 'state',
            common: {
                name: 'Send Command',
                type: 'string',
                role: 'text',
                read: false,
                write: true,
                desc: 'Send IR command (JSON format)'
            },
            native: {}
        });
        
        this.adapter.subscribeStates(`${deviceId}.command`);
    }

    /**
     * Create device state
     */
    async createDeviceState(deviceId, stateName, stateType, writable = false) {
        const stateId = `${deviceId}.${stateName}`;
        
        const roleMap = {
            'power': 'switch.power',
            'temperature': 'value.temperature',
            'humidity': 'value.humidity',
            'battery': 'value.battery',
            'brightness': 'level.dimmer',
            'slidePosition': 'level.blind',
            'lockState': 'sensor.lock',
            'moveDetected': 'sensor.motion',
            'openState': 'sensor.door',
            'CO2': 'value.co2'
        };
        
        await this.adapter.setObjectNotExistsAsync(stateId, {
            type: 'state',
            common: {
                name: stateName,
                type: stateType,
                role: roleMap[stateName] || 'state',
                read: true,
                write: writable,
                unit: this.getStateUnit(stateName)
            },
            native: {}
        });
    }

    /**
     * Create command state
     */
    async createCommandState(deviceId, command) {
        const stateId = `${deviceId}.${command}`;
        
        await this.adapter.setObjectNotExistsAsync(stateId, {
            type: 'state',
            common: {
                name: command,
                type: 'mixed',
                role: 'button',
                read: false,
                write: true,
                desc: `Execute ${command} command`
            },
            native: {}
        });
    }

    /**
     * Get unit for state
     */
    getStateUnit(stateName) {
        const units = {
            'temperature': '°C',
            'humidity': '%',
            'battery': '%',
            'brightness': '%',
            'slidePosition': '%',
            'voltage': 'V',
            'weight': 'kg',
            'electricityOfDay': 'kWh',
            'CO2': 'ppm'
        };
        return units[stateName] || '';
    }

    /**
     * Check if device type has controllable states
     */
    hasControllableStates(deviceType) {
        const typeInfo = this.deviceTypes[deviceType];
        return typeInfo && typeInfo.commands.length > 0;
    }

    /**
     * Update all device states
     */
    async updateAllDeviceStates() {
        const physicalDevices = Array.from(this.devices.values()).filter(d => d.category === 'physical');
        
        for (const device of physicalDevices) {
            await this.errorHandler.safeExecute(async () => {
                await this.updateDeviceState(device.deviceId);
            }, `update device ${device.deviceId}`);
        }
    }

    /**
     * Update device state
     */
    async updateDeviceState(deviceId) {
        return await this.errorHandler.handleRateLimit(async () => {
            const status = await this.api.getDeviceStatus(deviceId);
            
            for (const [key, value] of Object.entries(status)) {
                const stateId = `${deviceId}.${key}`;
                await this.adapter.setStateAsync(stateId, value, true);
            }
        });
    }

    /**
     * Handle state changes
     */
    async handleStateChange(id, state) {
        const parts = id.split('.');
        if (parts.length < 3) return;
        
        const deviceId = parts[parts.length - 2];
        const stateName = parts[parts.length - 1];
        
        const device = this.devices.get(deviceId);
        if (!device) {
            this.log.warn(`Unknown device: ${deviceId}`);
            return;
        }
        
        if (device.category === 'infrared') {
            await this.handleInfraredCommand(deviceId, stateName, state.val);
        } else {
            await this.handlePhysicalDeviceCommand(deviceId, stateName, state.val);
        }
    }

    /**
     * Handle physical device commands
     */
    async handlePhysicalDeviceCommand(deviceId, command, value) {
        try {
            let commandData;
            
            switch (command) {
                case 'turnOn':
                    commandData = { command: 'turnOn', parameter: 'default' };
                    break;
                case 'turnOff':
                    commandData = { command: 'turnOff', parameter: 'default' };
                    break;
                case 'press':
                    commandData = { command: 'press', parameter: 'default' };
                    break;
                case 'setPosition':
                    commandData = { command: 'setPosition', parameter: `0,ff,${value}` };
                    break;
                case 'setBrightness':
                    commandData = { command: 'setBrightness', parameter: value };
                    break;
                case 'setColor':
                    commandData = { command: 'setColor', parameter: value };
                    break;
                case 'setColorTemperature':
                    commandData = { command: 'setColorTemperature', parameter: value };
                    break;
                case 'lock':
                    commandData = { command: 'lock', parameter: 'default' };
                    break;
                case 'unlock':
                    commandData = { command: 'unlock', parameter: 'default' };
                    break;
                default:
                    this.log.warn(`Unknown command: ${command} for device ${deviceId}`);
                    return;
            }
            
            await this.api.sendCommand(deviceId, commandData);
            this.log.info(`Command ${command} sent to device ${deviceId}`);
            
            // Update device state after command
            setTimeout(() => {
                this.updateDeviceState(deviceId).catch(err => 
                    this.log.debug(`Failed to update device state after command: ${err.message}`)
                );
            }, 2000);
            
        } catch (error) {
            this.log.error(`Failed to send command ${command} to device ${deviceId}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Handle infrared device commands
     */
    async handleInfraredCommand(deviceId, stateName, value) {
        if (stateName !== 'command') return;
        
        try {
            let commandData;
            if (typeof value === 'string') {
                try {
                    commandData = JSON.parse(value);
                } catch {
                    commandData = { command: value, parameter: 'default' };
                }
            } else {
                commandData = value;
            }
            
            await this.api.sendCommand(deviceId, commandData);
            this.log.info(`IR command sent to device ${deviceId}: ${JSON.stringify(commandData)}`);
            
        } catch (error) {
            this.log.error(`Failed to send IR command to device ${deviceId}: ${error.message}`);
            throw error;
        }
    }
}

module.exports = DeviceManager;