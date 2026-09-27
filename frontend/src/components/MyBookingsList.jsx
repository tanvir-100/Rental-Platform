import React from 'react';
import api from '../api/axios';
import StatusTag from './StatusTag.jsx';

export default function MyBookingsList({ bookings, onUpdated }) {
  async function act(id, action) {
    const { data } = await api.patch(`/bookings/${id}/${action}`);
    onUpdated(data);
  }

  if (!bookings.length) {
    return <p className="text-body-md text-gray-500 italic py-8 text-center">No bookings yet.</p>;
  }

  return (
    <div className="space-y-2">
      {bookings.map((b) => (
        <div
          key={b._id}
          className="card card-hover flex items-center justify-between p-4"
        >
          <div>
            <p className="text-body-md font-medium text-black">{b.amenity?.name}</p>
            <p className="text-body-sm text-gray-500 mt-0.5">
              {new Date(b.bookingDate).toLocaleDateString()} · {b.checkInTime}–{b.checkOutTime}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusTag status={b.status} />
            {b.status === 'Confirmed' && (
              <>
                <button onClick={() => act(b._id, 'checkin')} className="btn-outline btn-sm">
                  Check in
                </button>
                <button onClick={() => act(b._id, 'cancel')} className="btn-outline btn-sm text-gray-600 hover:text-gray-900 border-gray-300">
                  Cancel
                </button>
              </>
            )}
            {b.status === 'CheckedIn' && (
              <button onClick={() => act(b._id, 'checkout')} className="btn-primary btn-sm">
                Check out
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
