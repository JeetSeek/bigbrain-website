import React from 'react';
import { TAB_IDS } from '../utils/constants';
import {
  FiMessageCircle, FiBook, FiSearch, FiPhone, FiPackage,
  FiActivity, FiThermometer, FiWind, FiDroplet, FiCloudDrizzle,
  FiFileText, FiAlertTriangle, FiClipboard, FiTool, FiZap,
  FiHome, FiCpu
} from 'react-icons/fi';

const FEATURE_SECTIONS = [
  {
    title: 'AI-Powered',
    subtitle: 'Intelligent diagnostics at your fingertips',
    accent: '#007AFF',
    features: [
      {
        id: TAB_IDS.CHAT,
        icon: FiMessageCircle,
        title: 'Fault Finder Chat',
        desc: 'AI diagnostics with a lead engineer — describe your fault and get step-by-step guidance',
        badge: 'AI',
        gradient: 'linear-gradient(135deg, #007AFF 0%, #0051D5 100%)',
      },
      {
        id: TAB_IDS.FAULT_CODES,
        icon: FiSearch,
        title: 'Fault Code Lookup',
        desc: 'Instant lookup across all major manufacturers — causes, fixes and parts',
        gradient: 'linear-gradient(135deg, #5856D6 0%, #3634A3 100%)',
      },
    ],
  },
  {
    title: 'Manuals & Reference',
    subtitle: 'Everything you need on-site',
    accent: '#34C759',
    features: [
      {
        id: TAB_IDS.MANUAL_FINDER,
        icon: FiBook,
        title: 'Boiler Manuals',
        desc: 'Search 5,670+ manufacturer manuals — instant PDF access',
        badge: '5,670+',
        gradient: 'linear-gradient(135deg, #34C759 0%, #248A3D 100%)',
      },
      {
        id: TAB_IDS.HELPLINES,
        icon: FiPhone,
        title: 'Tech Helplines',
        desc: 'Direct lines to every manufacturer technical support team',
        gradient: 'linear-gradient(135deg, #30B0C7 0%, #1A8A9E 100%)',
      },
      {
        id: TAB_IDS.PARTS_FINDER,
        icon: FiPackage,
        title: 'Parts Finder',
        desc: 'Find the right replacement part for any boiler',
        gradient: 'linear-gradient(135deg, #FF9500 0%, #CC7700 100%)',
      },
    ],
  },
  {
    title: 'Gas Calculators',
    subtitle: 'Professional tools for the job',
    accent: '#FF9500',
    features: [
      {
        id: TAB_IDS.GAS_RATE,
        icon: FiActivity,
        title: 'Gas Rate',
        desc: 'Calculate gas consumption rate from meter readings',
        gradient: 'linear-gradient(135deg, #FF9500 0%, #CC7700 100%)',
      },
      {
        id: TAB_IDS.ROOM_BTU,
        icon: FiThermometer,
        title: 'BTU Calculator',
        desc: 'Room heat loss and radiator sizing',
        gradient: 'linear-gradient(135deg, #FF3B30 0%, #CC2F26 100%)',
      },
      {
        id: TAB_IDS.GAS_PIPE,
        icon: FiTool,
        title: 'Pipe Sizing',
        desc: 'BS 6891 gas pipe sizing calculator',
        gradient: 'linear-gradient(135deg, #8E8E93 0%, #636366 100%)',
      },
      {
        id: TAB_IDS.GAS_DIVERSITY,
        icon: FiZap,
        title: 'Meter Diversity',
        desc: 'Gas meter diversity factor calculator',
        gradient: 'linear-gradient(135deg, #AF52DE 0%, #8944B3 100%)',
      },
      {
        id: TAB_IDS.VENTILATION,
        icon: FiWind,
        title: 'Ventilation',
        desc: 'BS 5440 ventilation requirements calculator',
        gradient: 'linear-gradient(135deg, #30B0C7 0%, #1A8A9E 100%)',
      },
      {
        id: TAB_IDS.PURGE_CALC,
        icon: FiDroplet,
        title: 'Purge & Tightness',
        desc: 'Purge time and tightness test calculator',
        gradient: 'linear-gradient(135deg, #007AFF 0%, #0051D5 100%)',
      },
      {
        id: TAB_IDS.FLUE_GAS,
        icon: FiCloudDrizzle,
        title: 'Flue Gas Analyser',
        desc: 'Record and analyse flue gas readings',
        gradient: 'linear-gradient(135deg, #5856D6 0%, #3634A3 100%)',
      },
    ],
  },
  {
    title: 'Forms & Records',
    subtitle: 'Digital paperwork — fill, save and share',
    accent: '#FF3B30',
    features: [
      {
        id: TAB_IDS.CP12_FORM,
        icon: FiFileText,
        title: 'CP12 Gas Safety',
        desc: 'Landlord gas safety record',
        gradient: 'linear-gradient(135deg, #FF3B30 0%, #CC2F26 100%)',
      },
      {
        id: TAB_IDS.GAS_SERVICE,
        icon: FiClipboard,
        title: 'Service Record',
        desc: 'Gas appliance service record',
        gradient: 'linear-gradient(135deg, #34C759 0%, #248A3D 100%)',
      },
      {
        id: TAB_IDS.GAS_BREAKDOWN,
        icon: FiTool,
        title: 'Breakdown Record',
        desc: 'Gas appliance breakdown report',
        gradient: 'linear-gradient(135deg, #8E8E93 0%, #636366 100%)',
      },
      {
        id: TAB_IDS.INSTALLATION,
        icon: FiHome,
        title: 'Installation Record',
        desc: 'Installation & commissioning checklist',
        gradient: 'linear-gradient(135deg, #007AFF 0%, #0051D5 100%)',
      },
    ],
  },
];

const HomePage = ({ onNavigate }) => {
  return (
    <div
      className="home-page"
      style={{
        padding: '16px',
        paddingBottom: '32px',
        fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Display, SF Pro Text, sans-serif',
      }}
    >
      {/* Hero */}
      <div
        style={{
          textAlign: 'center',
          padding: '28px 16px 20px',
          marginBottom: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '8px' }}>
          <img src="/brain-icon-nBG.png" alt="" style={{ width: 40, height: 40 }} />
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 700,
              letterSpacing: '-0.8px',
              color: '#1C1C1E',
              margin: 0,
            }}
          >
            BoilerBrain
          </h1>
        </div>
        <p
          style={{
            fontSize: '15px',
            color: '#636366',
            margin: 0,
            letterSpacing: '-0.2px',
          }}
        >
          Your complete gas engineering toolkit
        </p>
      </div>

      {/* Sections */}
      {FEATURE_SECTIONS.map((section) => (
        <div key={section.title} style={{ marginBottom: '28px' }}>
          {/* Section header */}
          <div style={{ padding: '0 4px', marginBottom: '12px' }}>
            <h2
              style={{
                fontSize: '20px',
                fontWeight: 700,
                letterSpacing: '-0.4px',
                color: '#1C1C1E',
                margin: '0 0 2px 0',
              }}
            >
              {section.title}
            </h2>
            <p
              style={{
                fontSize: '13px',
                color: '#636366',
                margin: 0,
                letterSpacing: '-0.1px',
              }}
            >
              {section.subtitle}
            </p>
          </div>

          {/* Feature cards grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: '12px',
            }}
          >
            {section.features.map((feature) => (
              <button
                key={feature.id}
                onClick={() => onNavigate(feature.id)}
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '16px',
                  borderRadius: '16px',
                  border: '1px solid rgba(0,0,0,0.06)',
                  background: '#fff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                  minHeight: '130px',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)';
                }}
                onTouchStart={(e) => { e.currentTarget.style.transform = 'scale(0.97)'; }}
                onTouchEnd={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                {/* Icon circle */}
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '12px',
                    background: feature.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '12px',
                    flexShrink: 0,
                  }}
                >
                  <feature.icon size={20} color="#fff" strokeWidth={2} />
                </div>

                {/* Badge */}
                {feature.badge && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.3px',
                      padding: '3px 7px',
                      borderRadius: '6px',
                      background: feature.gradient,
                      color: '#fff',
                    }}
                  >
                    {feature.badge}
                  </span>
                )}

                {/* Title */}
                <div
                  style={{
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#1C1C1E',
                    letterSpacing: '-0.2px',
                    marginBottom: '4px',
                    lineHeight: 1.25,
                  }}
                >
                  {feature.title}
                </div>

                {/* Description */}
                <div
                  style={{
                    fontSize: '12px',
                    lineHeight: 1.35,
                    color: '#636366',
                    letterSpacing: '-0.1px',
                  }}
                >
                  {feature.desc}
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default HomePage;
