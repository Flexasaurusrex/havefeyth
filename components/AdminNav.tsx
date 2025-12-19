'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: '📊' },
    { href: '/admin/collaborations', label: 'Collaborations', icon: '🤝' },
    { href: '/admin/openrank', label: 'Anti-Farmer', icon: '🛡️' },
    { href: '/', label: 'Back to App', icon: '👁️' },
  ];

  return (
    <nav className="bg-gray-900 border-b border-gray-800 mb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <span className="text-2xl">👁️</span>
            <span className="text-xl font-bold text-white">Feylon Admin</span>
          </div>
          <div className="flex gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    isActive
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
