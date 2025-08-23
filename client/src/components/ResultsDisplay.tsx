import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { BacktestResult } from '../types';
import './ResultsDisplay.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface ResultsDisplayProps {
  result: BacktestResult;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ result }) => {
  const { metrics, equity_curve, benchmark_curve, trades, total_trades, test_type, permutation_test } = result;

  const chartData = equity_curve ? {
    labels: equity_curve.map(point => {
      const date = new Date(point.date);
      return date.toLocaleDateString();
    }),
    datasets: [
      {
        label: 'Strategy',
        data: equity_curve.map(point => point.value),
        borderColor: 'rgb(88, 166, 255)',
        backgroundColor: 'rgba(88, 166, 255, 0.1)',
        tension: 0.1,
        borderWidth: 1.5,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
      ...(benchmark_curve ? [{
        label: 'Buy & Hold Benchmark',
        data: benchmark_curve.map(point => point.value),
        borderColor: 'rgb(255, 161, 87)',
        backgroundColor: 'rgba(255, 161, 87, 0.1)',
        tension: 0.1,
        borderDash: [5, 5],
        borderWidth: 1.5,
        pointRadius: 0,
        pointHoverRadius: 4,
      }] : []),
    ],
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#e6edf3',
          font: {
            family: 'Mononoki, Monaco, Menlo, Ubuntu Mono, monospace',
          },
        },
      },
      title: {
        display: true,
        text: 'Equity Curve',
        color: '#f0f6fc',
        font: {
          family: 'Mononoki, Monaco, Menlo, Ubuntu Mono, monospace',
          size: 16,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        title: {
          display: true,
          text: 'Portfolio Value ($)',
          color: '#7d8590',
          font: {
            family: 'Mononoki, Monaco, Menlo, Ubuntu Mono, monospace',
          },
        },
        ticks: {
          color: '#7d8590',
          font: {
            family: 'Mononoki, Monaco, Menlo, Ubuntu Mono, monospace',
          },
        },
        grid: {
          color: '#30363d',
        },
      },
      x: {
        title: {
          display: true,
          text: 'Date',
          color: '#7d8590',
          font: {
            family: 'Mononoki, Monaco, Menlo, Ubuntu Mono, monospace',
          },
        },
        ticks: {
          color: '#7d8590',
          font: {
            family: 'Mononoki, Monaco, Menlo, Ubuntu Mono, monospace',
          },
        },
        grid: {
          color: '#30363d',
        },
      },
    },
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getMetricColor = (value: number, isPercentage: boolean = false) => {
    if (isPercentage) {
      return value >= 0 ? '#22c55e' : '#ef4444';
    }
    return '#333';
  };

  return (
    <div className="results-display">
      <div className="test-type-header">
        <h3>{test_type === 'permutation' ? 'Permutation Test Results' : 'Backtest Results'}</h3>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <h3>Total Return</h3>
          <p 
            className="metric-value"
            style={{ color: getMetricColor(metrics.total_return, true) }}
          >
            {formatPercentage(metrics.total_return)}
          </p>
        </div>

        <div className="metric-card">
          <h3>Sharpe Ratio</h3>
          <p className="metric-value">
            {metrics.sharpe_ratio.toFixed(3)}
          </p>
        </div>

        <div className="metric-card">
          <h3>Max Drawdown</h3>
          <p 
            className="metric-value"
            style={{ color: getMetricColor(metrics.max_drawdown, true) }}
          >
            {formatPercentage(metrics.max_drawdown)}
          </p>
        </div>

        <div className="metric-card">
          <h3>Final Value</h3>
          <p className="metric-value">
            {formatCurrency(metrics.final_value)}
          </p>
        </div>

        {metrics.alpha !== undefined && (
          <div className="metric-card">
            <h3>Alpha (vs Buy & Hold)</h3>
            <p 
              className="metric-value"
              style={{ color: getMetricColor(metrics.alpha, true) }}
            >
              {formatPercentage(metrics.alpha)}
            </p>
          </div>
        )}
      </div>

      {metrics.benchmark && (
        <div className="benchmark-comparison">
          <h3>Buy & Hold Benchmark</h3>
          <div className="benchmark-metrics">
            <div className="benchmark-metric">
              <span>Return: </span>
              <span style={{ color: getMetricColor(metrics.benchmark.total_return, true) }}>
                {formatPercentage(metrics.benchmark.total_return)}
              </span>
            </div>
            <div className="benchmark-metric">
              <span>Sharpe Ratio: </span>
              <span>{metrics.benchmark.sharpe_ratio.toFixed(3)}</span>
            </div>
            <div className="benchmark-metric">
              <span>Max Drawdown: </span>
              <span style={{ color: getMetricColor(metrics.benchmark.max_drawdown, true) }}>
                {formatPercentage(metrics.benchmark.max_drawdown)}
              </span>
            </div>
            <div className="benchmark-metric">
              <span>Final Value: </span>
              <span>{formatCurrency(metrics.benchmark.final_value)}</span>
            </div>
          </div>
        </div>
      )}

      {permutation_test && (
        <div className="permutation-results">
          <h3>Statistical Significance</h3>
          <div className="permutation-metrics">
            <div className="perm-metric">
              <span>P-Value: </span>
              <span style={{ color: permutation_test.significant ? '#22c55e' : '#ef4444' }}>
                {permutation_test.p_value.toFixed(4)} 
                {permutation_test.significant ? ' (Significant)' : ' (Not Significant)'}
              </span>
            </div>
            <div className="perm-metric">
              <span>Percentile Rank: </span>
              <span>{permutation_test.percentile.toFixed(1)}%</span>
            </div>
            <div className="perm-metric">
              <span>Random Returns (Mean): </span>
              <span>{formatPercentage(permutation_test.random_returns_mean)}</span>
            </div>
            <div className="perm-metric">
              <span>Random Returns (Std): </span>
              <span>{formatPercentage(permutation_test.random_returns_std)}</span>
            </div>
            <div className="perm-metric">
              <span>Permutations: </span>
              <span>{permutation_test.num_permutations.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {chartData && (
        <div className="chart-container">
          <Line data={chartData} options={chartOptions} />
        </div>
      )}

      <div className="trades-section">
        <h3>Recent Trades ({trades.length} of {total_trades} shown)</h3>
        {trades.length > 0 ? (
          <div className="trades-table">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Action</th>
                  <th>Price</th>
                  <th>Shares</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade, index) => (
                  <tr key={index}>
                    <td>{new Date(trade.date).toLocaleString()}</td>
                    <td>
                      <span className={`trade-action ${trade.action.toLowerCase()}`}>
                        {trade.action}
                      </span>
                    </td>
                    <td>{formatCurrency(trade.price)}</td>
                    <td>{trade.shares.toFixed(2)}</td>
                    <td>{formatCurrency(trade.price * trade.shares)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="no-trades">No trades executed</p>
        )}
      </div>
    </div>
  );
};

export default ResultsDisplay;