import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { trackingNumber: string } }
) {
  try {
    const { trackingNumber } = params;

    // Fetch parcel event logs for the specific tracking number
    const eventLogs = await prisma.parcelEventLog.findMany({
      where: {
        tracking_number: trackingNumber
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      data: eventLogs
    });

  } catch (error) {
    console.error('Error fetching parcel event logs:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch parcel event logs' 
      },
      { status: 500 }
    );
  }
}