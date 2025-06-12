import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const handoverId = parseInt(id);

    if (isNaN(handoverId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid handover ID'
      }, { status: 400 });
    }

    // Get handover with all parcel data including status and updated_by
    const handover = await prisma.handover.findUnique({
      where: { id: handoverId },
      include: {
        parcels: {
          select: {
            tracking_number: true,
            port_code: true,
            package_type: true,
            status: true,
            updated_by: true,
            updated_at: true
          }
        }
      }
    });

    if (!handover) {
      return NextResponse.json({
        success: false,
        error: 'Handover not found'
      }, { status: 404 });
    }

    // Transform the data for printing
    const printData = {
      id: handover.id,
      date: handover.handover_date,
      fileName: handover.file_name,
      createdAt: handover.date_added,
      status: handover.status,
      quantity: handover.quantity,
      extractedData: handover.parcels.map((parcel: any) => ({
        trackingNo: parcel.tracking_number,
        portCode: parcel.port_code || '',
        packageType: parcel.package_type || '',
        status: parcel.status || '',
        updated_by: parcel.updated_by || '',
        updated_at: parcel.updated_at
      }))
    };

    return NextResponse.json({
      success: true,
      handover: printData
    });

  } catch (error) {
    console.error('Error fetching handover print data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch handover print data'
    }, { status: 500 });
  }
}