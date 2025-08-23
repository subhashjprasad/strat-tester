# Use Node.js 20 with Python
FROM node:20-bullseye

# Install Python and pip
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Create symbolic link for python command
RUN ln -s /usr/bin/python3 /usr/bin/python

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/

# Install Node.js dependencies
RUN npm install
RUN cd client && npm install

# Install Python dependencies
COPY requirements.txt ./
RUN pip3 install -r requirements.txt

# Copy source code
COPY . .

# Build React app
RUN npm run build

# Expose port
EXPOSE 8080

# Start the application
CMD ["npm", "start"]