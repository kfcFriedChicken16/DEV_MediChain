import React from 'react';

interface WalletIconProps {
  className?: string;
}

const WalletIcon: React.FC<WalletIconProps> = ({ className }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M2.273 5.625A4.483 4.483 0 0 1 5.25 4.5h13.5c1.141 0 2.183.425 2.977 1.125A3 3 0 0 0 18.75 3H5.25a3 3 0 0 0-2.977 2.625ZM2.273 8.625A4.483 4.483 0 0 1 5.25 7.5h13.5c1.141 0 2.183.425 2.977 1.125A3 3 0 0 0 18.75 6H5.25a3 3 0 0 0-2.977 2.625ZM5.25 9a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h13.5a3 3 0 0 0 3-3v-6a3 3 0 0 0-3-3H15a.75.75 0 0 0-.75.75v.75c0 .716-.43 1.334-1.05 1.605a2.25 2.25 0 0 1-1.95 0A1.875 1.875 0 0 1 10.5 10.5V9.75A.75.75 0 0 0 9.75 9H5.25Z" />
    </svg>
  );
};

export default WalletIcon; 