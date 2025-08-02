# Overview

SmartClinic is a comprehensive healthcare management system built as a full-stack web application. The system serves multiple user roles including patients, doctors, staff, and administrators, providing features for appointment management, patient queuing, medication reminders, home visits, and staff verification with GPS tracking. The application is designed to streamline clinic operations while maintaining security and user experience across different healthcare workflows.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom healthcare-themed color variables
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Authentication**: JWT-based authentication with OTP verification via SMS
- **Session Management**: Token-based sessions with expiration and refresh logic
- **Middleware**: Custom authentication, role-based access control, and GPS verification

## Database Design
- **Database**: PostgreSQL with Neon serverless connection pooling
- **Schema Management**: Drizzle Kit for migrations and schema synchronization
- **Key Tables**: Users, appointments, queue tokens, medicines, prescriptions, medical history, staff verifications
- **Relationships**: Complex relational structure supporting multi-role user management and healthcare workflows

## Authentication & Authorization
- **Primary Auth**: Phone number-based OTP authentication
- **Multi-factor Elements**: SMS verification with rate limiting and attempt tracking
- **Role-based Access**: Four user roles (admin, staff, doctor, patient) with hierarchical permissions
- **Session Security**: JWT tokens with IP tracking and device fingerprinting
- **GPS Verification**: Location-based staff check-in system for workplace verification

## Real-time Features
- **Queue Management**: Server-sent events for real-time patient queue updates
- **Appointment Notifications**: Automated SMS reminders for appointments and medications
- **Staff Coordination**: Live queue status updates for doctors and staff members

## External Dependencies
- **Database**: Neon PostgreSQL serverless database
- **SMS Service**: Twilio integration for OTP and notification delivery
- **Development Tools**: Replit-specific development plugins and error handling
- **Monitoring**: Built-in request logging and error tracking middleware

## Deployment Architecture
- **Build Process**: Vite for frontend bundling, esbuild for backend compilation
- **Static Assets**: Served through Express with Vite development middleware
- **Environment**: Development and production configurations with environment variable management
- **Database Migrations**: Automated schema synchronization through Drizzle Kit

# External Dependencies

- **@neondatabase/serverless**: PostgreSQL serverless database connection with WebSocket support
- **@radix-ui/***: Comprehensive UI component primitives for accessible interface elements
- **@tanstack/react-query**: Server state management and caching for API interactions
- **drizzle-orm**: Type-safe database ORM with PostgreSQL support
- **bcrypt**: Password and OTP hashing for security
- **jsonwebtoken**: JWT token generation and verification for authentication
- **node-cron**: Scheduled task management for medication reminders and notifications
- **tailwindcss**: Utility-first CSS framework with custom healthcare theme
- **zod**: Runtime type validation for API inputs and form data
- **wouter**: Lightweight client-side routing solution
- **lucide-react**: Modern icon library for consistent UI iconography