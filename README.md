# Local Marketplace Lister

A comprehensive monorepo for managing local marketplace listings across multiple platforms, built with React, Express, TypeScript, and Supabase.

## 🏗️ Project Structure

```
local-marketplace-lister/
├── frontend/           # React frontend application
├── backend/            # Express backend API
├── shared/             # Shared types and utilities
├── supabase/           # Supabase configuration
├── .github/            # GitHub Actions workflows
├── docs/               # Additional documentation
├── package.json        # Root package with workspace configuration
├── .gitignore          # Git ignore rules
├── .env.example        # Environment variables template
└── README.md           # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm 9+
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/local-marketplace-lister.git
   cd local-marketplace-lister
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   ```
   Update the `.env` file with your configuration values.

4. **Start development servers**
   ```bash
   npm run dev
   ```
   This starts both frontend and backend in development mode.

## 📋 Available Scripts

### Root Level Scripts
- `npm run dev` - Start both frontend and backend in development mode
- `npm run dev:frontend` - Start only the frontend development server
- `npm run dev:backend` - Start only the backend development server
- `npm run build` - Build all workspaces
- `npm run start` - Start the backend server
- `npm run clean` - Clean all build artifacts
- `npm run lint` - Run linting across all workspaces
- `npm run format` - Format code across all workspaces
- `npm run test` - Run tests across all workspaces
- `npm run type-check` - Run TypeScript type checking across all workspaces

## 🛠️ Development Setup

### Individual Workspace Setup

**Frontend (React)**
```bash
cd frontend
npm install
npm run dev
```

**Backend (Express)**
```bash
cd backend
npm install
npm run dev
```

**Shared Types**
```bash
cd shared
npm install
npm run build
```

### Supabase Setup

1. Install Supabase CLI
   ```bash
   npm install -g supabase
   ```

2. Initialize Supabase
   ```bash
   cd supabase
   supabase init
   ```

3. Start local Supabase
   ```bash
   supabase start
   ```

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

#### Backend Environment
- `PORT` - Backend server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key

#### Frontend Environment
- `REACT_APP_API_URL` - Backend API URL
- `REACT_APP_SUPABASE_URL` - Supabase URL for frontend
- `REACT_APP_SUPABASE_ANON_KEY` - Supabase anonymous key for frontend

### TypeScript Configuration

The project uses TypeScript across all workspaces. Each workspace has its own `tsconfig.json` with appropriate compiler options.

## 📚 Documentation

For detailed development progress and implementation notes, see [TASK.md](./TASK.md).

Additional documentation can be found in the `/docs` directory.

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/amazing-feature`
2. Commit your changes: `git commit -m 'Add amazing feature'`
3. Push to the branch: `git push origin feature/amazing-feature`
4. Open a Pull Request

## 📦 Technology Stack

- **Frontend**: React, TypeScript, Vite
- **Backend**: Express.js, TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Deployment**: GitHub Actions
- **Monorepo**: npm Workspaces

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you have any questions or need help, please:
1. Check the existing [Issues](https://github.com/your-org/local-marketplace-lister/issues)
2. Create a new issue if your problem isn't already reported

---

Built with ❤️ by the Local Marketplace Team