import { NextResponse } from "next/server";
import { getPublicModels } from "@/lib/modelRegistry";

export function GET() {
  return NextResponse.json(getPublicModels());
}
