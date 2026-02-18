# Marketplace Hunter UI v2

This is the new, optimized React + TypeScript frontend for Marketplace Hunter.

## Key Features
- **React Query**: Robust data fetching and caching (fixes "glitchy" UI).
- **Mission Control**: Real-time HUD for scan status.
- **Two-Column Layout**: Sidebar for history, Main area for results.
- **Dark Mode**: Optimized for low-light environments.

## How to Run

### Option 1: One-Click Launch (Recommended)
Run `StartHunterLocal.bat` from the project root. This will launch the backend and frontend_v2 automatically.

### Option 2: Docker
Run `StartHunter.bat` or `docker-compose up --build`.

### Option 3: Manual Dev Server
```bash
cd frontend_v2
npm install
npm run dev
```

## Troubleshooting
If you encounter errors like `npm install failed` or `missing node_modules`:
1. Delete the `node_modules` folder and `package-lock.json` file in `frontend_v2`.
2. Run `npm install` manually in a terminal.
3. If issues persist, try running `npm install` with `--force`.

## Structure
- `src/api.ts`: API definitions and React Query hooks.
- `src/components/DeepDive.tsx`: Detailed view for verified items.
- `src/hooks/useScan.ts`: Custom hooks for scan management.
