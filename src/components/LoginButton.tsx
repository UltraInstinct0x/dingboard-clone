import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Settings, 
  LogOut, 
  User, 
  Moon, 
  Sun, 
  Palette 
} from 'lucide-react';

export const LoginButton: React.FC = () => {
  const { user, signInWithGoogle, signOutUser } = useAuth();
  const [isHovered, setIsHovered] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  if (user) {
    return (
      <div 
        className="relative inline-block"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {user.photoURL ? (
          <img 
            src={user.photoURL} 
            alt="User Avatar" 
            className="w-8 h-8 rounded-full cursor-pointer object-cover"
            onError={(e) => {
              e.currentTarget.onerror = null; // Prevent infinite loop
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement.querySelector('.fallback-icon').style.display = 'flex';
            }}
          />
        ) : null}
        <div 
          className="fallback-icon w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center cursor-pointer"
          style={{ display: user.photoURL ? 'none' : 'flex' }}
        >
          <User className="w-5 h-5 text-gray-500" />
        </div>

        {isHovered && (
          <div 
            className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-gray-800 
            border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg 
            py-2 z-50"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 
              flex items-center cursor-pointer">
              <User className="mr-3 w-5 h-5" />
              <span>Profile</span>
            </div>
            
            <div className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 
              flex items-center cursor-pointer"
              onClick={() => setIsDarkMode(!isDarkMode)}
            >
              {isDarkMode ? (
                <Sun className="mr-3 w-5 h-5" />
              ) : (
                <Moon className="mr-3 w-5 h-5" />
              )}
              <span>
                {isDarkMode ? 'Light Mode' : 'Dark Mode'}
              </span>
            </div>
            
            <div className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 
              flex items-center cursor-pointer">
              <Palette className="mr-3 w-5 h-5" />
              <span>Customize</span>
            </div>
            
            <div 
              className="px-4 py-2 hover:bg-red-100 dark:hover:bg-red-900 
              flex items-center cursor-pointer text-red-600 dark:text-red-400"
              onClick={signOutUser}
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
      className="text-white bg-[#4285F4] hover:bg-[#357ae8] px-4 py-2 rounded-lg flex items-center space-x-2"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
        <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
        <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
      </svg>
      <span>Login with Google</span>
    </button>
  );
};
