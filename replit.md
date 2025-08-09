# Overview

SmartClinic is a comprehensive healthcare management system built as a full-stack web application. It serves multiple user roles including patients, doctors, staff, and administrators, providing features for appointment management, patient queuing, medication reminders, home visits, and staff verification with GPS tracking. The application aims to streamline clinic operations, ensuring security and an optimal user experience across various healthcare workflows.

# User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (August 2025)
- **CRITICAL Security Fixes**: Fixed major authentication vulnerabilities:
  - Removed hardcoded JWT token from admin dashboard (line 860)
  - Implemented proper route-level authentication protection
  - Added role-based access control for all routes
  - Prevents unauthorized access to admin, staff, and patient pages
- **Super Admin Access Control**: Implemented strict admin access restriction:
  - Only 44441100sf@gmail.com can access admin dashboard and functions
  - Added SuperAdminRoute component for frontend protection
  - Added requireSuperAdmin middleware for backend API protection
  - Protected critical routes: user management, dashboard stats, reports, medicine management
  - Unauthorized users redirected to appropriate dashboards with clear error messages
- **Email Notifications**: Added automatic email notifications for new clinic registrations sent to 44441100sf@gmail.com using existing Gmail SMTP
- **Dark Mode Enhancement**: Implemented independent dark mode toggle for admin dashboard, replacing settings icon with Moon/Sun toggle button for easy theme switching
- **Firebase Patient Authentication**: Implemented comprehensive Firebase authentication for patients:
  - Added Firebase configuration with environment variables
  - Created patient signup page with Google OAuth and email/password options
  - Created patient login page with same authentication methods
  - Extended user database schema with firebaseUid and authProvider fields
  - Added backend API endpoints for Firebase authentication integration
  - Integrated Firebase auth with existing JWT token system for seamless user experience
  - **Setup Required**: Both Email/Password and Google authentication methods must be enabled in Firebase Console
  - Domain authorization needed: `42638f0d-82bc-40ee-b3bd-785d53c6ac2a-00-3rsnhjlr0ddv2.sisko.replit.dev`

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite.
- **UI Library**: Shadcn/ui components built on Radix UI.
- **Styling**: Tailwind CSS with custom healthcare-themed color variables.
- **State Management**: TanStack Query for server state management.
- **Routing**: Wouter for client-side routing.
- **Form Handling**: React Hook Form with Zod validation.

## Backend Architecture
- **Runtime**: Node.js with Express.js framework.
- **Language**: TypeScript with ES modules.
- **Database ORM**: Drizzle ORM with PostgreSQL dialect.
- **Authentication**: JWT-based authentication with OTP verification.
- **Session Management**: Token-based sessions.
- **Middleware**: Custom authentication, role-based access control, and GPS verification.

## Database Design
- **Database**: PostgreSQL with Neon serverless connection pooling.
- **Schema Management**: Drizzle Kit for migrations and schema synchronization.
- **Key Tables**: Users, appointments, queue tokens, medicines, prescriptions, medical history, staff verifications.
- **Relationships**: Supports multi-role user management and healthcare workflows.

## Authentication & Authorization
- **Primary Auth**: Phone number-based OTP authentication.
- **Multi-factor Elements**: SMS verification.
- **Role-based Access**: Four user roles (admin, staff, doctor, patient) with hierarchical permissions.
- **Session Security**: JWT tokens with IP tracking and device fingerprinting.
- **GPS Verification**: Location-based staff check-in system.

## Real-time Features
- **Queue Management**: Server-sent events for real-time patient queue updates.
- **Appointment Notifications**: Automated SMS reminders for appointments and medications.
- **Staff Coordination**: Live queue status updates for doctors and staff members.

## Deployment Architecture
- **Build Process**: Vite for frontend bundling, esbuild for backend compilation.
- **Static Assets**: Served through Express.
- **Environment**: Development and production configurations.
- **Database Migrations**: Automated schema synchronization through Drizzle Kit.

# External Dependencies

- **Neon PostgreSQL**: Serverless database.
- **Twilio**: SMS service for OTP and notification delivery.
- **@radix-ui/***: UI component primitives.
- **@tanstack/react-query**: Server state management.
- **drizzle-orm**: Type-safe database ORM.
- **bcrypt**: Password and OTP hashing.
- **jsonwebtoken**: JWT token generation and verification.
- **node-cron**: Scheduled task management.
- **tailwindcss**: Utility-first CSS framework.
- **zod**: Runtime type validation.
- **wouter**: Client-side routing solution.
- **lucide-react**: Icon library.