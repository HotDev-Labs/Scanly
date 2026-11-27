import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { 
  FileSpreadsheet, 
  UploadCloud, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Plus, 
  UserPlus, 
  Link as LinkIcon,
  FolderOpen,
  MapPin,
  Phone,
  User,
  Hash,
  ChevronDown,
  Users,
  Pencil,
  Search,
  X,
  Save,
  RefreshCw
} from 'lucide-react';

export default function ImportPage({ selectedTrip = 'Trip 1', setSelectedTrip, setActiveTab }) {
  const [activeMode, setActiveMode] = useState('members'); // 'members', 'file', 'manual', or 'sheets'
  const [batches, setBatches] = useState(['Trip 1', 'Trip 2', 'Trip 3']);
  const batchName = selectedTrip || 'Trip 1';
  const setBatchName = (val) => {
    if (setSelectedTrip) setSelectedTrip(val);
  };

  // Trip Members List & Search
  const [tripMembers, setTripMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');

  // Edit Passenger Modal State
  const [editingMember, setEditingMember] = useState(null);
  const [editName, setEditName] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editBoarding, setEditBoarding] = useState('');
  const [editDestination, setEditDestination] = useState('');
  const [editLuggageCount, setEditLuggageCount] = useState(1);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editModalError, setEditModalError] = useState('');

  // File & Sheets Import States
  const [file, setFile] = useState(null);
  const [sheetUrl, setSheetUrl] = useState('');
  const [csvText, setCsvText] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Manual Entry States
  const [manualId, setManualId] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualMobile, setManualMobile] = useState('');
  const [manualBoarding, setManualBoarding] = useState('');
  const [manualDestination, setManualDestination] = useState('');
  const [manualLuggageCount, setManualLuggageCount] = useState(1);
  const [manualSaving, setManualSaving] = useState(false);

  useEffect(() => {
    loadBatches();
  }, []);

  useEffect(() => {
    loadTripMembers(batchName);
  }, [batchName]);

  const loadBatches = async () => {
    try {
      const data = await api.getBatches();
      if (data && data.length > 0) {
        setBatches(data);
        if (!data.includes(batchName) && setSelectedTrip) {
          setSelectedTrip(data[0]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadTripMembers = async (targetTrip = batchName) => {
    try {
      setLoadingMembers(true);
      const data = await api.getPassengers('', '', targetTrip);
      setTripMembers(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleDeleteTrip = async (tripToDelete) => {
    if (!window.confirm(`Are you sure you want to delete trip "${tripToDelete}" and all its passengers?`)) {
      return;
    }
    try {
      setLoading(true);
      await api.deleteBatch(tripToDelete);
      setSuccessMessage(`Trip "${tripToDelete}" deleted successfully.`);
      const updated = await api.getBatches();
      const nextBatch = (updated && updated[0]) || 'Trip 1';
      setBatches(updated || ['Trip 1']);
      if (setSelectedTrip) setSelectedTrip(nextBatch);
      await loadTripMembers(nextBatch);
    } catch (err) {
      setError(err.message || 'Failed to delete trip');
    } finally {
      setLoading(false);
    }
  };

  // Open Edit Modal for a Member
  const handleOpenEditMember = (member) => {
    setEditingMember(member);
    setEditName(member.name || '');
    setEditMobile(member.mobile_number || '');
    setEditBoarding(member.boarding_stop || '');
    setEditDestination(member.destination_stop || '');
    setEditLuggageCount(member.luggage_count || 1);
    setEditModalError('');
  };

  // Save Passenger Edits
  const handleSaveEditMember = async (e) => {
    e.preventDefault();
    if (!editingMember) return;
    if (!editName.trim() || !editMobile.trim() || !editBoarding.trim() || !editDestination.trim()) {
      setEditModalError("Please fill in all member details.");
      return;
    }

    setSavingEdit(true);
    setEditModalError('');

    try {
      const finalCount = Math.max(1, parseInt(editLuggageCount, 10) || 1);
      await api.updatePassenger(editingMember.passenger_id, {
        name: editName.trim(),
        mobile_number: editMobile.trim(),
        boarding_stop: editBoarding.trim(),
        destination_stop: editDestination.trim(),
        luggage_count: finalCount
      });

      setSuccessMessage(`Updated details for "${editName.trim()}" successfully.`);
      setEditingMember(null);
      await loadTripMembers(batchName);
    } catch (err) {
      setEditModalError(err.message || 'Failed to update member');
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete Individual Member
  const handleDeleteMember = async (member) => {
    const displayName = member.name || member.display_id || member.passenger_id;
    if (!window.confirm(`Are you sure you want to delete passenger "${displayName}" and any associated luggage records?`)) {
      return;
    }

    try {
      await api.deletePassenger(member.passenger_id);
      setSuccessMessage(`Passenger "${displayName}" deleted from ${batchName}.`);
      await loadTripMembers(batchName);
    } catch (err) {
      setError(err.message || 'Failed to delete passenger');
    }
  };

  // Handle file selection (Excel, CSV, TSV)
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
      setSuccessMessage('');
    }
  };

  // Run Preview for Excel / CSV
  const handlePreviewFile = async () => {
    if (!file && !csvText.trim()) {
      setError("Please choose a spreadsheet file (.xlsx, .xls, .csv) or paste text.");
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const formData = new FormData();
      if (file) {
        formData.append('file', file);
      } else {
        formData.append('raw_csv', csvText);
      }
      formData.append('batch_name', batchName.trim() || 'Trip 1');

      const res = await api.previewCsvUpload(formData);
      setPreviewData(res);
    } catch (err) {
      setError(err.message || 'Failed to parse spreadsheet file');
    } finally {
      setLoading(false);
    }
  };

  // Run Preview for Google Sheets
  const handlePreviewSheets = async () => {
    if (!sheetUrl.trim()) {
      setError("Please enter a Google Sheets URL or Spreadsheet ID.");
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const res = await api.previewGoogleSheets(sheetUrl.trim(), batchName.trim() || 'Trip 1');
      setPreviewData(res);
    } catch (err) {
      setError(err.message || 'Failed to fetch Google Sheet. Ensure the sheet is shared as "Anyone with link can view".');
    } finally {
      setLoading(false);
    }
  };

  // Manual Passenger Add
  const handleManualAddPassenger = async (e) => {
    e.preventDefault();
    if (!manualName.trim() || !manualMobile.trim() || !manualBoarding.trim() || !manualDestination.trim()) {
      setError("Please fill in all passenger details.");
      return;
    }

    setManualSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const targetBatch = batchName.trim() || 'Trip 1';
      const cleanId = manualId.trim() || `P${Date.now().toString().slice(-4)}`;

      await api.createPassenger({
        passenger_id: cleanId,
        display_id: cleanId,
        batch_name: targetBatch,
        name: manualName.trim(),
        mobile_number: manualMobile.trim(),
        boarding_stop: manualBoarding.trim(),
        destination_stop: manualDestination.trim(),
        luggage_count: Math.max(1, parseInt(manualLuggageCount, 10) || 1)
      });

      setSuccessMessage(`Passenger "${manualName.trim()}" (ID: ${cleanId}) successfully added to ${targetBatch}!`);
      setManualId('');
      setManualName('');
      setManualMobile('');
      setManualBoarding('');
      setManualDestination('');
      setManualLuggageCount(1);
      await loadBatches();
      await loadTripMembers(targetBatch);
      if (setSelectedTrip) setSelectedTrip(targetBatch);
      setActiveMode('members');
    } catch (err) {
      setError(err.message || 'Failed to add passenger');
    } finally {
      setManualSaving(false);
    }
  };

  // Inline edit a row in preview
  const handleEditRowField = (idx, field, value) => {
    if (!previewData) return;
    const updatedRows = [...previewData.rows];
    updatedRows[idx] = {
      ...updatedRows[idx],
      [field]: field === 'luggage_count' ? (parseInt(value, 10) || 1) : value
    };

    const errors = [];
    if (!updatedRows[idx].display_id && !updatedRows[idx].passenger_id) errors.push("Passenger ID missing.");
    if (!updatedRows[idx].name) errors.push("Name missing.");
    if (!updatedRows[idx].mobile_number) errors.push("Mobile number missing.");
    if (!updatedRows[idx].boarding_stop) errors.push("Boarding stop missing.");
    if (!updatedRows[idx].destination_stop) errors.push("Destination stop missing.");
    
    updatedRows[idx].errors = errors;
    updatedRows[idx].is_valid = errors.length === 0;

    const validCount = updatedRows.filter(r => r.is_valid).length;
    setPreviewData({
      ...previewData,
      valid_count: validCount,
      invalid_count: updatedRows.length - validCount,
      rows: updatedRows
    });
  };

  // Remove row from preview
  const handleRemoveRow = (idx) => {
    if (!previewData) return;
    const updatedRows = previewData.rows.filter((_, i) => i !== idx);
    const validCount = updatedRows.filter(r => r.is_valid).length;
    setPreviewData({
      ...previewData,
      total_rows: updatedRows.length,
      valid_count: validCount,
      invalid_count: updatedRows.length - validCount,
      rows: updatedRows
    });
  };

  // Commit Import
  const handleCommitImport = async () => {
    if (!previewData || previewData.rows.length === 0) return;

    const targetBatch = batchName.trim() || 'Trip 1';
    const validRows = previewData.rows
      .filter(r => r.is_valid)
      .map(r => ({
        passenger_id: r.passenger_id,
        display_id: r.display_id || r.passenger_id,
        batch_name: targetBatch,
        name: r.name,
        mobile_number: r.mobile_number,
        boarding_stop: r.boarding_stop,
        destination_stop: r.destination_stop,
        luggage_count: r.luggage_count || 1
      }));

    if (validRows.length === 0) {
      setError("No valid records to import. Please correct row errors first.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.executeImport(validRows, targetBatch);
      setSuccessMessage(res.message || `Successfully imported ${validRows.length} passengers for ${targetBatch}!`);
      setPreviewData(null);
      setFile(null);
      setCsvText('');
      await loadBatches();
      await loadTripMembers(targetBatch);
      if (setSelectedTrip) setSelectedTrip(targetBatch);
      setActiveMode('members');
    } catch (err) {
      setError(err.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSample = () => {
    window.open('/api/import/sample-csv', '_blank');
  };

  // Filter members by search input
  const filteredMembers = tripMembers.filter((m) => {
    if (!memberSearch.trim()) return true;
    const q = memberSearch.toLowerCase();
    return (
      (m.name || '').toLowerCase().includes(q) ||
      (m.mobile_number || '').includes(q) ||
      (m.display_id || m.passenger_id || '').toLowerCase().includes(q) ||
      (m.boarding_stop || '').toLowerCase().includes(q) ||
      (m.destination_stop || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-20">

      {/* TRIP SELECTOR & TRIP MANAGEMENT */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
          <label htmlFor="import-trip-select" className="flex items-center space-x-2">
            <FolderOpen className="w-4 h-4 text-blue-800" />
            <span>Target Trip:</span>
          </label>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {tripMembers.length} Members
            </span>
            <button
              onClick={() => { loadBatches(); loadTripMembers(batchName); }}
              className="p-1.5 border border-slate-200 bg-white rounded-lg text-slate-500 hover:text-blue-800 hover:bg-blue-50 transition-colors cursor-pointer"
              title="Refresh Members"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDownloadSample}
              className="flex items-center px-2.5 py-1 text-xs font-bold bg-white text-blue-800 border border-slate-200 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
              title="Download Sample CSV Template"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              <span>Sample CSV</span>
            </button>
            {batches.length > 1 && (
              <button
                type="button"
                onClick={() => handleDeleteTrip(batchName)}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-800 flex items-center space-x-1 p-1 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                title={`Delete trip "${batchName}"`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Trip</span>
              </button>
            )}
          </div>
        </div>

        {/* Trip Dropdown + Custom Trip Name Input */}
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <div className="relative flex-1 w-full">
            <select
              id="import-trip-select"
              value={batches.includes(batchName) ? batchName : 'custom'}
              onChange={(e) => {
                const val = e.target.value;
                if (val !== 'custom') setBatchName(val);
              }}
              className="w-full pl-3.5 pr-10 py-2.5 text-sm font-bold border-2 border-blue-800 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900 appearance-none shadow-2xs cursor-pointer"
            >
              {batches.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
              <option value="custom">+ New / Custom Trip</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-blue-800">
              <ChevronDown className="w-5 h-5 text-blue-800" />
            </div>
          </div>

          {/* New / Custom Trip Name input */}
          <input
            type="text"
            value={batchName}
            onChange={(e) => setBatchName(e.target.value)}
            placeholder="Trip Name..."
            className="w-full sm:w-48 px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800 text-slate-900 bg-white"
          />
        </div>
      </div>

      {/* Mode Tabs: 1. Trip Members & Manage, 2. File Upload, 3. Manual Entry, 4. Google Sheets */}
      <div className="flex flex-wrap border-b border-slate-200 bg-white rounded-t-2xl px-3 pt-2 gap-1 sm:gap-0">
        <button
          onClick={() => { setActiveMode('members'); setPreviewData(null); setError(''); }}
          className={`py-2.5 px-3.5 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-colors cursor-pointer ${
            activeMode === 'members'
              ? 'border-blue-800 text-blue-800 bg-blue-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4 text-blue-800" />
          <span>Trip Members ({tripMembers.length})</span>
        </button>

        <button
          onClick={() => { setActiveMode('file'); setPreviewData(null); setError(''); }}
          className={`py-2.5 px-3.5 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-colors cursor-pointer ${
            activeMode === 'file'
              ? 'border-blue-800 text-blue-800 bg-blue-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Upload Spreadsheet</span>
        </button>

        <button
          onClick={() => { setActiveMode('manual'); setPreviewData(null); setError(''); }}
          className={`py-2.5 px-3.5 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-colors cursor-pointer ${
            activeMode === 'manual'
              ? 'border-blue-800 text-blue-800 bg-blue-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Add Member</span>
        </button>

        <button
          onClick={() => { setActiveMode('sheets'); setPreviewData(null); setError(''); }}
          className={`py-2.5 px-3.5 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-colors cursor-pointer ${
            activeMode === 'sheets'
              ? 'border-blue-800 text-blue-800 bg-blue-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <LinkIcon className="w-4 h-4" />
          <span>Google Sheets</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs rounded-xl flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 flex-shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          {setActiveTab && (
            <button
              onClick={() => setActiveTab('generate-qr')}
              className="px-3 py-1 bg-blue-800 text-white font-bold rounded-lg text-xs hover:bg-blue-900 cursor-pointer shadow-xs"
            >
              Go to QR &rarr;
            </button>
          )}
        </div>
      )}

      {/* MODE 1: TRIP MEMBERS MANAGEMENT (VIEW, EDIT, DELETE, ADD) */}
      {activeMode === 'members' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4">
          
          {/* Header & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
                <span>{batchName} Passenger List</span>
                <span className="text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  {filteredMembers.length} {filteredMembers.length === 1 ? 'Member' : 'Members'}
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Manage trip passengers, edit details, or remove members. Changes replicate instantly across QR Generator &amp; Tracking.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search name, mobile, ID..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800 text-slate-900"
                />
              </div>

              <button
                type="button"
                onClick={() => setActiveMode('manual')}
                className="px-3 py-1.5 bg-blue-800 hover:bg-blue-900 text-white text-xs font-bold rounded-xl flex items-center space-x-1 shadow-xs cursor-pointer flex-shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Member</span>
              </button>
            </div>
          </div>

          {/* Members Table */}
          {loadingMembers ? (
            <div className="py-12 text-center text-xs text-slate-500">
              Loading {batchName} members...
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="text-sm font-bold text-slate-800">
                {memberSearch ? `No passengers match "${memberSearch}"` : `No passengers in ${batchName} yet`}
              </div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {memberSearch 
                  ? "Try clearing the search query to see all passengers."
                  : "Upload an Excel / CSV manifest, or click Add Member to add passengers manually."}
              </p>
              {!memberSearch && (
                <div className="pt-2 flex justify-center gap-2">
                  <button
                    onClick={() => setActiveMode('file')}
                    className="px-3.5 py-2 bg-blue-800 text-white font-bold rounded-xl text-xs hover:bg-blue-900 shadow-xs cursor-pointer"
                  >
                    Upload Manifest File
                  </button>
                  <button
                    onClick={() => setActiveMode('manual')}
                    className="px-3.5 py-2 border border-slate-300 bg-white text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-50 cursor-pointer"
                  >
                    Add Member Manually
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold">
                    <th className="p-2.5">ID / S.No</th>
                    <th className="p-2.5">Customer Name</th>
                    <th className="p-2.5">Mobile Number</th>
                    <th className="p-2.5">Boarding Place</th>
                    <th className="p-2.5">Destination Place</th>
                    <th className="p-2.5 text-center">Luggage</th>
                    <th className="p-2.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMembers.map((m) => {
                    const displayId = m.display_id || m.passenger_id.split('-').slice(1).join('-') || m.passenger_id;
                    const bCount = m.luggage_count || 1;

                    return (
                      <tr key={m.passenger_id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-2.5 font-mono font-bold text-slate-900">
                          {displayId}
                        </td>
                        <td className="p-2.5 font-bold text-slate-900">
                          {m.name}
                        </td>
                        <td className="p-2.5 font-mono text-slate-700">
                          {m.mobile_number}
                        </td>
                        <td className="p-2.5 text-slate-700">
                          {m.boarding_stop}
                        </td>
                        <td className="p-2.5 font-semibold text-blue-900">
                          {m.destination_stop}
                        </td>
                        <td className="p-2.5 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                            {bCount} {bCount === 1 ? 'Bag' : 'Bags'}
                          </span>
                        </td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditMember(m)}
                              className="px-2.5 py-1 text-xs font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors cursor-pointer flex items-center space-x-1"
                              title="Edit passenger details"
                            >
                              <Pencil className="w-3 h-3 text-blue-800" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMember(m)}
                              className="px-2 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors cursor-pointer flex items-center space-x-1"
                              title="Delete passenger"
                            >
                              <Trash2 className="w-3 h-3 text-rose-600" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODE 2: SPREADSHEET FILE UPLOAD (.xlsx, .xls, .csv, .tsv) */}
      {activeMode === 'file' && !previewData && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:bg-slate-50 transition-colors">
            <UploadCloud className="w-10 h-10 text-blue-800 mx-auto mb-2" />
            <label className="cursor-pointer block">
              <span className="text-xs font-bold text-blue-800 hover:underline">
                {file ? file.name : "Choose Excel (.xlsx, .xls), CSV, or TSV file"}
              </span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.tsv,.ods,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,text/tab-separated-values"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            <p className="text-[11px] text-slate-500 mt-1">
              Supports: <strong>Excel (.xlsx, .xls), CSV (.csv), TSV (.tsv)</strong>
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Columns: S.No, Name, Mobile Number, Boarding Place, Destination Place
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Or paste spreadsheet table / CSV content:
            </label>
            <textarea
              rows={4}
              value={csvText}
              onChange={(e) => { setCsvText(e.target.value); setFile(null); }}
              placeholder="S.No,Name,Mobile Number,Boarding Place,Destination Place&#10;P01,Rahul Sharma,9876543210,Chennai,Bangalore"
              className="w-full p-3 text-xs font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800"
            ></textarea>
          </div>

          <button
            onClick={handlePreviewFile}
            disabled={loading || (!file && !csvText.trim())}
            className="w-full py-3 bg-blue-800 hover:bg-blue-900 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
          >
            {loading ? "Validating Spreadsheet..." : "Preview & Validate Spreadsheet"}
          </button>
        </div>
      )}

      {/* MODE 3: MANUAL MEMBER ADD */}
      {activeMode === 'manual' && (
        <form onSubmit={handleManualAddPassenger} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-1.5">
              <UserPlus className="w-4 h-4 text-blue-800" />
              <span>Add Member to {batchName}</span>
            </h2>
            <span className="text-[11px] text-slate-500">
              Replicates instantly in QR Code Generator &amp; Roster
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                S.No / Passenger ID
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 text-blue-800 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                  placeholder="e.g. P31, PA01, 1"
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800 text-slate-900"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Customer Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-blue-800 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full pl-9 pr-3 py-2 text-xs font-bold border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800 text-slate-900"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mobile Number *
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-blue-800 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="tel"
                required
                value={manualMobile}
                onChange={(e) => setManualMobile(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full pl-9 pr-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800 text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Boarding Place *
              </label>
              <input
                type="text"
                required
                value={manualBoarding}
                onChange={(e) => setManualBoarding(e.target.value)}
                placeholder="e.g. Central Bus Terminus"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800 text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Destination Place *
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-blue-800 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={manualDestination}
                  onChange={(e) => setManualDestination(e.target.value)}
                  placeholder="e.g. Airport Hub"
                  className="w-full pl-9 pr-3 py-2 text-xs font-bold border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800 text-slate-900"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Initial Luggage Bags (Default 1)
            </label>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setManualLuggageCount(Math.max(1, (parseInt(manualLuggageCount, 10) || 1) - 1))}
                className="w-8 h-8 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 font-bold text-sm text-slate-700 flex items-center justify-center cursor-pointer select-none"
              >
                -
              </button>
              <input
                type="number"
                min="1"
                max="10"
                value={manualLuggageCount}
                onChange={(e) => setManualLuggageCount(Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 1)))}
                className="w-16 py-1.5 text-center font-bold text-sm text-blue-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-800"
              />
              <button
                type="button"
                onClick={() => setManualLuggageCount(Math.min(10, (parseInt(manualLuggageCount, 10) || 1) + 1))}
                className="w-8 h-8 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 font-bold text-sm text-slate-700 flex items-center justify-center cursor-pointer select-none"
              >
                +
              </button>
              <span className="text-[11px] text-slate-500 pl-1">
                luggage bag(s) registered
              </span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={manualSaving}
              className="flex-1 py-3 bg-blue-800 hover:bg-blue-900 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer flex items-center justify-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{manualSaving ? "Saving..." : `Add Passenger to ${batchName}`}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('members')}
              className="px-4 py-3 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-50 cursor-pointer"
            >
              View Roster
            </button>
          </div>
        </form>
      )}

      {/* MODE 4: GOOGLE SHEETS SYNC */}
      {activeMode === 'sheets' && !previewData && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Google Sheet Public Link / ID:
            </label>
            <input
              type="text"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/your-sheet-id/edit..."
              className="w-full px-3 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Sheet columns: <strong>S.No, Name, Mobile Number, Boarding Place, Destination Place</strong>. Ensure sheet is shared as: <em>"Anyone with the link can view"</em>.
            </span>
          </div>

          <button
            onClick={handlePreviewSheets}
            disabled={loading || !sheetUrl.trim()}
            className="w-full py-3 bg-blue-800 hover:bg-blue-900 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
          >
            {loading ? "Fetching Sheet Data..." : "Fetch & Preview Sheet"}
          </button>
        </div>
      )}

      {/* PREVIEW TABLE AND VALIDATION (FOR FILE / SHEETS) */}
      {previewData && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Manifest Preview &bull; Batch: <span className="text-blue-800 font-bold">{batchName || 'Trip 1'}</span>
              </h2>
              <div className="text-xs text-slate-500 mt-0.5">
                Total Rows: {previewData.total_rows} &bull; Valid: <span className="text-emerald-700 font-bold">{previewData.valid_count}</span> &bull; Errors: <span className="text-rose-600 font-bold">{previewData.invalid_count}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPreviewData(null)}
                className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleCommitImport}
                disabled={loading || previewData.valid_count === 0}
                className="px-4 py-2 bg-blue-800 hover:bg-blue-900 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                {loading ? "Importing..." : `Confirm Import (${previewData.valid_count} Passengers)`}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold">
                  <th className="p-2.5">ID / S.No</th>
                  <th className="p-2.5">Name</th>
                  <th className="p-2.5">Mobile</th>
                  <th className="p-2.5">Boarding</th>
                  <th className="p-2.5">Destination</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewData.rows.map((row, idx) => (
                  <tr key={idx} className={row.is_valid ? "hover:bg-slate-50/50" : "bg-rose-50/40"}>
                    <td className="p-2.5 font-mono font-bold text-slate-800">
                      {row.display_id || row.passenger_id}
                    </td>
                    <td className="p-2.5 font-bold">
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => handleEditRowField(idx, 'name', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-800 text-xs font-bold"
                      />
                    </td>
                    <td className="p-2.5 font-mono">
                      <input
                        type="text"
                        value={row.mobile_number}
                        onChange={(e) => handleEditRowField(idx, 'mobile_number', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-800 text-xs"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="text"
                        value={row.boarding_stop}
                        onChange={(e) => handleEditRowField(idx, 'boarding_stop', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-800 text-xs"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="text"
                        value={row.destination_stop}
                        onChange={(e) => handleEditRowField(idx, 'destination_stop', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-800 text-xs font-bold"
                      />
                    </td>
                    <td className="p-2.5">
                      {row.is_valid ? (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                          Valid
                        </span>
                      ) : (
                        <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded" title={row.errors.join(', ')}>
                          {row.errors[0]}
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 text-center">
                      <button
                        onClick={() => handleRemoveRow(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                        title="Remove row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EDIT PASSENGER MODAL (EDIT NAME, MOBILE, PLACES, LUGGAGE) */}
      {editingMember && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 flex items-center justify-center p-4 animate-fadeIn no-print">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Edit Passenger Details</h3>
                  <div className="text-[11px] font-mono text-slate-500">
                    ID: {editingMember.display_id || editingMember.passenger_id} &bull; {batchName}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setEditingMember(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editModalError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{editModalError}</span>
              </div>
            )}

            {/* Edit Form */}
            <form onSubmit={handleSaveEditMember} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-blue-800 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800 font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mobile Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-blue-800 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="tel"
                    required
                    value={editMobile}
                    onChange={(e) => setEditMobile(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800 font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Boarding Place</label>
                  <input
                    type="text"
                    required
                    value={editBoarding}
                    onChange={(e) => setEditBoarding(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800 font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Destination Place</label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 text-blue-800 absolute left-2.5 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={editDestination}
                      onChange={(e) => setEditDestination(e.target.value)}
                      className="w-full pl-8 pr-2 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800 font-bold text-slate-900"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Luggage Count (Bags)</label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditLuggageCount(Math.max(1, (parseInt(editLuggageCount, 10) || 1) - 1))}
                    className="w-8 h-8 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 font-bold text-sm text-slate-700 flex items-center justify-center cursor-pointer select-none"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={editLuggageCount}
                    onChange={(e) => setEditLuggageCount(Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 1)))}
                    className="w-16 py-1.5 text-center font-bold text-sm text-blue-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-800"
                  />
                  <button
                    type="button"
                    onClick={() => setEditLuggageCount(Math.min(10, (parseInt(editLuggageCount, 10) || 1) + 1))}
                    className="w-8 h-8 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 font-bold text-sm text-slate-700 flex items-center justify-center cursor-pointer select-none"
                  >
                    +
                  </button>
                  <span className="text-[11px] text-slate-500 pl-1">
                    bag(s) registered
                  </span>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 py-2.5 px-4 bg-blue-800 hover:bg-blue-900 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingEdit ? "Saving..." : "Save Changes"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
