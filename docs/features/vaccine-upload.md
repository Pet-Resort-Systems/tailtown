# Vaccine Record Upload System

## Overview

The Vaccine Record Upload System allows customers and staff to upload scanned vaccination documents for pets. The system supports multiple file formats including images (JPG, PNG, GIF, WebP, HEIC) and PDFs, with secure storage and easy viewing capabilities.

## Features

### File Upload
- **Multiple Format Support**: JPG, JPEG, PNG, GIF, WebP, HEIC/HEIF, PDF
- **File Size Limit**: 10MB maximum per file
- **Validation**: Automatic file type and size validation
- **Secure Storage**: Files stored in `uploads/vaccine-records/` directory
- **Unique Naming**: Files named as `petId-timestamp-originalname` to prevent conflicts

### File Management
- **View Files**: Preview images in dialog or view PDFs in new tab
- **Download**: Download any uploaded file
- **Delete**: Remove files with confirmation prompt
- **Metadata Tracking**: Stores filename, size, type, upload date, and uploader

### Security
- **Tenant Isolation**: All operations are tenant-aware
- **File Validation**: Only allowed file types accepted
- **Protected Endpoints**: Tenant verification required
- **Secure Deletion**: Files removed from both database and filesystem

## API Endpoints

### Upload Vaccine Record
```http
POST /api/pets/:petId/vaccine-records/upload
Content-Type: multipart/form-data
Headers: x-tenant-id, x-tenant-subdomain

Body:
  file: [binary file data]

Response:
{
  "success": true,
  "message": "Vaccine record uploaded successfully",
  "data": {
    "file": {
      "filename": "abc123-1234567890-vaccine.jpg",
      "originalName": "vaccine.jpg",
      "mimeType": "image/jpeg",
      "size": 245678,
      "uploadedAt": "2025-10-24T18:00:00.000Z",
      "uploadedBy": "user-id",
      "url": "http://localhost:4004/uploads/vaccine-records/abc123-1234567890-vaccine.jpg"
    },
    "totalFiles": 3
  }
}
```

### Get All Vaccine Records
```http
GET /api/pets/:petId/vaccine-records
Headers: x-tenant-id, x-tenant-subdomain

Response:
{
  "success": true,
  "data": {
    "petId": "abc123",
    "petName": "Max",
    "files": [
      {
        "filename": "abc123-1234567890-vaccine.jpg",
        "originalName": "vaccine.jpg",
        "mimeType": "image/jpeg",
        "size": 245678,
        "uploadedAt": "2025-10-24T18:00:00.000Z",
        "uploadedBy": "user-id",
        "url": "http://localhost:4004/uploads/vaccine-records/abc123-1234567890-vaccine.jpg"
      }
    ],
    "totalFiles": 1
  }
}
```

### Download Vaccine Record
```http
GET /api/pets/:petId/vaccine-records/:filename/download
Headers: x-tenant-id, x-tenant-subdomain

Response: Binary file download
```

### Delete Vaccine Record
```http
DELETE /api/pets/:petId/vaccine-records/:filename
Headers: x-tenant-id, x-tenant-subdomain

Response:
{
  "success": true,
  "message": "Vaccine record deleted successfully",
  "data": {
    "deletedFile": { ... },
    "remainingFiles": 2
  }
}
```

### Static File Access
```http
GET /uploads/vaccine-records/:filename

Response: Binary file (image or PDF)
```

## Frontend Component Usage

### Basic Usage

```tsx
import VaccineRecordUpload from './components/VaccineRecordUpload';

function PetProfile({ petId, petName }) {
  return (
    <div>
      <h1>Pet Profile: {petName}</h1>
      
      {/* Vaccine Upload Component */}
      <VaccineRecordUpload 
        petId={petId} 
        petName={petName} 
      />
    </div>
  );
}
```

### Component Props

| Prop      | Type   | Required | Description                       |
| --------- | ------ | -------- | --------------------------------- |
| `petId`   | string | Yes      | The unique ID of the pet          |
| `petName` | string | Yes      | The name of the pet (for display) |

### Component Features

1. **File Selection**
   - Click "Select File" button
   - Choose file from device
   - Automatic validation

2. **Upload Progress**
   - Shows selected file name and size
   - Upload button appears
   - Progress indicator during upload

3. **File List**
   - Displays all uploaded files
   - Shows file name, size, and upload date
   - Icons indicate file type (image vs document)

4. **File Actions**
   - **Preview/View**: Click chip to view file
     - Images: Opens in modal dialog
     - PDFs: Opens in new browser tab
   - **Download**: Click download icon to save file
   - **Delete**: Click delete icon (with confirmation)

## Database Schema

### Pet Model Extension

```prisma
model Pet {
  // ... existing fields
  vaccineRecordFiles Json?  // Array of uploaded vaccine record files
}
```

### File Metadata Structure

```typescript
interface VaccineFile {
  filename: string;        // Unique filename on server
  originalName: string;    // Original filename from upload
  mimeType: string;        // File MIME type
  size: number;           // File size in bytes
  uploadedAt: string;     // ISO timestamp
  uploadedBy?: string;    // User ID who uploaded
}
```

## File Type Support

### Images
- **JPEG/JPG**: ✅ Full support, preview in dialog
- **PNG**: ✅ Full support, preview in dialog
- **GIF**: ✅ Full support, preview in dialog
- **WebP**: ✅ Full support, preview in dialog
- **HEIC/HEIF**: ✅ Accepted, preview depends on browser
  - Safari: Full support
  - Chrome/Edge: Limited support
  - Firefox: Limited support
  - *Note: Users may need to convert HEIC to JPG for best compatibility*

### Documents
- **PDF**: ✅ Full support, opens in new tab with native viewer

## Configuration

### Environment Variables

No additional environment variables required. The system uses the existing customer service configuration.

### Storage Location

Files are stored in:
```
apps/customer-service/uploads/vaccine-records/
```

This directory is automatically created if it doesn't exist.

### File Naming Convention

```
{petId}-{timestamp}-{sanitizedOriginalName}.{extension}

Example: abc123-1698172800000-rabies_vaccine.jpg
```

## Error Handling

### Common Errors

1. **Invalid File Type**
   - Message: "Invalid file type. Please upload an image (JPEG, PNG, GIF, WebP, HEIC) or PDF file."
   - Solution: Select a supported file type

2. **File Too Large**
   - Message: "File size exceeds 10MB limit."
   - Solution: Compress or resize the file

3. **Pet Not Found**
   - Message: "Pet not found"
   - Solution: Verify the pet ID and tenant context

4. **Upload Failed**
   - Message: "Failed to upload file"
   - Solution: Check network connection and try again

5. **Delete Failed**
   - Message: "Failed to delete file"
   - Solution: Verify file exists and user has permission

## Best Practices

### For Customers

1. **Use Clear Photos**: Take well-lit, focused photos of vaccine records
2. **Correct Orientation**: Ensure documents are right-side up
3. **File Format**: Use JPG or PDF for best compatibility
4. **File Size**: Keep files under 5MB for faster uploads
5. **Organization**: Upload all vaccine records for complete history

### For Staff

1. **Verification**: Review uploaded records for completeness
2. **Quality Check**: Ensure documents are legible
3. **Follow-up**: Request better quality if needed
4. **Documentation**: Add notes about vaccine status in pet profile
5. **Compliance**: Verify records meet facility requirements

### For Developers

1. **Tenant Context**: Always include tenant headers in API calls
2. **Error Handling**: Implement proper error handling and user feedback
3. **File Cleanup**: Ensure failed uploads clean up temporary files
4. **Security**: Never expose file paths or internal structure
5. **Testing**: Test with various file types and sizes

## Migration

### Database Migration

The system includes a safe migration script that adds the `vaccineRecordFiles` column without losing data:

```bash
node apps/customer-service/prisma/migrations/add_vaccine_record_files.js
```

This script:
- Adds the column if it doesn't exist
- Uses `ALTER TABLE ADD COLUMN IF NOT EXISTS`
- Preserves all existing data
- Safe to run multiple times

### Prisma Schema Update

After migration, regenerate Prisma client:

```bash
cd apps/customer-service
pnpm exec prisma generate
```

## Testing

### Manual Testing

1. **Upload Test**
   ```bash
   curl -X POST http://localhost:4004/api/pets/{petId}/vaccine-records/upload \
     -H "x-tenant-id: dev" \
     -H "x-tenant-subdomain: dev" \
     -F "file=@/path/to/vaccine.jpg"
   ```

2. **List Files Test**
   ```bash
   curl http://localhost:4004/api/pets/{petId}/vaccine-records \
     -H "x-tenant-id: dev" \
     -H "x-tenant-subdomain: dev"
   ```

3. **Download Test**
   ```bash
   curl http://localhost:4004/api/pets/{petId}/vaccine-records/{filename}/download \
     -H "x-tenant-id: dev" \
     -H "x-tenant-subdomain: dev" \
     -o downloaded-file.jpg
   ```

4. **Delete Test**
   ```bash
   curl -X DELETE http://localhost:4004/api/pets/{petId}/vaccine-records/{filename} \
     -H "x-tenant-id: dev" \
     -H "x-tenant-subdomain: dev"
   ```

### Frontend Testing

1. Open pet profile page
2. Click "Select File" and choose a vaccine record
3. Verify file validation works (try invalid types)
4. Upload the file and verify success message
5. Verify file appears in the list
6. Click "Preview" or "View PDF" to view the file
7. Click download icon to download the file
8. Click delete icon and confirm deletion

## Troubleshooting

### Files Not Uploading

1. Check file size (must be under 10MB)
2. Verify file type is supported
3. Check network connection
4. Verify customer service is running on port 4004
5. Check browser console for errors

### Files Not Displaying

1. Verify API endpoint is correct
2. Check tenant headers are included
3. Verify pet exists in database
4. Check browser console for errors
5. Verify static file serving is enabled

### Preview Not Working

1. **For Images**: Check browser console for errors
2. **For PDFs**: Ensure browser allows pop-ups
3. **For HEIC**: Try converting to JPG for better compatibility
4. Verify file URL is accessible

### Delete Not Working

1. Verify user has permission
2. Check file exists in database
3. Verify tenant context matches
4. Check server logs for errors

## Future Enhancements

### Planned Features

1. **Vaccine Expiration Tracking**
   - Parse expiration dates from documents
   - Automatic reminders before expiration
   - Dashboard alerts for expired vaccines

2. **Staff Verification Workflow**
   - Staff approval process for uploaded records
   - Verification status tracking
   - Comments and feedback system

3. **OCR Integration**
   - Automatic text extraction from images
   - Parse vaccine names and dates
   - Pre-fill vaccine information

4. **Batch Upload**
   - Upload multiple files at once
   - Drag-and-drop interface
   - Progress tracking for multiple files

5. **Image Enhancement**
   - Auto-rotate images
   - Brightness/contrast adjustment
   - Crop and resize tools

6. **HEIC Conversion**
   - Server-side HEIC to JPG conversion
   - Better cross-browser compatibility
   - Automatic conversion on upload

## Support

For issues or questions:
- Check this documentation first
- Review error messages in browser console
- Check server logs for backend errors
- Contact development team for assistance

## Version History

- **v1.1** (Oct 24, 2025): Added HEIC support and improved viewing
- **v1.0** (Oct 24, 2025): Initial release with JPG, PNG, GIF, WebP, PDF support
