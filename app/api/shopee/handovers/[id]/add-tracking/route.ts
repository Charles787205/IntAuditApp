import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: handoverId } = await params;
    const body = await request.json();
    const { trackingNumbers } = body;

    if (!trackingNumbers || !Array.isArray(trackingNumbers) || trackingNumbers.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Please provide tracking numbers' },
        { status: 400 }
      );
    }

    // Check if handover exists and is a Shopee handover
    const handover = await prisma.handover.findFirst({
      where: {
        id: parseInt(handoverId),
        type: 'shopee'
      }
    });

    if (!handover) {
      return NextResponse.json(
        { success: false, error: 'Shopee handover not found' },
        { status: 404 }
      );
    }

    // Process tracking numbers - remove duplicates and ensure uppercase
    const seenInUpload = new Set();
    const uniqueTrackingNumbers = [];
    let internalDuplicateCount = 0;
    
    for (const trackingNumber of trackingNumbers) {
      const cleanTrackingNumber = trackingNumber.trim().toUpperCase(); // Ensure uppercase
      if (cleanTrackingNumber && !seenInUpload.has(cleanTrackingNumber)) {
        seenInUpload.add(cleanTrackingNumber);
        uniqueTrackingNumbers.push(cleanTrackingNumber);
      } else if (cleanTrackingNumber && seenInUpload.has(cleanTrackingNumber)) {
        internalDuplicateCount++;
      }
    }

    // Check for existing tracking numbers in database
    const existingParcels = await prisma.parcel.findMany({
      where: {
        tracking_number: {
          in: uniqueTrackingNumbers
        }
      },
      select: {
        tracking_number: true
      }
    });

    const existingTrackingNumbers = new Set(existingParcels.map(p => p.tracking_number));
    
    // Create only new tracking numbers
    const validParcels = [];
    let duplicateCount = 0;
    
    for (const trackingNumber of uniqueTrackingNumbers) {
      if (!existingTrackingNumbers.has(trackingNumber)) {
        validParcels.push({
          tracking_number: trackingNumber,
          handover_id: parseInt(handoverId),
          port_code: '', // Default empty for manual Shopee entries
          package_type: '', // Default empty for manual Shopee entries
          updated_by: 'system',
          status: 'pending'
        });
      } else {
        duplicateCount++;
      }
    }

    // Add new parcels to the handover
    if (validParcels.length > 0) {
      await prisma.parcel.createMany({
        data: validParcels
      });

      // Update handover quantity
      await prisma.handover.update({
        where: { id: parseInt(handoverId) },
        data: {
          quantity: {
            increment: validParcels.length
          }
        }
      });
    }

    // Return success with information about duplicates
    const totalDuplicates = duplicateCount + internalDuplicateCount;
    return NextResponse.json({ 
      success: true,
      addedCount: validParcels.length,
      duplicatesSkipped: totalDuplicates,
      internalDuplicates: internalDuplicateCount,
      databaseDuplicates: duplicateCount,
      message: validParcels.length > 0 
        ? `${validParcels.length} tracking numbers added successfully${totalDuplicates > 0 ? `. ${totalDuplicates} duplicates were skipped.` : '.'}`
        : 'No new tracking numbers were added (all were duplicates).'
    });

  } catch (error) {
    console.error('Error adding tracking numbers to Shopee handover:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add tracking numbers to handover' },
      { status: 500 }
    );
  }
}
