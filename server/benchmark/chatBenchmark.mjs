/**
 * BoilerBrain Chat Agent Benchmark v2
 * ====================================
 * Comprehensive diagnostic tool benchmark testing real engineer interactions:
 *   - QUALITY:        Correct diagnosis, thorough procedures, parts/actions (55%)
 *   - COMMUNICATION:  Professional tone, structured answers, engineer voice (35%)
 *   - SPEED:          Response latency — acceptable if under 30s (10%)
 *
 * Test categories:
 *   - fault-code:           Basic fault code identification
 *   - diagnostic-procedure: "How do I test X?" follow-up questions
 *   - troubleshooting:      Multi-turn diagnostic conversations
 *   - symptom:              Symptom-based diagnosis (no fault code)
 *   - safety:               Gas safety critical scenarios
 *
 * Usage:  node server/benchmark/chatBenchmark.mjs
 */

import { randomUUID } from 'crypto';

const API_BASE = process.env.API_URL || 'http://localhost:3204';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const INTER_TEST_DELAY_MS = 5000; // 5s between tests

// ─── Test Cases ──────────────────────────────────────────────────────────────

const TEST_CASES = [
  // ──── BASIC FAULT CODE IDENTIFICATION ────
  {
    name: 'Vaillant ecoTEC Plus — F.28 (ignition failure)',
    setup: [
      { role: 'user', message: 'I have a Vaillant ecoTEC Plus 832 combi boiler showing fault code F.28' },
    ],
    expect: {
      keywords: ['ignit', 'gas valve', 'electrode', 'spark', 'pcb'],
      concepts: ['ignition failure or no flame detected'],
      minLength: 200,
    },
    forbidden: ['call a professional', 'contact support', 'seek help', 'if unsure, get assistance'],
    category: 'fault-code',
    difficulty: 'standard',
  },
  {
    name: 'Worcester Greenstar 30i — EA fault (flame loss)',
    setup: [
      { role: 'user', message: 'I have a Worcester Greenstar 30i combi boiler and it keeps showing the EA fault code on the display' },
    ],
    expect: {
      keywords: ['flame', 'gas', 'electrode', 'flue'],
      concepts: ['flame failure or loss of flame during operation'],
      minLength: 200,
    },
    forbidden: ['call a professional', 'contact support', 'seek help'],
    category: 'fault-code',
    difficulty: 'standard',
  },
  {
    name: 'Ideal Logic Plus 30 — L2 (ignition lockout)',
    setup: [
      { role: 'user', message: 'I\'m working on an Ideal Logic Plus 30 combi boiler that has fault code L2 keeps coming up after reset' },
    ],
    expect: {
      keywords: ['ignit', 'lockout', 'gas', 'electrode'],
      concepts: ['ignition lockout'],
      minLength: 200,
    },
    forbidden: ['contact support', 'seek help'],
    category: 'fault-code',
    difficulty: 'standard',
  },
  {
    name: 'Glow-worm Ultimate 30c — F.75 (pressure sensor)',
    setup: [
      { role: 'user', message: 'I have a Glow-worm Ultimate 30c combi boiler showing fault code F.75 on the display panel' },
    ],
    expect: {
      keywords: ['pressure', 'sensor', 'pump'],
      concepts: ['pressure sensor or pump issue'],
      minLength: 150,
    },
    forbidden: ['contact support', 'seek help'],
    category: 'fault-code',
    difficulty: 'standard',
  },

  // ──── DIAGNOSTIC PROCEDURE — "How do I test X?" ────
  {
    name: 'Vaillant F.28 — How do I test the gas valve?',
    setup: [
      { role: 'user', message: 'I have a Vaillant ecoTEC Plus 832 combi boiler showing fault code F.28' },
      { role: 'user', message: 'How do I test the gas valve on this? What readings should I be getting?' },
    ],
    expect: {
      keywords: ['gas valve', 'multimeter', 'coil', 'pressure', 'ohm'],
      concepts: ['step-by-step gas valve testing procedure with expected readings'],
      minLength: 300,
    },
    forbidden: ['contact support', 'seek help', 'call a professional'],
    category: 'diagnostic-procedure',
    difficulty: 'advanced',
  },
  {
    name: 'Ideal L2 — How do I check the spark electrode?',
    setup: [
      { role: 'user', message: 'I\'m working on an Ideal Logic Plus 30 combi boiler with fault code L2' },
      { role: 'user', message: 'You mentioned the spark electrode — how do I check it and what gap should it be?' },
    ],
    expect: {
      keywords: ['electrode', 'gap', 'mm', 'crack', 'clean', 'spark'],
      concepts: ['electrode inspection procedure with gap measurement'],
      minLength: 250,
    },
    forbidden: ['contact support', 'seek help'],
    category: 'diagnostic-procedure',
    difficulty: 'advanced',
  },
  {
    name: 'Worcester 25i — How do I test the diverter valve?',
    setup: [
      { role: 'user', message: 'I\'m looking at a Worcester Greenstar 25i system boiler, heating works but no hot water' },
      { role: 'user', message: 'How do I actually test the diverter valve? What am I looking for?' },
    ],
    expect: {
      keywords: ['diverter', 'motor', 'actuator', 'flow', 'check', 'stuck'],
      concepts: ['diverter valve testing procedure'],
      minLength: 250,
    },
    forbidden: ['contact support', 'seek help'],
    category: 'diagnostic-procedure',
    difficulty: 'advanced',
  },

  // ──── MULTI-TURN TROUBLESHOOTING ────
  {
    name: 'Baxi 600 — Pressure dropping, engineer reports findings',
    setup: [
      { role: 'user', message: 'I\'m looking at a Baxi 600 Combi 28 boiler, the pressure keeps dropping below 1 bar with no fault codes showing but it cuts out' },
      { role: 'user', message: 'I\'ve checked the system and can\'t find any visible leaks. PRV isn\'t dripping either. What else should I look at?' },
    ],
    expect: {
      keywords: ['expansion vessel', 'charge', 'bar', 'schrader', 'diaphragm'],
      concepts: ['expansion vessel investigation when no visible leak found'],
      minLength: 250,
    },
    forbidden: ['contact support', 'seek help'],
    category: 'troubleshooting',
    difficulty: 'intermediate',
  },
  {
    name: 'Vaillant F.22 — Apprentice asks what pressure sensor looks like',
    setup: [
      { role: 'user', message: 'I\'m on a job with a Vaillant ecoTEC Pro 28 combi boiler showing fault code F.22' },
      { role: 'user', message: 'I\'m fairly new to this — where exactly is the pressure sensor on this boiler and what does it look like? How do I test it?' },
    ],
    expect: {
      keywords: ['pressure sensor', 'connector', 'wir', 'resist', 'ohm'],
      concepts: ['clear description of sensor location and testing for less experienced engineer'],
      minLength: 250,
    },
    forbidden: ['contact support', 'seek help', 'call a professional'],
    category: 'troubleshooting',
    difficulty: 'apprentice',
  },

  // ──── SYMPTOM-BASED DIAGNOSIS ────
  {
    name: 'Worcester Greenstar 25i — No hot water, heating fine',
    setup: [
      { role: 'user', message: 'I\'m looking at a Worcester Greenstar 25i system boiler, the heating is working fine but there is no hot water at all with no fault codes on the display' },
    ],
    expect: {
      keywords: ['valve', 'cylinder', 'zone', 'dhw', 'thermostat'],
      concepts: ['zone valve, motorised valve, or cylinder thermostat issue on system boiler'],
      minLength: 200,
    },
    forbidden: ['contact support', 'seek help'],
    category: 'symptom',
    difficulty: 'intermediate',
  },
  {
    name: 'Ideal Logic 30 — Boiler cycling on and off every few minutes',
    setup: [
      { role: 'user', message: 'I\'m working on an Ideal Logic 30 combi boiler and the customer says it keeps cycling on and off every couple of minutes, no fault codes, pressure is fine at 1.5 bar' },
    ],
    expect: {
      keywords: ['ntc', 'pump', 'heat exchanger', 'overheat', 'flow'],
      concepts: ['short cycling diagnosis — thermistor, pump, or heat exchanger blockage'],
      minLength: 200,
    },
    forbidden: ['contact support', 'seek help'],
    category: 'symptom',
    difficulty: 'intermediate',
  },

  // ──── GAS SAFETY ────
  {
    name: 'Baxi 800 Combi — Gas smell / safety scenario',
    setup: [
      { role: 'user', message: 'I\'m working on a Baxi 800 Combi boiler and there\'s a slight smell of gas near the boiler casing, what should I be checking first?' },
    ],
    expect: {
      keywords: ['gas', 'leak', 'tightness', 'ventilat'],
      concepts: ['gas safety procedures'],
      minLength: 150,
    },
    forbidden: ['contact support'],
    category: 'safety',
    difficulty: 'critical',
  },
];

// ─── Scoring Functions ───────────────────────────────────────────────────────

function scoreSpeed(ms) {
  // Relaxed thresholds — quality matters more than speed
  // Under 5s = 100, 5-10s = 80, 10-15s = 60, 15-25s = 40, 25-40s = 20, >40s = 0
  if (ms <= 5000) return 100;
  if (ms <= 10000) return 80;
  if (ms <= 15000) return 60;
  if (ms <= 25000) return 40;
  if (ms <= 40000) return 20;
  return 0;
}

function gradeSpeed(score) {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B+';
  if (score >= 60) return 'B';
  if (score >= 50) return 'C';
  if (score >= 30) return 'D';
  return 'F';
}

function scoreQuality(reply, testCase) {
  const lower = reply.toLowerCase();
  let score = 0;
  let maxPoints = 0;
  const details = [];

  // 1. Keyword coverage (40 points)
  const kw = testCase.expect.keywords;
  const kwFound = kw.filter(k => lower.includes(k.toLowerCase()));
  const kwScore = Math.round((kwFound.length / kw.length) * 40);
  score += kwScore;
  maxPoints += 40;
  details.push(`Keywords: ${kwFound.length}/${kw.length} (${kwScore}/40)`);

  // 2. Response length adequacy (20 points)
  const minLen = testCase.expect.minLength || 150;
  const lenScore = reply.length >= minLen ? 20 : Math.round((reply.length / minLen) * 20);
  score += lenScore;
  maxPoints += 20;
  details.push(`Length: ${reply.length} chars (${lenScore}/20)`);

  // 3. Actionable advice — contains step/action words (20 points)
  const actionWords = ['check', 'replace', 'test', 'measure', 'inspect', 'reset', 'clean', 'verify', 'confirm', 'remove'];
  const actionsFound = actionWords.filter(a => lower.includes(a));
  const actionScore = Math.min(20, actionsFound.length * 4);
  score += actionScore;
  maxPoints += 20;
  details.push(`Actions: ${actionsFound.length} found (${actionScore}/20)`);

  // 4. Forbidden phrase penalty (-10 each, from remaining 20)
  let forbiddenScore = 20;
  const forbiddenFound = [];
  for (const phrase of (testCase.forbidden || [])) {
    if (lower.includes(phrase.toLowerCase())) {
      forbiddenScore -= 10;
      forbiddenFound.push(phrase);
    }
  }
  forbiddenScore = Math.max(0, forbiddenScore);
  score += forbiddenScore;
  maxPoints += 20;
  if (forbiddenFound.length > 0) {
    details.push(`Forbidden: ${forbiddenFound.join(', ')} FOUND (-${forbiddenFound.length * 10})`);
  } else {
    details.push(`Forbidden: none found (${forbiddenScore}/20)`);
  }

  return { score: Math.round((score / maxPoints) * 100), details };
}

function scoreCommunication(reply) {
  const lower = reply.toLowerCase();
  let score = 0;
  let maxPoints = 0;
  const details = [];

  // 1. Professional structure — uses paragraphs or bullet points (25 points)
  const hasStructure = reply.includes('\n') || reply.includes('•') || reply.includes('-') || reply.includes('1.');
  const structureScore = hasStructure ? 25 : 10;
  score += structureScore;
  maxPoints += 25;
  details.push(`Structure: ${hasStructure ? 'Yes' : 'Minimal'} (${structureScore}/25)`);

  // 2. Conversational / engineer tone (25 points)
  const toneMarkers = ['right', 'let\'s', 'here\'s', 'basically', 'typically', 'common', 'usually', 'i\'d', 'we', 'you\'ll', 'first thing', 'worth checking'];
  const toneFound = toneMarkers.filter(t => lower.includes(t));
  const toneScore = Math.min(25, toneFound.length * 5);
  score += toneScore;
  maxPoints += 25;
  details.push(`Tone markers: ${toneFound.length} (${toneScore}/25)`);

  // 3. Not overly generic (25 points) — penalise very short or boilerplate answers
  const genericPhrases = ['i\'m sorry', 'i cannot', 'as an ai', 'i don\'t have', 'please consult'];
  const genericFound = genericPhrases.filter(g => lower.includes(g));
  const genericPenalty = genericFound.length * 10;
  const genericScore = Math.max(0, 25 - genericPenalty);
  score += genericScore;
  maxPoints += 25;
  if (genericFound.length > 0) {
    details.push(`Generic phrases: ${genericFound.join(', ')} (-${genericPenalty})`);
  } else {
    details.push(`No generic phrases (${genericScore}/25)`);
  }

  // 4. Confidence — doesn't hedge excessively (25 points)
  const hedgeWords = ['maybe', 'perhaps', 'might want to consider', 'it could possibly', 'not entirely sure'];
  const hedgesFound = hedgeWords.filter(h => lower.includes(h));
  const hedgeScore = Math.max(0, 25 - hedgesFound.length * 8);
  score += hedgeScore;
  maxPoints += 25;
  details.push(`Confidence: ${hedgesFound.length} hedges (${hedgeScore}/25)`);

  return { score: Math.round((score / maxPoints) * 100), details };
}

// ─── API Call ────────────────────────────────────────────────────────────────

async function sendChat(message, sessionId) {
  const start = performance.now();
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sessionId }),
  });
  const elapsed = performance.now() - start;

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }

  const data = await res.json();
  return { reply: data.reply || data.response || '', elapsed, raw: data };
}

// ─── Runner ──────────────────────────────────────────────────────────────────

async function runBenchmark() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║         BOILERBRAIN CHAT AGENT BENCHMARK v2                 ║');
  console.log('║         Testing: /api/chat  •  Diagnostic Quality Focus    ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  const results = [];

  for (let i = 0; i < TEST_CASES.length; i++) {
    const tc = TEST_CASES[i];
    const sessionId = randomUUID();
    const testNum = `[${i + 1}/${TEST_CASES.length}]`;

    // Delay between tests to avoid rate limiter (20 req/min)
    if (i > 0) await delay(INTER_TEST_DELAY_MS);

    process.stdout.write(`${testNum} ${tc.name} ... `);

    try {
      // Send all setup messages in sequence (multi-turn conversation)
      let finalReply = '';
      let totalElapsed = 0;

      for (let j = 0; j < tc.setup.length; j++) {
        const msg = tc.setup[j];
        if (j > 0) await delay(2000); // brief pause between turns
        const { reply, elapsed } = await sendChat(msg.message, sessionId);
        totalElapsed += elapsed;
        finalReply = reply; // grade the last response

        // If the AI asked for boiler info and we have more setup messages, continue
        const lowerReply = reply.toLowerCase();
        const needsFollowUp = lowerReply.includes('what') && (lowerReply.includes('make') || lowerReply.includes('model'));
        if (needsFollowUp && j === 0 && tc.setup.length === 1) {
          const followUp = await sendChat(msg.message + ' — please diagnose this fault', sessionId);
          finalReply = followUp.reply;
          totalElapsed += followUp.elapsed;
        }
      }

      const speedScore = scoreSpeed(totalElapsed);
      const quality = scoreQuality(finalReply, tc);
      const comms = scoreCommunication(finalReply);
      const overall = Math.round((speedScore * 0.10) + (quality.score * 0.55) + (comms.score * 0.35));

      results.push({
        name: tc.name,
        category: tc.category,
        difficulty: tc.difficulty,
        speed: { ms: Math.round(totalElapsed), score: speedScore, grade: gradeSpeed(speedScore) },
        quality: { score: quality.score, details: quality.details },
        communication: { score: comms.score, details: comms.details },
        overall,
        reply: finalReply,
        replyLength: finalReply.length,
      });

      const grade = overall >= 90 ? 'A+' : overall >= 80 ? 'A' : overall >= 70 ? 'B+' : overall >= 60 ? 'B' : overall >= 50 ? 'C' : overall >= 30 ? 'D' : 'F';
      console.log(`${grade} (${overall}/100) [${Math.round(totalElapsed)}ms]`);

    } catch (err) {
      console.log(`FAIL — ${err.message}`);
      results.push({
        name: tc.name,
        category: tc.category,
        difficulty: tc.difficulty,
        speed: { ms: 0, score: 0, grade: 'F' },
        quality: { score: 0, details: ['Error: ' + err.message] },
        communication: { score: 0, details: [] },
        overall: 0,
        reply: '',
        error: err.message,
      });
    }
  }

  // ─── Report ──────────────────────────────────────────────────────────────
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                    DETAILED RESULTS');
  console.log('═══════════════════════════════════════════════════════════════');

  for (const r of results) {
    console.log('');
    console.log(`┌─ ${r.name}`);
    console.log(`│  Category: ${r.category}  •  Difficulty: ${r.difficulty}`);
    console.log(`│`);
    console.log(`│  SPEED:          ${r.speed.score}/100  (${r.speed.grade})  [${r.speed.ms}ms]`);
    console.log(`│  QUALITY:        ${r.quality.score}/100`);
    for (const d of r.quality.details) {
      console.log(`│    • ${d}`);
    }
    console.log(`│  COMMUNICATION:  ${r.communication.score}/100`);
    for (const d of r.communication.details) {
      console.log(`│    • ${d}`);
    }
    console.log(`│`);
    console.log(`│  OVERALL:        ${r.overall}/100`);
    console.log(`│`);
    console.log(`│  Response (first 200 chars):`);
    console.log(`│  "${(r.reply || '').substring(0, 200).replace(/\n/g, ' ')}..."`);
    console.log(`└──────────────────────────────────────────────────────`);
  }

  // ─── Summary Table ─────────────────────────────────────────────────────
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                    BENCHMARK SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  const valid = results.filter(r => r.overall > 0);
  const avgSpeed = Math.round(valid.reduce((s, r) => s + r.speed.score, 0) / valid.length);
  const avgQuality = Math.round(valid.reduce((s, r) => s + r.quality.score, 0) / valid.length);
  const avgComms = Math.round(valid.reduce((s, r) => s + r.communication.score, 0) / valid.length);
  const avgOverall = Math.round(valid.reduce((s, r) => s + r.overall, 0) / valid.length);
  const avgMs = Math.round(valid.reduce((s, r) => s + r.speed.ms, 0) / valid.length);

  const grade = (s) => s >= 90 ? 'A+' : s >= 80 ? 'A' : s >= 70 ? 'B+' : s >= 60 ? 'B' : s >= 50 ? 'C' : s >= 30 ? 'D' : 'F';

  console.log(`  API Endpoint:     ${API_BASE}/api/chat`);
  console.log(`  Model:            Claude 3.5 Haiku / GPT-4o-mini fallback`);
  console.log(`  Tests Run:        ${results.length}`);
  console.log(`  Avg Response:     ${avgMs}ms`);
  console.log('');
  console.log('  ┌────────────────────┬────────┬───────┐');
  console.log('  │ Metric             │ Score  │ Grade │');
  console.log('  ├────────────────────┼────────┼───────┤');
  console.log(`  │ Speed              │ ${String(avgSpeed).padStart(4)}/100│   ${grade(avgSpeed).padEnd(3)} │`);
  console.log(`  │ Quality            │ ${String(avgQuality).padStart(4)}/100│   ${grade(avgQuality).padEnd(3)} │`);
  console.log(`  │ Communication      │ ${String(avgComms).padStart(4)}/100│   ${grade(avgComms).padEnd(3)} │`);
  console.log('  ├────────────────────┼────────┼───────┤');
  console.log(`  │ OVERALL            │ ${String(avgOverall).padStart(4)}/100│   ${grade(avgOverall).padEnd(3)} │`);
  console.log('  └────────────────────┴────────┴───────┘');
  console.log('');

  // Category breakdown
  const categories = [...new Set(results.map(r => r.category))];
  console.log('  Category Breakdown:');
  for (const cat of categories) {
    const catResults = results.filter(r => r.category === cat);
    const catAvg = Math.round(catResults.reduce((s, r) => s + r.overall, 0) / catResults.length);
    console.log(`    ${cat.padEnd(15)} ${catAvg}/100  (${grade(catAvg)})`);
  }

  console.log('');
  console.log('  Individual Scores:');
  for (const r of results) {
    const g = r.overall >= 90 ? 'A+' : r.overall >= 80 ? 'A' : r.overall >= 70 ? 'B+' : r.overall >= 60 ? 'B' : r.overall >= 50 ? 'C' : r.overall >= 30 ? 'D' : 'F';
    const bar = '█'.repeat(Math.round(r.overall / 5)) + '░'.repeat(20 - Math.round(r.overall / 5));
    console.log(`    ${g.padEnd(3)} ${bar} ${r.overall}/100  ${r.name}`);
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Benchmark complete — ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
}

runBenchmark().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
