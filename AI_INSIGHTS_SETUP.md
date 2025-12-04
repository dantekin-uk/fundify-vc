# AI Insights Setup Guide

The admin dashboard now includes AI-powered insights on stat cards that provide intelligent financial recommendations based on your data.

## Quick Setup

### 1. Get Your OpenAI API Key
- Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
- Create a new API key
- Copy the key (it will only be shown once)

### 2. Add the Key to Your Environment

#### For Local Development:
Add the key to the `DevServerControl` environment variables or directly to `.env`:

```env
OPENAI_API_KEY=sk_test_your_actual_key_here
OPENAI_MODEL=gpt-4o-mini
```

#### For Vercel (Production):
1. Go to your Vercel project settings
2. Navigate to Environment Variables
3. Add `OPENAI_API_KEY` with your API key
4. Add `OPENAI_MODEL` with value `gpt-4o-mini`

### 3. Run Development Environment

To run both the Vite frontend and the API dev server:

```bash
npm run dev:full
```

Or run them separately:
```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: API Server
npm run api:dev
```

## How It Works

1. **Frontend** (Port 3000): React app with stat cards
2. **API Server** (Port 3001): Handles OpenAI API calls for insights
3. **Vite Proxy**: Routes `/api/*` requests from port 3000 to port 3001

When you view the admin dashboard:
- Each stat card (Income, Expenses, etc.) fetches data context
- The `useFinancialInsight` hook sends this data to `/api/ai/insight`
- OpenAI generates a contextual insight/recommendation
- The insight is cached in localStorage for 24 hours
- If OpenAI fails, a fallback insight is shown automatically

## Fallback Behavior

If the OPENAI_API_KEY is not set or the API is unavailable:
- Generic insights based on trend analysis are shown
- No errors are displayed (graceful degradation)
- The dashboard still works normally

## Testing

1. Navigate to the Admin Dashboard
2. Look at the stat cards - you should see insights loading
3. Once loaded, you'll see AI-generated financial recommendations
4. Try different time ranges (W, M, Y) to see how insights change

## Troubleshooting

### Insights not showing?
- Check that the dev API server is running (`npm run api:dev`)
- Verify OPENAI_API_KEY is set correctly
- Check browser console for any error messages
- Verify Vite proxy is working (check network tab in DevTools)

### API not responding?
- Make sure port 3001 is available
- Check that `api-dev-server.js` is running without errors
- Verify OpenAI API key format (should start with `sk_`)

### Getting charged unexpectedly?
- Monitor your OpenAI API usage at https://platform.openai.com/account/usage/overview
- Consider setting usage limits in your OpenAI account settings

## File Structure

- `api-dev-server.js` - Development API server
- `src/hooks/useFinancialInsight.js` - Hook for fetching insights
- `src/services/geminiInsights.js` - Service for API calls
- `src/components/StatCard.jsx` - Displays insights on stat cards
- `api/ai/insight.js` - Production API endpoint for Vercel
