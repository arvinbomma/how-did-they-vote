# How Did They Vote?

Enter any U.S. address and instantly see every elected official representing you — and what they've actually voted on, explained in plain English by AI.

## Overview

How Did They Vote? maps any U.S. residential address to its elected officials at the federal and state level using real legislative APIs. The key differentiator is the focus on state legislators — the people who control education, water, taxes, and zoning — who are largely invisible on existing civic tools. Each official's voting record is summarized in plain English by Claude AI, making dense legislative language accessible to anyone.

## Tech Stack

**Frontend:** React, Vite, Tailwind CSS v4, React Router

**Backend:** FastAPI, Python, Anthropic Claude API, OpenStates API, Congress.gov API, Nominatim/OpenStreetMap (geocoding)

## How to Run

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## API Keys Required

| Service | Free signup |
|---|---|
| Anthropic | console.anthropic.com |
| OpenStates | open.pluralpolicy.com |
| Congress.gov | api.congress.gov/sign-up |

## Status

V1 complete — address lookup, officials grid, Federal/State/Local filters, vote detail pages, Claude AI summaries. Next: PostgreSQL caching, Vercel + Railway deployment.