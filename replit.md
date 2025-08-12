# Overview

SmartClinic is a comprehensive healthcare management system built as a full-stack web application. It serves multiple user roles including patients, doctors, staff, and administrators, providing features for appointment management, patient queuing, medication reminders, home visits, and staff verification with GPS tracking. The application aims to streamline clinic operations, ensuring security and an optimal user experience across various healthcare workflows.

# User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (August 2025)
- **Patient Medicine Management Fix**: Fixed critical issues with patient medicine functionality:
  - Resolved dashboard blank screen error caused by undefined reminder.prescription.medicine
  - Fixed medicine name display in "Today's Reminders" by using correct data structure (medicineName)
  - Fixed time display inconsistency between "My Medicines" and "Today's Reminders" sections
  - Created dedicated createPatientMedicine method for patient-only medicine management
  - Removed clinic dependency from patient medicine operations
  - Patient medicines now work completely independently from admin/clinic systems
  - Fixed both "Add Medicine" and "Upload List" functionality for patients
  - Backend returns flat reminder properties (medicineName, dosage) which frontend now correctly accesses
  - **Indian Standard Time Fix**: Fixed comprehensive timezone handling across the entire system:
    - **Medicine Reminders**: Server properly converts IST to UTC when storing reminders (IST - 5:30 hours)
    - **Medicine Reminders**: Frontend displays all times in Indian Standard Time (Asia/Kolkata)
    - **Medicine Reminders**: Fixed time mismatch issue between "My Medicines" and "Today's Reminders"
    - **Medicine Reminders**: All medicine reminder times consistently show in IST format
    - **Medicine Reminders**: Email notifications correctly format reminder times in IST (Asia/Kolkata timezone)
    - **Appointment Emails**: Fixed ALL appointment email notifications to use proper IST timezone formatting
    - **Appointment Emails**: Appointment approval, rejection, reschedule, and SMS notifications now show correct IST times
    - **Appointment Emails**: Admin dashboard stats logging now uses IST for date display consistency
    - **Appointment Emails**: Test endpoints also updated to use proper IST timezone formatting
    - Added formatTime helper function to dashboard for consistent time display across all pages
    - Fixed scheduler service to properly format email reminder times in Indian Standard Time
    - Both medicine AND appointment email systems now use consistent 'en-IN' locale with 'Asia/Kolkata' timezone
    - Existing reminders created before timezone fix may show incorrect times (stored as UTC but intended as IST)
- **Mobile UI Optimization**: Applied comprehensive mobile-first design improvements:
  - Fixed critical button overflow issues in admin dashboard appointments and patient records sections
  - Added mobile-responsive button containers with proper wrapping and sizing constraints
  - Implemented text truncation and flex controls to prevent content overflow
  - Created mobile-card-buttons CSS class with responsive sizing for different screen sizes
  - Added ultra-responsive design support for very small screens (under 480px width)
  - Applied mobile-optimized styling with proper touch targets and safe area support
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
- **Location Update**: Changed clinic location from Mumbai to Bangalore:
  - Updated GPS coordinates to Bangalore Central Clinic (12.9716, 77.5946)
  - Added Whitefield Branch, Koramangala Clinic, and Electronic City Clinic locations
  - Staff GPS verification now works for Bangalore area with 150-200m radius

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