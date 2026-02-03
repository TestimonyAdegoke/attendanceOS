"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface QRScannerProps {
  onScan: (code: string) => void;
  onError?: (error: string) => void;
}

export function QRScanner({ onScan, onError }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    const startScanner = async () => {
      if (!containerRef.current || isStarted) return;

      try {
        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            onScan(decodedText);
          },
          () => {}
        );

        setIsStarted(true);
      } catch (err) {
        console.error("QR Scanner error:", err);
        setPermissionDenied(true);
        onError?.("Camera access denied or not available");
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current && isStarted) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [onScan, onError, isStarted]);

  if (permissionDenied) {
    return (
      <div className="w-80 h-80 border-4 border-dashed border-red-300 rounded-2xl flex items-center justify-center">
        <div className="text-center text-red-500 p-4">
          <p className="font-medium">Camera Access Denied</p>
          <p className="text-sm mt-2">Please allow camera access to scan QR codes</p>
        </div>
      </div>
    );
  }

  return (
    <div
      id="qr-reader"
      ref={containerRef}
      className="w-80 h-80 rounded-2xl overflow-hidden"
    />
  );
}
