import React, { useState } from 'react';
import { 
  Menu, 
  X, 
  Bus, 
  QrCode, 
  ScanLine, 
  PackageCheck, 
  FileSpreadsheet, 
  ShieldCheck,
  ChevronRight,
  User,
  LogOut,
  LogIn
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, currentUser, onOpenAuth, onLogout }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const handleSelectTab = (id) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Top Header Bar in Solid Blue Theme (No Neon Effect) */}
      <header className="no-print bg-blue-800 border-b border-blue-900 text-white sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          
          {/* Left: Brand Logo & Title */}
          <div className="flex items-center space-x-3">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 -ml-2 rounded-xl text-blue-100 hover:text-white hover:bg-blue-900 focus:outline-none transition-colors cursor-pointer"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <div 
              className="flex items-center space-x-2.5 cursor-pointer select-none" 
              onClick={() => setActiveTab('generate-qr')}
            >
              <div className="bg-white text-blue-800 p-2 rounded-xl shadow-xs">
                <Bus className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">Scanly</span>
            </div>
          </div>

          {/* Center / Right: Full Navigation Menu in Header for Web View */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
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

          {/* Desktop Right: Agent Account Status & Switcher */}
          <div className="hidden md:flex items-center space-x-2 pl-3 border-l border-blue-700/60">
            {currentUser ? (
              <div className="flex items-center space-x-2">
                <div 
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-900/70 rounded-xl text-xs font-semibold text-blue-100 border border-blue-700/50 shadow-2xs"
                  title={`Logged in as ${currentUser.email || currentUser.username}`}
                >
                  <User className="w-3.5 h-3.5 text-blue-300 flex-shrink-0" />
                  <span className="max-w-[150px] truncate font-medium">
                    {currentUser.email || currentUser.username}
                  </span>
                </div>
                <button
                  onClick={onLogout}
                  className="px-2.5 py-1.5 text-xs font-bold text-rose-200 hover:text-white bg-rose-900/40 hover:bg-rose-800/80 rounded-xl transition-colors cursor-pointer flex items-center space-x-1 border border-rose-800/50"
                  title="Sign out of this agent account"
                >
                  <LogOut className="w-3.5 h-3.5" />
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

          {/* Mobile Right Quick Indicator */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setActiveTab(activeTab === 'scan-verify' ? 'generate-qr' : 'scan-verify')}
              className="flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-blue-800 shadow-xs cursor-pointer"
            >
              {activeTab === 'scan-verify' ? (
                <>
                  <QrCode className="w-3.5 h-3.5 mr-1" />
                  <span>Create QR</span>
                </>
              ) : (
                <>
                  <ScanLine className="w-3.5 h-3.5 mr-1 text-emerald-700" />
                  <span>Scan QR</span>
                </>
              )}
            </button>
          </div>

        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden no-print">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          ></div>

          {/* Slide-out Drawer */}
          <div className="relative w-72 max-w-[80vw] bg-white text-slate-900 h-full shadow-2xl flex flex-col z-50 animate-slideRight">
            
            {/* Drawer Header in Solid Blue */}
            <div className="p-4 bg-blue-800 text-white flex items-center justify-between border-b border-blue-900">
              <div className="flex items-center space-x-2">
                <div className="bg-white text-blue-800 p-1.5 rounded-lg">
                  <Bus className="w-5 h-5" />
                </div>
                <div className="font-bold text-sm text-white">Scanly</div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg text-blue-100 hover:text-white hover:bg-blue-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu Items */}
            <div className="p-3 space-y-1 flex-1 overflow-y-auto">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 block my-1">
                Navigation
              </span>

              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full text-left p-3 rounded-xl flex items-center space-x-3 transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-blue-50 text-blue-800 border border-blue-200 font-bold'
                        : 'hover:bg-slate-50 text-slate-700 font-medium'
                    }`}
                  >
                    <div className={`p-2 rounded-lg flex-shrink-0 ${
                      isActive ? 'bg-blue-800 text-white' : 'bg-blue-50 text-blue-800'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs truncate">{item.label}</div>
                      <div className="text-[10px] text-slate-400 truncate">{item.desc}</div>
                    </div>
                    <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-blue-800' : 'text-slate-300'}`} />
                  </button>
                );
              })}
            </div>

            {/* Drawer Footer with Agent Account */}
            <div className="p-3 border-t border-slate-200 bg-slate-50 space-y-2">
              {currentUser ? (
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2 text-xs text-slate-700 font-semibold px-1">
                    <User className="w-4 h-4 text-blue-800 flex-shrink-0" />
                    <span className="truncate">{currentUser.email || currentUser.username}</span>
                  </div>
                  <button
                    onClick={() => { setMobileMenuOpen(false); onLogout(); }}
                    className="w-full py-2 px-3 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer flex items-center justify-center space-x-1.5 border border-rose-200"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out Agent</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setMobileMenuOpen(false); onOpenAuth(); }}
                  className="w-full py-2 px-3 text-xs font-bold text-white bg-blue-800 hover:bg-blue-900 rounded-xl transition-colors cursor-pointer flex items-center justify-center space-x-1.5 shadow-xs"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Agent Login / Sign Up</span>
                </button>
              )}
              <div className="pt-1 text-[10px] text-slate-400 flex items-center justify-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>Scanly Transit Verification</span>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}