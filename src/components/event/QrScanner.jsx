import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Camera, Zap, Activity } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const QrScanner = ({ onScan, onError, isScanning }) => {
    const [error, setError] = useState(null);
    const [hasPermission, setHasPermission] = useState(null);
    const [scanMetrics, setScanMetrics] = useState({ fps: 0, ms: 0 });
    const scannerRef = useRef(null);
    const scannerInstanceRef = useRef(null);
    const lastScanTimeRef = useRef(0);
    const frameCountRef = useRef(0);
    const lastFpsTimeRef = useRef(Date.now());

    // Performance monitoring loop
    useEffect(() => {
        if (!isScanning) return;
        
        const interval = setInterval(() => {
            const now = Date.now();
            const elapsed = now - lastFpsTimeRef.current;
            
            if (elapsed >= 1000) {
                setScanMetrics({
                    fps: Math.round((frameCountRef.current * 1000) / elapsed),
                    ms: elapsed / Math.max(1, frameCountRef.current)
                });
                frameCountRef.current = 0;
                lastFpsTimeRef.current = now;
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isScanning]);

    const handleScanSuccess = useCallback((decodedText, decodedResult) => {
        // Debounce highly rapid duplicate scans if needed, but 'continuous scanning' requested
        // We limit reporting slightly to avoid UI freezing
        const now = Date.now();
        if (now - lastScanTimeRef.current < 500) return; // 500ms debounce
        lastScanTimeRef.current = now;

        // Vibration Feedback
        if (navigator.vibrate) {
            navigator.vibrate([50, 50, 50]); // Success pattern
        }

        if (onScan) {
            onScan(decodedText);
        }
    }, [onScan]);

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

            // Cleanup previous instance if any
            if (scannerInstanceRef.current) {
                try {
                    await scannerInstanceRef.current.stop();
                    scannerInstanceRef.current.clear();
                } catch (e) {
                    console.warn("Cleanup error", e);
                }
            }

            // Initialize scanner instance with optimized formats
            const html5QrCode = new Html5Qrcode("reader", {
                verbose: false,
                formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ] // Limit to QR for speed
            });
            scannerInstanceRef.current = html5QrCode;

            // Camera config for speed
            const config = {
                fps: 30, // Increased FPS from 10 to 30
                qrbox: { width: 200, height: 200 }, // Reduced qrbox for focused/faster processing
                aspectRatio: 1.0,
                disableFlip: false,
                videoConstraints: {
                    facingMode: "environment",
                    width: { min: 640, ideal: 1280, max: 1920 }, // Prefer HD for clarity but fallback
                    height: { min: 480, ideal: 720, max: 1080 },
                    focusMode: "continuous" // Attempt to force continuous focus
                }
            };

            await html5QrCode.start(
                { facingMode: "environment" }, 
                config,
                (decodedText, decodedResult) => {
                    frameCountRef.current++; // Track performance
                    handleScanSuccess(decodedText, decodedResult);
                },
                (errorMessage) => {
                    frameCountRef.current++; // Track performance even on failure (frame processed)
                    // Ignore standard scanning errors
                }
            );
            
            // Attempt to enable torch/flashlight if available (advanced)
            // Note: This API is experimental in some browsers
            try {
                const track = html5QrCode.getRunningTrackCameraCapabilities();
                if (track && track.torch) {
                    // Could add UI toggle for flashlight here
                }
            } catch (e) {
                // Ignore capability errors
            }

        } catch (err) {
            console.error("Failed to start scanner:", err);
            setError("Impossible d'accéder à la caméra. Vérifiez vos permissions.");
            setHasPermission(false);
            if (onError) onError(err);
        }
    };

    useEffect(() => {
        if (!isScanning) {
            if (scannerInstanceRef.current) {
                scannerInstanceRef.current.stop().then(() => {
                    scannerInstanceRef.current.clear();
                    scannerInstanceRef.current = null;
                }).catch(console.error);
            }
            return;
        }

        const timer = setTimeout(() => {
            initializeScanner();
        }, 300); // Slight delay for mount stability

        return () => clearTimeout(timer);
    }, [isScanning, handleScanSuccess]);

    return (
        <div className="w-full max-w-sm mx-auto relative rounded-xl overflow-hidden bg-black aspect-square shadow-2xl border-2 border-primary/20 group">
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
                    <div className="absolute inset-0 pointer-events-none border-[40px] border-black/60 transition-all duration-300 group-hover:border-black/50">
                        {/* Scanner Frame */}
                        <div className="absolute inset-0 border-2 border-primary/80 opacity-80 animate-pulse shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                        
                        {/* Target Crosshair - Helping focus center */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-[1px] bg-primary/30"></div>
                            <div className="absolute top-1/2 left-0 -translate-y-1/2 w-full h-[1px] bg-primary/30"></div>
                        </div>

                        {/* Corners */}
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary -mt-1 -ml-1"></div>
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary -mt-1 -mr-1"></div>
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary -mb-1 -ml-1"></div>
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary -mb-1 -mr-1"></div>
                    </div>

                    <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none gap-2 px-4">
                        <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10">
                            <Camera className="w-3 h-3 text-primary animate-pulse" />
                            <span className="text-white text-[10px] font-medium uppercase tracking-wider">
                                Scan Rapide Actif
                            </span>
                        </div>
                        
                        {scanMetrics.fps > 0 && (
                            <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10">
                                <Activity className="w-3 h-3 text-green-400" />
                                <span className="text-white text-[10px] font-mono">
                                    {scanMetrics.fps} FPS
                                </span>
                            </div>
                        )}
                    </div>
                    
                    {/* Visual Flash Effect on Scan */}
                    <div id="scan-flash" className="absolute inset-0 bg-white opacity-0 pointer-events-none transition-opacity duration-200"></div>
                </>
            )}
        </div>
    );
};

export default QrScanner;