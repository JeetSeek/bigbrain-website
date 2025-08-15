import React from 'react';
import ServiceStatus from './ServiceStatus';
import PaymentHistory from './PaymentHistory';
import SupportTickets from './SupportTickets';
import ChatDock from './ChatDock';
import ManualFinderStandalone from './ManualFinderStandalone';
import SettingsPanel from './SettingsPanel'; // placeholder component
import FeedbackForm from './FeedbackForm';
import { TAB_IDS } from '../utils/constants';

/**
 * Main Content Component
 * Container for the application's main content area
 * Renders different components based on the active tab
 *
 * @component
 * @param {Object} props - Component props
 * @param {string} props.activeTab - The currently active tab ID
 * @param {Object} props.userData - User data containing service status, payment history, etc.
 * @param {string} props.userName - The user's display name
 */
export function MainContent({ activeTab, userData, userName }) {
  return (
    <div className="bg-[#000000] min-h-[calc(100vh-180px)] rounded-xl overflow-hidden">
      {activeTab === TAB_IDS.AI_CHAT && (
        <div className="p-1">
          <ChatDock embedMode={true} userName={userName} />
        </div>
      )}
      {activeTab === TAB_IDS.SETTINGS && (
        <div className="p-4 bg-[#1c1c1e] rounded-xl">
          <SettingsPanel userData={userData} userName={userName} />
        </div>
      )}
      {activeTab === TAB_IDS.SERVICE && (
        <div className="p-4 bg-[#1c1c1e] rounded-xl">
          <ServiceStatus status={userData.serviceStatus} />
        </div>
      )}
      {activeTab === TAB_IDS.PAYMENTS && (
        <div className="p-4 bg-[#1c1c1e] rounded-xl">
          <PaymentHistory history={userData.paymentHistory} />
        </div>
      )}
      {activeTab === TAB_IDS.MANUAL_FINDER && (
        <div className="p-4 bg-[#1c1c1e] rounded-xl">
          <ManualFinderStandalone />
        </div>
      )}
      {activeTab === TAB_IDS.TICKETS && (
        <div className="p-4 bg-[#1c1c1e] rounded-xl">
          <SupportTickets tickets={userData.supportTickets} />
        </div>
      )}
      {activeTab === TAB_IDS.FEEDBACK && (
        <div className="p-1">
          <FeedbackForm />
        </div>
      )}
    </div>
  );
}

// Default export for backward compatibility
export default MainContent;
