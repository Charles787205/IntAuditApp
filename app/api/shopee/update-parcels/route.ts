import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, method, headers, data } = body;

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }

    
    // Make the external API request
    const response = await fetch(url, {
      method: method || 'GET',
      headers: {
        ...headers,
        // Remove sensitive headers that might cause issues
        'host': undefined,
        'origin': undefined,
        'referer': undefined,
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`External API error: ${response.status} ${response.statusText}`, errorText);
      
      // Check if it's an authentication error
      const isAuthError = response.status === 401 || response.status === 403 || 
                         errorText.toLowerCase().includes('authentication') ||
                         errorText.toLowerCase().includes('unauthorized') ||
                         errorText.toLowerCase().includes('auth');
      
      return NextResponse.json(
        { 
          success: false, 
          error: `External API error: ${response.status} ${response.statusText}`,
          isAuthError,
          details: errorText
        },
        { status: response.status }
      );
    }

    const apiResult = await response.json();
    console.log('Shopee API Response:', JSON.stringify(apiResult, null, 2));
    
    // Log some key fields from the response for debugging
    if (apiResult && apiResult.data && apiResult.data.list && Array.isArray(apiResult.data.list)) {
      console.log(`Found ${apiResult.data.list.length} parcels in API response`);
      apiResult.data.list.forEach((item: any, index: number) => {
        console.log(`Parcel ${index + 1}: ${item.shipment_id} - status: ${item.order_status}, bulky_type: ${item.bulky_type}, driver: "${item.driver_name || 'none'}", station: "${item.current_station_name || 'none'}"`);
      });
    }
    
    // Process the Shopee API response and update parcels
    let updatedCount = 0;
    const updates: Array<{
      tracking_number: string;
      status: string;
      updated_by: string;
      port_code?: string;
      package_type?: string;
    }> = [];
    
    // Map order_status numbers to status names
    const statusMap: Record<number, string> = {
      1: 'LMHub_Received',
      4: 'Delivered', 
      5: 'OnHold',
      6: "Return_SOC_Returned",
      10: 'Return_LMHub_Received',
      50: 'LMHub_Assigned',
      64: 'Return_SOC_LHTransport',
      53: "Return_LMHub_Packed",
      73: "Return_FMHub_Returned",
      65: "Return_SOC_LHTransported",
      116: "Return_FMHub_Assigned"

    };
    
    if (apiResult && apiResult.data && apiResult.data.list && Array.isArray(apiResult.data.list)) {
      for (const item of apiResult.data.list) {
        if (item.shipment_id && typeof item.order_status === 'number') {
          const statusName = statusMap[item.order_status] || `Unknown_Status_${item.order_status}`;
          
          // Map bulky_type to package_type
          let packageType = null;
          if (item.bulky_type === 1) {
            packageType = 'Bulky';
          } else if (item.bulky_type === 2) {
            packageType = 'Pouch';
          }
          
          // Use driver name for updated_by, fallback to "system" if empty
          const updatedBy = item.driver_name && item.driver_name.trim() !== '' 
            ? item.driver_name.trim() 
            : 'system';
          
          console.log(`Processing ${item.shipment_id}: status=${statusName}, package_type=${packageType || 'unknown'}, updated_by=${updatedBy}, port_code=${item.current_station_name || 'none'}`);
          
          updates.push({
            tracking_number: item.shipment_id.toUpperCase(),
            status: statusName,
            updated_by: updatedBy,
            // Add other fields from the response
            ...(item.current_station_name && { port_code: item.current_station_name }),
            ...(packageType && { package_type: packageType }),
          });
        }
      }

      // Update parcels in database
      for (const update of updates) {
        try {
          const updateData: any = {
            status: update.status,
            updated_by: update.updated_by,
            updated_at: new Date(),
          };
          
          // Only add port_code if it exists
          if (update.port_code) {
            updateData.port_code = update.port_code;
          }
          
          // Only add package_type if it exists
          if (update.package_type) {
            updateData.package_type = update.package_type;
          }
          
          const result = await prisma.parcel.updateMany({
            where: {
              tracking_number: update.tracking_number,
            },
            data: updateData,
          });
          
          if (result.count > 0) {
            updatedCount += result.count;
            console.log(`Updated parcel ${update.tracking_number} with status: ${update.status}, updated_by: ${update.updated_by}${update.package_type ? `, package_type: ${update.package_type}` : ''}${update.port_code ? `, port_code: ${update.port_code}` : ''}`);
          } else {
            console.log(`No parcel found with tracking number: ${update.tracking_number}`);
          }
        } catch (error) {
          console.error(`Error updating parcel ${update.tracking_number}:`, error);
        }
      }
    }

    return NextResponse.json({ 
      success: true,
      message: `Successfully processed API response. Updated ${updatedCount} parcels.`,
      updatedCount,
      totalFound: apiResult.data?.list?.length || 0,
      processedParcels: updates.map(u => ({ 
        tracking_number: u.tracking_number, 
        status: u.status,
        updated_by: u.updated_by,
        port_code: u.port_code,
        package_type: u.package_type
      })),
      apiResponse: apiResult
    });

  } catch (error) {
    console.error('Error processing update request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process update request' },
      { status: 500 }
    );
  }
}
