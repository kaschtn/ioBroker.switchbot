/**
 * SwitchBot API Client
 * 
 * Handles communication with SwitchBot API v1.1 including authentication
 */

'use strict';

const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

class SwitchBotAPI {
    constructor(options) {
        this.token = options.token;
        this.secret = options.secret;
        this.log = options.log;
        this.baseURL = 'https://api.switch-bot.com/v1.1';
        this.timeout = 10000;
    }

    /**
     * Generate authentication headers
     * @returns {object} - Authentication headers
     */
    generateAuthHeaders() {
        const timestamp = Date.now().toString();
        const nonce = uuidv4();
        const stringToSign = this.token + timestamp + nonce;
        
        // Generate HMAC-SHA256 signature
        const signature = crypto
            .createHmac('sha256', this.secret)
            .update(stringToSign)
            .digest('base64')
            .toUpperCase();
        
        this.log.debug(`Request headers: Authorization=${this.token.substring(0, 8)}..., sign=${signature.substring(0, 8)}..., t=${timestamp}, nonce=${nonce}`);
        
        return {
            'Authorization': this.token,
            'sign': signature,
            't': timestamp,
            'nonce': nonce,
            'Content-Type': 'application/json; charset=utf8'
        };
    }

    /**
     * Make API request with timeout
     * @param {string} url - Request URL
     * @param {object} options - Fetch options
     * @returns {Promise<Response>} - Fetch response
     */
    async fetchWithTimeout(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Request timeout: SwitchBot API did not respond in time');
            }
            throw error;
        }
    }

    /**
     * Handle API response
     * @param {Response} response - Fetch response
     * @returns {Promise<object>} - Parsed response data
     */
    async handleResponse(response) {
        const data = await response.json();
        
        if (!response.ok) {
            const message = data.message || `HTTP ${response.status} error`;
            this.log.error(`SwitchBot API error: ${message} (Status: ${response.status})`);
            
            // Handle specific error codes
            switch (response.status) {
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
        }
        
        return data;
    }

    /**
     * Get all devices
     * @returns {Promise<object>} - Device list response
     */
    async getDevices() {
        try {
            this.log.debug('Fetching device list...');
            const response = await this.fetchWithTimeout(`${this.baseURL}/devices`, {
                method: 'GET',
                headers: this.generateAuthHeaders()
            });
            
            const data = await this.handleResponse(response);
            
            if (data.statusCode === 100) {
                this.log.debug(`Successfully fetched ${data.body.deviceList.length} physical devices and ${data.body.infraredRemoteList.length} IR devices`);
                return data.body;
            } else {
                throw new Error(`API returned status code ${data.statusCode}: ${data.message}`);
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
            const response = await this.fetchWithTimeout(`${this.baseURL}/devices/${deviceId}/status`, {
                method: 'GET',
                headers: this.generateAuthHeaders()
            });
            
            const data = await this.handleResponse(response);
            
            if (data.statusCode === 100) {
                this.log.debug(`Successfully fetched status for device ${deviceId}`);
                return data.body;
            } else {
                throw new Error(`API returned status code ${data.statusCode}: ${data.message}`);
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
            const response = await this.fetchWithTimeout(`${this.baseURL}/devices/${deviceId}/commands`, {
                method: 'POST',
                headers: this.generateAuthHeaders(),
                body: JSON.stringify(commandData)
            });
            
            const data = await this.handleResponse(response);
            
            if (data.statusCode === 100) {
                this.log.debug(`Successfully sent command to device ${deviceId}`);
                return data;
            } else {
                throw new Error(`API returned status code ${data.statusCode}: ${data.message}`);
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
            const response = await this.fetchWithTimeout(`${this.baseURL}/scenes`, {
                method: 'GET',
                headers: this.generateAuthHeaders()
            });
            
            const data = await this.handleResponse(response);
            
            if (data.statusCode === 100) {
                this.log.debug(`Successfully fetched ${data.body.length} scenes`);
                return data.body;
            } else {
                throw new Error(`API returned status code ${data.statusCode}: ${data.message}`);
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
            const response = await this.fetchWithTimeout(`${this.baseURL}/scenes/${sceneId}/execute`, {
                method: 'POST',
                headers: this.generateAuthHeaders()
            });
            
            const data = await this.handleResponse(response);
            
            if (data.statusCode === 100) {
                this.log.debug(`Successfully executed scene ${sceneId}`);
                return data;
            } else {
                throw new Error(`API returned status code ${data.statusCode}: ${data.message}`);
            }
        } catch (error) {
            this.log.error(`Failed to execute scene ${sceneId}: ${error.message}`);
            throw error;
        }
    }
}

module.exports = SwitchBotAPI;