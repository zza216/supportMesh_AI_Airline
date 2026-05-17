#!/bin/bash

# Test message flow through IoT Core → SNS → SQS
# Usage: ./test-message.sh "My flight was cancelled"

set -e

source .env

MESSAGE="${1:-My flight was cancelled and I need a refund immediately}"
ENDPOINT="http://localhost:4566"
REGION="us-east-1"

echo "📨 Sending Test Message to IoT Core"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Message: $MESSAGE"
echo "IoT Topic: $IOT_TOPIC_NAME"
echo ""

# Helper function
aws_local() {
    docker-compose run --rm awscli "$@" \
        --endpoint-url=http://localstack:4566 \
        --region=$REGION
}

# Create message payload
PAYLOAD=$(cat <<EOF
{
  "messageId": "test-$(date +%s)",
  "timestamp": $(date +%s),
  "customer": {
    "id": "CUST-12345",
    "email": "passenger@example.com",
    "tier": "gold"
  },
  "message": "$MESSAGE",
  "channel": "email",
  "metadata": {
    "flightNumber": "AA123",
    "bookingReference": "ABC123"
  }
}
EOF
)

echo "📤 Publishing to IoT Core..."
echo "$PAYLOAD" | python3 -c "import sys, json; print(json.dumps(json.load(sys.stdin), indent=2))"
echo ""

# Publish to IoT topic
echo "$PAYLOAD" > /tmp/test-message.json

aws_local iot-data publish \
    --topic "$IOT_TOPIC_NAME" \
    --payload file:///tmp/test-message.json \
    --qos 1

echo "✅ Message published to IoT Core"
echo ""

# Wait a moment for message to propagate
echo "⏳ Waiting 3 seconds for message to propagate..."
sleep 3

# Check if message arrived in triage-queue
echo ""
echo "🔍 Checking triage-queue for message..."

TRIAGE_QUEUE_URL="http://localstack:4566/000000000000/$SQS_TRIAGE_QUEUE_NAME"

MESSAGE_RECEIVED=$(aws_local sqs receive-message \
    --queue-url "$TRIAGE_QUEUE_URL" \
    --max-number-of-messages 1 \
    --wait-time-seconds 2 \
    --output json)

if [ -z "$MESSAGE_RECEIVED" ] || [ "$MESSAGE_RECEIVED" == "null" ] || [ "$MESSAGE_RECEIVED" == "{}" ]; then
    echo "❌ No message found in triage-queue"
    echo ""
    echo "🔍 Troubleshooting:"
    echo "   1. Check IoT rule exists:"
    echo "      docker-compose run --rm awscli iot get-topic-rule --rule-name $IOT_RULE_NAME --endpoint-url=http://localstack:4566"
    echo ""
    echo "   2. Check SNS topic:"
    echo "      docker-compose run --rm awscli sns list-topics --endpoint-url=http://localstack:4566"
    echo ""
    echo "   3. Check queue subscriptions:"
    echo "      docker-compose run --rm awscli sns list-subscriptions --endpoint-url=http://localstack:4566"
    exit 1
fi

echo "✅ Message found in triage-queue!"
echo ""
echo "📦 Message Details:"
echo "$MESSAGE_RECEIVED" | python3 -c "import sys, json; data = json.load(sys.stdin); print(json.dumps(data, indent=2))" | head -30

# Get message count
MSG_COUNT=$(aws_local sqs get-queue-attributes \
    --queue-url "$TRIAGE_QUEUE_URL" \
    --attribute-names ApproximateNumberOfMessages \
    --output text \
    --query 'Attributes.ApproximateNumberOfMessages')

echo ""
echo "📊 Queue Status:"
echo "   Total messages in triage-queue: $MSG_COUNT"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✨ Message Flow Test Complete!"
echo ""
echo "Message successfully traveled:"
echo "   IoT Core ($IOT_TOPIC_NAME)"
echo "      ↓"
echo "   IoT Rule ($IOT_RULE_NAME)"
echo "      ↓"
echo "   SNS Topic ($SNS_TRIAGE_TOPIC_NAME)"
echo "      ↓"
echo "   SQS Queue ($SQS_TRIAGE_QUEUE_NAME)"
echo ""
echo "🎯 Ready for Phase 4: Lambda functions will consume from this queue"
echo ""
