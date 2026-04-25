// contexts/ServiceWorkerContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';

const ServiceWorkerContext = createContext(null);

export const useServiceWorker = () => {
  const context = useContext(ServiceWorkerContext);
  if (!context) {
    throw new Error('useServiceWorker must be used within ServiceWorkerProvider');
  }
  return context;
};

export const ServiceWorkerProvider = ({ children }) => {
  const [swReady, setSwReady] = useState(false);
  const [registration, setRegistration] = useState(null);

  useEffect(() => {
    const registerSW = async () => {
      if (!('serviceWorker' in navigator)) return;
      
      try {
        // Vérifier si déjà enregistré
        const existingReg = await navigator.serviceWorker.getRegistration();
        
        let reg;
        if (existingReg) {
          reg = existingReg;
          console.log('✅ SW déjà enregistré');
        } else {
          reg = await navigator.serviceWorker.register('/sw.js');
          console.log('✅ SW enregistré:', reg.scope);
        }
        
        // Attendre que le SW soit prêt
        if (reg.installing) {
          console.log('⏳ Installation SW...');
          await new Promise((resolve) => {
            reg.installing.addEventListener('statechange', (e) => {
              if (e.target.state === 'activated') {
                resolve();
              }
            });
          });
        }
        
        // Attendre que le SW soit actif
        const readyReg = await navigator.serviceWorker.ready;
        setRegistration(readyReg);
        setSwReady(true);
        console.log('✅ SW prêt à l\'emploi');
        
      } catch (error) {
        console.error('❌ Erreur SW:', error);
      }
    };
    
    registerSW();
  }, []);

  return (
    <ServiceWorkerContext.Provider value={{ swReady, registration }}>
      {children}
    </ServiceWorkerContext.Provider>
  );
};