import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  const { name } = await request.json();

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const trimmed = name.trim();

  // Save to Supabase
  const { error: dbError } = await supabaseAdmin
    .from("nominations")
    .insert({ name: trimmed });

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  // Send email notification
  let emailError: string | null = null;
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: process.env.EMAIL_TO,
      subject: `New Nomination: ${trimmed}`,
      text: `New nomination submitted:\n\nName: ${trimmed}\nTime: ${new Date().toISOString()}`,
      html: `
        <h2>New Nomination</h2>
        <p><strong>Name:</strong> ${trimmed}</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
      `,
    });
  } catch (err) {
    emailError = err instanceof Error ? err.message : String(err);
    console.error("Email send failed:", err);
  }

  return NextResponse.json({ ok: true, emailError });
}
