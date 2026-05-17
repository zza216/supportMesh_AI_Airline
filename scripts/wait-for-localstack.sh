#!/bin/bash

# Wait for LocalStack to be ready
# This script polls the health endpoint until LocalStack is fully initialized

set -e

ENDPOINT="http://localhost:4566"
MAX_ATTEMPTS=30
ATTEMPT=0

echo "🔄 Waiting for LocalStack to be ready..."
echo "   Endpoint: $ENDPOINT"
echo ""

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT + 1))
    
    # Try to reach health endpoint
    if curl -s "${ENDPOINT}/_localstack/health" > /dev/null 2>&1; then
        echo "✅ LocalStack is ready!"
        
        # Show service status
        echo ""
        echo "📊 Service Status:"
        curl -s "${ENDPOINT}/_localstack/health" | python3 -m json.tool || echo "Could not parse health check"
        
        echo ""
        echo "🎉 LocalStack is fully operational at $ENDPOINT"
        exit 0
    fi
    
    echo "⏳ Attempt $ATTEMPT/$MAX_ATTEMPTS - LocalStack not ready yet..."
    sleep 2
done

echo ""
echo "❌ LocalStack failed to start after $MAX_ATTEMPTS attempts"
echo "   Check logs with: docker-compose logs localstack"
exit 1
