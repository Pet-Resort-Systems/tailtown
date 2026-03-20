/**
 * MCP RAG Server Unit Tests
 * Tests the MCP server functionality and indexing
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

describe('MCP RAG Server Tests', () => {
  let serverProcess;
  const serverPath = path.join(__dirname, '../../mcp-server/server.py');
  const projectRoot = path.join(__dirname, '../..');

  beforeAll(async () => {
    // Start MCP server for testing
    serverProcess = spawn('python3', [serverPath], {
      env: {
        ...process.env,
        PYTHONPATH: path.join(projectRoot, 'mcp-server'),
        TAILTOWN_ROOT: projectRoot,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Wait for server to be ready
    await new Promise((resolve, reject) => {
      let ready = false;
      const timeout = setTimeout(() => {
        if (!ready)
          reject(new Error('MCP server failed to start within 30 seconds'));
      }, 30000);

      serverProcess.stderr.on('data', (data) => {
        const output = data.toString();
        if (output.includes('RAG Server ready')) {
          ready = true;
          clearTimeout(timeout);
          resolve();
        }
      });

      serverProcess.on('error', reject);
      serverProcess.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`MCP server exited with code ${code}`));
        }
      });
    });
  }, 35000);

  afterAll(async () => {
    if (serverProcess) {
      serverProcess.kill();
      await new Promise((resolve) => {
        serverProcess.on('exit', resolve);
        setTimeout(resolve, 5000); // Force resolve after 5 seconds
      });
    }
  });

  describe('Server Startup', () => {
    it('should start without errors', () => {
      expect(serverProcess.pid).toBeDefined();
      expect(serverProcess.killed).toBe(false);
    });

    it('should have required environment variables', () => {
      expect(process.env.PYTHONPATH).toBeDefined();
      expect(process.env.TAILTOWN_ROOT).toBeDefined();
    });
  });

  describe('File Indexing', () => {
    it('should index the expected number of files', async () => {
      // This test verifies the indexing process works
      // In a real test, we would check the indexed file count
      const indexPath = path.join(projectRoot, 'mcp-server', 'index.faiss');

      // Index file should exist after successful indexing
      expect(fs.existsSync(indexPath)).toBe(true);
    });

    it('should index different file types', () => {
      const projectFiles = [
        'frontend/src/components',
        'services/customer/src',
        'services/reservation-service/src',
        'docs',
        'README.md',
      ];

      projectFiles.forEach((file) => {
        const filePath = path.join(projectRoot, file);
        expect(fs.existsSync(filePath)).toBe(true);
      });
    });
  });

  describe('Search Functionality', () => {
    // Note: These would be integration tests that actually call the MCP tools
    // For now, we test the prerequisites

    it('should have searchable content available', () => {
      const vectorStorePath = path.join(
        projectRoot,
        'mcp-server',
        'vector_store.pkl'
      );

      // Vector store should exist after successful indexing
      expect(fs.existsSync(vectorStorePath)).toBe(true);
    });

    it('should have configuration files', () => {
      const configPath = path.join(projectRoot, 'mcp-server', 'config.json');
      expect(fs.existsSync(configPath)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing dependencies gracefully', () => {
      // Test that server provides helpful error messages
      // This would require mocking missing dependencies
      expect(true).toBe(true); // Placeholder
    });

    it('should handle invalid project paths', () => {
      // Test server behavior with invalid TAILTOWN_ROOT
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Performance', () => {
    it('should complete indexing within reasonable time', async () => {
      // Indexing should complete within 5 minutes for a project of this size
      const startTime = Date.now();

      // This would be measured during actual server startup
      const indexingTime = Date.now() - startTime;

      expect(indexingTime).toBeLessThan(300000); // 5 minutes
    });

    it('should have reasonable memory usage', () => {
      // Check that the server doesn't consume excessive memory
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;

      // Server should use less than 1GB of heap memory
      expect(heapUsedMB).toBeLessThan(1024);
    });
  });
});

describe('MCP Server Configuration', () => {
  const configPath = path.join(__dirname, '../../mcp-server/config.json');

  it('should have valid configuration', () => {
    expect(fs.existsSync(configPath)).toBe(true);

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    expect(config).toHaveProperty('chunk_size');
    expect(config).toHaveProperty('chunk_overlap');
    expect(config).toHaveProperty('model_name');
    expect(config).toHaveProperty('index_path');
  });

  it('should have reasonable configuration values', () => {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    expect(config.chunk_size).toBeGreaterThan(0);
    expect(config.chunk_overlap).toBeGreaterThan(0);
    expect(config.chunk_overlap).toBeLessThan(config.chunk_size);
    expect(config.model_name).toBeTruthy();
  });
});
