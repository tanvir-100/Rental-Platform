import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import MaintenanceList from '../components/MaintenanceList.jsx';
import StatusTag from '../components/StatusTag.jsx';

function StatCard({ label, value, color = 'blue' }) {
  const colorClasses = {
    blue: 'bg-accent-blue-bg border-l-4 border-accent-blue',
    green: 'bg-accent-green-bg border-l-4 border-accent-green',
    amber: 'bg-accent-amber-bg border-l-4 border-accent-amber',
    red: 'bg-accent-red-bg border-l-4 border-accent-red',
    gray: 'bg-gray-100 border-l-4 border-gray-400',
  };
  
  return (
    <div className={`p-5 rounded-md ${colorClasses[color] || colorClasses.blue}`}>
      <p className="text-body-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="font-display text-display-sm font-semibold mt-1 text-black">{value}</p>
    </div>
  );
}

function AddAmenityForm({ properties, onCreated }) {
  const [form, setForm] = useState({ name: '', propertyId: properties[0]?._id || '', description: '', openTime: '08:00', closeTime: '22:00' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const { data } = await api.post('/amenities', form);
      onCreated(data);
      setForm({ ...form, name: '', description: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not add amenity.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card-padded space-y-4 animate-in">
      <h3 className="font-display font-semibold text-black">Add an amenity</h3>
      {error && <p className="form-error">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div className="form-group col-span-2">
          <label className="label" htmlFor="amenityName">Name</label>
          <input
            id="amenityName"
            required
            placeholder="Name (e.g. Rooftop Pool)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input"
          />
        </div>
        <div className="form-group col-span-2">
          <label className="label" htmlFor="amenityProperty">Property</label>
          <select
            id="amenityProperty"
            value={form.propertyId}
            onChange={(e) => setForm({ ...form, propertyId: e.target.value })}
            className="select"
          >
            {properties.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="label" htmlFor="amenityOpenTime">Opens</label>
          <input
            id="amenityOpenTime"
            type="time"
            value={form.openTime}
            onChange={(e) => setForm({ ...form, openTime: e.target.value })}
            className="input"
          />
        </div>
        <div className="form-group">
          <label className="label" htmlFor="amenityCloseTime">Closes</label>
          <input
            id="amenityCloseTime"
            type="time"
            value={form.closeTime}
            onChange={(e) => setForm({ ...form, closeTime: e.target.value })}
            className="input"
          />
        </div>
        <div className="form-group col-span-2">
          <label className="label" htmlFor="amenityDescription">Description (optional)</label>
          <textarea
            id="amenityDescription"
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="textarea"
            rows={2}
          />
        </div>
      </div>
      <button
        disabled={submitting || !form.propertyId}
        className="btn-primary w-full"
      >
        {submitting ? 'Adding…' : 'Add amenity'}
      </button>
    </form>
  );
}

function AmenityRow({ amenity, onToggled, onUpdated, onDeleted }) {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      const next = amenity.availabilityStatus === 'Available' ? 'Unavailable' : 'Available';
      const { data } = await api.patch(`/amenities/${amenity._id}/availability`, { availabilityStatus: next });
      onToggled(data);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Are you sure you want to delete "${amenity.name}"?`)) {
      return;
    }
    setBusy(true);
    try {
      await api.delete(`/amenities/${amenity._id}`);
      onDeleted(amenity._id);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete amenity.');
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <EditAmenityForm
        amenity={amenity}
        onSaved={(updated) => {
          onUpdated(updated);
          setEditing(false);
        }}
        onCancelled={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="card card-hover flex items-center justify-between p-4">
      <div className="flex-1 min-w-0">
        <p className="text-body-md font-medium text-black">{amenity.name}</p>
        <p className="text-body-sm text-gray-500 mt-0.5">
          {amenity.property?.name ? `Property: ${amenity.property.name} • ` : ''}
          {amenity.openTime}–{amenity.closeTime}
          {amenity.description && ` • ${amenity.description}`}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <StatusTag status={amenity.availabilityStatus} />
        <button
          onClick={toggle}
          disabled={busy}
          className="btn-outline btn-sm"
        >
          {amenity.availabilityStatus === 'Available' ? 'Close' : 'Open'}
        </button>
        <button
          onClick={() => setEditing(true)}
          disabled={busy}
          className="btn-outline btn-sm"
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          disabled={busy}
          className="btn-outline btn-sm text-gray-600 hover:text-gray-900 border-gray-300"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function EditAmenityForm({ amenity, onSaved, onCancelled }) {
  const [form, setForm] = useState({
    name: amenity.name,
    description: amenity.description || '',
    openTime: amenity.openTime,
    closeTime: amenity.closeTime,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const { data } = await api.patch(`/amenities/${amenity._id}`, form);
      onSaved(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update amenity.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card-padded space-y-4 animate-in">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-black">Edit amenity</h3>
        <button
          type="button"
          onClick={onCancelled}
          className="text-gray-500 hover:text-gray-900 text-body-lg"
        >
          ✕
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div className="form-group col-span-2">
          <label className="label" htmlFor="editAmenityName">Name</label>
          <input
            id="editAmenityName"
            required
            placeholder="Name (e.g. Rooftop Pool)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input"
          />
        </div>
        <div className="form-group col-span-2">
          <label className="label" htmlFor="editAmenityDescription">Description (optional)</label>
          <textarea
            id="editAmenityDescription"
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="textarea"
            rows={2}
          />
        </div>
        <div className="form-group">
          <label className="label" htmlFor="editAmenityOpenTime">Opens</label>
          <input
            id="editAmenityOpenTime"
            type="time"
            value={form.openTime}
            onChange={(e) => setForm({ ...form, openTime: e.target.value })}
            className="input"
          />
        </div>
        <div className="form-group">
          <label className="label" htmlFor="editAmenityCloseTime">Closes</label>
          <input
            id="editAmenityCloseTime"
            type="time"
            value={form.closeTime}
            onChange={(e) => setForm({ ...form, closeTime: e.target.value })}
            className="input"
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancelled}
          disabled={submitting}
          className="btn-secondary btn-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary btn-sm"
        >
          {submitting ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}

function TenantsTab({ properties }) {
  const [tenants, setTenants] = useState({});
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});
  const [removing, setRemoving] = useState(null);

  useEffect(() => {
    properties.forEach((property) => {
      setLoading((prev) => ({ ...prev, [property._id]: true }));
      setErrors((prev) => ({ ...prev, [property._id]: null }));
      api.get(`/users/tenants/${property._id}`)
        .then(({ data }) => {
          setTenants((prev) => ({ ...prev, [property._id]: data }));
        })
        .catch((err) => {
          console.error('Failed to fetch tenants:', err);
          setErrors((prev) => ({ ...prev, [property._id]: err.response?.data?.message || 'Failed to load tenants' }));
        })
        .finally(() => {
          setLoading((prev) => ({ ...prev, [property._id]: false }));
        });
    });
  }, [properties]);

  async function handleRemoveTenant(propertyId, tenantId, tenantName) {
    if (!window.confirm(`Are you sure you want to remove ${tenantName} from this property?`)) {
      return;
    }
    setRemoving(tenantId);
    try {
      await api.delete(`/users/tenants/${propertyId}/${tenantId}`);
      setTenants((prev) => ({
        ...prev,
        [propertyId]: prev[propertyId]?.filter((t) => t._id !== tenantId) || [],
      }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove tenant.');
    } finally {
      setRemoving(null);
    }
  }

  async function handleRetry(propertyId) {
    setLoading((prev) => ({ ...prev, [propertyId]: true }));
    setErrors((prev) => ({ ...prev, [propertyId]: null }));
    try {
      const { data } = await api.get(`/users/tenants/${propertyId}`);
      setTenants((prev) => ({ ...prev, [propertyId]: data }));
    } catch (err) {
      console.error('Failed to fetch tenants:', err);
      setErrors((prev) => ({ ...prev, [propertyId]: err.response?.data?.message || 'Failed to load tenants' }));
    } finally {
      setLoading((prev) => ({ ...prev, [propertyId]: false }));
    }
  }

  if (properties.length === 0) {
    return (
      <div className="card-padded text-center">
        <p className="text-body-md text-gray-500">No properties found. Add a property to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="font-display text-heading-lg font-semibold text-black">Tenants</h2>
      <p className="text-body-sm text-gray-500">View and manage tenants across your properties.</p>
      
      {properties.map((property) => (
        <div key={property._id} className="card-padded">
          <h3 className="font-medium text-body-lg text-black mb-3">{property.name} ({property.address})</h3>
          
          {loading[property._id] ? (
            <p className="text-body-sm text-gray-500 italic">Loading tenants...</p>
          ) : errors[property._id] ? (
            <div className="flex items-center gap-2 text-body-sm text-red-600">
              <p>Error: {errors[property._id]}</p>
              <button
                onClick={() => handleRetry(property._id)}
                className="btn-outline btn-sm"
              >
                Retry
              </button>
            </div>
          ) : tenants[property._id]?.length === 0 ? (
            <p className="text-body-sm text-gray-500 italic">No tenants in this property yet.</p>
          ) : (
            <div className="space-y-2">
              {tenants[property._id]?.map((tenant) => (
                <div key={tenant._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-black">{tenant.name}</p>
                    <p className="text-body-sm text-gray-500">{tenant.email}</p>
                    <p className="text-body-xs text-gray-400">Joined: {new Date(tenant.createdAt).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveTenant(property._id, tenant._id, tenant.name)}
                    disabled={removing === tenant._id}
                    className="btn-outline btn-sm text-red-600 hover:text-red-700 border-red-300 flex-shrink-0 ml-4"
                  >
                    {removing === tenant._id ? 'Removing...' : 'Remove'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function BookingsTab({ properties }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/bookings/owner')
      .then(({ data }) => {
        setBookings(data);
      })
      .catch((err) => {
        console.error('Failed to fetch bookings:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="card-padded text-center">
        <p className="text-body-md text-gray-500">Loading bookings...</p>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="card-padded text-center">
        <p className="text-body-md text-gray-500">No amenity bookings found for your properties.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="font-display text-heading-lg font-semibold text-black">Amenity Bookings</h2>
      <p className="text-body-sm text-gray-500">View all amenity bookings across your properties.</p>
      
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Tenant</th>
              <th>Property</th>
              <th>Amenity</th>
              <th>Date</th>
              <th>Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <tr key={booking._id}>
                <td>
                  <p className="font-medium text-black">{booking.tenant?.name || 'Unknown'}</p>
                  <p className="text-body-xs text-gray-500">{booking.tenant?.email || ''}</p>
                </td>
                <td className="text-gray-500">
                  {booking.amenity?.property?.name || 'Unknown Property'}
                </td>
                <td className="text-black">{booking.amenity?.name || 'Unknown Amenity'}</td>
                <td className="text-gray-500">{new Date(booking.bookingDate).toLocaleDateString()}</td>
                <td className="text-gray-500">{booking.checkInTime} – {booking.checkOutTime}</td>
                <td>
                  <StatusTag status={booking.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PropertiesTab({ properties, onPropertyAdded }) {
  const [form, setForm] = useState({ name: '', address: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const { data } = await api.post('/properties', form);
      onPropertyAdded(data);
      setForm({ name: '', address: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not add property.');
    } finally {
      setSubmitting(false);
    }
  }

  async function copyToClipboard(text, propertyId) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(propertyId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  return (
    <div className="space-y-6">
      <div className="card-padded space-y-4 animate-in">
        <h3 className="font-display font-semibold text-black">Add a new property</h3>
        {error && <p className="form-error">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group col-span-2">
              <label className="label" htmlFor="propertyName">Property name</label>
              <input
                id="propertyName"
                required
                placeholder="Property name (e.g. Sunset Apartments)"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input"
              />
            </div>
            <div className="form-group col-span-2">
              <label className="label" htmlFor="propertyAddress">Full address</label>
              <textarea
                id="propertyAddress"
                required
                placeholder="Full address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="textarea"
                rows={2}
              />
            </div>
          </div>
          <button
            disabled={submitting}
            className="btn-primary w-full"
          >
            {submitting ? 'Adding…' : 'Add property'}
          </button>
        </form>
      </div>

      <div className="space-y-4">
        <h2 className="font-display text-heading-lg font-semibold text-black">Your Properties</h2>
        <p className="text-body-sm text-gray-500">Manage your rental properties.</p>
        
        {properties.length === 0 ? (
          <div className="card-padded text-center">
            <p className="text-body-md text-gray-500">No properties yet. Add your first property above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {properties.map((property) => (
              <div key={property._id} className="card card-hover p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-black">{property.name}</p>
                    <p className="text-body-sm text-gray-500 mt-1">{property.address}</p>
                    <p className="text-body-xs text-gray-400 mt-2 font-mono bg-gray-100 px-2 py-1 rounded break-all">
                      Property ID: <span className="font-medium text-gray-700">{property._id}</span>
                    </p>
                    <p className="text-body-xs text-gray-400 mt-1">Created: {new Date(property.createdAt).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(property._id, property._id)}
                    className={`btn-sm transition-colors ${
                      copiedId === property._id
                        ? 'btn-primary'
                        : 'btn-outline'
                    }`}
                  >
                    {copiedId === property._id ? 'Copied!' : 'Copy ID'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function OwnerDashboard() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [properties, setProperties] = useState([]);
  const [requests, setRequests] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    api.get('/properties/mine').then(({ data }) => setProperties(data));
    api.get('/maintenance').then(({ data }) => setRequests(data));
    api.get('/amenities').then(({ data }) => setAmenities(data));
  }, []);

  useEffect(() => {
    if (!socket) return undefined;
    const onNew = (req) => setRequests((prev) => [req, ...prev]);
    const onUpdated = (req) => setRequests((prev) => prev.map((r) => (r._id === req._id ? req : r)));
    socket.on('maintenance:new', onNew);
    socket.on('maintenance:updated', onUpdated);
    return () => {
      socket.off('maintenance:new', onNew);
      socket.off('maintenance:updated', onUpdated);
    };
  }, [socket]);

  const stats = useMemo(() => {
    const pending = requests.filter((r) => r.status === 'Pending').length;
    const inProgress = requests.filter((r) => r.status === 'In Progress').length;
    const completed = requests.filter((r) => r.status === 'Completed').length;
    const completionRate = requests.length ? Math.round((completed / requests.length) * 100) : 0;

    const resolvedWithTime = requests.filter((r) => r.status === 'Completed' && r.resolutionDate);
    const avgHours = resolvedWithTime.length
      ? Math.round(
          resolvedWithTime.reduce((sum, r) => sum + (new Date(r.resolutionDate) - new Date(r.createdAt)) / 36e5, 0) /
            resolvedWithTime.length
        )
      : null;

    return { pending, inProgress, completed, completionRate, avgHours };
  }, [requests]);

  function upsertRequest(updated) {
    setRequests((prev) => (prev.some((r) => r._id === updated._id) ? prev.map((r) => (r._id === updated._id ? updated : r)) : prev));
  }

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-display text-display-sm font-semibold text-black mb-1">Operations overview</h1>
      <p className="text-body-sm text-gray-500 mb-6">{properties.length} propert{properties.length === 1 ? 'y' : 'ies'} under management</p>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <StatCard label="Pending" value={stats.pending} color="amber" />
        <StatCard label="In Progress" value={stats.inProgress} color="blue" />
        <StatCard label="Completed" value={stats.completed} color="green" />
        <StatCard label="Completion rate" value={`${stats.completionRate}%`} color="gray" />
        <StatCard label="Avg. resolution" value={stats.avgHours !== null ? `${stats.avgHours}h` : '—'} color="gray" />
      </div>

      <div className="tabs mb-6">
        {[
          ['overview', 'Maintenance'],
          ['properties', 'Properties'],
          ['amenities', 'Amenities'],
          ['tenants', 'Tenants'],
          ['bookings', 'Bookings'],
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

      {tab === 'overview' && <MaintenanceList requests={requests} role="owner" onUpdated={upsertRequest} />}

      {tab === 'properties' && <PropertiesTab properties={properties} onPropertyAdded={(p) => setProperties((prev) => [p, ...prev])} />}

      {tab === 'tenants' && <TenantsTab properties={properties} />}

      {tab === 'bookings' && <BookingsTab properties={properties} />}

      {tab === 'amenities' && (
        <div className="space-y-6">
          {properties.length > 0 && <AddAmenityForm properties={properties} onCreated={(a) => setAmenities((prev) => [a, ...prev])} />}
          <div className="space-y-2">
            {amenities.length === 0 && <p className="text-body-md text-gray-500 italic py-8 text-center">No amenities yet — add one above.</p>}
            {amenities.map((a) => (
              <AmenityRow
                key={a._id}
                amenity={a}
                onToggled={(u) => setAmenities((prev) => prev.map((x) => (x._id === u._id ? u : x)))}
                onUpdated={(u) => setAmenities((prev) => prev.map((x) => (x._id === u._id ? u : x)))}
                onDeleted={(id) => setAmenities((prev) => prev.filter((x) => x._id !== id))}
              />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
