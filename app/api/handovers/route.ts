import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from "@generated/prisma";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { handoverData, extractedData } = body;

    // Create handover with associated parcels
    const newHandover = await prisma.handover.create({
      data: {
        handover_date: new Date(handoverData.date),
        quantity: extractedData?.length || 0,
        file_name: handoverData.fileName,
        platform: 'manual',
        parcels: {
          create: extractedData?.map((item: any) => ({
            tracking_number: item.trackingNo,
            port_code: item.portCode,
            package_type: item.packageType,
            updated_by: 'system',
            status: 'pending'
          })) || []
        }
      },
      include: {
        parcels: true
      }
    });

    return NextResponse.json({ 
      success: true, 
      handover: newHandover 
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