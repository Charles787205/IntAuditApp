interface HandoverData {
  trackingNo: string;
  portCode: string;
  packageType: string;
  status?: string;
  updated_by?: string;
}

interface Handover {
  id: number;
  date: string;
  fileName?: string;
  createdAt: string;
  extractedData?: HandoverData[];
}

interface PrintHandoverReportProps {
  handoverId: number;
  fileName?: string;
}

export default function PrintHandoverReport({ handoverId, fileName }: PrintHandoverReportProps) {
  const handlePrint = async () => {
    try {
      // Fetch the print data from the dedicated API
      const response = await fetch(`/api/handovers/${handoverId}/print`);
      const data = await response.json();

      if (!data.success || !data.handover.extractedData || data.handover.extractedData.length === 0) {
        alert('No data to print');
        return;
      }

      const handover = data.handover;

      // Create a printable version of the data
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Handover Data - ${handover.fileName || fileName}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
                .header { margin-bottom: 20px; }
                .info { background: #f5f5f5; padding: 10px; border-radius: 5px; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; font-weight: bold; }
                tr:nth-child(even) { background-color: #f9f9f9; }
                .total { margin-top: 20px; font-weight: bold; }
                @media print {
                  body { margin: 0; }
                  .no-print { display: none; }
                }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>Handover Data Report</h1>
                <div class="info">
                  <p><strong>File:</strong> ${handover.fileName || fileName}</p>
                  <p><strong>Date:</strong> ${new Date(handover.date).toLocaleDateString()}</p>
                  <p><strong>Created:</strong> ${new Date(handover.createdAt).toLocaleDateString()}</p>
                  <p><strong>Status:</strong> ${handover.status}</p>
                  <p><strong>Total Records:</strong> ${handover.extractedData.length}</p>
                </div>
              </div>
              
              <table>
                <thead>
                  <tr>
                    <th>Tracking Number</th>
                    <th>Port Code</th>
                    <th>Package Type</th>
                    <th>Status</th>
                    <th>Updated By</th>
                  </tr>
                </thead>
                <tbody>
                  ${handover.extractedData.map((item: any, index: number) => `
                    <tr>
                      <td>${item.trackingNo}</td>
                      <td>${item.portCode}</td>
                      <td>${item.packageType}</td>
                      <td>${item.status || '-'}</td>
                      <td>${item.updated_by || '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              
              <div class="total">
                Total: ${handover.extractedData.length} records
              </div>
              
              <div class="no-print" style="margin-top: 20px;">
                <button onclick="window.print()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">Print</button>
                <button onclick="window.close()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">Close</button>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    } catch (error) {
      console.error('Error fetching print data:', error);
      alert('Failed to load print data. Please try again.');
    }
  };

  return (
    <button 
      onClick={handlePrint}
      className="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300"
    >
      Print
    </button>
  );
}