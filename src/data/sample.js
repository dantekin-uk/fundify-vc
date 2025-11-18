export const sparkData = {
  week: [
    { date: 'Mon', value: 120 },
    { date: 'Tue', value: 180 },
    { date: 'Wed', value: 140 },
    { date: 'Thu', value: 220 },
    { date: 'Fri', value: 200 },
    { date: 'Sat', value: 240 },
    { date: 'Sun', value: 190 },
  ],
  month: Array.from({ length: 30 }).map((_, i) => ({ date: `2025-09-${String(i+1).padStart(2,'0')}`, value: Math.round(120 + Math.sin(i/3) * 40 + Math.random()*40) })),
  year: Array.from({ length: 12 }).map((_, i) => ({ date: `2024-${String(i+1).padStart(2,'0')}`, value: Math.round(800 + Math.cos(i/2) * 200 + Math.random()*200) })),
};

export const expenseData = [
  { name: 'Salaries', value: 4000 },
  { name: 'Rent', value: 2500 },
  { name: 'Transport', value: 1500 },
  { name: 'Projects', value: 3000 },
  { name: 'Misc', value: 1000 },
];

export function sum(arr) { return (arr || []).reduce((s, x) => s + (x.value || 0), 0); }
