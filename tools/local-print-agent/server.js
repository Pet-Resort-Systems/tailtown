#!/usr/bin/env node
/**
 * Local Print Agent for Zebra Label Printing
 *
 * This runs on your local machine and receives print requests from the browser,
 * then sends ZPL directly to the Zebra printer via the `lp` command.
 *
 * Usage:
 *   node server.js
 *
 * The server listens on http://localhost:9100 by default.
 *
 * Configuration:
 *   PRINTER_NAME - Name of the printer (default: Zebra_GK420d)
 *   PORT - Port to listen on (default: 9100)
 */

const http = require("http");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const PORT = process.env.PORT || 9101;
const PRINTER_NAME = process.env.PRINTER_NAME || "Zebra_GK420d";

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const server = http.createServer((req, res) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  // Health check endpoint
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { ...corsHeaders, "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", printer: PRINTER_NAME }));
    return;
  }

  // Print endpoint
  if (req.method === "POST" && req.url === "/print") {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        const zpl = data.zpl;

        if (!zpl) {
          res.writeHead(400, {
            ...corsHeaders,
            "Content-Type": "application/json",
          });
          res.end(
            JSON.stringify({ success: false, error: "No ZPL content provided" })
          );
          return;
        }

        // Write ZPL to temp file
        const tempFile = path.join(os.tmpdir(), `label-${Date.now()}.zpl`);
        fs.writeFileSync(tempFile, zpl);

        // Send to printer using lp command (no raw option for Zebra continuous media)
        const cmd = `lp -d "${PRINTER_NAME}" "${tempFile}"`;

        exec(cmd, (error, stdout, stderr) => {
          // Clean up temp file
          try {
            fs.unlinkSync(tempFile);
          } catch (e) {}

          if (error) {
            console.error("Print error:", error.message);
            res.writeHead(500, {
              ...corsHeaders,
              "Content-Type": "application/json",
            });
            res.end(JSON.stringify({ success: false, error: error.message }));
            return;
          }

          console.log(`Printed label to ${PRINTER_NAME}`);
          res.writeHead(200, {
            ...corsHeaders,
            "Content-Type": "application/json",
          });
          res.end(
            JSON.stringify({ success: true, message: "Label sent to printer" })
          );
        });
      } catch (e) {
        res.writeHead(400, {
          ...corsHeaders,
          "Content-Type": "application/json",
        });
        res.end(JSON.stringify({ success: false, error: "Invalid JSON" }));
      }
    });
    return;
  }

  // List printers endpoint
  if (req.method === "GET" && req.url === "/printers") {
    exec("lpstat -p", (error, stdout, stderr) => {
      if (error) {
        res.writeHead(500, {
          ...corsHeaders,
          "Content-Type": "application/json",
        });
        res.end(JSON.stringify({ success: false, error: error.message }));
        return;
      }

      const printers = stdout
        .split("\n")
        .filter((line) => line.startsWith("printer "))
        .map((line) => {
          const match = line.match(/^printer (\S+)/);
          return match ? match[1] : null;
        })
        .filter(Boolean);

      res.writeHead(200, {
        ...corsHeaders,
        "Content-Type": "application/json",
      });
      res.end(
        JSON.stringify({ success: true, printers, default: PRINTER_NAME })
      );
    });
    return;
  }

  // 404 for unknown routes
  res.writeHead(404, { ...corsHeaders, "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  console.log(`🖨️  Local Print Agent running on http://localhost:${PORT}`);
  console.log(`   Printer: ${PRINTER_NAME}`);
  console.log("");
  console.log("Endpoints:");
  console.log(`   GET  /health   - Check if agent is running`);
  console.log(`   GET  /printers - List available printers`);
  console.log(`   POST /print    - Print ZPL (body: { "zpl": "..." })`);
  console.log("");
  console.log("Press Ctrl+C to stop");
});
