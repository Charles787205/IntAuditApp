import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const handoverId = parseInt(id);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const statusFilter = searchParams.get('status') || '';
    const updatedByFilter = searchParams.get('updated_by') || '';
    const directionFilter = searchParams.get('direction') || '';
    const skip = (page - 1) * limit;

    // Get handover details
    const handover = await prisma.handover.findUnique({
      where: { id: handoverId },
      include: {
        _count: {
          select: { parcels: true }
        }
      }
    });
    
    if (!handover) {
      return NextResponse.json(
        { success: false, error: 'Handover not found' },
        { status: 404 }
      );
    }

    // Build where clause for filters
    const whereClause: any = { handover_id: handoverId };
    
    if (statusFilter) {
      const statusArray = statusFilter.split(',');
      whereClause.status = { in: statusArray };
    }
    
    if (updatedByFilter) {
      const updatedByArray = updatedByFilter.split(',');
      whereClause.updated_by = { in: updatedByArray };
    }

    if (directionFilter) {
      const directionArray = directionFilter.split(',');
      whereClause.direction = { in: directionArray };
    }

    // Get filtered count for pagination
    const totalFilteredParcels = await prisma.parcel.count({
      where: whereClause
    });

    // Get paginated parcels with filters
    const parcels = await prisma.parcel.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { created_at: 'desc' }
    });

    // Get available filter options
    const availableStatuses = await prisma.parcel.findMany({
      where: { handover_id: handoverId },
      select: { status: true },
      distinct: ['status']
    });

    const availableUpdatedBy = await prisma.parcel.findMany({
      where: { handover_id: handoverId },
      select: { updated_by: true },
      distinct: ['updated_by']
    });

    const availableDirections = await prisma.parcel.findMany({
      where: { handover_id: handoverId },
      select: { direction: true },
      distinct: ['direction']
    });

    const totalPages = Math.ceil(totalFilteredParcels / limit);

    return NextResponse.json({
      success: true,
      handover: {
        id: handover.id,
        handover_date: handover.handover_date,
        quantity: handover.quantity,
        status: handover.status, // Include the status field
        date_added: handover.date_added,
        platform: handover.platform,
        file_name: handover.file_name,
        totalParcels: handover._count.parcels
      },
      parcels,
      availableStatuses: availableStatuses.map(p => p.status),
      availableUpdatedBy: availableUpdatedBy.map(p => p.updated_by),
      availableDirections: availableDirections.map(p => p.direction),
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalFilteredParcels,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching handover details:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch handover details' },
      { status: 500 }
    );
  }
}

// Add PATCH method to update handover status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const handoverId = parseInt(id);
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { success: false, error: 'Status is required' },
        { status: 400 }
      );
    }

    // Validate status
    if (!['pending', 'done'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status. Must be "pending" or "done"' },
        { status: 400 }
      );
    }

    const updatedHandover = await prisma.handover.update({
      where: { id: handoverId },
      data: { status }
    });

    return NextResponse.json({ 
      success: true, 
      handover: updatedHandover 
    });

  } catch (error) {
    console.error('Error updating handover status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update handover status' },
      { status: 500 }
    );
  }
}

// Add DELETE method to delete handover
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const handoverId = parseInt(id);

    // Check if handover exists
    const handover = await prisma.handover.findUnique({
      where: { id: handoverId },
      include: {
        _count: {
          select: { parcels: true }
        }
      }
    });

    if (!handover) {
      return NextResponse.json(
        { success: false, error: 'Handover not found' },
        { status: 404 }
      );
    }

    // Delete all related parcels first (cascade delete)
    await prisma.parcel.deleteMany({
      where: { handover_id: handoverId }
    });

    // Delete the handover
    await prisma.handover.delete({
      where: { id: handoverId }
    });

    return NextResponse.json({ 
      success: true, 
      message: `Handover and ${handover._count.parcels} related parcels deleted successfully` 
    });

  } catch (error) {
    console.error('Error deleting handover:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete handover' },
      { status: 500 }
    );
  }
}