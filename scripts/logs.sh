#!/bin/bash

# View LocalStack logs
# Usage: ./logs.sh [follow]

if [ "$1" == "follow" ] || [ "$1" == "-f" ]; then
    echo "📋 Following LocalStack logs (Ctrl+C to exit)..."
    echo ""
    docker-compose logs -f localstack
else
    echo "📋 LocalStack Logs (last 100 lines)..."
    echo ""
    docker-compose logs --tail=100 localstack
    echo ""
    echo "💡 To follow logs in real-time: ./scripts/logs.sh follow"
fi
