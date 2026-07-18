import { NextResponse } from "next/server";
import { getPublicUniversalModelStatus } from "@/core/model-providers/config";

export function GET() {
  return NextResponse.json(getPublicUniversalModelStatus());
}
