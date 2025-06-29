import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { handoverData, extractedData } = body;

    // Filter out parcels with tracking numbers that already exist in the database
    const validParcels = [];
    let duplicateCount = 0;
    let internalDuplicateCount = 0;
    
    if (extractedData && extractedData.length > 0) {
      // First, remove duplicates within the uploaded data itself
      const seenInUpload = new Set();
      const uniqueExtractedData = [];
      
      for (const item of extractedData) {
        if (!seenInUpload.has(item.trackingNo)) {
          seenInUpload.add(item.trackingNo);
          uniqueExtractedData.push(item);
        } else {
          internalDuplicateCount++;
        }
      }
      
      // Get all existing tracking numbers in one query for efficiency
      const trackingNumbers = uniqueExtractedData.map(item => item.trackingNo);
      const existingParcels = await prisma.parcel.findMany({
        where: {
          tracking_number: {
            in: trackingNumbers
          }
        },
        select: {
          tracking_number: true
        }
      });
      
      const existingTrackingNumbers = new Set(existingParcels.map(p => p.tracking_number));
      
      for (const item of uniqueExtractedData) {
        if (!existingTrackingNumbers.has(item.trackingNo)) {
          validParcels.push({
            tracking_number: item.trackingNo,
            port_code: item.portCode,
            package_type: item.packageType,
            updated_by: 'system',
            status: 'pending'
          });
        } else {
          duplicateCount++;
        }
      }
    }

    // Create handover with only valid (non-duplicate) parcels and include type
    const newHandover = await prisma.handover.create({
      data: {
        handover_date: new Date(handoverData.date),
        quantity: validParcels.length, // Use actual count of valid parcels
        file_name: handoverData.fileName,
        platform: 'manual',
        type: handoverData.type || 'lazada', // Add type field with default
        parcels: {
          create: validParcels
        }
      },
      include: {
        parcels: true
      }
    });

    // Return success with information about duplicates
    const totalDuplicates = duplicateCount + internalDuplicateCount;
    return NextResponse.json({ 
      success: true, 
      handover: newHandover,
      duplicatesSkipped: totalDuplicates,
      internalDuplicates: internalDuplicateCount,
      databaseDuplicates: duplicateCount,
      message: totalDuplicates > 0 
        ? `Handover created successfully. ${totalDuplicates} duplicate tracking numbers were skipped (${internalDuplicateCount} within upload, ${duplicateCount} already in database).`
        : 'Handover created successfully.'
    });

  } catch (error) {
    console.error('Error creating handover:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create handover' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const handovers = await prisma.handover.findMany({
      include: {
        parcels: {
          select: {
            tracking_number: true // Only select tracking number to get count
          }
        }
      },
      orderBy: {
        date_added: 'desc'
      }
    });

    return NextResponse.json({ 
      success: true, 
      handovers 
    });

  } catch (error) {
    console.error('Error fetching handovers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch handovers' },
      { status: 500 }
    );
  }
}

// Add PUT method to update handover status
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: 'Handover ID and status are required' },
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
      where: { id: parseInt(id) },
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