import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const handovers = await prisma.handover.findMany({
      where: {
        type: 'lazada' // Filter for Lazada handovers only
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
    console.error('Error fetching Lazada handovers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch Lazada handovers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { handoverData, extractedData } = body;

    // Filter out parcels with tracking numbers that already exist in the database
    let validParcels = [];
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

    // Create handover with only valid (non-duplicate) parcels and force type to 'lazada'
    const newHandover = await prisma.handover.create({
      data: {
        handover_date: new Date(handoverData.date),
        quantity: validParcels.length,
        file_name: handoverData.fileName,
        platform: 'manual',
        type: 'lazada', // Force type to 'lazada' for this endpoint
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
        ? `Lazada handover created successfully. ${totalDuplicates} duplicate tracking numbers were skipped (${internalDuplicateCount} within upload, ${duplicateCount} already in database).`
        : 'Lazada handover created successfully.'
    });

  } catch (error) {
    console.error('Error creating Lazada handover:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create Lazada handover' },
      { status: 500 }
    );
  }
}