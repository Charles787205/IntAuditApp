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
    const portCode = searchParams.get('port_code');
    const handoverId = searchParams.get('handoverId') || '';
    const updatedBy = searchParams.getAll('updatedBy');
    
    // Sorting parameters
    const sortBy = searchParams.get('sortBy') || 'updated_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    // Build where clause for filtering - Shopee parcels only
    const where: any = {
      // Filter for Shopee parcels: either from Shopee handovers or with no handover
      ...(handoverId
        ? handoverId === 'null'
          ? { handover_id: null }
          : {
              handover_id: parseInt(handoverId),
              handover: {
                type: 'shopee'
              }
            }
        : {
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
          }),
      // Add search filter
      ...(search ? { tracking_number: { contains: search } } : {}),
      // Add status filter
      ...(statuses.length > 0 ? { status: { in: statuses } } : {}),
      // Add direction filter
      ...(direction ? { direction } : {}),
      // Add port_code filter
      ...(portCode ? { port_code: { equals: portCode } } : {}),
      // handoverId is already handled above in the main where clause
      // Add updatedBy filter
      ...(updatedBy.length > 0 ? { updated_by: { in: updatedBy } } : {})
    };

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
    console.error('Error fetching Shopee parcels:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch Shopee parcels' },
      { status: 500 }
    );
  }
}
