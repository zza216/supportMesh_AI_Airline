#!/bin/bash

echo "============================================"
echo "SupportMesh Docker Deployment"
echo "============================================"
echo ""

# Stop any existing containers
echo "Stopping existing containers..."
docker-compose down

# Build and start all services
echo ""
echo "Building and starting services..."
docker-compose up -d --build

# Wait for LocalStack to be ready
echo ""
echo "Waiting for LocalStack to be ready..."
sleep 20

# Check if LocalStack is healthy
echo "Checking LocalStack health..."
for i in {1..30}; do
  if curl -s http://localhost:4566/_localstack/health > /dev/null 2>&1; then
    echo "✓ LocalStack is ready!"
    break
  fi
  echo "  Waiting for LocalStack... (attempt $i/30)"
  sleep 2
done

# Initialize AWS resources
echo ""
echo "Initializing AWS resources (SNS, SQS, DynamoDB)..."
bash localstack-config/init-aws.sh

# Deploy Lambda functions
echo ""
echo "Deploying Lambda functions..."
bash deploy-lambdas.sh

# Show container status
echo ""
echo "============================================"
echo "Deployment Complete!"
echo "============================================"
echo ""
docker-compose ps
echo ""
echo "Services available at:"
echo "  • Dashboard:  http://localhost:3000"
echo "  • Backend:    http://localhost:3001"
echo "  • LocalStack: http://localhost:4566"
echo ""
echo "View logs:"
echo "  docker-compose logs -f backend"
echo "  docker-compose logs -f frontend"
echo "  docker-compose logs -f localstack"
echo ""
echo "Stop all services:"
echo "  docker-compose down"
echo ""
