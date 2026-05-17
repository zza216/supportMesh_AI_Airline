#!/bin/bash

# Wait for LocalStack to be ready
echo "Waiting for LocalStack to be ready..."
sleep 5

# Set AWS endpoint
export AWS_ENDPOINT="http://localhost:4566"
export AWS_REGION="us-east-1"

echo "========================================="
echo "Creating AWS Resources in LocalStack"
echo "========================================="

# Create DynamoDB Table (FIXED: correct name and schema)
echo ""
echo "[1/6] Creating DynamoDB table: SupportMeshTickets"
awslocal dynamodb create-table \
    --table-name SupportMeshTickets \
    --attribute-definitions \
        AttributeName=ticketId,AttributeType=S \
    --key-schema \
        AttributeName=ticketId,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1 \
    2>/dev/null && echo "✓ DynamoDB table created" || echo "⚠ Table already exists"

# Create SNS Topics
echo ""
echo "[2/6] Creating SNS topics..."
awslocal sns create-topic --name triage-topic --region us-east-1 \
    > /dev/null 2>&1 && echo "✓ triage-topic created" || echo "⚠ triage-topic already exists"

awslocal sns create-topic --name verification-topic --region us-east-1 \
    > /dev/null 2>&1 && echo "✓ verification-topic created" || echo "⚠ verification-topic already exists"
awslocal sns create-topic --name auto-response-topic --region us-east-1  


# Create SQS Queues
echo ""
echo "[3/6] Creating SQS queues..."
awslocal sqs create-queue --queue-name triage-queue --region us-east-1 \
    > /dev/null 2>&1 && echo "✓ triage-queue created" || echo "⚠ triage-queue already exists"

awslocal sqs create-queue --queue-name verification-queue --region us-east-1 \
    > /dev/null 2>&1 && echo "✓ verification-queue created" || echo "⚠ verification-queue already exists"

# Get ARNs
echo ""
echo "[4/6] Getting resource ARNs..."
TRIAGE_QUEUE_ARN=$(awslocal sqs get-queue-attributes \
    --queue-url http://localhost:4566/000000000000/triage-queue \
    --attribute-names QueueArn \
    --query 'Attributes.QueueArn' \
    --output text)
echo "  Triage Queue ARN: $TRIAGE_QUEUE_ARN"

VERIFICATION_QUEUE_ARN=$(awslocal sqs get-queue-attributes \
    --queue-url http://localhost:4566/000000000000/verification-queue \
    --attribute-names QueueArn \
    --query 'Attributes.QueueArn' \
    --output text)
echo "  Verification Queue ARN: $VERIFICATION_QUEUE_ARN"

# Subscribe SQS to SNS
echo ""
echo "[5/6] Subscribing queues to topics..."
awslocal sns subscribe \
    --topic-arn arn:aws:sns:us-east-1:000000000000:triage-topic \
    --protocol sqs \
    --notification-endpoint $TRIAGE_QUEUE_ARN \
    --region us-east-1 \
    > /dev/null 2>&1 && echo "✓ triage-queue subscribed to triage-topic" || echo "⚠ Subscription already exists"

awslocal sns subscribe \
    --topic-arn arn:aws:sns:us-east-1:000000000000:verification-topic \
    --protocol sqs \
    --notification-endpoint $VERIFICATION_QUEUE_ARN \
    --region us-east-1 \
    > /dev/null 2>&1 && echo "✓ verification-queue subscribed to verification-topic" || echo "⚠ Subscription already exists"

# Set queue permissions
echo ""
echo "[6/6] Setting queue permissions..."
TRIAGE_POLICY='{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":"*","Action":"sqs:SendMessage","Resource":"'$TRIAGE_QUEUE_ARN'","Condition":{"ArnEquals":{"aws:SourceArn":"arn:aws:sns:us-east-1:000000000000:triage-topic"}}}]}'

awslocal sqs set-queue-attributes \
    --queue-url http://localhost:4566/000000000000/triage-queue \
    --attributes Policy="$TRIAGE_POLICY" \
    > /dev/null 2>&1 && echo "✓ triage-queue permissions set" || echo "⚠ Already set"

VERIFICATION_POLICY='{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":"*","Action":"sqs:SendMessage","Resource":"'$VERIFICATION_QUEUE_ARN'","Condition":{"ArnEquals":{"aws:SourceArn":"arn:aws:sns:us-east-1:000000000000:verification-topic"}}}]}'

awslocal sqs set-queue-attributes \
    --queue-url http://localhost:4566/000000000000/verification-queue \
    --attributes Policy="$VERIFICATION_POLICY" \
    > /dev/null 2>&1 && echo "✓ verification-queue permissions set" || echo "⚠ Already set"

echo ""
echo "========================================="
echo "✅ AWS Resources Created Successfully!"
echo "========================================="
echo ""
echo "Resources created:"
echo "  • DynamoDB: SupportMeshTickets (ticketId as primary key)"
echo "  • SNS: triage-topic, verification-topic"
echo "  • SQS: triage-queue, verification-queue"
echo "  • Subscriptions: queues → topics"
echo ""
echo "LocalStack is ready at http://localhost:4566"
echo ""

