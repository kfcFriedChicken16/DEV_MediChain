import { MEDICAL_REGISTRY_ADDRESS } from '@/config';
import MedicalRegistryArtifact from './MedicalRegistry.json';

// Import ABI from compiled contract artifact to ensure it's always up to date
export const MEDICAL_REGISTRY_ABI = MedicalRegistryArtifact.abi;

export { MEDICAL_REGISTRY_ADDRESS }; 