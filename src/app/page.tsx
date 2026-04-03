// src/app/page.tsx
import Link from 'next/link'
import { getSession } from '@/lib/auth'

export default async function LandingPage() {
  const session = await getSession()

  return (
    <div className="min-h-screen bg-forge-pattern relative overflow-hidden">
      {/* Noise overlay */}
      <div className="noise-overlay fixed inset-0 pointer-events-none z-0" />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-forge-600 rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span className="font-display font-bold text-xl text-stone-100">ReliefForge</span>
        </div>
        <div className="flex items-center gap-3">
          {session ? (
            <Link href="/dashboard" className="btn-forge text-sm">
              Open Dashboard →
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn-ghost text-sm">Sign in</Link>
              <Link href="/register" className="btn-forge text-sm">Get started free</Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-32">
        {/* Ad Placeholder - Top Banner */}
        <div className="ad-placeholder w-full h-16 mb-12 rounded-lg">
          <span>Ad Space — 728×90 Leaderboard</span>
        </div>

        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-stone-900/80 border border-forge-800/50 rounded-full px-4 py-2 text-sm text-forge-400 mb-8">
            <span className="w-2 h-2 bg-forge-500 rounded-full animate-pulse" />
            3 free generations — no credit card required
          </div>

          <h1 className="font-display text-6xl md:text-7xl lg:text-8xl font-bold leading-none mb-6">
            Turn images into{' '}
            <span className="text-gradient block">3D reliefs</span>
          </h1>

          <p className="text-stone-400 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
            Upload any image — a photo, logo, or artwork. ReliefForge converts brightness
            into depth, generating a printable STL file you can bring to life on any 3D printer.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={session ? '/dashboard' : '/register'}
              className="btn-forge text-base px-8 py-4 animate-pulse-glow">
              Generate your first STL →
            </Link>
            <a href="#how-it-works" className="btn-ghost text-base px-8 py-4">
              See how it works
            </a>
          </div>
        </div>

        {/* Feature grid */}
        <div id="how-it-works" className="grid md:grid-cols-3 gap-6 mt-28">
          {[
            {
              icon: '⬆',
              title: 'Upload',
              desc: 'Drop any PNG or JPG. Photos, logos, textures — anything works.'
            },
            {
              icon: '⚙',
              title: 'Customize',
              desc: 'Adjust resolution, height scale, and inversion to get the perfect relief depth.'
            },
            {
              icon: '⬇',
              title: 'Download STL',
              desc: 'Get a valid binary STL file ready to slice and print in minutes.'
            },
          ].map((f) => (
            <div key={f.title} className="card-glow bg-stone-900/60 rounded-2xl p-8 transition-all duration-300">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="font-display text-xl font-semibold text-stone-100 mb-3">{f.title}</h3>
              <p className="text-stone-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Ad Placeholder - Mid Banner */}
        <div className="ad-placeholder w-full h-24 mt-20 rounded-xl">
          <span>Ad Space — 970×90 Billboard</span>
        </div>

        {/* Pricing note */}
        <div className="mt-20 text-center">
          <h2 className="font-display text-3xl font-bold text-stone-100 mb-4">Simple, honest pricing</h2>
          <p className="text-stone-400 max-w-lg mx-auto mb-10">
            Start with 3 free STL generations. No subscription needed to try it out.
          </p>
          <div className="max-w-sm mx-auto bg-stone-900/80 border border-forge-800/30 rounded-2xl p-8 card-glow">
            <div className="text-forge-400 text-sm font-mono mb-2">FREE PLAN</div>
            <div className="font-display text-5xl font-bold text-stone-100 mb-1">$0</div>
            <div className="text-stone-500 text-sm mb-6">Forever, no card required</div>
            <ul className="space-y-3 text-stone-300 text-sm text-left mb-8">
              {['3 STL generations', 'All resolution options', 'Height & inversion controls', 'Instant download'].map(f => (
                <li key={f} className="flex items-center gap-3">
                  <span className="text-forge-500">✓</span> {f}
                </li>
              ))}
            </ul>
            <Link href="/register" className="btn-forge w-full block text-center">
              Start for free
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-stone-800 px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="font-display font-bold text-stone-400">ReliefForge</span>
          <span className="text-stone-600 text-sm">Image → STL heightmap generator</span>
          {/* Ad Placeholder - Footer */}
          <div className="ad-placeholder h-10 w-48 text-xs">Ad Space — 320×50</div>
        </div>
      </footer>
    </div>
  )
}
