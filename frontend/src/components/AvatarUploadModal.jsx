import React, { useState, useRef } from 'react';
import { api } from '../api';
import { Camera, X, UploadCloud, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AvatarUploadModal({ isOpen, onClose, onAvatarUpdated, currentAvatar }) {
  const inputFileRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(currentAvatar || '');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    setError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }

    setSelectedFile(file);
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please choose an image file first.');
      return;
    }

    setUploading(true);
    setError('');
    try {
      const res = await api.uploadAvatar(selectedFile);
      setSuccess(true);
      if (res && res.url) {
        setPreviewUrl(res.url);
        if (onAvatarUpdated) {
          onAvatarUpdated(res.url);
        }
      }
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.message || 'Avatar upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full overflow-hidden animate-scaleIn">
        
        {/* Header */}
        <div className="bg-blue-800 text-white px-5 py-4 flex items-center justify-between border-b border-blue-900">
          <div className="flex items-center space-x-2">
            <div className="bg-white text-blue-800 p-1.5 rounded-lg shadow-xs">
              <Camera className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-sm tracking-tight">Agent Avatar Photo</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-blue-200 hover:text-white hover:bg-blue-900 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleUpload} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Avatar uploaded to Vercel Storage!</span>
            </div>
          )}

          {/* Avatar Preview */}
          <div className="flex flex-col items-center justify-center py-2">
            <div className="relative group cursor-pointer" onClick={() => inputFileRef.current?.click()}>
              {previewUrl ? (
                <img 
                  src={previewUrl} 
                  alt="Avatar Preview" 
                  className="w-24 h-24 rounded-full object-cover border-4 border-blue-800 shadow-md"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:border-blue-700 hover:bg-blue-50 transition-colors">
                  <UploadCloud className="w-8 h-8 text-slate-400 mb-1" />
                  <span className="text-[10px] font-bold">Pick Photo</span>
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <Camera className="w-6 h-6" />
              </div>
            </div>
            <span className="text-[11px] text-slate-400 mt-2 font-medium">Click to select new image</span>
          </div>

          <input 
            type="file" 
            ref={inputFileRef}
            onChange={handleFileChange}
            accept="image/jpeg, image/png, image/webp" 
            className="hidden" 
          />

          <button
            type="submit"
            disabled={uploading || !selectedFile}
            className="w-full py-2.5 bg-blue-800 hover:bg-blue-900 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors shadow-xs flex items-center justify-center space-x-2 cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>{uploading ? 'Storing in Vercel Storage...' : 'Save Avatar Photo'}</span>
          </button>
        </form>

      </div>
    </div>
  );
}

