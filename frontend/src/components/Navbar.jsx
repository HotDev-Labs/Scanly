import React, { useState } from 'react';
import { 
  QrCode, 
  ScanLine, 
  PackageCheck, 
  FileSpreadsheet, 
  User, 
  LogOut, 
  LogIn, 
  Camera 
} from 'lucide-react';
import AvatarUploadModal from './AvatarUploadModal';
import ScanlyLogo from './ScanlyLogo';

export default function Navbar({ activeTab, setActiveTab, currentUser, onOpenAuth, onLogout }) {
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);

  const formatAgentName = (user) => {
    if (!user) return 'Agent';
    if (user.full_name && !user.full_name.includes('@')) {
      return user.full_name;
    }
    const raw = user.full_name || user.email || user.username || '';
    const namePart = raw.includes('@') ? raw.split('@')[0] : raw;
    return namePart.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Agent';
  };

  const navItems = [
    {
      id: 'generate-qr',
      label: 'Generate QR',
      shortLabel: 'Generate',
      desc: 'Create baggage QR code tags',
      icon: QrCode,
    },
    {
      id: 'scan-verify',
      label: 'Scan & Verify',
      shortLabel: 'Scan',
      desc: 'Verify luggage & complete handover',
      icon: ScanLine,
    },
    {
      id: 'collection-status',
      label: 'Luggage Tracking',
      shortLabel: 'Tracking',
      desc: 'Track, edit & manage luggage',
      icon: PackageCheck,
    },
    {
      id: 'import-data',
      label: 'Import Data',
      shortLabel: 'Import',
      desc: 'Upload manifest CSV / Sheets',
      icon: FileSpreadsheet,
    }
  ];

  return (
    <>
      {/* Top Header Bar in Solid Blue Theme (No Neon Effect) */}
      <header className="no-print bg-blue-800 border-b border-blue-900 text-white sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between relative">
          
          {/* Left: Brand Logo & Title (No 3-line bar menu) */}
          <div className="flex items-center space-x-3 z-10">
            <div 
              className="flex items-center space-x-2.5 cursor-pointer select-none group" 
              onClick={() => setActiveTab('generate-qr')}
            >
              <div className="bg-white p-1 rounded-xl shadow-xs transition-transform group-hover:scale-105 flex items-center justify-center">
                <ScanlyLogo className="w-6 h-6" />
              </div>
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">Scanly</span>
            </div>
          </div>

          {/* Center: The Four Navigation Options Centered for Desktop */}
          <nav className="hidden md:flex items-center space-x-1 absolute left-1/2 -translate-x-1/2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-blue-800 shadow-xs'
                      : 'text-blue-100 hover:text-white hover:bg-blue-900/80'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-1.5 flex-shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Desktop Right: Agent Full Name & Logout Button in White */}
          <div className="hidden md:flex items-center space-x-2.5 z-10">
            {currentUser ? (
              <div className="flex items-center space-x-2">
                <div 
                  onClick={() => setActiveTab('profile')}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border shadow-2xs ${
                    activeTab === 'profile'
                      ? 'bg-white text-blue-900 border-white'
                      : 'bg-blue-900/70 text-white hover:bg-blue-900 border-blue-700/50'
                  }`}
                  title={`Logged in as ${currentUser.full_name || currentUser.username}. Click to view profile & trips.`}
                >
                  {currentUser.avatar_url ? (
                    <img 
                      src={currentUser.avatar_url} 
                      alt="Avatar" 
                      className="w-5 h-5 rounded-full object-cover border border-blue-400 shrink-0" 
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-blue-700 flex items-center justify-center text-[11px] font-bold text-white uppercase shrink-0">
                      {(currentUser.full_name || currentUser.username || 'A').charAt(0)}
                    </div>
                  )}
                  <span className="font-semibold whitespace-nowrap">
                    {formatAgentName(currentUser)}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setAvatarModalOpen(true); }}
                    className="p-1 hover:bg-blue-800 rounded-lg text-blue-300 hover:text-white transition-colors cursor-pointer ml-1"
                    title="Upload or change agent avatar"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button
                  onClick={onLogout}
                  className="px-3.5 py-1.5 text-xs font-bold text-blue-900 bg-white hover:bg-blue-50 active:scale-95 rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 shadow-xs border border-white"
                  title="Sign out of this agent account"
                >
                  <LogOut className="w-3.5 h-3.5 text-blue-900" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-3.5 py-1.5 text-xs font-bold bg-white text-blue-800 hover:bg-blue-50 rounded-xl transition-all shadow-xs cursor-pointer flex items-center space-x-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Agent Login</span>
              </button>
            )}
          </div>

          {/* Mobile View Upper Right Header: Profile Section (Takes to Profile Page) */}
          <div className="flex md:hidden items-center z-10">
            {currentUser ? (
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shadow-xs ${
                  activeTab === 'profile'
                    ? 'bg-white text-blue-900 border-white'
                    : 'bg-blue-900/80 text-white hover:bg-blue-900 border-blue-700/60'
                }`}
                title="View Profile, Trips & Account Settings"
              >
                {currentUser.avatar_url ? (
                  <img 
                    src={currentUser.avatar_url} 
                    alt="Avatar" 
                    className="w-5 h-5 rounded-full object-cover border border-blue-300 shrink-0" 
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-blue-700 flex items-center justify-center text-[10px] font-bold text-white uppercase shrink-0">
                    {(currentUser.full_name || currentUser.username || 'A').charAt(0)}
                  </div>
                )}
                <span className="max-w-[110px] truncate">
                  {formatAgentName(currentUser)}
                </span>
              </button>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-3 py-1.5 text-xs font-bold bg-white text-blue-900 hover:bg-blue-50 rounded-xl transition-all shadow-xs cursor-pointer flex items-center space-x-1"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Login</span>
              </button>
            )}
          </div>

        </div>
      </header>

      {/* Avatar Upload Modal */}
      <AvatarUploadModal
        isOpen={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
        currentAvatar={currentUser?.avatar_url}
        onAvatarUpdated={(newUrl) => {
          if (currentUser) {
            currentUser.avatar_url = newUrl;
          }
        }}
      />
    </>
  );
}
