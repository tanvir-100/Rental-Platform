import React, { useState } from 'react';
import api from '../api/axios';

const CATEGORIES = ['Plumbing', 'Electrical', 'HVAC', 'Appliance', 'Structural', 'Other'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

export default function MaintenanceForm({ onCreated }) {
  const [form, setForm] = useState({ issueDescription: '', category: 'Other', priority: 'Medium' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.issueDescription.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const { data } = await api.post('/maintenance', form);
      onCreated?.(data);
      setForm({ issueDescription: '', category: 'Other', priority: 'Medium' });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not submit request.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card-padded space-y-4 animate-in">
      <h3 className="font-display font-semibold text-black">Report an issue</h3>
      {error && <p className="form-error">{error}</p>}
      <div className="form-group">
        <label className="label" htmlFor="issueDescription">Issue Description</label>
        <textarea
          id="issueDescription"
          required
          rows={3}
          placeholder="Describe the issue…"
          value={form.issueDescription}
          onChange={(e) => setForm({ ...form, issueDescription: e.target.value })}
          className="textarea"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="form-group">
          <label className="label" htmlFor="category">Category</label>
          <select
            id="category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="select"
          >
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="label" htmlFor="priority">Priority</label>
          <select
            id="priority"
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
            className="select"
          >
            {PRIORITIES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="btn-primary w-full"
      >
        {submitting ? 'Submitting…' : 'Submit request'}
      </button>
    </form>
  );
}
