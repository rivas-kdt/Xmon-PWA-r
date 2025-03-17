// components/stocked-view.tsx

"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Camera, Upload } from "lucide-react";
import QrScanner from "@/components/qr-scanner";
import { supabase } from "@/lib/supabase-client";
import { sendEmail } from "@/lib/send-email";
import { toast } from "@/hooks/use-toast";

interface StockedViewProps {
  onBack: () => void;
}

interface ScannedItem {
  id: string;
  productionNo: string;
  productCode: string;
  lotNo: string;
  description: string;
}

export default function StockedView({ onBack }: StockedViewProps) {
  const user = useAuth();
  const router = useRouter();

  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) {
      router.push("/login-mobile");
    }
  }, [user, router]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Please log in to access this page.</p>
      </div>
    );
  }

  const handleScan = (data: string) => {
    if (data) {
      setScanning(false);
      try {
        const values = data.split(",");
        if (values.length < 6) {
          toast({
            title: "Invalid QR Code",
            description: "QR code format is incorrect.",
            variant: "destructive",
          });
          return;
        }
        // Extract values according to your format:
        // First value: "production_no-some_text" → take numbers before the dash
        const productionNo = values[0].split("-")[0];
        const productCode = values[1];
        const description = values[4];
        const lotNo = values[5];

        const newItem: ScannedItem = {
          id: Date.now().toString(),
          productionNo,
          productCode,
          lotNo,
          description,
        };

        setScannedItems((prev) => [...prev, newItem]);

        toast({
          title: "QR Code Scanned",
          description: `Added item: ${productionNo}`,
        });
      } catch (error) {
        console.error("Error processing QR code:", error);
      }
    }
  };

  const handleUploadReceipt = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const receiptBase64 = event.target?.result as string;
        setReceipt(receiptBase64);
        // Store receipt in sessionStorage for later retrieval in sendEmail
        sessionStorage.setItem("receiptImage", receiptBase64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStockItems = async () => {
    if (scannedItems.length === 0) {
      toast({
        title: "No items to stock",
        description: "Please scan at least one item",
        variant: "destructive",
      });
      return;
    }

    if (!receipt) {
      toast({
        title: "No receipt uploaded",
        description: "Please upload a receipt image",
        variant: "destructive",
      });
      return;
    }

    // Retrieve selected warehouse from sessionStorage
    const selectedWarehouse = JSON.parse(sessionStorage.getItem("selectedWarehouse") || "null");
    if (!selectedWarehouse) {
      toast({
        title: "No warehouse selected",
        description: "Please select a warehouse before stocking.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const newItems: ScannedItem[] = [];
      const duplicateItems: ScannedItem[] = [];

      // For each scanned item, check if it already exists in the parts table
      for (const item of scannedItems) {
        const { data: existingData } = await supabase
          .from("parts")
          .select("production_no")
          .eq("production_no", item.productionNo)
          .single();

        if (existingData) {
          duplicateItems.push(item);
        } else {
          newItems.push(item);
        }
      }

      // If duplicates are found, warn the user and ask if they want to proceed with new items only
      if (duplicateItems.length > 0) {
        const duplicateList = duplicateItems.map((item) => item.productionNo).join(", ");
        const proceed = window.confirm(
          `The following items already exist: ${duplicateList}.\nDo you want to proceed with stocking only the new items?`
        );
        if (!proceed) {
          setLoading(false);
          return;
        }
      }

      // Process only new items
      for (const item of newItems) {
        // Insert new item into parts table
        const { error } = await supabase.from("parts").insert({
          production_no: item.productionNo,
          product_code: item.productCode,
          lot_no: item.lotNo,
          description: item.description,
          status: "stocked",
        });

        if (!error) {
          // Insert transaction history (only for new items)
          await supabase.from("transaction_history").insert({
            parts_id: item.productionNo,
            user_id: user?.user?.id,
            status: "stocked",
            notes: `Stocked by ${user?.user?.username || "unknown"}`,
          });

          // Insert parts_location (using the selected warehouse)
          await supabase.from("parts_location").insert({
            parts_id: item.productionNo,
            warehouse_id: selectedWarehouse.id,
          });
        } else {
          console.error("Error inserting into parts table:", error);
          toast({
            title: "Database Error",
            description: `Error saving item ${item.productionNo}: ${error.message}`,
            variant: "destructive",
          });
        }
      }

      // Send email only if there are new items to report
      if (newItems.length > 0) {
        try {
          const result = await sendEmail({
            subject: "New Items Stocked",
            items: newItems,
            receiptBase64: receipt,
          });

          if (!result.success) {
            toast({
              title: "Email Error",
              description: `Failed to send email: ${result.error}`,
              variant: "destructive",
            });
          } else {
            toast({
              title: "Email Sent",
              description: "Notification email sent successfully",
            });
          }
        } catch (emailError) {
          console.error("Exception sending email:", emailError);
          toast({
            title: "Email Error",
            description: "Failed to send email due to an exception",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Duplicates Found",
          description: "No new items to stock. Duplicate items were not processed.",
          variant: "destructive",
        });
      }

      toast({
        title: "Success!",
        description: `${newItems.length} new items have been stocked`,
      });

      // Reset state after successful submission
      setScannedItems([]);
      setReceipt(null);      
    } catch (error) {
      console.error("Error stocking items:", error);
      toast({
        title: "Error",
        description: "Failed to stock items. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen p-4">
      <Button variant="ghost" size="icon" onClick={onBack}>
        <ArrowLeft className="h-6 w-6" />
      </Button>
      <h1 className="text-xl font-bold ml-2">Stock Items</h1>

      {scanning ? (
        <Card className="mb-4">
          <CardContent className="p-4">
            <QrScanner onScan={handleScan} onClose={() => setScanning(false)} />
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setScanning(true)}>Scan QR Code</Button>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Production No</TableHead>
            <TableHead>Product Code</TableHead>
            <TableHead>Lot No</TableHead>
            <TableHead>Description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {scannedItems.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.productionNo}</TableCell>
              <TableCell>{item.productCode}</TableCell>
              <TableCell>{item.lotNo}</TableCell>
              <TableCell>{item.description}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleUploadReceipt} />
      <Button onClick={() => fileInputRef.current?.click()}>Upload Receipt</Button>

      {receipt && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <img src={receipt} alt="Receipt" className="w-full h-auto max-h-48 object-contain" />
          </CardContent>
        </Card>
      )}

      <Button onClick={handleStockItems} disabled={loading || scannedItems.length === 0 || !receipt}>
        {loading ? "Processing..." : "Stock Items"}
      </Button>
    </div>
  );
}

