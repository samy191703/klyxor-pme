import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { beforeEach, afterEach } from 'vitest';

// Mock des variables d'environnement
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.SESSION_SECRET = 'test-secret';
process.env.KEYCLOAK_ENABLED = 'false';

// Mock console pour éviter le bruit dans les tests
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn()
};

// Mock fetch global
global.fetch = vi.fn();

// Helper pour créer un mock chainable de base de données
function createChainableDbMock(data: any[] = []) {
  const chainable: any = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    having: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(data),
    execute: vi.fn().mockResolvedValue(data),
    // Pour permettre await direct sur la chaîne
    then: (resolve: any) => resolve(data)
  };
  
  // Chaque méthode retourne l'objet chainable
  Object.keys(chainable).forEach(key => {
    if (key !== 'then' && key !== 'returning' && key !== 'execute') {
      chainable[key] = vi.fn(chainable[key]).mockReturnValue(chainable);
    }
  });
  
  return chainable;
}

// Mock de la base de données
vi.mock('./server/db', () => ({
  db: {
    select: vi.fn(() => createChainableDbMock([])),
    
    insert: vi.fn((table: any) => ({
      values: vi.fn((values: any) => ({
        returning: vi.fn().mockResolvedValue(Array.isArray(values) ? values : [values]),
        onConflictDoUpdate: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue(Array.isArray(values) ? values : [values])
        }),
        onConflictDoNothing: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue(Array.isArray(values) ? values : [values])
        }),
        execute: vi.fn().mockResolvedValue(undefined)
      }))
    })),
    
    update: vi.fn((table: any) => ({
      set: vi.fn((values: any) => ({
        where: vi.fn((condition: any) => ({
          returning: vi.fn().mockResolvedValue([values]),
          execute: vi.fn().mockResolvedValue(undefined)
        }))
      }))
    })),
    
    delete: vi.fn((table: any) => ({
      where: vi.fn((condition: any) => ({
        returning: vi.fn().mockResolvedValue([]),
        execute: vi.fn().mockResolvedValue(undefined)
      }))
    })),
    
    transaction: vi.fn(async (callback: any) => {
      return await callback({
        select: vi.fn(() => createChainableDbMock([])),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
      });
    })
  }
}));

// Mock des timers
beforeEach(() => {
  vi.clearAllMocks();
  vi.clearAllTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
});