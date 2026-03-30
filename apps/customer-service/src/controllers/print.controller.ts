import { type Request, type Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

interface KennelLabelData {
  dogName: string;
  customerLastName: string;
  kennelNumber: string;
  groupSize: string;
}

/**
 * Generate ZPL code for a kennel label
 * 90pt font, duplicated content with 2" gap for collar readability
 */
const generateKennelLabelZPL = (data: KennelLabelData): string => {
  const { dogName, customerLastName, kennelNumber, groupSize } = data;

  // Use blank space for missing data
  const safeDogName = dogName || '';
  const safeLastName = customerLastName || '';
  const safeKennel = kennelNumber || '';
  const safeGroup = groupSize || '';

  // Truncate names to fit on label
  const truncatedDogName =
    safeDogName.length > 10 ? safeDogName.substring(0, 8) + '..' : safeDogName;
  const truncatedLastName =
    safeLastName.length > 8
      ? safeLastName.substring(0, 6) + '..'
      : safeLastName;

  // Build the main line: Name (LastName)   #Kennel   Group
  // Leave blank spaces for missing info
  const namePart = truncatedDogName ? `${truncatedDogName}` : '';
  const lastNamePart = truncatedLastName ? ` (${truncatedLastName})` : '';
  const kennelPart = safeKennel ? `   #${safeKennel}` : '';
  const groupPart = safeGroup ? `   ${safeGroup}` : '';
  const mainLine = `${namePart}${lastNamePart}${kennelPart}${groupPart}`;

  // ZPL with duplicated content for collar readability
  const zpl = `^XA
^FWR
^PW203
^LL2842
^CF0,90
^FO60,10^FD${mainLine}^FS
^FO60,1626^FD${mainLine}^FS
^PQ1
^XZ`;

  return zpl;
};

/**
 * Print a kennel label to the Zebra printer
 */
export const printKennelLabel = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { dogName, customerLastName, kennelNumber, groupSize } = req.body;

    // Allow missing fields - they will be blank on the label
    const labelData: KennelLabelData = {
      dogName: dogName || '',
      customerLastName: customerLastName || '',
      kennelNumber: kennelNumber || '',
      groupSize: groupSize || '',
    };

    // Generate ZPL
    const zpl = generateKennelLabelZPL(labelData);

    // Write ZPL to temp file
    const tempFile = path.join(os.tmpdir(), `kennel-label-${Date.now()}.zpl`);
    fs.writeFileSync(tempFile, zpl);

    try {
      // Send to printer using lp command
      const { stdout, stderr } = await execAsync(
        `lp -d Zebra_GK420d "${tempFile}"`
      );

      // Clean up temp file
      fs.unlinkSync(tempFile);

      if (stderr && !stderr.includes('request id')) {
        console.error('Print stderr:', stderr);
      }

      // Extract job ID from stdout (e.g., "request id is Zebra_GK420d-123 (1 file(s))")
      const jobIdMatch = stdout.match(/request id is (\S+)/);
      const jobId = jobIdMatch ? jobIdMatch[1] : null;

      res.json({
        success: true,
        message: 'Label sent to printer',
        jobId,
        labelData,
      });
    } catch (printError: any) {
      // Clean up temp file on error
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }

      console.error('Print error:', printError);

      // Return a more helpful error - not 500 for printer issues
      const errorMessage = printError.message || 'Unknown error';
      const isPrinterOffline =
        errorMessage.includes('not exist') ||
        errorMessage.includes('not found') ||
        errorMessage.includes('No such') ||
        errorMessage.includes('disabled');

      res.status(isPrinterOffline ? 503 : 500).json({
        success: false,
        error: isPrinterOffline
          ? 'Printer is offline or not available'
          : 'Failed to send to printer',
        details: errorMessage,
        labelData,
      });
    }
  } catch (error: any) {
    console.error('Error in printKennelLabel:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message,
    });
  }
};

/**
 * Get list of available printers
 */
export const getAvailablePrinters = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const { stdout } = await execAsync("lpstat -p 2>/dev/null || echo ''");

    const printers = stdout
      .split('\n')
      .filter((line) => line.startsWith('printer '))
      .map((line) => {
        const match = line.match(/printer (\S+)/);
        return match ? match[1] : null;
      })
      .filter(Boolean);

    res.json({
      success: true,
      printers,
      defaultPrinter: 'Zebra_GK420d',
    });
  } catch (error: any) {
    console.error('Error getting printers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get printer list',
      details: error.message,
    });
  }
};

/**
 * Check printer status
 */
export const getPrinterStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const printerName = req.params.printerName || 'Zebra_GK420d';

    const { stdout } = await execAsync(
      `lpstat -p ${printerName} 2>/dev/null || echo 'Printer not found'`
    );

    const isOnline = stdout.includes('idle') || stdout.includes('enabled');
    const status = stdout.trim();

    res.json({
      success: true,
      printer: printerName,
      isOnline,
      status,
    });
  } catch (error: any) {
    console.error('Error getting printer status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get printer status',
      details: error.message,
    });
  }
};
