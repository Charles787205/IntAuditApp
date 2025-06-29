import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const courierId = parseInt(id);

    if (isNaN(courierId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid courier ID'
      }, { status: 400 });
    }

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

    const courier = await prisma.courier.update({
      where: { id: courierId },
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
      message: 'Courier updated successfully'
    });
  } catch (error) {
    console.error('Error updating courier:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update courier'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const courierId = parseInt(id);

    if (isNaN(courierId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid courier ID'
      }, { status: 400 });
    }

    await prisma.courier.delete({
      where: { id: courierId }
    });

    return NextResponse.json({
      success: true,
      message: 'Courier deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting courier:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete courier'
    }, { status: 500 });
  }
}