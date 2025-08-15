import React from 'react';
import ChatDock from '../components/ChatDock';
import { DEMO } from '../utils/constants';
import ErrorBoundary from '../components/ErrorBoundary';

/**
 * Chat Page Component
 * Dedicated page that embeds the ChatDock component in embedded mode
 *
 * @returns {React.ReactElement} Chat page component with embedded chat interface
 */
export const Chat = () => {
  return (
    <div className="flex flex-col h-full w-full">
      <header className="mb-6">
        <h1 className="text-2xl font-medium tracking-tight text-white">Chat with Boiler Brain</h1>
        <p className="text-zinc-400 mt-2">
          Ask questions about boiler manuals, troubleshooting, or general heating system advice.
        </p>
      </header>

      <div className="flex-1 overflow-hidden">
        <ErrorBoundary componentName="Chat Interface">
          <ChatDock embedMode={true} className="h-full rounded-lg overflow-hidden shadow-lg" />
        </ErrorBoundary>
      </div>
    </div>
  );
};

export default Chat;
