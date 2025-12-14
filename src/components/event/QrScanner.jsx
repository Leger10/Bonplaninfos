import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Camera, X } from 'lucide-react';

const QrScanner = ({ onScan, onError, isScanning }) => {
    const [error, setError] = useState(null);
    const [hasPermission, setHasPermission] = useState(null);
    const scannerRef = useRef(null);
    const scannerInstanceRef = useRef(null);

    useEffect(() => {
        if (!isScanning) return;

        const initializeScanner = async () => {
            try {
                // Check for cameras
                const devices = await Html5Qrcode.getCameras();
                if (!devices || devices.length === 0) {
                    setError("Aucune caméra détectée sur cet appareil.");
                    setHasPermission(false);
                    if (onError) onError("No camera found");
                    return;
                }

                setHasPermission(true);
                setError(null);

                // Initialize scanner instance
                const html5QrCode = new Html5Qrcode("reader");
                scannerInstanceRef.current = html5QrCode;

                await html5QrCode.start(
                    { facingMode: "environment" }, // Prefer back camera
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0
                    },
                    (decodedText, decodedResult) => {
                        // Success callback
                        if (onScan) {
                            onScan(decodedText);
                            // Optional: Pause scanner to prevent duplicate scans immediately
                            // html5QrCode.pause(); 
                        }
                    },
                    (errorMessage) => {
                        // Ignore standard scanning errors (no QR code found in frame)
                    }
                );
            } catch (err) {
                console.error("Failed to start scanner:", err);
                setError("Impossible d'accéder à la caméra. Vérifiez vos permissions.");
                setHasPermission(false);
                if (onError) onError(err);
            }
        };

        // Small delay to ensure DOM element is ready
        const timer = setTimeout(() => {
            initializeScanner();
        }, 100);

        return () => {
            clearTimeout(timer);
            if (scannerInstanceRef.current) {
                scannerInstanceRef.current.stop().then(() => {
                    scannerInstanceRef.current.clear();
                    scannerInstanceRef.current = null;
                }).catch(err => {
                    console.error("Failed to stop scanner", err);
                });
            }
        };
    }, [isScanning, onScan, onError]);

    return (
        <div className="w-full max-w-sm mx-auto relative rounded-xl overflow-hidden bg-black aspect-square shadow-2xl border-2 border-primary/20">
            {error ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gray-900">
                    <AlertCircle className="w-12 h-12 text-destructive mb-4" />
                    <p className="text-white mb-4">{error}</p>
                    <Button variant="outline" onClick={() => window.location.reload()}>Réessayer</Button>
                </div>
            ) : (
                <>
                    <div id="reader" className="w-full h-full" />
                    
                    {/* Overlay UI */}
                    <div className="absolute inset-0 pointer-events-none border-[40px] border-black/50">
                        {/* Scanner Frame */}
                        <div className="absolute inset-0 border-2 border-primary/50 opacity-50 animate-pulse"></div>
                        {/* Corners */}
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary -mt-1 -ml-1"></div>
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary -mt-1 -mr-1"></div>
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary -mb-1 -ml-1"></div>
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary -mb-1 -mr-1"></div>
                    </div>

                    <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
                        <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2">
                            <Camera className="w-4 h-4 text-primary animate-pulse" />
                            <span className="text-white text-xs font-medium">Recherche de QR Code...</span>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default QrScanner;