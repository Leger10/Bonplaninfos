// hooks/useWalletSecurity.js

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient'; // AJOUTER CET IMPORT

export const useWalletSecurity = (userId) => {
  const [isWalletUnlocked, setIsWalletUnlocked] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    if (!userId) return;
    
    const checkStatus = () => {
      const unlocked = sessionStorage.getItem(`wallet_unlocked_${userId}`);
      setIsWalletUnlocked(unlocked === 'true');
      
      // Vérifier si le compte est verrouillé
      const lockedUntil = localStorage.getItem(`wallet_locked_${userId}`);
      if (lockedUntil) {
        const lockTime = parseInt(lockedUntil, 10);
        if (Date.now() < lockTime) {
          setIsLocked(true);
          // Déverrouiller automatiquement après expiration
          setTimeout(() => {
            localStorage.removeItem(`wallet_locked_${userId}`);
            setIsLocked(false);
          }, lockTime - Date.now());
        } else {
          localStorage.removeItem(`wallet_locked_${userId}`);
          setIsLocked(false);
        }
      }
    };
    
    checkStatus();
    
    // Vérifier si l'utilisateur a des demandes de réinitialisation approuvées
    const checkResetApproved = async () => {
      try {
        const { data } = await supabase
          .from('pin_reset_requests')
          .select('status')
          .eq('user_id', userId)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (data && data.length > 0) {
          // Une demande approuvée existe, on force l'ouverture du modal de configuration
          setShowPinModal(true);
        }
      } catch (error) {
        console.error('Error checking reset approved:', error);
      }
    };
    
    checkResetApproved();
    
    window.addEventListener('wallet_security_update', checkStatus);
    return () => window.removeEventListener('wallet_security_update', checkStatus);
  }, [userId]);

  const unlockWallet = useCallback(() => {
    if (userId) {
      sessionStorage.setItem(`wallet_unlocked_${userId}`, 'true');
      setIsWalletUnlocked(true);
      setShowPinModal(false);
      setFailedAttempts(0);
      window.dispatchEvent(new Event('wallet_security_update'));
    }
  }, [userId]);

  const openPinModal = useCallback(() => {
    setShowPinModal(true);
    setFailedAttempts(0);
  }, []);

  const closePinModal = useCallback(() => {
    setShowPinModal(false);
    setFailedAttempts(0);
  }, []);

  const incrementFailedAttempts = useCallback(() => {
    setFailedAttempts(prev => prev + 1);
  }, []);

  const lockAccount = useCallback(() => {
    const lockTime = Date.now() + 30 * 60 * 1000; // 30 minutes
    localStorage.setItem(`wallet_locked_${userId}`, lockTime.toString());
    setIsLocked(true);
    setShowPinModal(false);
    
    setTimeout(() => {
      localStorage.removeItem(`wallet_locked_${userId}`);
      setIsLocked(false);
    }, 30 * 60 * 1000);
    
    window.dispatchEvent(new Event('wallet_security_update'));
  }, [userId]);

  const lockWallet = useCallback(() => {
    if (userId) {
      sessionStorage.removeItem(`wallet_unlocked_${userId}`);
      setIsWalletUnlocked(false);
      window.dispatchEvent(new Event('wallet_security_update'));
    }
  }, [userId]);

  const resetFailedAttempts = useCallback(() => {
    setFailedAttempts(0);
  }, []);

  return {
    isWalletUnlocked,
    showPinModal,
    openPinModal,
    closePinModal,
    unlockWallet,
    lockWallet,
    failedAttempts,
    incrementFailedAttempts,
    resetFailedAttempts,
    isLocked,
    lockAccount
  };
};