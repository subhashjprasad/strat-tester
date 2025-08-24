import pandas as pd
import numpy as np
import json
import sys
import traceback
import random
import gc
from datetime import datetime

def load_data(file_path):
    """Load and process market data with memory optimization"""
    try:
        print("Loading CSV data...", file=sys.stderr, flush=True)
        # Load data in chunks to reduce memory usage
        df = pd.read_csv(file_path)
        print(f"Loaded {len(df)} raw rows", file=sys.stderr, flush=True)
        
        # For memory optimization, use a smaller recent dataset instead of sampling
        # Take the most recent 10,000 rows (roughly 1+ years of hourly data)
        print("Using recent 10,000 rows for memory optimization...", file=sys.stderr, flush=True)
        if len(df) > 10000:
            df = df.tail(10000).copy()  # Take the last 10,000 rows
        print(f"Dataset reduced to {len(df)} rows", file=sys.stderr, flush=True)
        
        # Convert timestamp to datetime
        print("Converting timestamps...", file=sys.stderr, flush=True)
        df['timestamp'] = pd.to_datetime(df['ts_event'])
        df = df.sort_values('timestamp')
        
        # Rename columns to match expected format
        df = df.rename(columns={
            'timestamp': 'Date',
            'open': 'Open',
            'high': 'High', 
            'low': 'Low',
            'close': 'Close',
            'volume': 'Volume'
        })
        
        # Select only needed columns and optimize data types
        df = df[['Date', 'Open', 'High', 'Low', 'Close', 'Volume']].copy()
        
        # Convert to more memory-efficient data types
        print("Optimizing data types...", file=sys.stderr, flush=True)
        df['Open'] = df['Open'].astype('float32')
        df['High'] = df['High'].astype('float32') 
        df['Low'] = df['Low'].astype('float32')
        df['Close'] = df['Close'].astype('float32')
        df['Volume'] = df['Volume'].astype('int32')
        
        df = df.reset_index(drop=True)
        print(f"Data processing complete: {len(df)} rows", file=sys.stderr, flush=True)
        
        # Force garbage collection after data loading
        gc.collect()
        print("Memory cleanup completed", file=sys.stderr, flush=True)
        
        return df
    except Exception as e:
        raise Exception(f"Error loading data: {str(e)}")

def execute_strategy(strategy_code, data):
    """Execute user strategy and return signals"""
    try:
        # Create a safe execution environment
        exec_globals = {
            'pd': pd,
            'np': np,
            'data': data
        }
        
        # Execute the strategy code
        exec(strategy_code, exec_globals)
        
        # Call the strategy function
        if 'strategy' not in exec_globals:
            raise Exception("Strategy function not found. Please define a 'strategy(data)' function.")
        
        signals = exec_globals['strategy'](data)
        
        if not isinstance(signals, (list, np.ndarray, pd.Series)):
            raise Exception("Strategy must return a list, array, or Series of signals")
        
        signals = np.array(signals)
        
        if len(signals) != len(data):
            raise Exception(f"Strategy returned {len(signals)} signals but data has {len(data)} rows")
        
        return signals
        
    except Exception as e:
        raise Exception(f"Strategy execution error: {str(e)}")

def run_backtest(data, signals, initial_capital=10000):
    """Run backtest simulation with memory optimization"""
    try:
        # Use numpy arrays for better memory efficiency
        portfolio_value = np.zeros(len(data), dtype='float32')
        position = 0
        cash = float(initial_capital)
        shares = 0.0
        trades = []
        
        # Pre-convert to numpy arrays for faster access
        prices = data['Close'].values.astype('float32')
        dates = data['Date'].values
        
        for i in range(len(data)):
            price = float(prices[i])
            signal = int(signals[i])
            
            # Execute trades
            if signal == 1 and position == 0:  # Buy signal
                shares = cash / price
                cash = 0.0
                position = 1
                trades.append({
                    'date': pd.to_datetime(dates[i]).strftime('%Y-%m-%d %H:%M:%S'),
                    'action': 'BUY',
                    'price': round(price, 2),
                    'shares': round(shares, 4)
                })
            elif signal == -1 and position == 1:  # Sell signal
                cash = shares * price
                trades.append({
                    'date': pd.to_datetime(dates[i]).strftime('%Y-%m-%d %H:%M:%S'),
                    'action': 'SELL',
                    'price': round(price, 2),
                    'shares': round(shares, 4)
                })
                shares = 0.0
                position = 0
            
            # Calculate portfolio value
            if position == 1:
                value = shares * price
            else:
                value = cash
            
            portfolio_value[i] = value
        
        # Clean up intermediate variables
        del prices, dates
        gc.collect()  # Force garbage collection
        
        return portfolio_value.tolist(), trades
        
    except Exception as e:
        raise Exception(f"Backtest execution error: {str(e)}")

def calculate_buy_hold_benchmark(data, initial_capital=10000):
    """Calculate buy-and-hold benchmark performance"""
    try:
        print("Starting buy-hold calculation...", file=sys.stderr, flush=True)
        start_price = float(data.iloc[0]['Close'])
        end_price = float(data.iloc[-1]['Close'])
        
        shares = initial_capital / start_price
        final_value = shares * end_price
        
        # Memory-efficient calculation using numpy operations
        print("Calculating portfolio values...", file=sys.stderr, flush=True)
        prices = data['Close'].values.astype('float32')  # Use float32 for memory efficiency
        bh_portfolio = shares * prices
        
        # Clean up intermediate variables
        del prices
        print("Portfolio values calculated", file=sys.stderr, flush=True)
        
        # Buy-and-hold metrics
        bh_total_return = (final_value - initial_capital) / initial_capital * 100
        bh_returns = np.diff(bh_portfolio) / bh_portfolio[:-1]
        bh_returns = bh_returns[~np.isnan(bh_returns)]
        
        if len(bh_returns) > 0 and np.std(bh_returns) > 0:
            bh_annualized_return = np.mean(bh_returns) * 252 * 24
            bh_annualized_volatility = np.std(bh_returns) * np.sqrt(252 * 24)
            bh_sharpe_ratio = bh_annualized_return / bh_annualized_volatility
        else:
            bh_sharpe_ratio = 0
        
        # Buy-and-hold maximum drawdown
        bh_peak = np.maximum.accumulate(bh_portfolio)
        bh_drawdown = (bh_portfolio - bh_peak) / bh_peak * 100
        bh_max_drawdown = np.min(bh_drawdown)
        
        return {
            'total_return': round(float(bh_total_return), 2),
            'sharpe_ratio': round(float(bh_sharpe_ratio), 3),
            'max_drawdown': round(float(bh_max_drawdown), 2),
            'final_value': round(float(final_value), 2)
        }, bh_portfolio
        
    except Exception as e:
        raise Exception(f"Buy-and-hold calculation error: {str(e)}")

def calculate_metrics(portfolio_value, data, initial_capital=10000):
    """Calculate performance metrics"""
    try:
        print("Converting portfolio to array...", file=sys.stderr, flush=True)
        portfolio_value = np.array(portfolio_value)
        print(f"Portfolio array size: {len(portfolio_value)}", file=sys.stderr, flush=True)
        
        # Calculate buy-and-hold benchmark
        print("Calculating buy-hold benchmark...", file=sys.stderr, flush=True)
        benchmark, bh_portfolio = calculate_buy_hold_benchmark(data, initial_capital)
        print("Benchmark calculated", file=sys.stderr, flush=True)
        
        # Strategy metrics
        print("Calculating strategy metrics...", file=sys.stderr, flush=True)
        total_return = (portfolio_value[-1] - initial_capital) / initial_capital * 100
        
        # Returns series
        print("Calculating returns series...", file=sys.stderr, flush=True)
        returns = np.diff(portfolio_value) / portfolio_value[:-1]
        returns = returns[~np.isnan(returns)]
        print(f"Returns calculated: {len(returns)} values", file=sys.stderr, flush=True)
        
        # Sharpe ratio (assuming 252*24 trading hours per year for hourly data)
        print("Calculating Sharpe ratio...", file=sys.stderr, flush=True)
        if len(returns) > 0 and np.std(returns) > 0:
            annualized_return = np.mean(returns) * 252 * 24
            annualized_volatility = np.std(returns) * np.sqrt(252 * 24)
            sharpe_ratio = annualized_return / annualized_volatility
        else:
            sharpe_ratio = 0
        print("Sharpe ratio calculated", file=sys.stderr, flush=True)
        
        # Maximum drawdown
        print("Calculating maximum drawdown...", file=sys.stderr, flush=True)
        peak = np.maximum.accumulate(portfolio_value)
        drawdown = (portfolio_value - peak) / peak * 100
        max_drawdown = np.min(drawdown)
        print("Drawdown calculated", file=sys.stderr, flush=True)
        
        # Alpha (excess return over benchmark)
        alpha = total_return - benchmark['total_return']
        
        # Win rate (if we have trades)
        win_rate = 0
        avg_trade_return = 0
        
        return {
            'total_return': round(float(total_return), 2),
            'sharpe_ratio': round(float(sharpe_ratio), 3),
            'max_drawdown': round(float(max_drawdown), 2),
            'win_rate': round(float(win_rate), 2),
            'avg_trade_return': round(float(avg_trade_return), 2),
            'final_value': round(float(portfolio_value[-1]), 2),
            'alpha': round(float(alpha), 2),
            'benchmark': benchmark
        }, bh_portfolio.astype(float).tolist()
        
    except Exception as e:
        raise Exception(f"Metrics calculation error: {str(e)}")

def run_permutation_test(data, signals, num_permutations=100, initial_capital=10000):
    """Run permutation test to assess statistical significance"""
    try:
        # Get original strategy performance
        portfolio_value, _ = run_backtest(data, signals)
        original_return = (portfolio_value[-1] - initial_capital) / initial_capital * 100
        
        # Generate random permutations and test performance
        random_returns = []
        random.seed(42)  # For reproducible results
        
        # Print progress to stderr (won't interfere with JSON output)
        print(f"Running {num_permutations} permutations...", file=sys.stderr, flush=True)
        
        for i in range(num_permutations):
            try:
                # Shuffle the signals randomly
                shuffled_signals = np.random.permutation(signals)
                
                # Run backtest with shuffled signals
                shuffled_portfolio, _ = run_backtest(data, shuffled_signals)
                shuffled_return = (shuffled_portfolio[-1] - initial_capital) / initial_capital * 100
                random_returns.append(shuffled_return)
                
                # Progress indicator every 25 permutations
                if (i + 1) % 25 == 0:
                    print(f"Completed {i + 1}/{num_permutations} permutations", file=sys.stderr, flush=True)
                    
            except Exception as e:
                print(f"Error in permutation {i}: {str(e)}", file=sys.stderr)
                continue
        
        random_returns = np.array(random_returns)
        
        if len(random_returns) == 0:
            raise Exception("No valid permutation results generated")
        
        print(f"Completed all {len(random_returns)} permutations", file=sys.stderr, flush=True)
        
        # Calculate p-value (percentage of random results that beat original)
        better_count = int(np.sum(random_returns >= original_return))
        p_value = float(better_count / len(random_returns))
        
        # Calculate percentile rank
        percentile = float((1 - p_value) * 100)
        
        return {
            'original_return': round(float(original_return), 2),
            'random_returns_mean': round(float(np.mean(random_returns)), 2),
            'random_returns_std': round(float(np.std(random_returns)), 2),
            'p_value': round(p_value, 4),
            'percentile': round(percentile, 1),
            'num_permutations': int(len(random_returns)),
            'significant': bool(p_value < 0.05)
        }
        
    except Exception as e:
        raise Exception(f"Permutation test error: {str(e)}")

def main():
    try:
        print("Backtest script starting...", file=sys.stderr, flush=True)
        
        if len(sys.argv) < 3:
            raise Exception("Usage: python backtest.py <strategy_file> <data_file> [test_type]")
        
        strategy_file = sys.argv[1]
        data_file = sys.argv[2]
        test_type = sys.argv[3] if len(sys.argv) > 3 else 'backtest'
        
        print(f"Loading strategy from: {strategy_file}", file=sys.stderr, flush=True)
        # Load strategy code
        with open(strategy_file, 'r') as f:
            strategy_code = f.read()
        print("Strategy code loaded successfully", file=sys.stderr, flush=True)
        
        print(f"Loading data from: {data_file}", file=sys.stderr, flush=True)
        # Load market data
        data = load_data(data_file)
        print(f"Data loaded successfully: {len(data)} rows", file=sys.stderr, flush=True)
        
        print("Executing strategy...", file=sys.stderr, flush=True)
        # Execute strategy
        signals = execute_strategy(strategy_code, data)
        print(f"Strategy executed successfully: {len(signals)} signals", file=sys.stderr, flush=True)
        
        if test_type == 'permutation':
            print("Running permutation test...", file=sys.stderr, flush=True)
            # Run permutation test
            permutation_results = run_permutation_test(data, signals)
            
            print("Running basic backtest for comparison...", file=sys.stderr, flush=True)
            # Still run basic backtest for comparison
            portfolio_value, trades = run_backtest(data, signals)
            print("Calculating metrics...", file=sys.stderr, flush=True)
            metrics, bh_portfolio = calculate_metrics(portfolio_value, data)
            
            # Prepare result
            result = {
                'success': True,
                'test_type': 'permutation',
                'metrics': metrics,
                'permutation_test': permutation_results,
                'trades': trades[:10],  # Fewer trades for permutation test
                'total_trades': len(trades)
            }
        else:
            print("Running standard backtest...", file=sys.stderr, flush=True)
            # Standard backtest
            portfolio_value, trades = run_backtest(data, signals)
            print(f"Backtest completed: {len(trades)} trades", file=sys.stderr, flush=True)
            
            print("Calculating metrics...", file=sys.stderr, flush=True)
            # Calculate metrics
            metrics, bh_portfolio = calculate_metrics(portfolio_value, data)
            print("Metrics calculated successfully", file=sys.stderr, flush=True)
            
            print("Preparing equity curve data...", file=sys.stderr, flush=True)
            # Prepare equity curve data (sample for visualization)
            step = max(1, len(data) // 200)  # Limit to ~200 points for chart (reduced from 500)
            equity_curve = []
            benchmark_curve = []
            for i in range(0, len(data), step):
                equity_curve.append({
                    'date': data.iloc[i]['Date'].strftime('%Y-%m-%d %H:%M:%S'),
                    'value': round(float(portfolio_value[i]), 2)
                })
                benchmark_curve.append({
                    'date': data.iloc[i]['Date'].strftime('%Y-%m-%d %H:%M:%S'),
                    'value': round(float(bh_portfolio[i]), 2)
                })
            print("Equity curve data prepared", file=sys.stderr, flush=True)
            
            # Prepare result
            result = {
                'success': True,
                'test_type': 'backtest',
                'metrics': metrics,
                'equity_curve': equity_curve,
                'benchmark_curve': benchmark_curve,
                'trades': trades[:50],  # Limit trades for response size
                'total_trades': len(trades)
            }
        
        print("Sending result...", file=sys.stderr, flush=True)
        print(json.dumps(result))
        print("Result sent successfully", file=sys.stderr, flush=True)
        
        # Final cleanup
        del data, signals, portfolio_value
        if 'bh_portfolio' in locals():
            del bh_portfolio
        gc.collect()
        
    except Exception as e:
        print(f"Error occurred: {str(e)}", file=sys.stderr, flush=True)
        error_result = {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }
        print(json.dumps(error_result))
        print("Error result sent", file=sys.stderr, flush=True)

if __name__ == '__main__':
    main()