# BoilerBrain

Professional gas boiler diagnostic assistant for UK Gas Safe engineers.

## Features

- **AI Chat Diagnostics** - GPT-4o powered fault code analysis
- **Manual Finder** - 5,670+ boiler manuals database
- **Gas Rate Calculator** - UK standard CV calculation
- **Room BTU Calculator** - CIBSE compliant heating requirements
- **Gas Pipe Sizing** - BS 6891:2015 compliant
- **Meter Diversity** - BS 6400-1 diversity factors
- **CP12 Form** - Digital gas safety records with PDF export
- **Warning Notice** - Gas safe documentation

## Tech Stack

- **Frontend**: React 18, Vite, TailwindCSS
- **Backend**: Express.js, Node.js
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT-4o
- **Hosting**: Netlify

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Environment Variables

Create `.env` file with:
```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Live Site

https://boiler-brain-ai.netlify.app

## Standards Compliance

All calculators verified against UK industry standards:
- BS 6891:2015 (Gas pipe sizing)
- BS 6400-1 Annex A (Meter diversity)
- GOV.UK (Gas calorific values)
- CIBSE (BTU calculations)

## License

Proprietary - All rights reserved.
