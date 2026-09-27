import React from 'react';

const STATUS_STYLES = {
  Pending: 'status-pending',
  'In Progress': 'status-inprogress',
  Completed: 'status-completed',
  Confirmed: 'status-confirmed',
  CheckedIn: 'status-checkedin',
  CheckedOut: 'status-checkedout',
  Cancelled: 'status-cancelled',
  Available: 'status-available',
  Unavailable: 'status-unavailable',
};

export function statusRowClass(status) {
  return STATUS_STYLES[status] || 'status-pending';
}

export default function StatusTag({ status }) {
  const className = STATUS_STYLES[status] || 'status-pending';
  return <span className={className}>{status}</span>;
}
