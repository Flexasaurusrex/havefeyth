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
