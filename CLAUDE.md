# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Trading Strategy Testing Framework - A web-based platform that allows users to input trading strategy code and run basic backtests to evaluate strategy performance using historical SPY data.

## Development Commands

### Backend
- `npm install` - Install Node.js dependencies
- `npm start` - Start the Express server on port 5000
- `npm run dev` - Start server with nodemon for development

### Frontend
- `cd client && npm install` - Install React dependencies
- `cd client && npm start` - Start React development server on port 3000
- `cd client && npm run build` - Build React app for production

### Python Dependencies
- `pip install -r requirements.txt` - Install Python dependencies (pandas, numpy)

### Full Development Setup
1. Install backend: `npm install`
2. Install frontend: `cd client && npm install`
3. Install Python deps: `pip install -r requirements.txt`
4. Start backend: `npm run dev` (in root)
5. Start frontend: `cd client && npm start` (in separate terminal)

## Architecture

### Backend (Node.js/Express)
- `server.js` - Main Express server with single `/api/backtest` endpoint
- `backtest.py` - Python script that executes trading strategies and calculates metrics
- Handles strategy code execution in temporary files with 30-second timeout

### Frontend (React/TypeScript)
- `client/src/App.tsx` - Main application component
- `client/src/components/CodeEditor.tsx` - Code editor with syntax highlighting
- `client/src/components/ResultsDisplay.tsx` - Results visualization with Chart.js
- `client/src/types.ts` - TypeScript interfaces for API responses

### Data
- `data/SPY_1hour.csv` - Historical SPY hourly data (2018-present)
- Format: ts_event, rtype, publisher_id, instrument_id, open, high, low, close, volume, symbol

### Strategy Format
Users write Python functions that take a DataFrame and return buy/sell/hold signals:
```python
def strategy(data):
    # data has columns: Date, Open, High, Low, Close, Volume
    # return list of signals: 1=buy, -1=sell, 0=hold
    return signals
```