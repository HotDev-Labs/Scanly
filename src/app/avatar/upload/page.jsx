'use client';

import { useState, useRef } from 'react';

export default function AvatarUploadPage() {
  const inputFileRef = useRef(null);
  const [blob, setBlob] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  return (
    <div style={{ maxWidth: 520, margin: '40px auto', padding: 24, fontFamily: 'system-ui, -apple-system, sans-serif', background: '#ffffff', borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>Upload Your Avatar</h1>
      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
        Upload an agent profile image to store in Vercel Storage. Supported formats: JPEG, PNG, WebP.
      </p>

      {error && (
        <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#991b1b', fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setError('');

          const files = inputFileRef.current?.files;
          if (!files || files.length === 0) {
            setError('Please select an image file to upload.');
            return;
          }

          const file = files[0];
          setUploading(true);

          try {
            const response = await fetch(
              `/api/avatar/upload?filename=${encodeURIComponent(file.name)}`,
              {
                method: 'POST',
                body: file,
              },
            );

            if (!response.ok) {
              const errText = await response.text();
              throw new Error(errText || `Upload failed with status ${response.status}`);
            }

            const newBlob = await response.json();
            setBlob(newBlob);
          } catch (err) {
            setError(err.message || 'Failed to upload image to Vercel Storage.');
          } finally {
            setUploading(false);
          }
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        <div style={{ border: '2px dashed #cbd5e1', borderRadius: 12, padding: 20, textAlign: 'center', background: '#f8fafc' }}>
          <input 
            name="file" 
            ref={inputFileRef} 
            type="file" 
            accept="image/jpeg, image/png, image/webp" 
            required 
            style={{ fontSize: 13, color: '#334155' }}
          />
        </div>

        <button 
          type="submit" 
          disabled={uploading}
          style={{
            padding: '12px 20px',
            backgroundColor: uploading ? '#93c5fd' : '#1d4ed8',
            color: '#ffffff',
            border: 'none',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 700,
            cursor: uploading ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
          }}
        >
          {uploading ? 'Uploading to Vercel Storage...' : 'Upload Avatar'}
        </button>
      </form>

      {blob && (
        <div style={{ marginTop: 24, padding: 16, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ color: '#16a34a', fontWeight: 800, fontSize: 14 }}>✓ Avatar Uploaded Successfully!</span>
          </div>
          {blob.url && (
            <div style={{ marginBottom: 12 }}>
              <img 
                src={blob.url} 
                alt="Uploaded Avatar" 
                style={{ width: 88, height: 88, borderRadius: '50%', objectFit: 'cover', border: '3px solid #16a34a' }} 
              />
            </div>
          )}
          <div>
            <a 
              href={`/api/avatar/view?pathname=${encodeURIComponent(blob.pathname || blob.url)}`}
              target="_blank"
              rel="noreferrer"
              style={{ color: '#2563eb', fontWeight: 600, fontSize: 13, textDecoration: 'underline' }}
            >
              View file in storage
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

