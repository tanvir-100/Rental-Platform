import React, { useState } from 'react';
import api from '../api/axios';
import StatusTag, { statusRowClass } from './StatusTag.jsx';

const STATUS_OPTIONS = ['Pending', 'In Progress', 'Completed'];

function NoteThread({ request, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  async function sendNote(e) {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    try {
      const { data } = await api.post(`/maintenance/${request._id}/notes`, { message });
      onUpdated(data);
      setMessage('');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 animate-in">
      <button onClick={() => setOpen(!open)} className="text-body-xs text-gray-600 hover:text-gray-900 underline">
        {open ? 'Hide' : `Notes (${request.notes?.length || 0})`}
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {request.notes?.map((n, i) => (
            <div key={i} className="text-body-xs bg-gray-50 rounded px-3 py-2">
              <span className="font-medium capitalize text-gray-700">{n.authorRole}:</span>{' '}
              <span className="text-gray-900">{n.message}</span>
            </div>
          ))}
          <form onSubmit={sendNote} className="flex gap-2">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write a message…"
              className="input input-sm flex-1"
            />
            <button
              disabled={sending}
              className="btn-primary btn-sm"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default function MaintenanceList({ requests, role, onUpdated }) {
  async function handleStatusChange(id, status) {
    const { data } = await api.patch(`/maintenance/${id}/status`, { status });
    onUpdated(data);
  }

  if (!requests.length) {
    return <p className="text-body-md text-gray-500 italic py-8 text-center">No maintenance requests yet.</p>;
  }

  return (
    <div className="space-y-3">
      {requests.map((r) => (
        <div key={r._id} className={`card card-hover rounded-md status-card-${r.status.toLowerCase().replace(' ', '-')}`}>
          <div className="card-body">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-body-md font-medium text-black">{r.issueDescription}</p>
                <p className="text-body-sm text-gray-500 mt-1">
                  <span className="font-medium text-gray-700">{r.category}</span> ·{' '}
                  <span className="font-medium text-gray-700">{r.priority}</span> priority
                  {role === 'owner' && r.tenant?.name ? (
                    <> · <span className="font-medium text-gray-700">{r.tenant.name}</span></>
                  ) : null}
                  {r.property?.name ? (
                    <> · <span className="font-medium text-gray-700">{r.property.name}</span></>
                  ) : null}
                </p>
                <p className="text-body-xs text-gray-400 mt-1">
                  Opened {new Date(r.createdAt).toLocaleDateString()}
                  {r.resolutionDate ? ` · Resolved ${new Date(r.resolutionDate).toLocaleDateString()}` : ''}
                </p>
              </div>
              <div className="flex flex-col items-end shrink-0 gap-2">
                <StatusTag status={r.status} />
                {role === 'owner' && (
                  <select
                    value={r.status}
                    onChange={(e) => handleStatusChange(r._id, e.target.value)}
                    className="select select-sm text-body-xs w-auto"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
            <NoteThread request={r} onUpdated={onUpdated} />
          </div>
        </div>
      ))}
    </div>
  );
}
