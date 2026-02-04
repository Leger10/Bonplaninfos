import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function QrScanner({ isScanning, onScan }) {
  const scannerRef = useRef(null);
  const isRunningRef = useRef(false);
  const elementId = "qr-reader";

  useEffect(() => {
    scannerRef.current = new Html5Qrcode(elementId);

    return () => {
      // 🔒 CLEANUP SAFE
      if (isRunningRef.current) {
        scannerRef.current
          .stop()
          .catch(() => {})
          .finally(() => {
            isRunningRef.current = false;
          });
      }
    };
  }, []);

  useEffect(() => {
    if (!scannerRef.current) return;

    // ▶️ START SCAN
    if (isScanning && !isRunningRef.current) {
      scannerRef.current
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 250 },
          (decodedText) => {
            onScan(decodedText);
          }
        )
        .then(() => {
          isRunningRef.current = true;
        })
        .catch(() => {});
    }

    // ⏹ STOP SCAN
    if (!isScanning && isRunningRef.current) {
      scannerRef.current
        .stop()
        .then(() => {
          isRunningRef.current = false;
        })
        .catch(() => {});
    }
  }, [isScanning, onScan]);

  return <div id={elementId} className="w-full h-full" />;
}
