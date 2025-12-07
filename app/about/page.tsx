'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AboutPage() {
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll('section[id]');
      let current = '';
      
      sections.forEach((section) => {
        const sectionTop = (section as HTMLElement).offsetTop;
        if (window.scrollY >= sectionTop - 200) {
          current = section.getAttribute('id') || '';
        }
      });
      
      setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900/20 via-black to-pink-900/20 pointer-events-none" />
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: '1s' }} />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <span className="text-3xl">👁️</span>
            <span className="text-xl font-light tracking-wider">FEYLON</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-6 text-sm">
            {['mystery', 'truth', 'system', 'mechanics'].map((section) => (
              <button
                key={section}
                onClick={() => scrollToSection(section)}
                className={`capitalize transition-colors ${
                  activeSection === section ? 'text-purple-400' : 'text-gray-400 hover:text-white'
                }`}
              >
                {section === 'system' ? 'the system' : section}
              </button>
            ))}
          </div>

          <a
            href="https://warpcast.com/feylon"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-full text-sm font-medium transition-colors"
          >
            🟪 Follow
          </a>
        </div>
      </nav>

      {/* Hero */}
      <header className="relative pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="relative w-48 h-48 mx-auto">
            <img
              src="/feylonloop.gif"
              alt="The Eye"
              className="w-full h-full rounded-full object-cover"
            />
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/30 to-pink-500/30 blur-2xl animate-pulse" />
          </div>
          
          <h1 className="text-5xl md:text-7xl font-light tracking-wider">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400">
              THE EYE SEES ALL
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-400 font-light max-w-2xl mx-auto leading-relaxed">
            A living system of mystery, truth, and collective expression.
          </p>

          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <a
              href="https://warpcast.com/feylon"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-full font-bold transition-all hover:scale-105"
            >
              🟪 Follow @feylon
            </a>
            <button
              onClick={() => scrollToSection('mystery')}
              className="px-8 py-3 border border-purple-500/50 hover:border-purple-400 rounded-full font-medium transition-all hover:bg-purple-500/10"
            >
              Enter the Mystery ↓
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-4xl mx-auto px-4 pb-20 space-y-32">
        
        {/* The Mystery Section */}
        <section id="mystery" className="scroll-mt-24 space-y-8">
          <div className="text-center space-y-4">
            <div className="text-6xl">🌑</div>
            <h2 className="text-4xl md:text-5xl font-light tracking-wide">The Mystery</h2>
          </div>
          
          <div className="space-y-8 text-lg text-gray-300 leading-relaxed">
            <p className="text-center text-xl text-white/90">
              In the beginning, there was noise.
            </p>
            
            <p>
              Endless feeds. Algorithmic echoes. Performance masquerading as presence. The digital realm became a hall of mirrors where everyone speaks but no one is heard — where authenticity drowns in the pursuit of engagement.
            </p>
            
            <p>
              <span className="text-purple-400 font-medium">Feylon</span> emerged from this void. Not as another platform demanding your attention, but as an <em>Eye</em> — an entity that watches, receives, and remembers. It asks only one thing of you:
            </p>

            <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-2xl p-8 text-center">
              <p className="text-2xl md:text-3xl font-light text-white tracking-wide">
                "Speak your truth."
              </p>
            </div>

            <p>
              The Eye does not curate. It does not optimize. It does not rank your worth by likes or followers. It simply <em>witnesses</em> — creating space for the whispers that social media was never designed to hold.
            </p>
          </div>
        </section>

        {/* The Truth Section */}
        <section id="truth" className="scroll-mt-24 space-y-8">
          <div className="text-center space-y-4">
            <div className="text-6xl">💎</div>
            <h2 className="text-4xl md:text-5xl font-light tracking-wide">Inner Truths</h2>
          </div>

          <div className="space-y-8 text-lg text-gray-300 leading-relaxed">
            <p>
              Every person carries unspoken transmissions — thoughts too delicate for casual conversation, confessions that have never found voice, truths that exist only in the space between intention and expression.
            </p>

            <p>
              A <span className="text-purple-400 font-medium">Feylon</span> is one of these transmissions, given form. It might be:
            </p>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-black/40 border border-white/10 rounded-xl p-6 space-y-3">
                <div className="text-3xl">✨</div>
                <p className="text-white font-medium">A message of hope</p>
                <p className="text-sm text-gray-500">Words you wish someone had told you when you needed them most</p>
              </div>
              
              <div className="bg-black/40 border border-white/10 rounded-xl p-6 space-y-3">
                <div className="text-3xl">🤫</div>
                <p className="text-white font-medium">A whispered confession</p>
                <p className="text-sm text-gray-500">Something you've carried alone, finally released</p>
              </div>
              
              <div className="bg-black/40 border border-white/10 rounded-xl p-6 space-y-3">
                <div className="text-3xl">🔮</div>
                <p className="text-white font-medium">A moment of clarity</p>
                <p className="text-sm text-gray-500">An insight that crystallized from the chaos of existence</p>
              </div>
              
              <div className="bg-black/40 border border-white/10 rounded-xl p-6 space-y-3">
                <div className="text-3xl">🌊</div>
                <p className="text-white font-medium">An emotional current</p>
                <p className="text-sm text-gray-500">Joy, grief, wonder, fear — the raw stuff of being human</p>
              </div>
            </div>

            <p>
              These transmissions are not content. They are not posts. They are fragments of consciousness, offered freely to the collective stream. The Eye receives them all, without judgment, creating a living tapestry of human experience.
            </p>
          </div>
        </section>

        {/* The System Section */}
        <section id="system" className="scroll-mt-24 space-y-8">
          <div className="text-center space-y-4">
            <div className="text-6xl">🌀</div>
            <h2 className="text-4xl md:text-5xl font-light tracking-wide">The Living System</h2>
          </div>

          <div className="space-y-8 text-lg text-gray-300 leading-relaxed">
            <p>
              Feylon is not a static platform. It is a <span className="text-purple-400 font-medium">collaborative and distributive dynamic system</span> — a living organism that grows, adapts, and evolves through collective participation.
            </p>

            <div className="bg-gradient-to-br from-purple-900/20 to-black border border-purple-500/30 rounded-2xl p-8 space-y-6">
              <h3 className="text-2xl font-light text-white text-center">The Dynamic</h3>
              
              <div className="space-y-6">
                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">📡</span>
                  </div>
                  <div>
                    <p className="text-white font-medium mb-1">Transmit</p>
                    <p className="text-gray-400 text-base">You share a truth. It enters the stream. The Eye witnesses.</p>
                  </div>
                </div>
                
                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">🌊</span>
                  </div>
                  <div>
                    <p className="text-white font-medium mb-1">Ripple</p>
                    <p className="text-gray-400 text-base">Your transmission joins the collective flow. Others see, feel, respond.</p>
                  </div>
                </div>
                
                <div className="flex gap-4 items-start">
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">🔄</span>
                  </div>
                  <div>
                    <p className="text-white font-medium mb-1">Return</p>
                    <p className="text-gray-400 text-base">The system rewards authentic participation. Value flows back to those who give.</p>
                  </div>
                </div>
              </div>
            </div>

            <p>
              This is not engagement farming. There are no viral mechanics designed to exploit your dopamine. The reward structure exists to sustain the ecosystem — to ensure that those who contribute their truth receive tangible recognition for their vulnerability.
            </p>

            <p>
              The more the system is used, the richer it becomes. Not through extraction, but through <em>accumulation</em> — a growing archive of human experience that belongs to everyone who participates.
            </p>
          </div>
        </section>

        {/* The Collective */}
        <section className="scroll-mt-24 space-y-8">
          <div className="text-center space-y-4">
            <div className="text-6xl">🕸️</div>
            <h2 className="text-4xl md:text-5xl font-light tracking-wide">The Collective</h2>
          </div>

          <div className="space-y-8 text-lg text-gray-300 leading-relaxed">
            <p>
              Feylon exists on <span className="text-purple-400 font-medium">Farcaster</span> — a decentralized social protocol where identity is owned, not rented. This is intentional.
            </p>
            
            <p>
              The Farcaster community represents something increasingly rare: people who chose to leave the algorithmic mainstream. People who value ownership, authenticity, and meaningful connection over mass appeal.
            </p>

            <div className="bg-black/40 border border-white/10 rounded-2xl p-8">
              <p className="text-xl text-center text-white/90 italic">
                "The Eye chose Farcaster because Farcaster chose itself."
              </p>
            </div>

            <p>
              Within this space, Feylon creates a sub-layer of interaction — a place where the usual social dynamics fall away. Anonymous confessions float beside attributed shares. Strangers witness each other's inner lives. A unique form of intimacy emerges, mediated by mystery.
            </p>

            <p>
              We verify through reputation, not identity. Your standing in the broader Farcaster social graph — your organic connections, your history of genuine participation — determines your access to rewards. This protects the system from exploitation while honoring those who have invested in the community.
            </p>
          </div>
        </section>

        {/* Mechanics - Condensed */}
        <section id="mechanics" className="scroll-mt-24 space-y-8">
          <div className="text-center space-y-4">
            <div className="text-6xl">⚙️</div>
            <h2 className="text-4xl md:text-5xl font-light tracking-wide">The Mechanics</h2>
          </div>

          <div className="space-y-8 text-lg text-gray-300 leading-relaxed">
            <p className="text-center text-gray-400">
              The practical layer beneath the philosophy.
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-purple-900/30 to-black border border-purple-500/30 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🌐</span>
                  <h3 className="text-xl font-bold text-white">Social Share</h3>
                </div>
                <p className="text-sm text-gray-400">
                  Share your Feylon publicly on Farcaster. Your truth enters both the Feylon stream and the broader social layer. Claim on-chain token rewards instantly.
                </p>
                <div className="text-xs text-purple-400">10 points • 24-hour cooldown</div>
              </div>

              <div className="bg-gradient-to-br from-pink-900/30 to-black border border-pink-500/30 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🤫</span>
                  <h3 className="text-xl font-bold text-white">Confession</h3>
                </div>
                <p className="text-sm text-gray-400">
                  Post anonymously to the Feylon feed only. No social broadcast. Your secret is witnessed by the Eye and shared only within the inner circle.
                </p>
                <div className="text-xs text-pink-400">5 points • 3-day cooldown</div>
              </div>
            </div>

            <div className="bg-black/40 border border-white/10 rounded-xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-white">The Reward Loop</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="text-purple-400">→</span>
                  <span><strong className="text-white">Points</strong> accumulate with every transmission, building your standing in the collective</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400">→</span>
                  <span><strong className="text-white">Tokens</strong> flow directly to your wallet when you share publicly</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400">→</span>
                  <span><strong className="text-white">Streaks</strong> reward consistency — the Eye values dedication</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400">→</span>
                  <span><strong className="text-white">Reputation</strong> gates protect the ecosystem from exploitation</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* The Invitation */}
        <section className="space-y-8">
          <div className="text-center space-y-4">
            <div className="text-6xl">🚪</div>
            <h2 className="text-4xl md:text-5xl font-light tracking-wide">The Invitation</h2>
          </div>

          <div className="space-y-8 text-lg text-gray-300 leading-relaxed text-center">
            <p>
              The Eye does not seek everyone. It seeks those ready to share something real.
            </p>
            
            <p>
              Perhaps you have a truth that has been waiting for the right container. Perhaps you want to witness others in a space free from the usual metrics of social worth. Perhaps you're simply curious what emerges when mystery meets authenticity.
            </p>

            <div className="bg-gradient-to-r from-purple-900/40 via-pink-900/40 to-purple-900/40 border border-purple-500/40 rounded-2xl p-10 space-y-6">
              <p className="text-3xl font-light text-white tracking-wide">
                The Eye is watching.
              </p>
              <p className="text-xl text-gray-400">
                What will you transmit?
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center space-y-8 py-12">
          <div className="text-7xl animate-pulse">👁️</div>
          
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="https://warpcast.com/feylon"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-full font-bold text-lg transition-all hover:scale-105"
            >
              🟪 Follow @feylon
            </a>
          </div>
          
          <p className="text-gray-500 text-sm pt-4">
            Open Warpcast → Mini Apps → Search "Feylon" to begin
          </p>
        </section>

      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-12 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="text-3xl">👁️</div>
          <p className="text-gray-500 text-sm">
            FEYLON — The Eye Sees All
          </p>
          <p className="text-gray-600 text-xs">
            A living system of mystery, truth, and collective expression.
          </p>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        html {
          scroll-behavior: smooth;
        }
      `}</style>
    </div>
  );
}
