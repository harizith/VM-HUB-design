# VM-HUB

VM-HUB is a role-based academic management portal built with Next.js for a college ecosystem. It provides separate experiences for students, teachers, Heads of Departments (HODs), and administrators, with authentication, dashboards, profiles, course management, schedules, and department-level workflows.

## Overview

This project is designed to centralize academic operations in a single campus portal. The app uses a credential-based authentication flow with NextAuth and a Prisma-backed PostgreSQL database to manage users, departments, timetable information, notices, and role-based access.

## Key Features

- Role-based login and dashboard routing for:
  - Students
  - Faculty / Teachers
  - HODs
  - Administrators
- Student dashboard with profile, schedule, messages, calendar, and academic information
- Teacher dashboard with course management, student oversight, and scheduling tools
- HOD dashboard for department-level academic and faculty management
- Admin dashboard for system-wide operations and portal control
- Secure credential authentication with NextAuth
- Prisma data model for users, departments, subjects, notices, timetables, and attendance
- Responsive UI built with modern React + Tailwind styling patterns
- Vercel-ready deployment configuration

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL
- NextAuth v4
- bcryptjs for password hashing and validation
- Lucide React icons
- Groq SDK integration for AI-related workflows

## Project Structure

```text
VM-HUB-design/
├── prisma/
│   └── schema.prisma
├── public/
├── scripts/
├── src/
│   ├── app/
│   │   ├── admin/
│   │   ├── api/
│   │   ├── hod/
│   │   ├── student/
│   │   ├── teacher/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   ├── lib/
│   ├── utils/
│   └── proxy.ts
├── .gitignore
├── .npmrc
├── AGENTS.md
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── pnpm-lock.yaml
├── postcss.config.mjs
├── tsconfig.json
├── vercel.json
└── README.md
```

## Role-Based Modules

### Student Portal
- Dashboard overview
- Profile management
- Calendar and schedule views
- Messaging sections
- Academic workflow access

### Teacher Portal
- Course modules
- Student access and management
- Schedule tools
- Profile management

### HOD Portal
- Department overview
- Course coordination
- Faculty management
- Department schedules and profile management

### Admin Portal
- Full platform administration
- User and access management
- System-wide dashboard controls

## Database Model

The app uses Prisma with a PostgreSQL datasource. The schema includes models for:

- User
- UserMode
- StudentProfile
- FacultyProfile
- HodProfile
- Department
- Subject
- Notice
- SystemSetting
- TimetableEntry
- Attendance

This provides a strong foundation for academic records, department management, subject details, timetable generation, and class attendance tracking.

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm (recommended, as the repo includes `pnpm-lock.yaml`)
- PostgreSQL database

### 1) Install dependencies

```bash
pnpm install
```

### 2) Configure environment variables

Create a `.env.local` file in the project root and add:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/vmhub"
NEXTAUTH_SECRET="your-super-secret-key"
```

You may also need additional environment values depending on your deployment and AI integrations.

### 3) Prepare the database

```bash
pnpm prisma generate
pnpm prisma db push
```

### 4) Run the development server

```bash
pnpm dev
```

Open http://localhost:3000 in your browser.

## Production Build

```bash
pnpm build
pnpm start
```

## Available Scripts

```json
{
  "dev": "next dev",
  "build": "prisma generate && next build",
  "start": "next start",
  "lint": "eslint"
}
```

## Authentication Flow

The application uses NextAuth with a credentials provider. It checks the user against the database and routes the user to the appropriate role-specific dashboard after successful authentication.

## Notes

- The project is configured as a Next.js App Router application.
- Authentication and authorization are driven by role-oriented routing.
- The repository includes both a practical portal implementation and data models intended for a college management system.

## License

This project does not currently include an explicit license file. Please check with the repository owner before using or distributing it in production or commercial settings.

## Contributing

Contributions are welcome. If you want to extend features or improve the academic workflows, open a pull request with a clear description of the change and its use case.

## Support

For environment setup issues, database configuration, or deployment concerns, check the project files in `prisma/schema.prisma`, `src/lib/auth.ts`, and the route structure under `src/app/`.
