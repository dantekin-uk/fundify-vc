import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

function ThemeToggle(){
  const { isDark, toggleTheme } = useTheme();
  return (
    <button onClick={toggleTheme} aria-label="Toggle theme" className="px-3 py-2 rounded-md bg-white/80 ring-1 ring-slate-200 hover:shadow transition hidden sm:inline-flex items-center gap-2 dark:bg-slate-800 dark:text-slate-100">
      {isDark ? '🌙 Dark' : '☀️ Light'}
    </button>
  );
}

export default function Landing() {
  const { isDark } = useTheme();
  const { scrollYProgress } = useScroll();
  const prefersReducedMotion = useReducedMotion();
  // Typewriter setup (hero)
  const fullHeadline = 'A modern way to manage grants and funds';
  const [typed, setTyped] = useState(prefersReducedMotion ? fullHeadline : '');
  const [isDeleting, setIsDeleting] = useState(false);
  useEffect(() => {
    if (prefersReducedMotion) return; // accessibility: no motion
    let timeout;
    // User request: slow both typing and deleting by 30ms
    const typeSpeed = isDeleting ? 80 : 120;
    if (!isDeleting && typed.length < fullHeadline.length) {
      timeout = setTimeout(() => setTyped(fullHeadline.slice(0, typed.length + 1)), typeSpeed);
    } else if (!isDeleting && typed.length === fullHeadline.length) {
      // Hold for 4 seconds before deleting
      timeout = setTimeout(() => setIsDeleting(true), 4000);
    } else if (isDeleting && typed.length > 0) {
      timeout = setTimeout(() => setTyped(fullHeadline.slice(0, typed.length - 1)), typeSpeed);
    } else if (isDeleting && typed.length === 0) {
      // Pause for 4 seconds before retyping
      timeout = setTimeout(() => setIsDeleting(false), 4000);
    }
    return () => clearTimeout(timeout);
  }, [typed, isDeleting, prefersReducedMotion]);
  // Precompute parallax transforms at top-level (avoid hooks inside loops)
  const parallaxYPos = useTransform(scrollYProgress, [0, 1], [0, prefersReducedMotion ? 0 : 12]);
  const parallaxYNeg = useTransform(scrollYProgress, [0, 1], [0, prefersReducedMotion ? 0 : -12]);
  // animation variants
  const textContainer = {
    hidden: { opacity: 0, y: 24 },
    show: {
      opacity: 1,
      y: 0,
      transition: { staggerChildren: 0.08, duration: 0.5 }
    }
  };
  const textItem = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 70, damping: 16, mass: 0.8 } }
  };
  const floatMock = {
    initial: { opacity: 0, y: 12 },
    in: { opacity: 1, y: 0, transition: { duration: 0.5 } },
    // Use tween with ease for 3-keyframe animation to avoid spring keyframe limitation
    float: prefersReducedMotion ? {} : { y: [0, -4, 0], transition: { duration: 6, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' } }
  };

  function DashboardMock({ title }){
    return (
      <div className="w-full h-52 rounded-lg p-4 bg-white/80 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
        <div className="h-full flex flex-col gap-3">
          <div className="flex gap-3">
            <div className="w-2/3 h-20 rounded-md bg-gradient-to-br from-sky-50 to-white dark:from-slate-700/40 dark:to-slate-800/40" />
            <div className="w-1/3 h-20 rounded-md bg-gradient-to-br from-emerald-50 to-white dark:from-slate-700/30 dark:to-slate-800/30" />
          </div>
          <div className="flex-1 grid grid-cols-3 gap-3">
            <div className="col-span-2 rounded-md bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900/50" />
            <div className="rounded-md bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900/50" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-100 text-[var(--text,#0f172a)] dark:bg-gradient-to-b dark:from-[#071022] dark:via-[#081427] dark:to-[#071022] dark:text-slate-100">
      {/* Decorative shapes */}
      <div className={`absolute -top-40 -left-40 w-[560px] h-[560px] ${isDark ? 'bg-gradient-to-br from-[var(--brand-primary)] to-[var(--accent-sky)]' : 'bg-gradient-to-br from-indigo-400 to-purple-500'} ${isDark ? 'opacity-12' : 'opacity-20'} rounded-full blur-3xl transform rotate-[15deg] pointer-events-none z-0`} />,
      <div className={`absolute -bottom-40 -right-40 w-[480px] h-[480px] ${isDark ? 'bg-gradient-to-br from-[var(--accent-sky)] to-[var(--accent-coral)]' : 'bg-gradient-to-br from-emerald-300 to-teal-400'} ${isDark ? 'opacity-8' : 'opacity-15'} rounded-full blur-3xl transform -rotate-12 pointer-events-none z-0`} />

      <header className="relative z-30 max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 shadow-sm" aria-hidden="true" />
          <div className="font-semibold text-lg tracking-tight brand-logo">Fundify</div>
        </div>
        <nav className="flex items-center gap-4 text-sm text-slate-700">
          <a href="#features" className="px-3 py-2 rounded-md nav-link">Features</a>
          <Link to="/how" className="px-3 py-2 rounded-md nav-link">How it works</Link>
          <Link to="/pricing" className="px-3 py-2 rounded-md nav-link">Pricing</Link>
          <Link to="/login" className="px-3 py-2 rounded-md button-outline">Log in</Link>
          <Link to="/register" className="button-brand">Get started</Link>
          <ThemeToggle />
        </nav>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-28">
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-7">
            <motion.h1
              initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 70, damping: 15 }}
              className="text-5xl md:text-6xl font-extrabold leading-tight tracking-tight"
            >
              {typed}
              {!prefersReducedMotion && (
                <span className="inline-block ml-1 align-middle w-[2px] h-[1.2em] bg-slate-900 dark:bg-slate-100 animate-pulse" aria-hidden="true" />
              )}
            </motion.h1>
            <motion.p initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, type: 'spring', stiffness: 60, damping: 16 }} className="mt-6 text-lg md:text-xl text-slate-600 dark:text-slate-300 dark:text-slate-300 max-w-2xl">Simple workflows, clear approvals, and transparent reporting for NGOs, corporate social responsibility teams, and small organizations. Built for collaboration and accountability.</motion.p>

            <motion.div initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16, type: 'spring', stiffness: 70, damping: 15 }} className="mt-8 flex items-center gap-4">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Link to="/register" className="inline-flex items-center gap-2 px-6 py-4 rounded-full button-brand shadow-lg">Get started free</Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Link to="#" className="inline-flex items-center gap-2 px-5 py-4 rounded-full button-outline shadow-sm">▶ Watch demo</Link>
              </motion.div>
            </motion.div>

            {/* Trusted by moved below entire hero section */}
          </div>

          <div className="lg:col-span-5 relative">
            {/* Decorative hero image behind the overview card (large screens) */}
            
            <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.45 }} className="bg-card-modern border rounded-3xl shadow-2xl p-6 dark:bg-slate-900/80 relative z-10">
              <div className="text-xs text-slate-500">Overview</div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 dark:border dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <img src="/income.png" alt="Income" className="w-5 h-5 opacity-80" />
                    <div className="text-xs text-slate-500">Funds</div>
                  </div>
                  <div className="text-xl font-semibold mt-1">KES 12,400</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 dark:border dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <img src="/expences.png" alt="Expenses" className="w-5 h-5 opacity-80" />
                    <div className="text-xs text-slate-500">Expenses</div>
                  </div>
                  <div className="text-xl font-semibold mt-1">KES 3,100</div>
                </div>
                <div className="col-span-2 mt-2 p-4 rounded-xl bg-white border border-slate-100 dark:bg-gradient-to-b dark:from-slate-800/60 dark:to-slate-900/60">
                  <div className="flex items-center justify-between text-sm">
                    <div className="font-semibold">Last 30 days</div>
                    <div className="text-xs text-slate-500">KSh</div>
                  </div>
                  <div className="mt-3 h-44 rounded-lg overflow-hidden">
                    <img src="/reports.png" alt="Financial Reports" className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Trusted by: full-width strip just below entire hero (text + image) */}
        <div className="-mx-6 sm:-mx-8 lg:-mx-10">
          <div className="relative overflow-hidden w-full max-w-none rounded-2xl border border-slate-200/70 bg-white/60 dark:bg-slate-800/40 dark:border-slate-700/60 py-1.5 md:py-2 px-3 sm:px-4">
            <div className="flex items-center gap-2 text-[10px] sm:text-xs uppercase tracking-wide text-slate-500">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Trusted by</span>
            </div>
            { !prefersReducedMotion ? (
              <div className="mt-1.5 relative">
                <motion.div
                  className="flex gap-4 md:gap-6"
                  animate={{ x: ['0%', '-50%'] }}
                  transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
                >
                  {[
                    'NGO', 'Community Org', 'CSR', 'Health Fund', 'Education Trust', 'Relief Network', 'Climate Alliance', 'Local Council'
                  ].concat([
                    'NGO', 'Community Org', 'CSR', 'Health Fund', 'Education Trust', 'Relief Network', 'Climate Alliance', 'Local Council'
                  ]).map((label, idx) => (
                    <div key={label + idx} className="px-3 md:px-4 py-1 rounded-none bg-white/70 shadow-sm backdrop-blur-sm dark:bg-slate-900/40 text-slate-700 dark:text-slate-200">
                      {label}
                    </div>
                  ))}
                </motion.div>
                {/* subtle gradient fade edges */}
                <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-white/80 to-transparent dark:from-slate-800/60" />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-white/80 to-transparent dark:from-slate-800/60" />
              </div>
            ) : (
              <div className="mt-1.5 flex flex-wrap gap-3">
                {['NGO', 'Community Org', 'CSR', 'Health Fund', 'Education Trust'].map((label) => (
                  <div key={label} className="px-3 md:px-4 py-1 rounded-none bg-white/70 shadow-sm backdrop-blur-sm dark:bg-slate-900/40 text-slate-700 dark:text-slate-200">
                    {label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        
        {/* Features: storytelling stacked sections */}
        <section id="features" className="mt-8 md:mt-16">
          {[
            {
              tag: 'Feature 01',
              title: 'Stay in control of your income streams.',
              text: 'From donor grants to internal projects, Fundify helps you record, categorize, and monitor every shilling that comes in so you always know where your funds stand.',
              mock: 'Income dashboard',
            },
            {
              tag: 'Feature 02',
              title: 'See where every coin goes.',
              text: 'Track expenses across categories like salaries, rent, transport, and field operations  complete with real-time breakdowns and smart spending insights.',
              mock: 'Expense breakdown',
            },
            {
              tag: 'Feature 03',
              title: 'Handle multiple projects effortlessly.',
              text: 'Each donor or project gets its own workspace. Fundify keeps all their transactions, budgets, and reports separate but easy to access in one platform.',
              mock: 'Projects & donors',
            },
            {
              tag: 'Feature 04',
              title: 'Visualize impact instantly.',
              text: 'Interactive dashboards and auto-generated reports help you share clear, credible data with your team and funders — without spending hours in Excel.',
              mock: 'Analytics & reports',
            },
            {
              tag: 'Feature 05',
              title: 'Your financial data always safe.',
              text: 'Built with Firebase security and encrypted access, Fundify ensures your organization’s finances are protected yet accessible anytime, anywhere.',
              mock: 'Secure platform',
            },
          ].map((f, i) => (
            <motion.div
              key={f.tag}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6 }}
              className="py-24"
            >
              <div className={`mx-auto max-w-6xl grid md:grid-cols-2 gap-10 items-center ${i % 2 === 1 ? 'md:[&>div:first-child]:order-2' : ''}`}>
                {/* Text */}
                <motion.div variants={textContainer} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }}>
                  <motion.div variants={textItem} className="uppercase tracking-wider text-xs font-semibold text-sky-600 dark:text-sky-400">{f.tag}</motion.div>
                  <motion.h3 variants={textItem} className="mt-2 text-4xl md:text-5xl font-semibold text-gray-900 dark:text-slate-100">{f.title}</motion.h3>
                  <motion.p variants={textItem} className="mt-4 text-lg text-gray-600 dark:text-slate-300 leading-relaxed max-w-xl">{f.text}</motion.p>
                </motion.div>
                {/* Image mock */}
                <motion.div className="relative" variants={floatMock} initial="initial" whileInView="in" animate={prefersReducedMotion ? undefined : 'float'} viewport={{ once: true }} style={{ y: i % 2 === 1 ? parallaxYPos : parallaxYNeg }}>
                  {i % 2 === 1 && (
                    <div className="pointer-events-none absolute -inset-6 -z-10 rounded-3xl bg-gradient-to-br from-sky-300/30 to-indigo-300/20 blur-2xl dark:from-sky-500/10 dark:to-indigo-500/10" />
                  )}
                  <motion.div whileHover={{ scale: 1.02, rotate: 0.2 }} className="rounded-2xl shadow-lg overflow-hidden bg-gradient-to-br from-gray-50 to-white dark:from-slate-800/40 dark:to-slate-900/40 border border-slate-100/80 dark:border-slate-700/50">
                    {/* Simple mock: bars and panels */}
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-rose-400" />
                      <div className="h-3 w-3 rounded-full bg-amber-400" />
                      <div className="h-3 w-3 rounded-full bg-emerald-400" />
                      <div className="ml-3 text-xs text-slate-500 dark:text-slate-400">{f.mock}</div>
                    </div>
                    <div className="p-6">
                      <div className="relative h-40 rounded-lg overflow-hidden">
                        {i === 0 && <img src="/dashbord.png" alt="Income Dashboard" className="w-full h-full object-cover" />}
                        {i === 1 && <img src="/expences.png" alt="Expense Tracking" className="w-full h-full object-contain" />}
                        {i === 2 && <img src="/reports.png" alt="Project Management" className="w-full h-full object-cover" />}
                        {i === 3 && <img src="/dashbord2.png" alt="Analytics Dashboard" className="w-full h-full object-cover" />}
                        {i === 4 && (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
                            <div className="text-center p-4">
                              <div className="text-4xl mb-2">🔒</div>
                              <div className="text-sm font-medium">Bank-Grade Security</div>
                            </div>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-3">
                        <div className="h-16 rounded-md bg-slate-50 dark:bg-slate-800/60 flex items-center justify-center">
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {i === 0 ? 'Grants' : i === 1 ? 'Expenses' : i === 2 ? 'Projects' : i === 3 ? 'Charts' : '99.9%'}
                          </span>
                        </div>
                        <div className="h-16 rounded-md bg-slate-50 dark:bg-slate-800/60 flex items-center justify-center">
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {i === 0 ? 'Donations' : i === 1 ? 'Categories' : i === 2 ? 'Donors' : i === 3 ? 'Reports' : 'Uptime'}
                          </span>
                        </div>
                        <div className="h-16 rounded-md bg-slate-50 dark:bg-slate-800/60 flex items-center justify-center">
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {i === 0 ? 'Projects' : i === 1 ? 'Trends' : i === 2 ? 'Budgets' : i === 3 ? 'Export' : 'Secure'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </section>

        {/* Long screenshot + side explainer */}
        <section id="screenshots" className="mt-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-9">
                <div role="img" aria-label="Dashboard screenshot" className="rounded-3xl overflow-hidden shadow-2xl border border-slate-100 dark:border-0 dark:shadow-none dark:bg-transparent bg-card-modern">
                  <div className="relative">
                    <img 
                      src="/dashbord.png" 
                      alt="Dashboard overview showing financial metrics and charts" 
                      className="w-full h-[420px] md:h-[520px] lg:h-[680px] object-cover rounded-2xl opacity-95 dark:opacity-90 dark:brightness-75 transition-all duration-300 hover:opacity-100" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                  </div>
                </div>
              </div>
              <div className="lg:col-span-3 lg:self-start lg:sticky lg:top-24">
                <h3 className="text-2xl font-semibold">What you'll see</h3>
                <p className="mt-3 text-slate-600 dark:text-slate-300">A unified dashboard showing funds, expenses, approvals and quick insights. Use this view to monitor cash flow, spot anomalies, and export reports for stakeholders.</p>
                <div className="mt-6 space-y-3 text-sm text-slate-600 dark:text-slate-400">
                  <div className="flex items-start gap-3"><div className="mt-1 text-emerald-500">●</div><div>Live dashboards & CSV exports</div></div>
                  <div className="flex items-start gap-3"><div className="mt-1 text-amber-500">●</div><div>Approval workflow preview</div></div>
                  <div className="flex items-start gap-3"><div className="mt-1 text-sky-500">●</div><div>Project-level budget view</div></div>
                </div>
                <div className="mt-6 flex items-center gap-4">
                  <Link to="/register" className="px-5 py-3 rounded-md button-brand">Get started</Link>
                  <Link to="#" className="px-4 py-3 rounded-md button-outline">Watch demo</Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA strip */}
        <section className="mt-12 py-12 rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white">
          <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <div className="text-lg font-semibold">Ready to start managing funds with clarity?</div>
              <div className="mt-1 text-sm opacity-90">Start for free  onboard your team and import your first project in minutes.</div>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/register" className="px-5 py-3 rounded-md bg-white text-sky-700 font-semibold hover:opacity-95">Get started free</Link>
              <Link to="#" className="px-4 py-3 rounded-md border border-white/30 hover:bg-white/10">Watch demo</Link>
            </div>
          </div>
        </section>

        <footer className="mt-20 pt-12 pb-6 text-sm text-slate-700 dark:text-slate-300">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-8 border-b border-slate-100 dark:border-slate-800">
              <div className="md:col-span-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 shadow-sm" aria-hidden="true" />
                  <div className="font-semibold text-lg brand-logo dark:text-slate-100">Fundify</div>
                </div>
                <p className="mt-4 text-slate-600 dark:text-slate-400 max-w-sm">Manage grants, donors, and projects with clarity. Secure, collaborative, and built for accountability.</p>
              </div>

              <div className="md:col-span-2">
                <h4 className="font-semibold text-slate-900 dark:text-slate-100">Product</h4>
                <ul className="mt-3 space-y-2">
                  <li><Link to="/how" className="footer-link">How it works</Link></li>
                  <li><Link to="/pricing" className="footer-link">Pricing</Link></li>
                  <li><Link to="/register" className="footer-link">Get started</Link></li>
                </ul>
              </div>

              <div className="md:col-span-2">
                <h4 className="font-semibold text-slate-900 dark:text-slate-100">Company</h4>
                <ul className="mt-3 space-y-2">
                  <li><a href="#" className="footer-link">About</a></li>
                  <li><a href="#" className="footer-link">Careers</a></li>
                  <li><a href="#" className="footer-link">Contact</a></li>
                </ul>
              </div>

              <div className="md:col-span-4">
                <h4 className="font-semibold text-slate-900 dark:text-slate-100">Stay updated</h4>
                <p className="mt-2 text-slate-600 dark:text-slate-400">Get product updates and tips to run your programs better.</p>
                <form className="mt-4 flex gap-2 max-w-md" onSubmit={(e)=>e.preventDefault()}>
                  <input aria-label="Email" type="email" placeholder="Your email" className="w-full px-3 py-2 rounded-md border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100" />
                  <button className="px-4 py-2 rounded-md button-brand">Subscribe</button>
                </form>

                <div className="mt-4 flex items-center gap-3">
                  <a href="#" aria-label="Twitter" className="p-2 rounded-md bg-white/80 dark:bg-slate-800/60 footer-social">T</a>
                  <a href="#" aria-label="LinkedIn" className="p-2 rounded-md bg-white/80 dark:bg-slate-800/60 footer-social">in</a>
                  <a href="#" aria-label="GitHub" className="p-2 rounded-md bg-white/80 dark:bg-slate-800/60 footer-social">GH</a>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500">© {new Date().getFullYear()} Fundify  Simple fund management for organizations.</div>
              <div className="flex items-center gap-4">
                <Link to="/login" className="footer-link">Log in</Link>
                <Link to="/privacy" className="footer-link">Privacy</Link>
                <Link to="/terms" className="footer-link">Terms</Link>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
