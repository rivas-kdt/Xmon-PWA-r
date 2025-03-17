// components/qr-scanner.tsx

"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { Html5Qrcode } from "html5-qrcode"

interface QrScannerProps {
  onScan: (data: string) => void
  onClose: () => void
}

export default function QrScanner({ onScan, onClose }: QrScannerProps) {
  const [error, setError] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isScanning, setIsScanning] = useState(false)

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return

    let scanner: Html5Qrcode | null = null
    const qrCodeId = "qr-reader"

    const startScanner = async () => {
      try {
        if (!containerRef.current) return

        // Clear any existing content
        containerRef.current.innerHTML = ""

        // Create a div for the scanner
        const qrContainer = document.createElement("div")
        qrContainer.id = qrCodeId
        qrContainer.style.width = "100%"
        qrContainer.style.height = "100%"
        containerRef.current.appendChild(qrContainer)

        // Initialize scanner
        scanner = new Html5Qrcode(qrCodeId)
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            // On successful scan
            setIsScanning(false)

            // Safely stop scanner before calling onScan
            if (scanner) {
              scanner
                .stop()
                .then(() => {
                  onScan(decodedText)
                })
                .catch((error) => {
                  console.error("Error stopping scanner after scan:", error)
                  // Still call onScan even if stopping fails
                  onScan(decodedText)
                })
            } else {
              onScan(decodedText)
            }
          },
          (errorMessage) => {
            // Errors during scanning are not shown to the user
            console.log(errorMessage)
          },
        )

        setIsScanning(true)
      } catch (err) {
        console.error("Error starting QR scanner:", err)
        setError("Unable to access camera. Please ensure you have granted camera permissions.")
      }
    }

    startScanner()

    // Cleanup
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.stop().catch((error) => console.error("Error stopping scanner during cleanup:", error))
        } catch (e) {
          console.error("Error in cleanup:", e)
        }
      }
    }
  }, [onScan])

  const handleClose = () => {
    setIsScanning(false)

    // Safely stop scanner before calling onClose
    if (scannerRef.current) {
      try {
        scannerRef.current
          .stop()
          .then(() => {
            onClose()
          })
          .catch((error) => {
            console.error("Error stopping scanner on close:", error)
            // Still call onClose even if stopping fails
            onClose()
          })
      } catch (e) {
        console.error("Error in handleClose:", e)
        onClose()
      }
    } else {
      onClose()
    }
  }

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" className="absolute top-0 right-0 z-10" onClick={handleClose}>
        <X className="h-6 w-6" />
      </Button>

      <div className="flex flex-col items-center">
        <div className="relative w-full max-w-sm aspect-square border-2 border-dashed border-primary rounded-lg overflow-hidden flex items-center justify-center">
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
              <p className="text-destructive">{error}</p>
            </div>
          ) : (
            <div
              ref={containerRef}
              className="w-full h-full flex items-center justify-center"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            />
          )}

          {/* Overlay scanning frame */}
          <div className="absolute pointer-events-none w-3/4 h-3/4 border-2 border-primary rounded-lg"></div>
        </div>
        <p className="mt-4 text-center text-sm text-muted-foreground">Position the QR code within the frame to scan</p>
      </div>
    </div>
  )
}

