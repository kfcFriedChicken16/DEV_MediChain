'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWallet } from '@/context/WalletContext';
import ConnectWallet from './ConnectWallet';
import LanguageSelector from './LanguageSelector';
import TranslatedText from './TranslatedText';

const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { isConnected, userType } = useWallet();


  // Define navigation links based on user type
  const getNavLinks = () => {
    if (!isConnected || !userType) {
      return [];
    }

    if (userType === 'patient') {
      return [
        { name: 'Patient Dashboard', href: '/patient/dashboard' },
        { name: 'Records', href: '/records' },
        { name: 'Access Control', href: '/access' },
        { name: 'Emergency Settings', href: '/emergency' }
      ];
    } else {
      return [
        { name: 'Provider Dashboard', href: '/provider/dashboard' },
        { name: 'Patients', href: '/provider/patients' },
        { name: 'Access Requests', href: '/provider/requests' },
        { name: 'Emergency Access', href: '/emergency-access' },
        { name: 'ZK Emergency', href: '/emergency-access-zk' }
      ];
    }
  };

  const navLinks = getNavLinks();

  // No developer tools links needed

  // Add help link
  const helpLink = { name: 'Help', href: '/help' };

  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-xl font-bold text-blue-600">
                MediDrop
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    pathname === link.href
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  <TranslatedText>{link.name}</TranslatedText>
                </Link>
              ))}
              
              {/* Help link */}
              <Link
                href={helpLink.href}
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  pathname === helpLink.href
                    ? 'border-blue-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                <TranslatedText>{helpLink.name}</TranslatedText>
              </Link>


            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center space-x-4">
            <LanguageSelector />
            <ConnectWallet />
          </div>
          <div className="flex items-center sm:hidden">
            <ConnectWallet />
          </div>
        </div>
      </div>

      {/* Mobile menu, show/hide based on menu state */}
      <div className="sm:hidden">
        <div className="pt-2 pb-3 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                pathname === link.href
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              <TranslatedText>{link.name}</TranslatedText>
            </Link>
          ))}
          
          {/* Help link for mobile */}
          <Link
            href={helpLink.href}
            className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
              pathname === helpLink.href
                ? 'bg-blue-50 border-blue-500 text-blue-700'
                : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            <TranslatedText>{helpLink.name}</TranslatedText>
          </Link>


        </div>
      </div>
    </nav>
  );
};

export default Navbar; 