import React, { useEffect, useRef, useState } from 'react';

export default function ProgressiveBar({ segments = [], className = '', height = 10, animateSequence = true, duration = 600, stagger = 120 }) {
  // segments: [{ key, percent, background, leftRounded, rightRounded }]
  const [widths, setWidths] = useState(() => segments.map(() => 0));
  const timeouts = useRef([]);
  const prevTargets = useRef([]);

  useEffect(() => {
    // clear any pending timeouts when segments change
    timeouts.current.forEach((t) => clearTimeout(t));
    timeouts.current = [];

    const targets = segments.map((s) => Math.max(0, Math.min(100, Number(s.percent) || 0)));

    // Ensure widths array length matches segments
    setWidths((prev) => {
      const next = segments.map((_, i) => (typeof prev[i] === 'number' ? prev[i] : 0));
      return next;
    });

    if (animateSequence) {
      // animate each segment in sequence with a stagger
      targets.forEach((tVal, idx) => {
        const delay = idx * stagger + 20;
        const to = setTimeout(() => {
          setWidths((prev) => {
            const next = [...prev];
            next[idx] = tVal;
            return next;
          });
        }, delay);
        timeouts.current.push(to);
      });
    } else {
      // animate all at once after a tiny delay so transitions apply
      const to = setTimeout(() => setWidths(targets), 20);
      timeouts.current.push(to);
    }

    prevTargets.current = targets;
    return () => {
      timeouts.current.forEach((t) => clearTimeout(t));
      timeouts.current = [];
    };
  }, [segments, animateSequence, stagger]);

  return (
    <div className={`progressive-bar-container ${className}`} style={{ height }} role="progressbar" aria-valuemin={0} aria-valuemax={100}>
      <div className="progressive-bar-track" style={{ height }}>
        {segments.map((s, idx) => {
          const w = widths[idx] ?? 0;
          const leftRadius = s.leftRounded ? '0.75rem' : 0;
          const rightRadius = s.rightRounded ? '0.75rem' : 0;
          const transition = `width ${duration}ms cubic-bezier(.2,.9,.2,1), filter 160ms`;
          return (
            <div
              key={s.key || idx}
              className="progressive-bar-segment"
              title={`${s.key || ''}: ${Math.round(Number(s.percent || 0))}%`}
              style={{
                width: `${w}%`,
                background: s.background || '#000',
                borderTopLeftRadius: leftRadius,
                borderBottomLeftRadius: leftRadius,
                borderTopRightRadius: rightRadius,
                borderBottomRightRadius: rightRadius,
                transition,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255,255,255,0.95)',
                fontSize: '11px',
                fontWeight: 600,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              }}
            >
              {/* show percent label when segment has enough width */}
              {w > 8 ? `${Math.round(w)}%` : null}
            </div>
          );
        })}
      </div>
      <style>{`
        .progressive-bar-container { width: 100%; border-radius: 0.75rem; overflow: hidden; }
        .progressive-bar-track { width: 100%; background: rgba(15,23,42,0.04); display: flex; align-items: center; border-radius: 0.75rem; overflow: hidden; }
        .progressive-bar-segment { height: 100%; }
        .progressive-bar-container:hover .progressive-bar-segment { filter: brightness(1.06); }
      `}</style>
    </div>
  );
}
