const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;

// Trust proxy for Railway/Heroku
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());

// Serve static files from client build
app.use(express.static(path.join(__dirname, 'client/build')));

// Backtest endpoint
app.post('/api/backtest', async (req, res) => {
  try {
    const { strategyCode, testType = 'backtest', timeframe = '1h' } = req.body;
    
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
      testType,
      timeframe
    ];
    
    console.log('Running Python command:', 'python3', args.join(' '));
    console.log('Working directory:', __dirname);
    console.log('Python args:', args);
    
    // Test Python availability first
    console.log('Testing Python environment...');
    const testPython = spawn('python3', ['-c', 'import pandas, numpy; print("Python deps OK")'], {
      cwd: __dirname
    });
    
    testPython.stdout.on('data', (data) => {
      console.log('Python test output:', data.toString());
    });
    
    testPython.stderr.on('data', (data) => {
      console.error('Python test error:', data.toString());
    });
    
    const pythonProcess = spawn('python3', args, {
      cwd: __dirname,
      env: { ...process.env, PYTHONPATH: __dirname }
    });

    let result = '';
    let error = '';
    let responseHandled = false;

    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      const errorText = data.toString();
      console.log('Python stderr:', errorText);
      error += errorText;
    });

    pythonProcess.on('error', (err) => {
      console.error('Python process error:', err);
      if (!responseHandled) {
        responseHandled = true;
        clearTimeout(timeoutHandle);
        res.status(500).json({ 
          error: 'Failed to start Python process', 
          details: err.message 
        });
      }
    });

    pythonProcess.on('close', (code) => {
      if (responseHandled) return;
      responseHandled = true;
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
      if (responseHandled) return;
      responseHandled = true;
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