import React from 'react';
import './Logo.css';

const Logo = ({ size = 32, className = '' }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 32 32" 
      className={`logo ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Clean Background */}
      <rect 
        width="32" 
        height="32" 
        rx="6" 
        fill="#1e293b"
        stroke="#334155"
        strokeWidth="1"
      />
      
      {/* Simple Chart Line */}
      <path 
        d="M6 22 L10 16 L14 20 L18 12 L22 14 L26 8" 
        stroke="#3b82f6" 
        strokeWidth="2" 
        fill="none" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      
      {/* IO Dots */}
      <circle cx="8" cy="26" r="1.5" fill="#3b82f6" />
      <circle cx="24" cy="26" r="1.5" fill="#3b82f6" />
    </svg>
  );
};

export default Logo;
