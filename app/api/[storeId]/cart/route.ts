import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: { storeId: string } }
) {
  try {
    const body = await req.json();
    const { userId, productId, quantity } = body;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401, headers: corsHeaders() });
    }

    if (!productId) {
      return new NextResponse("Product ID perlu diinput", { status: 400, headers: corsHeaders() });
    }

    if (!quantity || quantity < 1) {
      return new NextResponse("Quantity minimal 1 diperlukan", { status: 400, headers: corsHeaders() });
    }

    if (!params.storeId) {
      return new NextResponse("Store ID di URL dibutuhkan", { status: 400, headers: corsHeaders() });
    }

    // Cek apakah store tersebut milik user yang sedang login
    const storeByUserId = await db.store.findFirst({
      where: {
        id: params.storeId,
        userId,
      },
    });

    if (!storeByUserId) {
      return new NextResponse("Unauthorized", { status: 403, headers: corsHeaders() });
    }

    // Cek apakah produk sudah ada di cart
    const existingCartItem = await db.cart.findFirst({
      where: {
        userId,
        productId,
        storeId: params.storeId,
      },
    });

    if (existingCartItem) {
      return new NextResponse("Produk sudah ada di keranjang", { status: 400, headers: corsHeaders() });
    }

    // Tambahkan produk ke cart
    const cartItem = await db.cart.create({
      data: {
        userId,
        productId,
        quantity,
        storeId: params.storeId,
      },
    });

    return new NextResponse(JSON.stringify(cartItem), {
      status: 200,
      headers: corsHeaders(),
    });
  } catch (error) {
    console.log("[CART_POST]", error);
    return new NextResponse("Internal error", { status: 500, headers: corsHeaders() });
  }
}

// Fungsi untuk menambahkan header CORS
function corsHeaders() {
  return new Headers({
    "Access-Control-Allow-Origin": "*", // Bisa diganti "http://localhost:3000" untuk lebih spesifik
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

export async function GET(req: Request, { params }: { params: { storeId: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return new NextResponse("User ID diperlukan dalam query params", { status: 400, headers: corsHeaders() });
    }

    if (!params.storeId) {
      return new NextResponse("Store ID di URL dibutuhkan", { status: 400, headers: corsHeaders() });
    }

    // Ambil data cart berdasarkan userId dan storeId
    const cartItems = await db.cart.findMany({
      where: {
        userId,
        storeId: params.storeId,
      },
      include: {
        product: true, // Termasuk informasi produk
      },
    });

    return new NextResponse(JSON.stringify(cartItems), {
      status: 200,
      headers: corsHeaders(),
    });
  } catch (error) {
    console.log("[CART_GET]", error);
    return new NextResponse("Internal error", { status: 500, headers: corsHeaders() });
  }
}