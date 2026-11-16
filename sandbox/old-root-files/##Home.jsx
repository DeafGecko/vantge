// src/pages/HomePage.jsx
import { Link } from 'react-router-dom';

export default function HomePage() {
      return (
            <div className="bg-[#FAFAF8] text-[#1A1A18] font-['Inter']">
                  {/* Hero Section - matches the uploaded mockup */}
                  <section className="max-w-7xl mx-auto px-6 py-20 md:py-28">
                        <div className="grid md:grid-cols-2 gap-12 items-start">
                              {/* Left column: text content */}
                              <div>
                                    <div className="inline-flex items-center gap-2 bg-red-50 px-3 py-1 rounded-full text-sm text-[#B91C1C] mb-6">
                                          <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#B91C1C] opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#B91C1C]"></span>
                                          </span>
                                          Beta launching May 2026
                                    </div>
                                    <h1 className="font-['Inter_Tight'] font-bold text-5xl md:text-6xl leading-tight mb-4">
                                          Every Shot. <span className="text-[#B91C1C]">Perfected.</span>
                                    </h1>
                                    <p className="text-[#4A4A46] text-lg leading-relaxed mb-8">
                                          Guests upload photos. You approve the best ones. AI removes distractions.
                                          No app. No bad photos. Just the gallery you actually want.
                                    </p>
                                    <div className="flex flex-wrap gap-4">
                                          <Link
                                                to="/beta"
                                                className="bg-[#B91C1C] hover:bg-red-800 text-white px-6 py-3 rounded font-medium transition"
                                          >
                                                Request Beta Access
                                          </Link>
                                          <Link
                                                to="#features"
                                                className="border border-[#E5E4E0] bg-white px-6 py-3 rounded font-medium hover:border-[#B91C1C] transition"
                                          >
                                                See Features
                                          </Link>
                                    </div>
                              </div>

                              {/* Right column: feature panels stacked vertically */}
                              <div className="space-y-5">
                                    <FeaturePanel
                                          number="01"
                                          title="AI Magic Brush"
                                          description="Paint over any unwanted object – a photobomber, an exit sign, a stranger – and our AI removes it seamlessly. No Photoshop. No editor."
                                    />
                                    <FeaturePanel
                                          number="02"
                                          title="Auto-HDR Enhancement"
                                          description="Every upload is automatically color‑corrected, shadows lifted, highlights balanced. Phone photos look professional without any effort."
                                    />
                                    <FeaturePanel
                                          number="03"
                                          title="Host Approval Queue"
                                          description="Nothing goes public until you say so. Approve or reject photos from a private dashboard. Your gallery, your standards."
                                    />
                              </div>
                        </div>
                  </section>

                  {/* Feature Deep Dive Section (Magic Brush, Auto-HDR, Approval Queue) */}
                  <section id="features" className="bg-white border-y border-[#E5E4E0] py-20">
                        <div className="max-w-7xl mx-auto px-6">
                              <div className="text-center max-w-2xl mx-auto mb-16">
                                    <span className="text-[#B91C1C] text-sm uppercase tracking-wider">The difference</span>
                                    <h2 className="font-['Inter_Tight'] text-4xl font-bold mt-2">Not just another photo dump</h2>
                                    <p className="text-[#4A4A46] mt-4">
                                          Generic apps accept every blurry, embarrassing upload. VANTGE gives you
                                          professional tools to curate and perfect every memory.
                                    </p>
                              </div>
                              <div className="grid md:grid-cols-3 gap-8">
                                    <DetailCard
                                          icon="✨"
                                          title="Magic Brush"
                                          description="Remove people, objects, or text from any photo with a few brush strokes. AI inpaints the background perfectly."
                                          extra="Works on photos already uploaded – no need to retake."
                                    />
                                    <DetailCard
                                          icon="🎨"
                                          title="Auto-HDR"
                                          description="Automatic color grading, noise reduction, and dynamic range adjustment for every guest photo."
                                          extra="Supports JPEG, PNG, HEIC, and WebP. Delivers next-gen AVIF when supported."
                                    />
                                    <DetailCard
                                          icon="✅"
                                          title="Approval Queue"
                                          description="See every upload in a private dashboard. Approve with one click, reject with another. Real‑time updates."
                                          extra="Bulk approve, sort by guest name, and reveal the public gallery only when you're ready."
                                    />
                              </div>
                        </div>
                  </section>

                  {/* How It Works – Simple steps */}
                  <section className="py-20">
                        <div className="max-w-7xl mx-auto px-6">
                              <div className="text-center max-w-2xl mx-auto mb-16">
                                    <span className="text-[#B91C1C] text-sm uppercase tracking-wider">Two sides, one gallery</span>
                                    <h2 className="font-['Inter_Tight'] text-4xl font-bold mt-2">How VANTGE works</h2>
                              </div>
                              <div className="grid md:grid-cols-2 gap-16">
                                    <div>
                                          <h3 className="font-['Inter_Tight'] text-2xl font-bold mb-4 flex items-center gap-2">
                                                <span className="bg-[#B91C1C] text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
                                                For the host
                                          </h3>
                                          <ul className="space-y-4 text-[#4A4A46]">
                                                <li className="flex gap-3"><span className="text-[#B91C1C]">→</span> Create an event – get a QR code and link</li>
                                                <li className="flex gap-3"><span className="text-[#B91C1C]">→</span> Share with guests (print cards, email, text)</li>
                                                <li className="flex gap-3"><span className="text-[#B91C1C]">→</span> Review every photo in the approval queue</li>
                                                <li className="flex gap-3"><span className="text-[#B91C1C]">→</span> Use Magic Brush to fix imperfect shots</li>
                                                <li className="flex gap-3"><span className="text-[#B91C1C]">→</span> Flip the switch – gallery goes public to all guests</li>
                                          </ul>
                                    </div>
                                    <div>
                                          <h3 className="font-['Inter_Tight'] text-2xl font-bold mb-4 flex items-center gap-2">
                                                <span className="bg-[#B91C1C] text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
                                                For the guest
                                          </h3>
                                          <ul className="space-y-4 text-[#4A4A46]">
                                                <li className="flex gap-3"><span className="text-[#B91C1C]">→</span> Scan QR code with phone camera</li>
                                                <li className="flex gap-3"><span className="text-[#B91C1C]">→</span> Take a photo or choose from camera roll</li>
                                                <li className="flex gap-3"><span className="text-[#B91C1C]">→</span> Tap upload – no account, no app download</li>
                                                <li className="flex gap-3"><span className="text-[#B91C1C]">→</span> Done. Photo goes to host for approval</li>
                                                <li className="flex gap-3"><span className="text-[#B91C1C]">→</span> Later, visit the same link to see the full approved gallery</li>
                                          </ul>
                                    </div>
                              </div>
                        </div>
                  </section>

                  {/* Pricing Summary – from PDF */}
                  <section className="bg-white border-y border-[#E5E4E0] py-20">
                        <div className="max-w-7xl mx-auto px-6">
                              <div className="text-center max-w-2xl mx-auto mb-12">
                                    <span className="text-[#B91C1C] text-sm uppercase tracking-wider">Simple, transparent</span>
                                    <h2 className="font-['Inter_Tight'] text-4xl font-bold mt-2">One event, one price</h2>
                              </div>
                              <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                                    <PricingTier name="Sprint" price="$39" duration="30 days" features={["Up to 500 photos", "Auto-HDR", "Approval queue", "Basic support"]} />
                                    <PricingTier name="Archive" price="$89" duration="90 days" features={["Up to 2,000 photos", "Auto-HDR", "Magic Brush (10 fixes)", "Priority support"]} popular />
                                    <PricingTier name="Forever" price="$149" duration="1 year" features={["Unlimited photos", "Magic Brush (unlimited)", "Video uploads", "Dedicated onboarding"]} />
                              </div>
                              <p className="text-center text-sm text-[#4A4A46] mt-8">100% money-back guarantee. No surprises.</p>
                        </div>
                  </section>

                  {/* Final CTA */}
                  <section className="py-20">
                        <div className="max-w-3xl mx-auto text-center px-6">
                              <h2 className="font-['Inter_Tight'] text-4xl font-bold mb-4">Ready to control your gallery?</h2>
                              <p className="text-[#4A4A46] mb-8">Be among the first to use VANTGE at your wedding, birthday, or corporate event.</p>
                              <Link
                                    to="/beta"
                                    className="inline-block bg-[#B91C1C] hover:bg-red-800 text-white px-8 py-3 rounded font-medium transition"
                              >
                                    Request Beta Access
                              </Link>
                        </div>
                  </section>

                  {/* Footer */}
                  <footer className="border-t border-[#E5E4E0] py-8 text-center text-sm text-[#4A4A46]">
                        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
                              <span className="font-['Inter_Tight'] font-bold text-[#1A1A18]">VANTGE</span>
                              <span>© 2026 09 Labs – Event Memory Studio</span>
                              <div className="flex gap-4">
                                    <a href="#" className="hover:text-[#B91C1C]">Privacy</a>
                                    <a href="#" className="hover:text-[#B91C1C]">Terms</a>
                                    <a href="#" className="hover:text-[#B91C1C]">Contact</a>
                              </div>
                        </div>
                  </footer>
            </div>
      );
}

// Helper components
function FeaturePanel({ number, title, description }) {
      return (
            <div className="bg-white border border-[#E5E4E0] rounded-lg p-5 shadow-sm">
                  <div className="text-xs text-[#B91C1C] uppercase tracking-wider mb-1">Core feature / {number}</div>
                  <h3 className="font-['Inter_Tight'] font-bold text-xl mb-2">{title}</h3>
                  <p className="text-[#4A4A46] text-sm leading-relaxed">{description}</p>
            </div>
      );
}

function DetailCard({ icon, title, description, extra }) {
      return (
            <div className="p-6 border border-[#E5E4E0] rounded-xl bg-[#FAFAF8]">
                  <div className="text-3xl mb-3">{icon}</div>
                  <h3 className="font-['Inter_Tight'] font-bold text-xl mb-2">{title}</h3>
                  <p className="text-[#4A4A46] text-sm leading-relaxed mb-3">{description}</p>
                  <p className="text-xs text-[#4A4A46] border-t border-[#E5E4E0] pt-3 mt-2">{extra}</p>
            </div>
      );
}

function PricingTier({ name, price, duration, features, popular = false }) {
      return (
            <div className={`border rounded-xl p-6 ${popular ? 'border-[#B91C1C] shadow-md relative' : 'border-[#E5E4E0]'}`}>
                  {popular && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#B91C1C] text-white text-xs px-3 py-0.5 rounded-full">
                              Most popular
                        </span>
                  )}
                  <h3 className="font-['Inter_Tight'] text-2xl font-bold">{name}</h3>
                  <div className="mt-4">
                        <span className="text-3xl font-bold">{price}</span>
                        <span className="text-[#4A4A46]"> / {duration}</span>
                  </div>
                  <ul className="mt-6 space-y-2 text-sm">
                        {features.map((f, i) => (
                              <li key={i} className="flex items-center gap-2">
                                    <span className="text-[#B91C1C]">✓</span> {f}
                              </li>
                        ))}
                  </ul>
                  <button className="w-full mt-8 py-2 border border-[#E5E4E0] rounded font-medium hover:border-[#B91C1C] transition">
                        Choose plan
                  </button>
            </div>
      );
}