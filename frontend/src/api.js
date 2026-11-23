const API_BASE = '/api';

export const getAuthToken = () => localStorage.getItem('slvs_token') || '';
export const setAuthToken = (token) => localStorage.setItem('slvs_token', token);
export const removeAuthToken = () => localStorage.removeItem('slvs_token');

async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.detail || data?.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Passengers
  getPassengers: (search = '', destination = '', batch = '') => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (destination) params.append('destination', destination);
    if (batch) params.append('batch', batch);
    return apiRequest(`/passengers?${params.toString()}`);
  },
  getBatches: () => apiRequest('/passengers/batches'),
  deleteBatch: (batchName) => apiRequest(`/passengers/batches/${encodeURIComponent(batchName)}`, { method: 'DELETE' }),
  getPassenger: (id) => apiRequest(`/passengers/${encodeURIComponent(id)}`),
  generateQrForPassenger: (passengerId, luggageCount = null) => {
    const pParam = encodeURIComponent(passengerId);
    const countVal = luggageCount ? parseInt(luggageCount, 10) : null;
    const countParam = countVal ? `&luggage_count=${encodeURIComponent(countVal)}` : '';
    // Send both in path and query and JSON body for maximum compatibility
    const url = `/passengers/${pParam}/generate-qr?passenger_id=${pParam}${countParam}`;
    return apiRequest(url, { 
      method: 'POST',
      body: JSON.stringify({ passenger_id: passengerId, luggage_count: countVal })
    });
  },
  createPassenger: (data) => apiRequest('/passengers', { method: 'POST', body: JSON.stringify(data) }),
  updatePassenger: (id, data) => apiRequest(`/passengers/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePassenger: (id) => apiRequest(`/passengers/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // Luggage
  getLuggage: (status = '', passengerId = '', batch = '') => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (passengerId) params.append('passenger_id', passengerId);
    if (batch) params.append('batch_name', batch);
    return apiRequest(`/luggage?${params.toString()}`);
  },
  scanLuggage: (code, autoCollect = true) => apiRequest('/luggage/scan', {
    method: 'POST',
    body: JSON.stringify({ code, auto_collect: autoCollect })
  }),
  getLuggageByToken: (token) => apiRequest(`/luggage/token/${encodeURIComponent(token)}`),
  handoverLuggageByToken: (token) => apiRequest(`/luggage/token/${encodeURIComponent(token)}/handover`, { method: 'POST' }),
  handoverAllForPassenger: (passengerId) => apiRequest(`/luggage/passenger/${encodeURIComponent(passengerId)}/handover-all`, { method: 'POST' }),
  deleteLuggage: (tag) => apiRequest(`/luggage/${encodeURIComponent(tag)}`, { method: 'DELETE' }),
  deleteAllLuggage: () => apiRequest('/luggage/delete-all', { method: 'DELETE' }),
  generateAllQr: () => apiRequest('/luggage/generate-all', { method: 'POST' }),
  reprintLuggage: (tag) => apiRequest(`/luggage/${encodeURIComponent(tag)}/reprint`, { method: 'POST' }),
  updateLuggageStatus: (tag, status) => apiRequest(`/luggage/${encodeURIComponent(tag)}/status?new_status=${encodeURIComponent(status)}`, { method: 'PUT' }),

  // Verification
  verifyLuggage: (payload) => apiRequest('/verification/verify', { method: 'POST', body: JSON.stringify(payload) }),
  getVerificationHistory: (result = '', passengerId = '', limit = 100) => {
    const params = new URLSearchParams();
    if (result) params.append('result', result);
    if (passengerId) params.append('passenger_id', passengerId);
    params.append('limit', limit);
    return apiRequest(`/verification/history?${params.toString()}`);
  },

  // Stats
  getDashboardStats: () => apiRequest('/stats/dashboard'),

  // Import
  previewCsvUpload: async (formData) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE}/import/preview-csv`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: formData
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const msg = typeof err.detail === 'string'
        ? err.detail
        : (Array.isArray(err.detail) ? err.detail.map(d => d.msg || d.message).join(', ') : 'Failed to preview CSV file');
      throw new Error(msg || 'Failed to preview CSV file');
    }
    return response.json();
  },
  previewGoogleSheets: (sheetUrl, batchName = 'Trip 1') => apiRequest('/import/preview-sheets', {
    method: 'POST',
    body: JSON.stringify({ sheet_url: sheetUrl, batch_name: batchName })
  }),
  executeImport: (rows, batchName = 'Trip 1') => apiRequest('/import/execute', {
    method: 'POST',
    body: JSON.stringify({ rows, batch_name: batchName })
  })
};
