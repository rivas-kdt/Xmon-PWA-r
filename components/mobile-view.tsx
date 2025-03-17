"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import useAuth from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import StockedView from "@/components/stocked-view"
import ShippedView from "@/components/shipped-view"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LogOut, Package, Truck, MapPin, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase-client"
import type { Warehouse } from "@/types/warehouse"
import { ThemeToggle } from "@/components/theme-toggle"

export default function MobileView() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [view, setView] = useState<"main" | "stocked" | "shipped">("main")
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [loadingWarehouses, setLoadingWarehouses] = useState(false)
  const isAdmin = user?.role === "admin"

  // When the component mounts or when user changes, fetch warehouses
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login-mobile")
    } else if (user) {
      fetchWarehouses()
    }
  }, [user, loading, router])

  // Retrieve previously selected warehouse from sessionStorage on mount
  useEffect(() => {
    const storedWarehouseId = sessionStorage.getItem("selectedWarehouseId")
    if (storedWarehouseId && warehouses.length > 0) {
      const storedWarehouse = warehouses.find((w) => w.id === storedWarehouseId)
      if (storedWarehouse) {
        setSelectedWarehouse(storedWarehouse)
      }
    }
  }, [warehouses])

  // Whenever selectedWarehouse changes, store it in sessionStorage
  useEffect(() => {
    if (selectedWarehouse) {
      sessionStorage.setItem("selectedWarehouseId", selectedWarehouse.id)
      sessionStorage.setItem("selectedWarehouse", JSON.stringify(selectedWarehouse))
    }
  }, [selectedWarehouse])

  const fetchWarehouses = async () => {
    setLoadingWarehouses(true)
    try {
      if (isAdmin) {
        // Admin: fetch all warehouses
        const { data, error } = await supabase
          .from("warehouse")
          .select("id, location, warehouse")
          .order("warehouse", { ascending: true })
        if (error) throw error
        setWarehouses(data || [])
        if (data && data.length > 0) {
          // Use stored warehouse if available; otherwise default to the first
          const storedWarehouseId = sessionStorage.getItem("selectedWarehouseId")
          if (storedWarehouseId) {
            const storedWarehouse = data.find((w) => w.id === storedWarehouseId)
            setSelectedWarehouse(storedWarehouse || data[0])
          } else {
            setSelectedWarehouse(data[0])
            sessionStorage.setItem("selectedWarehouseId", data[0].id)
          }
        }
      } else {
        // Worker: fetch only assigned warehouse
        if (!user) {
          console.error("User is null, cannot fetch warehouse.")
          return
        }
        const { data, error } = await supabase
          .from("worker_location")
          .select("warehouse_id, warehouse:warehouse_id(id, location, warehouse)")
          .eq("user_id", user.id)
          .single()
        if (error) {
          console.error("Error fetching worker location:", error)
          return
        }
        if (data?.warehouse) {
          // data.warehouse might be an array; take the first element if so
          const warehouse = Array.isArray(data.warehouse) ? data.warehouse[0] : data.warehouse
          setWarehouses([warehouse])
          setSelectedWarehouse(warehouse)
          sessionStorage.setItem("selectedWarehouseId", warehouse.id)
        }
      }
    } catch (error) {
      console.error("Error fetching warehouses:", error)
    } finally {
      setLoadingWarehouses(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="flex flex-col items-center">
          <div className="relative mb-4">
            <div className="text-5xl font-bold tracking-tighter text-primary">
              <span>X</span>
              <span className="opacity-80">Mon</span>
            </div>
            <div className="absolute -top-2 -right-2 bg-primary text-white text-xs px-2 py-1 rounded-full font-bold">
              KDT
            </div>
          </div>
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    )
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    sessionStorage.removeItem("selectedWarehouseId")
    sessionStorage.removeItem("selectedWarehouse")
    router.push("/login-mobile")
  }

  const handleWarehouseChange = (warehouseId: string) => {
    const selected = warehouses.find((w) => w.id === warehouseId)
    setSelectedWarehouse(selected || null)
    if (selected) {
      sessionStorage.setItem("selectedWarehouseId", selected.id)
      sessionStorage.setItem("selectedWarehouse", JSON.stringify(selected))
    }
  }

  const filteredWarehouses = warehouses.filter((warehouse) =>
    warehouse.location.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  if (view === "stocked") {
    return <StockedView onBack={() => setView("main")} />
  }

  if (view === "shipped") {
    return <ShippedView onBack={() => setView("main")} />
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="relative">
          <div className="text-3xl font-bold tracking-tighter text-primary">
            <span>X</span>
            <span className="opacity-80">Mon</span>
          </div>
          <div className="absolute -top-2 -right-2 bg-primary text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
            KDT
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Welcome Section */}
      <Card className="mb-4 border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription className="text-base font-medium text-primary">{user?.username}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {isAdmin ? (
              <>
                <label className="text-sm font-medium">Select Warehouse</label>
                <Select
                  value={selectedWarehouse?.id}
                  onValueChange={handleWarehouseChange}
                  disabled={loadingWarehouses}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingWarehouses ? (
                      <div className="flex items-center justify-center py-2">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span>Loading...</span>
                      </div>
                    ) : (
                      warehouses.map((warehouse) => (
                        <SelectItem key={warehouse.id} value={warehouse.id}>
                          {warehouse.warehouse || warehouse.location}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </>
            ) : (
              <div className="bg-muted/50 p-3 rounded-md">
                <p className="text-sm font-medium">Your assigned warehouse:</p>
                <p className="text-base font-semibold">
                  {selectedWarehouse?.warehouse || selectedWarehouse?.location || "Not assigned"}
                </p>
              </div>
            )}

            {/* This block displays the location for both admin and worker */}
            {selectedWarehouse && (
              <div className="mt-2">
                <label className="text-sm font-medium">Location</label>
                <div className="flex items-center p-2 border rounded-md bg-muted/30">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span className="text-sm">{selectedWarehouse.location}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4 mt-2">
        <Button
          className="py-6 flex flex-col items-center justify-center gap-2 rounded-xl shadow-md"
          onClick={() => setView("stocked")}
        >
          <Package className="h-6 w-6" />
          <span>STOCKED</span>
        </Button>
        <Button
          className="py-6 flex flex-col items-center justify-center gap-2 rounded-xl shadow-md"
          variant="secondary"
          onClick={() => setView("shipped")}
        >
          <Truck className="h-6 w-6" />
          <span>SHIPPED</span>
        </Button>
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-muted-foreground mt-auto pt-4">
        XMon External Warehouse Monitoring System
      </p>
    </div>
  )
}

