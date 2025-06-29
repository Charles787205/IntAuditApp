import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    
    // Filter parameters
    const search = searchParams.get('search') || '';
    const statuses = searchParams.getAll('status');
    const direction = searchParams.get('direction') || '';
    const portCode = searchParams.get('portCode') || '';
    const handoverId = searchParams.get('handoverId') || '';
    const updatedBy = searchParams.getAll('updatedBy');
    
    // Sorting parameters
    const sortBy = searchParams.get('sortBy') || 'updated_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    // Build where clause for filtering - Lazada parcels only
    const where: any = {};
    
    // Filter for Lazada parcels: either from Lazada handovers or with no handover
    if (handoverId) {
      if (handoverId === 'null') {
        where.handover_id = null;
      } else {
        where.handover_id = parseInt(handoverId);
        where.handover = {
          type: 'lazada'
        };
      }
    } else {
      // Default: show all Lazada-related parcels
      where.OR = [
        {
          handover: {
            type: 'lazada'
          }
        },
        {
          handover_id: null // Include parcels with no handover
        }
      ];
    }
    
    if (search) {
      where.tracking_number = {
        contains: search
      };
    }
    
    if (statuses.length > 0) {
      where.status = {
        in: statuses
      };
    }
    
    if (direction) {
      where.direction = direction;
    }
    
    if (portCode) {
      where.port_code = {
        contains: portCode
      };
    }
    
    // handoverId is already handled above in the main where clause
    
    if (updatedBy.length > 0) {
      where.updated_by = {
        in: updatedBy
      };
    }

    // Build orderBy clause
    let orderBy: any = {};
    
    if (sortBy === 'handover') {
      orderBy = {
        handover: {
          handover_date: sortOrder
        }
      };
    } else if (sortBy === 'handover_id') {
      orderBy = {
        handover_id: sortOrder
      };
    } else {
      orderBy = {
        [sortBy]: sortOrder
      };
    }

    // Get total count for pagination
    const totalCount = await prisma.parcel.count({ where });
    
    // Get parcels with pagination and filtering
    const parcels = await prisma.parcel.findMany({
      where,
      include: {
        handover: {
          select: {
            id: true,
            file_name: true,
            handover_date: true,
            status: true,
            platform: true,
            type: true
          }
        }
      },
      orderBy,
      skip,
      take: limit
    });

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return NextResponse.json({
      success: true,
      data: {
        parcels,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNext,
          hasPrev,
          limit
        }
      }
    });

  } catch (error) {
    console.error('Error fetching Lazada parcels:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch Lazada parcels' },
      { status: 500 }
    );
  }
}
