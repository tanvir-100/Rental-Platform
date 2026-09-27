import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState('tenant');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    propertyName: '',
    propertyAddress: '',
    propertyId: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdProperty, setCreatedProperty] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { user, property } = await register({ ...form, role });
      if (role === 'owner' && property) {
        setCreatedProperty(property);
        return; // show the property ID before navigating away
      }
      navigate(user.role === 'owner' ? '/owner' : '/tenant');
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed. Please try again.';
      // Check if it's an "email already exists" error
      if (message.toLowerCase().includes('already exists') || message.toLowerCase().includes('already registered')) {
        setError('email-exists');
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (createdProperty) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
        <div className="w-full max-w-md card-padded text-center animate-in">
          <h2 className="font-display text-xl font-semibold text-black mb-2">Property created</h2>
          <p className="text-body-sm text-gray-500 mb-4">
            Share this Property ID with your tenants so they can join <strong>{createdProperty.name}</strong> when they sign up.
          </p>
          <code className="block bg-gray-100 border border-gray-200 rounded px-3 py-2 text-body-sm font-mono break-all">
            {createdProperty._id}
          </code>
          <button
            onClick={() => navigate('/owner')}
            className="btn-primary w-full mt-5"
          >
            Go to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="font-display text-3xl font-semibold text-black">Create an account</h1>
        </div>

        <div className="tabs mb-4">
          {['tenant', 'owner'].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`tab ${role === r ? 'tab-active' : ''}`}
            >
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="card-padded space-y-5 animate-in">
          {error === 'email-exists' ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-body-sm font-medium text-amber-800">Email already registered</p>
                  <p className="text-body-xs text-amber-700 mt-1">An account with this email already exists.</p>
                  <p className="text-body-xs text-amber-700 mt-2">
                    <Link to="/login" className="font-medium underline underline-offset-2 hover:no-underline">
                      Sign in instead
                    </Link>
                    {' '}or{' '}
                    <button
                      type="button"
                      onClick={() => setError('')}
                      className="font-medium underline underline-offset-2 hover:no-underline"
                    >
                      Try a different email
                    </button>
                  </p>
                </div>
              </div>
            </div>
          ) : error ? (
            <p className="form-error bg-gray-100 border border-gray-200 rounded px-3 py-2">{error}</p>
          ) : null}

          <div className="form-group">
            <label className="label" htmlFor="name">Full name</label>
            <input
              id="name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input"
              autoComplete="name"
            />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input"
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="input"
              autoComplete="new-password"
            />
          </div>

          {role === 'owner' ? (
            <>
              <div className="form-group">
                <label className="label" htmlFor="propertyName">Property name</label>
                <input
                  id="propertyName"
                  required
                  value={form.propertyName}
                  onChange={(e) => setForm({ ...form, propertyName: e.target.value })}
                  className="input"
                  placeholder="e.g. Lakeview Residences"
                  autoComplete="off"
                />
              </div>
              <div className="form-group">
                <label className="label" htmlFor="propertyAddress">Property address</label>
                <input
                  id="propertyAddress"
                  required
                  value={form.propertyAddress}
                  onChange={(e) => setForm({ ...form, propertyAddress: e.target.value })}
                  className="input"
                  autoComplete="street-address"
                />
              </div>
            </>
          ) : (
            <div className="form-group">
              <label className="label" htmlFor="propertyId">Property ID</label>
              <input
                id="propertyId"
                required
                value={form.propertyId}
                onChange={(e) => setForm({ ...form, propertyId: e.target.value })}
                className="input font-mono"
                placeholder="Given to you by your property owner"
                autoComplete="off"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full"
          >
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-body-sm text-gray-500 mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-black font-medium underline underline-offset-2 hover:no-underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
