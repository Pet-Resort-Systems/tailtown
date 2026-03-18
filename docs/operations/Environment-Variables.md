# Environment Variables

This document describes the environment variables used in the Tailtown Pet Resort Management System.

## Backend Environment Variables

Location: `/apps/customer-service/.env`

### Database Configuration
- `DATABASE_URL`: PostgreSQL connection string
  - Format: `postgresql://username:password@localhost:5433/customer?schema=public`
  - Required: Yes
  - **Critical**: Must use port 5433 for both customer and reservation services

- `DATABASE_SSL_ENABLED`: Enable SSL for database connections
  - Default: false (true in production)
  - Required: Yes

- `DATABASE_MAX_CONNECTIONS`: Maximum database connections
  - Default: 10
  - Required: No

### Server Configuration
- `PORT`: Server port number
  - Customer Service: 4004
  - Reservation Service: 4003
  - Frontend: 3000
  - Required: Yes

- `NODE_ENV`: Environment mode
  - Values: development, test, production
  - Required: Yes

- `TRUST_PROXY`: Trust X-Forwarded-* headers
  - Default: false
  - Required: Yes in production behind proxy

### Security Configuration
- `JWT_SECRET`: Secret key for JWT token generation
  - Required: Yes
  - Note: Must be unique and secure in production

- `JWT_EXPIRES_IN`: Access token expiration
  - Default: 24h
  - Required: Yes

- `JWT_REFRESH_TOKEN_EXPIRES_IN`: Refresh token expiration
  - Default: 7d
  - Required: Yes

- `PASSWORD_SALT_ROUNDS`: Bcrypt salt rounds
  - Default: 12
  - Required: Yes

- `ENABLE_2FA`: Enable two-factor authentication
  - Default: false
  - Required: No

### File Upload Configuration
- `UPLOAD_DIR`: Directory for file uploads
  - Default: uploads
  - Required: Yes

- `MAX_FILE_SIZE`: Maximum file size in bytes
  - Default: 5242880 (5MB)
  - Required: Yes

- `ALLOWED_FILE_TYPES`: Allowed MIME types
  - Default: image/jpeg,image/png,image/gif,application/pdf
  - Required: Yes

- `SCAN_UPLOADS_FOR_MALWARE`: Enable malware scanning
  - Default: true
  - Required: Yes in production

### API Configuration
- `API_PREFIX`: Prefix for all API routes
  - Default: /api
  - Required: Yes

- `API_VERSION`: API version
  - Default: v1
  - Required: Yes

- `ENABLE_API_DOCS`: Enable Swagger documentation
  - Default: true
  - Required: No

### CORS Configuration
- `ALLOWED_ORIGINS`: Allowed CORS origins
  - Required: Yes

- `ALLOWED_METHODS`: Allowed HTTP methods
  - Default: GET,POST,PUT,DELETE,PATCH
  - Required: Yes

- `ALLOW_CREDENTIALS`: Allow credentials in CORS
  - Default: true
  - Required: Yes

### Rate Limiting
- `RATE_LIMIT_WINDOW`: Time window in minutes
  - Default: 15
  - Required: Yes

- `RATE_LIMIT_MAX_REQUESTS`: Max requests per window
  - Default: 100
  - Required: Yes

### Logging and Monitoring
- `LOG_LEVEL`: Logging level
  - Values: debug, info, warn, error
  - Default: info
  - Required: Yes

- `LOG_FORMAT`: Log output format
  - Values: json, text
  - Default: json
  - Required: Yes

- `ENABLE_METRICS`: Enable Prometheus metrics
  - Default: false
  - Required: No

### Cache Configuration
- `REDIS_URL`: Redis connection string
  - Required: No

- `CACHE_TTL`: Cache time-to-live in seconds
  - Default: 3600
  - Required: No

### Email Configuration
- `SMTP_HOST`: SMTP server hostname
  - Required: Yes for email features

- `SMTP_USER`: SMTP username
  - Required: Yes for email features

- `SMTP_FROM`: Default from address
  - Required: Yes for email features

### Backup Configuration
- `BACKUP_ENABLED`: Enable automated backups
  - Default: true
  - Required: Yes in production

- `BACKUP_RETENTION_DAYS`: Days to keep backups
  - Default: 30
  - Required: Yes if backups enabled

## Frontend Environment Variables

Location: `/apps/frontend/.env`

### Build Configuration
- `NODE_ENV`: Environment mode
  - Values: development, test, production
  - Required: Yes

- `GENERATE_SOURCEMAP`: Generate source maps
  - Default: true (false in production)
  - Required: Yes

### API Configuration
- `REACT_APP_API_URL`: Backend API URL
  - Required: Yes
  
- `REACT_APP_RESERVATION_API_URL`: Reservation Service base URL
  - Default: `http://localhost:4003`
  - Required: Yes (frontend reservation and resource calls use this)

- `REACT_APP_API_TIMEOUT`: Request timeout (ms)
  - Default: 30000
  - Required: Yes

- `REACT_APP_RETRY_ATTEMPTS`: Failed request retries
  - Default: 3
  - Required: No

### Security Configuration
- `REACT_APP_CSP_ENABLED`: Content Security Policy
  - Default: true
  - Required: Yes in production

- `REACT_APP_AUTH_STORAGE_KEY`: Auth token storage key
  - Required: Yes

- `REACT_APP_SESSION_TIMEOUT`: Session timeout (ms)
  - Default: 3600000 (1 hour)
  - Required: Yes

### Feature Flags
- `REACT_APP_ENABLE_DEBUG`: Debug mode
  - Default: false
  - Required: No

- `REACT_APP_ENABLE_ERROR_REPORTING`: Error reporting
  - Default: true
  - Required: Yes in production

- `REACT_APP_ENABLE_SERVICE_WORKER`: PWA support
  - Default: true
  - Required: No

### UI Configuration
- `REACT_APP_THEME`: UI theme
  - Values: light, dark, system
  - Default: light
  - Required: No

- `REACT_APP_TIMEZONE`: Application timezone
  - Default: America/Denver
  - Required: Yes

- `REACT_APP_LANGUAGE`: Default language
  - Default: en-US
  - Required: Yes

### Performance
- `REACT_APP_ENABLE_COMPRESSION`: Enable compression
  - Default: true
  - Required: No

- `REACT_APP_CACHE_MAX_AGE`: Browser cache TTL
  - Default: 86400 (24 hours)
  - Required: No

### Error Reporting
- `REACT_APP_SENTRY_DSN`: Sentry DSN
  - Required: Yes in production

### Analytics
- `REACT_APP_GA_TRACKING_ID`: Google Analytics ID
  - Required: No

### PWA Configuration
- `REACT_APP_PWA_NAME`: Full app name
  - Default: "Tailtown Pet Resort"
  - Required: Yes for PWA

- `REACT_APP_PWA_THEME_COLOR`: Theme color
  - Default: "#4c8bf5"
  - Required: Yes for PWA

## Environment Setup Instructions

1. Copy the example files:
   ```bash
   cp apps/customer-service/.env.example apps/customer-service/.env
   cp apps/frontend/.env.example apps/frontend/.env
   ```

2. Update the values in both .env files with your specific configuration

3. Never commit .env files to version control

4. For production deployment:
   - Use secure values for all secrets
   - Set NODE_ENV=production
   - Use proper database credentials
   - Configure proper CORS settings

## Backup and Restore

To safely backup your environment configuration:

1. Create a secure backup of your .env files:
   ```bash
   # Backup
   cp apps/customer-service/.env apps/customer-service/.env.backup
   cp apps/frontend/.env apps/frontend/.env.backup
   ```

2. To restore from backup:
   ```bash
   # Restore
   cp apps/customer-service/.env.backup apps/customer-service/.env
   cp apps/frontend/.env.backup apps/frontend/.env
   ```

3. Store backups in a secure location outside of version control

4. Consider using a secrets management service for production environments
