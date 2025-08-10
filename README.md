# SmartClinic - Healthcare Management System

A comprehensive healthcare management platform designed to enhance patient and staff engagement through intelligent location-based tracking and dynamic workflow management, with a focus on creating an intuitive and interactive user experience.

## 🏥 Overview

SmartClinic is a full-stack web application that serves multiple user roles including patients, doctors, staff, and administrators. The platform streamlines clinic operations with features for appointment management, patient queuing, medication reminders, home visits, and GPS-enabled staff verification.

## ✨ Key Features

### 👥 Multi-Role Support
- **Patients**: Book appointments, join queues, receive medication reminders
- **Doctors**: Manage appointments, view patient queues, prescribe medications
- **Staff**: Check-in/out with GPS verification, manage patient flow
- **Administrators**: Full system control, user management, analytics

### 🔐 Advanced Authentication
- Phone number-based OTP verification
- Firebase authentication with Google OAuth and email/password
- Multi-factor authentication with SMS verification
- Role-based access control with hierarchical permissions
- JWT token-based sessions with IP tracking

### 📍 Location-Based Features
- GPS-enabled staff check-in/check-out system
- Location verification for Bangalore clinic locations:
  - Bangalore Central Clinic (12.9716, 77.5946)
  - Whitefield Branch
  - Koramangala Clinic
  - Electronic City Clinic
- 150-200m radius verification for staff presence

### ⚡ Real-Time Operations
- Live patient queue management with Server-Sent Events
- Automatic queue wait time updates every 60 seconds
- Real-time appointment notifications
- Live staff coordination and presence tracking

### 📧 Communication & Notifications
- Automated SMS reminders via Twilio integration
- Email notifications using Gmail SMTP and Resend
- OTP delivery for secure authentication
- Appointment and medication reminder system

### 💊 Medical Management
- Comprehensive medicine inventory tracking
- Prescription management system
- Medical history tracking
- Stock level monitoring with low-stock alerts

## 🛠 Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with hot module replacement
- **UI Components**: Shadcn/ui built on Radix UI primitives
- **Styling**: Tailwind CSS with custom healthcare theme
- **State Management**: TanStack Query for server state
- **Routing**: Wouter for client-side routing
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React icons

### Backend
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Neon serverless connection
- **ORM**: Drizzle ORM with type-safe queries
- **Authentication**: JWT with bcrypt password hashing
- **Real-time**: WebSocket and Server-Sent Events
- **Email**: Nodemailer with Gmail SMTP, Resend fallback
- **SMS**: Twilio integration for OTP and notifications

### Database & Infrastructure
- **Database**: Neon PostgreSQL with connection pooling
- **Schema Management**: Drizzle Kit for migrations
- **Environment**: Development and production configurations
- **Deployment**: Replit with automatic restarts

## 🚀 Getting Started

### Prerequisites
- Node.js 20.x or higher
- PostgreSQL database (Neon recommended)
- Gmail app password for email notifications
- Firebase project for authentication
- Twilio account for SMS (optional)

### Environment Variables

The following secrets need to be configured in your Replit environment:

```bash
# Database Configuration
DATABASE_URL=your_postgresql_connection_string
PGDATABASE=your_database_name
PGHOST=your_database_host
PGPORT=5432
PGUSER=your_database_user
PGPASSWORD=your_database_password

# Email Service
GMAIL_USER=your_gmail_address
GMAIL_APP_PASSWORD=your_gmail_app_password

# Session Security
SESSION_SECRET=your_secure_session_secret

# Firebase Authentication (Frontend)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_APP_ID=your_firebase_app_id

# SMS Service (Optional)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

### Installation & Setup

1. **Clone and Install Dependencies**
   ```bash
   npm install
   ```

2. **Database Setup**
   ```bash
   # Push schema to database
   npm run db:push
   
   # Generate types (if needed)
   npm run db:generate
   ```

3. **Firebase Setup**
   - Enable Authentication in Firebase Console
   - Configure Email/Password and Google sign-in methods
   - Add your domain to authorized domains
   - See `FIREBASE_SETUP.md` for detailed instructions

4. **Start Development Server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5000`

## 📱 Application Structure

### Key Directories
```
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Application pages/routes
│   │   ├── lib/           # Utilities and configurations
│   │   └── hooks/         # Custom React hooks
├── server/                # Express backend application
│   ├── routes.ts         # API route definitions
│   ├── storage.ts        # Database operations
│   ├── services/         # External service integrations
│   └── middleware/       # Authentication & validation
├── shared/               # Shared types and schemas
│   └── schema.ts        # Drizzle database schema
└── migrations/          # Database migration files
```

### User Roles & Access Levels

1. **Super Admin** (`44441100sf@gmail.com`)
   - Full system access and user management
   - Clinic registration approval
   - System analytics and reporting

2. **Admin**
   - Clinic-level administration
   - Staff and patient management
   - Appointment scheduling

3. **Doctor**
   - Patient consultation
   - Prescription management
   - Queue management

4. **Staff**
   - Patient check-in/out
   - Queue management
   - GPS-based attendance

5. **Patient**
   - Appointment booking
   - Queue joining
   - Medical history access

## 🔒 Security Features

### Authentication & Authorization
- Multi-factor authentication with OTP verification
- Firebase integration for secure user management
- JWT tokens with IP tracking and device fingerprinting
- Role-based access control with route protection
- Session management with secure cookies

### Data Protection
- Password hashing with bcrypt
- SQL injection prevention with parameterized queries
- XSS protection with input sanitization
- CORS configuration for secure cross-origin requests

### Location Verification
- GPS-based staff check-in with 150-200m radius verification
- Geolocation API integration for accurate positioning
- Anti-spoofing measures for location data

## 🏥 Healthcare Workflows

### Patient Journey
1. **Registration**: Firebase authentication with phone/email
2. **Appointment Booking**: Select doctor, date, and time
3. **Queue Management**: Join digital queue, receive updates
4. **Consultation**: Doctor interaction and prescription
5. **Follow-up**: Medication reminders and next appointments

### Staff Operations
1. **GPS Check-in**: Location-verified attendance
2. **Patient Management**: Queue handling and patient flow
3. **Real-time Updates**: Live dashboard with current status
4. **Check-out**: End-of-day location verification

### Administrative Tasks
1. **User Management**: Approve staff and manage permissions
2. **Analytics**: View clinic performance metrics
3. **Inventory**: Medicine stock management
4. **Reporting**: Generate operational reports

## 📊 Real-Time Features

### Queue Management
- Live patient queue with estimated wait times
- Automatic queue progression
- WebSocket updates for real-time synchronization
- SMS notifications for queue status changes

### Staff Coordination
- Real-time staff presence tracking
- Live dashboard with current staffing levels
- Automatic attendance logging with GPS verification
- Staff communication and coordination tools

## 🔧 Development & Deployment

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run db:push      # Push schema changes to database
npm run db:generate  # Generate Drizzle types
npm run preview      # Preview production build
```

### Database Management
- Use `npm run db:push` for schema changes (never write manual SQL migrations)
- Drizzle ORM handles type safety and query optimization
- Automatic connection pooling with Neon PostgreSQL

### Production Deployment
- Optimized build with Vite
- Static asset serving through Express
- Environment-based configuration
- Automatic health checks and restarts

## 📞 Support & Contact

For technical support or feature requests:
- **Primary Contact**: 44441100sf@gmail.com
- **Email Notifications**: Automatic alerts for new clinic registrations
- **SMS Support**: Twilio integration for critical notifications

## 📄 License

This project is proprietary software developed for healthcare management operations.

## 🔄 Recent Updates (August 2025)

- ✅ Fixed major authentication vulnerabilities and implemented proper role-based access control
- ✅ Added super admin access restrictions for enhanced security
- ✅ Implemented Firebase patient authentication with Google OAuth
- ✅ Added automatic email notifications for clinic registrations
- ✅ Enhanced dark mode functionality with independent toggle
- ✅ Updated location services from Mumbai to Bangalore with multiple clinic locations
- ✅ Improved GPS verification system with configurable radius settings

---

*SmartClinic - Enhancing healthcare delivery through intelligent technology*