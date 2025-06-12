import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const couriers = await prisma.courier.findMany({
      orderBy: { created_at: 'desc' }
    });

    return NextResponse.json({
      success: true,
      couriers
    });
  } catch (error) {
    console.error('Error fetching couriers:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch couriers'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, isLazada, isShopee, lazRate, shopeeRate, type } = body;

    // Validation
    if (!name || !type) {
      return NextResponse.json({
        success: false,
        error: 'Name and type are required'
      }, { status: 400 });
    }

    if (!['2w', '3w', '4w'].includes(type)) {
      return NextResponse.json({
        success: false,
        error: 'Type must be 2w, 3w, or 4w'
      }, { status: 400 });
    }

    const courier = await prisma.courier.create({
      data: {
        name,
        isLazada: isLazada || false,
        isShopee: isShopee || false,
        lazRate: lazRate || null,
        shopeeRate: shopeeRate || null,
        type
      }
    });

    return NextResponse.json({
      success: true,
      courier,
      message: 'Courier created successfully'
    });
  } catch (error) {
    console.error('Error creating courier:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create courier'
    }, { status: 500 });
  }
}