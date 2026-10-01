import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  let badgeStyle = 'bg-slate-800 text-slate-300 border-slate-700';

  switch (status.toUpperCase()) {
    case 'SUCCESS':
      badgeStyle = 'bg-emerald-950 text-emerald-400 border-emerald-800';
      break;
    case 'FAILED':
      badgeStyle = 'bg-rose-950 text-rose-400 border-rose-800';
      break;
    case 'PROCESSING':
    case 'DEFERRED':
      badgeStyle = 'bg-fuchsia-950 text-fuchsia-400 border-fuchsia-800';
      break;
    case 'RECEIVED':
      badgeStyle = 'bg-sky-950 text-sky-400 border-sky-800';
      break;
  }

  return (
    <span className={`inline-flex items-center whitespace-nowrap px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeStyle}`}>
      {status}
    </span>
  );
};

export const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
  let badgeStyle = 'bg-slate-800 text-slate-300 border-slate-700';

  switch (priority.toUpperCase()) {
    case 'CRITICAL':
      badgeStyle = 'bg-red-950 text-red-400 border-red-800 font-bold';
      break;
    case 'HIGH':
      badgeStyle = 'bg-brand-950 text-brand-400 border-brand-800';
      break;
    case 'MEDIUM':
      badgeStyle = 'bg-yellow-950 text-yellow-400 border-yellow-800';
      break;
    case 'LOW':
      badgeStyle = 'bg-blue-950 text-blue-400 border-blue-800';
      break;
  }

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded text-xs font-semibold border ${badgeStyle}`}
    >
      {priority}
    </span>
  );
};