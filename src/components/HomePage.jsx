import React from 'react';
import { TAB_IDS } from '../utils/constants';
import {
  FiMessageCircle, FiBook, FiSearch, FiPhone, FiPackage,
  FiActivity, FiThermometer, FiWind, FiDroplet, FiCloudDrizzle,
  FiFileText, FiAlertTriangle, FiClipboard, FiTool, FiZap,
  FiHome, FiArrowRight
} from 'react-icons/fi';

const S = {
  page: {
    minHeight: '100%',
    background: '#F2F2F7',
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif',
  },
  inner: {
    maxWidth: 560,
    margin: '0 auto',
    padding: '0 14px 48px',
  },
};

const RECORDS = [
  { id: TAB_IDS.CP12_FORM,       icon: FiFileText,      title: 'CP12 Record',        desc: 'Landlord cert',      color: '#FF3B30' },
  { id: TAB_IDS.MANUAL_FINDER,   icon: FiBook,          title: 'Boiler Manuals',     desc: '5,670+ PDFs',        color: '#34C759' },
  { id: TAB_IDS.FAULT_CODES,     icon: FiSearch,        title: 'Fault Codes',        desc: '13,800+ codes',      color: '#5856D6' },
  { id: TAB_IDS.WARNING_NOTICE,  icon: FiAlertTriangle, title: 'Warning Notice',     desc: 'ID / AR / NCS',      color: '#FF9500' },
  { id: TAB_IDS.GAS_SERVICE,     icon: FiClipboard,     title: 'Service Record',     desc: 'Annual service',     color: '#30B0C7' },
  { id: TAB_IDS.HELPLINES,       icon: FiPhone,         title: 'Tech Helplines',     desc: 'Tap to call',        color: '#007AFF' },
];

const CALCS = [
  { id: TAB_IDS.GAS_RATE,        icon: FiActivity,      title: 'Gas Rate',    color: '#FF9500' },
  { id: TAB_IDS.ROOM_BTU,        icon: FiThermometer,   title: 'BTU Calc',    color: '#FF3B30' },
  { id: TAB_IDS.GAS_PIPE,        icon: FiTool,          title: 'Pipe Size',   color: '#636366' },
  { id: TAB_IDS.PURGE_CALC,      icon: FiDroplet,       title: 'Purge',       color: '#007AFF' },
  { id: TAB_IDS.VENTILATION,     icon: FiWind,          title: 'Ventilation', color: '#30B0C7' },
  { id: TAB_IDS.FLUE_GAS,        icon: FiCloudDrizzle,  title: 'Flue Gas',    color: '#5856D6' },
  { id: TAB_IDS.RADIATOR_SIZING, icon: FiThermometer,   title: 'Radiator',    color: '#FF2D55' },
  { id: TAB_IDS.SYSTEM_VOLUME,   icon: FiDroplet,       title: 'Sys Volume',  color: '#34C759' },
  { id: TAB_IDS.GAS_DIVERSITY,   icon: FiZap,           title: 'Meter Div',   color: '#AF52DE' },
  { id: TAB_IDS.PARTS_FINDER,    icon: FiPackage,       title: 'Parts',       color: '#FF9500' },
  { id: TAB_IDS.INSTALLATION,    icon: FiHome,          title: 'Install',     color: '#007AFF' },
  { id: TAB_IDS.GAS_BREAKDOWN,   icon: FiTool,          title: 'Breakdown',   color: '#8E8E93' },
];

const SectionLabel = ({ children }) => (
  <div style={{
    fontSize: 12,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.10em',
    color: '#8E8E93',
    marginBottom: 10,
    paddingLeft: 4,
  }}>
    {children}
  </div>
);

const HomePage = ({ onNavigate }) => {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div style={S.page}>
      {/* ── APP HEADER ─────────────────────────────────────── */}
      <div style={{
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        borderBottom: '0.5px solid rgba(0,0,0,0.1)',
        padding: '14px 18px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <img
          src="/brain-icon-nBG.png"
          alt="1GassApp"
          style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0 }}
        />
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#1C1C1E', letterSpacing: '-0.4px', lineHeight: 1.2 }}>
            1GassApp
          </div>
          <div style={{ fontSize: 13, color: '#8E8E93', marginTop: 1 }}>{greeting}</div>
        </div>
      </div>

      <div style={S.inner}>

        {/* ── DIAGNOSE HERO CARD ─────────────────────────────── */}
        <div style={{ marginTop: 18, marginBottom: 22 }}>
          <button
            onClick={() => onNavigate(TAB_IDS.CHAT)}
            style={{
              display: 'block',
              width: '100%',
              borderRadius: 28,
              background: 'linear-gradient(145deg, #1A7FFF 0%, #0040CC 100%)',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              boxShadow: '0 10px 40px rgba(0,100,255,0.30), 0 2px 10px rgba(0,80,220,0.20)',
              overflow: 'hidden',
              textAlign: 'left',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(0,100,255,0.36)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 10px 40px rgba(0,100,255,0.30), 0 2px 10px rgba(0,80,220,0.20)'; }}
            onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.98)'; }}
            onTouchEnd={e => { e.currentTarget.style.transform = ''; }}
          >
            {/* Card body */}
            <div style={{ padding: '22px 22px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 14,
                      background: 'rgba(255,255,255,0.18)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <FiMessageCircle size={22} color="#fff" strokeWidth={2.5} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)' }}>
                      AI Diagnostics
                    </span>
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.7px', lineHeight: 1.15, marginBottom: 8 }}>
                    Diagnose a Fault
                  </div>
                  <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.78)', lineHeight: 1.5, letterSpacing: '-0.1px' }}>
                    Describe the boiler, system type and fault — get numbered checks from a 25-year Gas Safe engineer
                  </div>
                </div>
                <div style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.18)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, marginTop: 2,
                }}>
                  <FiArrowRight size={20} color="#fff" strokeWidth={2.5} />
                </div>
              </div>
            </div>

            {/* Stats strip */}
            <div style={{ display: 'flex', borderTop: '1px solid rgba(255,255,255,0.13)' }}>
              {[
                // Matches the Manual Finder stats strip. TODO(live-count):
                // wire to a cached boiler_manuals distinct-manufacturer RPC
                // so this stays honest without a manual bump each import.
                { val: '60+ Brands', lbl: 'All major makes' },
                { val: 'GPT-4o', lbl: 'AI engine' },
                { val: '13,800+ Codes', lbl: 'Fault database' },
              ].map((s, i) => (
                <div key={i} style={{
                  flex: 1, padding: '10px 8px', textAlign: 'center',
                  borderRight: i < 2 ? '1px solid rgba(255,255,255,0.13)' : 'none',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{s.val}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.50)', marginTop: 1 }}>{s.lbl}</div>
                </div>
              ))}
            </div>
          </button>
        </div>

        {/* ── RECORDS & REFERENCE ────────────────────────────── */}
        <div style={{ marginBottom: 22 }}>
          <SectionLabel>Records &amp; Reference</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {RECORDS.map(tool => (
              <button
                key={tool.id}
                onClick={() => onNavigate(tool.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 14px',
                  borderRadius: 22,
                  border: 'none',
                  background: '#fff',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'transform 0.15s ease',
                }}
                onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.96)'; }}
                onTouchEnd={e => { e.currentTarget.style.transform = ''; }}
              >
                <div style={{
                  width: 38, height: 38, borderRadius: 13,
                  background: tool.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: `0 3px 10px ${tool.color}55`,
                }}>
                  <tool.icon size={18} color="#fff" strokeWidth={2} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 650, color: '#1C1C1E', letterSpacing: '-0.2px', lineHeight: 1.25 }}>{tool.title}</div>
                  <div style={{ fontSize: 11, color: '#8E8E93', marginTop: 2 }}>{tool.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── CALCULATORS ────────────────────────────────────── */}
        <div>
          <SectionLabel>Calculators &amp; Tools</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {CALCS.map(tool => (
              <button
                key={tool.id}
                onClick={() => onNavigate(tool.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 7,
                  padding: '13px 6px 11px',
                  borderRadius: 20,
                  border: 'none',
                  background: '#fff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease',
                }}
                onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.94)'; }}
                onTouchEnd={e => { e.currentTarget.style.transform = ''; }}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: 12,
                  background: tool.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 2px 8px ${tool.color}50`,
                }}>
                  <tool.icon size={17} color="#fff" strokeWidth={2} />
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#1C1C1E', textAlign: 'center', lineHeight: 1.3 }}>{tool.title}</div>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default HomePage;
