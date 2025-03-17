"use server"

import { supabaseAdmin } from "./supabase-server"
import bcrypt from "bcryptjs"

// Add a new user
export async function addUser(formData: FormData) {
  try {
    const username = formData.get("username") as string
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const role = formData.get("role") as string
    const warehouseId = formData.get("warehouseId") as string

    if (!username || !email || !password || !role) {
      return { success: false, error: "All fields are required" }
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10)

    // Insert user
    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .insert({
        username,
        email,
        password_hash: passwordHash,
        role,
      })
      .select("id")
      .single()

    if (userError) {
      console.error("Error adding user:", userError)
      return { success: false, error: userError.message }
    }

    // If role is worker, add to worker_location
    if (role === "worker" && warehouseId) {
      const { error: locationError } = await supabaseAdmin.from("worker_location").insert({
        user_id: userData.id,
        warehouse_id: warehouseId,
      })

      if (locationError) {
        console.error("Error adding worker location:", locationError)
        return { success: false, error: locationError.message }
      }
    }

    return { success: true }
  } catch (error: any) {
    console.error("Error in addUser:", error)
    return { success: false, error: error.message || "An error occurred" }
  }
}

// Add a new warehouse
export async function addWarehouse(formData: FormData) {
  try {
    const location = formData.get("location") as string
    const warehouse = formData.get("warehouse") as string

    if (!location || !warehouse) {
      return { success: false, error: "All fields are required" }
    }

    const { error } = await supabaseAdmin.from("warehouse").insert({
      location,
      warehouse,
    })

    if (error) {
      console.error("Error adding warehouse:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error("Error in addWarehouse:", error)
    return { success: false, error: error.message || "An error occurred" }
  }
}

// Add a new recipient
export async function addRecipient(formData: FormData) {
  try {
    const email = formData.get("email") as string

    if (!email) {
      return { success: false, error: "Email is required" }
    }

    const { error } = await supabaseAdmin.from("recipients").insert({
      email,
    })

    if (error) {
      console.error("Error adding recipient:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error("Error in addRecipient:", error)
    return { success: false, error: error.message || "An error occurred" }
  }
}

