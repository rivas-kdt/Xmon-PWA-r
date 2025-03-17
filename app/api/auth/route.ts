import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  try {
    console.log("🔵 Received login request");
    const { username, password } = await req.json();
    console.log("🔍 Received credentials:", { username, password: "****" }); // don't log the password
    console.log("JWT_SECRET:", process.env.JWT_SECRET);
    if (!username || !password) {
      console.warn("⚠️ Missing username or password");
      return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
    }

    // Look up user in your custom users table
    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select("id, username, password_hash, role")
      .eq("username", username)
      .single();

    if (fetchError || !user) {
      console.error("❌ User lookup error:", fetchError);
      return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
    }

    console.log("✅ User found:", user.username);

    // Compare password using bcrypt
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      console.warn("❌ Invalid password for user:", username);
      return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
    }

    console.log("🔐 Password verified!");

    if (!process.env.JWT_SECRET) {
      console.error("❌ JWT_SECRET is not defined!");
      return NextResponse.json({ error: "Server misconfiguration. Contact support." }, { status: 500 });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    console.log("✅ JWT token created");
    return NextResponse.json({ token }, { status: 200 });
  } catch (error) {
    console.error("🔥 Authentication API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

