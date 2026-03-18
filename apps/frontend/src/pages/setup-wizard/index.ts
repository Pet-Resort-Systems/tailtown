/**
 * Setup Wizard Module
 *
 * Multi-step onboarding wizard for new tenants.
 * Collects all necessary information to configure a new facility.
 */

export { default as SetupWizard } from './SetupWizard';
export {
  default as SetupWizardProvider,
  useSetupWizard,
} from './SetupWizardContext';
export * from './types';
