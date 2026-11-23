import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import AuthModal from './components/AuthModal';
import GenerateQrPage from './pages/GenerateQrPage';
import ScanQrPage from './pages/ScanQrPage';
import CollectionStatusPage from './pages/CollectionStatusPage';
import ImportPage from './pages/ImportPage';
import { api, getAuthToken, removeAuthToken } from './api';
import { RefreshCw } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('generate-qr');
  const [selectedTrip, setSelectedTrip] = useState(() => {
    return localStorage.getItem('slvs_selected_trip') || 'Trip 1';
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    checkCurrentUser();
  }, []);

  const checkCurrentUser = async () => {
    const token = getAuthToken();
    if (!token) {
      setCurrentUser(null);
      setAuthChecking(false);
      return;
    }
    try {
      const user = await api.getMe();
      if (user && user.id) {
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
      }
    } catch (e) {
      removeAuthToken();
      setCurrentUser(null);
    } finally {
      setAuthChecking(false);
    }
  };

  const handleAuthSuccess = (user, token) => {
    setCurrentUser(user);
    setAuthModalOpen(false);
    setSelectedTrip('Trip 1');
    try {
      localStorage.setItem('slvs_selected_trip', 'Trip 1');
    } catch (e) {}
  };

  const handleLogout = () => {
    removeAuthToken();
    setCurrentUser(null);
    setSelectedTrip('Trip 1');
    try {
      localStorage.removeItem('slvs_selected_trip');
    } catch (e) {}
  };

  const handleTripChange = (newTrip) => {
    setSelectedTrip(newTrip);
    try {
      localStorage.setItem('slvs_selected_trip', newTrip);
    } catch (e) {}
  };

  const handleNavigateToScan = (passenger) => {
    setActiveTab('scan-verify');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <RefreshCw className="w-8 h-8 text-blue-800 animate-spin mb-3" />
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Loading Scanly...
        </span>
      </div>
    );
  }

  // If agent is not signed in, show the clean Agent Authentication modal
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
        <AuthModal 
          isOpen={true} 
          onAuthSuccess={handleAuthSuccess} 
          onClose={null}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-900 pb-16 sm:pb-0">
      {/* Top Header */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        currentUser={currentUser}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-5">
        {activeTab === 'generate-qr' && (
          <GenerateQrPage 
            key={currentUser ? currentUser.id : 'anon'}
            selectedTrip={selectedTrip} 
            setSelectedTrip={handleTripChange} 
            onNavigateToScan={handleNavigateToScan} 
          />
        )}

        {activeTab === 'scan-verify' && (
          <ScanQrPage 
            key={currentUser ? currentUser.id : 'anon'}
            selectedTrip={selectedTrip}
          />
        )}

        {activeTab === 'collection-status' && (
          <CollectionStatusPage 
            key={currentUser ? currentUser.id : 'anon'}
            selectedTrip={selectedTrip} 
            setSelectedTrip={handleTripChange} 
            setActiveTab={setActiveTab} 
          />
        )}

        {activeTab === 'import-data' && (
          <ImportPage 
            key={currentUser ? currentUser.id : 'anon'}
            selectedTrip={selectedTrip} 
            setSelectedTrip={handleTripChange} 
            setActiveTab={setActiveTab} 
          />
        )}
      </main>

      {/* Switch Agent Modal if opened from Navbar */}
      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
        onAuthSuccess={handleAuthSuccess} 
      />

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
