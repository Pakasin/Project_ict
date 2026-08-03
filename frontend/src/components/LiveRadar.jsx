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
      <div className="radar-core"></div>
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

  const svgWidth = 400;
  const svgHeight = 110;
  const padding = { top: 10, right: 10, bottom: 20, left: 35 };
  const width = svgWidth - padding.left - padding.right;
  const height = svgHeight - padding.top - padding.bottom;
  const maxVal = Math.max(...history, 20);

  const points = history.map((val, idx) => {
    const x = padding.left + (idx / (history.length - 1)) * width;
    const y = padding.top + height - (val / maxVal) * height;
    return `${x},${y}`;
  }).join(' ');

  const fillPoints = `${padding.left},${padding.top + height} ${points} ${padding.left + width},${padding.top + height}`;

  return (
    <svg className="sparkline-svg" viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', minHeight: '110px' }}>
      <defs>
        <linearGradient id="line-gradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {/* Grid Lines */}
      <line x1={padding.left} y1={padding.top} x2={padding.left + width} y2={padding.top} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      <line x1={padding.left} y1={padding.top + height/2} x2={padding.left + width} y2={padding.top + height/2} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      <line x1={padding.left} y1={padding.top + height} x2={padding.left + width} y2={padding.top + height} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + height} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

      {/* Y Axis Labels (Vertical) */}
      <text x={padding.left - 5} y={padding.top + 4} fill="var(--color-text-muted)" fontSize="9" textAnchor="end">{Math.round(maxVal)}</text>
      <text x={padding.left - 5} y={padding.top + height/2 + 3} fill="var(--color-text-muted)" fontSize="9" textAnchor="end">{Math.round(maxVal/2)}</text>
      <text x={padding.left - 5} y={padding.top + height} fill="var(--color-text-muted)" fontSize="9" textAnchor="end">0</text>
      
      {/* Y Axis Title */}
      <text x={8} y={padding.top + height/2} fill="var(--color-text-muted)" fontSize="9" transform={`rotate(-90 8 ${padding.top + height/2})`} textAnchor="middle">Packets/s</text>

      {/* X Axis Labels (Horizontal) */}
      <text x={padding.left} y={padding.top + height + 14} fill="var(--color-text-muted)" fontSize="9" textAnchor="start">-30s</text>
      <text x={padding.left + width} y={padding.top + height + 14} fill="var(--color-text-muted)" fontSize="9" textAnchor="end">Now</text>
      
      {/* X Axis Title */}
      <text x={padding.left + width/2} y={padding.top + height + 14} fill="var(--color-text-muted)" fontSize="9" textAnchor="middle">เวลา (Time)</text>

      {/* Area Fill */}
      <polygon points={fillPoints} fill="url(#line-gradient)" />

      {/* Line Chart */}
      <polyline points={points} fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Current Value Dot */}
      <circle
        cx={padding.left + width}
        cy={padding.top + height - (history[history.length - 1] / maxVal) * height}
        r="4"
        fill="var(--color-accent)"
      />
    </svg>
  );
}
