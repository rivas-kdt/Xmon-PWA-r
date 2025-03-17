"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase-client"
import { toast } from "@/hooks/use-toast"
import useAuth from "@/hooks/useAuth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table"
import { columns } from "@/components/columns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { LogOut, RefreshCw, BarChart3, Package, UserPlus, Building, Mail, Calendar } from "lucide-react"
import { AddUserForm } from "./add-user-form"
import { AddWarehouseForm } from "./add-warehouse-form"
import { AddRecipientForm } from "./add-recipient-form"
import { ScheduleEmailForm } from "./schedule-email-form"
import { DateRangePicker } from "./date-range-picker"
import type { DateRange } from "react-day-picker"
import { format, parseISO } from "date-fns"
import { ThemeToggle } from "@/components/theme-toggle"

export default function DesktopView() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState<any[]>([])
  const [filteredItems, setFilteredItems] = useState<any[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all") // New state for status filter
  const [loadingWarehouses, setLoadingWarehouses] = useState(false)
  const [filterValue, setFilterValue] = useState("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

  // State for modals
  const [addUserOpen, setAddUserOpen] = useState(false)
  const [addWarehouseOpen, setAddWarehouseOpen] = useState(false)
  const [addRecipientOpen, setAddRecipientOpen] = useState(false)
  const [scheduleEmailOpen, setScheduleEmailOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login-desktop")
    } else if (user) {
      // Load warehouses when user is authenticated
      fetchWarehouses()
      fetchAllItems()
    }
  }, [user, loading, router])

  // Apply filters whenever items, filterValue, dateRange, selectedWarehouse, or selectedStatus changes
  useEffect(() => {
    applyFilters()
  }, [items, filterValue, dateRange, selectedWarehouse, selectedStatus])

  // Fetch warehouses
  const fetchWarehouses = async () => {
    setLoadingWarehouses(true)
    try {
      const { data, error } = await supabase
        .from("warehouse")
        .select("id, warehouse, location")
        .order("warehouse", { ascending: true })

      if (error) {
        throw error
      }

      setWarehouses(data || [])
    } catch (error) {
      console.error("Error fetching warehouses:", error)
      toast({
        title: "Error",
        description: "Failed to fetch warehouses. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingWarehouses(false)
    }
  }

  // Fetch all items (both stocked and shipped)
  const fetchAllItems = async () => {
    setLoadingItems(true)
    try {
      // Don't filter by status at the database level
      const { data, error } = await supabase.from("parts").select("*").order("production_no", { ascending: true })

      if (error) {
        throw error
      }

      setItems(data || [])
    } catch (error) {
      console.error("Error fetching items:", error)
      toast({
        title: "Error",
        description: "Failed to fetch items. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingItems(false)
    }
  }

  // Fetch items by warehouse (both stocked and shipped)
  const fetchItemsByWarehouse = async (warehouseId: string) => {
    if (warehouseId === "all") {
      fetchAllItems()
      return
    }

    setLoadingItems(true)
    try {
      // First get parts_ids from parts_location for the selected warehouse
      const { data: locationData, error: locationError } = await supabase
        .from("parts_location")
        .select("parts_id")
        .eq("warehouse_id", warehouseId)

      if (locationError) {
        throw locationError
      }

      if (!locationData || locationData.length === 0) {
        setItems([])
        setLoadingItems(false)
        return
      }

      // Get the parts IDs
      const partsIds = locationData.map((item) => item.parts_id)

      // Then fetch the actual parts data (don't filter by status)
      const { data: partsData, error: partsError } = await supabase
        .from("parts")
        .select("*")
        .in("production_no", partsIds)
        .order("production_no", { ascending: true })

      if (partsError) {
        throw partsError
      }

      setItems(partsData || [])
    } catch (error) {
      console.error("Error fetching items:", error)
      toast({
        title: "Error",
        description: "Failed to fetch items. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingItems(false)
    }
  }

  // Apply all filters
  const applyFilters = () => {
    let result = [...items]

    // Filter by warehouse if not "all"
    if (selectedWarehouse !== "all") {
      // This filtering is already done at the database level in fetchItemsByWarehouse
      // But we'll keep this logic in case we need to add more complex filtering
    }

    // Filter by status
    if (selectedStatus !== "all") {
      result = result.filter((item) => item.status === selectedStatus)
    }

    // Apply text filter across all columns
    if (filterValue) {
      const filterTerms = filterValue
        .toLowerCase()
        .split("+")
        .map((term) => term.trim())
        .filter(Boolean)

      if (filterTerms.length > 0) {
        result = result.filter((item) => {
          return filterTerms.every((term) => {
            return (
              item.production_no?.toLowerCase().includes(term) ||
              item.product_code?.toLowerCase().includes(term) ||
              item.lot_no?.toLowerCase().includes(term) ||
              item.description?.toLowerCase().includes(term) ||
              item.status?.toLowerCase().includes(term)
            )
          })
        })
      }
    }

    // Apply date range filter
    if (dateRange?.from) {
      result = result.filter((item) => {
        if (!item.created_at) return false

        const itemDate = parseISO(item.created_at)

        if (dateRange.to) {
          // Make sure both from and to dates are defined
          const fromDate = dateRange.from
          const toDate = dateRange.to

          if (fromDate && toDate) {
            // Set the time of toDate to 23:59:59.999 to include the entire day
            const endOfToDate = new Date(toDate)
            endOfToDate.setHours(23, 59, 59, 999)

            return itemDate >= fromDate && itemDate <= endOfToDate
          }
          return false
        }

        // If only "from" date is selected, match items from that date onwards
        const fromDate = dateRange.from
        return fromDate ? itemDate >= fromDate : false
      })
    }

    setFilteredItems(result)
  }

  // Handle warehouse selection change
  const handleWarehouseChange = (warehouseId: string) => {
    setSelectedWarehouse(warehouseId)
    if (warehouseId === "all") {
      fetchAllItems()
    } else {
      fetchItemsByWarehouse(warehouseId)
    }
  }

  // Handle status selection change
  const handleStatusChange = (status: string) => {
    setSelectedStatus(status)
  }

  // Handle refresh button click
  const handleRefresh = () => {
    if (selectedWarehouse === "all") {
      fetchAllItems()
    } else {
      fetchItemsByWarehouse(selectedWarehouse ?? "all")
    }
  }

  // Clear all filters
  const clearFilters = () => {
    setFilterValue("")
    setDateRange(undefined)
    setSelectedStatus("all")
  }

  // Show loading screen while checking authentication
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
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    )
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    router.push("/login-desktop")
  }

  const isAdmin = user?.role === "admin"

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center">
            <div className="relative mr-4">
              <div className="text-4xl font-bold tracking-tighter text-primary">
                <span>X</span>
                <span className="opacity-80">Mon</span>
              </div>
              <div className="absolute -top-2 -right-2 bg-primary text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                KDT
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold">External Warehouse Monitoring</h1>
              <p className="text-muted-foreground">
                Welcome, <span className="font-medium">{user?.username}</span> ({user?.role})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <Button onClick={() => setAddUserOpen(true)} variant="outline" className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Add User
                </Button>
                <Button onClick={() => setAddWarehouseOpen(true)} variant="outline" className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Add Warehouse
                </Button>
                <Button onClick={() => setAddRecipientOpen(true)} variant="outline" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Add Recipient
                </Button>
                <Button
                  onClick={() => setScheduleEmailOpen(true)}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  Schedule Emails
                </Button>
              </>
            )}
            <ThemeToggle />
            <Button onClick={handleLogout} variant="outline" className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Dashboard Content */}
        <Card className="mb-8 border-0 shadow-md">
          <CardHeader className="bg-primary/5 rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Inventory Management
            </CardTitle>
            <CardDescription>Track and manage your inventory with ease</CardDescription>
          </CardHeader>
        </Card>

        <Tabs defaultValue="inventory" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Inventory
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Reports
            </TabsTrigger>
          </TabsList>
          <TabsContent value="inventory">
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-primary/5 rounded-t-lg">
                <CardTitle>Inventory Items</CardTitle>
                <CardDescription>View and manage your inventory items</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-col gap-4 mb-4">
                  <div className="flex flex-wrap gap-4 items-end">
                    {/* Warehouse Dropdown */}
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium">Warehouse:</label>
                      <Select
                        value={selectedWarehouse || "all"}
                        onValueChange={handleWarehouseChange}
                        disabled={loadingWarehouses}
                      >
                        <SelectTrigger className="w-[250px]">
                          <SelectValue placeholder="Select warehouse" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Warehouses</SelectItem>
                          {warehouses.map((warehouse) => (
                            <SelectItem key={warehouse.id} value={warehouse.id}>
                              {warehouse.warehouse} ({warehouse.location})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Status Dropdown */}
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium">Status:</label>
                      <Select value={selectedStatus} onValueChange={handleStatusChange}>
                        <SelectTrigger className="w-[150px]">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="stocked">Stocked</SelectItem>
                          <SelectItem value="shipped">Shipped</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Text Filter */}
                    <div className="flex flex-col gap-1 flex-1">
                      <label className="text-sm font-medium">Filter (use + to combine terms):</label>
                      <Input
                        placeholder="Filter by any field..."
                        value={filterValue}
                        onChange={(e) => setFilterValue(e.target.value)}
                        className="w-full"
                      />
                    </div>

                    {/* Date Range Picker */}
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium">Date Range:</label>
                      <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} className="w-[300px]" />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button onClick={clearFilters} variant="outline">
                        Clear Filters
                      </Button>
                      <Button onClick={handleRefresh} disabled={loadingItems} className="flex items-center gap-2">
                        {loadingItems ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4" />
                            Refresh
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Filter Summary */}
                  <div className="text-sm text-muted-foreground">
                    Showing {filteredItems.length} items
                    {selectedWarehouse !== "all" && " in selected warehouse"}
                    {selectedStatus !== "all" && ` with status "${selectedStatus}"`}
                    {filterValue && ` matching "${filterValue}"`}
                    {dateRange?.from && ` from ${format(dateRange.from, "MMM dd, yyyy")}`}
                    {dateRange?.to && ` to ${format(dateRange.to, "MMM dd, yyyy")}`}
                  </div>
                </div>

                <DataTable columns={columns} data={filteredItems} />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="reports">
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-primary/5 rounded-t-lg">
                <CardTitle>Reports</CardTitle>
                <CardDescription>View and generate reports</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <BarChart3 className="h-16 w-16 text-primary/40 mb-4" />
                  <h3 className="text-xl font-medium mb-2">Reports Coming Soon</h3>
                  <p className="text-muted-foreground max-w-md">
                    This feature is currently under development. Check back later for detailed inventory reports and
                    analytics.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <AddUserForm open={addUserOpen} onOpenChange={setAddUserOpen} />
      <AddWarehouseForm open={addWarehouseOpen} onOpenChange={setAddWarehouseOpen} onSuccess={fetchWarehouses} />
      <AddRecipientForm open={addRecipientOpen} onOpenChange={setAddRecipientOpen} />
      <ScheduleEmailForm open={scheduleEmailOpen} onOpenChange={setScheduleEmailOpen} />
    </div>
  )
}

