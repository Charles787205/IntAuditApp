import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackingNumber: string }> }
) {
  try {
    const { trackingNumber } = await params;

    if (!trackingNumber) {
      return NextResponse.json(
        { success: false, error: 'Tracking number is required' },
        { status: 400 }
      );
    }

    // Get parcel details
    const parcel = await prisma.parcel.findUnique({
      where: { tracking_number: trackingNumber },
      include: {
        handover: {
          select: {
            id: true,
            file_name: true,
            handover_date: true
          }
        }
      }
    });

    if (!parcel) {
      return NextResponse.json(
        { success: false, error: 'Parcel not found' },
        { status: 404 }
      );
    }

    // Get event logs for this parcel
    const eventLogs = await prisma.parcelEventLog.findMany({
      where: { tracking_number: trackingNumber },
      orderBy: { created_at: 'desc' }
    });

    return NextResponse.json({
      success: true,
      data: {
        parcel,
        eventLogs
      }
    });

  } catch (error) {
    console.error('Error fetching parcel event logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch parcel event logs' },
      { status: 500 }
    );
  }
}