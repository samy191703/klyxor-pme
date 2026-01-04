// server/index.ts
import "dotenv/config";

import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import passport from "./auth";
import { registerRoutes } from "./routes/routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeKeycloakAuth } from "./auth.keycloak";

// Sécurité
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import cors from "cors";

// Services
import { validationReminderService } from "./services/validationReminder";
import { alertService } from "./services/alertNotificationService";
import { setupSwagger } from "./swagger";

import path from "path";

// ==================================================
// ENV FLAGS
// ==================================================
const disableDb = String(process.env.DISABLE_DB).toLowerCase() === "true";
const disableJobs =
  String(process.env.DISABLE_BACKGROUND_JOBS).toLowerCase() === "true";

// ⚠️ pool JAMAIS importé statiquement
let pool: any = null;

// ==================================================
// APP INIT
// ==================================================
const CALC_ORIGIN = "https://index.klyxor.com";
const app = express();

app.set("trust proxy", 1);

// ==================================================
// CORS
// ==================================================
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

// ==================================================
// HELMET
// ==================================================
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "ws:", "wss:", CALC_ORIGIN],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// ==================================================
// RATE LIMIT
// ==================================================
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: "Trop de requêtes, réessayez plus tard.",
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", globalLimiter);

// ==================================================
// SANITIZATION / BODY
// ==================================================
app.use(hpp());

app.use(
  mongoSanitize({
    replaceWith: "_",
    onSanitize: ({ key }) => {
      console.warn(`Tentative d'injection détectée: ${key}`);
    },
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));

// ==================================================
// SESSION (DB ou mémoire)
// ==================================================
(async () => {
  if (disableDb) {
    console.warn("⚠️ DB désactivée (DEV) — sessions en mémoire");

    app.use(
      session({
        secret:
          process.env.SESSION_SECRET ||
          "klyxor-secret-key-change-in-production",
        resave: false,
        saveUninitialized: false,
        rolling: true,
        name: "klyxor.sid",
        cookie: {
          secure: false,
          httpOnly: true,
          maxAge: 24 * 60 * 60 * 1000,
          sameSite: "lax",
          path: "/",
        },
      })
    );
  } else {
    const db = await import("./db");
    pool = db.pool;

    const pgSession = connectPgSimple(session);
    const sessionStore = new pgSession({
      pool,
      tableName: "sessions",
      createTableIfMissing: true,
    });

    app.use(
      session({
        store: sessionStore,
        secret:
          process.env.SESSION_SECRET ||
          "klyxor-secret-key-change-in-production",
        resave: false,
        saveUninitialized: false,
        rolling: true,
        name: "klyxor.sid",
        cookie: {
          secure: process.env.NODE_ENV === "production",
          httpOnly: true,
          maxAge: 24 * 60 * 60 * 1000,
          sameSite: "lax",
          domain: process.env.COOKIE_DOMAIN || undefined,
          path: "/",
        },
      })
    );
  }

  // ==================================================
  // PASSPORT
  // ==================================================
  app.use(passport.initialize());
  app.use(passport.session());

  // ==================================================
  // API LOGGING
  // ==================================================
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;

    res.on("finish", () => {
      if (path.startsWith("/api")) {
        log(
          `${req.method} ${path} ${res.statusCode} in ${
            Date.now() - start
          }ms`
        );
      }
    });

    next();
  });

  // ==================================================
  // AUTH / ROUTES
  // ==================================================
  const keycloakEnabled = await initializeKeycloakAuth();
  const server = await registerRoutes(app, keycloakEnabled);

  // ==================================================
  // BACKGROUND JOBS
  // ==================================================
  if (disableJobs) {
    console.log("⛔ Background jobs désactivés");
  } else {
    try {
      // Ce service ne touche pas la DB
      validationReminderService.start();

      if (disableDb) {
        console.log("⚠️ DB désactivée — stateTransitionManager ignoré");
      } else {
        // Import dynamique UNIQUEMENT si DB activée
        const { stateTransitionManager } = await import(
          "./services/stateTransitionManager"
        );
        const { alertService } = await import(
          "./services/alertNotificationService"
        );

        await stateTransitionManager.start();
        await alertService.start();

        console.log("✓ Services automatiques démarrés");
      }
    } catch (err) {
      console.error("⚠️ Background job error (ignored):", err);
    }
  }


  // ==================================================
  // HEALTH / READY
  // ==================================================
  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      uptime: process.uptime(),
      env: process.env.NODE_ENV,
    });
  });

  app.get("/ready", (_req, res) => {
    res.json({ status: "ready" });
  });

  // ==================================================
  // ERROR HANDLER
  // ==================================================
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    log(`Error ${err.status || 500}: ${err.message}`);
    res.status(err.status || 500).json({ message: err.message });
  });

  // ==================================================
  // UPLOADS
  // ==================================================
  const UPLOADS_ROOT =
    process.env.UPLOADS_DIR || path.join(process.cwd(), "server", "uploads");

  app.use("/uploads", express.static(UPLOADS_ROOT));

  // ==================================================
  // SWAGGER
  // ==================================================
  setupSwagger(app, {
    route: "/api/docs",
    jsonRoute: "/api/docs.json",
    title: "KLYXOR Contract Lifecycle Management API",
    version: "1.0.0",
    apiPrefix: "",
  });

  // ==================================================
  // VITE / STATIC
  // ==================================================
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ==================================================
  // START SERVER
  // ==================================================
  const port = parseInt(process.env.PORT || "5000", 10);

  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
    log(`Environment: ${process.env.NODE_ENV}`);
    log("Server ready for connections");
  });
})();
