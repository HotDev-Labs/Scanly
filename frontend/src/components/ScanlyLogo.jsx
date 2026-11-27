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
      {/* Solid Blue Squircle Backdrop */}
      <rect width="64" height="64" rx="16" fill="#1E40AF" />

      {/* Luggage Top Handle */}
      <path 
        d="M24 14V11C24 9.34315 25.3431 8 27 8H37C38.6569 8 40 9.34315 40 11V14" 
        stroke="#FFFFFF" 
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
        fillOpacity="0.15" 
        stroke="#FFFFFF" 
        strokeWidth="3" 
      />

      {/* Viewfinder Scan Corners (Solid White) */}
      <path d="M21 27V23C21 21.8954 21.8954 21 23 21H27" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M43 27V23C43 21.8954 42.1046 21 41 21H37" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M21 39V43C21 44.1046 21.8954 45 23 45H27" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M43 39V43C43 44.1046 42.1046 45 41 45H37" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />

      {/* Center Verified Checkmark */}
      <path 
        d="M25 33L29.5 37.5L39 28" 
        stroke="#FFFFFF" 
        strokeWidth="3.2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />

      {/* Luggage Bottom Wheels */}
      <circle cx="21" cy="54" r="2.5" fill="#FFFFFF" />
      <circle cx="43" cy="54" r="2.5" fill="#FFFFFF" />
    </svg>
  );
}
