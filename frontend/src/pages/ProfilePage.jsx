import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Bus, 
  LogOut, 
  ShieldCheck, 
  Camera, 
  ArrowLeft, 
  Plus, 
  CheckCircle2, 
  Edit3, 
  Check, 
  X,
  PackageCheck,
  QrCode,
  ScanLine,
  KeyRound,
  Eye,
  EyeOff,
  Lock,
  AlertTriangle
} from 'lucide-react';
import { api } from '../api';
import AvatarUploadModal from '../components/AvatarUploadModal';

export default function ProfilePage({ 
  currentUser, 
  setCurrentUser, 
  selectedTrip, 
  setSelectedTrip, 
  setActiveTab, 
  onLogout 
}) {
  const [batches, setBatches] = useState(['Trip 1']);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [newTripName, setNewTripName] = useState('');
  const [addingTrip, setAddingTrip] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);

  // Edit name state
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(currentUser?.full_name || '');
  const [savingName, setSavingName] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Edit Security PIN state
  const [editingPin, setEditingPin] = useState(false);
  const [pinInput, setPinInput] = useState(currentUser?.security_pin || '1234');
  const [showPin, setShowPin] = useState(false);
  const [savingPin, setSavingPin] = useState(false);
  const [pinSaveSuccess, setPinSaveSuccess] = useState(false);
  const [pinError, setPinError] = useState('');

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    setLoadingBatches(true);
    try {
      const data = await api.getBatches();
      if (data && data.length > 0) {
        setBatches(data);
      } else {
        setBatches(['Trip 1']);
      }
    } catch (e) {
      console.error('Failed to load trips:', e);
      setBatches(['Trip 1']);
    } finally {
      setLoadingBatches(false);
    }
  };

  const handleSelectTrip = (trip) => {
    if (setSelectedTrip) {
      setSelectedTrip(trip);
    }
  };

  const handleAddTrip = (e) => {
    e.preventDefault();
    const trimmed = newTripName.trim();
    if (!trimmed) return;
    if (!batches.includes(trimmed)) {
      const updated = [...batches, trimmed];
      setBatches(updated);
      if (setSelectedTrip) {
        setSelectedTrip(trimmed);
      }
    }
    setNewTripName('');
    setAddingTrip(false);
  };

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setSavingName(true);
    try {
      const updated = await api.updateProfile(trimmed);
      if (setCurrentUser && updated) {
        setCurrentUser({ ...currentUser, full_name: updated.full_name || trimmed });
      }
      setSaveSuccess(true);
      setEditingName(false);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to update name:', err);
    } finally {
      setSavingName(false);
    }
  };

  const handleSavePin = async () => {
    const trimmed = pinInput.trim();
    if (!trimmed || trimmed.length < 4) {
      setPinError('Security PIN must be at least 4 digits');
      return;
    }
    setSavingPin(true);
    setPinError('');
    try {
      const updated = await api.updateProfile({ security_pin: trimmed });
      if (setCurrentUser && updated) {
        setCurrentUser({ ...currentUser, security_pin: updated.security_pin || trimmed });
      }
      setPinSaveSuccess(true);
      setEditingPin(false);
      setTimeout(() => setPinSaveSuccess(false), 2500);
    } catch (err) {
      setPinError(err.message || 'Failed to update security PIN');
    } finally {
      setSavingPin(false);
    }
  };

  const formatAgentDisplayName = (user) => {
    if (!user) return 'Agent';
    if (user.full_name && !user.full_name.includes('@')) {
      return user.full_name;
    }
    const raw = user.full_name || user.email || user.username || '';
    const namePart = raw.includes('@') ? raw.split('@')[0] : raw;
    return namePart.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Agent';
  };

  const displayName = formatAgentDisplayName(currentUser);
  const userEmail = currentUser?.email || currentUser?.username || 'agent@scanly.com';

  return (
    <div className="space-y-4 animate-fadeIn max-w-2xl mx-auto pb-8">
      {/* Top Header / Back Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setActiveTab('generate-qr')}
          className="flex items-center space-x-1.5 text-xs font-bold text-blue-800 hover:text-blue-900 bg-white hover:bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200 shadow-2xs cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex items-center space-x-1 px-2.5 py-1 bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-[11px] font-bold">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-800" />
          <span>Verified Agent</span>
        </div>
      </div>

      {/* Main Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Banner in Solid Blue */}
        <div className="h-24 bg-blue-800 relative px-6">
          <div className="absolute -bottom-10 left-6 flex items-end space-x-4">
            <div className="relative">
              {currentUser?.avatar_url ? (
                <img 
                  src={currentUser.avatar_url} 
                  alt="Avatar" 
                  className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-md bg-white"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-blue-900 border-4 border-white shadow-md flex items-center justify-center text-2xl font-black text-white uppercase">
                  {(displayName || 'A').charAt(0)}
                </div>
              )}
              <button
                onClick={() => setAvatarModalOpen(true)}
                className="absolute -bottom-1 -right-1 p-1.5 bg-blue-800 hover:bg-blue-900 text-white rounded-xl shadow-md border-2 border-white cursor-pointer transition-colors"
                title="Upload avatar photo"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* User Info Details */}
        <div className="pt-12 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              {editingName ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Enter full name"
                    className="px-3 py-1 text-sm border border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900 font-bold"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={savingName}
                    className="p-1.5 bg-blue-800 hover:bg-blue-900 text-white rounded-lg cursor-pointer"
                    title="Save name"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { setEditingName(false); setNameInput(displayName); }}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg cursor-pointer"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">
                    {displayName}
                  </h1>
                  <button
                    onClick={() => { setEditingName(true); setNameInput(displayName); }}
                    className="p-1 text-slate-400 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                    title="Edit Name"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="flex items-center space-x-1.5 text-xs text-slate-600 mt-0.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-mono">{userEmail}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 bg-blue-50 text-blue-900 border border-blue-200 rounded-xl text-xs font-bold">
                Transit Agent #{currentUser?.id || 1}
              </span>
            </div>
          </div>

          {saveSuccess && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center space-x-1.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Name updated successfully!</span>
            </div>
          )}

          {/* Quick Account Information Grid */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Account Role</div>
              <div className="text-xs font-extrabold text-slate-800 mt-0.5">Luggage Transit Agent</div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Trip Batches</div>
              <div className="text-xs font-extrabold text-blue-900 mt-0.5">{batches.length} Trip{batches.length > 1 ? 's' : ''}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Transit Security PIN Management Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3.5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-slate-100 text-slate-800 rounded-xl border border-slate-300">
              <KeyRound className="w-4 h-4 text-blue-900" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 tracking-tight flex items-center space-x-1.5">
                <span>Transit Security PIN</span>
                <span className="text-[10px] bg-slate-800 text-white px-2 py-0.5 rounded font-bold uppercase">
                  ANTI-THEFT LOCK
                </span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Your master 4-digit PIN to unlock luggage scans on mobile and authorize handovers
              </p>
            </div>
          </div>

          {!editingPin && (
            <button
              onClick={() => {
                setEditingPin(true);
                setPinInput(currentUser?.security_pin || '1234');
                setPinError('');
              }}
              className="flex items-center space-x-1 text-xs font-bold text-white bg-blue-800 hover:bg-blue-900 px-3 py-1.5 rounded-xl border border-blue-900 cursor-pointer transition-colors shadow-2xs"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Change PIN</span>
            </button>
          )}
        </div>

        {pinSaveSuccess && (
          <div className="p-2.5 bg-slate-100 border border-slate-300 rounded-xl text-slate-900 text-xs font-semibold flex items-center space-x-1.5 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-blue-800 flex-shrink-0" />
            <span>Security PIN updated successfully!</span>
          </div>
        )}

        {pinError && (
          <div className="p-2.5 bg-slate-100 border border-slate-300 text-slate-900 text-xs rounded-xl flex items-center space-x-1.5 animate-fadeIn">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span className="font-semibold">{pinError}</span>
          </div>
        )}

        {editingPin ? (
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showPin ? 'text' : 'password'}
                  maxLength={10}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="Enter 4-digit PIN (e.g. 1234)"
                  className="w-full pl-3.5 pr-10 py-2.5 text-sm font-mono font-bold tracking-widest border-2 border-blue-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-900 text-slate-900 bg-white"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button
                onClick={handleSavePin}
                disabled={savingPin}
                className="px-4 py-2.5 bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{savingPin ? 'Saving...' : 'Save PIN'}</span>
              </button>

              <button
                onClick={() => {
                  setEditingPin(false);
                  setPinInput(currentUser?.security_pin || '1234');
                  setPinError('');
                }}
                className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Must be at least 4 digits. Used for operator override when scanning locked baggage QR tags.
            </p>
          </div>
        ) : (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Lock className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-semibold text-slate-600">Active Agent PIN:</span>
              <span className="font-mono font-black text-sm text-slate-900 tracking-wider">
                {showPin ? (currentUser?.security_pin || '1234') : '••••'}
              </span>
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer ml-1"
                title={showPin ? 'Hide PIN' : 'View PIN'}
              >
                {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            <span className="text-[11px] text-slate-800 bg-slate-100 border border-slate-300 font-bold px-2 py-0.5 rounded-lg">
              Active Protection
            </span>
          </div>
        )}
      </div>

      {/* Trips Section ("Trips He Have") */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-blue-100 text-blue-900 rounded-lg">
              <Bus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 tracking-tight">Assigned Trips & Batches</h2>
              <p className="text-[11px] text-slate-500">Trip batches belonging to your agent account</p>
            </div>
          </div>

          {!addingTrip && (
            <button
              onClick={() => setAddingTrip(true)}
              className="flex items-center space-x-1 px-2.5 py-1 text-xs font-bold bg-blue-50 text-blue-800 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer border border-blue-200"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Trip</span>
            </button>
          )}
        </div>

        {/* Add New Trip Form */}
        {addingTrip && (
          <form onSubmit={handleAddTrip} className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center space-x-2 animate-fadeIn">
            <input
              type="text"
              value={newTripName}
              onChange={(e) => setNewTripName(e.target.value)}
              placeholder="e.g. Trip 4, Express 101"
              className="flex-1 px-3 py-1.5 text-xs bg-white border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900 font-semibold"
              autoFocus
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-blue-800 hover:bg-blue-900 text-white text-xs font-bold rounded-lg cursor-pointer"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => { setAddingTrip(false); setNewTripName(''); }}
              className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
            >
              Cancel
            </button>
          </form>
        )}

        {/* Trips List */}
        {loadingBatches ? (
          <div className="py-4 text-center text-xs text-slate-400">Loading trips...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {batches.map((trip) => {
              const isActive = selectedTrip === trip;
              return (
                <div
                  key={trip}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                    isActive
                      ? 'bg-blue-50 border-2 border-blue-800 shadow-2xs'
                      : 'bg-slate-50 border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                      isActive ? 'bg-blue-800 text-white' : 'bg-white text-slate-700 border border-slate-200'
                    }`}>
                      <Bus className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-extrabold text-slate-900 truncate flex items-center space-x-1.5">
                        <span>{trip}</span>
                        {isActive && (
                          <span className="px-1.5 py-0.2 bg-blue-800 text-white text-[9px] font-bold rounded-md uppercase">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">Scanly Manifest Batch</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                    {!isActive ? (
                      <button
                        onClick={() => handleSelectTrip(trip)}
                        className="px-2.5 py-1 text-[11px] font-bold text-blue-800 bg-white hover:bg-blue-50 border border-blue-200 rounded-lg cursor-pointer transition-colors"
                      >
                        Set Active
                      </button>
                    ) : (
                      <button
                        onClick={() => setActiveTab('collection-status')}
                        className="px-2.5 py-1 text-[11px] font-bold text-white bg-blue-800 hover:bg-blue-900 rounded-lg cursor-pointer transition-colors flex items-center space-x-1"
                        title="View luggage for this trip"
                      >
                        <PackageCheck className="w-3 h-3" />
                        <span>View</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick Nav Shortcut to Actions */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('generate-qr')}
            className="flex-1 min-w-[120px] p-2 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-xl border border-slate-200 text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5 text-blue-800" />
            <span>Generate QR</span>
          </button>
          <button
            onClick={() => setActiveTab('scan-verify')}
            className="flex-1 min-w-[120px] p-2 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-xl border border-slate-200 text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
          >
            <ScanLine className="w-3.5 h-3.5 text-blue-800" />
            <span>Scan & Verify</span>
          </button>
          <button
            onClick={() => setActiveTab('collection-status')}
            className="flex-1 min-w-[120px] p-2 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-xl border border-slate-200 text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
          >
            <PackageCheck className="w-3.5 h-3.5 text-blue-800" />
            <span>Luggage Tracking</span>
          </button>
        </div>
      </div>

      {/* Logout Option Card in Solid Clean Slate */}
      <div className="bg-white rounded-2xl border border-slate-300 shadow-xs p-5 space-y-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-slate-100 text-slate-800 rounded-lg border border-slate-200">
            <LogOut className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 tracking-tight">Account Sign Out</h2>
            <p className="text-[11px] text-slate-500">Sign out of {displayName}'s agent session</p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-full py-2.5 px-4 bg-slate-900 hover:bg-black active:scale-[0.99] text-white font-bold text-xs rounded-xl border border-slate-900 transition-colors cursor-pointer flex items-center justify-center space-x-2 shadow-xs"
        >
          <LogOut className="w-4 h-4 text-white" />
          <span>Logout ({displayName})</span>
        </button>
      </div>

      {/* Avatar Upload Modal */}
      <AvatarUploadModal
        isOpen={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
        currentAvatar={currentUser?.avatar_url}
        onAvatarUpdated={(newUrl) => {
          if (currentUser) {
            currentUser.avatar_url = newUrl;
          }
          if (setCurrentUser) {
            setCurrentUser({ ...currentUser, avatar_url: newUrl });
          }
        }}
      />
    </div>
  );
}

