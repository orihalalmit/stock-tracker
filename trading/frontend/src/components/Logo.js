import React from 'react';
import './Logo.css';

const Logo = ({ size = 32, className = '' }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 40 40" 
      className={`logo ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background Circle */}
      <circle 
        cx="20" 
        cy="20" 
        r="18" 
        fill="url(#gradientBg)"
        stroke="url(#gradientBorder)"
        strokeWidth="1"
      />
      
      {/* Chart Lines */}
      <path 
        d="M8 25 L13 18 L18 22 L23 12 L28 16 L32 10" 
        stroke="url(#gradientChart)" 
        strokeWidth="2.5" 
        fill="none" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      
      {/* Chart Points */}
      <circle cx="8" cy="25" r="2" fill="url(#gradientPoint1)" />
      <circle cx="13" cy="18" r="2" fill="url(#gradientPoint2)" />
      <circle cx="18" cy="22" r="2" fill="url(#gradientPoint3)" />
      <circle cx="23" cy="12" r="2.5" fill="url(#gradientPoint4)" />
      <circle cx="28" cy="16" r="2" fill="url(#gradientPoint5)" />
      <circle cx="32" cy="10" r="2" fill="url(#gradientPoint6)" />
      
      {/* Subtle Grid */}
      <defs>
        {/* Background Gradient */}
        <linearGradient id="gradientBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(59, 130, 246, 0.1)" />
          <stop offset="50%" stopColor="rgba(245, 158, 11, 0.1)" />
          <stop offset="100%" stopColor="rgba(139, 92, 246, 0.1)" />
        </linearGradient>
        
        {/* Border Gradient */}
        <linearGradient id="gradientBorder" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(59, 130, 246, 0.3)" />
          <stop offset="50%" stopColor="rgba(245, 158, 11, 0.4)" />
          <stop offset="100%" stopColor="rgba(139, 92, 246, 0.3)" />
        </linearGradient>
        
        {/* Chart Line Gradient */}
        <linearGradient id="gradientChart" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="30%" stopColor="#f59e0b" />
          <stop offset="70%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        
        {/* Point Gradients */}
        <radialGradient id="gradientPoint1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </radialGradient>
        
        <radialGradient id="gradientPoint2">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </radialGradient>
        
        <radialGradient id="gradientPoint3">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#059669" />
        </radialGradient>
        
        <radialGradient id="gradientPoint4">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </radialGradient>
        
        <radialGradient id="gradientPoint5">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#7c3aed" />
        </radialGradient>
        
        <radialGradient id="gradientPoint6">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#059669" />
        </radialGradient>
      </defs>
    </svg>
  );
};

export default Logo;
