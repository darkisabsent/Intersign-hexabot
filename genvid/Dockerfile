# Use an official Python runtime as a parent image
FROM python:3.8.0-slim

# Set the working directory in the container
WORKDIR /app

# Install system dependencies needed for moviepy and video processing
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsm6 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

# Copy the current directory contents into the container at /app
COPY . /app

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Expose port 5002 for Flask
EXPOSE 5002

# Define environment variable for Flask
ENV FLASK_APP=app.py
ENV FLASK_RUN_HOST=0.0.0.0

# Run the Flask app
CMD ["flask", "run", "--port=5002"]
