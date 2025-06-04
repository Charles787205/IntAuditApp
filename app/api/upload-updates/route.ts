import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from "@generated/prisma";

const prisma = new PrismaClient();

// Proper CSV parser that handles quoted fields with commas
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Handle escaped quotes
        current += '"';
        i += 2;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === ',' && !inQuotes) {
      // Found field separator outside of quotes
      result.push(current.trim());
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }
  
  // Add the last field
  result.push(current.trim());
  
  return result;
}

// In-memory job tracking (in production, use Redis or database)
const uploadJobs = new Map<string, {
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  result?: any;
  error?: string;
  startTime: Date;
}>();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json(
      { success: false, error: 'Job ID is required' },
      { status: 400 }
    );
  }

  const job = uploadJobs.get(jobId);
  if (!job) {
    return NextResponse.json(
      { success: false, error: 'Job not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    status: job.status,
    progress: job.progress,
    result: job.result,
    error: job.error,
    startTime: job.startTime
  });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Generate job ID
    const jobId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    
    // Initialize job tracking
    uploadJobs.set(jobId, {
      status: 'processing',
      progress: 0,
      startTime: new Date()
    });

    // Return job ID immediately for background processing
    const response = NextResponse.json({
      success: true,
      jobId,
      message: 'Upload started in background'
    });

    // Start background processing (don't await)
    processUploadInBackground(file, jobId);

    return response;

  } catch (error) {
    console.error('Error starting CSV upload:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to start upload process' },
      { status: 500 }
    );
  }
}

async function processUploadInBackground(file: File, jobId: string) {
  try {
    // Read the CSV file
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      uploadJobs.set(jobId, {
        ...uploadJobs.get(jobId)!,
        status: 'failed',
        error: 'CSV file must contain headers and at least one data row'
      });
      return;
    }

    // Parse headers and normalize them
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    
    // Find column indices dynamically - updated to match your CSV structure
    const trackingIndex = headers.findIndex(h => h === 'trackingnumber') || 0;
    const statusIndex = headers.findIndex(h => h === 'tplstatus');
    const updatedByIndex = headers.findIndex(h => h === 'laststatusupdatedbyname');
    const updatedAtIndex = headers.findIndex(h => h === 'laststatusupdatedat');
    const directionIndex = headers.findIndex(h => h === 'subdirection');

    console.log('CSV Headers:', headers);
    console.log('Column indices:', { trackingIndex, statusIndex, updatedByIndex, updatedAtIndex, directionIndex });

    // Update progress
    uploadJobs.set(jobId, {
      ...uploadJobs.get(jobId)!,
      progress: 10
    });

    // Create new export entry for global upload
    const exportEntry = await prisma.export.create({
      data: {
        export_name: `${file.name} - Global Update`,
        export_dir: `uploads/global/`
      }
    });

    // Process updates
    let updatedCount = 0;
    let notFoundCount = 0;
    const updates = [];
    const notFoundTracking = [];

    // Update progress
    uploadJobs.set(jobId, {
      ...uploadJobs.get(jobId)!,
      progress: 20
    });

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      
      // Clean tracking number
      let trackingNumber = values[trackingIndex] || '';
      trackingNumber = trackingNumber.replace(/"/g, '').trim();

      if (!trackingNumber) continue;

      const updateData: any = {};
      
      // Get status if column exists
      if (statusIndex >= 0 && values[statusIndex]) {
        const status = values[statusIndex].replace(/"/g, '').trim();
        if (status) {
          updateData.status = status;
        }
      }

      // Get sub_direction if column exists (fixed field name)
      if (directionIndex >= 0 && values[directionIndex]) {
        const directionValue = values[directionIndex].replace(/"/g, '').trim().toLowerCase();
        // Map the direction value to our enum
        if (directionValue === 'forward') {
          updateData.direction = 'forward';
        } else{
          updateData.direction = 'reverse';
        }
        // If value doesn't match our enum, keep existing value (don't update)
      }

      // Get updated_by
      const updatedBy = (updatedByIndex >= 0 && values[updatedByIndex]) 
        ? values[updatedByIndex].replace(/"/g, '').trim()
        : 'CSV Upload';
      updateData.updated_by = updatedBy;

      // Use provided updated_at or current time
      if (updatedAtIndex >= 0 && values[updatedAtIndex]) {
        try {
          const dateStr = values[updatedAtIndex].replace(/"/g, '').trim();
          if (dateStr) {
            updateData.updated_at = new Date(dateStr);
          } else {
            updateData.updated_at = new Date();
          }
        } catch {
          updateData.updated_at = new Date();
        }
      } else {
        updateData.updated_at = new Date();
      }

      updates.push({ trackingNumber, updateData, status: null as string | null });
    }

    console.log(`Processing ${updates.length} updates`);

    // Update progress
    uploadJobs.set(jobId, {
      ...uploadJobs.get(jobId)!,
      progress: 30
    });

    // Perform database updates globally (across all handovers)
    const totalUpdates = updates.length;
    for (let index = 0; index < updates.length; index++) {
      const update = updates[index];
      
      try {
        // Get current parcel data to log the status change
        const currentParcel = await prisma.parcel.findFirst({
          where: {
            tracking_number: update.trackingNumber
          }
        });

        if (currentParcel) {
          update.status = currentParcel.status;
          
          // Update the parcel
          const result = await prisma.parcel.updateMany({
            where: {
              tracking_number: update.trackingNumber
            },
            data: update.updateData
          });

          if (result.count > 0) {
            updatedCount++;

            // Log the status change if status was updated
            if (update.updateData.status && update.status !== update.updateData.status) {
              await prisma.parcelEventLog.create({
                data: {
                  tracking_number: update.trackingNumber,
                  updated_by: update.updateData.updated_by,
                  from_status: currentParcel.status,
                  new_status: update.updateData.status
                }
              });
            }
          }
        } else {
          notFoundCount++;
          notFoundTracking.push(update.trackingNumber);
        }
      } catch (error) {
        console.error(`Error updating ${update.trackingNumber}:`, error);
      }

      // Update progress periodically
      if (index % 100 === 0 || index === totalUpdates - 1) {
        const progress = 30 + Math.floor((index / totalUpdates) * 60);
        uploadJobs.set(jobId, {
          ...uploadJobs.get(jobId)!,
          progress
        });
      }
    }

    console.log(`Updated: ${updatedCount}, Not Found: ${notFoundCount}`);
    if (notFoundTracking.length > 0) {
      console.log('Sample tracking numbers not found:', notFoundTracking.slice(0, 5));
    }

    // Mark as completed
    uploadJobs.set(jobId, {
      ...uploadJobs.get(jobId)!,
      status: 'completed',
      progress: 100,
      result: {
        updatedCount,
        notFoundCount,
        totalProcessed: updates.length,
        exportId: exportEntry.id,
        exportName: exportEntry.export_name,
        sampleNotFound: notFoundTracking.slice(0, 5)
      }
    });

    // Clean up old jobs (keep for 1 hour)
    setTimeout(() => {
      uploadJobs.delete(jobId);
    }, 60 * 60 * 1000);

  } catch (error) {
    console.error('Error processing CSV upload:', error);
    uploadJobs.set(jobId, {
      ...uploadJobs.get(jobId)!,
      status: 'failed',
      error: 'Failed to process CSV file'
    });
  }
}