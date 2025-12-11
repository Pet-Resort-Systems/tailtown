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

export interface KennelLabelData {
  dogName: string;
  kennelNumber: string;
  boardingType: string; // e.g., "Standard Suite", "VIP Suite", "Daycare"
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
  const { dogName, kennelNumber, boardingType } = data;

  // Truncate long names to fit on label
  const truncatedDogName =
    dogName.length > 15 ? dogName.substring(0, 13) + ".." : dogName;
  const truncatedBoardingType =
    boardingType.length > 20
      ? boardingType.substring(0, 18) + ".."
      : boardingType;

  // ZPL Commands:
  // ^XA = Start format
  // ^FO = Field Origin (x,y position in dots)
  // ^FD = Field Data
  // ^FS = Field Separator
  // ^XZ = End format

  // For 1" wide label, we use horizontal text layout
  // X position controls horizontal placement on the label
  // Y position controls vertical placement

  // ^FWR rotates all fields 90° so text runs along the 6" length
  // X controls vertical stacking (0=bottom, 203=top of 1" width)
  // Y controls horizontal position along the length
  const zpl = `^XA
^FWR
^PW203
^LL609
^CF0,45
^FO145,30^FD${truncatedDogName}^FS
^CF0,70
^FO65,30^FD#${kennelNumber}^FS
^CF0,30
^FO20,30^FD${truncatedBoardingType}^FS
^PQ1
^XZ`;

  return zpl;
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
 * Print label using raw printing (requires print server or driver)
 * This method uses a hidden iframe to trigger the print dialog
 */
export const printLabelRaw = async (
  data: KennelLabelData
): Promise<boolean> => {
  const zpl = generateKennelLabelZPL(data);

  // Create a hidden iframe
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  document.body.appendChild(iframe);

  // Write the ZPL content
  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(
      `<pre style="font-family: monospace; white-space: pre;">${zpl}</pre>`
    );
    doc.close();

    // Trigger print
    iframe.contentWindow?.print();
  }

  // Clean up after a delay
  setTimeout(() => {
    document.body.removeChild(iframe);
  }, 1000);

  return true;
};

/**
 * Main print function - tries USB first, falls back to download
 */
export const printKennelLabel = async (
  data: KennelLabelData,
  method: "usb" | "download" | "raw" = "usb"
): Promise<boolean> => {
  switch (method) {
    case "usb":
      return printLabelViaUSB(data);
    case "download":
      return printLabelViaBrowser(data);
    case "raw":
      return printLabelRaw(data);
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
  generateKennelLabelZPL,
  getZPLPreview,
  printLabelViaUSB,
  printLabelViaBrowser,
  printLabelRaw,
};

export default labelPrintService;
