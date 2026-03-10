/**
 * Bluetooth Low Energy (BLE) Manager for Flue Gas Analysers
 * 
 * Uses the Web Bluetooth API to discover, connect to, and read data from
 * BLE-enabled flue gas analysers (Kane, TPI, Anton, Testo).
 * 
 * IMPORTANT: Web Bluetooth is NOT supported on iOS Safari.
 * Supported: Chrome (Android, macOS, Windows, Linux, ChromeOS), Edge, Opera, Samsung Internet.
 * 
 * Each manufacturer uses proprietary GATT service UUIDs and data encoding.
 * This manager implements a generic discovery + known manufacturer profiles approach.
 */

// Known manufacturer BLE device name prefixes
const MANUFACTURER_PREFIXES = [
  { prefix: 'KANE', manufacturer: 'kane' },
  { prefix: 'Kane', manufacturer: 'kane' },
  { prefix: 'TPI', manufacturer: 'tpi' },
  { prefix: 'DC710', manufacturer: 'tpi' },
  { prefix: 'DC711', manufacturer: 'tpi' },
  { prefix: 'Anton', manufacturer: 'anton' },
  { prefix: 'Sprint', manufacturer: 'anton' },
  { prefix: 'testo', manufacturer: 'testo' },
  { prefix: 'Testo', manufacturer: 'testo' },
];

// Known/common BLE service UUIDs for flue gas analysers
// These are educated guesses based on common BLE patterns — real UUIDs
// would come from manufacturer partnership/NDA documentation
const KNOWN_SERVICES = {
  // Standard BLE services
  GENERIC_ACCESS: '00001800-0000-1000-8000-00805f9b34fb',
  GENERIC_ATTRIBUTE: '00001801-0000-1000-8000-00805f9b34fb',
  DEVICE_INFORMATION: '0000180a-0000-1000-8000-00805f9b34fb',
  BATTERY: '0000180f-0000-1000-8000-00805f9b34fb',
  // Nordic UART Service (commonly used by embedded BLE devices for serial data)
  NORDIC_UART: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
  NORDIC_UART_TX: '6e400002-b5a3-f393-e0a9-e50e24dcca9e', // Write to device
  NORDIC_UART_RX: '6e400003-b5a3-f393-e0a9-e50e24dcca9e', // Receive from device
};

// Standard Device Information characteristics
const DEVICE_INFO_CHARS = {
  MANUFACTURER_NAME: '00002a29-0000-1000-8000-00805f9b34fb',
  MODEL_NUMBER: '00002a24-0000-1000-8000-00805f9b34fb',
  SERIAL_NUMBER: '00002a25-0000-1000-8000-00805f9b34fb',
  FIRMWARE_REVISION: '00002a26-0000-1000-8000-00805f9b34fb',
  HARDWARE_REVISION: '00002a27-0000-1000-8000-00805f9b34fb',
  SOFTWARE_REVISION: '00002a28-0000-1000-8000-00805f9b34fb',
};

/**
 * Check if Web Bluetooth API is available in this browser
 */
export function isBleSupported() {
  return !!(navigator?.bluetooth);
}

/**
 * Get a human-readable reason why BLE is not supported
 */
export function getBleUnsupportedReason() {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) {
    return 'iOS Safari does not support Web Bluetooth. Please use Chrome on Android, or a desktop browser (Chrome, Edge).';
  }
  if (/firefox/.test(ua)) {
    return 'Firefox does not support Web Bluetooth. Please use Chrome or Edge.';
  }
  if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
    return 'Web Bluetooth requires a secure connection (HTTPS). Please access this page over HTTPS.';
  }
  return 'Your browser does not support Web Bluetooth. Please use Chrome, Edge, or Opera.';
}

/**
 * Identify manufacturer from device name
 */
export function identifyManufacturer(deviceName) {
  if (!deviceName) return 'unknown';
  for (const { prefix, manufacturer } of MANUFACTURER_PREFIXES) {
    if (deviceName.startsWith(prefix)) return manufacturer;
  }
  return 'unknown';
}

/**
 * BLE Connection Manager class
 * Manages the lifecycle of a BLE connection to a flue gas analyser
 */
export class BleConnectionManager {
  constructor() {
    this.device = null;
    this.server = null;
    this.services = [];
    this.characteristics = new Map();
    this.notifyCallbacks = new Map();
    this.connectionState = 'disconnected'; // disconnected | scanning | connecting | connected | error
    this.deviceInfo = {};
    this.rawDataBuffer = '';
    this.onStateChange = null;
    this.onDataReceived = null;
    this.onRawMessage = null;
  }

  /**
   * Update connection state and notify listeners
   */
  _setState(state) {
    this.connectionState = state;
    if (this.onStateChange) {
      this.onStateChange(state, this.device, this.deviceInfo);
    }
  }

  /**
   * Scan for and select a BLE flue gas analyser
   * This opens the browser's native BLE device picker dialog
   */
  async scan() {
    if (!isBleSupported()) {
      throw new Error(getBleUnsupportedReason());
    }

    this._setState('scanning');

    try {
      // Build filter list for known FGA device name prefixes
      const nameFilters = MANUFACTURER_PREFIXES.map(({ prefix }) => ({
        namePrefix: prefix,
      }));

      // Request device with filters + accept all services for discovery
      this.device = await navigator.bluetooth.requestDevice({
        filters: nameFilters,
        optionalServices: [
          KNOWN_SERVICES.DEVICE_INFORMATION,
          KNOWN_SERVICES.BATTERY,
          KNOWN_SERVICES.NORDIC_UART,
        ],
      });

      if (!this.device) {
        this._setState('disconnected');
        return null;
      }

      // Listen for disconnection
      this.device.addEventListener('gattserverdisconnected', () => {
        this._setState('disconnected');
        this.server = null;
        this.services = [];
        this.characteristics.clear();
      });

      this.deviceInfo.name = this.device.name || 'Unknown Device';
      this.deviceInfo.id = this.device.id;
      this.deviceInfo.manufacturer = identifyManufacturer(this.device.name);

      return this.device;
    } catch (err) {
      if (err.name === 'NotFoundError' || err.message?.includes('cancelled')) {
        // User cancelled the picker — not an error
        this._setState('disconnected');
        return null;
      }
      this._setState('error');
      throw err;
    }
  }

  /**
   * Scan with acceptAllDevices for when name-filtered scan finds nothing
   * Shows ALL nearby BLE devices (user picks manually)
   */
  async scanAll() {
    if (!isBleSupported()) {
      throw new Error(getBleUnsupportedReason());
    }

    this._setState('scanning');

    try {
      this.device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          KNOWN_SERVICES.DEVICE_INFORMATION,
          KNOWN_SERVICES.BATTERY,
          KNOWN_SERVICES.NORDIC_UART,
        ],
      });

      if (!this.device) {
        this._setState('disconnected');
        return null;
      }

      this.device.addEventListener('gattserverdisconnected', () => {
        this._setState('disconnected');
        this.server = null;
        this.services = [];
        this.characteristics.clear();
      });

      this.deviceInfo.name = this.device.name || 'Unknown Device';
      this.deviceInfo.id = this.device.id;
      this.deviceInfo.manufacturer = identifyManufacturer(this.device.name);

      return this.device;
    } catch (err) {
      if (err.name === 'NotFoundError' || err.message?.includes('cancelled')) {
        this._setState('disconnected');
        return null;
      }
      this._setState('error');
      throw err;
    }
  }

  /**
   * Connect to the selected device's GATT server
   */
  async connect() {
    if (!this.device) throw new Error('No device selected. Call scan() first.');

    this._setState('connecting');

    try {
      this.server = await this.device.gatt.connect();

      // Discover all available services
      try {
        this.services = await this.server.getPrimaryServices();
      } catch {
        this.services = [];
      }

      // Try to read device information
      await this._readDeviceInfo();

      this._setState('connected');
      return this.server;
    } catch (err) {
      this._setState('error');
      throw new Error(`Failed to connect: ${err.message}`);
    }
  }

  /**
   * Read standard Device Information service characteristics
   */
  async _readDeviceInfo() {
    try {
      const service = await this.server.getPrimaryService(KNOWN_SERVICES.DEVICE_INFORMATION);
      
      const tryRead = async (charUuid, key) => {
        try {
          const char = await service.getCharacteristic(charUuid);
          const value = await char.readValue();
          this.deviceInfo[key] = new TextDecoder().decode(value);
        } catch { /* characteristic not available */ }
      };

      await tryRead(DEVICE_INFO_CHARS.MANUFACTURER_NAME, 'manufacturerName');
      await tryRead(DEVICE_INFO_CHARS.MODEL_NUMBER, 'modelNumber');
      await tryRead(DEVICE_INFO_CHARS.SERIAL_NUMBER, 'serialNumber');
      await tryRead(DEVICE_INFO_CHARS.FIRMWARE_REVISION, 'firmwareRevision');
    } catch {
      // Device Information service not available — not critical
    }
  }

  /**
   * Get battery level if available
   */
  async getBatteryLevel() {
    try {
      const service = await this.server.getPrimaryService(KNOWN_SERVICES.BATTERY);
      const char = await service.getCharacteristic('00002a19-0000-1000-8000-00805f9b34fb');
      const value = await char.readValue();
      return value.getUint8(0);
    } catch {
      return null;
    }
  }

  /**
   * Discover and list all services and characteristics on the device
   * Useful for reverse-engineering unknown devices
   */
  async discoverAll() {
    if (!this.server) throw new Error('Not connected.');

    const discovered = [];

    for (const service of this.services) {
      const serviceEntry = {
        uuid: service.uuid,
        isPrimary: service.isPrimary,
        characteristics: [],
      };

      try {
        const chars = await service.getCharacteristics();
        for (const char of chars) {
          const charEntry = {
            uuid: char.uuid,
            properties: {
              read: char.properties.read,
              write: char.properties.write,
              writeWithoutResponse: char.properties.writeWithoutResponse,
              notify: char.properties.notify,
              indicate: char.properties.indicate,
            },
            value: null,
          };

          // Try to read value if readable
          if (char.properties.read) {
            try {
              const val = await char.readValue();
              // Try to decode as text first, fall back to hex
              try {
                charEntry.value = new TextDecoder().decode(val);
              } catch {
                charEntry.value = Array.from(new Uint8Array(val.buffer))
                  .map(b => b.toString(16).padStart(2, '0'))
                  .join(' ');
              }
            } catch { /* read failed */ }
          }

          this.characteristics.set(char.uuid, char);
          serviceEntry.characteristics.push(charEntry);
        }
      } catch {
        // Could not enumerate characteristics for this service
      }

      discovered.push(serviceEntry);
    }

    return discovered;
  }

  /**
   * Subscribe to notifications on the Nordic UART RX characteristic
   * This is the most common way FGAs stream data over BLE
   */
  async subscribeToUART(callback) {
    if (!this.server) throw new Error('Not connected.');

    try {
      const service = await this.server.getPrimaryService(KNOWN_SERVICES.NORDIC_UART);
      const rxChar = await service.getCharacteristic(KNOWN_SERVICES.NORDIC_UART_RX);

      rxChar.addEventListener('characteristicvaluechanged', (event) => {
        const value = event.target.value;
        const decoded = new TextDecoder().decode(value);
        this.rawDataBuffer += decoded;

        if (this.onRawMessage) {
          this.onRawMessage(decoded, value);
        }

        // Try to parse complete messages (many devices use newline delimiters)
        const lines = this.rawDataBuffer.split('\n');
        if (lines.length > 1) {
          for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i].trim();
            if (line) {
              const parsed = this._parseDataLine(line);
              if (parsed && callback) callback(parsed);
              if (parsed && this.onDataReceived) this.onDataReceived(parsed);
            }
          }
          this.rawDataBuffer = lines[lines.length - 1];
        }
      });

      await rxChar.startNotifications();
      this.notifyCallbacks.set(KNOWN_SERVICES.NORDIC_UART_RX, callback);
      return true;
    } catch (err) {
      console.warn('UART subscription failed:', err.message);
      return false;
    }
  }

  /**
   * Subscribe to notifications on any characteristic by UUID
   */
  async subscribeToCharacteristic(charUuid, callback) {
    if (!this.server) throw new Error('Not connected.');

    const char = this.characteristics.get(charUuid);
    if (!char) throw new Error(`Characteristic ${charUuid} not found. Run discoverAll() first.`);

    if (!char.properties.notify && !char.properties.indicate) {
      throw new Error(`Characteristic ${charUuid} does not support notifications.`);
    }

    char.addEventListener('characteristicvaluechanged', (event) => {
      const value = event.target.value;
      const bytes = new Uint8Array(value.buffer);
      
      // Try text decoding
      let text = '';
      try { text = new TextDecoder().decode(value); } catch {}

      if (callback) callback({ bytes, text, raw: value });
      if (this.onRawMessage) this.onRawMessage(text || Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' '), value);
    });

    await char.startNotifications();
    this.notifyCallbacks.set(charUuid, callback);
    return true;
  }

  /**
   * Write data to the Nordic UART TX characteristic (send command to device)
   */
  async writeToUART(data) {
    if (!this.server) throw new Error('Not connected.');

    try {
      const service = await this.server.getPrimaryService(KNOWN_SERVICES.NORDIC_UART);
      const txChar = await service.getCharacteristic(KNOWN_SERVICES.NORDIC_UART_TX);

      const encoded = typeof data === 'string' ? new TextEncoder().encode(data) : data;
      await txChar.writeValue(encoded);
      return true;
    } catch (err) {
      console.warn('UART write failed:', err.message);
      return false;
    }
  }

  /**
   * Try to parse a data line from the UART stream
   * Handles common formats: key=value, key:value, CSV, JSON
   */
  _parseDataLine(line) {
    const result = {};

    // Try JSON first
    try {
      const json = JSON.parse(line);
      if (typeof json === 'object') return json;
    } catch {}

    // Try key=value or key:value pairs
    const kvPattern = /(\w[\w\s]*?)[\s]*[=:]\s*([-\d.]+)/g;
    let match;
    while ((match = kvPattern.exec(line)) !== null) {
      const key = match[1].trim().toLowerCase();
      const val = parseFloat(match[2]);
      if (!isNaN(val)) {
        result[key] = val;
      }
    }
    if (Object.keys(result).length > 0) return result;

    // Try CSV (comma-separated numbers)
    const parts = line.split(',').map(s => s.trim());
    if (parts.length >= 2 && parts.every(p => !isNaN(parseFloat(p)))) {
      // Map to standard field order: O2, CO, CO2, flue temp, ambient temp
      const fields = ['o2', 'co', 'co2', 'flueTemp', 'ambientTemp', 'efficiencyNet', 'efficiencyGross', 'excessAir', 'coAirFree'];
      parts.forEach((p, i) => {
        if (i < fields.length) result[fields[i]] = parseFloat(p);
      });
      if (Object.keys(result).length > 0) return result;
    }

    return null;
  }

  /**
   * Disconnect from the device
   */
  disconnect() {
    if (this.device && this.device.gatt.connected) {
      this.device.gatt.disconnect();
    }
    this.server = null;
    this.services = [];
    this.characteristics.clear();
    this.notifyCallbacks.clear();
    this.rawDataBuffer = '';
    this._setState('disconnected');
  }

  /**
   * Get current connection state info
   */
  getState() {
    return {
      state: this.connectionState,
      device: this.deviceInfo,
      isConnected: this.connectionState === 'connected',
      servicesCount: this.services.length,
      characteristicsCount: this.characteristics.size,
    };
  }
}

// Singleton instance for the app
let _instance = null;

export function getBleManager() {
  if (!_instance) {
    _instance = new BleConnectionManager();
  }
  return _instance;
}

export { KNOWN_SERVICES, DEVICE_INFO_CHARS };
