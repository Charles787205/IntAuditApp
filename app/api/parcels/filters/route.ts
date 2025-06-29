import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Get unique statuses from parcels table
    const statuses = await prisma.parcel.findMany({
      select: {
        status: true
      },
      distinct: ['status']
    });

    // Get unique directions from parcels table
    const directions = await prisma.parcel.findMany({
      select: {
        direction: true
      },
      distinct: ['direction']
    });

    // Get unique updated_by values from parcels table
    const updatedByList = await prisma.parcel.findMany({
      select: {
        updated_by: true
      },
      distinct: ['updated_by']
    });

    // Get all handovers for filtering
    const handovers = await prisma.handover.findMany({
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
    console.error('Error fetching filter options:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch filter options' },
      { status: 500 }
    );
  }
}