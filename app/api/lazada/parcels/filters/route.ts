import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Get unique statuses from parcels table (Lazada only)
    const statuses = await prisma.parcel.findMany({
      where: {
        OR: [
          {
            handover: {
              type: 'lazada'
            }
          },
          {
            handover_id: null // Include parcels with no handover
          }
        ]
      },
      select: {
        status: true
      },
      distinct: ['status']
    });

    // Get unique directions from parcels table (Lazada only)
    const directions = await prisma.parcel.findMany({
      where: {
        OR: [
          {
            handover: {
              type: 'lazada'
            }
          },
          {
            handover_id: null
          }
        ]
      },
      select: {
        direction: true
      },
      distinct: ['direction']
    });

    // Get unique updated_by values from parcels table (Lazada only)
    const updatedByList = await prisma.parcel.findMany({
      where: {
        OR: [
          {
            handover: {
              type: 'lazada'
            }
          },
          {
            handover_id: null
          }
        ]
      },
      select: {
        updated_by: true
      },
      distinct: ['updated_by']
    });

    // Get all Lazada handovers for filtering
    const handovers = await prisma.handover.findMany({
      where: {
        type: 'lazada'
      },
      select: {
        id: true,
        file_name: true,
        handover_date: true,
        status: true,
        platform: true
      },
      orderBy: {
        handover_date: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        statuses: statuses.map(s => s.status).filter(Boolean).sort(),
        directions: directions.map(d => d.direction).filter(Boolean).sort(),
        updatedBy: updatedByList.map(u => u.updated_by).filter(Boolean).sort(),
        handovers: handovers
      }
    });

  } catch (error) {
    console.error('Error fetching Lazada filter options:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch Lazada filter options' },
      { status: 500 }
    );
  }
}
