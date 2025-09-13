import "dotenv/config";

import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import passport from "./auth";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { pool } from "./db";
import { initializeKeycloakAuth } from "./auth.keycloak";

// Packages de sécurité
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import cors from "cors";

// Import des nouveaux services
import { validationReminderService } from "./services/validationReminder";
import { stateTransitionManager } from "./services/stateTransitionManager";
import { sapSyncService } from "./services/sapSynchronization";
import { alertService } from "./services/alertNotificationService";

const CALC_ORIGIN = "https://index.klyxor.com";
const app = express();

// Configuration trust proxy pour Replit
// Utiliser 1 pour accepter seulement le premier proxy
app.set("trust proxy", 1);

// Configuration CORS sécurisée
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.ALLOWED_ORIGINS?.split(",") || [
            "https://klyxor.engie.com",
          ]
        : true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Helmet pour les headers de sécurité
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // unsafe-eval pour Vite dev
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "ws:", "wss:", CALC_ORIGIN], // WebSocket pour HMR
      },
    },
    crossOriginEmbedderPolicy: false, // Nécessaire pour Vite
  })
);

// Rate limiting global
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requêtes par IP
  message: "Trop de requêtes depuis cette adresse IP, réessayez plus tard.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting strict pour l'authentification (temporairement désactivé pour debug)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Augmenté à 20 tentatives pour tests
  message:
    "Trop de tentatives de connexion, veuillez réessayer dans 15 minutes.",
  skipSuccessfulRequests: true, // Ne compte que les échecs
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", globalLimiter);
// Désactivé temporairement pour debug
// app.use('/api/auth/login', authLimiter);

// Protection contre la pollution des paramètres HTTP
app.use(hpp());

// Sanitization des données MongoDB (protection injection)
app.use(
  mongoSanitize({
    replaceWith: "_",
    onSanitize: ({ req, key }) => {
      console.warn(`Tentative d'injection détectée: ${key}`);
    },
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));

// Configure session store
const pgSession = connectPgSimple(session);
const sessionStore = new pgSession({
  pool: pool,
  tableName: "sessions",
  createTableIfMissing: true,
});

// Configure sessions avec sécurité renforcée
app.use(
  session({
    store: sessionStore,
    secret:
      process.env.SESSION_SECRET || "klyxor-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    rolling: true, // Renouvelle la session à chaque requête
    name: "klyxor.sid", // Nom personnalisé du cookie
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: "strict", // Protection CSRF
      domain: process.env.COOKIE_DOMAIN || undefined,
      path: "/",
    },
  })
);

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialiser Keycloak si configuré
  const keycloakEnabled = await initializeKeycloakAuth();

  const server = await registerRoutes(app, keycloakEnabled);

  // Démarrer les services automatiques
  console.log("Démarrage des services automatiques...");

  // Service de relances automatiques pour les validations
  validationReminderService.start();
  console.log("✓ Service de relances automatiques démarré");

  // Service de gestion des transitions d'état
  await stateTransitionManager.start();
  console.log("✓ Service de transitions d'état démarré");

  // Service d'alertes et notifications
  await alertService.start();
  console.log("✓ Service d'alertes et notifications démarré");

  // Service de synchronisation SAP (désactivé par défaut - en attente de l'API)
  // sapSyncService sera activé quand l'API SAP sera disponible
  console.log("✓ Service SAP prêt (en attente de configuration API)");

  // Add graceful shutdown handling for production environment
  let isShuttingDown = false;

  // Health check endpoint for Autoscale deployment readiness
  app.get("/health", (_req, res) => {
    try {
      res.status(200).json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || "development",
        nodeVersion: process.version,
        memoryUsage: process.memoryUsage(),
        pid: process.pid,
      });
    } catch (error) {
      res.status(503).json({
        status: "error",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Additional readiness probe endpoint
  app.get("/ready", (_req, res) => {
    try {
      // Check if server is ready to accept connections
      const isReady = !isShuttingDown;

      if (isReady) {
        res.status(200).json({
          status: "ready",
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
        });
      } else {
        res.status(503).json({
          status: "not ready",
          timestamp: new Date().toISOString(),
          reason: "Server is shutting down",
        });
      }
    } catch (error) {
      res.status(503).json({
        status: "not ready",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    log(`Error ${status}: ${message}`);
    res.status(status).json({ message });
    // Remove throw statement to prevent server crashes
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);

  // Update server startup to properly handle HTTP server creation for Autoscale deployment
  // Remove reusePort option which may cause issues in containerized environments
  const serverOptions = {
    host: "0.0.0.0",
    port: port,
    // Ensure no reusePort or other problematic options for containerized deployments
  };

  server
    .listen(port, "0.0.0.0", () => {
      log(`serving on port ${port}`);
      log(`Environment: ${process.env.NODE_ENV || "development"}`);
      log(`Server ready for connections`);

      // Signal that server is fully initialized for deployment readiness
      if (process.env.NODE_ENV === "production") {
        log(`Production server startup complete - ready for traffic`);
      }
    })
    .on("error", (err: any) => {
      log(`Failed to start server: ${err.message}`);
      if (err.code === "EADDRINUSE") {
        log(`Port ${port} is already in use`);
      }
      // Graceful exit instead of immediate exit for better deployment handling
      setTimeout(() => process.exit(1), 1000);
    });

  const gracefulShutdown = (signal: string) => {
    if (isShuttingDown) {
      log(`${signal} received again, forcing exit`);
      process.exit(1);
    }

    isShuttingDown = true;
    log(`Received ${signal} signal, closing server gracefully...`);

    server.close((err) => {
      if (err) {
        log(`Error closing server: ${err.message}`);
        process.exit(1);
      }
      log("Server closed gracefully");
      process.exit(0);
    });

    // Force close after 10 seconds if graceful shutdown fails
    setTimeout(() => {
      log("Graceful shutdown timeout, forcing exit");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  // Handle uncaught exceptions and promise rejections
  process.on("uncaughtException", (err) => {
    log(`Uncaught Exception: ${err.message}`);
    log(err.stack || "");
    gracefulShutdown("uncaughtException");
  });

  process.on("unhandledRejection", (reason, promise) => {
    log(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
    gracefulShutdown("unhandledRejection");
  });
})();
