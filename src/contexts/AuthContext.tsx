import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { auth } from '../firebase';

interface User {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Set persistence to LOCAL (survives browser restarts)
    setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.error('Persistence Error:', error);
    });

    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChanged(auth, 
      (user) => {
        if (user) {
          const { uid, displayName, email, photoURL } = user;
          setUser({ uid, displayName, email, photoURL });
        } else {
          setUser(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Auth State Change Error:', error);
        setError(error.message);
        setLoading(false);
      }
    );

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setError(null);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error('Google Sign-In Error:', error);
      setError(error.message);
      throw error;
    }
  };

  const signOutUser = async () => {
    try {
      setError(null);
      await signOut(auth);
    } catch (error: any) {
      console.error('Sign Out Error:', error);
      setError(error.message);
      throw error;
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        loading,
        error,
        signInWithGoogle, 
        signOutUser 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
