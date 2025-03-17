// components/database-setup.tsx

"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase-client"
import { toast } from "@/hooks/use-toast"
import { AlertCircle, CheckCircle2 } from "lucide-react"

export default function DatabaseSetup() {
  const [databaseReady, setDatabaseReady] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkDatabase = async () => {
      try {
        // Check if 'parts' table exists
        const { count, error } = await supabase.from("parts").select("*", { count: "exact", head: true })

        if (error || count === null) {
          console.warn("Database tables missing.")
          setDatabaseReady(false)
        } else {
          setDatabaseReady(true)
        }
      } catch (err) {
        console.error("Exception checking database:", err)
        setDatabaseReady(false)
      } finally {
        setLoading(false)
      }
    }

    checkDatabase()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Database Status</CardTitle>
        <CardDescription>Checking database status...</CardDescription>
      </CardHeader>
      <CardContent>
        {databaseReady ? (
          <div className="flex items-center text-green-600">
            <CheckCircle2 className="mr-2" />
            <p>Database is ready!</p>
          </div>
        ) : (
          <div className="flex items-center text-amber-600">
            <AlertCircle className="mr-2" />
            <p>Database tables are missing. Run the SQL script manually in Supabase.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

