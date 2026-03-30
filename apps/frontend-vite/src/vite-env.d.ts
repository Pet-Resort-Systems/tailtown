/// <reference types="vite/client" />

interface ViteTypeOptions {
  // strictImportMetaEnv: unknown
}

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_RESERVATION_API_URL?: string;
  readonly VITE_API_TIMEOUT?: string;
  readonly VITE_TENANT_ID?: string;
  readonly VITE_PAYMENT_SERVICE_URL?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_SENTRY_ENABLED?: string;
  readonly VITE_SENTRY_RELEASE?: string;
  readonly VITE_CUSTOMER_SERVICE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
