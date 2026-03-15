import { useState, useEffect } from 'react';

/**
 * Hook personnalisé pour gérer l'état de déverrouillage du portefeuille.
 * Implémente la persistance via sessionStorage avec une expiration de 15 minutes.
 */
export const useWalletPin = (userId) => {
    const [isUnlocked, setIsUnlocked] = useState(false);

    useEffect(() => {
        if (!userId) return;
        
        const key = `walletPinUnlocked_${userId}`;
        const stored = sessionStorage.getItem(key);
        
        if (stored) {
            try {
                const { timestamp } = JSON.parse(stored);
                // Vérifier si le timestamp n'est pas dépassé (15 minutes = 15 * 60 * 1000 = 900000 ms)
                if (Date.now() - timestamp < 900000) {
                    setIsUnlocked(true);
                } else {
                    // Expiré
                    sessionStorage.removeItem(key);
                    setIsUnlocked(false);
                }
            } catch (e) {
                sessionStorage.removeItem(key);
                setIsUnlocked(false);
            }
        }
    }, [userId]);

    const unlock = () => {
        if (!userId) return;
        const key = `walletPinUnlocked_${userId}`;
        sessionStorage.setItem(key, JSON.stringify({ timestamp: Date.now() }));
        setIsUnlocked(true);
    };

    const lock = () => {
        if (!userId) return;
        const key = `walletPinUnlocked_${userId}`;
        sessionStorage.removeItem(key);
        setIsUnlocked(false);
    };

    return { isUnlocked, unlock, lock };
};