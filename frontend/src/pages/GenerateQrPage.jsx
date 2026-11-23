import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { 
  QrCode, 
  Printer, 
  Download, 
  CheckCircle2, 
  User, 
  Phone, 
  MapPin, 
  AlertCircle, 
  ChevronDown, 
  X,
  ScanLine,
  RefreshCw,
  FolderOpen,
  Trash2
} from 'lucide-react';

export default function GenerateQrPage({ selectedTrip = 'Trip 1', setSelectedTrip, onNavigateToScan }) {
  const [allPassengers, setAllPassengers] = useState([]);
  const [loadingPassengers, setLoadingPassengers] = useState(true);

  // Batches / Trips
  const [batches, setBatches] = useState(['Trip 1', 'Trip 2', 'Trip 3']);
  const currentBatch = selectedTrip || 'Trip 1';

  // Selected Passenger from list
  const [selectedPassengerId, setSelectedPassengerId] = useState('');
  const [selectedPassenger, setSelectedPassenger] = useState(null);

  // Details
  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [boardingStop, setBoardingStop] = useState('');
  const [destinationStop, setDestinationStop] = useState('');
  const [luggageCount, setLuggageCount] = useState(1);

  // Pop-up modal state for generated QR code (1 single QR code for the customer)
  const [showQrPopup, setShowQrPopup] = useState(false);
  const [popupPassenger, setPopupPassenger] = useState(null);

  // Operation states
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadBatches();
    loadPassengers(currentBatch);
  }, [currentBatch]);

  const loadBatches = async () => {
    try {
      const data = await api.getBatches();
      if (data && data.length > 0) {
        setBatches(data);
        if (!data.includes(currentBatch) && setSelectedTrip) {
          setSelectedTrip(data[0]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCurrentTrip = async () => {
    if (!window.confirm(`Are you sure you want to delete trip "${currentBatch}" and all its passengers?`)) {
      return;
    }
    try {
      setGenerating(true);
      await api.deleteBatch(currentBatch);
      const data = await api.getBatches();
      const nextBatch = (data && data[0]) || 'Trip 1';
      setBatches(data || ['Trip 1']);
      if (setSelectedTrip) setSelectedTrip(nextBatch);
      await loadPassengers(nextBatch);
    } catch (err) {
      setError(err.message || 'Failed to delete trip');
    } finally {
      setGenerating(false);
    }
  };

  const loadPassengers = async (batchFilter = currentBatch) => {
    try {
      setLoadingPassengers(true);
      const bParam = batchFilter === 'All Batches' ? '' : batchFilter;
      const data = await api.getPassengers('', '', bParam);
      // Sort strictly in Alphabetical Order (A-Z) by passenger name
      const sorted = (data || []).sort((a, b) => a.name.localeCompare(b.name));
      setAllPassengers(sorted);

      // Only passengers who have NOT yet had their QR code generated
      const available = sorted.filter(p => !p.luggage_items || p.luggage_items.length === 0);
      if (available.length > 0) {
        selectAndAutoFill(available[0]);
      } else {
        setSelectedPassengerId('');
        setSelectedPassenger(null);
        setName('');
        setMobileNumber('');
        setBoardingStop('');
        setDestinationStop('');
        setLuggageCount(1);
      }
    } catch (e) {
      console.error(e);
      setError("Failed to load passenger manifest.");
    } finally {
      setLoadingPassengers(false);
    }
  };

  const handleBatchChange = (e) => {
    const val = e.target.value;
    if (setSelectedTrip) setSelectedTrip(val);
    loadPassengers(val);
  };

  // Only show passengers who have NOT generated a QR code yet
  const availablePassengers = allPassengers.filter(
    p => !p.luggage_items || p.luggage_items.length === 0
  );

  // Auto-fill mobile number, place (destination & boarding), and default luggage count
  const selectAndAutoFill = (passenger) => {
    if (!passenger) return;
    setSelectedPassengerId(passenger.passenger_id);
    setSelectedPassenger(passenger);
    setName(passenger.name);
    setMobileNumber(passenger.mobile_number);
    setBoardingStop(passenger.boarding_stop);
    setDestinationStop(passenger.destination_stop);
    setLuggageCount(passenger.luggage_count || 1);
    setError('');
  };

  const handleDropdownChange = (e) => {
    const val = e.target.value;
    const found = availablePassengers.find(p => p.passenger_id === val);
    if (found) {
      selectAndAutoFill(found);
    }
  };

  // Handle "Create QR Code" -> Generates & Opens POP-UP
  const handleCreateQrCode = async (e) => {
    e.preventDefault();
    if (!selectedPassenger) {
      setError("Please select a passenger name first.");
      return;
    }

    const finalLuggageCount = Math.max(1, parseInt(luggageCount, 10) || 1);

    setGenerating(true);
    setError('');

    try {
      // Call backend to generate 1 unified QR code for this passenger with user input luggage count
      const res = await api.generateQrForPassenger(selectedPassenger.passenger_id, finalLuggageCount);
      
      const safeLuggageCount = Math.max(finalLuggageCount, res?.luggage_count || 1);
      const items = (res?.luggage_items && res.luggage_items.length >= safeLuggageCount)
        ? res.luggage_items
        : Array.from({ length: safeLuggageCount }).map((_, i) => ({
            id: i + 1,
            luggage_tag: `${selectedPassenger.passenger_id}-L${i + 1}`,
            qr_data_url: res?.luggage_items?.[0]?.qr_data_url || ''
          }));

      // Open the Pop-up modal with the customer's QR code & print options
      setPopupPassenger({
        ...selectedPassenger,
        ...res,
        luggage_count: safeLuggageCount,
        luggage_items: items,
        display_id: res?.display_id || selectedPassenger.display_id || selectedPassenger.passenger_id
      });
      setShowQrPopup(true);

      // Reload passengers so this user is REMOVED from the choosing dropdown!
      await loadPassengers(currentBatch);
    } catch (err) {
      setError(err.message || 'Failed to create QR code');
    } finally {
      setGenerating(false);
    }
  };

  // Print baggage tags
  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleDownloadQr = () => {
    const qrUrl = popupPassenger?.luggage_items?.[0]?.qr_data_url;
    if (!qrUrl) return;
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = `QR_${popupPassenger.passenger_id}_${popupPassenger.name.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const customerQrUrl = popupPassenger?.luggage_items?.[0]?.qr_data_url;

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-20">

      {error && (
        <div className="no-print p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* TRIP SELECTOR DROPDOWN (Direct dropdown selection) */}
      <div className="no-print bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
          <label htmlFor="trip-select-dropdown" className="flex items-center space-x-2">
            <FolderOpen className="w-4 h-4 text-blue-800" />
            <span>Select Trip:</span>
          </label>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {availablePassengers.length} Pending
            </span>
            <button
              onClick={() => { loadBatches(); loadPassengers(currentBatch); }}
              className="p-1.5 border border-slate-200 bg-white rounded-lg text-slate-500 hover:text-blue-800 hover:bg-blue-50 transition-colors cursor-pointer"
              title="Refresh passenger manifest"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            {batches.length > 1 && (
              <button
                type="button"
                onClick={handleDeleteCurrentTrip}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-800 flex items-center space-x-1 p-1 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                title={`Delete ${currentBatch}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Trip</span>
              </button>
            )}
          </div>
        </div>

        <div className="relative">
          <select
            id="trip-select-dropdown"
            value={currentBatch}
            onChange={(e) => {
              const newTrip = e.target.value;
              if (setSelectedTrip) setSelectedTrip(newTrip);
              loadPassengers(newTrip);
            }}
            className="w-full pl-3.5 pr-10 py-3 text-sm font-bold border-2 border-blue-800 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900 appearance-none shadow-2xs cursor-pointer"
          >
            {batches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-blue-800">
            <ChevronDown className="w-5 h-5 text-blue-800" />
          </div>
        </div>
      </div>

      {/* PASSENGER SELECTION & AUTO-FILLED DETAILS */}
      <div className="no-print bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        
        {availablePassengers.length === 0 && !loadingPassengers ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">All Passengers Have QR Codes Created</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Every passenger from the selected trip has already generated their luggage QR code. No pending passengers remaining.
            </p>
            {onNavigateToScan && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onNavigateToScan}
                  className="px-4 py-2.5 bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs hover:bg-emerald-800 inline-flex items-center space-x-1.5 cursor-pointer"
                >
                  <ScanLine className="w-4 h-4" />
                  <span>Go to Scanner &amp; Verify Handover</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleCreateQrCode} className="space-y-4">
            
            {/* 1. Name Selection Dropdown (Shows ONLY the Customer Name) */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <User className="w-4 h-4 text-blue-800" />
                  <span>Passenger Name</span>
                </span>
                <span className="text-[10px] text-blue-800 font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {availablePassengers.length} Pending
                </span>
              </label>

              <div className="relative">
                <select
                  value={selectedPassengerId}
                  onChange={handleDropdownChange}
                  required
                  className="w-full pl-3.5 pr-10 py-3 text-sm font-bold border-2 border-blue-800 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900 appearance-none shadow-2xs cursor-pointer"
                >
                  {availablePassengers.map((p) => (
                    <option key={p.passenger_id} value={p.passenger_id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                  <ChevronDown className="w-5 h-5 text-blue-800" />
                </div>
              </div>
            </div>

            {/* 2. Auto-filled Details Form */}
            <div className="space-y-3.5 pt-2 border-t border-slate-100 text-xs">
              
              {/* Customer Name & ID */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={name}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Passenger ID
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={selectedPassenger?.display_id || selectedPassenger?.passenger_id || ''}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-700 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Registered Mobile Number */}
              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Mobile Number
                </label>
                <div className="relative rounded-lg">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-800">
                    <Phone className="h-4 w-4" />
                  </div>
                  <input
                    type="tel"
                    readOnly
                    value={mobileNumber}
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-mono font-bold"
                  />
                </div>
              </div>

              {/* 2 Places (Boarding & Destination) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Boarding Place
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={boardingStop}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-800 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Destination Place
                  </label>
                  <div className="relative rounded-lg">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-800">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      readOnly
                      value={destinationStop}
                      className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-900 font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* USER INPUT: NUMBER OF LUGGAGE (Default 1, User Editable with Stepper) */}
              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Number of Luggage (Bags)
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setLuggageCount(Math.max(1, (parseInt(luggageCount, 10) || 1) - 1))}
                    className="w-10 h-10 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 font-bold text-lg text-slate-700 flex items-center justify-center cursor-pointer select-none transition-colors"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={luggageCount}
                    onChange={(e) => setLuggageCount(Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 1)))}
                    className="w-20 py-2 text-center font-bold text-lg text-blue-900 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800"
                  />
                  <button
                    type="button"
                    onClick={() => setLuggageCount(Math.min(10, (parseInt(luggageCount, 10) || 1) + 1))}
                    className="w-10 h-10 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 font-bold text-lg text-slate-700 flex items-center justify-center cursor-pointer select-none transition-colors"
                  >
                    +
                  </button>
                  <span className="text-xs text-slate-500 pl-2">
                    {luggageCount} bag(s) will be registered
                  </span>
                </div>
              </div>

              {/* CREATE QR CODE BUTTON */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={generating || !selectedPassenger}
                  className="w-full py-3.5 px-4 bg-blue-800 hover:bg-blue-900 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs text-sm flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  {generating ? (
                    <span>Creating QR Code...</span>
                  ) : (
                    <>
                      <QrCode className="w-5 h-5" />
                      <span>Create QR Code</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          </form>
        )}
      </div>

      {/* POP-UP MODAL: 1 SINGLE QR CODE FOR THE CUSTOMER */}
      {showQrPopup && popupPassenger && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn no-print">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    Luggage QR Code Generated
                  </h2>
                  <div className="text-xs text-blue-800 font-semibold">
                    1 QR Code for all {popupPassenger.luggage_count} Bag(s)
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowQrPopup(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Single Unified Customer QR Card */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-3">
              {customerQrUrl && (
                <div className="p-3 bg-white border border-slate-200 rounded-xl inline-block shadow-2xs">
                  <img
                    src={customerQrUrl}
                    alt={popupPassenger.name}
                    className="w-48 h-48 mx-auto object-contain"
                  />
                </div>
              )}

              <div className="space-y-1">
                <div className="text-base font-extrabold text-slate-900">{popupPassenger.name}</div>
                <div className="text-xs font-semibold text-blue-800 flex items-center justify-center space-x-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{popupPassenger.destination_stop}</span>
                </div>
                <div className="text-xs text-slate-600 font-mono">
                  {popupPassenger.mobile_number} &bull; ID: {popupPassenger.display_id || popupPassenger.passenger_id} {popupPassenger.batch_name ? `• ${popupPassenger.batch_name}` : ''}
                </div>
                <div>
                  <span className="inline-block mt-1 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-800 rounded-full font-bold text-xs">
                    {popupPassenger.luggage_count} Baggage Tag(s)
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="flex-1 py-3 px-4 bg-blue-800 hover:bg-blue-900 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-xs cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Baggage Tags ({popupPassenger.luggage_count})</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadQr}
                className="py-3 px-3 border border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-800 font-bold rounded-xl text-xs flex items-center justify-center space-x-1 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Save</span>
              </button>

              <button
                type="button"
                onClick={() => setShowQrPopup(false)}
                className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

      {/* PRINT MEDIA SECTION: HIGH-CONTRAST THERMAL / POS & STANDARD PRINTER TAGS */}
      <div id="printable-labels" className="hidden print:block w-full">
        {popupPassenger && Array.from({ length: popupPassenger.luggage_count }).map((_, index) => {
          const bagNum = index + 1;
          const tag = `${popupPassenger.passenger_id}-L${bagNum}`;

          return (
            <div 
              key={tag} 
              className="thermal-label-tag mx-auto mb-6 p-4 border-2 border-black rounded-lg bg-white text-black page-break-after-always"
              style={{ 
                width: '76mm', 
                maxWidth: '100%', 
                margin: '0 auto 18px auto', 
                boxSizing: 'border-box',
                pageBreakAfter: 'always',
                breakAfter: 'page',
                pageBreakInside: 'avoid',
                breakInside: 'avoid'
              }}
            >
              {/* Header */}
              <div className="border-b-2 border-black pb-2 text-center">
                <div className="text-xs uppercase font-black tracking-wider">SMART BUS EXPRESS</div>
                <div className="text-[10px] text-slate-800 font-bold">BAGGAGE CLAIM TAG</div>
                <div className="mt-1 text-sm font-black font-mono border-2 border-black inline-block px-3 py-0.5 rounded">
                  BAG {bagNum} OF {popupPassenger.luggage_count}
                </div>
              </div>

              {/* Destination Banner */}
              <div className="my-2 bg-black text-white p-2 text-center rounded">
                <div className="text-[9px] uppercase tracking-widest text-slate-200">DESTINATION PLACE</div>
                <div className="text-base font-extrabold uppercase tracking-tight">
                  {popupPassenger.destination_stop}
                </div>
              </div>

              {/* Center: Claim QR Code */}
              <div className="my-2 text-center">
                {customerQrUrl && (
                  <img
                    src={customerQrUrl}
                    alt={tag}
                    style={{ width: '135px', height: '135px', margin: '0 auto', display: 'block' }}
                  />
                )}
                <span className="text-[9px] font-mono font-bold text-slate-900 block mt-1">CLAIM QR CODE</span>
              </div>

              {/* Passenger Info */}
              <div className="text-xs space-y-1 border-t-2 border-dashed border-black pt-2 my-2">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-600 block">PASSENGER NAME</span>
                  <span className="font-bold text-sm block">{popupPassenger.name}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-600 block">PASSENGER ID</span>
                  <span className="font-mono font-bold block">{popupPassenger.display_id || popupPassenger.passenger_id}</span>
                </div>
                {popupPassenger.batch_name && (
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-600 block">TRIP / BATCH</span>
                    <span className="font-bold block">{popupPassenger.batch_name}</span>
                  </div>
                )}
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-600 block">MOBILE NUMBER</span>
                  <span className="font-mono text-xs block">{popupPassenger.mobile_number}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-600 block">BOARDING FROM</span>
                  <span className="font-medium text-[11px] block">{popupPassenger.boarding_stop}</span>
                </div>
              </div>

              {/* Tag Footer */}
              <div className="border-t-2 border-black pt-1.5 text-center">
                <div className="text-[10px] font-mono font-black text-black">
                  TAG: {tag} &bull; TOTAL BAGS: {popupPassenger.luggage_count}
                </div>
                <div className="text-[8px] text-slate-700 mt-0.5">
                  Present this tag to station operator at luggage collection point.
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}