import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  LogOut, 
  User,
  CreditCard
} from 'lucide-react';

export const LoginButton: React.FC = () => {
  const { user, signInWithGoogle, signOutUser } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        buttonRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (user) {
    return (
      <div className="relative inline-block">
        <div 
          ref={buttonRef}
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="cursor-pointer"
        >
          {user.photoURL ? (
            <img 
              src={user.photoURL} 
              alt="User Avatar" 
              className="w-8 h-8 rounded-full cursor-pointer object-cover"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement.querySelector('.fallback-icon').style.display = 'flex';
              }}
            />
          ) : (
            <div className="fallback-icon w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center cursor-pointer">
              <User className="w-5 h-5 text-gray-500" />
            </div>
          )}
        </div>

        {isDropdownOpen && (
          <div 
            ref={dropdownRef}
            className="absolute text-primary top-full right-0 mt-2 w-64 bg-[#2c2c3a] 
            border border-gray-700 rounded-lg shadow-lg py-2 z-50"
          >
            <div 
              className="px-4 py-2 hover:bg-[#363646] flex items-center cursor-pointer"
              onClick={() => setIsDropdownOpen(false)}
            >
              <User className="mr-3 w-5 h-5 text-primary" />
              <span className="text-primary">Profile</span>
            </div>
            
            <div 
              className="px-4 py-2 hover:bg-[#363646] flex items-center cursor-pointer"
              onClick={() => setIsDropdownOpen(false)}
            >
              <CreditCard className="mr-3 w-5 h-5 text-primary" />
              <span className="text-primary">Manage Subscription</span>
            </div>
            
            <div 
              className="px-4 py-2 hover:bg-red-900 flex items-center cursor-pointer text-red-400"
              onClick={() => {
                signOutUser();
                setIsDropdownOpen(false);
              }}
            >
              <LogOut className="mr-3 w-5 h-5" />
              <span>Logout</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={signInWithGoogle}
      className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
    >
      <svg className="w-5 h-5" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
        <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
        <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
      </svg>
      <span>Login with Google</span>
    </button>
  );
};
