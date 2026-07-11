import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function QrScanner({ isScanning, onScan }) {
  const scannerRef = useRef(null);
  const isRunningRef = useRef(false);
  const lastScanRef = useRef({ code: '', time: 0 });
  const isProcessingRef = useRef(false);
  const elementId = "qr-reader";
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const containerRef = useRef(null);
  const isMountedRef = useRef(true);

  // 🔥 INITIALISATION DU SCANNER
  useEffect(() => {
    isMountedRef.current = true;

    const element = document.getElementById(elementId);
    if (!element) {
      console.warn('⚠️ Élément QR reader non trouvé');
      return;
    }

    // Nettoyer l'ancienne instance
    const cleanupOldScanner = async () => {
      if (scannerRef.current) {
        if (isRunningRef.current) {
          try {
            await scannerRef.current.stop();
            isRunningRef.current = false;
          } catch (e) {
            console.warn('⚠️ Erreur arrêt ancien scanner:', e);
          }
        }
        try {
          scannerRef.current.clear();
        } catch (e) {
          console.warn('⚠️ Erreur nettoyage ancien scanner:', e);
        }
        scannerRef.current = null;
      }
    };

    cleanupOldScanner().then(() => {
      if (!isMountedRef.current) return;
      
      try {
        scannerRef.current = new Html5Qrcode(elementId);
        setIsReady(true);
        setError(null);
        console.log('✅ Scanner initialisé');
      } catch (err) {
        console.error('❌ Erreur initialisation scanner:', err);
        setError("Impossible d'initialiser la caméra");
      }
    });

    return () => {
      isMountedRef.current = false;
      // 🔥 Nettoyage avec protection
      const cleanup = async () => {
        if (isRunningRef.current) {
          try {
            await scannerRef.current?.stop();
          } catch (e) {
            console.warn('⚠️ Erreur arrêt scanner:', e);
          }
          isRunningRef.current = false;
        }
        
        if (scannerRef.current) {
          try {
            // 🔥 Vérifier que le DOM existe encore
            const elementExists = document.getElementById(elementId);
            if (elementExists) {
              scannerRef.current.clear();
            }
          } catch (e) {
            console.warn('⚠️ Erreur nettoyage scanner:', e);
          }
          scannerRef.current = null;
        }
        setIsReady(false);
      };

      cleanup();
    };
  }, []);

  // 🔥 GESTION DU SCAN AVEC ANTI-SPAM
  const handleScan = useCallback((decodedText) => {
    const now = Date.now();
    const lastScan = lastScanRef.current;
    
    if (decodedText === lastScan.code && (now - lastScan.time) < 2000) {
      console.log('⏳ Scan ignoré (anti-spam):', decodedText);
      return;
    }
    
    if (isProcessingRef.current) {
      console.log('⏳ Scan en cours de traitement...');
      return;
    }

    lastScanRef.current = { code: decodedText, time: now };
    isProcessingRef.current = true;

    console.log('📷 Scan détecté:', decodedText);

    try {
      onScan(decodedText);
    } catch (error) {
      console.error('❌ Erreur dans onScan:', error);
    }

    setTimeout(() => {
      isProcessingRef.current = false;
    }, 1500);
  }, [onScan]);

  // 🔥 DÉMARRER LE SCANNER
  const startScanner = useCallback(async () => {
    if (!scannerRef.current || !isReady || isStarting || isRunningRef.current) {
      console.log('⏳ Impossible de démarrer le scanner:', {
        hasScanner: !!scannerRef.current,
        isReady,
        isStarting,
        isRunning: isRunningRef.current
      });
      return;
    }

    setIsStarting(true);
    setError(null);

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0
    };

    try {
      // Essayer d'abord la caméra arrière
      await scannerRef.current.start(
        { facingMode: "environment" },
        config,
        handleScan
      );
      
      if (!isMountedRef.current) return;
      
      isRunningRef.current = true;
      setIsStarting(false);
      console.log('✅ Scanner prêt (caméra arrière)');
    } catch (err) {
      console.warn('⚠️ Erreur caméra arrière:', err);
      
      if (!isMountedRef.current || !scannerRef.current) return;
      
      // Fallback sur caméra avant
      try {
        await scannerRef.current.start(
          { facingMode: "user" },
          config,
          handleScan
        );
        
        if (!isMountedRef.current) return;
        
        isRunningRef.current = true;
        setIsStarting(false);
        console.log('✅ Scanner prêt (caméra avant)');
      } catch (err2) {
        console.error('❌ Erreur démarrage scanner:', err2);
        if (isMountedRef.current) {
          setError("Impossible d'accéder à la caméra. Vérifiez les permissions.");
          setIsStarting(false);
          isRunningRef.current = false;
        }
      }
    }
  }, [isReady, isStarting, handleScan]);

  // 🔥 ARRÊTER LE SCANNER
  const stopScanner = useCallback(async () => {
    if (!scannerRef.current) {
      console.log('⏳ Scanner inexistant');
      return;
    }

    if (!isRunningRef.current) {
      console.log('⏳ Scanner déjà arrêté');
      return;
    }

    console.log('⏹ Arrêt du scanner...');
    
    try {
      await scannerRef.current.stop();
      isRunningRef.current = false;
      lastScanRef.current = { code: '', time: 0 };
      console.log('✅ Scanner arrêté avec succès');
    } catch (err) {
      console.warn('⚠️ Erreur arrêt scanner:', err);
      // Même en cas d'erreur, considérer que le scanner est arrêté
      isRunningRef.current = false;
    }
  }, []);

  // 🔥 GESTION DU SCAN (démarrage/arrêt)
  useEffect(() => {
    // Petit délai pour éviter les conflits
    const timeoutId = setTimeout(() => {
      if (isScanning && !isRunningRef.current && isReady) {
        startScanner();
      }

      if (!isScanning && isRunningRef.current) {
        stopScanner();
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isScanning, isReady, startScanner, stopScanner]);

  // 🔥 GESTION DE LA VISIBILITÉ DE LA PAGE
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isRunningRef.current) {
        stopScanner();
      } else if (!document.hidden && isScanning && !isRunningRef.current && isReady) {
        // Petit délai pour éviter les conflits
        setTimeout(() => startScanner(), 300);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isScanning, isReady, startScanner, stopScanner]);

  // 🔥 RÉINITIALISER LE SCANNER EN CAS D'ERREUR
  const retryScanner = useCallback(async () => {
    setError(null);
    setError(null);
    
    // Arrêter complètement
    await stopScanner();
    
    // Réinitialiser
    setIsReady(false);
    
    // Recréer l'instance
    const element = document.getElementById(elementId);
    if (element && scannerRef.current) {
      try {
        scannerRef.current.clear();
      } catch (e) {}
      scannerRef.current = null;
    }
    
    // Attendre un peu et réinitialiser
    setTimeout(() => {
      if (!isMountedRef.current) return;
      
      try {
        if (document.getElementById(elementId)) {
          scannerRef.current = new Html5Qrcode(elementId);
          setIsReady(true);
        }
      } catch (err) {
        console.error('❌ Erreur réinitialisation:', err);
        setError("Impossible de réinitialiser la caméra");
      }
    }, 300);
  }, [stopScanner]);

  // 🔥 GESTION DE LA FERMETURE DU DIALOG
  useEffect(() => {
    if (!isScanning && isRunningRef.current) {
      stopScanner();
    }
  }, [isScanning, stopScanner]);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <div id={elementId} className="w-full h-full" />
      
      {/* Indicateur de chargement */}
      {isStarting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
        </div>
      )}
      
      {/* Message d'erreur */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-4">
          <p className="text-red-400 text-sm text-center">{error}</p>
          <button 
            className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm transition-colors"
            onClick={retryScanner}
          >
            Réessayer
          </button>
        </div>
      )}
    </div>
  );
}