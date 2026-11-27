import React, { useState, useEffect } from 'react';
import { api } from '../api';
import ScanlyLogo from './ScanlyLogo';
import { Lock, Unlock, ShieldCheck, AlertTriangle, KeyRound, CheckCircle2, User, Phone, MapPin, Luggage, ArrowRight } from 'lucide-react';

export default function PublicVerifyModal({ tag, onSwitchToAgent }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    fetchInitialStatus();
  }, [tag]);

  const fetchInitialStatus = async () => {
    setLoading(true);
    setPinError('');
    try {
      const res = await api.publicVerify(tag, null);
      setData(res);
    } catch (err) {
      setPinError(err.message || 'Luggage tag not found');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPin = async (e) => {
    if (e) e.preventDefault();
    if (!enteredPin.trim()) {
      setPinError('Please enter your 4-digit PIN');
      return;
    }
    setVerifying(true);
    setPinError('');
    try {
      const res = await api.publicVerify(tag, enteredPin.trim());
      setData(res);
    } catch (err) {
      setPinError(err.message || 'Invalid Security PIN. Ownership verification failed.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden animate-fadeIn">
        
        {/* Top Header */}
        <div className="bg-blue-800 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="bg-white p-1 rounded-xl flex items-center justify-center">
              <ScanlyLogo className="w-6 h-6" />
            </div>
            <div>
              <div className="font-extrabold text-base tracking-tight">Scanly Transit Verification</div>
              <div className="text-[11px] text-blue-200">Smart Luggage Ownership Claim</div>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded bg-blue-900 border border-blue-700 text-[10px] font-bold uppercase">
            SECURE LINK
          </span>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">

          {/* Loading */}
          {loading && (
            <div className="text-center py-8 space-y-2 text-slate-500 text-xs">
              <div className="w-6 h-6 border-2 border-blue-800 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <div>Checking luggage security status...</div>
            </div>
          )}

          {/* Error Message */}
          {pinError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center space-x-2 animate-fadeIn">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span className="font-semibold">{pinError}</span>
            </div>
          )}

          {/* STATE 1: LOCKED (NEEDS PIN) */}
          {!loading && data && data.locked && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border-2 border-amber-600 rounded-2xl space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-amber-100 text-amber-900 rounded-xl border border-amber-300">
                    <Lock className="w-5 h-5 text-amber-800" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-amber-950 uppercase tracking-wide">
                      Luggage Tag Protected • Identity Verification Required
                    </h3>
                    <p className="text-[11px] text-amber-800">
                      Personal details are hidden. Enter your 4-digit PIN to claim.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-amber-200/80 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Passenger ID</span>
                    <span className="font-mono font-black text-blue-900 text-sm">{data.passenger_id}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Passenger</span>
                    <span className="font-bold text-slate-700">{data.masked_name}</span>
                  </div>
                </div>
              </div>

              {/* PIN Input Form */}
              <form onSubmit={handleVerifyPin} className="space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center space-x-1">
                      <KeyRound className="w-3.5 h-3.5 text-blue-800" />
                      <span>Enter Passenger PIN (Last 4 Digits of Mobile):</span>
                    </label>
                    {data.pin_hint && (
                      <button
                        type="button"
                        onClick={() => setEnteredPin(data.pin_hint)}
                        className="text-[10px] text-blue-800 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200 cursor-pointer"
                      >
                        Hint: {data.pin_hint}
                      </button>
                    )}
                  </div>
                  <input
                    type="password"
                    maxLength={10}
                    placeholder="Enter 4-digit PIN (e.g. 3210)"
                    value={enteredPin}
                    onChange={(e) => setEnteredPin(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-mono font-bold tracking-widest border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800 text-slate-900 bg-white"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={verifying}
                  className="w-full py-3 bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>{verifying ? 'Verifying PIN...' : 'Unlock & View Luggage Details'}</span>
                </button>
              </form>
            </div>
          )}

          {/* STATE 2: UNLOCKED & DETAILS PULLED */}
          {!loading && data && !data.locked && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-950 text-xs flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                  <span className="font-bold">Ownership Verified Successfully!</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-700 text-white font-mono text-[10px] font-black uppercase">
                  {data.status}
                </span>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Passenger Name</span>
                    <span className="text-sm font-black text-slate-900">{data.owner_name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Bags</span>
                    <span className="font-bold text-blue-900">{data.total_count} Registered</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Mobile Number</span>
                    <span className="font-mono font-bold text-slate-800">{data.mobile_number}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Destination</span>
                    <span className="font-bold text-blue-800">{data.destination_stop}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 text-slate-500 text-[11px]">
                  Boarding from: <strong>{data.boarding_stop}</strong> &bull; Passenger ID: <strong>{data.passenger_id}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Bottom link to Agent Portal */}
          <div className="pt-3 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={onSwitchToAgent}
              className="text-xs text-blue-800 hover:text-blue-900 font-bold hover:underline cursor-pointer"
            >
              Are you a Transit Conductor? Log In to Agent Scanner Portal &rarr;
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
