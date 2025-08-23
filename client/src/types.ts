export interface BacktestMetrics {
  total_return: number;
  sharpe_ratio: number;
  max_drawdown: number;
  win_rate: number;
  avg_trade_return: number;
  final_value: number;
  alpha?: number;
  benchmark?: {
    total_return: number;
    sharpe_ratio: number;
    max_drawdown: number;
    final_value: number;
  };
}

export interface PermutationTest {
  original_return: number;
  random_returns_mean: number;
  random_returns_std: number;
  p_value: number;
  percentile: number;
  num_permutations: number;
  significant: boolean;
}

export interface EquityPoint {
  date: string;
  value: number;
}

export interface Trade {
  date: string;
  action: 'BUY' | 'SELL';
  price: number;
  shares: number;
}

export interface BacktestResult {
  success: boolean;
  test_type: 'backtest' | 'permutation';
  metrics: BacktestMetrics;
  equity_curve?: EquityPoint[];
  benchmark_curve?: EquityPoint[];
  permutation_test?: PermutationTest;
  trades: Trade[];
  total_trades: number;
}

export interface BacktestError {
  success: false;
  error: string;
  traceback?: string;
}