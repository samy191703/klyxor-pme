import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import { RequestHandler } from 'express';
import { storage } from './storage';
import { securityMonitor } from './services/securityMonitor';

// Configure passport local strategy avec monitoring de sécurité
passport.use(new LocalStrategy(
  {
    usernameField: 'username',
    passwordField: 'password',
    passReqToCallback: true // Pour accéder à l'IP
  },
  async (req, username, password, done) => {
    try {
      console.log(`Tentative de connexion pour: ${username}`);
      
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        console.log(`Utilisateur non trouvé: ${username}`);
        return done(null, false, { 
          message: `Identifiants incorrects.` 
        });
      }
      
      console.log(`Utilisateur trouvé, vérification du mot de passe...`);
      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
        console.log(`Mot de passe incorrect pour: ${username}`);
        return done(null, false, { 
          message: `Identifiants incorrects.` 
        });
      }
      
      console.log(`Connexion réussie pour: ${username}`);
      
      // Don't send password to session
      const { password: _, ...userWithoutPassword } = user;
      return done(null, userWithoutPassword);
    } catch (error) {
      console.error('Erreur dans la stratégie locale:', error);
      return done(error);
    }
  }
));

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await storage.getUser(id);
    if (user) {
      const { password: _, ...userWithoutPassword } = user;
      done(null, userWithoutPassword);
    } else {
      done(null, false);
    }
  } catch (error) {
    done(error);
  }
});

// Middleware to check if user is authenticated
export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Non authentifié' });
};

// Middleware to check if user is admin
export const isAdmin: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated() && (req.user as any)?.role === 'admin') {
    return next();
  }
  res.status(403).json({ error: 'Accès refusé - Droits administrateur requis' });
};

// Middleware to check if user is contract manager
export const isContractManager: RequestHandler = (req, res, next) => {
  const userRole = (req.user as any)?.role;
  if (req.isAuthenticated() && (userRole === 'contract_manager' || userRole === 'manager')) {
    return next();
  }
  res.status(403).json({ error: 'Accès refusé - Droits gestionnaire de contrat requis' });
};

// Middleware to check if user can validate (validators and managers only, NOT admin)
export const isValidator: RequestHandler = (req, res, next) => {
  const userRole = (req.user as any)?.role;
  // Les admins ne peuvent PAS valider - seulement les validators et managers
  if (req.isAuthenticated() && (userRole === 'validator' || userRole === 'manager')) {
    return next();
  }
  res.status(403).json({ error: 'Accès refusé - Droits de validation requis (validator ou manager)' });
};

// Middleware to check multiple roles
export const hasRole = (...roles: string[]): RequestHandler => {
  return (req, res, next) => {
    const userRole = (req.user as any)?.role;
    // Admin n'a plus accès automatique - doit être explicitement listé
    if (req.isAuthenticated() && roles.includes(userRole)) {
      return next();
    }
    res.status(403).json({ error: `Accès refusé - Rôles requis: ${roles.join(', ')}` });
  };
};

export default passport;