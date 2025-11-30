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
  const [transmittedSecret, setTransmittedSecret] = useState('');
  const [isGlowing, setIsGlowing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasTransmitted, setHasTransmitted] = useState(false);
  const [showEye, setShowEye] = useState(true);
  const [floatingSecrets, setFloatingSecrets] = useState<Transmission[]>([]);
  const [farcasterSdk, setFarcasterSdk] = useState<any>(null);

  useEffect(() => {
    const initializeFarcasterSDK = async () => {
      try {
        console.log('👁️ Loading Farcaster SDK...');
        const importSdk = new Function('return import("https://esm.sh/@farcaster/frame-sdk@latest")');
        const sdkModule = await importSdk();
        const sdkInstance = sdkModule.sdk;
        setFarcasterSdk(sdkInstance);
        console.log('👁️ Farcaster SDK loaded successfully');
        await sdkInstance.actions.ready();
        console.log('👁️ Frame ready');
      } catch (error) {
        console.log('👁️ Not in Frame:', error);
      }
    };
    initializeFarcasterSDK();
  }, []);

  useEffect(() => {
    async function loadSecrets() {
      const { data } = await supabase
        .from('transmissions')
        .select('id, secret, display_name, created_at')
        .order('created_at', { ascending: false })
        .limit(15);
      if (data) setFloatingSecrets(data);
    }
    loadSecrets();
    const interval = setInterval(loadSecrets, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secret.trim()) return;
    setIsSubmitting(true);
    const secretToTransmit = secret.trim();
    setTransmittedSecret(secretToTransmit);
    
    try {
      await supabase.from('transmissions').insert({
        secret: secretToTransmit,
        display_name: displayName.trim() || null,
        ip_address: null,
        user_agent: navigator.userAgent,
      });
      
      setHasTransmitted(true);
      setSecret('');
      setDisplayName('');
      setTimeout(() => setShowEye(false), 3000);
      setTimeout(() => {
        setHasTransmitted(false);
        setShowEye(true);
        setTransmittedSecret('');
      }, 8000);
    } catch (error) {
      alert('The Eye is temporarily blinded.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-pink-900/20" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {floatingSecrets.map((transmission, index) => {
          const gridColumns = 3;
          const gridRows = 5;
          const col = index % gridColumns;
          const row = Math.floor(index / gridColumns);
          const baseLeft = (col / gridColumns) * 100;
          const baseTop = (row / gridRows) * 100;
          const randomOffsetX = (Math.random() - 0.5) * 15;
          const randomOffsetY = (Math.random() - 0.5) * 10;
          const randomDelay = Math.random() * 10;
          const randomDuration = 15 + Math.random() * 10;
          
          const ghostColors = [
            { text: 'text-purple-300/40', name: 'text-purple-400/40', glow: 'rgba(168, 85, 247, 0.6)' },
            { text: 'text-pink-300/40', name: 'text-pink-400/40', glow: 'rgba(236, 72, 153, 0.6)' },
            { text: 'text-blue-300/40', name: 'text-blue-400/40', glow: 'rgba(96, 165, 250, 0.6)' },
            { text: 'text-cyan-300/40', name: 'text-cyan-400/40', glow: 'rgba(103, 232, 249, 0.6)' },
            { text: 'text-violet-300/40', name: 'text-violet-400/40', glow: 'rgba(167, 139, 250, 0.6)' },
            { text: 'text-fuchsia-300/40', name: 'text-fuchsia-400/40', glow: 'rgba(232, 121, 249, 0.6)' },
          ];
          const colorSet = ghostColors[index % ghostColors.length];
          
          return (
            <div
              key={transmission.id}
              className={`absolute ${colorSet.text} text-sm blur-[0.8px] hover:blur-[0.3px] hover:opacity-70 transition-all duration-700 whitespace-nowrap animate-float`}
              style={{
                top: `${baseTop + randomOffsetY}%`,
                left: `${baseLeft + randomOffsetX}%`,
                animationDelay: `${randomDelay}s`,
                animationDuration: `${randomDuration}s`,
                textShadow: `0 0 12px ${colorSet.glow}, 0 0 20px ${colorSet.glow}`,
              }}
            >
              <div className="flex flex-col items-start">
                <span className={`text-xs ${colorSet.name} mb-1`}>
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
        <div className={`relative w-80 h-80 mx-auto mb-8 transition-all duration-1000 ${showEye ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
          <img src="/feylonloop.gif" alt="" width={320} height={320} className="rounded-full w-full h-full object-cover" />
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/30 to-pink-500/30 blur-2xl animate-pulse" />
        </div>

        <div className="space-y-2">
          <h1 className="text-6xl font-light tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 animate-gradient">
            FEYLON
          </h1>
          <p className="text-gray-500 text-sm tracking-widest">The Eye Sees All</p>
        </div>

        {!hasTransmitted ? (
          <form onSubmit={handleSubmit} className="space-y-6 mt-12">
            <div className="relative">
              <p className="text-gray-400 mb-4 text-sm">Whisper a secret truth to the Eye</p>
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
                    isGlowing ? 'border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.4)]' : 'border-white/20'
                  }`}
                  disabled={isSubmitting}
                />
                {isGlowing && <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 blur-xl -z-10 animate-pulse" />}
              </div>
              <p className="text-xs text-gray-600 mt-2">{secret.length}/280</p>
            </div>

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
              <p className="text-xs text-gray-600 mt-1">(optional - leave blank to stay anonymous)</p>
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

            <div className="pt-6">
              <button
                onClick={async () => {
                  const shareText = `👁️ I whispered a secret to the Eye...\n\n"${transmittedSecret}"\n\nThe Eye sees all. The Eye will open soon.\n\nhttps://feylon.xyz`;
                  try {
                    if (farcasterSdk && farcasterSdk.actions && farcasterSdk.actions.openUrl) {
                      await farcasterSdk.actions.openUrl(`https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}`);
                      return;
                    }
                    const newWindow = window.open(`https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}`, '_blank', 'width=600,height=700');
                    if (!newWindow) {
                      await navigator.clipboard.writeText(shareText);
                      alert('✅ Copied to clipboard!');
                    }
                  } catch (error) {
                    try {
                      await navigator.clipboard.writeText(shareText);
                      alert('✅ Copied to clipboard!');
                    } catch (e) {
                      alert('📋 Unable to share.');
                    }
                  }
                }}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-full transition-all duration-300 hover:scale-105"
              >
                🚀 Share Your Transmission
              </button>
            </div>
          </div>
        )}

        {!hasTransmitted && (
          <>
            <div className="pt-12 space-y-4">
              <p className="text-gray-500 text-sm">Follow the Eye</p>
              
                href="https://farcaster.xyz/feylon"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-6 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-400 font-medium rounded-full transition-all duration-300 hover:scale-105"
              >
                🟪 Feylon on Farcaster
              </a>
            </div>

            <div className="pt-8">
              <p className="text-xs text-gray-600 tracking-widest">SOMETHING IS WATCHING</p>
              <div className="mt-4 opacity-0 hover:opacity-100 transition-opacity duration-500">
                <a href="/test" className="text-xs text-gray-700 hover:text-purple-500 transition-colors">👁️</a>
              </div>
            </div>
          </>
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
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0; }
          10% { opacity: 0.3; }
          50% { transform: translateY(-30px) translateX(20px); opacity: 0.5; }
          90% { opacity: 0.3; }
        }
        .animate-gradient { background-size: 200% 200%; animation: gradient 3s ease infinite; }
        .animate-fade-in { animation: fade-in 0.6s ease-out; }
        .animate-float { animation: float linear infinite; }
      `}</style>
    </div>
  );
}
