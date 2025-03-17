// components/shipped-view.tsx

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import useAuth from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Camera, ArrowDownToLine, Loader2 } from "lucide-react"
import QrScanner from "@/components/qr-scanner"
import { supabase } from "@/lib/supabase-client"
import { sendShippedEmail } from "@/lib/send-email-shipped"
import { toast } from "@/hooks/use-toast"
import { Checkbox } from "@/components/ui/checkbox"

interface ShippedViewProps {
  onBack: () => void
}

interface WarehouseItem {
  id: string
  production_no: string
  product_code: string
  lot_no: string
  description: string
  selected?: boolean
}

export default function ShippedView({ onBack }: ShippedViewProps) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  // State for warehouse items and shipping
  const [stockedItems, setStockedItems] = useState<WarehouseItem[]>([])
  const [selectedItems, setSelectedItems] = useState<WarehouseItem[]>([])
  const [scanning, setScanning] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fetchingItems, setFetchingItems] = useState(true)
  const [highlightedItem, setHighlightedItem] = useState<string | null>(null)
  const [selectedWarehouse, setSelectedWarehouse] = useState<any>(null)

  useEffect(() => {
  if (authLoading) return; // Wait until authentication check is done

  if (!user) {
    router.push("/login-mobile"); // Redirect only when user is confirmed as null
    return;
  }

  const warehouseData = sessionStorage.getItem("selectedWarehouse");
  if (warehouseData) {
    try {
      const parsedWarehouse = JSON.parse(warehouseData);
      setSelectedWarehouse(parsedWarehouse);
    } catch (e) {
      console.error("Error parsing warehouse data:", e);
    }
  }

  fetchStockedItems();
}, [authLoading, user, router]);

  // Fetch all stocked items for the selected warehouse
  const fetchStockedItems = async () => {
    if (!user) return // Don't proceed if not authenticated

    setFetchingItems(true)
    try {
      // Get the selected warehouse from session storage
      const selectedWarehouse = JSON.parse(sessionStorage.getItem("selectedWarehouse") || "null")

      if (!selectedWarehouse) {
        toast({
          title: "No warehouse selected",
          description: "Please select a warehouse first",
          variant: "destructive",
        })
        setFetchingItems(false)
        return
      }

      // Query parts that are stocked in this warehouse
      const { data: partsLocationData, error: locationError } = await supabase
        .from("parts_location")
        .select("parts_id")
        .eq("warehouse_id", selectedWarehouse.id)

      if (locationError) {
        throw locationError
      }

      if (!partsLocationData || partsLocationData.length === 0) {
        setStockedItems([])
        setFetchingItems(false)
        return
      }

      // Get the parts IDs
      const partsIds = partsLocationData.map((item) => item.parts_id)

      // Fetch the actual parts data
      const { data: partsData, error: partsError } = await supabase
        .from("parts")
        .select("*")
        .in("production_no", partsIds)
        .eq("status", "stocked")

      if (partsError) {
        throw partsError
      }

      // Format the data for our component
      const formattedItems = (partsData || []).map((item) => ({
        id: item.production_no,
        production_no: item.production_no,
        product_code: item.product_code || "",
        lot_no: item.lot_no || "",
        description: item.description || "",
        selected: false,
      }))

      setStockedItems(formattedItems)
    } catch (error) {
      console.error("Error fetching stocked items:", error)
      toast({
        title: "Error",
        description: "Failed to fetch stocked items",
        variant: "destructive",
      })
    } finally {
      setFetchingItems(false)
    }
  }

  // Handle QR code scanning
  const handleScan = (data: string) => {
  if (!data) return;

  setScanning(false);

  try {
    // ✅ Extract production_no correctly from the scanned QR data
    const values = data.split(",");
    if (values.length < 6) {
      toast({
        title: "Invalid QR Code",
        description: "QR code format is incorrect.",
        variant: "destructive",
      });
      return;
    }

    const scannedProductionNo = values[0].split("-")[0]; // Ensure correct format extraction

    setStockedItems((prevStockedItems) => {
      // Find the scanned item in the list
      const index = prevStockedItems.findIndex((item) => item.production_no === scannedProductionNo);

      if (index !== -1) {
        const updatedStockedItems = [...prevStockedItems];
        updatedStockedItems[index] = { ...updatedStockedItems[index], selected: true }; // ✅ Check the item

        setHighlightedItem(updatedStockedItems[index].production_no); // ✅ Highlight item

        toast({
          title: "Item Found",
          description: `Scanned and selected item: ${updatedStockedItems[index].production_no}`,
        });

        return updatedStockedItems;
      } else {
        toast({
          title: "No Match",
          description: "No matching stocked item found",
          variant: "destructive",
        });

        return prevStockedItems; // ✅ Keep state unchanged if no match
      }
    });
  } catch (error) {
    console.error("Error processing QR code:", error);
    toast({
      title: "Scan Error",
      description: "Failed to process the QR code",
      variant: "destructive",
    });
  }
};




  // Toggle selection of an item
  const toggleItemSelection = (item: WarehouseItem) => {
    setStockedItems((prev) =>
      prev.map((i) => (i.production_no === item.production_no ? { ...i, selected: !i.selected } : i)),
    )
  }

  // Move selected items to the shipping table
  const moveSelectedItems = () => {
    const itemsToMove = stockedItems.filter((item) => item.selected)

    if (itemsToMove.length === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select items to ship",
        variant: "destructive",
      })
      return
    }

    // Add selected items to shipping table
    setSelectedItems((prev) => [...prev, ...itemsToMove])

    // Remove selected items from stocked items table
    setStockedItems((prev) => prev.filter((item) => !item.selected))

    // Clear highlight
    setHighlightedItem(null)

    toast({
      title: "Items Added",
      description: `${itemsToMove.length} items added to shipping list`,
    })
  }

  // Remove an item from the shipping table
  const removeFromShipping = (item: WarehouseItem) => {
    // Remove from shipping table
    setSelectedItems((prev) => prev.filter((i) => i.production_no !== item.production_no))

    // Add back to stocked items
    setStockedItems((prev) => [...prev, { ...item, selected: false }])
  }

  // Ship the selected items
  const handleShipItems = async () => {
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to ship items",
        variant: "destructive",
      })
      return
    }

    if (selectedItems.length === 0) {
      toast({
        title: "No items to ship",
        description: "Please add items to the shipping list",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      // 1. Update items in database to "shipped" status
      for (const item of selectedItems) {
        const { error } = await supabase
          .from("parts")
          .update({ status: "shipped" })
          .eq("production_no", item.production_no)

        if (error) throw error

        // Add to transaction history
        await supabase.from("transaction_history").insert({
          parts_id: item.production_no,
          user_id: user?.id,
          status: "shipped",
          notes: `Shipped by ${user?.username || "unknown"}`,
        })
      }

      // 2. Format items for email
      const formattedItems = selectedItems.map((item) => ({
        productionNo: item.production_no,
        productCode: item.product_code,
        lotNo: item.lot_no,
        description: item.description,
      }))

      // 3. Send email without receipt
      const warehouseLocation = selectedWarehouse?.location || selectedWarehouse?.warehouse || "warehouse"
      const emailResult = await sendShippedEmail({
        subject: "Items Shipped",
        items: formattedItems,
        warehouseLocation: warehouseLocation,
      })

      if (!emailResult.success) {
        throw new Error(emailResult.error as string)
      }

      toast({
        title: "Success!",
        description: `${selectedItems.length} items have been shipped and email sent`,
      })

      // Reset the shipping table
      setSelectedItems([])

      // Refresh the stocked items
      fetchStockedItems()
    } catch (error) {
      console.error("Error shipping items:", error)
      toast({
        title: "Error",
        description: "Failed to ship items. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="ml-2">Loading...</p>
    </div>
  );
}

if (!user) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <p>Please log in to access this page.</p>
      <Button className="ml-2" onClick={() => router.push("/login-mobile")}>
        Login
      </Button>
    </div>
  );
}

  return (
    <div className="flex flex-col h-screen p-4 overflow-auto">
      {/* Header */}
      <div className="flex items-center mb-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold ml-2">Ship Items</h1>
      </div>

      {/* QR Scanner */}
      {scanning ? (
        <Card className="mb-4">
          <CardContent className="p-4">
            <QrScanner onScan={handleScan} onClose={() => setScanning(false)} />
          </CardContent>
        </Card>
      ) : (
        <Button className="mb-4" onClick={() => setScanning(true)}>
          <Camera className="mr-2 h-5 w-5" />
          Scan QR Code
        </Button>
      )}

      {/* Table 1: Stocked Items */}
      <Card className="mb-4">
        <CardHeader className="py-2">
          <CardTitle className="text-lg">Stocked Items</CardTitle>
        </CardHeader>
        <CardContent className="p-2 overflow-auto max-h-[30vh]">
          {fetchingItems ? (
            <div className="flex justify-center items-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
              <p>Loading items...</p>
            </div>
          ) : stockedItems.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <p>No stocked items found in this warehouse</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Select</TableHead>
                  <TableHead>Production No</TableHead>
                  <TableHead>Product Code</TableHead>
                  <TableHead>Lot No</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockedItems.map((item) => (
                  <TableRow
                    key={item.production_no}
                    className={highlightedItem === item.production_no ? "bg-primary/10" : ""}
                  >
                    <TableCell>
                      <Checkbox checked={item.selected} onCheckedChange={() => toggleItemSelection(item)} />
                    </TableCell>
                    <TableCell>{item.production_no}</TableCell>
                    <TableCell>{item.product_code}</TableCell>
                    <TableCell>{item.lot_no}</TableCell>
                    <TableCell>{item.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <div className="p-2">
          <Button onClick={moveSelectedItems} disabled={!stockedItems.some((item) => item.selected)} className="w-full">
            <ArrowDownToLine className="mr-2 h-4 w-4" />
            Add Selected to Shipping
          </Button>
        </div>
      </Card>

      {/* Table 2: Items to Ship */}
      <Card className="mb-4">
        <CardHeader className="py-2">
          <CardTitle className="text-lg">Items to Ship</CardTitle>
        </CardHeader>
        <CardContent className="p-2 overflow-auto max-h-[30vh]">
          {selectedItems.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <p>No items added to shipping list</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Production No</TableHead>
                  <TableHead>Product Code</TableHead>
                  <TableHead>Lot No</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[80px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedItems.map((item) => (
                  <TableRow key={item.production_no}>
                    <TableCell>{item.production_no}</TableCell>
                    <TableCell>{item.product_code}</TableCell>
                    <TableCell>{item.lot_no}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromShipping(item)}
                        className="h-8 w-8 p-0"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Remove</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Ship Button */}
      <Button
        className="w-full py-6 mt-auto"
        disabled={loading || selectedItems.length === 0}
        onClick={handleShipItems}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>Ship Items ({selectedItems.length})</>
        )}
      </Button>
    </div>
  )
}

