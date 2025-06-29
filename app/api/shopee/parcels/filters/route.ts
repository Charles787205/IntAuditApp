import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Get unique statuses from parcels table (Shopee only)
    const statuses = await prisma.parcel.findMany({
      where: {
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
      },
      select: {
        status: true
      },
      distinct: ['status']
    });

    // Get unique directions from parcels table (Shopee only)
    const directions = await prisma.parcel.findMany({
      where: {
        OR: [
          {
            handover: {
              type: 'shopee'
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

    // Get unique updated_by values from parcels table (Shopee only)
    const updatedByList = await prisma.parcel.findMany({
      where: {
        OR: [
          {
            handover: {
              type: 'shopee'
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

    // Get unique port_code values from parcels table (Shopee only)
    const portCodes = await prisma.parcel.findMany({
      where: {
        OR: [
          {
            handover: {
              type: 'shopee'
            }
          },
          {
            handover_id: null
          }
        ]
      },
      select: {
        port_code: true
      },
      distinct: ['port_code']
    });

    // Get all Shopee handovers for filtering
    const handovers = await prisma.handover.findMany({
      where: {
        type: 'shopee'
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
        portCodes: portCodes.map(p => p.port_code).filter(Boolean).sort(),
        handovers: handovers
      }
    });

  } catch (error) {
    console.error('Error fetching Shopee filter options:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch Shopee filter options' },
      { status: 500 }
    );
  }
}
