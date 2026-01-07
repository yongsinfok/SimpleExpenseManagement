# Development Commands

## Package Manager
- **npm** (Node Package Manager) is used

## Development
```bash
# Install dependencies
npm install

# Start development server (runs on http://localhost:5173)
npm run dev

# Build for production
npm run build

# Run linter
npm run lint

# Preview production build locally
npm run preview
```

## Build Process
- Production build: `tsc -b && vite build`
- TypeScript compilation first, then Vite bundling
- Output directory: `dist/`

## Git Commands (Windows)
```bash
# Check git status
git status

# View commit history
git log --oneline -10

# Stage and commit changes
git add .
git commit -m "commit message"

# Push to remote
git push

# View branches
git branch

# Create new branch
git checkout -b branch-name
```

## File System Commands (Windows)
```bash
# List directory contents
dir
# or
ls

# Change directory
cd path\to\directory

# Create directory
mkdir directory-name

# Remove directory
rmdir directory-name

# Remove file
del filename

# Find files (PowerShell)
Get-ChildItem -Recurse -Filter "*.tsx"

# Search in files (PowerShell)
Select-String -Path "*.ts" -Pattern "pattern"
```

## Testing
- No automated tests currently configured
- Manual testing via dev server and preview build

## Deployment
- Configured for Vercel deployment
- `vercel.json` handles SPA routing
- Build command: `npm run build`
- Output: `dist/`
