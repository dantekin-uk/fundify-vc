import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { sparkData } from '../data/sample';

export default function Sparkline({ timeframe = 'week', size = 240, fullHeight = false }) {
  const [tf, setTf] = useState(timeframe);
  const data = useMemo(() => sparkData[tf] || sparkData.week, [tf]);

  const lineType = useMemo(() => {
    if (tf === 'week') return 'linear';
    if (tf === 'month') return 'monotone';
    return 'monotone';
  }, [tf]);

  const areaId = `grad-${tf}`;

  return (
    <div className={`w-full h-${fullHeight ? 'full' : 'full'}`}>
      <AnimatePresence mode="wait">
        {!fullHeight ? (
          <motion.div key={tf} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.32 }} style={{ width: size }}>
            <ResponsiveContainer width="100%" height={40}>
              <AreaChart data={data} margin={{ top: 4, right: 6, bottom: 4, left: 6 }}>
                <defs>
                  <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0B3D91" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#0B3D91" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type={lineType} dataKey="value" stroke="#0B3D91" fill={`url(#${areaId})`} strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        ) : (
          <motion.div key={tf} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.32 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 6, right: 8, bottom: 6, left: 8 }}>
                <defs>
                  <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0B3D91" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#0B3D91" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Line type={lineType} dataKey="value" stroke="#0B3D91" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
