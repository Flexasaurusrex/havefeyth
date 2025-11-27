'use client';

interface PixelGhostProps {
  walletAddress: string;
  size?: number;
}

export function PixelGhost({ walletAddress, size = 120 }: PixelGhostProps) {
  // Generate deterministic values from wallet address
  function hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  const hash = hashCode(walletAddress.toLowerCase());
  
  // Generate colors in purple-pink range with glow
  const hue = (hash % 60) + 270; // 270-330 = purple to pink
  const saturation = 70 + (hash % 30); // 70-100%
  const lightness = 50 + (hash % 20); // 50-70%
  
  const primaryColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  const glowColor = `hsl(${hue}, ${saturation}%, ${lightness + 10}%)`;
  
  // Generate ghost shape (8x8 pixel grid, symmetric)
  const generatePattern = () => {
    const pattern: boolean[][] = [];
    const seed = hash;
    
    for (let y = 0; y < 8; y++) {
      pattern[y] = [];
      for (let x = 0; x < 4; x++) {
        const value = ((seed >> (y * 4 + x)) & 1) === 1;
        pattern[y][x] = value;
        pattern[y][7 - x] = value; // Mirror for symmetry
      }
    }
    
    return pattern;
  };

  const pattern = generatePattern();
  const pixelSize = size / 8;

  return (
    <div 
      className="relative"
      style={{
        width: size,
        height: size,
        filter: `drop-shadow(0 0 ${size/8}px ${glowColor}) drop-shadow(0 0 ${size/16}px ${glowColor})`,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 8 8"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          imageRendering: 'pixelated',
          shapeRendering: 'crispEdges',
        }}
      >
        {/* Background ghost shape */}
        <rect width="8" height="8" fill="transparent" />
        
        {/* Pixel pattern */}
        {pattern.map((row, y) =>
          row.map((filled, x) =>
            filled ? (
              <rect
                key={`${x}-${y}`}
                x={x}
                y={y}
                width="1"
                height="1"
                fill={primaryColor}
                opacity={0.9}
              />
            ) : null
          )
        )}
        
        {/* Eyes (always visible) */}
        <rect x="2" y="2" width="1" height="1" fill="black" opacity={0.8} />
        <rect x="5" y="2" width="1" height="1" fill="black" opacity={0.8} />
        
        {/* Eye glow */}
        <rect x="2" y="2" width="1" height="1" fill={glowColor} opacity={0.3} />
        <rect x="5" y="2" width="1" height="1" fill={glowColor} opacity={0.3} />
      </svg>
      
      {/* Animated glow pulse */}
      <div
        className="absolute inset-0 rounded-full animate-pulse"
        style={{
          background: `radial-gradient(circle, ${glowColor}20 0%, transparent 70%)`,
          animation: 'pulse 3s ease-in-out infinite',
        }}
      />
    </div>
  );
}

// Avatar wrapper that shows custom image OR pixel ghost
interface AvatarProps {
  walletAddress: string;
  customImageUrl?: string | null;
  size?: number;
  className?: string;
}

export function Avatar({ walletAddress, customImageUrl, size = 120, className = '' }: AvatarProps) {
  if (customImageUrl) {
    return (
      <div 
        className={`relative rounded-full overflow-hidden ${className}`}
        style={{ width: size, height: size }}
      >
        <img
          src={customImageUrl}
          alt="Profile"
          className="w-full h-full object-cover"
          style={{
            filter: 'drop-shadow(0 0 8px rgba(147, 51, 234, 0.5))',
          }}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <PixelGhost walletAddress={walletAddress} size={size} />
    </div>
  );
}
