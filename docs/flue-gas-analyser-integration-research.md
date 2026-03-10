# Flue Gas Analyser Integration Research
## How FGAs Connect to Third-Party Apps Like Boiler Brain

**Date:** March 2026

---

## 1. Major FGA Manufacturers & Their Bluetooth Models

### Kane (UK Market Leader)
- **KANE258**, **KANE358**, **KANE458**, **KANE458s**, **KANE958**
- All use **Bluetooth Low Energy (BLE)** to connect to smartphones/tablets
- First-party app: **KANE LIVE** (iOS & Android)
- Third-party integrations confirmed with: Gas Engineer Software, Gas Certificate App

### Anton (by Crowcon)
- **Sprint Pro3** and above (Pro3, Pro4, Pro5, Pro6)
- Wireless Bluetooth comms to iOS & Android
- First-party app: **Sprint Mobile App** (free)
- Sprint Pro1/Pro2 are USB-only (no wireless)
- Anton explicitly states: *"It's a surprisingly simple process to get our analysers to connect with most third-party software and apps"* and offers direct assistance to third-party developers

### TPI (Test Products International)
- **DC710**, **DC711**
- Use **Bluetooth Low Energy (BLE)**
- First-party app: **TPI View** (iOS & Android)
- Integrated with Gas Certificate App and Gas Engineer Software
- The DC710 is notable: it has **no built-in display** — it relies entirely on the smartphone app for its UI

### Testo (German — Global Market)
- **testo 300**, **testo 310 II**, **testo 330**
- Bluetooth + WiFi connectivity
- First-party app: **testo Combustion App** (iOS & Android)
- Also offers PC software (testo EasyHeat)
- Testo tends to be more closed-ecosystem compared to UK brands

---

## 2. Communication Protocol: How the App Talks to the Analyser

### Transport Layer: Bluetooth Low Energy (BLE)
All modern FGAs use **Bluetooth Low Energy (BLE 4.0+)**, not classic Bluetooth. This is important because:

- **Lower power consumption** — analysers can maintain connection without draining battery
- **No pairing PIN required** in most cases — simplified connection flow
- **GATT (Generic Attribute Profile)** is the standard used for data exchange
- Range: typically 10–30 metres line-of-sight

### How BLE/GATT Communication Works

```
┌─────────────────┐         BLE/GATT          ┌─────────────────┐
│  Flue Gas       │ ◄─────────────────────────► │  Smartphone     │
│  Analyser       │   GATT Services &           │  App            │
│  (Peripheral)   │   Characteristics           │  (Central)      │
└─────────────────┘                             └─────────────────┘
```

1. **Discovery** — The app scans for BLE devices advertising a specific service UUID
2. **Connection** — App connects as GATT Central; analyser is the GATT Peripheral/Server
3. **Service Discovery** — App reads available GATT Services exposed by the analyser
4. **Data Transfer** — App reads/subscribes to GATT Characteristics for real-time data
5. **Commands** — App can write to specific characteristics to control the analyser (start/stop pump, trigger snapshot, etc.)

### Key BLE Concepts for Integration

| Concept | Description |
|---------|-------------|
| **Service UUID** | Unique identifier for a group of related data (e.g., "Flue Gas Readings") |
| **Characteristic UUID** | Specific data point within a service (e.g., "CO ppm reading") |
| **Notify/Indicate** | Analyser pushes new values to the app when readings change |
| **Read** | App explicitly requests current value |
| **Write** | App sends commands to the analyser |

### Manufacturer-Specific Protocols
Each manufacturer uses their own **proprietary GATT service UUIDs and data encoding**:

- **Kane**: Custom BLE service. Data is typically sent as structured byte arrays or JSON-like packets. Kane offers partnership/integration support on request.
- **Anton**: Custom BLE protocol. Anton actively assists third-party developers with integration — they provide documentation to software partners.
- **TPI**: Custom BLE service using BLE 4.0+. Data includes real-time sensor readings. TPI View app shows readings can be streamed live.
- **Testo**: More closed ecosystem. Uses proprietary BLE protocol. Limited third-party documentation available.

### Two Integration Models

#### Model A: Direct BLE Connection (Native App)
- App connects directly to the FGA via BLE
- Requires manufacturer cooperation for protocol documentation
- Used by: Gas Engineer Software, Gas Certificate App
- **Best for real-time readings and live control**

#### Model B: Data Import (File-Based)
- FGA exports readings to its own app → exported as CSV/PDF
- Third-party app imports the CSV/PDF data
- **No manufacturer partnership needed**
- Used as a fallback when direct BLE access isn't available

---

## 3. Data Collected: What Information the Analyser Provides

### Core Combustion Readings (All Models)

| Field | Unit | Description | Typical Range |
|-------|------|-------------|---------------|
| **O2** | % vol | Oxygen concentration in flue gas | 3–5% (gas), 5–8% (oil) |
| **CO** | ppm | Carbon monoxide (directly measured) | 0–10,000 ppm |
| **CO2** | % vol | Carbon dioxide (usually calculated from O2) | 8–11% (gas), ~13% (oil) |
| **Flue Temp** | °C / °F | Temperature of flue gases | 50–300°C |
| **Ambient Temp** | °C / °F | Room/inlet air temperature | 15–25°C |
| **Delta T** | °C / °F | Flue temp minus ambient temp | — |
| **Efficiency (Net)** | % | Combustion efficiency (net/gross) | 80–98% |
| **Efficiency (Gross)** | % | Combustion efficiency (gross) | 75–95% |
| **Excess Air** | % | Excess air in combustion | — |
| **CO/CO2 Ratio** | ratio | Safety ratio (must be < 0.004) | 0.0001–0.008 |
| **CO Air-Free** | ppm | CO corrected to zero excess air | — |

### Extended Readings (Higher-End Models: Sprint Pro5+, Kane 958, Testo 300)

| Field | Unit | Description |
|-------|------|-------------|
| **NO** | ppm | Nitric oxide |
| **NOx** | ppm | Nitrogen oxides (calculated) |
| **SO2** | ppm | Sulphur dioxide |
| **Draught/Stack Pressure** | Pa / mbar | Flue draught measurement |
| **Differential Pressure** | Pa / mbar | For let-by and tightness tests |

### Metadata Attached to Each Reading

| Field | Description |
|-------|-------------|
| **Timestamp** | Date and time of reading |
| **GPS Location** | Latitude/longitude (from phone) |
| **Fuel Type** | Natural gas, LPG, oil, etc. |
| **Analyser Serial Number** | Unique device identifier |
| **Analyser Model** | e.g., KANE458s |
| **Calibration Due Date** | When next calibration is required |
| **Test Type** | High fire / Low fire / Ambient |
| **Engineer Name/ID** | From app profile |
| **Job Reference** | User-defined job identifier |

### Export Formats

| Format | Usage |
|--------|-------|
| **CSV** | Spreadsheet-compatible, used for data import into third-party systems |
| **PDF** | Formatted reports with branding, for customer handover |
| **JSON** | Real-time BLE data packets (proprietary per manufacturer) |
| **In-memory** | Direct BLE characteristic reads for live streaming |

---

## 4. How Third-Party Apps Like Gas Engineer Software Actually Integrate

Based on Gas Engineer Software's documented integration flow:

### Connection Flow
1. Engineer opens the third-party app and navigates to "Combustion Analyser Readings"
2. Taps **"Import Readings"**
3. App scans for nearby BLE FGA devices
4. App shows list of discovered analysers (by model/serial)
5. Engineer selects their analyser
6. For **Kane/Anton**: App pulls stored test results/logs from the analyser memory
7. For **TPI**: App displays **live real-time readings** from the analyser; engineer can tap "Start Pump" remotely
8. Readings are automatically populated into the correct form fields
9. A PDF/report is automatically generated and attached to the job record

### What Gets Imported
- High-fire combustion readings (CO, CO2, O2, efficiency, flue temp, etc.)
- Low-fire combustion readings (same fields)
- Timestamp of when readings were taken
- Analyser serial number (for traceability/audit)

---

## 5. Technical Implementation Options for Boiler Brain

### Option A: Web Bluetooth API (Browser-Based)
```javascript
// Scan for a BLE flue gas analyser
const device = await navigator.bluetooth.requestDevice({
  filters: [
    { namePrefix: 'KANE' },
    { namePrefix: 'Anton' },
    { namePrefix: 'TPI' }
  ],
  optionalServices: ['<manufacturer-service-uuid>']
});

const server = await device.gatt.connect();
const service = await server.getPrimaryService('<service-uuid>');
const characteristic = await service.getCharacteristic('<char-uuid>');

// Subscribe to real-time notifications
characteristic.addEventListener('characteristicvaluechanged', (event) => {
  const value = event.target.value; // DataView of raw bytes
  const readings = parseManufacturerData(value);
  // readings = { co: 42, o2: 5.2, co2: 9.8, flueTemp: 127, ... }
});
await characteristic.startNotifications();
```

**Pros:**
- No native app needed — works in Chrome on Android, macOS, Windows, Linux
- Single codebase for all platforms

**Cons:**
- **Not supported on iOS Safari** (major limitation for UK gas engineers who use iPhones)
- Requires manufacturer protocol documentation (service/characteristic UUIDs and data encoding)
- Experimental API, browser support varies

### Option B: React Native / Capacitor BLE Plugin (Hybrid App)
```javascript
// Using react-native-ble-plx or @capacitor-community/bluetooth-le
import { BleManager } from 'react-native-ble-plx';

const manager = new BleManager();
manager.startDeviceScan(null, null, (error, device) => {
  if (device.name?.startsWith('KANE') || device.name?.startsWith('TPI')) {
    // Connect and read characteristics
  }
});
```

**Pros:**
- Works on both iOS and Android
- Full BLE access including background scanning
- Can be wrapped in a PWA/Capacitor shell

**Cons:**
- Requires native build pipeline
- Still needs manufacturer protocol docs

### Option C: CSV/File Import (Simplest — No Partnership Needed)
1. Engineer takes reading with manufacturer's own app (KANE LIVE, TPI View, Sprint Mobile)
2. Exports as CSV from manufacturer app
3. Uploads/shares CSV to Boiler Brain
4. Boiler Brain parses known CSV formats and populates fields

**Pros:**
- No manufacturer partnership or protocol docs needed
- Works with any analyser that exports CSV
- Can be implemented immediately

**Cons:**
- Extra steps for the engineer (not seamless)
- No real-time live readings

### Option D: Manufacturer Partnership (Best Long-Term)
- Contact Kane, Anton, and TPI directly for BLE protocol documentation
- Anton explicitly offers this: *"We'll happily assist you (and/or your IT/software company)"*
- Kane and TPI also have confirmed third-party integrations
- Typically involves signing an NDA and receiving a developer SDK/protocol spec

---

## 6. Competitive Landscape: Who Already Integrates with FGAs

| App | Kane | Anton | TPI | Integration Type |
|-----|------|-------|-----|-----------------|
| **Gas Engineer Software** | Yes (258, 358, 458, 458s) | Yes (Sprint Pro3+, eVo3) | Yes (DC710, DC711) | Direct BLE |
| **Gas Certificate App** | Unknown | Unknown | Yes (DC710) | Direct BLE |
| **KANE LIVE** | Yes (all) | No | No | First-party only |
| **Sprint Mobile** | No | Yes (all Sprint Pro) | No | First-party only |
| **TPI View** | No | No | Yes (all) | First-party only |
| **testo Combustion** | No | No | No | First-party only (Testo) |
| **Boiler Brain** | **Opportunity** | **Opportunity** | **Opportunity** | **TBD** |

---

## 7. Recommended Integration Roadmap for Boiler Brain

### Phase 1: CSV Import (Immediate — No Dependencies)
- Parse CSV exports from KANE LIVE, TPI View, Sprint Mobile
- Allow drag-and-drop or share-to-app upload
- Auto-detect manufacturer from CSV format
- Populate flue gas readings into job records

### Phase 2: Manufacturer Partnerships (3–6 months)
- Contact Anton first (most open to third-party integration)
- Contact Kane and TPI for BLE protocol documentation
- Sign NDAs and obtain developer specs
- Implement direct BLE connection using Capacitor BLE plugin

### Phase 3: Real-Time BLE Integration (6–12 months)
- Live streaming of readings directly into Boiler Brain
- Remote pump start/stop (where supported)
- Auto-capture high/low fire readings
- Integrate with CP12/Gas Safety Record forms
- Traceability: link readings to specific jobs with timestamps and GPS

---

## 8. Key Takeaways

1. **All major UK FGAs use Bluetooth Low Energy** — the transport layer is standardised
2. **Data protocols are proprietary** per manufacturer — you need their cooperation for direct BLE integration
3. **The data collected is standardised** — CO, O2, CO2, efficiency, temperatures, CO/CO2 ratio are universal
4. **CSV export is the easiest entry point** — no partnership needed, all manufacturer apps support it
5. **Anton is the most open** to third-party integration and actively encourages it
6. **Gas Engineer Software is the main competitor** — they have direct BLE integration with Kane, Anton, and TPI
7. **Web Bluetooth won't work on iOS** — native/hybrid BLE is required for full device coverage
8. **The market gap**: No AI-powered app currently combines FGA data with intelligent diagnostics — this is Boiler Brain's unique opportunity
