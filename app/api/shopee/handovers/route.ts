import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const handovers = await prisma.handover.findMany({
      where: {
        type: 'shopee' // Filter for Shopee handovers only
      },
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
    console.error('Error fetching Shopee handovers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch Shopee handovers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { handoverData, trackingNumbers } = body;

    // Filter out parcels with tracking numbers that already exist in the database
    const validParcels = [];
    let duplicateCount = 0;
    let internalDuplicateCount = 0;
    
    if (trackingNumbers && trackingNumbers.length > 0) {
      // First, remove duplicates within the uploaded data itself
      const seenInUpload = new Set();
      const uniqueTrackingNumbers = [];
      
      for (const trackingNumber of trackingNumbers) {
        const cleanTrackingNumber = trackingNumber.trim().toUpperCase(); // Ensure uppercase
        if (cleanTrackingNumber && !seenInUpload.has(cleanTrackingNumber)) {
          seenInUpload.add(cleanTrackingNumber);
          uniqueTrackingNumbers.push(cleanTrackingNumber);
        } else if (cleanTrackingNumber && seenInUpload.has(cleanTrackingNumber)) {
          internalDuplicateCount++;
        }
      }
      
      // Get all existing tracking numbers in one query for efficiency
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
      
      for (const trackingNumber of uniqueTrackingNumbers) {
        if (!existingTrackingNumbers.has(trackingNumber)) {
          validParcels.push({
            tracking_number: trackingNumber,
            port_code: '', // Default empty for manual Shopee entries
            package_type: '', // Default empty for manual Shopee entries
            updated_by: 'system',
            status: 'pending'
          });
        } else {
          duplicateCount++;
        }
      }
    }

    // Create handover with only valid (non-duplicate) parcels and force type to 'shopee'
    const newHandover = await prisma.handover.create({
      data: {
        handover_date: new Date(handoverData.date),
        quantity: validParcels.length,
        file_name: handoverData.fileName,
        platform: 'manual',
        type: 'shopee', // Force type to 'shopee' for this endpoint
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
        ? `Shopee handover created successfully. ${totalDuplicates} duplicate tracking numbers were skipped (${internalDuplicateCount} within upload, ${duplicateCount} already in database).`
        : 'Shopee handover created successfully.'
    });

  } catch (error) {
    console.error('Error creating Shopee handover:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create Shopee handover' },
      { status: 500 }
    );
  }
}