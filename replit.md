# KLYXOR - Système de Gestion des Contrats ENGIE

## Overview

KLYXOR is a Contract Lifecycle Management (CLM) application designed for ENGIE, a global energy leader. It manages the entire lifecycle of energy contracts, including electricity, natural gas, renewable PPAs, and infrastructure maintenance. The system provides comprehensive contract management, multi-level validation workflows, automatic indexation based on economic indices, proactive deadline alerts, robust security with RBAC, real-time KPI dashboards, and integrated document management.

**Business Vision & Ambition:** To streamline contract management for ENGIE, ensuring compliance, optimizing financial performance through precise indexation, and enhancing operational efficiency across all energy contract types.

## User Preferences

I prefer simple language and clear explanations. I want iterative development with frequent, small updates. Please ask for my approval before implementing major architectural changes or new features. I value detailed explanations for complex technical decisions.

## System Architecture

KLYXOR follows a modern full-stack architecture with a clear separation between frontend and backend.

### UI/UX Decisions

The frontend leverages **Shadcn/ui**, **Radix UI**, and **Tailwind CSS** for a consistent and modern design system, ensuring a responsive and intuitive user experience. **Lucide React** is used for iconography.

### Technical Implementations

*   **Frontend:** Built with **React 18** and **TypeScript**. It uses **Wouter** for routing, **TanStack Query v5** for state management, and **React Hook Form** with **Zod** for robust form handling and validation. **Vite** is used for fast development and building.
*   **Backend:** Developed with **Node.js** and **Express.js**, employing a strict **TypeScript** configuration. **Passport.js** handles authentication with local strategy and **Express-session** manages sessions. Security is enhanced with **Bcrypt** for password hashing and comprehensive **CORS** configuration. APIs are **RESTful** with Zod-based validation.
*   **Database:** **PostgreSQL** (leveraging Neon serverless) is the chosen SGBD. **Drizzle ORM** provides type-safe database interactions, with **Drizzle Kit** for migrations and **Drizzle-Zod** for schema validation.
*   **Security Architecture:** A multi-layered security approach includes:
    *   **Double Validation:** Frontend (Zod, React Hook Form) for instant feedback and Backend (Zod) for absolute API protection.
    *   **Comprehensive RBAC:** Frontend UI masking (`usePermissions` hook, `ProtectedRoute`) combined with backend API blocking (`requirePermission`, `requireAuth`) for granular control by resource and action.
    *   **Strong Password Policy:** For user accounts.
    *   **Session Management:** Secure sessions with HTTPOnly cookies, configurable timeouts, and CSRF protection.
    *   **Audit Trails:** Comprehensive logging for compliance (e.g., RGPD).

### Feature Specifications

*   **Contract Management:** Full lifecycle support from creation to archiving, including multi-level validation workflows with SLAs.
*   **Automatic Indexation V3 (100% ENGIE Compliant):** 
    - **Core Engine:** Advanced calculation engine supporting all ENGIE formula types (Type 1, 2A, 2B, 3)
    - **Economic Indices:** Real-time integration with INSEE for ICHT-IME, FM0A/FMOA, IPC/CPI indices
    - **Threshold/Cap Logic:** Correct order implementation (threshold blocks first, then cap limits)
    - **Date Decoupling:** Separate index taking date from application date (N-2 rule support)
    - **Tariff Tiers:** Automatic management of year 6 and year 11 contract adjustments
    - **Retroactive Processing:** Handles provisional to definitive index updates with recalculation
    - **Pending Queue:** Smart management of calculations awaiting missing indices
*   **Data Validation:** Strict validation at frontend, backend, and database levels with explicit, localized error messages.
*   **Authentication:** Secure user authentication with role-based access control.
*   **Document Management:** Integrated GED for contractual documents.
*   **API Endpoints:** 
    - **Core APIs:** Authentication, contracts, validations, amendments, deadlines, alerts
    - **V3 Indexation API:** 
      - `/api/v3/indexation/calculate` - Single contract calculation
      - `/api/v3/indexation/simulate` - Simulation without saving
      - `/api/v3/indexation/calculate-batch` - Batch processing
      - `/api/v3/indexation/pending` - Queue management
      - `/api/v3/indices/update` - Manual index updates
      - `/api/v3/indexation/retroactive` - Retroactive calculations

### System Design Choices

*   **Project Structure:** Monorepo-like, with `client/` for frontend, `server/` for backend, and `shared/` for common code (schemas, types).
*   **Data Model:** Core tables include `users`, `contracts`, `validation_requests`, `indexations`, `amendments`, `deadlines`, and `audit_logs`, designed for clear relationships and data integrity.
*   **Workflow Automation:** Automated processes for contract creation, indexation, amendment management, and deadline alerts.

## Recent Updates (September 2025)

### Indexation Engine V3 Deployment
- **100% ENGIE Compliance:** Full implementation of ENGIE indexation specifications
- **Enhanced Database Schema:** Added 9 new fields to contracts table for V3 features
- **New API Layer:** Complete V3 REST API with simulation, batch, and retroactive endpoints
- **Improved Documentation:** Comprehensive JSDoc and inline documentation
- **Performance Optimizations:** Parallel batch processing, efficient index caching

### Technical Debt Resolution
- Cleaned test files with SQL syntax issues
- Enhanced error handling and logging
- Improved type safety with Zod validation
- Better separation of concerns in service layer

## External Dependencies

*   **Database:** PostgreSQL (specifically Neon serverless for production).
*   **Economic Indices:** INSEE (French National Institute of Statistics and Economic Studies) for real economic indices (ICHT, FM0A/FMOA, IPC/CPI).
*   **Future Integrations (Roadmap):** Stripe API for payments, electronic signature module.