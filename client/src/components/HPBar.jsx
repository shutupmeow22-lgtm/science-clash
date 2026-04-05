import React from 'react';

export default function HPBar({ current, max, color = 'green' }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  const c = color === 'red'  ? '#ef4444'
          : color === 'blue' ? '#3b82f6'
          : '#4ade80';
  return (
    <div className="hp-bar-track">
      <div className="hp-bar-fill" style={{ width: `${pct}%`, background: c }} />
    </div>
  );
}
