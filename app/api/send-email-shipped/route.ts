import { NextResponse } from "next/server"
import { Resend } from "resend"
import { supabaseAdmin } from "@/lib/supabase-server"

const resend = new Resend(process.env.RESEND_API_KEY || "")

export async function POST(request: Request) {
  try {
    const { to, subject, items, warehouseLocation } = await request.json()

    // Fetch all recipients from the database if no specific recipients are provided
    let recipients = to && Array.isArray(to) && to.length > 0 ? to : []

    if (recipients.length === 0) {
      // Fetch recipients from the database
      const { data: recipientData, error: recipientError } = await supabaseAdmin.from("recipients").select("email")

      if (recipientError) {
        console.error("Error fetching recipients:", recipientError)
        return NextResponse.json({ error: "Failed to fetch email recipients" }, { status: 500 })
      }

      recipients = recipientData.map((r: { email: string }) => r.email)

      // If still no recipients, use a fallback
      if (recipients.length === 0) {
        recipients = ["tagumpayfund@gmail.com"] // Fallback email
      }
    }

    // Basic validation
    if (!subject) {
      return NextResponse.json({ error: "Subject is required" }, { status: 400 })
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Items are required" }, { status: 400 })
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
            .map((item: any) => {
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

    // Send email without a receipt attachment
    const { data, error } = await resend.emails.send({
      from: "XMon<info@xmon.site>",
      to: recipients,
      subject: subject,
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
      return NextResponse.json({ error: `Failed to send email: ${error.message}` }, { status: 500 })
    }

    // Record the transaction in the database
    const { error: dbError } = await supabaseAdmin.from("transaction_history").insert({
      status: "shipped",
      notes: `Shipping email sent to ${recipients.join(", ")}`,
    })

    if (dbError) {
      console.error("Error recording transaction:", dbError)
    }

    return NextResponse.json({ success: true, messageId: data?.id })
  } catch (error: any) {
    console.error("Error in shipping email API route:", error)
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
  }
}

