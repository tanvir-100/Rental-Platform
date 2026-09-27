import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { connected } = useSocket();

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-display text-xl font-semibold tracking-tight text-black">Keyhold</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              connected ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'
            }`}
            title="Real-time connection status"
          >
            {connected ? 'Live' : 'Offline'}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-600">
            {user?.name} · <span className="capitalize text-gray-900 font-medium">{user?.role}</span>
          </span>
          <button
            onClick={logout}
            className="btn-destructive btn-sm"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
