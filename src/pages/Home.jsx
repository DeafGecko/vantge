// src/pages/Home.jsx — Vantge Marketing Home Page
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import VantgeLogo from '../components/VantgeLogo'
import {
  Menu, X, ArrowRight, Camera, QrCode, LayoutDashboard,
  Download, Users, ImageIcon, Check,
  Heart, Building2, Music, Church, GraduationCap, Trophy
} from 'lucide-react'

/* Simple inline SVG social icons (lucide-react v1 doesn't ship Twitter/Instagram/Linkedin) */
const XIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
)
const InstagramIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <circle cx="12" cy="12" r="4"/>
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
  </svg>
)
const LinkedinIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
    <rect x="2" y="9" width="4" height="12"/>
    <circle cx="4" cy="4" r="2"/>
  </svg>
)

/* ─── useInView hook ──────────────────────────────────────────── */
function useInView(threshold = 0.15) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, inView]
}

/* ─── Scroll-aware nav hook ───────────────────────────────────── */
function useScrolled(px = 40) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > px)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [px])
  return scrolled
}

/* ════════════════════════════════════════════════════════════════
   HOME PAGE
══════════════════════════════════════════════════════════════════ */
export default function Home() {
  const [betaDismissed, setBetaDismissed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const scrolled = useScrolled()

  return (
    <div className="bg-[#F7F5F0] text-inkfont-['Inter'] overflow-x-hidden">
      {/* Skip to main */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:bg-ink focus:text-white focus:px-4 focus:py-2 focus:rounded"
      >
        Skip to main content
      </a>

      {/* ── Beta banner ──────────────────────────────────────── */}
      {!betaDismissed && (
        <div className="bg-[#B29746] text-ink text-sm font-semibold flex items-center justify-center gap-3 px-4 py-2.5 relative">
          <span>Now in Beta — Free while we&apos;re getting started. No credit card required.</span>
          <button
            onClick={() => setBetaDismissed(true)}
            aria-label="Dismiss beta notice"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-ink opacity-60 hover:opacity-100 transition-opacity"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Sticky nav ───────────────────────────────────────── */}
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-[#F7F5F0]/95 backdrop-blur-md border-b border-[#E8E4DC] py-3 shadow-sm'
            : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <Link to="/" aria-label="Vantge home">
            <VantgeLogo size="md" variant="light" />
          </Link>

          <nav className="hidden md:flex items-center gap-8" aria-label="Main navigation">
            {[
              { label: 'Features', href: '#features' },
              { label: 'How It Works', href: '#how-it-works' },
            ].map(item => (
              <a
                key={item.label}
                href={item.href}
                className="text-sm text-[#6B6B63] hover:text-[#1A1A18] transition-colors duration-200"
              >
                {item.label}
              </a>
            ))}
            <a href="#notify" className="relative text-sm text-[#6B6B63] hover:text-[#1A1A18] transition-colors duration-200">
              <span className="line-through decoration-red-500 decoration-2">Pricing</span>
              <span className="ml-1.5 text-red-500 font-semibold text-xs">Beta</span>
            </a>
            <a href="#notify" className="text-sm text-[#6B6B63] hover:text-[#1A1A18] transition-colors duration-200">
              Contact
            </a>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <Link
              to="/login"
              className="text-sm text-[#6B6B63] hover:text-ink transition-colors duration-200"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="group inline-flex items-center gap-2 bg-[#0E0E0C] text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-[#2C2C28] transition-colors duration-200"
            >
              Create account
              <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </div>

          <button
            onClick={() => setMobileOpen(o => !o)}
            className="md:hidden p-2 rounded-lg hover:bg-[#E8E4DC] transition-colors"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-[#F7F5F0] border-b border-[#E8E4DC] px-6 py-4 flex flex-col gap-4 shadow-lg">
            {[
              { label: 'Features', href: '#features' },
              { label: 'How It Works', href: '#how-it-works' },
              { label: 'Pricing', href: '#notify' },
              { label: 'Contact', href: '#notify' },
            ].map(item => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="text-sm text-[#6B6B63] hover:text-[#1A1A18] transition-colors"
              >
                {item.label}
              </a>
            ))}
            <div className="flex flex-col gap-2 pt-2 border-t border-[#E8E4DC]">
              <Link to="/login" className="text-sm text-[#6B6B63]" onClick={() => setMobileOpen(false)}>Sign in</Link>
              <a href="#notify" onClick={() => setMobileOpen(false)} className="inline-flex items-center justify-center gap-2 bg-[#1A1A18] text-white text-sm font-medium px-4 py-2.5 rounded-lg">
                Get notified
              </a>
            </div>
          </div>
        )}
      </header>

      <main id="main-content">

        {/* ══ HERO ═══════════════════════════════════════════ */}
        <section id="hero" className="max-w-7xl mx-auto px-6 pt-16 pb-24 md:pt-24 md:pb-32">
          <div className="grid md:grid-cols-2 gap-16 items-center">

            <div className="vantge-hero-text">
              <p className="text-xs font-semibold tracking-[0.18em] uppercase text-[#B29746] mb-5">
                Event Photography
              </p>
              <h1
                className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.08] tracking-tight mb-6"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Capture<br />What Matters
              </h1>
              <p className="text-[#6B6B63] text-lg leading-relaxed mb-8 max-w-md">
                Simple tools for hosts. Beautiful photo experiences for your guests.
              </p>

              <NotifyForm className="mb-8" />

              <div className="flex flex-wrap gap-4">
                {['Create Events', 'Share with Guests', 'Track & Download'].map(pill => (
                  <span key={pill} className="inline-flex items-center gap-1.5 text-sm text-[#6B6B63]">
                    <Check size={14} className="text-[#B29746]" strokeWidth={2.5} />
                    {pill}
                  </span>
                ))}
              </div>
            </div>

            {/* Editorial photo stack */}
            <div className="relative h-120 md:h-135 select-none" aria-hidden="true">
              <div
                className="absolute w-64 h-80 bg-white rounded-xl border border-[#E8E4DC] shadow-xl overflow-hidden vantge-card-1"
                style={{ top: '0%', left: '5%', transform: 'rotate(-3deg)' }}
              >
                <img
                  src="https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80"
                  alt="Wedding celebration"
                  className="w-full h-full object-cover"
                  loading="eager"
                />
              </div>
              <div
                className="absolute w-56 h-72 bg-white rounded-xl border border-[#E8E4DC] shadow-xl overflow-hidden vantge-card-2"
                style={{ top: '12%', left: '38%', transform: 'rotate(2deg)', zIndex: 2 }}
              >
                <img
                  src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80"
                  alt="Event concert"
                  className="w-full h-full object-cover"
                  loading="eager"
                />
              </div>
              <div
                className="absolute w-60 bg-white rounded-xl border border-[#E8E4DC] shadow-xl overflow-hidden vantge-card-3"
                style={{ top: '28%', left: '18%', transform: 'rotate(-1deg)', zIndex: 3, height: '304px' }}
              >
                <img
                  src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600&q=80"
                  alt="Social gathering"
                  className="w-full h-full object-cover"
                  loading="eager"
                />
              </div>
            </div>

          </div>
        </section>

        {/* ══ TRUST BAR ══════════════════════════════════════ */}
        <TrustBar />

        {/* ══ HOW IT WORKS ═══════════════════════════════════ */}
        <HowItWorks />

        {/* ══ STORY / CINEMATIC ══════════════════════════════ */}
        <StoryCinematic />

        {/* ══ FEATURES GRID ══════════════════════════════════ */}
        <FeaturesGrid />

        {/* ══ TESTIMONIAL ════════════════════════════════════ */}
        <Testimonial />

        {/* ══ FINAL CTA ══════════════════════════════════════ */}
        <FinalCta />

      </main>

      <SiteFooter />

      <style>{`
        @keyframes vantgeFadeInUp {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes vantgeFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes vantgeFloat1 {
          0%, 100% { transform: rotate(-3deg) translateY(0px); }
          50%       { transform: rotate(-3deg) translateY(-10px); }
        }
        @keyframes vantgeFloat2 {
          0%, 100% { transform: rotate(2deg) translateY(0px); }
          50%       { transform: rotate(2deg) translateY(-14px); }
        }
        @keyframes vantgeFloat3 {
          0%, 100% { transform: rotate(-1deg) translateY(0px); }
          50%       { transform: rotate(-1deg) translateY(-8px); }
        }
        @keyframes vantgeSlideDown {
          from { opacity: 0; transform: translateY(-16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes vantgeScaleIn {
          from { opacity: 0; transform: scale(0.93) translateY(20px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes vantgePulseGold {
          0%, 100% { box-shadow: 0 0 0 0 rgba(178,151,70,0); }
          50%       { box-shadow: 0 0 0 8px rgba(178,151,70,0.12); }
        }

        /* Hero */
        .vantge-hero-text {
          animation: vantgeFadeInUp 0.8s cubic-bezier(0.22,1,0.36,1) both;
        }
        .vantge-hero-badge {
          animation: vantgeSlideDown 0.6s ease 0.1s both;
        }

        /* Photo cards — fade in then float */
        .vantge-card-1 {
          animation: vantgeFadeInUp 0.7s ease 0.15s both, vantgeFloat1 6s ease-in-out 1s infinite;
        }
        .vantge-card-2 {
          animation: vantgeFadeInUp 0.7s ease 0.3s both, vantgeFloat2 7s ease-in-out 1.2s infinite;
        }
        .vantge-card-3 {
          animation: vantgeFadeInUp 0.7s ease 0.45s both, vantgeFloat3 5.5s ease-in-out 0.8s infinite;
        }

        /* Scroll reveals */
        .vantge-reveal {
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.65s cubic-bezier(0.22,1,0.36,1), transform 0.65s cubic-bezier(0.22,1,0.36,1);
        }
        .vantge-reveal.vantge-visible {
          opacity: 1;
          transform: none;
        }
        .vantge-delay-1 { transition-delay: 0.1s; }
        .vantge-delay-2 { transition-delay: 0.2s; }
        .vantge-delay-3 { transition-delay: 0.3s; }
        .vantge-delay-4 { transition-delay: 0.4s; }
        .vantge-delay-5 { transition-delay: 0.5s; }

        /* Trust bar items */
        .vantge-trust-item {
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 0.5s ease, transform 0.5s ease;
        }
        .vantge-trust-visible .vantge-trust-item { opacity: 1; transform: none; }
        .vantge-trust-item:nth-child(1) { transition-delay: 0.05s; }
        .vantge-trust-item:nth-child(2) { transition-delay: 0.12s; }
        .vantge-trust-item:nth-child(3) { transition-delay: 0.19s; }
        .vantge-trust-item:nth-child(4) { transition-delay: 0.26s; }
        .vantge-trust-item:nth-child(5) { transition-delay: 0.33s; }
        .vantge-trust-item:nth-child(6) { transition-delay: 0.40s; }

        /* Feature cards */
        .vantge-feature-card {
          transition: box-shadow 250ms ease, transform 250ms ease;
        }
        .vantge-feature-card:hover {
          box-shadow: 0 12px 40px rgba(26,26,24,0.14);
          transform: translateY(-4px);
        }

        /* Notify form pulse */
        .vantge-notify-btn {
          animation: vantgePulseGold 3s ease-in-out 2s infinite;
        }

        /* Login/signup card */
        .vantge-auth-card {
          animation: vantgeScaleIn 0.6s cubic-bezier(0.22,1,0.36,1) 0.1s both;
        }
        .vantge-auth-logo {
          animation: vantgeFadeInUp 0.6s ease both;
        }

        @media (prefers-reduced-motion: reduce) {
          .vantge-hero-text, .vantge-hero-badge,
          .vantge-card-1, .vantge-card-2, .vantge-card-3,
          .vantge-auth-card, .vantge-auth-logo { animation: none; }
          .vantge-reveal, .vantge-trust-item {
            opacity: 1 !important; transform: none !important; transition: none !important;
          }
          .vantge-feature-card:hover { transform: none; }
        }
      `}</style>
    </div>
  )
}

/* ─── TRUST BAR ───────────────────────────────────────────────── */
/* ─── NOTIFY FORM ─────────────────────────────────────────────── */
function NotifyForm({ dark = false, className = '' }) {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    try {
      const { supabase } = await import('../lib/supabase')
      await supabase.from('notify_list').insert({ email: email.trim() })
    } catch { /* silent */ }
    // Also notify via Formspree → forwards to dwirog@gmail.com
    try {
      await fetch('https://formspree.io/f/REPLACE_WITH_YOUR_ID', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email: email.trim(), _subject: 'New Vantge signup notification' }),
      })
    } catch { /* silent */ }
    setLoading(false)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div id="notify" className={`flex items-center gap-2 ${dark ? 'text-white/70' : 'text-[#6B6B63]'} text-sm ${className}`}>
        <Check size={16} className="text-[#B29746]" strokeWidth={2.5} />
        You're on the list — we'll reach out when we launch!
      </div>
    )
  }

  return (
    <form id="notify" onSubmit={handleSubmit} className={`flex flex-col sm:flex-row gap-3 ${className}`}>
      <input
        type="email"
        required
        placeholder="Enter your email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className={`flex-1 px-4 py-3 rounded-lg text-sm border outline-none focus:ring-2 focus:ring-[#B29746]/40 transition ${
          dark
            ? 'bg-white/10 border-white/20 text-white placeholder-white/40'
            : 'bg-white border-[#E8E4DC] text-[#1A1A18] placeholder-[#9A9A8E]'
        }`}
      />
      <button
        type="submit"
        disabled={loading}
        className={`vantge-notify-btn inline-flex items-center justify-center gap-2 font-semibold px-6 py-3 rounded-lg transition-colors duration-200 whitespace-nowrap disabled:opacity-50 ${
          dark
            ? 'bg-[#B29746] text-[#1A1A18] hover:bg-[#C9AC57]'
            : 'bg-[#1A1A18] text-white hover:bg-[#2C2C28]'
        }`}
      >
        {loading ? 'Sending…' : 'Notify me'}
        {!loading && <ArrowRight size={15} />}
      </button>
    </form>
  )
}

function TrustBar() {
  const [ref, inView] = useInView(0.2)
  const items = [
    { icon: Heart,         label: 'Weddings' },
    { icon: Building2,     label: 'Corporate' },
    { icon: Music,         label: 'Concerts' },
    { icon: Church,        label: 'Churches' },
    { icon: GraduationCap, label: 'Schools' },
    { icon: Trophy,        label: 'Sports' },
  ]
  return (
    <aside aria-label="Trusted by event professionals" className="border-y border-[#E8E4DC]">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <p className="text-center text-xs font-semibold tracking-[0.16em] uppercase text-[#1A1A18]/40 mb-6">
          Perfect for every occasion
        </p>
        <ul ref={ref} className={`flex flex-wrap justify-center gap-8 md:gap-12 list-none p-0 m-0 ${inView ? 'vantge-trust-visible' : ''}`}>
          {items.map(({ icon: Icon, label }) => (
            <li key={label} className="vantge-trust-item flex items-center gap-2 text-[#1A1A18]/40">
              <Icon size={18} aria-hidden="true" />
              <span className="text-sm font-medium">{label}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}

/* ─── HOW IT WORKS ────────────────────────────────────────────── */
function HowItWorks() {
  const [sectionRef, inView] = useInView()
  const steps = [
    { num: '01', title: 'Create your event', desc: 'Set up in minutes with a custom link or QR code.' },
    { num: '02', title: 'Guests upload photos', desc: 'No app needed. Just scan and share.' },
    { num: '03', title: 'Relive the moments', desc: 'View, manage, and download all photos in one place.' },
  ]
  return (
    <section id="how-it-works" className="max-w-7xl mx-auto px-6 py-24 md:py-32">
      <div className="grid md:grid-cols-2 gap-16 items-center" ref={sectionRef}>

        {/* Left: browser mock */}
        <div className={`vantge-reveal ${inView ? 'vantge-visible' : ''}`}>
          <div className="rounded-2xl border border-[#E8E4DC] shadow-2xl overflow-hidden bg-white">
            <div className="bg-[#F0EDE6] border-b border-[#E8E4DC] px-4 py-3 flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                <div className="w-3 h-3 rounded-full bg-[#28CA41]" />
              </div>
              <div className="flex-1 bg-white rounded border border-[#E8E4DC] px-3 py-1 text-xs text-[#6B6B63]">
                vantge.app/dashboard
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-xs text-[#6B6B63] mb-0.5">Current Event</div>
                  <div
                    className="font-semibold text-[#1A1A18] text-sm"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    frist name &amp; last name Wedding
                  </div>
                </div>
                <span className="text-xs bg-[#F7F5F0] border border-[#E8E4DC] px-2 py-0.5 rounded-full text-[#6B6B63]">Live</span>
              </div>
              <div className="flex gap-4 mb-4">
                {[['428','Photos'],['87','Guests'],['312','Approved']].map(([val, lbl], i) => (
                  <div key={lbl} className="flex-1 bg-[#F7F5F0] rounded-lg p-3 text-center">
                    <div className={`text-xl font-bold ${i === 2 ? 'text-[#B29746]' : 'text-ink'}`}>{val}</div>
                    <div className="text-xs text-[#6B6B63]">{lbl}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-1.5 rounded-lg overflow-hidden">
                {[
                  'photo-1519741497674-611481863552',
                  'photo-1511795409834-ef04bbd61622',
                  'photo-1540575467063-178a50c2df87',
                  'photo-1492684223066-81342ee5ff30',
                  'photo-1465495976277-4387d4b0b4c6',
                  'photo-1529543544282-ea669407fca3',
                  'photo-1517457373958-b7bdd4587205',
                  'photo-1464366400600-7168b8af9bc3',
                ].map((id, i) => (
                  <div key={i} className="aspect-square rounded overflow-hidden bg-[#E8E4DC]">
                    <img
                      src={`https://images.unsplash.com/${id}?w=120&q=60`}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                      aria-hidden="true"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Right: steps */}
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] uppercase text-[#B29746] mb-4">
            How it works
          </p>
          <h2
            className={`text-4xl md:text-5xl font-bold leading-tight mb-10 vantge-reveal ${inView ? 'vantge-visible' : ''} vantge-delay-1`}
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Create. Share.<br />Enjoy.
          </h2>
          <ol className="space-y-8 list-none p-0 m-0">
            {steps.map((step, i) => (
              <li
                key={step.num}
                className={`flex gap-5 vantge-reveal ${inView ? 'vantge-visible' : ''} vantge-delay-${i + 1}`}
              >
                <div className="shrink-0 w-10 h-10 rounded-full bg-[#F0EDE6] border border-[#E8E4DC] flex items-center justify-center" aria-hidden="true">
                  <span className="text-xs font-bold text-[#B29746]">{step.num}</span>
                </div>
                <div>
                  <p className="font-semibold text-[#1A1A18] mb-1">{step.title}</p>
                  <p className="text-sm text-[#6B6B63] leading-relaxed">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

      </div>
    </section>
  )
}

/* ─── STORY CINEMATIC ─────────────────────────────────────────── */
function StoryCinematic() {
  return (
    <section className="relative w-full overflow-hidden flex items-center justify-center text-center" style={{ minHeight: '540px' }}>
      <img
        src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1600&q=80"
        alt="Crowd at an event"
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-black/55" />
      <div className="relative z-10 px-6 max-w-2xl mx-auto py-28">
        <p className="text-xs font-semibold tracking-[0.18em] uppercase text-white/60 mb-4">
          More than photos
        </p>
        <h2
          className="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Every Event<br />Tells a Story
        </h2>
        <p className="text-white/80 text-lg leading-relaxed mb-8">
          From weddings to concerts, Vantge helps you collect real moments from every
          perspective — all in one beautiful gallery.
        </p>
        <NotifyForm dark />
      </div>
    </section>
  )
}

/* ─── FEATURES GRID ───────────────────────────────────────────── */
const FEATURES = [
  { icon: Camera,          title: 'Instant Guest Uploads', desc: 'Guests share photos with no app install. Just scan and tap — works on any phone.',          large: true },
  { icon: QrCode,          title: 'QR Code Sharing',       desc: 'Print it, display it, text it. Guests scan to join with zero friction.',                       large: true },
  { icon: ImageIcon,       title: 'Beautiful Galleries',   desc: 'Curated, approved photo feeds your guests will actually want to browse.' },
  { icon: LayoutDashboard, title: 'Host Dashboard',        desc: 'Full control over your event — approve photos, manage guests, view analytics.' },
  { icon: Download,        title: 'Photo Downloads',       desc: 'Download your entire gallery as a ZIP in one click.' },
  { icon: Users,           title: 'Guest Analytics',       desc: 'See who contributed what — photo counts per guest, upload timeline.' },
]

function FeaturesGrid() {
  const [ref, inView] = useInView(0.1)
  const large = FEATURES.filter(f => f.large)
  const small = FEATURES.filter(f => !f.large)

  return (
    <section id="features" className="max-w-7xl mx-auto px-6 py-24 md:py-32" ref={ref}>
      <div className="text-center mb-14">
        <h2
          className={`text-4xl md:text-5xl font-bold vantge-reveal ${inView ? 'vantge-visible' : ''}`}
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Everything You Need
        </h2>
      </div>

      <div className="grid md:grid-cols-2 gap-5 mb-5">
        {large.map((f, i) => {
          const Icon = f.icon
          return (
            <article
              key={f.title}
              className={`vantge-feature-card bg-white rounded-[20px] border border-[#E8E4DC] p-8 vantge-reveal ${inView ? 'vantge-visible' : ''} vantge-delay-${i + 1}`}
            >
              <div className="w-12 h-12 bg-[#F7F5F0] rounded-xl border border-[#E8E4DC] flex items-center justify-center mb-5">
                <Icon size={22} className="text-[#B29746]" />
              </div>
              <h3 className="font-semibold text-xl text-ink
               mb-2">{f.title}</h3>
              <p className="text-[#6B6B63] leading-relaxed">{f.desc}</p>
            </article>
          )
        })}
      </div>

      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5">
        {small.map((f, i) => {
          const Icon = f.icon
          return (
            <article
              key={f.title}
              className={`vantge-feature-card bg-white rounded-2x1 border border-[#E8E4DC] p-6 vantge-reveal ${inView ? 'vantge-visible' : ''} vantge-delay-${i + 1}`}
            >
              <div className="w-10 h-10 bg-[#F7F5F0] rounded-lg border border-[#E8E4DC] flex items-center justify-center mb-4">
                <Icon size={18} className="text-[#B29746]" />
              </div>
              <h3 className="font-semibold text-ink mb-1.5">{f.title}</h3>
              <p className="text-sm text-[#6B6B63] leading-relaxed">{f.desc}</p>
            </article>
          )
        })}
      </div>
    </section>
  )
}

/* ─── TESTIMONIAL ─────────────────────────────────────────────── */
function Testimonial() {
  const [ref, inView] = useInView()
  return (
    <section className="bg-white border-y border-[#E8E4DC] py-24">
      <div
        ref={ref}
        className={`max-w-2xl mx-auto px-6 text-center vantge-reveal ${inView ? 'vantge-visible' : ''}`}
      >
        <svg className="w-10 h-10 mx-auto mb-8 text-[#E8E4DC]" fill="currentColor" viewBox="0 0 32 32" aria-hidden="true">
          <path d="M9.352 4C4.456 7.456 1 13.12 1 19.36c0 5.088 3.072 8.064 6.624 8.064 3.36 0 5.856-2.688 5.856-5.856 0-3.168-2.208-5.472-5.088-5.472-.576 0-1.344.096-1.536.192.48-3.264 3.552-7.104 6.624-9.024L9.352 4zm16.512 0c-4.8 3.456-8.256 9.12-8.256 15.36 0 5.088 3.072 8.064 6.624 8.064 3.264 0 5.856-2.688 5.856-5.856 0-3.168-2.304-5.472-5.184-5.472-.576 0-1.248.096-1.44.192.48-3.264 3.456-7.104 6.528-9.024L25.864 4z" />
        </svg>
        <blockquote
          className="text-2xl md:text-3xl italic text-ink leading-relaxed mb-10"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          "Everyone at our wedding could contribute photos without downloading another app."
        </blockquote>
        <div className="flex items-center justify-center gap-3">
          <div
            className="w-10 h-10 rounded-full bg-ink flex items-center justify-center text-white text-sm font-semibold"
            aria-hidden="true"
          >
            AR
          </div>
          <div className="text-left">
            <div className="font-semibold text-sm text-[#1A1A18]">Ashley R.</div>
            <div className="text-xs text-[#6B6B63]">Wedding · September 2026</div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── FINAL CTA ───────────────────────────────────────────────── */
function FinalCta() {
  const [ref, inView] = useInView()
  return (
    <section className="bg-[#1A1A18]">
      <div
        ref={ref}
        className={`max-w-4xl mx-auto px-6 py-28 md:py-36 text-center vantge-reveal ${inView ? 'vantge-visible' : ''}`}
      >
        <h2
          className="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.08] mb-6"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Your Event.<br />Every Perspective.
        </h2>
        <p className="text-white/60 text-lg mb-10 max-w-lg mx-auto leading-relaxed">
          We're launching soon. Be the first to know when Vantge is ready.
        </p>
        <NotifyForm dark />
      </div>
    </section>
  )
}

/* ─── FOOTER ──────────────────────────────────────────────────── */
function SiteFooter() {
  const cols = [
    {
      heading: 'Product',
      links: [
        { label: 'Features', href: '#features' },
        { label: 'How It Works', href: '#how-it-works' },
        { label: 'Get Notified', href: '#hero' },
      ],
    },
    {
      heading: 'Company',
      links: [
        { label: 'About', comingSoon: true },
        { label: 'Contact', href: '#notify' },
      ],
    },
    {
      heading: 'Resources',
      links: [
        { label: 'Help Center', comingSoon: true },
        { label: 'Privacy', comingSoon: true },
        { label: 'Terms', comingSoon: true },
      ],
    },
  ]
  return (
    <footer className="bg-[#0E0E0C] border-t border-white/10 pt-14 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          <div>
            <a href="#hero"><VantgeLogo size="md" variant="dark" /></a>
            <p className="text-white/50 text-sm mt-3">Event Photo Sharing</p>
          </div>
          {cols.map(col => (
            <div key={col.heading}>
              <div className="text-xs font-semibold tracking-[0.12em] uppercase text-white/40 mb-4">
                {col.heading}
              </div>
              <ul className="space-y-2.5">
                {col.links.map(link => (
                  <li key={link.label}>
                    {link.comingSoon ? (
                      <span className="text-sm text-white/20 cursor-default select-none">
                        {link.label}
                      </span>
                    ) : (
                      <a href={link.href} className="text-sm text-white/50 hover:text-white/90 transition-colors duration-200">
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/40">© 2025 Vantge. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="#" aria-label="Vantge on X / Twitter" className="text-white/40 hover:text-white/70 transition-colors">
              <XIcon size={16} />
            </a>
            <a href="#" aria-label="Vantge on Instagram" className="text-white/40 hover:text-white/70 transition-colors">
              <InstagramIcon size={16} />
            </a>
            <a href="#" aria-label="Vantge on LinkedIn" className="text-white/40 hover:text-white/70 transition-colors">
              <LinkedinIcon size={16} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
