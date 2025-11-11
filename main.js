/**
 * ioBroker SwitchBot Adapter
 * 
 * Controls SwitchBot devices via SwitchBot API v1.1
 */

'use strict';

const utils = require('@iobroker/adapter-core');
const SwitchBotAPI = require('./lib/switchbot-api');
const DeviceManager = require('./lib/device-manager');
const ErrorHandler = require('./lib/error-handler');

class SwitchBot extends utils.Adapter {

    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    constructor(options) {
        super({
            ...options,
            name: 'switchbot',
        });
        
        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
        
        this.api = null;
        this.deviceManager = null;
        this.errorHandler = null;
        this.pollTimer = null;
        this.isConnected = false;
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {
        try {
            this.log.info('Starting SwitchBot adapter...');
            
            // Initialize error handler
            this.errorHandler = new ErrorHandler(this);
            
            // Validate configuration
            this.errorHandler.validateConfig(this.config);
            
            // Initialize API client
            this.api = new SwitchBotAPI({
                token: this.config.token,
                secret: this.config.secret,
                log: this.log
            });
            
            // Initialize device manager
            this.deviceManager = new DeviceManager(this, this.api, this.errorHandler);
            
            // Test API connection with retry logic
            await this.errorHandler.handleWithRetry('startup_connection', async () => {
                await this.testConnection();
            });
            
            if (this.isConnected) {
                // Discover devices with retry logic
                await this.errorHandler.handleWithRetry('device_discovery', async () => {
                    await this.deviceManager.discoverDevices();
                });
                
                // Start polling
                this.startPolling();
                
                this.log.info('SwitchBot adapter started successfully');
            }
            
        } catch (error) {
            this.errorHandler.logError(error, 'adapter startup');
            await this.errorHandler.safeExecute(async () => {
                await this.setStateAsync('info.connection', false, true);
            }, 'set connection state');
            
            if (this.errorHandler.isCriticalError(error)) {
                this.log.error('Critical error during startup. Adapter will not function properly.');
            }
        }
    }

    /**
     * Test API connection
     */
    async testConnection() {
        try {
            const devices = await this.api.getDevices();
            this.isConnected = true;
            await this.setStateAsync('info.connection', true, true);
            this.log.info(`Connected to SwitchBot API. Found ${devices.deviceList.length} physical devices and ${devices.infraredRemoteList.length} IR devices.`);
        } catch (error) {
            this.isConnected = false;
            await this.setStateAsync('info.connection', false, true);
            this.log.error(`Failed to connect to SwitchBot API: ${error.message}`);
            throw error;
        }
    }

    /**
     * Start polling for device status updates
     */
    startPolling() {
        const interval = this.config.pollInterval || 60000; // Default 60 seconds
        
        this.pollTimer = this.setInterval(() => {
            this.pollDevices();
        }, interval);
        
        this.log.info(`Started polling with interval: ${interval}ms`);
    }

    /**
     * Poll all devices for status updates
     */
    async pollDevices() {
        if (!this.isConnected) {
            return;
        }
        
        await this.errorHandler.safeExecute(async () => {
            await this.errorHandler.handleWithRetry('device_polling', async () => {
                await this.deviceManager.updateAllDeviceStates();
            });
        }, 'device polling', null);
    }

    /**
     * Is called if a subscribed state changes
     * @param {string} id - The state ID
     * @param {ioBroker.State | null | undefined} state - The state object
     */
    async onStateChange(id, state) {
        if (state && !state.ack) {
            try {
                await this.deviceManager.handleStateChange(id, state);
            } catch (error) {
                this.log.error(`Failed to handle state change for ${id}: ${error.message}`);
            }
        }
    }

    /**
     * Is called when a message is sent to the instance
     * @param {ioBroker.Message} obj - The message object
     */
    async onMessage(obj) {
        if (typeof obj === 'object' && obj.message) {
            if (obj.command === 'testConnection') {
                try {
                    const { token, secret } = obj.message;
                    
                    if (!token || !secret) {
                        this.sendTo(obj.from, obj.command, { 
                            success: false, 
                            error: 'Token and secret are required' 
                        }, obj.callback);
                        return;
                    }
                    
                    // Create temporary API instance
                    const testAPI = new SwitchBotAPI({
                        token,
                        secret,
                        log: this.log
                    });
                    
                    const devices = await testAPI.getDevices();
                    
                    this.sendTo(obj.from, obj.command, { 
                        success: true, 
                        deviceCount: devices.deviceList.length + devices.infraredRemoteList.length 
                    }, obj.callback);
                    
                } catch (error) {
                    this.sendTo(obj.from, obj.command, { 
                        success: false, 
                        error: error.message 
                    }, obj.callback);
                }
            }
        }
    }

    /**
     * Is called when adapter shuts down
     * @param {() => void} callback
     */
    onUnload(callback) {
        try {
            this.log.info('Stopping SwitchBot adapter...');
            
            if (this.pollTimer) {
                this.clearInterval(this.pollTimer);
                this.pollTimer = null;
            }
            
            if (this.errorHandler) {
                this.errorHandler.cleanup();
            }
            
            callback();
        } catch (e) {
            callback();
        }
    }
}

if (require.main !== module) {
    // Export the constructor in compact mode
    /**
     * @param {Partial<utils.AdapterOptions>} [options={}]
     */
    module.exports = (options) => new SwitchBot(options);
} else {
    // otherwise start the instance directly
    new SwitchBot();
}