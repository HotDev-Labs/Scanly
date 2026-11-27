import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  ScanLine, 
  Camera, 
  CameraOff, 
  CheckCircle2, 
  AlertTriangle, 
  User, 
  Phone, 
  MapPin, 
  Luggage, 
  RotateCcw, 
  Check, 
  ArrowRight,
  Volume2,
  Lock,
  Unlock,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Sparkles,
  Download,
  UploadCloud,
  Eye,
  EyeOff
} from 'lucide-react';

export default function ScanQrPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [markingHandover, setMarkingHandover] = useState(false);

  // Security Lock Feature (Default is ON for high anti-theft privacy protection)
  const [securityLockEnabled, setSecurityLockEnabled] = useState(true);
  const [currentScannedCode, setCurrentScannedCode] = useState('');
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Scanned Customer & Luggage details
  const [scannedData, setScannedData] = useState(null);
  const [lastMessage, setLastMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Consecutive scan cooldown timer
  const [scanCooldown, setScanCooldown] = useState(false);

  const scannerRef = useRef(null);
  const cooldownRef = useRef(false);
  const qrRegionId = "direct-qr-scanner-region";

  useEffect(() => {
    startCamera();

    return () => {
      stopCamera();
    };
  }, []);

  // Start Camera
  const startCamera = async () => {
    setCameraError('');
    setIsScanning(true);

    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode(qrRegionId);
        scannerRef.current = html5QrCode;

        const qrboxFunction = (viewfinderWidth, viewfinderHeight) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const size = Math.max(180, Math.floor(minEdge * 0.8));
          return { width: size, height: size };
        };

        const config = {
          fps: 15,
          qrbox: qrboxFunction,
          aspectRatio: 1.0
        };

        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            // Prevent duplicate triggers during 1.2s cooldown
            if (cooldownRef.current) return;
            handleProcessScannedCode(decodedText);
          },
          () => {}
        );
      } catch (err) {
        console.error("Unable to start camera:", err);
        setCameraError(err.message || 'Camera access not granted. You can use manual tag ID entry below.');
        setIsScanning(false);
      }
    }, 200);
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {
        // already stopped
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const speakPrompt = (text) => {
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      // Speech is progressive enhancement
    }
  };

  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch (e) {
      // Audio optional
    }
  };

  const playLockedTone = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.setValueAtTime(350, audioCtx.currentTime);
      osc.frequency.setValueAtTime(440, audioCtx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch (e) {}
  };

  // Process scanned QR code or tag ID:
  // - If securityLockEnabled = true and no PIN supplied, locks view and asks for passenger PIN.
  // - If PIN supplied, validates PIN and pulls full customer details.
  // - forceAutoCollect lets operator "Push Handover" for the next bag.
  const handleProcessScannedCode = async (tokenOrCode, pinToVerify = null, forceAutoCollect = null) => {
    const clean = (tokenOrCode || currentScannedCode).trim();
    if (!clean) return;

    setCurrentScannedCode(clean);

    // Set 1.2s cooldown to give operator time
    cooldownRef.current = true;
    setScanCooldown(true);
    setTimeout(() => {
      cooldownRef.current = false;
      setScanCooldown(false);
    }, 1200);

    setLoadingDetails(true);
    setErrorMessage('');
    setPinError('');

    try {
      if (window.navigator?.vibrate) {
        window.navigator.vibrate(80);
      }

      // If security lock is enabled:
      // Without PIN -> do NOT auto-collect, require PIN to lock details
      // With PIN -> forceAutoCollect dictates whether to auto_collect or just pull details
      const shouldAutoCollect = forceAutoCollect !== null 
        ? forceAutoCollect 
        : (!securityLockEnabled);

      const shouldRequirePin = securityLockEnabled;

      const result = await api.scanLuggage(clean, shouldAutoCollect, pinToVerify, shouldRequirePin);
      setScannedData(result);
      setLastMessage(result.message);

      if (result.locked) {
        playLockedTone();
        speakPrompt(`Security lock active. Please enter Passenger PIN to pull customer details.`);
      } else {
        playChime();
        if (result.just_collected) {
          if (result.all_collected) {
            speakPrompt(`All ${result.total_count} bags verified and handed over for ${result.owner_name}`);
          } else {
            const nextNum = result.collected_count + 1;
            speakPrompt(`Bag ${result.collected_count} verified. Please scan Bag ${nextNum} of ${result.total_count}`);
          }
        } else {
          speakPrompt(`Customer details verified and pulled for ${result.owner_name}`);
        }
      }
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('pin')) {
        setPinError(err.message);
      } else {
        setErrorMessage(err.message || `No customer found for scanned QR code.`);
      }
    } finally {
      setLoadingDetails(false);
    }
  };

  // Action: Pull Details by submitting PIN
  const handlePullDetailsWithPin = (e) => {
    if (e) e.preventDefault();
    if (!enteredPin.trim()) {
      setPinError('Please enter the 4-digit passenger PIN (or 1234)');
      return;
    }
    // Pull details without auto-collecting yet so agent can review before push
    handleProcessScannedCode(currentScannedCode, enteredPin.trim(), false);
  };

  // Action: Pull & Push Handover in one step with PIN
  const handlePullAndPushHandover = () => {
    const pin = enteredPin.trim() || scannedData?.pin_hint || '1234';
    handleProcessScannedCode(currentScannedCode, pin, true);
  };

  // Action: Push Handover for current unlocked bag
  const handlePushHandoverCurrentBag = () => {
    if (!scannedData || scannedData.all_collected) return;
    const pin = enteredPin.trim() || scannedData?.pin_hint || '1234';
    handleProcessScannedCode(scannedData.passenger_id, pin, true);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    handleProcessScannedCode(manualInput.trim());
    setManualInput('');
  };

  // Mark all remaining bags for this customer
  const handleMarkAllHandedOver = async () => {
    if (!scannedData) return;
    setMarkingHandover(true);
    setErrorMessage('');

    try {
      const res = await api.handoverAllForPassenger(scannedData.passenger_id);
      setScannedData((prev) => ({
        ...prev,
        status: 'COLLECTED',
        collected_count: prev.total_count,
        all_collected: true,
        all_luggage_items: prev.all_luggage_items.map(b => ({ ...b, status: 'COLLECTED' }))
      }));
      setLastMessage(res.message || `All luggage bags handed over to ${scannedData.owner_name}!`);
      playChime();
      speakPrompt(`All ${scannedData.total_count} bags marked handed over for ${scannedData.owner_name}`);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to mark all as handed over');
    } finally {
      setMarkingHandover(false);
    }
  };

  const handleReset = () => {
    setScannedData(null);
    setCurrentScannedCode('');
    setEnteredPin('');
    setPinError('');
    setLastMessage('');
    setErrorMessage('');
    if (!isScanning) {
      startCamera();
    }
  };

  const progressPercent = scannedData
    ? Math.round((scannedData.collected_count / Math.max(1, scannedData.total_count)) * 100)
    : 0;

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-20">

      {/* SECURITY LOCK MODE CONTROLLER BAR */}
      <div className="p-3 bg-white border border-slate-300 rounded-2xl shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl flex items-center justify-center bg-slate-100 text-slate-800 border border-slate-300">
            {securityLockEnabled ? <Lock className="w-4 h-4 text-blue-900" /> : <Unlock className="w-4 h-4 text-slate-600" />}
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-black text-slate-900">Anti-Theft Security Lock</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                securityLockEnabled ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {securityLockEnabled ? 'PROTECTED (PIN REQUIRED)' : 'EXPRESS MODE'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              {securityLockEnabled 
                ? 'Protects passenger privacy; requires 4-digit PIN on mobile to pull customer details.'
                : 'Auto-collects immediately upon scan without asking for security PIN.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            const nextVal = !securityLockEnabled;
            setSecurityLockEnabled(nextVal);
            if (scannedData) handleReset();
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
            securityLockEnabled
              ? 'bg-slate-900 hover:bg-black text-white border-slate-900 shadow-2xs'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
          }`}
        >
          {securityLockEnabled ? 'Security: ON' : 'Security: OFF'}
        </button>
      </div>

      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center space-x-2 animate-fadeIn">
          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* CONTINUOUS CAMERA SCANNER (Always active at the top) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-700"></span>
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Live Camera Scanner
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            {scannedData && (
              <button
                onClick={handleReset}
                className="flex items-center px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 shadow-2xs cursor-pointer"
                title="Reset scanned customer"
              >
                <RotateCcw className="w-3 h-3 mr-1 text-slate-500" />
                <span>Reset</span>
              </button>
            )}
            {isScanning ? (
            <button
              onClick={stopCamera}
              className="flex items-center px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 cursor-pointer"
            >
              <CameraOff className="w-3.5 h-3.5 mr-1" />
              <span>Pause</span>
            </button>
          ) : (
            <button
              onClick={startCamera}
              className="flex items-center px-3 py-1.5 text-xs font-bold text-white bg-blue-800 rounded-xl hover:bg-blue-900 shadow-xs cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 mr-1" />
              <span>Start Camera</span>
            </button>
          )}
          </div>
        </div>

        {cameraError && (
          <div className="p-3 bg-slate-100 border border-slate-300 text-slate-800 text-xs rounded-xl font-medium">
            {cameraError}
          </div>
        )}

        {/* Live scanner prompt for upcoming bags (Asks for Bag 2, then Bag 3) */}
        {scannedData && !scannedData.locked && !scannedData.all_collected && (
          <div className="p-3.5 bg-white border-2 border-blue-800 rounded-xl text-center text-xs text-slate-900 font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 shadow-xs">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-800"></span>
              <span className="uppercase tracking-wide font-black text-blue-900">NEXT STEP:</span>
            </div>
            <span>
              Please scan <strong>Bag {scannedData.collected_count + 1} of {scannedData.total_count}</strong> for {scannedData.owner_name}
            </span>
          </div>
        )}

        {/* Viewfinder in Solid Blue Frame */}
        <div 
          id={qrRegionId} 
          className={`w-full overflow-hidden rounded-2xl border-2 border-blue-800 bg-slate-900 ${
            isScanning ? 'min-h-[260px]' : 'hidden'
          }`}
        ></div>

        {!isScanning && (
          <div className="p-8 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-center text-slate-500 space-y-2">
            <Camera className="w-10 h-10 text-slate-400 mx-auto" />
            <div className="text-xs font-bold text-slate-800">Camera is paused</div>
            <p className="text-[11px] text-slate-500">Tap "Start Camera" above or enter code below.</p>
          </div>
        )}

        {/* Manual lookup input */}
        <form onSubmit={handleManualSubmit} className="pt-1 flex gap-2">
          <input
            type="text"
            placeholder="Or enter passenger ID or luggage tag (e.g. P101)"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800 text-slate-900 font-mono"
          />
          <button
            type="submit"
            disabled={loadingDetails}
            className="px-4 py-2 bg-blue-800 hover:bg-blue-900 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {loadingDetails ? 'Verifying...' : 'Verify'}
          </button>
        </form>

      </div>

      {/* 🔒 STATE A: LUGGAGE IS LOCKED (PIN REQUIRED TO PULL DETAILS) */}
      {scannedData && scannedData.locked && (
        <div className="bg-white p-5 rounded-2xl border-2 border-slate-800 shadow-xs space-y-4 animate-fadeIn">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center space-x-2">
              <span className="p-2 bg-slate-100 text-slate-800 rounded-xl border border-slate-300">
                <Lock className="w-5 h-5 text-blue-900" />
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                  Luggage Tag Locked • Identity Verification Required
                </h3>
                <p className="text-[11px] text-slate-500">
                  Tag identified. Customer details are masked to protect passenger privacy.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-slate-900 text-white text-[10px] font-black rounded-lg uppercase">
              STATUS: LOCKED
            </span>
          </div>

          {/* Masked Preview of Customer (Only ID and Masked Name shown) */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Passenger ID</span>
              <span className="font-mono font-black text-blue-900 text-sm">
                {scannedData.display_id || scannedData.passenger_id}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Customer Name</span>
              <span className="font-bold text-slate-700">
                {scannedData.owner_name}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Registered Bags</span>
              <span className="font-bold text-slate-900">
                {scannedData.total_count} Bag{scannedData.total_count > 1 ? 's' : ''}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Trip Batch</span>
              <span className="font-semibold text-slate-600">
                {scannedData.batch_name || 'Trip 1'}
              </span>
            </div>
          </div>

          {/* PIN Input & Pull Form */}
          <form onSubmit={handlePullDetailsWithPin} className="space-y-3 pt-1">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center space-x-1">
                  <KeyRound className="w-3.5 h-3.5 text-blue-800" />
                  <span>Enter Passenger PIN (Last 4 Digits of Mobile Number):</span>
                </label>
                {scannedData.pin_hint && (
                  <button
                    type="button"
                    onClick={() => setEnteredPin(scannedData.pin_hint)}
                    className="text-[10px] text-blue-800 hover:text-blue-900 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200 cursor-pointer"
                  >
                    Demo PIN Hint: {scannedData.pin_hint} (Auto-Fill)
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="password"
                  maxLength={10}
                  placeholder="Enter 4-digit PIN (e.g. 3210 or 1234)"
                  value={enteredPin}
                  onChange={(e) => setEnteredPin(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 text-sm font-mono font-bold tracking-widest border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800 text-slate-900 bg-white"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={loadingDetails}
                  className="px-5 py-2.5 bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>{loadingDetails ? 'Unlocking...' : 'Pull Details'}</span>
                </button>
              </div>
            </div>

            {pinError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center space-x-1.5 animate-fadeIn">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                <span className="font-semibold">{pinError}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handlePullAndPushHandover}
                disabled={loadingDetails}
                className="flex-1 py-2.5 px-4 bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Quick Pull Details &amp; Push Handover &rarr;</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl cursor-pointer"
              >
                Cancel / Scan Other Bag
              </button>
            </div>
          </form>

        </div>
      )}

      {/* 🚀 STATE B: UNLOCKED & DETAILS PULLED (READY TO PUSH HANDOVER) */}
      {scannedData && !scannedData.locked && (
        <div className="space-y-3 animate-fadeIn">
          
          {/* Security Verified Banner */}
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs flex items-center justify-between shadow-xs">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span className="font-bold">Passenger Identity Verified • Full Customer Details Pulled</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-blue-800 text-white font-mono text-[10px] font-black">
              VERIFIED
            </span>
          </div>

          {/* Multi-Bag Step-by-Step Prompt Banner (Asks for Bag 2, then Bag 3) */}
          {scannedData.total_count > 1 && !scannedData.all_collected ? (
            <div className="p-4 bg-white border-2 border-blue-800 rounded-2xl text-slate-900 space-y-2 shadow-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-1 rounded-lg bg-blue-800 text-white font-mono font-black text-xs">
                    STEP {scannedData.collected_count + 1} OF {scannedData.total_count}
                  </span>
                  <span className="font-black text-sm sm:text-base">
                    👉 Ready to Push Handover for Bag {scannedData.collected_count + 1}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handlePushHandoverCurrentBag}
                  className="px-4 py-2 bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center space-x-1"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Push Handover (Bag {scannedData.collected_count + 1}) &rarr;</span>
                </button>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                Customer identity confirmed. Click <strong>"Push Handover"</strong> to confirm handover of Bag {scannedData.collected_count + 1} of {scannedData.total_count}.
              </p>
            </div>
          ) : scannedData.all_collected && (
            <div className="p-4 bg-white border-2 border-slate-900 text-slate-900 rounded-2xl shadow-xs space-y-1 text-center">
              <div className="text-base sm:text-lg font-black flex items-center justify-center space-x-2">
                <CheckCircle2 className="w-6 h-6 text-blue-800" />
                <span>ALL {scannedData.total_count} OF {scannedData.total_count} BAGS VERIFIED &amp; HANDED OVER!</span>
              </div>
              <p className="text-xs text-slate-600 font-semibold">
                Every luggage tag for <strong>{scannedData.owner_name}</strong> has been successfully verified.
              </p>
            </div>
          )}

          {/* Full Customer Details Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            
            {/* Owner Info */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Customer</span>
                <h2 className="text-lg font-black text-slate-900">{scannedData.owner_name}</h2>
                <div className="text-xs text-blue-800 font-mono font-bold mt-0.5">
                  ID: {scannedData.display_id || scannedData.passenger_id} {scannedData.batch_name ? `• ${scannedData.batch_name}` : ''}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Baggage</span>
                <span className="inline-block text-sm font-black px-3 py-1 rounded-xl bg-blue-100 text-blue-900 border border-blue-300">
                  {scannedData.total_count} Bag{scannedData.total_count > 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Quick Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Mobile Number</span>
                <span className="text-sm font-bold text-slate-900 font-mono flex items-center space-x-1 mt-0.5">
                  <Phone className="w-3.5 h-3.5 text-blue-800 flex-shrink-0" />
                  <span>{scannedData.mobile_number}</span>
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Destination Place</span>
                <span className="text-sm font-bold text-blue-800 flex items-center space-x-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-800 flex-shrink-0" />
                  <span>{scannedData.destination_stop}</span>
                </span>
              </div>
            </div>

            {/* Progress Bar for Multi-Bag Verification */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
                <span>Handover Progress</span>
                <span className="text-blue-800 font-mono">{progressPercent}%</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div 
                  className={`h-full transition-all duration-300 rounded-full ${
                    scannedData.all_collected ? 'bg-emerald-600' : 'bg-blue-800'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>

            {/* Step-by-Step Bag Status Cards */}
            <div className="pt-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Baggage Scan Steps ({scannedData.collected_count} of {scannedData.total_count} Verified):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {Array.from({ length: scannedData.total_count }).map((_, i) => {
                  const bagNum = i + 1;
                  const isVerified = i < scannedData.collected_count;
                  const isCurrentTarget = i === scannedData.collected_count;

                  return (
                    <div
                      key={bagNum}
                      className={`p-3 rounded-xl border text-xs flex flex-col justify-between transition-all ${
                        isVerified
                          ? 'bg-white border-2 border-slate-800 text-slate-900 font-bold'
                          : isCurrentTarget
                            ? 'bg-slate-50 border-2 border-blue-800 text-slate-900 font-black shadow-xs'
                            : 'bg-slate-50 border border-slate-200 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold">
                          Bag {bagNum} of {scannedData.total_count}
                        </span>
                        {isVerified ? (
                          <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : isCurrentTarget ? (
                          <span className="px-1.5 py-0.5 rounded bg-blue-800 text-white font-mono text-[10px]">
                            SCAN NOW
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Step {bagNum}</span>
                        )}
                      </div>

                      <div className="text-[11px] font-semibold">
                        {isVerified ? (
                          <span className="text-slate-900 font-bold">Verified &amp; Handed Over</span>
                        ) : isCurrentTarget ? (
                          <span className="text-blue-900 font-bold">👉 Present Tag {bagNum}</span>
                        ) : (
                          <span className="text-slate-400">Waiting for Step {bagNum - 1}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons to Push Handover */}
            {!scannedData.all_collected && (
              <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handlePushHandoverCurrentBag}
                  className="flex-1 py-3 px-4 bg-blue-800 hover:bg-blue-900 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-xs cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Push / Confirm Handover (Bag {scannedData.collected_count + 1} of {scannedData.total_count})</span>
                </button>

                <button
                  type="button"
                  onClick={handleMarkAllHandedOver}
                  disabled={markingHandover}
                  className="py-3 px-4 border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center space-x-2 cursor-pointer shadow-2xs"
                >
                  <CheckCircle2 className="w-4 h-4 text-blue-800" />
                  <span>Mark All Remaining ({scannedData.total_count - scannedData.collected_count}) Handed Over</span>
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
