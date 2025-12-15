/**
 * Configuration Vitest pour les tests E2E
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Inclure uniquement les fichiers de test E2E
    include: ['test/e2e/**/*.e2e.ts'],
    
    // Exclure les tests unitaires et d'intégration
    exclude: ['test/unit/**', 'test/integration/**', 'node_modules/**'],
    
    // Fichier de setup pour initialiser l'environnement E2E
    setupFiles: ['./test/e2e/setup.ts'],
    
    // Timeout plus élevé pour les tests E2E (60 secondes)
    testTimeout: 60000,
    hookTimeout: 60000,
    
    // Exécuter les tests E2E séquentiellement pour éviter les conflits
    maxConcurrency: 1,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    
    // Reporter pour avoir une sortie détaillée
    reporters: ['verbose'],
    
    // Variables d'environnement pour les tests
    env: {
      NODE_ENV: 'test',
      TEST_API_URL: 'http://localhost:5000'
    },
    
    // Retry sur échec (utile pour les tests flaky)
    retry: 1,
    
    // Coverage désactivé pour les tests E2E
    coverage: {
      enabled: false
    }
  },
  
  // Résolution des alias pour les imports
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './shared'),
      '@': path.resolve(__dirname, './client/src'),
      '~': path.resolve(__dirname, './server')
    }
  },
  
  // Configuration pour supporter TypeScript
  esbuild: {
    target: 'node18'
  }
});