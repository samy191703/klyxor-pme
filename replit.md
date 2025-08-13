# Overview

This is a Contract Lifecycle Management (CLM) application built with a full-stack architecture using React (frontend) and Express.js (backend). The system manages contracts, validation workflows, indexations, deadlines, and various business processes related to contract management. It features a dashboard with KPI tracking, contract management interfaces, and validation workflows for business users.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and CSS variables
- **Build Tool**: Vite with hot module replacement for development

## Backend Architecture
- **Framework**: Express.js with TypeScript
- **Module System**: ES modules throughout the application
- **Request Handling**: RESTful API endpoints with JSON middleware
- **Error Handling**: Centralized error handling with custom status codes
- **Development Server**: Integrated with Vite for seamless development experience

## Data Storage
- **Database**: PostgreSQL (configured for production via DATABASE_URL)
- **ORM**: Drizzle ORM with TypeScript-first schema definitions
- **Database Client**: Neon Database serverless for PostgreSQL connectivity
- **Schema Management**: Shared schema definitions between frontend and backend
- **Migrations**: Drizzle Kit for database migrations and schema management

## Project Structure
- **Monorepo Layout**: Organized with `client/`, `server/`, and `shared/` directories
- **Shared Types**: Database schema and TypeScript types shared between frontend and backend
- **Path Aliases**: Configured path aliases for clean imports (`@/`, `@shared/`)
- **Asset Organization**: Dedicated directories for components, utilities, and assets

## Key Features
- **Dashboard**: KPI tracking with metrics for contracts, validations, and deadlines
- **Contract Management**: Full CRUD operations for contract lifecycle
- **Validation Workflows**: Approval/rejection system for various business processes
- **Real-time Updates**: Query invalidation for immediate UI updates
- **Responsive Design**: Mobile-first approach with responsive layouts
- **Form Handling**: React Hook Form with Zod validation schemas

## Development Workflow
- **Hot Reloading**: Vite-powered development with instant updates
- **Type Safety**: End-to-end TypeScript coverage from database to frontend
- **Code Quality**: ESLint and TypeScript strict mode enabled
- **Build Process**: Separate build pipelines for client and server with bundling

# External Dependencies

## Database & Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting
- **Drizzle ORM**: TypeScript-first database toolkit
- **Connect PG Simple**: PostgreSQL session store for Express

## Frontend Libraries
- **React Ecosystem**: React 18, React DOM, React Hook Form
- **UI Framework**: Radix UI primitives with Shadcn/ui components
- **Styling**: Tailwind CSS, Class Variance Authority, Clsx
- **State Management**: TanStack React Query for server state
- **Routing**: Wouter for lightweight client-side routing
- **Date Handling**: Date-fns for date formatting and manipulation
- **Icons**: Lucide React for consistent iconography

## Development Tools
- **Build Tools**: Vite, esbuild for production builds
- **TypeScript**: Full TypeScript support with strict configuration
- **Linting**: ESLint with TypeScript integration
- **Replit Integration**: Replit-specific plugins for development environment

## Utility Libraries
- **Validation**: Zod for runtime type validation
- **Styling Utilities**: Tailwind Merge, Class Variance Authority
- **Carousel**: Embla Carousel for interactive components
- **Command Interface**: CMDK for command palette functionality