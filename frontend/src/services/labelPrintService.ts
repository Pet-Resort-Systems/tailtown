/**
 * Label Printing Service for Zebra GK420d
 *
 * Printer specs:
 * - Resolution: 203 DPI
 * - Label width: 1" (203 dots)
 * - Label height: 6" (1218 dots)
 * - Connection: USB
 *
 * Uses ZPL (Zebra Programming Language) for label formatting
 */

import { customerApi } from "./api";

export interface KennelLabelData {
  dogName: string;
  customerLastName: string;
  kennelNumber: string;
  groupSize: string; // e.g., "Small", "Medium", "Large"
}

export interface BatchPrintProgress {
  index: number;
  total: number;
  label: KennelLabelData;
}

export interface BatchPrintResult {
  successCount: number;
  failureCount: number;
  failures: Array<{ index: number; label: KennelLabelData; error: string }>;
}

// Label dimensions in dots (203 DPI)
// 1" width = 203 dots, 3" length = 609 dots

/**
 * Generate ZPL code for a kennel label
 * For 1" x 3" continuous labels on Zebra GK420d
 *
 * At 203 DPI:
 * - 1" = 203 dots
 * - 3" = 609 dots
 */
export const generateKennelLabelZPL = (data: KennelLabelData): string => {
  const { dogName, customerLastName, kennelNumber, groupSize } = data;

  // Truncate names to fit on label
  const truncatedDogName =
    dogName.length > 10 ? dogName.substring(0, 8) + ".." : dogName;
  const truncatedLastName =
    customerLastName.length > 8
      ? customerLastName.substring(0, 6) + ".."
      : customerLastName;

  // Build the main line: Name (LastName)   #Kennel   Group
  const mainLine = `${truncatedDogName} (${truncatedLastName})   #${kennelNumber}   ${groupSize}`;

  // ZPL Commands:
  // ^XA = Start format
  // ^FO = Field Origin (x,y position in dots)
  // ^FD = Field Data
  // ^FS = Field Separator
  // ^XZ = End format

  // For 1" wide label with duplicated content for neck collar readability
  // ^FWR rotates all fields 90° so text runs along the label length
  // X controls vertical stacking (0=bottom, 203=top of 1" width)
  // Y controls horizontal position along the length
  // Label length: ~14" (2842 dots) to fit both copies with 2" gap
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Print multiple labels sequentially.
 *
 * Printing is intentionally sequential to avoid overwhelming the printer/spooler.
 */
export const printKennelLabelsBatch = async (
  labels: KennelLabelData[],
  method: "server" | "usb" | "download" = "server",
  options?: {
    delayMs?: number;
    onProgress?: (progress: BatchPrintProgress) => void;
    printFn?: (
      data: KennelLabelData,
      method: "server" | "usb" | "download"
    ) => Promise<boolean>;
  }
): Promise<BatchPrintResult> => {
  const delayMs = options?.delayMs ?? 250;
  const printFn = options?.printFn ?? printKennelLabel;
  const failures: BatchPrintResult["failures"] = [];
  let successCount = 0;

  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    options?.onProgress?.({ index: i, total: labels.length, label });

    try {
      const ok = await printFn(label, method);
      if (ok) {
        successCount += 1;
      } else {
        failures.push({
          index: i,
          label,
          error: "Print returned false",
        });
      }
    } catch (e: any) {
      failures.push({
        index: i,
        label,
        error: e?.message || "Failed to print label",
      });
    }

    if (delayMs > 0 && i < labels.length - 1) {
      await sleep(delayMs);
    }
  }

  return {
    successCount,
    failureCount: failures.length,
    failures,
  };
};

/**
 * Print label using browser's print dialog
 * This creates a hidden iframe with the ZPL content
 */
export const printLabelViaBrowser = async (
  data: KennelLabelData
): Promise<boolean> => {
  const zpl = generateKennelLabelZPL(data);

  // Create a Blob with the ZPL content
  const blob = new Blob([zpl], { type: "application/x-zpl" });
  const url = URL.createObjectURL(blob);

  // Create a hidden link and trigger download
  // User can then send this to the printer
  const link = document.createElement("a");
  link.href = url;
  link.download = `kennel-label-${data.kennelNumber}.zpl`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return true;
};

/**
 * Print label using Web Serial API (Chrome/Edge only)
 * This allows direct USB communication with the printer
 */
export const printLabelViaUSB = async (
  data: KennelLabelData
): Promise<boolean> => {
  const zpl = generateKennelLabelZPL(data);

  // Check if Web Serial API is available
  if (!("serial" in navigator)) {
    console.error("Web Serial API not supported in this browser");
    throw new Error("Web Serial API not supported. Please use Chrome or Edge.");
  }

  try {
    // Request access to the serial port
    // @ts-ignore - Web Serial API types
    const port = await navigator.serial.requestPort();

    // Open the port with Zebra printer settings
    await port.open({
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: "none",
    });

    // Get a writer
    const writer = port.writable.getWriter();

    // Convert ZPL string to bytes
    const encoder = new TextEncoder();
    const data_bytes = encoder.encode(zpl);

    // Write to the printer
    await writer.write(data_bytes);

    // Close the writer and port
    writer.releaseLock();
    await port.close();

    return true;
  } catch (error) {
    console.error("Error printing label:", error);
    throw error;
  }
};

/**
 * Print label via backend API (sends to server which prints via lp command)
 * Uses the system endpoint which doesn't require authentication
 */
export const printLabelViaServer = async (
  data: KennelLabelData
): Promise<{ success: boolean; jobId?: string; error?: string }> => {
  try {
    const response = await customerApi.post(
      "/api/system/print/kennel-label",
      data
    );
    return response.data;
  } catch (error: any) {
    console.error("Error printing via server:", error);
    throw new Error(
      error.response?.data?.error || "Failed to print label via server"
    );
  }
};

/**
 * Main print function - server is default, with fallbacks
 */
export const printKennelLabel = async (
  data: KennelLabelData,
  method: "server" | "usb" | "download" = "server"
): Promise<boolean> => {
  switch (method) {
    case "server":
      const result = await printLabelViaServer(data);
      return result.success;
    case "usb":
      return printLabelViaUSB(data);
    case "download":
      return printLabelViaBrowser(data);
    default:
      return printLabelViaBrowser(data);
  }
};

/**
 * Get ZPL preview as text (for debugging)
 */
export const getZPLPreview = (data: KennelLabelData): string => {
  return generateKennelLabelZPL(data);
};

const labelPrintService = {
  printKennelLabel,
  printKennelLabelsBatch,
  generateKennelLabelZPL,
  getZPLPreview,
  printLabelViaUSB,
  printLabelViaBrowser,
  printLabelViaServer,
};

export default labelPrintService;
