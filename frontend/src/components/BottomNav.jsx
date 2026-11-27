import React from 'react';
import { QrCode, ScanLine, PackageCheck, FileSpreadsheet } from 'lucide-react';

export default function BottomNav({ activeTab, setActiveTab }) {
  const tabs = [
    {
      id: 'generate-qr',
      label: 'QR Code',
      icon: QrCode
    },
    {
      id: 'scan-verify',
      label: 'Scan',
      icon: ScanLine,
      isSpecial: true
    },
    {
      id: 'collection-status',
      label: 'Tracking',
      icon: PackageCheck
    },
    {
      id: 'import-data',
      label: 'Import',
      icon: FileSpreadsheet
    }
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-2 py-1 shadow-lg no-print flex items-center justify-around">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        if (tab.isSpecial) {
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex flex-col items-center justify-center -mt-4 cursor-pointer"
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-transform active:scale-95 ${
                isActive ? 'bg-blue-900 border-2 border-white text-white' : 'bg-blue-800 text-white'
              }`}>
                <Icon className="w-6 h-6" />
              </div>
              <span className={`text-[10px] font-bold mt-0.5 ${isActive ? 'text-blue-900 font-black' : 'text-blue-800'}`}>
                {tab.label}
              </span>
            </button>
          );
        }

        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors cursor-pointer ${
              isActive ? 'text-blue-800 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Icon className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}