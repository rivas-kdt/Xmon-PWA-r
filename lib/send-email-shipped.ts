// lib/send-email-shipped.ts

"use server"

import { Resend } from "resend"
import { supabaseAdmin } from "./supabase-server"

const resend = new Resend(process.env.RESEND_API_KEY || "")

interface ScannedItem {
  productionNo: string
  productCode: string
  lotNo: string
  description: string
}

interface EmailData {
  to?: string[]
  subject: string
  items: ScannedItem[]
  warehouseLocation?: string
}

export async function sendShippedEmail({ to, subject, items, warehouseLocation }: EmailData) {
  try {
    // Fetch all recipients from the database if no specific recipients are provided
    let recipients = to && to.length > 0 ? to : []

    if (recipients.length === 0) {
      // Fetch recipients from the database
      const { data: recipientData, error: recipientError } = await supabaseAdmin.from("recipients").select("email")

      if (recipientError) {
        console.error("Error fetching recipients:", recipientError)
        throw new Error("Failed to fetch email recipients")
      }

      recipients = recipientData.map((r) => r.email)

      // If still no recipients, use a fallback
      if (recipients.length === 0) {
        recipients = ["tagumpayfund@gmail.com"] // Fallback email
      }
    }

    // Validate items
    if (!items || items.length === 0) {
      throw new Error("Items are required")
    }

    // Build the items table as a pure string (no JSX)
    const itemsTable = `
      <table style="width:100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: left;">Production No</th>
            <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: left;">Product Code</th>
            <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: left;">Lot No</th>
            <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: left;">Description</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map((item) => {
              return `
                <tr>
                  <td style="border: 1px solid #e5e7eb; padding: 8px;">${item.productionNo}</td>
                  <td style="border: 1px solid #e5e7eb; padding: 8px;">${item.productCode || "-"}</td>
                  <td style="border: 1px solid #e5e7eb; padding: 8px;">${item.lotNo || "-"}</td>
                  <td style="border: 1px solid #e5e7eb; padding: 8px;">${item.description || "-"}</td>
                </tr>
              `
            })
            .join("")}
        </tbody>
      </table>
    `

    console.log("Sending shipping email to:", recipients)

    // Send email without receipt attachment
    const { data, error } = await resend.emails.send({
      from: "XMon<info@xmon.site>",
      to: recipients,
      subject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #4f46e5;">${subject}</h1>
          <p>The following items have been shipped${warehouseLocation ? ` from ${warehouseLocation}` : ""}:</p>
          ${itemsTable}
          <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">
            This is an automated message from the XMon Inventory Management System.
          </p>
        </div>
      `,
    })

    if (error) {
      console.error("Error sending email with Resend:", error)
      throw new Error(`Failed to send email: ${error.message}`)
    }

    // Record the transaction in the DB
    try {
      const { error: dbError } = await supabaseAdmin.from("transaction_history").insert({
        status: "shipped",
        notes: `Shipping email sent to ${recipients.join(", ")}`,
      })
      if (dbError) {
        console.error("Error recording transaction:", dbError)
      }
    } catch (dbError) {
      console.error("Exception recording transaction:", dbError)
    }

    return { success: true, messageId: data?.id }
  } catch (error: any) {
    console.error("Error in sendShippedEmail function:", error)
    return { success: false, error: error.message || "Unknown error" }
  }
}

