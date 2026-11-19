import { NextResponse, type NextRequest } from "next/server";
import { inchideSesiunea } from "@/autentificare/sesiune";

export async function POST(cerere: NextRequest) {
  await inchideSesiunea();
  return NextResponse.redirect(new URL("/", cerere.url), 303);
}
