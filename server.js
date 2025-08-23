const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for Railway/Heroku
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());

// Serve static files from client build
app.use(express.static(path.join(__dirname, 'client/build')));

// Backtest endpoint
app.post('/api/backtest', async (req, res) => {
  try {
    const { strategyCode, testType = 'backtest' } = req.body;
    
    if (!strategyCode) {
      return res.status(400).json({ error: 'Strategy code is required' });
    }

    // Write strategy code to temporary file
    const tempStrategyFile = path.join(__dirname, 'temp_strategy.py');
    fs.writeFileSync(tempStrategyFile, strategyCode);

    // Run Python backtest script with test type
    const args = [
      path.join(__dirname, 'backtest.py'),
      tempStrategyFile,
      path.join(__dirname, 'data', 'SPY_1hour.csv'),
      testType
    ];
    
    console.log('Running Python command:', 'python', args.join(' '));
    const pythonProcess = spawn('python', args);

    let result = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      const errorText = data.toString();
      console.log('Python stderr:', errorText);
      error += errorText;
    });

    pythonProcess.on('close', (code) => {
      clearTimeout(timeoutHandle);
      
      // Clean up temp file
      try {
        fs.unlinkSync(tempStrategyFile);
      } catch (e) {
        console.error('Error removing temp file:', e);
      }

      if (code !== 0) {
        console.error('Python error:', error);
        return res.status(500).json({ 
          error: 'Strategy execution failed', 
          details: error 
        });
      }

      try {
        const backtestResult = JSON.parse(result);
        res.json(backtestResult);
      } catch (e) {
        console.error('JSON parse error:', e);
        console.error('Raw result:', result);
        res.status(500).json({ 
          error: 'Failed to parse results',
          details: result.substring(0, 1000) // Limit output length
        });
      }
    });

    // Timeout after 5 minutes for permutation tests, 30 seconds for regular backtests
    const timeout = testType === 'permutation' ? 300000 : 30000;
    const timeoutHandle = setTimeout(() => {
      pythonProcess.kill();
      res.status(408).json({ error: `${testType} execution timeout (${timeout/1000}s)` });
    }, timeout);

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});