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
    const statuses = searchParams.getAll('status'); // Changed to getAll for multiple values
    const direction = searchParams.get('direction') || '';
    const portCode = searchParams.get('portCode') || '';
    const handoverId = searchParams.get('handoverId') || '';
    const updatedBy = searchParams.getAll('updatedBy'); // Changed to getAll for multiple values
    const platform = searchParams.get('platform') || ''; // Add platform filter
    
    // Sorting parameters
    const sortBy = searchParams.get('sortBy') || 'updated_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    // Build where clause for filtering
    const where: any = {};
    
    if (search) {
      where.tracking_number = {
        contains: search,
        mode: 'insensitive'
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
        contains: portCode,
        mode: 'insensitive'
      };
    }
    
    if (handoverId) {
      if (handoverId === 'null') {
        where.handover_id = null;
      } else {
        where.handover_id = parseInt(handoverId);
      }
    }
    
    if (updatedBy.length > 0) {
      where.updated_by = {
        in: updatedBy
      };
    }

    if (platform) {
      where.handover = {
        platform: platform
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
            platform: true
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
    console.error('Error fetching parcels:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch parcels' },
      { status: 500 }
    );
  }
}