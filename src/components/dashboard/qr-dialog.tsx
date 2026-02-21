"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Person {
  id: string;
  full_name: string;
  checkin_code: string;
}

interface QRCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person: Person | null;
}

export function QRCodeDialog({ open, onOpenChange, person }: QRCodeDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!open || !person) return;

    let cancelled = false;
    const draw = async () => {
      // Dialog content mounts after open; defer to ensure <canvas> exists.
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      if (cancelled) return;
      if (!canvasRef.current) return;

      const qrData = `attend://person/${person.checkin_code}`;
      await QRCode.toCanvas(canvasRef.current, qrData, {
        width: 256,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });
    };

    draw();
    return () => {
      cancelled = true;
    };
  }, [open, person]);

  const handleDownload = () => {
    if (!canvasRef.current || !person) return;
    const url = canvasRef.current.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${person.full_name.replace(/\s+/g, "_")}_qr.png`;
    a.click();
  };

  const handlePrint = () => {
    if (!canvasRef.current || !person) return;
    const url = canvasRef.current.toDataURL("image/png");
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Badge - ${person.full_name}</title>
            <style>
              body { 
                display: flex; 
                flex-direction: column; 
                align-items: center; 
                justify-content: center; 
                min-height: 100vh; 
                margin: 0; 
                font-family: system-ui, sans-serif;
              }
              .badge {
                text-align: center;
                padding: 2rem;
                border: 2px solid #e5e7eb;
                border-radius: 1rem;
              }
              h1 { margin: 1rem 0 0.5rem; font-size: 1.5rem; }
              p { margin: 0; color: #6b7280; font-size: 0.875rem; }
            </style>
          </head>
          <body>
            <div class="badge">
              <img src="${url}" alt="QR Code" />
              <h1>${person.full_name}</h1>
              <p>Scan to check in</p>
            </div>
            <script>window.onload = () => { window.print(); window.close(); }</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  if (!person) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>QR Badge</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center py-4">
          <canvas ref={canvasRef} className="rounded-lg" />
          <h3 className="mt-4 text-lg font-semibold">{person.full_name}</h3>
          <p className="text-sm text-muted-foreground">Scan to check in</p>
          <div className="mt-6 flex gap-2">
            <Button variant="outline" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
