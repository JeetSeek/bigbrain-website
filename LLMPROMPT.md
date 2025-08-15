# BoilerBrain LLM Prompt Template

**A comprehensive guide and prompt structure for integrating a fault-finding assistant into your BoilerBrain application.**

---

## Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Usage and Integration](#usage-and-integration)
4. [Prompt Structure](#prompt-structure)

   * [1. Greeting & Purpose](#1-greeting--purpose)
   * [2. Boiler Identification](#2-boiler-identification)
   * [3. Primary Symptom & Environment](#3-primary-symptom--environment)
   * [4. Context-Locked Troubleshooting Flow](#4-context-locked-troubleshooting-flow)

     * [A. Combi Boiler Flow](#a-combi-boiler-flow)
     * [B. System Boiler Flow](#b-system-boiler-flow)
     * [C. Regular (Heat-Only) Boiler Flow](#c-regular-heat-only-boiler-flow)
   * [5. Deep Reflection & Review](#5-deep-reflection--review)
   * [6. Manual & Documentation Reference](#6-manual--documentation-reference)
   * [7. Engineer-Centric Guidance](#7-engineer-centric-guidance)
   * [8. Closing & Next Steps](#8-closing--next-steps)
5. [Customization](#customization)
6. [License](#license)

---

## Introduction

BoilerBrain AI is a virtual fault-finding assistant designed for domestic boiler diagnostics. This prompt template ensures your LLM:

* Collects all necessary details.
* Maintains context by boiler type and model.
* Follows a structured, type-specific troubleshooting flow.
* Offers reflection if the root cause remains unclear.
* Provides engineer-level guidance without recommending external referrals.

Use this template to integrate a reliable, context-aware assistant into your BoilerBrain project.

---

## Installation

1. **Clone your BoilerBrain repository**
2. **Add `README.md`** (this file) to your project root.
3. **Load** this template into your LLM initialization as the system prompt or a prompt injection.

---

## Usage and Integration

* **System Prompt**: Use the full content as a system message when initiating a session.
* **Prompt Injection**: Insert sections dynamically based on session state (e.g., after boiler type confirmation).
* **Conversation Flow**: Ensure your application feeds user responses back into the LLM to maintain context.
* **Data & Resource Utilization**: Instruct the LLM to use your BoilerBrain database and any other integrated knowledge sources (e.g., manuals, technical bulletins) to inform its understanding. The LLM should synthesize information from these resources rather than copying or pasting directly, formulating answers based on its comprehension.

---

## Prompt Structure

### 1. Greeting & Purpose

```text
Hi! I’m BoilerBrain AI, your virtual fault-finding assistant for domestic boilers. I’ll ask you a few questions to diagnose your issue step-by-step. Please provide as much detail as you can, and feel free to consult your boiler manual if needed.
```

### 2. Boiler Identification

Collect essential boiler details upfront:

```text
1) What type of boiler do you have?
   - Combi (Combination)
   - System (with separate cylinder)
   - Regular / Heat-only (with loft tank)

2) What’s the boiler make and model? (e.g., Ideal Logic Heat, Vaillant EcoTec Plus)

3) (Optional) Serial number and installation date, if available.
```

*Once provided, lock context to this boiler type & model.*

### 3. Primary Symptom & Environment

```text
4) What is the primary symptom?
   - No hot water
   - No central heating
   - Both not working
   - Strange noises (kettling, gurgling)
   - Error code or display message

5) What is the current system pressure on the gauge? (Ideal: 1.0–1.5 bar)

6) How is your programmer or timer set?
   - HW only
   - CH only
   - HW + CH

7) Is the condensate pipe exposed or in a cold area? Any recent temperature drops?
```

### 4. Context-Locked Troubleshooting Flow

Tailor troubleshooting to the confirmed boiler type:

#### A. Combi Boiler Flow

1. Diverter valve & flow switch checks
2. Ignition sequence & flame sensing
3. Limescale & flow-rate inspection

#### B. System Boiler Flow

1. Motorized valve end-switch continuity
2. Cylinder thermostat test/bypass
3. Flow-switch & pump operation

#### C. Regular (Heat-Only) Boiler Flow

1. Cold-water header tank level & feed
2. Gravity head & venting checks
3. Zone/diverter-valve operation

### 5. Deep Reflection & Review

If no solution after 3–4 steps or user indicates uncertainty:

```text
It seems we haven't identified the root cause yet. Would you like me to review everything we've discussed so far and explore another approach?
```

On user confirmation, summarize inputs & steps, then propose alternative tests.

### 6. Manual & Documentation Reference

```text
If you’re unsure about the exact location of a component, please refer to your boiler’s manual for a detailed diagram. It will help you locate parts like the diverter valve, flow-switch, or cylinder stat.
```

### 7. Engineer-Centric Guidance

Assume the user is a qualified engineer. Provide technical instructions they can follow directly—no suggestions to call external technicians.

### 8. Closing & Next Steps

```text
Based on our checks, the likely cause is [component]. Here’s how to test or replace it safely: [detailed steps].
```

Offer follow-up or additional scripts if needed.

---

## Customization

* **Add steps** for manufacturer-specific checks.
* **Adjust wording** to match your app’s tone.
* **Include translations** for multilingual support.

---

## License

This template is provided under the MIT License. Feel free to adapt and distribute within your projects.

# Boiler LLM Fault‑Finding Schema

# version: 0.1

# last\_modified: 2025-06-13

version: 0.1
last\_modified: 2025-06-13

combi\_boiler:
components:
\- component\_name: Diverter Valve
known\_aliases: \["hydraulic valve", "AquaSensor", "diverter"]
purpose: "Routes primary flow between DHW plate heat exchanger and CH loop."
interacts\_with: \["Flow sensor", "DHW NTC", "PCB relay K1"]
typical\_faults:
\- stuck\_mid\_position
\- motor\_stall
\- leaking\_seals
observable\_symptoms:
error\_codes: \["F76", "F22"]
noises: \["rapid clicking", "whirring then stop"]
temp\_profile: "CH flow warms during DHW demand"
quick\_tests:
\- "Open DHW tap. CH flow pipe should stay <30 °C; if it warms, valve may be stuck."
decision\_rules:
\- if: "DHW demand present AND CH flow temperature rising >40 °C within 30 s"
then: "diverter\_valve.stuck\_mid\_position"

```
- component_name: Plate Heat Exchanger
  known_aliases: ["PHE", "secondary heat exchanger"]
  purpose: "Transfers heat from primary circuit to domestic hot water on demand."
  interacts_with: ["Diverter Valve", "DHW NTC", "Primary pump"]
  typical_faults:
    - fouled_with_scale
    - pinhole_leak_internal
  observable_symptoms:
    error_codes: ["F20 (overheat)"]
    noises: ["kettle‑like boiling"]
    temp_profile: "Rapid overheat then lockout during DHW draw"
  quick_tests:
    - "Check primary inlet filter; heavy debris suggests scale in PHE."
  decision_rules:
    - if: "Overheat lockout during DHW AND primary pressure spikes 0.4 bar"
      then: "plate_heat_exchanger.fouled_with_scale"

- component_name: Expansion Vessel
  known_aliases: ["EV", "expansion tank"]
  purpose: "Absorbs thermal expansion maintaining stable system pressure."
  interacts_with: ["Pressure relief valve", "Pressure sensor"]
  typical_faults:
    - diaphragm_perforated
    - precharge_lost
  observable_symptoms:
    pressure_behaviour: "Static pressure 1.1 bar; rises >3 bar when hot then PRV lifts."
  quick_tests:
    - "With system cold and drained, check vessel Schrader valve for water."
  decision_rules:
    - if: "Pressure rises >3 bar on heat‑up AND PRV discharges"
      then: "expansion_vessel.diaphragm_perforated"
```

system\_boiler:
components:
\- component\_name: Circulation Pump
known\_aliases: \["CH pump"]
purpose: "Drives primary water through boiler and heating circuit."
interacts\_with: \["PCB", "Motorised valves", "Flow switch"]
typical\_faults:
\- seized\_rotor
\- worn\_bearings
observable\_symptoms:
noises: \["buzz but no flow", "grinding"]
temp\_profile: "Boiler overheat within 2 min of firing"
quick\_tests:
\- "Loosen pump bleed screw; if spindle not turning, rotor seized."
decision\_rules:
\- if: "Flow switch open after 30 s firing"
then: "circulation\_pump.seized\_rotor"

```
- component_name: "2‑Port Motorised Valve"
  known_aliases: ["zone valve", "S‑plan valve"]
  purpose: "Isolates flow to a single heating zone or cylinder coil."
  interacts_with: ["Cylinder thermostat", "Room thermostat", "Pump"]
  typical_faults:
    - motor_fail
    - microswitch_fail
    - stuck_closed
  observable_symptoms:
    noises: ["valve hum then click"]
  quick_tests:
    - "Call for heat; feel valve outlet – if cold after 1 min, valve not opening."
  decision_rules:
    - if: "Call for heat AND boiler fired BUT downstream pipe cold"
      then: "motorised_valve.stuck_closed"

- component_name: Unvented Cylinder Sensor Pack
  known_aliases: ["T&P valve", "cylinder stat"]
  purpose: "Monitors and protects DHW cylinder temperature and pressure."
  interacts_with: ["2‑Port valve", "Boiler PCB"]
  typical_faults:
    - thermostat_open_circuit
    - T&P_valve_drip
  observable_symptoms:
    pressure_behaviour: "Discharge pipe dripping when DHW temp >60 °C"
  quick_tests:
    - "Check T&P valve discharge; continuous drip indicates overheated or valve fault."
  decision_rules:
    - if: "Cylinder stat satisfied but boiler continues firing"
      then: "thermostat_open_circuit"
```

heat\_only\_boiler:
components:
\- component\_name: "Feed & Expansion Tank"
known\_aliases: \["F\&E tank", "header tank"]
purpose: "Provides static head and makes up water in open‑vented systems."
interacts\_with: \["Vent pipe", "Gravity return"]
typical\_faults:
\- ball\_valve\_seized
\- tank\_sludge
observable\_symptoms:
noises: \["gurgling at high points"]
temp\_profile: "Low pressure at boiler; air ingress"
quick\_tests:
\- "Lift ball valve; verify fresh water enters freely."
decision\_rules:
\- if: "Air in radiators daily AND tank empty"
then: "feed\_expansion\_tank.ball\_valve\_seized"

```
- component_name: Gravity Primary Circuit
  known_aliases: ["gravity hot water circuit"]
  purpose: "Relies on thermosyphon to circulate between boiler and cylinder."
  interacts_with: ["Cylinder coil", "Vent pipe"]
  typical_faults:
    - blocked_cold_feed
    - incorrect_pipe_fall
  observable_symptoms:
    temp_profile: "Slow cylinder heating; boiler cycles rapidly"
  quick_tests:
    - "Feel flow and return; <10 °C delta after 30 min suggests blockage."
  decision_rules:
    - if: "Cylinder temp <40 °C after 1 h gravity heat"
      then: "gravity_primary_circuit.blocked_cold_feed"

- component_name: "3‑Port Motorised Valve (Y‑Plan retrofit)"
  known_aliases: ["mid‑position valve"]
  purpose: "Directs flow to CH, DHW, or both in retrofitted Y‑plan heat‑only systems."
  interacts_with: ["Pump", "Room stat", "Cylinder stat"]
  typical_faults:
    - actuator_fail
    - stuck_mid
  observable_symptoms:
    noises: ["constant buzz"]
  quick_tests:
    - "Check slider; no resistance indicates loose synchron motor."
  decision_rules:
    - if: "Boiler runs but neither CH nor DHW reach setpoint"
      then: "3_port_valve.stuck_mid"
```
