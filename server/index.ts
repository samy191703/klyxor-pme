import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
  const server = await registerRoutes(app);
  
  // Add graceful shutdown handling for production environment
  let isShuttingDown = false;

  // Health check endpoint for Autoscale deployment readiness
  app.get("/health", (_req, res) => {
    try {
      res.status(200).json({ 
        status: "ok", 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        memoryUsage: process.memoryUsage(),
        pid: process.pid
      });
    } catch (error) {
      res.status(503).json({ 
        status: "error", 
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
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
          uptime: process.uptime()
        });
      } else {
        res.status(503).json({ 
          status: "not ready", 
          timestamp: new Date().toISOString(),
          reason: "Server is shutting down"
        });
      }
    } catch (error) {
      res.status(503).json({ 
        status: "not ready", 
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
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
  const port = parseInt(process.env.PORT || '5000', 10);
  
  // Update server startup to properly handle HTTP server creation for Autoscale deployment
  // Remove reusePort option which may cause issues in containerized environments
  const serverOptions = {
    host: "0.0.0.0",
    port: port,
    // Ensure no reusePort or other problematic options for containerized deployments
  };

  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
    log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    log(`Server ready for connections`);
    
    // Signal that server is fully initialized for deployment readiness
    if (process.env.NODE_ENV === 'production') {
      log(`Production server startup complete - ready for traffic`);
    }
  }).on('error', (err: any) => {
    log(`Failed to start server: ${err.message}`);
    if (err.code === 'EADDRINUSE') {
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
      log('Server closed gracefully');
      process.exit(0);
    });
    
    // Force close after 10 seconds if graceful shutdown fails
    setTimeout(() => {
      log('Graceful shutdown timeout, forcing exit');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  
  // Handle uncaught exceptions and promise rejections
  process.on('uncaughtException', (err) => {
    log(`Uncaught Exception: ${err.message}`);
    log(err.stack || '');
    gracefulShutdown('uncaughtException');
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    log(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
    gracefulShutdown('unhandledRejection');
  });
})();
