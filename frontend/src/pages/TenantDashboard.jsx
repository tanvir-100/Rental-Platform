import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { useSocket } from '../context/SocketContext';
import MaintenanceForm from '../components/MaintenanceForm.jsx';
import MaintenanceList from '../components/MaintenanceList.jsx';
import AmenityBookingPanel from '../components/AmenityBookingPanel.jsx';
import MyBookingsList from '../components/MyBookingsList.jsx';

export default function TenantDashboard() {
  const { socket } = useSocket();
  const [requests, setRequests] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [tab, setTab] = useState('maintenance');

  useEffect(() => {
    api.get('/maintenance').then(({ data }) => setRequests(data));
    api.get('/amenities').then(({ data }) => setAmenities(data));
    api.get('/bookings/mine').then(({ data }) => setBookings(data));
  }, []);

  useEffect(() => {
    if (!socket) return undefined;
    const onUpdated = (updated) => {
      setRequests((prev) => {
        const exists = prev.some((r) => r._id === updated._id);
        return exists ? prev.map((r) => (r._id === updated._id ? updated : r)) : prev;
      });
    };
    socket.on('maintenance:updated', onUpdated);
    return () => socket.off('maintenance:updated', onUpdated);
  }, [socket]);

  function upsertRequest(updated) {
    setRequests((prev) => {
      const exists = prev.some((r) => r._id === updated._id);
      return exists ? prev.map((r) => (r._id === updated._id ? updated : r)) : [updated, ...prev];
    });
  }

  function upsertBooking(updated) {
    setBookings((prev) => {
      const exists = prev.some((b) => b._id === updated._id);
      return exists ? prev.map((b) => (b._id === updated._id ? updated : b)) : [updated, ...prev];
    });
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-display text-display-sm font-semibold text-black mb-1">Your home base</h1>
      <p className="text-body-sm text-gray-500 mb-6">Report issues and book shared amenities — all updates arrive here in real time.</p>

      <div className="tabs mb-6">
        {[
          ['maintenance', 'Maintenance'],
          ['amenities', 'Book an amenity'],
          ['bookings', 'My bookings'],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`tab ${tab === key ? 'tab-active' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'maintenance' && (
        <div className="space-y-6">
          <MaintenanceForm onCreated={upsertRequest} />
          <MaintenanceList requests={requests} role="tenant" onUpdated={upsertRequest} />
        </div>
      )}

      {tab === 'amenities' && (
        <div className="space-y-5">
          {amenities.length === 0 && <p className="text-body-md text-gray-500 italic py-8 text-center">No amenities listed for your property yet.</p>}
          {amenities.map((a) => (
            <AmenityBookingPanel key={a._id} amenity={a} onBooked={upsertBooking} />
          ))}
        </div>
      )}

      {tab === 'bookings' && <MyBookingsList bookings={bookings} onUpdated={upsertBooking} />}
    </main>
  );
}
