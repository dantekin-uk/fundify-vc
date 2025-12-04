# ✅ AI Insights Setup Complete

Your OpenAI API key has been configured! Here's everything you need to know to run the application.

## Quick Start

### Option 1: Automatic (Recommended)
```bash
npm run dev:full
```
This command:
- ✅ Starts Vite frontend on http://localhost:3000
- ✅ Starts API server on http://localhost:3001 (automatically)
- ✅ Checks if OpenAI key is configured
- ✅ Provides helpful status messages

### Option 2: Manual (Two Terminals)
```bash
# Terminal 1
npm run dev

# Terminal 2 (in a new terminal)
npm run api:dev
```

### Option 3: Frontend Only (Without AI)
```bash
npm run dev
```
The app will work but AI insights will use fallback suggestions instead.

---

## What's Been Set Up

### 🔧 Configuration
- **OpenAI API Key**: Configured in `.env`
- **Model**: `gpt-4o-mini` (cost-effective)
- **Backend**: Express API server at port 3001
- **Frontend**: Vite React app at port 3000

### 📁 New Files Created
- `api-dev-server.js` - Development API server
- `start-dev.js` - Smart dev starter
- `AI_INSIGHTS_SETUP.md` - Detailed setup guide
- `SETUP_COMPLETE.md` - This file

### 🔄 How It Works

1. **Frontend** (React/Vite at :3000) renders stat cards
2. **Vite Proxy** routes `/api/*` requests to the API server
3. **API Server** (Express at :3001) receives requests
4. **OpenAI API** processes the request and returns insights
5. **Frontend** displays the AI-generated insight in real-time
6. **localStorage** caches insights for 24 hours to save API costs

---

## Using the Dashboard

1. Go to http://localhost:3000 (automatic if you used `npm run dev:full`)
2. Navigate to **Admin Dashboard**
3. Look at the stat cards (Income, Expenses, Balance, Budget)
4. Each card will show:
   - Main value
   - Trend percentage
   - AI-generated insight (loading then displays)
   - Time range selector (W/M/Y)

### Example Insights
- **Income**: "Income up 23% - Engage donors and maintain momentum"
- **Expenses**: "Expenses down 8% - Maintain current spending discipline"
- **Balance**: "Balance improving 15% - Allocate surplus to key projects"

---

## Troubleshooting

### Insights Not Showing?

**Issue**: Cards show loading but no insight appears
```
✓ Check that both servers are running (npm run dev:full)
✓ Check browser console for errors (F12 → Console tab)
✓ Verify OpenAI API key in .env starts with "sk-"
✓ Check API server logs for errors
```

### "API server unavailable" Error?

**Issue**: You see an error about API server not running
```
✓ Make sure to run: npm run api:dev
✓ Or use: npm run dev:full (which starts both automatically)
```

### API Server Crashes?

**Issue**: API server exits with an error
```bash
# Check the error message in the terminal
# Common issues:
# 1. Port 3001 already in use: npm run api:dev -- --port 3002
# 2. Invalid OpenAI key: Check OPENAI_API_KEY in .env
# 3. Node version too old: Need Node 18+ for native fetch
```

### Getting Charged for API Calls?

**Ways to Manage Costs**:
- Insights are cached for 24 hours per stat card
- Each insight costs ~0.001-0.002 USD with `gpt-4o-mini`
- Set usage limits at https://platform.openai.com/account/billing/limits
- Monitor usage at https://platform.openai.com/account/usage/overview

---

## Production Deployment

### Vercel
The API endpoint is already set up at `api/ai/insight.js`:

1. Go to Vercel project settings
2. Add environment variable: `OPENAI_API_KEY=sk_your_key`
3. Add environment variable: `OPENAI_MODEL=gpt-4o-mini`
4. Deploy as usual

The production endpoint will be: `https://your-domain.vercel.app/api/ai/insight`

### Environment Variables Needed
```env
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o-mini
```

---

## Development Workflow

### Running Tests
```bash
npm test
```

### Building for Production
```bash
npm run build
```

### Checking API Server Status
The API server logs will show:
```
✓ Development API server running on http://localhost:3001
✓ OpenAI Key configured: YES
✓ OpenAI Model: gpt-4o-mini
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  Frontend (Port 3000)                │
│              React + Vite + TailwindCSS              │
│                                                       │
│  ┌───────────────────────────────────────────────┐  │
│  │       AdminDashboard with StatCards           │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐      │  │
│  │  │ Income  │  │Expenses │  │ Balance │ ...  │  │
│  │  │ [AI]    │  │ [AI]    │  │ [AI]    │      │  │
│  │  └────┬────┘  └────┬────┘  └────┬────┘      │  │
│  │       └──────┬──────┬────────────┘           │  │
│  └────────────┼──────────┼─────────────────────┘  │
│               │          │                        │
│         Vite Proxy (routes /api/*)               │
│               │          │                        │
┌──────────────┼──────────┼────────────────────────┐
│ Backend:     │          │                         │
│ ┌────────────▼──────────▼────────────────────┐  │
│ │    Express API Server (Port 3001)          │  │
│ │                                            │  │
│ │  POST /api/ai/insight                      │  │
│ │  - Validates request                       │  │
│ │  - Calls OpenAI API                        │  │
│ │  - Returns insight JSON                    │  │
│ │  - Falls back to generic insight if error  │  │
│ └────────┬───────────────────────────────────┘  │
└──────────┼────────────────────────────────────────┘
           │
      OpenAI API
      (External Service)
```

---

## Next Steps

1. **Run the app**: `npm run dev:full`
2. **Navigate to**: http://localhost:3000
3. **Go to**: Admin Dashboard
4. **Watch**: AI insights generate on stat cards
5. **Monitor**: API server logs for any issues

---

## Questions or Issues?

If you encounter any problems:
1. Check the browser console (F12)
2. Check the API server terminal output
3. Verify OPENAI_API_KEY is set correctly in `.env`
4. Make sure both servers are running

For detailed setup help, see `AI_INSIGHTS_SETUP.md`
