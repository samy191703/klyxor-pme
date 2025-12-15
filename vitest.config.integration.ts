/**
 * Configuration Vitest pour les tests d'intégration
 * Tests utilisant de vraies données en base au lieu de mocks
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    name: 'integration',
    environment: 'node',
    globals: true,
    setupFiles: ['./test/integration/setup.ts'],
    include: ['test/integration/**/*.test.ts'],
    exclude: ['test/unit/**', 'test/e2e/**'],
    
    // Timeouts plus longs pour les tests d'intégration
    testTimeout: 15000,
    hookTimeout: 10000,
    
    // Exécution séquentielle pour éviter les conflits de base de données
    sequence: {
      shuffle: false
    },
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    
    // Retry sur échec (utile pour les tests avec base de données)
    retry: 2,
    
    // Reporter détaillé pour les tests d'intégration
    reporters: ['verbose'],
    
    // Coverage pour les services testés
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'server/services/**/*.ts',
        'server/storage.ts'
      ],
      exclude: [
        'server/**/*.test.ts',
        'server/**/*.spec.ts'
      ]
    }
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared'),
      '@server': path.resolve(__dirname, './server'),
      '@test': path.resolve(__dirname, './test')
    }
  },
  
  // Configuration TypeScript
  esbuild: {
    target: 'node18'
  }
});