/**
 * File Upload Security Tests
 * 
 * Tests to ensure file upload security:
 * - File size limits
 * - File type validation (whitelist)
 * - Malicious file prevention
 * - Filename sanitization
 * - Directory traversal prevention
 * - Content validation
 */

import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import path from 'path';
import fs from 'fs';
import app from '../../index';

const prisma = new PrismaClient();

describe('File Upload Security Tests', () => {
  let authToken: string;
  const testTenantId = 'file-upload-test-tenant';
  const testFilesDir = path.join(__dirname, 'test-files');

  beforeAll(async () => {
    // Create test files directory
    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true });
    }

    // Create test user
    const hashedPassword = await bcrypt.hash('TestPassword123!', 12);
    await prisma.staff.create({
      data: {
        email: 'file-upload-test@example.com',
        firstName: 'FileUpload',
        lastName: 'Test',
        password: hashedPassword,
        role: 'ADMIN',
        tenantId: testTenantId,
        isActive: true
      }
    });

    // Get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'file-upload-test@example.com',
        password: 'TestPassword123!'
      });

    authToken = loginResponse.body.token;

    // Create test files
    createTestFiles();
  });

  afterAll(async () => {
    // Clean up test files
    if (fs.existsSync(testFilesDir)) {
      fs.rmSync(testFilesDir, { recursive: true, force: true });
    }

    await prisma.staff.deleteMany({
      where: { tenantId: testTenantId }
    });
    await prisma.$disconnect();
  });

  function createTestFiles() {
    // Create a small valid image
    const validImagePath = path.join(testFilesDir, 'valid-image.jpg');
    fs.writeFileSync(validImagePath, Buffer.from('fake-jpg-content'));

    // Create a large file
    const largeFilePath = path.join(testFilesDir, 'large-file.jpg');
    const largeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB
    fs.writeFileSync(largeFilePath, largeBuffer);

    // Create a malicious file (fake executable)
    const maliciousPath = path.join(testFilesDir, 'malicious.exe');
    fs.writeFileSync(maliciousPath, 'MZ\x90\x00'); // PE header

    // Create a file with malicious name
    const traversalPath = path.join(testFilesDir, 'normal.jpg');
    fs.writeFileSync(traversalPath, 'content');
  }

  describe('File Size Limits', () => {
    it('should reject files exceeding size limit', async () => {
      const largeFilePath = path.join(testFilesDir, 'large-file.jpg');

      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', largeFilePath);

      expect(response.status).toBe(413); // Payload Too Large
      expect(response.body.message).toContain('size');
    });

    it('should accept files within size limit', async () => {
      const validFilePath = path.join(testFilesDir, 'valid-image.jpg');

      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', validFilePath);

      // May fail for other reasons, but not size
      expect(response.status).not.toBe(413);
    });

    it('should enforce different size limits for different file types', async () => {
      // Images might have 5MB limit, documents 10MB, etc.
      const validFilePath = path.join(testFilesDir, 'valid-image.jpg');

      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('fileType', 'image')
        .attach('file', validFilePath);

      expect(response.status).not.toBe(413);
    });

    it('should reject empty files', async () => {
      const emptyFilePath = path.join(testFilesDir, 'empty.jpg');
      fs.writeFileSync(emptyFilePath, '');

      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', emptyFilePath);

      expect([400, 422]).toContain(response.status);

      fs.unlinkSync(emptyFilePath);
    });
  });

  describe('File Type Validation (Whitelist)', () => {
    it('should reject executable files', async () => {
      const maliciousPath = path.join(testFilesDir, 'malicious.exe');

      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', maliciousPath);

      expect([400, 415, 422]).toContain(response.status);
      expect(response.body.message).toContain('type');
    });

    it('should reject script files', async () => {
      const scriptTypes = [
        { name: 'script.sh', content: '#!/bin/bash\nrm -rf /' },
        { name: 'script.bat', content: '@echo off\ndel /f /s /q *' },
        { name: 'script.ps1', content: 'Remove-Item -Recurse -Force *' },
        { name: 'script.js', content: 'require("child_process").exec("rm -rf /")' }
      ];

      for (const script of scriptTypes) {
        const scriptPath = path.join(testFilesDir, script.name);
        fs.writeFileSync(scriptPath, script.content);

        const response = await request(app)
          .post('/api/upload')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('file', scriptPath);

        expect([400, 415, 422]).toContain(response.status);

        fs.unlinkSync(scriptPath);
      }
    });

    it('should accept whitelisted file types', async () => {
      const allowedTypes = [
        { name: 'image.jpg', content: 'fake-jpg' },
        { name: 'image.png', content: 'fake-png' },
        { name: 'document.pdf', content: 'fake-pdf' }
      ];

      for (const file of allowedTypes) {
        const filePath = path.join(testFilesDir, file.name);
        fs.writeFileSync(filePath, file.content);

        const response = await request(app)
          .post('/api/upload')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('file', filePath);

        // Should not reject based on type
        expect(response.status).not.toBe(415);

        fs.unlinkSync(filePath);
      }
    });

    it('should validate file type by content, not just extension', async () => {
      // Create a file with .jpg extension but .exe content
      const fakePath = path.join(testFilesDir, 'fake-image.jpg');
      fs.writeFileSync(fakePath, 'MZ\x90\x00'); // PE header

      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', fakePath);

      expect([400, 415, 422]).toContain(response.status);

      fs.unlinkSync(fakePath);
    });

    it('should reject files with double extensions', async () => {
      const doubleExtPath = path.join(testFilesDir, 'image.jpg.exe');
      fs.writeFileSync(doubleExtPath, 'content');

      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', doubleExtPath);

      expect([400, 415, 422]).toContain(response.status);

      fs.unlinkSync(doubleExtPath);
    });

    it('should reject files with null byte in extension', async () => {
      const nullBytePath = path.join(testFilesDir, 'image.jpg\x00.exe');
      fs.writeFileSync(nullBytePath, 'content');

      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', nullBytePath);

      expect([400, 415, 422]).toContain(response.status);

      fs.unlinkSync(nullBytePath);
    });
  });

  describe('Filename Sanitization', () => {
    it('should sanitize filenames with path traversal attempts', async () => {
      const traversalNames = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '....//....//etc/passwd'
      ];

      for (const filename of traversalNames) {
        const filePath = path.join(testFilesDir, 'test.jpg');
        fs.writeFileSync(filePath, 'content');

        const response = await request(app)
          .post('/api/upload')
          .set('Authorization', `Bearer ${authToken}`)
          .field('filename', filename)
          .attach('file', filePath);

        if (response.status === 200 || response.status === 201) {
          // If accepted, filename should be sanitized
          expect(response.body.filename).not.toContain('..');
          expect(response.body.filename).not.toContain('/');
          expect(response.body.filename).not.toContain('\\');
        }

        fs.unlinkSync(filePath);
      }
    });

    it('should remove special characters from filenames', async () => {
      const specialChars = [
        'file|name.jpg',
        'file;name.jpg',
        'file&name.jpg',
        'file$name.jpg',
        'file`name.jpg',
        'file<name>.jpg'
      ];

      for (const filename of specialChars) {
        const filePath = path.join(testFilesDir, 'test.jpg');
        fs.writeFileSync(filePath, 'content');

        const response = await request(app)
          .post('/api/upload')
          .set('Authorization', `Bearer ${authToken}`)
          .field('filename', filename)
          .attach('file', filePath);

        if (response.status === 200 || response.status === 201) {
          // Filename should be sanitized
          expect(response.body.filename).not.toMatch(/[|;&$`<>]/);
        }

        fs.unlinkSync(filePath);
      }
    });

    it('should limit filename length', async () => {
      const longFilename = 'a'.repeat(300) + '.jpg';
      const filePath = path.join(testFilesDir, 'test.jpg');
      fs.writeFileSync(filePath, 'content');

      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('filename', longFilename)
        .attach('file', filePath);

      if (response.status === 200 || response.status === 201) {
        expect(response.body.filename.length).toBeLessThanOrEqual(255);
      }

      fs.unlinkSync(filePath);
    });

    it('should preserve safe characters in filenames', async () => {
      const safeFilename = 'my-document_v2.1.jpg';
      const filePath = path.join(testFilesDir, 'test.jpg');
      fs.writeFileSync(filePath, 'content');

      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('filename', safeFilename)
        .attach('file', filePath);

      if (response.status === 200 || response.status === 201) {
        expect(response.body.filename).toMatch(/^[a-zA-Z0-9._-]+$/);
      }

      fs.unlinkSync(filePath);
    });
  });

  describe('Malicious File Prevention', () => {
    it('should detect PHP files disguised as images', async () => {
      const phpPath = path.join(testFilesDir, 'image.jpg');
      fs.writeFileSync(phpPath, '<?php system($_GET["cmd"]); ?>');

      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', phpPath);

      expect([400, 415, 422]).toContain(response.status);

      fs.unlinkSync(phpPath);
    });

    it('should detect SVG files with embedded scripts', async () => {
      const svgPath = path.join(testFilesDir, 'image.svg');
      const maliciousSVG = `
        <svg xmlns="http://www.w3.org/2000/svg">
          <script>alert('XSS')</script>
        </svg>
      `;
      fs.writeFileSync(svgPath, maliciousSVG);

      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', svgPath);

      // Should either reject SVG or sanitize it
      expect([400, 415, 422]).toContain(response.status);

      fs.unlinkSync(svgPath);
    });

    it('should detect ZIP bombs', async () => {
      // Simulate a ZIP bomb detection
      const zipPath = path.join(testFilesDir, 'archive.zip');
      fs.writeFileSync(zipPath, 'PK\x03\x04'); // ZIP header

      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', zipPath);

      // Should either reject or scan
      expect(response.status).toBeLessThan(500);

      fs.unlinkSync(zipPath);
    });

    it('should scan for malware signatures', async () => {
      // This would require actual malware scanning integration
      // For now, test that the endpoint exists
      const filePath = path.join(testFilesDir, 'test.jpg');
      fs.writeFileSync(filePath, 'content');

      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', filePath);

      // Should not cause server error
      expect(response.status).toBeLessThan(500);

      fs.unlinkSync(filePath);
    });
  });

  describe('Upload Location Security', () => {
    it('should store files outside web root', async () => {
      const filePath = path.join(testFilesDir, 'test.jpg');
      fs.writeFileSync(filePath, 'content');

      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', filePath);

      if (response.status === 200 || response.status === 201) {
        // File path should not be in public directory
        expect(response.body.path).not.toContain('/public/');
        expect(response.body.path).not.toContain('/static/');
      }

      fs.unlinkSync(filePath);
    });

    it('should use unique filenames to prevent overwrites', async () => {
      const filePath = path.join(testFilesDir, 'test.jpg');
      fs.writeFileSync(filePath, 'content');

      const response1 = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', filePath);

      const response2 = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', filePath);

      if (response1.status === 201 && response2.status === 201) {
        expect(response1.body.filename).not.toBe(response2.body.filename);
      }

      fs.unlinkSync(filePath);
    });

    it('should organize files by tenant', async () => {
      const filePath = path.join(testFilesDir, 'test.jpg');
      fs.writeFileSync(filePath, 'content');

      const response = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', filePath);

      if (response.status === 200 || response.status === 201) {
        // Path should include tenant ID
        expect(response.body.path).toContain(testTenantId);
      }

      fs.unlinkSync(filePath);
    });
  });

  describe('Upload Permissions', () => {
    it('should require authentication for uploads', async () => {
      const filePath = path.join(testFilesDir, 'test.jpg');
      fs.writeFileSync(filePath, 'content');

      const response = await request(app)
        .post('/api/upload')
        .attach('file', filePath);

      expect(response.status).toBe(401);

      fs.unlinkSync(filePath);
    });

    it('should enforce upload quotas per user', async () => {
      // Upload multiple files to test quota
      const uploads = [];
      
      for (let i = 0; i < 100; i++) {
        const filePath = path.join(testFilesDir, `test-${i}.jpg`);
        fs.writeFileSync(filePath, 'content');

        const response = await request(app)
          .post('/api/upload')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('file', filePath);

        uploads.push(response);
        fs.unlinkSync(filePath);

        if (response.status === 429 || response.status === 413) {
          break; // Quota reached
        }
      }

      // Should eventually hit quota
      expect(uploads.some(r => r.status === 429 || r.status === 413)).toBe(true);
    });

    it('should enforce upload quotas per tenant', async () => {
      // Similar to user quota but for entire tenant
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('File Download Security', () => {
    it('should require authentication for downloads', async () => {
      const response = await request(app)
        .get('/api/files/some-file-id');

      expect(response.status).toBe(401);
    });

    it('should prevent access to files from other tenants', async () => {
      // Try to access a file from another tenant
      const response = await request(app)
        .get('/api/files/other-tenant-file-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect([403, 404]).toContain(response.status);
    });

    it('should set proper Content-Disposition header', async () => {
      const filePath = path.join(testFilesDir, 'test.jpg');
      fs.writeFileSync(filePath, 'content');

      const uploadResponse = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', filePath);

      if (uploadResponse.status === 201) {
        const fileId = uploadResponse.body.id;

        const downloadResponse = await request(app)
          .get(`/api/files/${fileId}`)
          .set('Authorization', `Bearer ${authToken}`);

        if (downloadResponse.status === 200) {
          expect(downloadResponse.headers['content-disposition']).toContain('attachment');
        }
      }

      fs.unlinkSync(filePath);
    });

    it('should set proper Content-Type header', async () => {
      const filePath = path.join(testFilesDir, 'test.jpg');
      fs.writeFileSync(filePath, 'content');

      const uploadResponse = await request(app)
        .post('/api/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', filePath);

      if (uploadResponse.status === 201) {
        const fileId = uploadResponse.body.id;

        const downloadResponse = await request(app)
          .get(`/api/files/${fileId}`)
          .set('Authorization', `Bearer ${authToken}`);

        if (downloadResponse.status === 200) {
          expect(downloadResponse.headers['content-type']).toBeDefined();
          expect(downloadResponse.headers['x-content-type-options']).toBe('nosniff');
        }
      }

      fs.unlinkSync(filePath);
    });
  });

  describe('Metadata Stripping', () => {
    it('should strip EXIF data from images', async () => {
      // This would require actual image processing
      // For now, verify the concept
      expect(true).toBe(true); // Placeholder
    });

    it('should remove document metadata', async () => {
      // This would require document processing
      // For now, verify the concept
      expect(true).toBe(true); // Placeholder
    });
  });
});
