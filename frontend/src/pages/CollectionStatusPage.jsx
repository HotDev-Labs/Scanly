import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import { 
  PackageCheck, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  MapPin, 
  ScanLine, 
  X, 
  Edit3, 
  Trash2, 
  Plus, 
  Minus, 
  Save, 
  FolderOpen, 
  User, 
  Phone,
  Luggage,
  Check
} from 'lucide-react';

export default function CollectionStatusPage({ selectedTrip = 'Trip 1', setSelectedTrip, setActiveTab }) {
  const [luggageList, setLuggageList] = useState([]);
  const [passengers, setPassengers] = useState([]);
  const [batches, setBatches] = useState(['Trip 1', 'Trip 2', 'Trip 3']);
  const currentBatch = selectedTrip || 'Trip 1';
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // QR Preview Modal state
  const [selectedQrPreview, setSelectedQrPreview] = useState(null);

  // Edit Passenger / Luggage Modal state
  const [editingPassenger, setEditingPassenger] = useState(null);
  const [editName, setEditName] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editBoarding, setEditBoarding] = useState('');
  const [editDestination, setEditDestination] = useState('');
  const [editLuggageCount, setEditLuggageCount] = useState(1);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    loadBatches();
    loadData(currentBatch);
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

  const loadData = async (targetTrip = currentBatch) => {
    try {
      setLoading(true);
      const [lData, pData] = await Promise.all([
        api.getLuggage('', '', targetTrip),
        api.getPassengers('', '', targetTrip)
      ]);
      setLuggageList(lData || []);
      setPassengers(pData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const passengerMap = useMemo(() => {
    return passengers.reduce((acc, p) => {
      acc[p.passenger_id] = p;
      return acc;
    }, {});
  }, [passengers]);

  // Group luggage items by passenger
  // User Requirement: If a person has 3 bags, show them SINGLE TIME with "3 Bags"
  const groupedPassengers = useMemo(() => {
    const map = new Map();

    // Group luggage items by passenger_id
    luggageList.forEach((item) => {
      const pid = item.passenger_id;
      let g = map.get(pid);
      if (!g) {
        const owner = passengerMap[pid];
        g = {
          passenger_id: pid,
          display_id: owner?.display_id || pid.split('-').slice(1).join('-') || pid,
          name: owner?.name || 'Customer',
          mobile_number: owner?.mobile_number || '',
          boarding_stop: owner?.boarding_stop || '',
          destination_stop: owner?.destination_stop || '',
          batch_name: owner?.batch_name || currentBatch,
          total_bags: owner?.luggage_count || 1,
          luggage_items: [],
          qr_data_url: item.qr_data_url || '',
          collected_count: 0,
          in_transit_count: 0,
          passenger_record: owner || { passenger_id: pid, name: 'Customer', luggage_count: 1 }
        };
        map.set(pid, g);
      }
      g.luggage_items.push(item);
      if (item.qr_data_url && !g.qr_data_url) {
        g.qr_data_url = item.qr_data_url;
      }
      if (item.status === 'COLLECTED') {
        g.collected_count += 1;
      } else if (item.status === 'IN_TRANSIT') {
        g.in_transit_count += 1;
      }
    });

    // Also include any passengers who have luggage_items attached directly to passenger object
    passengers.forEach((p) => {
      if (!map.has(p.passenger_id) && p.luggage_items && p.luggage_items.length > 0) {
        const collected = p.luggage_items.filter(l => l.status === 'COLLECTED').length;
        const inTransit = p.luggage_items.filter(l => l.status === 'IN_TRANSIT').length;
        map.set(p.passenger_id, {
          passenger_id: p.passenger_id,
          display_id: p.display_id || p.passenger_id,
          name: p.name,
          mobile_number: p.mobile_number,
          boarding_stop: p.boarding_stop,
          destination_stop: p.destination_stop,
          batch_name: p.batch_name || currentBatch,
          total_bags: p.luggage_count || p.luggage_items.length,
          luggage_items: p.luggage_items,
          qr_data_url: p.luggage_items[0]?.qr_data_url || '',
          collected_count: collected,
          in_transit_count: inTransit,
          passenger_record: p
        });
      }
    });

    // Calculate overall status for each passenger group
    return Array.from(map.values()).map((g) => {
      const total = Math.max(g.total_bags, g.luggage_items.length);
      const allCollected = g.collected_count >= total && total > 0;
      let overallStatus = 'QR_GENERATED';
      if (allCollected) {
        overallStatus = 'COLLECTED';
      } else if (g.in_transit_count > 0 || g.collected_count > 0) {
        overallStatus = 'IN_TRANSIT';
      }

      return {
        ...g,
        total_bags: total,
        status: overallStatus,
        all_collected: allCollected
      };
    });
  }, [luggageList, passengers, passengerMap, currentBatch]);

  // Filter grouped passengers
  const filtered = useMemo(() => {
    return groupedPassengers.filter((g) => {
      if (statusFilter && g.status !== statusFilter) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = (g.name || '').toLowerCase().includes(q);
        const matchId = (g.display_id || g.passenger_id || '').toLowerCase().includes(q);
        const matchMobile = (g.mobile_number || '').includes(q);
        const matchDest = (g.destination_stop || '').toLowerCase().includes(q);
        const matchBoard = (g.boarding_stop || '').toLowerCase().includes(q);
        const matchTag = g.luggage_items.some(l => (l.luggage_tag || '').toLowerCase().includes(q));
        return matchName || matchId || matchMobile || matchDest || matchBoard || matchTag;
      }
      return true;
    });
  }, [groupedPassengers, statusFilter, search]);

  // KPI Counts
  const totalBagsCount = useMemo(() => {
    return filtered.reduce((sum, g) => sum + g.total_bags, 0);
  }, [filtered]);

  const collectedBagsCount = useMemo(() => {
    return filtered.reduce((sum, g) => sum + g.collected_count, 0);
  }, [filtered]);

  const pendingBagsCount = totalBagsCount - collectedBagsCount;
  const inTransitBagsCount = useMemo(() => {
    return filtered.reduce((sum, g) => sum + (g.status === 'IN_TRANSIT' ? (g.total_bags - g.collected_count) : 0), 0);
  }, [filtered]);

  // Open Edit Modal for a passenger
  const handleOpenEdit = (owner) => {
    if (!owner) return;
    setEditingPassenger(owner);
    setEditName(owner.name || '');
    setEditMobile(owner.mobile_number || '');
    setEditBoarding(owner.boarding_stop || '');
    setEditDestination(owner.destination_stop || '');
    setEditLuggageCount(owner.luggage_count || 1);
    setEditError('');
  };

  // Save Edit
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingPassenger) return;

    setSavingEdit(true);
    setEditError('');

    try {
      const finalCount = Math.max(1, parseInt(editLuggageCount, 10) || 1);
      await api.updatePassenger(editingPassenger.passenger_id, {
        name: editName.trim(),
        mobile_number: editMobile.trim(),
        boarding_stop: editBoarding.trim(),
        destination_stop: editDestination.trim(),
        luggage_count: finalCount
      });
      setEditingPassenger(null);
      await loadData();
    } catch (err) {
      setEditError(err.message || 'Failed to update passenger details');
    } finally {
      setSavingEdit(false);
    }
  };

  // Mark all bags for this passenger as In Transit
  const handleMarkPassengerInTransit = async (passengerId) => {
    try {
      const g = groupedPassengers.find(item => item.passenger_id === passengerId);
      if (!g) return;
      for (const item of g.luggage_items) {
        if (item.status !== 'COLLECTED') {
          await api.updateLuggageStatus(item.luggage_tag, 'IN_TRANSIT');
        }
      }
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to update luggage status');
    }
  };

  // Delete a passenger and all their luggage records
  const handleDeletePassenger = async (passengerId, passengerName) => {
    if (!window.confirm(`Are you sure you want to delete passenger "${passengerName}" and all associated luggage?`)) return;
    try {
      await api.deletePassenger(passengerId);
      await loadData();
    } catch (err) {
      alert(err.message || 'Failed to delete passenger');
    }
  };

  const handleDeleteTrip = async (tripToDelete) => {
    if (!window.confirm(`Are you sure you want to delete trip "${tripToDelete}" and all its records?`)) {
      return;
    }
    try {
      setLoading(true);
      await api.deleteBatch(tripToDelete);
      const data = await api.getBatches();
      const nextBatch = (data && data[0]) || 'Trip 1';
      setBatches(data || ['Trip 1']);
      if (setSelectedTrip) setSelectedTrip(nextBatch);
      await loadData(nextBatch);
    } catch (err) {
      alert(err.message || 'Failed to delete trip');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 pb-20 max-w-5xl mx-auto">

      {/* KPI Stats Row in Clean Solid Tones */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Bags</span>
          <span className="text-xl font-extrabold text-slate-900 mt-0.5 block">{totalBagsCount}</span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">{filtered.length} Passengers</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 shadow-2xs">
          <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">Pending</span>
          <span className="text-xl font-extrabold text-amber-800 mt-0.5 block">{pendingBagsCount}</span>
          <span className="text-[10px] text-amber-700 mt-0.5 block">Awaiting Handover</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-blue-200 bg-blue-50/40 shadow-2xs">
          <span className="text-[10px] font-bold text-blue-900 uppercase tracking-wider block">In Transit</span>
          <span className="text-xl font-extrabold text-blue-800 mt-0.5 block">{inTransitBagsCount}</span>
          <span className="text-[10px] text-blue-700 mt-0.5 block">En Route</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-2xs">
          <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">Collected</span>
          <span className="text-xl font-extrabold text-emerald-800 mt-0.5 block">{collectedBagsCount}</span>
          <span className="text-[10px] text-emerald-700 mt-0.5 block">Handover Completed</span>
        </div>
      </div>

      {/* Filters & Batch Selector */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-2.5 items-center">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search passenger name, ID, destination, or tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-800 text-slate-900"
          />
        </div>

        {/* Batch Filter & Delete Option */}
        {batches.length > 0 && (
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <select
              value={currentBatch}
              onChange={(e) => {
                const newTrip = e.target.value;
                if (setSelectedTrip) setSelectedTrip(newTrip);
                loadData(newTrip);
              }}
              className="w-full sm:w-36 px-3 py-2 text-xs border-2 border-blue-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 text-slate-900 bg-white font-bold cursor-pointer"
            >
              {batches.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            {batches.length > 1 && (
              <button
                type="button"
                onClick={() => handleDeleteTrip(currentBatch)}
                className="p-2 border border-slate-200 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors cursor-pointer"
                title={`Delete trip "${currentBatch}"`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        <div className="w-full sm:w-40">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-800 text-slate-800 bg-white font-medium cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="QR_GENERATED">QR Generated</option>
            <option value="IN_TRANSIT">In Transit</option>
            <option value="COLLECTED">Collected</option>
          </select>
        </div>

        <button
          onClick={() => loadData(currentBatch)}
          className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600 self-end sm:self-auto cursor-pointer"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <button
          onClick={() => setActiveTab('scan-verify')}
          className="flex items-center justify-center px-3.5 py-2 text-xs font-bold bg-blue-800 text-white hover:bg-blue-900 rounded-lg shadow-xs transition-colors self-end sm:self-auto cursor-pointer whitespace-nowrap"
        >
          <ScanLine className="w-4 h-4 mr-1.5" />
          <span>Scan QR &rarr;</span>
        </button>
      </div>

      {/* SINGLE ENTRY PER PASSENGER (EVEN IF THEY HAVE 3 BAGS) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
            Loading luggage tracking records...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No luggage records found for this criteria in {currentBatch}.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((g) => {
              const owner = g.passenger_record;
              const isAllDone = g.all_collected;

              return (
                <div
                  key={g.passenger_id}
                  className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  {/* Left: Visible Unified Customer QR Code Thumbnail + Passenger Details */}
                  <div className="flex items-start sm:items-center space-x-3.5">
                    
                    {/* Customer's Single Unified QR Code Thumbnail */}
                    <div 
                      onClick={() => setSelectedQrPreview({ ...g, luggage_tag: g.passenger_id, owner })}
                      className="cursor-pointer group relative p-1.5 bg-white border-2 border-slate-300 hover:border-blue-800 rounded-xl shadow-2xs flex-shrink-0 transition-colors"
                      title="Click to view Customer QR Code"
                    >
                      {g.qr_data_url ? (
                        <img
                          src={g.qr_data_url}
                          alt={g.name}
                          className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded"
                        />
                      ) : (
                        <div className="w-16 h-16 flex items-center justify-center bg-slate-100 rounded text-[10px] text-slate-400">
                          QR
                        </div>
                      )}
                      <span className="absolute bottom-1 right-1 text-[8px] bg-slate-800 text-white px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        View
                      </span>
                    </div>

                    {/* Customer Details & 3-Bags Summary */}
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="font-mono font-black text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          ID: {g.display_id || g.passenger_id}
                        </span>

                        {/* TOTAL BAGS BADGE (Shows "3 Bags" ONCE) */}
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-blue-100 text-blue-900 border border-blue-300">
                          {g.total_bags} {g.total_bags === 1 ? 'Bag' : 'Bags'}
                        </span>

                        {/* Status Badge */}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isAllDone
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : g.collected_count > 0
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : g.status === 'IN_TRANSIT'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}>
                          {isAllDone
                            ? `Collected (${g.total_bags}/${g.total_bags})`
                            : g.collected_count > 0
                              ? `${g.collected_count} of ${g.total_bags} Collected`
                              : g.status === 'IN_TRANSIT'
                                ? 'In Transit'
                                : 'Ready / QR Generated'}
                        </span>

                        {g.batch_name && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                            {g.batch_name}
                          </span>
                        )}
                      </div>

                      {/* Customer Name */}
                      <div className="font-extrabold text-sm sm:text-base text-slate-900">
                        {g.name}
                      </div>

                      {/* Route & Contact */}
                      <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-slate-500">
                        <span className="flex items-center text-blue-800 font-bold">
                          <MapPin className="w-3.5 h-3.5 text-blue-800 mr-1" />
                          <span>{g.boarding_stop} &rarr; {g.destination_stop}</span>
                        </span>
                        {g.mobile_number && <span className="font-mono">Phone: {g.mobile_number}</span>}
                      </div>

                      {/* Individual Bag Status Pills (All tags grouped here) */}
                      <div className="pt-1 flex flex-wrap gap-1.5">
                        {g.luggage_items.map((item, idx) => {
                          const isItemDone = item.status === 'COLLECTED';
                          const tagLabel = item.luggage_tag.split('-').slice(1).join('-') || item.luggage_tag;

                          return (
                            <span
                              key={item.id || idx}
                              className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border ${
                                isItemDone
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : 'bg-slate-50 text-slate-600 border-slate-200'
                              }`}
                            >
                              {isItemDone ? (
                                <Check className="w-3 h-3 text-emerald-700" />
                              ) : (
                                <Luggage className="w-3 h-3 text-slate-400" />
                              )}
                              <span>Tag {idx + 1} ({tagLabel})</span>
                            </span>
                          );
                        })}
                      </div>

                    </div>
                  </div>

                  {/* Right Actions: Status Box -> Scan QR -> Edit -> Delete (Aligned in a single clean row) */}
                  <div className="flex items-center gap-2 flex-nowrap flex-shrink-0 self-start md:self-center">
                    {/* STATUS BOX / ACTION */}
                    {!isAllDone && g.status !== 'IN_TRANSIT' ? (
                      <button
                        onClick={() => handleMarkPassengerInTransit(g.passenger_id)}
                        className="h-8 px-2.5 text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap flex items-center shadow-2xs"
                        title="Mark all bags for this passenger as In Transit"
                      >
                        In Transit
                      </button>
                    ) : g.status === 'IN_TRANSIT' && !isAllDone ? (
                      <span className="h-8 px-2.5 text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 rounded-lg flex items-center whitespace-nowrap shadow-2xs">
                        In Transit
                      </span>
                    ) : (
                      <span className="h-8 px-2.5 text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg flex items-center whitespace-nowrap shadow-2xs">
                        <Check className="w-3.5 h-3.5 mr-1 text-emerald-700" />
                        Collected
                      </span>
                    )}

                    {/* SCAN QR / VERIFY BUTTON (Placed directly near the Status Box) */}
                    <button
                      onClick={() => setActiveTab('scan-verify')}
                      className={`h-8 flex items-center px-3 text-xs font-bold rounded-lg transition-colors shadow-2xs cursor-pointer whitespace-nowrap ${
                        isAllDone
                          ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                          : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                      }`}
                      title={isAllDone ? 'Re-scan / verify handover' : 'Scan passenger QR code'}
                    >
                      <ScanLine className="w-3.5 h-3.5 mr-1.5" />
                      <span>{isAllDone ? 'Re-Scan' : 'Scan QR'}</span>
                    </button>

                    {/* EDIT PASSENGER & LUGGAGE BUTTON */}
                    {owner && (
                      <button
                        onClick={() => handleOpenEdit(owner)}
                        className="h-8 flex items-center px-2.5 text-xs font-semibold text-blue-800 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                        title="Edit passenger details or add/remove luggage"
                      >
                        <Edit3 className="w-3.5 h-3.5 mr-1" />
                        <span>Edit</span>
                      </button>
                    )}

                    {/* DELETE PASSENGER BUTTON */}
                    <button
                      onClick={() => handleDeletePassenger(g.passenger_id, g.name)}
                      className="h-8 w-8 flex items-center justify-center text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer flex-shrink-0"
                      title="Delete passenger and all associated luggage"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* EDIT PASSENGER & LUGGAGE MODAL */}
      {editingPassenger && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 flex items-center justify-center p-4 animate-fadeIn no-print">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-5 h-5 text-blue-800" />
                <h3 className="font-bold text-base text-slate-900">Edit Passenger &amp; Luggage</h3>
              </div>
              <button
                onClick={() => setEditingPassenger(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800 font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mobile Number</label>
                <input
                  type="tel"
                  required
                  value={editMobile}
                  onChange={(e) => setEditMobile(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800 font-mono text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Boarding Place</label>
                  <input
                    type="text"
                    required
                    value={editBoarding}
                    onChange={(e) => setEditBoarding(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Destination Place</label>
                  <input
                    type="text"
                    required
                    value={editDestination}
                    onChange={(e) => setEditDestination(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800 text-slate-900 font-bold"
                  />
                </div>
              </div>

              {/* NUMBER OF LUGGAGE (Supports adding extra luggage with SAME QR CODE) */}
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2">
                <label className="block font-bold text-blue-900">
                  Number of Luggage (Bags):
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditLuggageCount(Math.max(1, (parseInt(editLuggageCount, 10) || 1) - 1))}
                    className="w-9 h-9 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-bold text-base text-slate-700 flex items-center justify-center cursor-pointer select-none"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={editLuggageCount}
                    onChange={(e) => setEditLuggageCount(Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 1)))}
                    className="w-16 py-1.5 text-center font-bold text-base text-blue-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-800"
                  />
                  <button
                    type="button"
                    onClick={() => setEditLuggageCount(Math.min(10, (parseInt(editLuggageCount, 10) || 1) + 1))}
                    className="w-9 h-9 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-bold text-base text-slate-700 flex items-center justify-center cursor-pointer select-none"
                  >
                    +
                  </button>
                  <span className="text-[11px] text-blue-800 pl-1 font-medium">
                    {editLuggageCount > (editingPassenger.luggage_count || 1)
                      ? `Adding ${editLuggageCount - (editingPassenger.luggage_count || 1)} extra bag(s) with the same QR code.`
                      : `${editLuggageCount} total luggage bag(s)`}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-2">
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 py-2.5 px-4 bg-blue-800 hover:bg-blue-900 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingEdit ? 'Saving...' : 'Save Changes'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingPassenger(null)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR PREVIEW MODAL */}
      {selectedQrPreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 flex items-center justify-center p-4 animate-fadeIn no-print">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 text-center space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-mono font-bold text-sm text-slate-900">
                {selectedQrPreview.display_id || selectedQrPreview.passenger_id}
              </span>
              <button onClick={() => setSelectedQrPreview(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedQrPreview.qr_data_url && (
              <img
                src={selectedQrPreview.qr_data_url}
                alt={selectedQrPreview.name}
                className="w-48 h-48 mx-auto object-contain p-2 border border-slate-200 rounded-xl"
              />
            )}

            <div className="text-xs space-y-1">
              <div className="font-bold text-sm text-slate-900">
                {selectedQrPreview.name}
              </div>
              <div className="text-blue-800 font-medium">
                {selectedQrPreview.destination_stop || ''}
              </div>
              <div className="text-slate-500 font-mono text-[11px]">
                {selectedQrPreview.mobile_number}
              </div>
              <div className="pt-1">
                <span className="inline-block px-3 py-1 bg-blue-50 border border-blue-200 text-blue-900 rounded-full font-bold text-xs">
                  {selectedQrPreview.total_bags} Total Baggage Tag(s)
                </span>
              </div>
            </div>

            <button
              onClick={() => setSelectedQrPreview(null)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
