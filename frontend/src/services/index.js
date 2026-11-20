import { apiService } from './adapters/api';
import { withValidation } from './contracts.js';
const source = import.meta.env.VITE_DATA_SOURCE || 'mock';
if (source !== 'mock' && source !== 'api') throw new Error('VITE_DATA_SOURCE must be mock or api');
export const isMock = source === 'mock';
export const service = withValidation(isMock ? (await import('../mocks/service')).mockService : apiService);
