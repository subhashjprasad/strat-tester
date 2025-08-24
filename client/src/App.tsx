import React, { useState } from 'react';
import CodeEditor from './components/CodeEditor';
import ResultsDisplay from './components/ResultsDisplay';
import { BacktestResult } from './types';
import './App.css';

const DEFAULT_STRATEGY = `def strategy(data):
    """
    Simple Moving Average Crossover Strategy
    data: DataFrame with columns [Date, Open, High, Low, Close, Volume]
    returns: list of signals where 1=buy, -1=sell, 0=hold
    """
    # Calculate moving averages
    short_period = 10
    long_period = 30
    
    short_ma = data['Close'].rolling(window=short_period).mean()
    long_ma = data['Close'].rolling(window=long_period).mean()
    
    signals = []
    position = 0  # 0 = no position, 1 = long position
    
    for i in range(len(data)):
        if i < long_period:
            signals.append(0)  # Not enough data for signal
            continue
            
        # Generate signals
        if short_ma.iloc[i] > long_ma.iloc[i] and position == 0:
            signals.append(1)  # Buy signal
            position = 1
        elif short_ma.iloc[i] < long_ma.iloc[i] and position == 1:
            signals.append(-1)  # Sell signal
            position = 0
        else:
            signals.append(0)  # Hold
    
    return signals`;

function App() {
  const [strategyCode, setStrategyCode] = useState(DEFAULT_STRATEGY);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [testType, setTestType] = useState<'backtest' | 'permutation'>('backtest');
  const [timeframe, setTimeframe] = useState<'1h' | '4h' | '1d'>('1h');

  const runTest = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/backtest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          strategyCode,
          testType,
          timeframe
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Test failed');
      }

      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || 'Unknown error occurred');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>Trading Strategy Tester</h1>
        <p>Test your trading strategies with historical data</p>
      </header>

      <main className="app-main">
        <div className="strategy-section">
          <h2>Strategy Code</h2>
          <CodeEditor
            value={strategyCode}
            onChange={setStrategyCode}
          />
          
          <div className="controls">
            <div className="test-type-selector">
              <label htmlFor="testType">Test Type:</label>
              <select 
                id="testType"
                value={testType} 
                onChange={(e) => setTestType(e.target.value as 'backtest' | 'permutation')}
                className="test-type-select"
              >
                <option value="backtest">Backtest</option>
                <option value="permutation">Permutation Test</option>
              </select>
            </div>
            
            <div className="timeframe-selector">
              <label htmlFor="timeframe">Timeframe:</label>
              <select 
                id="timeframe"
                value={timeframe} 
                onChange={(e) => setTimeframe(e.target.value as '1h' | '4h' | '1d')}
                className="timeframe-select"
              >
                <option value="1h">1 Hour (Recent ~1 year, 10k points)</option>
                <option value="4h">4 Hours (Multi-year, ~7k points)</option>
                <option value="1d">1 Day (Full history, ~1.2k points)</option>
              </select>
            </div>
            
            <button
              onClick={runTest}
              disabled={loading || !strategyCode.trim()}
              className="run-button"
            >
              {loading 
                ? (testType === 'permutation' ? 'Running Permutation Test (up to 5 min)...' : 'Running Backtest...')
                : (testType === 'permutation' ? 'Run Permutation Test' : 'Run Backtest')
              }
            </button>
            
            {testType === 'permutation' && (
              <div className="test-info">
                <small>
                  ⚠️ Permutation tests may take up to 5 minutes to complete as they run 100 random simulations.
                </small>
              </div>
            )}
          </div>
        </div>

        <div className="results-section">
          <h2>Results</h2>
          {error && (
            <div className="error-message">
              <h3>Error:</h3>
              <pre>{error}</pre>
            </div>
          )}
          
          {result && <ResultsDisplay result={result} />}
          
          {!result && !error && !loading && (
            <div className="placeholder">
              Run a test to see results here
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
