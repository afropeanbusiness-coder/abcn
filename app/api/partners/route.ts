import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await query(
      `SELECT id, name, logo_url, website_url, category, description, tier, priority
       FROM site_partners 
       WHERE active = true 
       ORDER BY priority ASC, created_at ASC`
    );
    // An empty table is a real answer: the editor removed every partner.
    return NextResponse.json({ success: true, data: rows ?? [] });
  } catch (error: any) {
    console.error("GET /api/partners error:", error);
  }

  // Database unreachable only: show the bundled partners rather than nothing.
  return NextResponse.json({
    success: true,
    data: [
      { id: "p1", name: "Wirtschaftsförderung Frankfurt", logo_url: "/assets/fiali/logos/wirtschaftsfoerderung-frankfurt.png", website_url: "https://frankfurt-business.net" },
      { id: "p2", name: "Kompass Frankfurt", logo_url: "/assets/fiali/logos/kompass-frankfurt.png", website_url: "https://kompassfrankfurt.de" },
      { id: "p3", name: "Frankfurt Forward", logo_url: "/assets/fiali/logos/frankfurt-forward.png", website_url: "https://frankfurt-forward.de" },
      { id: "p4", name: "DIWOC Rising", logo_url: "/assets/fiali/logos/divoc-rising.png", website_url: "https://diwoc-rising.com" },
      { id: "p5", name: "Black Women in Tech DACH", logo_url: "/assets/fiali/logos/black-women-in-tech-dach.png", website_url: "https://bwit-dach.org" },
      { id: "p7", name: "ABCN", logo_url: "/assets/fiali/logos/abcn.png", website_url: "https://afropeanbusiness.com" },
    ],
  });
}
