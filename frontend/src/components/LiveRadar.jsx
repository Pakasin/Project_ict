import React, { useEffect, useState } from 'react';

export function CyberRadar({ activeAlertsCount = 0 }) {
  const [blips, setBlips] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const count = Math.min(Math.max(activeAlertsCount, 1), 6);
      const newBlips = [];
      for (let i = 0; i < count; i++) {
        const r = 12 + Math.random() * 32;
        const angle = Math.random() * 360;
        newBlips.push({ id: Math.random(), r, angle, isAlert: i === 0 && activeAlertsCount > 0 });
      }
      setBlips(newBlips);
    }, 2800);

    return () => clearInterval(interval);
  }, [activeAlertsCount]);

  return (
    <div className="radar-dial">
      <div className="ring-1"></div>
      <div className="ring-2"></div>
      <div className="sweep"><div className="sweep-fill"></div></div>
      {blips.map((blip) => {
        const rad = (blip.angle * Math.PI) / 180;
        const x = 50 + blip.r * Math.cos(rad);
        const y = 50 + blip.r * Math.sin(rad);
        return (
          <div
            key={blip.id}
            className={`radar-blip ${blip.isAlert ? 'blip-alert' : ''}`}
            style={{ left: `${x}%`, top: `${y}%` }}
          />
        );
      })}
    </div>
  );
}

export function ActivitySparkline({ events = [] }) {
  const [history, setHistory] = useState(() => Array(30).fill(0));

  useEffect(() => {
    const count = events.length;
    setHistory((prev) => {
      const next = [...prev.slice(1), Math.min(count * 5 + Math.floor(Math.random() * 8), 100)];
      return next;
    });
  }, [events.length]);

  const width = 400;
  const height = 90;
  const maxVal = Math.max(...history, 20);

  const points = history.map((val, idx) => {
    const x = (idx / (history.length - 1)) * width;
    const y = height - (val / maxVal) * (height - 15) - 5;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg className="sparkline-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle
        cx={width}
        cy={height - (history[history.length - 1] / maxVal) * (height - 15) - 5}
        r="4"
        fill="var(--color-accent)"
      />
    </svg>
  );
}
