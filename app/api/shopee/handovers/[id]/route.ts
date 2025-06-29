import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: handoverId } = await params;
    const handoverIdInt = parseInt(handoverId);

    // Check if the handover exists and is a Shopee handover
    const handover = await prisma.handover.findFirst({
      where: {
        id: handoverIdInt,
        type: 'shopee'
      },
      include: {
        parcels: {
          select: {
            tracking_number: true
          }
        }
      }
    });

    if (!handover) {
      return NextResponse.json(
        { success: false, error: 'Shopee handover not found' },
        { status: 404 }
      );
    }

    // Delete associated parcels first (cascading delete)
    await prisma.parcel.deleteMany({
      where: {
        handover_id: handoverIdInt
      }
    });

    // Delete the handover
    await prisma.handover.delete({
      where: {
        id: handoverIdInt
      }
    });

    return NextResponse.json({ 
      success: true,
      message: `Shopee handover deleted successfully. ${handover.parcels.length} tracking records were also removed.`
    });

  } catch (error) {
    console.error('Error deleting Shopee handover:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete Shopee handover' },
      { status: 500 }
    );
  }
}
