'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Transmission {
  id: string;
  secret: string;
  display_name?: string;
  created_at: string;
}

export default function SplashPage() {
  const [secret, setSecret] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isGlowing, setIsGlowing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasTransmitted, setHasTransmitted] = useState(false);
  const [showEye, setShowEye] = useState(true);
  const [floatingSecrets, setFloatingSecrets] = useState<Transmission[]>([]);

  // Load recent transmissions for floating ghosts
  useEffect(() => {
    async function loadSecrets() {
      const { data, error } = await supabase
        .from('transmissions')
        .select('id, secret, display_name, created_at')
        .order('created_at', { ascending: false })
        .limit(15);
      
      if (!error && data) {
        setFloatingSecrets(data);
      }
    }
    
    loadSecrets();
    // Refresh every 30 seconds for new secrets
    const interval = setInterval(loadSecrets, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!secret.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      // Record the transmission with optional name
      const { error } = await supabase
        .from('transmissions')
        .insert({
          secret: secret.trim(),
          display_name: displayName.trim() || null,
          ip_address: null,
          user_agent: navigator.userAgent,
        });
      
      if (error) throw error;
      
      // Success! Trigger Eye animation
      setHasTransmitted(true);
      setSecret('');
      setDisplayName('');
      
      // Eye disappears after 3 seconds (let GIF play)
      setTimeout(() => {
        setShowEye(false);
      }, 3000);
      
      // Reset after 8 seconds total
      setTimeout(() => {
        setHasTransmitted(false);
        setShowEye(true);
      }, 8000);
      
    } catch (error) {
      console.error('Error transmitting:', error);
      alert('The Eye is temporarily blinded. Try again soon.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Gradient background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-pink-900/20" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      
      {/* FLOATING GHOST SECRETS */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {floatingSecrets.map((transmission, index) => {
          // Random positioning and animation delays
          const randomTop = Math.random() * 80;
          const randomLeft = Math.random() * 90;
          const randomDelay = Math.random() * 10;
          const randomDuration = 15 + Math.random() * 10;
          
          return (
            <div
              key={transmission.id}
              className="absolute text-purple-300/30 text-sm blur-[1px] hover:blur-none hover:text-purple-300/60 transition-all duration-500 whitespace-nowrap animate-float"
              style={{
                top: `${randomTop}%`,
                left: `${randomLeft}%`,
                animationDelay: `${randomDelay}s`,
                animationDuration: `${randomDuration}s`,
              }}
            >
              <div className="flex flex-col items-start">
                <span className="text-xs text-purple-400/40 mb-1">
                  {transmission.display_name || 'Anonymous'}
                </span>
                <span className="max-w-xs truncate">
                  "{transmission.secret.slice(0, 60)}{transmission.secret.length > 60 ? '...' : ''}"
                </span>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="relative z-10 max-w-2xl w-full space-y-8 text-center animate-fade-in">
        {/* The Eye GIF */}
        <div className={`relative w-80 h-80 mx-auto mb-8 transition-all duration-1000 ${
          showEye ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
        }`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/feylonloop.gif"
            alt=""
            width={320}
            height={320}
            className="rounded-full w-full h-full object-cover"
          />
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/30 to-pink-500/30 blur-2xl animate-pulse" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-6xl font-light tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 animate-gradient">
            FEYLON
          </h1>
          <p className="text-gray-500 text-sm tracking-widest">
            The Eye Sees All
          </p>
        </div>

        {/* Transmission Form or Success Message */}
        {!hasTransmitted ? (
          <form onSubmit={handleSubmit} className="space-y-6 mt-12">
            <div className="relative">
              <p className="text-gray-400 mb-4 text-sm">
                Whisper a secret truth to the Eye
              </p>
              
              <div className={`relative transition-all duration-300 ${isGlowing ? 'scale-105' : ''}`}>
                <input
                  type="text"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  onFocus={() => setIsGlowing(true)}
                  onBlur={() => setIsGlowing(false)}
                  placeholder="Your secret transmission..."
                  maxLength={280}
                  className={`w-full bg-black/50 border-2 rounded-2xl p-4 text-center text-white placeholder-gray-600 focus:outline-none transition-all duration-300 ${
                    isGlowing 
                      ? 'border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.4)]' 
                      : 'border-white/20'
                  }`}
                  disabled={isSubmitting}
                />
                
                {/* Glow effect */}
                {isGlowing && (
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 blur-xl -z-10 animate-pulse" />
                )}
              </div>
              
              <p className="text-xs text-gray-600 mt-2">
                {secret.length}/280
              </p>
            </div>

            {/* Optional Name Field */}
            <div className="relative">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Anonymous"
                maxLength={30}
                className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-center text-sm text-gray-400 placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-all"
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-600 mt-1">
                (optional - leave blank to stay anonymous)
              </p>
            </div>

            <button
              type="submit"
              disabled={!secret.trim() || isSubmitting}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-700 disabled:to-gray-700 text-white font-medium rounded-full transition-all duration-300 hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Transmitting...' : 'Transmit to the Eye'}
            </button>
          </form>
        ) : (
          <div className="space-y-6 mt-12 animate-fade-in">
            <div className="relative">
              <div className="text-5xl mb-4 animate-pulse">👁️</div>
              <p className="text-2xl font-light text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-8">
                The Eye has received your Transmission
              </p>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 blur-3xl -z-10 animate-pulse" />
            </div>
            
            {/* Coming Soon Message */}
            <div className="pt-8 space-y-2">
              <p className="text-3xl font-light text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-pink-300 tracking-wider">
                THE EYE WILL OPEN SOON
              </p>
              <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}

        {/* Farcaster Link - only show when not in transmission state */}
        {!hasTransmitted && (
          <div className="pt-12 space-y-4">
            <p className="text-gray-500 text-sm">Follow the Eye</p>
            <a
              href="https://farcaster.xyz/feylon"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-400 font-medium rounded-full transition-all duration-300 hover:scale-105"
            >
              🟪 Feylon on Farcaster
            </a>
          </div>
        )}

        {/* Coming Soon */}
        {!hasTransmitted && (
          <div className="pt-8">
            <p className="text-xs text-gray-600 tracking-widest">
              SOMETHING IS WATCHING
            </p>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
            opacity: 0;
          }
          10% {
            opacity: 0.3;
          }
          50% {
            transform: translateY(-30px) translateX(20px);
            opacity: 0.5;
          }
          90% {
            opacity: 0.3;
          }
        }
        
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        
        .animate-float {
          animation: float linear infinite;
        }
      `}</style>
    </div>
  );
}
