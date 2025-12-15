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
 * Simple format that works with Zebra GK420d
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

  // Build the main line: Name (LastName) #Kennel Group
  const mainLine = `${truncatedDogName} (${truncatedLastName})   #${kennelNumber}   ${groupSize}`;

  // ZPL for 1" continuous roll - prints twice with spacing for collar tags
  // ^MNN = Continuous media mode (no media tracking)
  // ^FWR = Rotate 90° so text runs along label length
  // ^PW203 = Print width 203 dots (1" at 203 DPI)
  // ^LL2030 = First label 10" (8" content + 2" leading space)
  // ^LL2436 = Second label 12" (8" content + 4" trailing space)
  // ^CF0,90 = Font 0 at 90 dots height
  // Two sequential labels for duplicate content
  const zpl = `^XA
^MNN
^FWR
^PW203
^LL2030
^CF0,90
^FO60,50^FD${mainLine}^FS
^XZ^XA
^MNN
^FWR
^PW203
^LL2436
^CF0,90
^FO60,50^FD${mainLine}^FS
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
  method: "local" | "browser" | "server" | "usb" | "download" = "local",
  options?: {
    delayMs?: number;
    onProgress?: (progress: BatchPrintProgress) => void;
    printFn?: (
      data: KennelLabelData,
      method: "local" | "browser" | "server" | "usb" | "download"
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
 * Download ZPL file for manual printing
 */
export const downloadZPLFile = async (
  data: KennelLabelData
): Promise<boolean> => {
  const zpl = generateKennelLabelZPL(data);

  // Create a Blob with the ZPL content
  const blob = new Blob([zpl], { type: "application/x-zpl" });
  const url = URL.createObjectURL(blob);

  // Create a hidden link and trigger download
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
 * Print label using browser's print dialog with HTML rendering
 * This creates a popup window with the label formatted for printing
 */
export const printLabelViaBrowser = async (
  data: KennelLabelData
): Promise<boolean> => {
  const { dogName, customerLastName, kennelNumber, groupSize } = data;

  // Truncate names to fit on label (same logic as ZPL)
  const truncatedDogName =
    dogName.length > 10 ? dogName.substring(0, 8) + ".." : dogName;
  const truncatedLastName =
    customerLastName.length > 8
      ? customerLastName.substring(0, 6) + ".."
      : customerLastName;

  // Create HTML content for the label
  // Designed for 1" x 14" continuous label with text rotated 90°
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Kennel Label - ${kennelNumber}</title>
      <style>
        @page {
          size: 14in 1in;
          margin: 0;
        }
        @media print {
          body { margin: 0; padding: 0; }
        }
        body {
          margin: 0;
          padding: 0;
          font-family: Arial, sans-serif;
        }
        .label-container {
          width: 14in;
          height: 1in;
          display: flex;
          align-items: center;
          justify-content: space-around;
          background: white;
        }
        .label-text {
          font-size: 48px;
          font-weight: bold;
          white-space: nowrap;
        }
        .kennel-number {
          color: #1976d2;
        }
      </style>
    </head>
    <body>
      <div class="label-container">
        <div class="label-text">
          ${truncatedDogName} (${truncatedLastName}) 
          <span class="kennel-number">#${kennelNumber}</span> 
          ${groupSize}
        </div>
        <div class="label-text">
          ${truncatedDogName} (${truncatedLastName}) 
          <span class="kennel-number">#${kennelNumber}</span> 
          ${groupSize}
        </div>
      </div>
      <script>
        window.onload = function() {
          window.print();
          setTimeout(function() { window.close(); }, 500);
        };
      </script>
    </body>
    </html>
  `;

  // Open a new window with the label content
  const printWindow = window.open("", "_blank", "width=800,height=200");
  if (!printWindow) {
    throw new Error("Could not open print window. Please allow popups.");
  }

  printWindow.document.write(htmlContent);
  printWindow.document.close();

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
 * Print label via local print agent running on localhost:9100
 * This sends ZPL directly to the printer via the local agent
 */
export const printLabelViaLocalAgent = async (
  data: KennelLabelData
): Promise<boolean> => {
  const zpl = generateKennelLabelZPL(data);
  const LOCAL_AGENT_URL = "http://localhost:9101";

  try {
    const response = await fetch(`${LOCAL_AGENT_URL}/print`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zpl }),
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "Print failed");
    }
    return true;
  } catch (error: any) {
    if (error.message?.includes("Failed to fetch")) {
      throw new Error(
        "Local Print Agent not running. Start it with: node tools/local-print-agent/server.js"
      );
    }
    throw error;
  }
};

/**
 * Check if local print agent is running
 */
export const checkLocalAgentStatus = async (): Promise<{
  running: boolean;
  printer?: string;
}> => {
  const LOCAL_AGENT_URL = "http://localhost:9101";
  try {
    const response = await fetch(`${LOCAL_AGENT_URL}/health`);
    const result = await response.json();
    return { running: result.status === "ok", printer: result.printer };
  } catch {
    return { running: false };
  }
};

/**
 * Main print function - local agent is default for automatic printing
 */
export const printKennelLabel = async (
  data: KennelLabelData,
  method: "local" | "browser" | "server" | "usb" | "download" = "local"
): Promise<boolean> => {
  switch (method) {
    case "local":
      return printLabelViaLocalAgent(data);
    case "browser":
      return printLabelViaBrowser(data);
    case "server":
      const result = await printLabelViaServer(data);
      return result.success;
    case "usb":
      return printLabelViaUSB(data);
    case "download":
      return downloadZPLFile(data);
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
