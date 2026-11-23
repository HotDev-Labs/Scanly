import React, { useState } from 'react';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import GenerateQrPage from './pages/GenerateQrPage';
import ScanQrPage from './pages/ScanQrPage';
import CollectionStatusPage from './pages/CollectionStatusPage';
import ImportPage from './pages/ImportPage';

export default function App() {
  const [activeTab, setActiveTab] = useState('generate-qr');
  const [selectedTrip, setSelectedTrip] = useState(() => {
    return localStorage.getItem('slvs_selected_trip') || 'Trip 1';
  });

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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-900 pb-16 sm:pb-0">
      {/* Top Header */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-5">
        {activeTab === 'generate-qr' && (
          <GenerateQrPage 
            selectedTrip={selectedTrip} 
            setSelectedTrip={handleTripChange} 
            onNavigateToScan={handleNavigateToScan} 
          />
        )}

        {activeTab === 'scan-verify' && (
          <ScanQrPage 
            selectedTrip={selectedTrip}
          />
        )}

        {activeTab === 'collection-status' && (
          <CollectionStatusPage 
            selectedTrip={selectedTrip} 
            setSelectedTrip={handleTripChange} 
            setActiveTab={setActiveTab} 
          />
        )}

        {activeTab === 'import-data' && (
          <ImportPage 
            selectedTrip={selectedTrip} 
            setSelectedTrip={handleTripChange} 
            setActiveTab={setActiveTab} 
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
