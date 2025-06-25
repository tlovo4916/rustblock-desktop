import React from 'react';

interface DeviceBoardIconProps {
  style?: React.CSSProperties;
  className?: string;
}

const DeviceBoardIcon: React.FC<DeviceBoardIconProps> = ({ style, className }) => {
  return (
    <svg 
      className={className}
      viewBox="0 0 24 24" 
      version="1.1" 
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      fill="currentColor"
      style={{ verticalAlign: '-0.125em', ...style }}
    >
      <path d="M5 7C5 6.44772 5.44772 6 6 6H18C18.5523 6 19 6.44772 19 7V17C19 17.5523 18.5523 18 18 18H6C5.44772 18 5 17.5523 5 17V7Z" stroke="currentColor" strokeWidth="2" fill="none"/>
      <path d="M8 6V4M12 6V4M16 6V4M8 18V20M12 18V20M16 18V20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="9" cy="10" r="1" fill="currentColor"/>
      <circle cx="15" cy="10" r="1" fill="currentColor"/>
      <rect x="10" y="13" width="4" height="2" rx="0.5" fill="currentColor"/>
    </svg>
  );
};

export default DeviceBoardIcon;