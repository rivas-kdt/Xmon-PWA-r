// components/columns.tsx

"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"

export type Item = {
  id: string
  production_no: string
  product_code: string
  lot_no: string
  description: string
  status: "stocked" | "shipped"
  created_at: string
  updated_at: string
  updated_by?: string
}

export const columns: ColumnDef<Item>[] = [
  {
    accessorKey: "production_no",
    header: "Production No.",
    size: 120, // Adjusted for 8-9 chars
  },
  {
    accessorKey: "product_code",
    header: "Product Code",
    size: 80, // Adjusted for 2 chars
  },
  {
    accessorKey: "lot_no",
    header: "Lot No.",
    size: 100,
  },
  {
    accessorKey: "description",
    header: "Description",
    size: 200,
  },
  {
    accessorKey: "status",
    header: "Status",
    size: 100,
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      return <Badge variant={status === "stocked" ? "default" : "secondary"}>{status}</Badge>
    },
  },
  {
    accessorKey: "created_at",
    header: "Stocked Date",
    size: 120,
    cell: ({ row }) => {
      const date = row.getValue("created_at") as string
      if (!date) return null
      return format(new Date(date), "MMM dd, yyyy")
    },
  },  
]

