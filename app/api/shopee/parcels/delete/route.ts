import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface DeleteRequest {
  trackingNumbers: string[];
}

export async function DELETE(req: NextRequest) {
  try {
    const body: DeleteRequest = await req.json();
    const { trackingNumbers } = body;

    if (!trackingNumbers || !Array.isArray(trackingNumbers) || trackingNumbers.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No tracking numbers provided'
      }, { status: 400 });
    }

    console.log(`Attempting to delete ${trackingNumbers.length} parcels:`, trackingNumbers);

    // Delete the parcels using tracking numbers as IDs
    // Filter for Shopee parcels: either from Shopee handovers or with no handover
    const result = await prisma.parcel.deleteMany({
      where: {
        tracking_number: {
          in: trackingNumbers
        },
        OR: [
          {
            handover: {
              type: 'shopee'
            }
          },
          {
            handover_id: null // Include parcels with no handover
          }
        ]
      }
    });

    console.log(`Successfully deleted ${result.count} parcels`);

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
      message: `Successfully deleted ${result.count} parcel(s)`
    });

  } catch (error) {
    console.error('Error deleting parcels:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete parcels',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
