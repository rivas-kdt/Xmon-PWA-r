// app/page.tsx

"use client"

import { useEffect, useState, useRef } from "react"
import DesktopLoginView from "@/components/desktop-login-view"
import MobileLoginView from "@/components/mobile-login-view";
import DatabaseSetup from "@/components/database-setup"
import { supabase } from "@/lib/supabase-client"

export default function Home() {
  // Default to desktop view during SSR
  const [isMobile, setIsMobile] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [databaseReady, setDatabaseReady] = useState(true) // Assume ready until proven otherwise
  const [loading, setLoading] = useState(true)
  const isCheckingDatabase = useRef(false) // Prevent duplicate calls

  useEffect(() => {
    // Check for mobile only on client side
    setIsMobile(window.innerWidth < 768)

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    window.addEventListener("resize", handleResize)
    setMounted(true)

    const checkDatabase = async () => {
      if (isCheckingDatabase.current) return // Prevent multiple checks
      isCheckingDatabase.current = true

      try {
        // Check if 'parts' table exists
        const { count, error } = await supabase
          .from("parts")
          .select("*", { count: "exact", head: true })

        if (error || count === null) {
          console.warn("Database tables missing.")
          setDatabaseReady(false) // Mark DB as not ready, so it shows `DatabaseSetup`
        } else {
          setDatabaseReady(true) // DB exists, load app normally
        }
      } catch (err) {
        console.error("Exception checking database:", err)
        setDatabaseReady(false)
      } finally {
        setLoading(false)
      }
    }

    checkDatabase()

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  // Show loading spinner until database check completes
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  // If database is not ready, show DatabaseSetup
  if (!databaseReady) {
    return (
      <div className="container mx-auto py-10 px-4">
        <h1 className="text-2xl font-bold mb-6">XMon Inventory Management</h1>
        <DatabaseSetup />
      </div>
    )
  }

  // Render MobileLoginView on mobile, DesktopView otherwise.
  return <main className="min-h-screen">{isMobile ? <MobileLoginView /> : <DesktopLoginView />}</main>
}

