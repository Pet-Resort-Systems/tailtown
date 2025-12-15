# Local Print Agent for Zebra Label Printing

A simple Node.js server that runs on your local machine and receives print requests from the browser, then sends ZPL directly to the Zebra printer.

## Requirements

- Node.js installed on your Mac
- Zebra printer connected via USB and set up in macOS (System Preferences > Printers & Scanners)

## Setup

1. Make sure your Zebra printer is connected and appears in System Preferences > Printers & Scanners
2. Note the printer name (default is `Zebra_GK420d`)

## Usage

Start the print agent:

```bash
cd tools/local-print-agent
node server.js
```

Or with a custom printer name:

```bash
PRINTER_NAME=Your_Printer_Name node server.js
```

The agent will start on `http://localhost:9100`.

## Keep it Running

To keep the agent running in the background, you can use:

```bash
# Using nohup
nohup node server.js > print-agent.log 2>&1 &

# Or add to your shell profile to start automatically
```

## Endpoints

- `GET /health` - Check if agent is running
- `GET /printers` - List available printers
- `POST /print` - Print ZPL label (body: `{ "zpl": "..." }`)

## Troubleshooting

### Printer not found

Make sure the printer name matches exactly. Run `lpstat -p` to see available printers.

### Permission denied

Make sure you have permission to print. Try printing a test page from System Preferences first.

### Labels not printing correctly

The ZPL is designed for 1" x 14" continuous labels. Make sure your printer is configured for the correct label size.
