#!/bin/bash

# Create all AWS resources in LocalStack
# Phase 3: SNS Topics, SQS Queues, DynamoDB Table, IoT Core

set -e

# Load environment variables
source .env

ENDPOINT="http://localhost:4566"
REGION="us-east-1"

echo "🚀 Creating AWS Resources in LocalStack"
echo "   Endpoint: $ENDPOINT"
echo "   Region: $REGION"
echo ""

# Helper function to run AWS CLI commands
aws_local() {
    docker-compose run --rm awscli "$@" \
        --endpoint-url=http://localstack:4566 \
        --region=$REGION
}

# 1. Create SNS Topics
echo "📢 Creating SNS Topics..."

echo "   Creating triage-topic..."
TRIAGE_TOPIC_ARN=$(aws_local sns create-topic \
    --name $SNS_TRIAGE_TOPIC_NAME \
    --output text \
    --query 'TopicArn')
echo "   ✅ Created: $TRIAGE_TOPIC_ARN"

echo "   Creating verification-topic..."
VERIFICATION_TOPIC_ARN=$(aws_local sns create-topic \
    --name $SNS_VERIFICATION_TOPIC_NAME \
    --output text \
    --query 'TopicArn')
echo "   ✅ Created: $VERIFICATION_TOPIC_ARN"

echo ""

# 2. Create SQS Queues
echo "📬 Creating SQS Queues..."

echo "   Creating triage-queue..."
TRIAGE_QUEUE_URL=$(aws_local sqs create-queue \
    --queue-name $SQS_TRIAGE_QUEUE_NAME \
    --output text \
    --query 'QueueUrl')
echo "   ✅ Created: $TRIAGE_QUEUE_URL"

echo "   Creating verification-queue..."
VERIFICATION_QUEUE_URL=$(aws_local sqs create-queue \
    --queue-name $SQS_VERIFICATION_QUEUE_NAME \
    --output text \
    --query 'QueueUrl')
echo "   ✅ Created: $VERIFICATION_QUEUE_URL"

echo ""

# 3. Get Queue ARNs (needed for SNS subscription)
echo "🔗 Getting Queue ARNs..."

TRIAGE_QUEUE_ARN=$(aws_local sqs get-queue-attributes \
    --queue-url $TRIAGE_QUEUE_URL \
    --attribute-names QueueArn \
    --output text \
    --query 'Attributes.QueueArn')
echo "   Triage Queue ARN: $TRIAGE_QUEUE_ARN"

VERIFICATION_QUEUE_ARN=$(aws_local sqs get-queue-attributes \
    --queue-url $VERIFICATION_QUEUE_URL \
    --attribute-names QueueArn \
    --output text \
    --query 'Attributes.QueueArn')
echo "   Verification Queue ARN: $VERIFICATION_QUEUE_ARN"

echo ""

# 4. Subscribe SQS Queues to SNS Topics
echo "🔗 Subscribing Queues to Topics..."

echo "   Subscribing triage-queue to triage-topic..."
aws_local sns subscribe \
    --topic-arn $TRIAGE_TOPIC_ARN \
    --protocol sqs \
    --notification-endpoint $TRIAGE_QUEUE_ARN \
    --output text
echo "   ✅ Subscription created"

echo "   Subscribing verification-queue to verification-topic..."
aws_local sns subscribe \
    --topic-arn $VERIFICATION_TOPIC_ARN \
    --protocol sqs \
    --notification-endpoint $VERIFICATION_QUEUE_ARN \
    --output text
echo "   ✅ Subscription created"

echo ""

# 5. Set SQS Queue Policies (allow SNS to send messages)
echo "🔒 Setting Queue Policies..."

# Triage Queue Policy
TRIAGE_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "SQS:SendMessage",
      "Resource": "$TRIAGE_QUEUE_ARN",
      "Condition": {
        "ArnEquals": {
          "aws:SourceArn": "$TRIAGE_TOPIC_ARN"
        }
      }
    }
  ]
}
EOF
)

aws_local sqs set-queue-attributes \
    --queue-url $TRIAGE_QUEUE_URL \
    --attributes Policy="$TRIAGE_POLICY"
echo "   ✅ Triage queue policy set"

# Verification Queue Policy
VERIFICATION_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "SQS:SendMessage",
      "Resource": "$VERIFICATION_QUEUE_ARN",
      "Condition": {
        "ArnEquals": {
          "aws:SourceArn": "$VERIFICATION_TOPIC_ARN"
        }
      }
    }
  ]
}
EOF
)

aws_local sqs set-queue-attributes \
    --queue-url $VERIFICATION_QUEUE_URL \
    --attributes Policy="$VERIFICATION_POLICY"
echo "   ✅ Verification queue policy set"

echo ""

# 6. Create DynamoDB Table
echo "💾 Creating DynamoDB Table..."

aws_local dynamodb create-table \
    --table-name $DYNAMODB_TABLE_NAME \
    --attribute-definitions \
        AttributeName=ticketId,AttributeType=S \
        AttributeName=timestamp,AttributeType=N \
    --key-schema \
        AttributeName=ticketId,KeyType=HASH \
        AttributeName=timestamp,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --output text

echo "   ✅ Created table: $DYNAMODB_TABLE_NAME"

# Wait for table to be active
echo "   Waiting for table to be active..."
aws_local dynamodb wait table-exists --table-name $DYNAMODB_TABLE_NAME
echo "   ✅ Table is active"

echo ""

# 7. Create IoT Core Topic and Rule
echo "📡 Creating IoT Core Resources..."

# Create IoT Thing Type (optional but good practice)
aws_local iot create-thing-type \
    --thing-type-name SupportMessageType \
    --thing-type-properties "thingTypeDescription=Customer support message source" \
    --output text 2>/dev/null || echo "   Thing type already exists"

# Create IoT Topic Rule to forward messages to SNS
IOT_RULE_PAYLOAD=$(cat <<EOF
{
  "sql": "SELECT * FROM '$IOT_TOPIC_NAME'",
  "description": "Forward support messages to SNS triage topic",
  "actions": [
    {
      "sns": {
        "targetArn": "$TRIAGE_TOPIC_ARN",
        "roleArn": "arn:aws:iam::000000000000:role/iot-sns-role",
        "messageFormat": "RAW"
      }
    }
  ],
  "ruleDisabled": false
}
EOF
)

# Write rule to file
echo "$IOT_RULE_PAYLOAD" > /tmp/iot-rule.json

# Create the rule
aws_local iot create-topic-rule \
    --rule-name $IOT_RULE_NAME \
    --topic-rule-payload file:///tmp/iot-rule.json \
    --output text 2>/dev/null || echo "   IoT rule already exists"

echo "   ✅ IoT Topic: $IOT_TOPIC_NAME"
echo "   ✅ IoT Rule: $IOT_RULE_NAME"

echo ""

# 8. Create IAM Role for Lambda (will be used in Phase 4)
echo "👤 Creating IAM Role for Lambda..."

TRUST_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
)

aws_local iam create-role \
    --role-name lambda-execution-role \
    --assume-role-policy-document "$TRUST_POLICY" \
    --output text 2>/dev/null || echo "   Role already exists"

# Attach policies
aws_local iam attach-role-policy \
    --role-name lambda-execution-role \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole \
    2>/dev/null || echo "   Policy already attached"

echo "   ✅ IAM Role created: lambda-execution-role"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✨ All AWS Resources Created Successfully!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📋 Summary:"
echo "   SNS Topics: 2"
echo "   - $TRIAGE_TOPIC_ARN"
echo "   - $VERIFICATION_TOPIC_ARN"
echo ""
echo "   SQS Queues: 2"
echo "   - $TRIAGE_QUEUE_URL"
echo "   - $VERIFICATION_QUEUE_URL"
echo ""
echo "   DynamoDB Tables: 1"
echo "   - $DYNAMODB_TABLE_NAME"
echo ""
echo "   IoT Core:"
echo "   - Topic: $IOT_TOPIC_NAME"
echo "   - Rule: $IOT_RULE_NAME"
echo ""
echo "   IAM Roles: 1"
echo "   - lambda-execution-role"
echo ""
echo "🔍 Verify with: ./scripts/verify-setup.sh"
echo ""
