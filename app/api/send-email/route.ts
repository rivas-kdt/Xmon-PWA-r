import { NextResponse } from "next/server"
import { Resend } from "resend"
import { supabaseAdmin } from "@/lib/supabase-server"
import { Buffer } from "buffer" // Import Buffer for conversion

const resend = new Resend(process.env.RESEND_API_KEY || "")

export async function POST(request: Request) {
  try {
    const { to, subject, items, receiptBase64 } = await request.json() // Expect Base64 receipt instead of URL

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

    if (!subject) {
      return NextResponse.json({ error: "Subject is required" }, { status: 400 })
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Items are required" }, { status: 400 })
    }

    if (!receiptBase64) {
      return NextResponse.json({ error: "Receipt image is required" }, { status: 400 })
    }

    // Convert Base64 receipt to Buffer
    const receiptBuffer = Buffer.from(receiptBase64.split(",")[1], "base64")

    // Create items table for email body
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
              (item: any) => `
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
          content: receiptBuffer.toString("base64"), // Attach as Base64 string
          contentType: "image/png",
        },
      ],
    })

    if (error) {
      console.error("Error sending email with Resend:", error)
      return NextResponse.json({ error: `Failed to send email: ${error.message}` }, { status: 500 })
    }

    // Record the transaction in the database
    const { error: dbError } = await supabaseAdmin.from("transaction_history").insert({
      status: subject.includes("Stocked") ? "stocked" : "shipped",
      notes: `Email sent to ${recipients.join(", ")}`,
    })

    if (dbError) {
      console.error("Error recording transaction:", dbError)
    }

    return NextResponse.json({ success: true, messageId: data?.id })
  } catch (error: any) {
    console.error("Error in email API route:", error)
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
  }
}

