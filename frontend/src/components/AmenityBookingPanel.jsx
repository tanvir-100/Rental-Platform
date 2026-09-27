import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import StatusTag from './StatusTag.jsx';

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
function toHHMM(mins) {
  const h = String(Math.floor(mins / 60)).padStart(2, '0');
  const m = String(mins % 60).padStart(2, '0');
  return `${h}:${m}`;
}

function generateSlots(openTime, closeTime, stepMinutes = 30) {
  const slots = [];
  for (let t = toMinutes(openTime); t < toMinutes(closeTime); t += stepMinutes) {
    slots.push(t);
  }
  return slots;
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

export default function AmenityBookingPanel({ amenity, onBooked }) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [bookings, setBookings] = useState([]);
  const [selectedStart, setSelectedStart] = useState(null);
  const [selectedEnd, setSelectedEnd] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  const slots = useMemo(() => generateSlots(amenity.openTime, amenity.closeTime), [amenity]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get(`/bookings/amenity/${amenity._id}`, { params: { date } })
      .then(({ data }) => {
        if (!cancelled) setBookings(data);
      })
      .finally(() => !cancelled && setLoading(false));
    setSelectedStart(null);
    setSelectedEnd(null);
    setError('');
    return () => {
      cancelled = true;
    };
  }, [amenity, date]);

  function isSlotBooked(slotStart) {
    const slotEnd = slotStart + 30;
    return bookings.some((b) => rangesOverlap(slotStart, slotEnd, toMinutes(b.checkInTime), toMinutes(b.checkOutTime)));
  }

  function isSlotSelected(slotStart) {
    if (selectedStart === null) return false;
    const end = selectedEnd ?? selectedStart + 30;
    return slotStart >= selectedStart && slotStart < end;
  }

  function handleSlotClick(slotStart) {
    setError('');
    if (isSlotBooked(slotStart)) return;

    if (selectedStart === null || (selectedEnd !== null)) {
      // start a fresh selection
      setSelectedStart(slotStart);
      setSelectedEnd(null);
      return;
    }

    // extending the range — only allow if every slot in between is free
    const rangeStart = Math.min(selectedStart, slotStart);
    const rangeEnd = Math.max(selectedStart, slotStart) + 30;
    for (let t = rangeStart; t < rangeEnd; t += 30) {
      if (isSlotBooked(t)) {
        setError('That range crosses an already-booked slot. Pick a shorter window.');
        return;
      }
    }
    setSelectedStart(rangeStart);
    setSelectedEnd(rangeEnd);
  }

  async function handleBook() {
    if (selectedStart === null) return;
    const checkInTime = toHHMM(selectedStart);
    const checkOutTime = toHHMM(selectedEnd ?? selectedStart + 30);

    setSubmitting(true);
    setError('');
    try {
      const { data } = await api.post('/bookings', {
        amenityId: amenity._id,
        bookingDate: date,
        checkInTime,
        checkOutTime,
      });
      setBookings((prev) => [...prev, data]);
      setSelectedStart(null);
      setSelectedEnd(null);
      onBooked?.(data);
    } catch (err) {
      // Surfaces a genuine server-side conflict (e.g. a race with another tenant) even though
      // the client already avoids picking a slot that looked booked at load time.
      setError(err.response?.data?.message || 'Could not complete booking.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card-padded animate-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-semibold text-black">{amenity.name}</h3>
          <p className="text-body-xs text-gray-500 mt-0.5">
            {amenity.openTime}–{amenity.closeTime} ·{' '}
            <StatusTag status={amenity.availabilityStatus} />
          </p>
        </div>
        <input
          type="date"
          min={today}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="input input-sm w-auto"
        />
      </div>

      {amenity.availabilityStatus !== 'Available' ? (
        <p className="text-body-sm text-gray-500">This amenity is closed for booking right now.</p>
      ) : loading ? (
        <p className="text-body-sm text-gray-500">Loading availability…</p>
      ) : (
        <>
          <div className="grid grid-cols-6 gap-1.5 mb-3">
            {slots.map((s) => {
              const booked = isSlotBooked(s);
              const selected = isSlotSelected(s);
              return (
                <button
                  key={s}
                  type="button"
                  disabled={booked}
                  onClick={() => handleSlotClick(s)}
                  title={booked ? 'Already booked' : toHHMM(s)}
                  className={`text-body-xs py-1.5 rounded border transition-colors ${
                    booked
                      ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                      : selected
                      ? 'bg-black text-white border-black'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  {toHHMM(s)}
                </button>
              );
            })}
          </div>

          {error && <p className="form-error mb-2">{error}</p>}

          <div className="flex items-center justify-between">
            <p className="text-body-xs text-gray-500">
              {selectedStart !== null
                ? `Selected: ${toHHMM(selectedStart)}–${toHHMM(selectedEnd ?? selectedStart + 30)}`
                : 'Tap a slot to start, tap again to extend your window.'}
            </p>
            <button
              onClick={handleBook}
              disabled={selectedStart === null || submitting}
              className="btn-primary btn-sm"
            >
              {submitting ? 'Booking…' : 'Book slot'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
