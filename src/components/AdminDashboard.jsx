import React from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Admin Dashboard Component
 * Simple admin interface for BoilerBrain
 */
export const AdminDashboard = () => {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-blue-500">BoilerBrain Admin</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-300">
              {user?.email || 'Admin User'}
            </span>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-zinc-900 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4 text-blue-400">System Status</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Frontend:</span>
                <span className="text-green-400">Online</span>
              </div>
              <div className="flex justify-between">
                <span>Backend API:</span>
                <span className="text-green-400">Online</span>
              </div>
              <div className="flex justify-between">
                <span>Database:</span>
                <span className="text-green-400">Connected</span>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4 text-blue-400">Quick Actions</h2>
            <div className="space-y-3">
              <button className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                View Chat Logs
              </button>
              <button className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors">
                Manage Fault Codes
              </button>
              <button className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors">
                Update Manuals
              </button>
            </div>
          </div>

          <div className="bg-zinc-900 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4 text-blue-400">Statistics</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total Chats:</span>
                <span className="text-yellow-400">--</span>
              </div>
              <div className="flex justify-between">
                <span>Fault Codes:</span>
                <span className="text-yellow-400">753</span>
              </div>
              <div className="flex justify-between">
                <span>Manuals:</span>
                <span className="text-yellow-400">5,670</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <div className="bg-zinc-900 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4 text-blue-400">Recent Activity</h2>
            <div className="text-gray-400">
              <p>No recent activity to display.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
