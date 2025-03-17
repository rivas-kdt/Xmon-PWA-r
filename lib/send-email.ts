// lib/send-email.ts

"use server"

import { Resend } from "resend"
import { supabaseAdmin } from "./supabase-server"
import { Buffer } from "buffer" // Import Buffer for Base64 conversion

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
  receiptBase64: string // Accepting Base64 instead of Blob
}

export async function sendEmail({ to, subject, items, receiptBase64 }: EmailData) {
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

    if (!items || items.length === 0) {
      throw new Error("Items are required")
    }

    if (!receiptBase64) {
      throw new Error("Receipt image is required")
    }

    // Convert Base64 string to Buffer
    const receiptBuffer = Buffer.from(receiptBase64.split(",")[1], "base64")

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
            .map(
              (item) => `
                <tr>
                  <td style="border: 1px solid #e5e7eb; padding: 8px;">${item.productionNo}</td>
                  <td style="border: 1px solid #e5e7eb; padding: 8px;">${item.productCode || "-"}</td>
                  <td style="border: 1px solid #e5e7eb; padding: 8px;">${item.lotNo || "-"}</td>
                  <td style="border: 1px solid #e5e7eb; padding: 8px;">${item.description || "-"}</td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    `

    console.log("Sending email to:", recipients)

    // Send email with receipt as an attachment
    const { data, error } = await resend.emails.send({
      from: "XMon<info@xmon.site>",
      to: recipients,
      subject: subject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #4f46e5;">${subject}</h1>
          <p>The following items have been ${subject.includes("Stocked") ? "stocked" : "shipped"}:</p>
          ${itemsTable}
          <h2>Receipt</h2>
          <p>The receipt is attached to this email.</p>
          <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">
            This is an automated message from the XMon Inventory Management System.
          </p>
        </div>
      `,
      attachments: [
        {
          filename: "receipt.png",
          content: receiptBuffer.toString("base64"), // Convert Buffer to Base64 string
          contentType: "image/png",
        },
      ],
    })

    if (error) {
      console.error("Error sending email with Resend:", error)
      throw new Error(`Failed to send email: ${error.message}`)
    }

    // Record the transaction in the DB
    try {
      const { error: dbError } = await supabaseAdmin.from("transaction_history").insert({
        status: subject.includes("Stocked") ? "stocked" : "shipped",
        notes: `Email sent to ${recipients.join(", ")}`,
      })
      if (dbError) {
        console.error("Error recording transaction:", dbError)
      }
    } catch (dbError) {
      console.error("Exception recording transaction:", dbError)
    }

    return { success: true, messageId: data?.id }
  } catch (error: any) {
    console.error("Error in sendEmail function:", error)
    return { success: false, error: error.message || "Unknown error" }
  }
}

