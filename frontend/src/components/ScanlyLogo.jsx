import React from 'react';

export default function ScanlyLogo({ className = "w-7 h-7" }) {
  return (
    <svg 
      viewBox="0 0 64 64" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Scanly Logo"
    >
      <defs>
        <linearGradient id="scanly-grad-comp" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1E40AF" />
        </linearGradient>
        <linearGradient id="scanly-laser-comp" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0" />
          <stop offset="50%" stopColor="#38BDF8" stopOpacity="1" />
          <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Squircle Backdrop */}
      <rect width="64" height="64" rx="16" fill="url(#scanly-grad-comp)" />

      {/* Luggage Top Handle */}
      <path 
        d="M24 14V11C24 9.34315 25.3431 8 27 8H37C38.6569 8 40 9.34315 40 11V14" 
        stroke="#93C5FD" 
        strokeWidth="3.2" 
        strokeLinecap="round" 
      />

      {/* Luggage Body Outline */}
      <rect 
        x="13" 
        y="14" 
        width="38" 
        height="40" 
        rx="8" 
        fill="#FFFFFF" 
        fillOpacity="0.12" 
        stroke="#FFFFFF" 
        strokeWidth="3" 
      />

      {/* Viewfinder Scan Corners (Cyan Accent) */}
      <path d="M21 27V23C21 21.8954 21.8954 21 23 21H27" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M43 27V23C43 21.8954 42.1046 21 41 21H37" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M21 39V43C21 44.1046 21.8954 45 23 45H27" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M43 39V43C43 44.1046 42.1046 45 41 45H37" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" />

      {/* Center Verified Checkmark */}
      <path 
        d="M25 33L29.5 37.5L39 28" 
        stroke="#FFFFFF" 
        strokeWidth="3.2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />

      {/* Subtle Laser Beam */}
      <line x1="16" y1="33" x2="48" y2="33" stroke="url(#scanly-laser-comp)" strokeWidth="1.5" strokeLinecap="round" />

      {/* Luggage Bottom Wheels */}
      <circle cx="21" cy="54" r="2" fill="#93C5FD" />
      <circle cx="43" cy="54" r="2" fill="#93C5FD" />
    </svg>
  );
}
