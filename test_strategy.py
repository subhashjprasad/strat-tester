def strategy(data):
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
    
    return signals