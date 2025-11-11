/**
 * SwitchBot API Client
 * 
 * Handles communication with SwitchBot API v1.1 including authentication
 */

'use strict';

const axios = require('axios');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

class SwitchBotAPI {
    constructor(options) {
        this.token = options.token;
        this.secret = options.secret;
        this.log = options.log;
        this.baseURL = 'https://api.switch-bot.com';
        this.version = 'v1.1';
        
        // Create axios instance
        this.client = axios.create({
            baseURL: `${this.baseURL}/${this.version}`,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json; charset=utf8'
            }
        });
        
        // Add request interceptor for authentication
        this.client.interceptors.request.use(this.addAuthHeaders.bind(this));
        
        // Add response interceptor for error handling
        this.client.interceptors.response.use(
            response => response,
            error => this.handleError(error)
        );
    }

    /**
     * Generate authentication headers
     * @param {object} config - Axios request config
     * @returns {object} - Modified config with auth headers
     */
    addAuthHeaders(config) {
        const timestamp = Date.now().toString();
        const nonce = uuidv4();
        const stringToSign = this.token + timestamp + nonce;
        
        // Generate HMAC-SHA256 signature
        const signature = crypto
            .createHmac('sha256', this.secret)
            .update(stringToSign)
            .digest('base64')
            .toUpperCase();
        
        config.headers.Authorization = this.token;
        config.headers.sign = signature;
        config.headers.t = timestamp;
        config.headers.nonce = nonce;
        
        this.log.debug(`Request headers: Authorization=${this.token.substring(0, 8)}..., sign=${signature.substring(0, 8)}..., t=${timestamp}, nonce=${nonce}`);
        
        return config;
    }

    /**
     * Handle API errors
     * @param {object} error - Axios error object
     * @returns {Promise} - Rejected promise with formatted error
     */
    handleError(error) {
        if (error.response) {
            const { status, data } = error.response;
            const message = data.message || `HTTP ${status} error`;
            
            this.log.error(`SwitchBot API error: ${message} (Status: ${status})`);
            
            // Handle specific error codes
            switch (status) {
                case 401:
                    throw new Error('Authentication failed. Please check your token and secret.');
                case 403:
                    throw new Error('Access forbidden. Check your API permissions.');
                case 429:
                    throw new Error('Rate limit exceeded. Please reduce request frequency.');
                case 422:
                    throw new Error('Invalid request. Check your device ID or command.');
                default:
                    throw new Error(`API error: ${message}`);
            }
        } else if (error.request) {
            this.log.error('Network error: No response from SwitchBot API');
            throw new Error('Network error: Unable to connect to SwitchBot API');
        } else {
            this.log.error(`Request error: ${error.message}`);
            throw new Error(`Request error: ${error.message}`);
        }
    }

    /**
     * Get all devices
     * @returns {Promise<object>} - Device list response
     */
    async getDevices() {
        try {
            this.log.debug('Fetching device list...');
            const response = await this.client.get('/devices');
            
            if (response.data.statusCode === 100) {
                this.log.debug(`Successfully fetched ${response.data.body.deviceList.length} physical devices and ${response.data.body.infraredRemoteList.length} IR devices`);
                return response.data.body;
            } else {
                throw new Error(`API returned status code ${response.data.statusCode}: ${response.data.message}`);
            }
        } catch (error) {
            this.log.error(`Failed to get devices: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get device status
     * @param {string} deviceId - Device ID
     * @returns {Promise<object>} - Device status response
     */
    async getDeviceStatus(deviceId) {
        try {
            this.log.debug(`Fetching status for device ${deviceId}...`);
            const response = await this.client.get(`/devices/${deviceId}/status`);
            
            if (response.data.statusCode === 100) {
                this.log.debug(`Successfully fetched status for device ${deviceId}`);
                return response.data.body;
            } else {
                throw new Error(`API returned status code ${response.data.statusCode}: ${response.data.message}`);
            }
        } catch (error) {
            this.log.error(`Failed to get status for device ${deviceId}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Send device command
     * @param {string} deviceId - Device ID
     * @param {object} commandData - Command data
     * @returns {Promise<object>} - Command response
     */
    async sendCommand(deviceId, commandData) {
        try {
            this.log.debug(`Sending command to device ${deviceId}: ${JSON.stringify(commandData)}`);
            const response = await this.client.post(`/devices/${deviceId}/commands`, commandData);
            
            if (response.data.statusCode === 100) {
                this.log.debug(`Successfully sent command to device ${deviceId}`);
                return response.data;
            } else {
                throw new Error(`API returned status code ${response.data.statusCode}: ${response.data.message}`);
            }
        } catch (error) {
            this.log.error(`Failed to send command to device ${deviceId}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get scenes
     * @returns {Promise<object>} - Scenes list response
     */
    async getScenes() {
        try {
            this.log.debug('Fetching scenes list...');
            const response = await this.client.get('/scenes');
            
            if (response.data.statusCode === 100) {
                this.log.debug(`Successfully fetched ${response.data.body.length} scenes`);
                return response.data.body;
            } else {
                throw new Error(`API returned status code ${response.data.statusCode}: ${response.data.message}`);
            }
        } catch (error) {
            this.log.error(`Failed to get scenes: ${error.message}`);
            throw error;
        }
    }

    /**
     * Execute scene
     * @param {string} sceneId - Scene ID
     * @returns {Promise<object>} - Execution response
     */
    async executeScene(sceneId) {
        try {
            this.log.debug(`Executing scene ${sceneId}...`);
            const response = await this.client.post(`/scenes/${sceneId}/execute`);
            
            if (response.data.statusCode === 100) {
                this.log.debug(`Successfully executed scene ${sceneId}`);
                return response.data;
            } else {
                throw new Error(`API returned status code ${response.data.statusCode}: ${response.data.message}`);
            }
        } catch (error) {
            this.log.error(`Failed to execute scene ${sceneId}: ${error.message}`);
            throw error;
        }
    }
}

module.exports = SwitchBotAPI;