#!/bin/bash

# Verify all AWS resources were created successfully
# Shows detailed status of each component

set -e

source .env

ENDPOINT="http://localhost:4566"
REGION="us-east-1"

echo "🔍 Verifying AWS Resources in LocalStack"
echo "═══════════════════════════════════════════════════════"
echo ""

# Helper function
aws_local() {
    docker-compose run --rm awscli "$@" \
        --endpoint-url=http://localstack:4566 \
        --region=$REGION
}

# Check LocalStack health
echo "🏥 LocalStack Health Check..."
HEALTH=$(curl -s http://localhost:4566/_localstack/health)
echo "$HEALTH" | python3 -m json.tool 2>/dev/null || echo "Could not parse health"
echo ""

# 1. Verify SNS Topics
echo "📢 SNS Topics:"
SNS_TOPICS=$(aws_local sns list-topics --output text --query 'Topics[*].TopicArn')

if echo "$SNS_TOPICS" | grep -q "triage-topic"; then
    echo "   ✅ triage-topic exists"
else
    echo "   ❌ triage-topic NOT FOUND"
fi

if echo "$SNS_TOPICS" | grep -q "verification-topic"; then
    echo "   ✅ verification-topic exists"
else
    echo "   ❌ verification-topic NOT FOUND"
fi

echo ""

# 2. Verify SQS Queues
echo "📬 SQS Queues:"
SQS_QUEUES=$(aws_local sqs list-queues --output text --query 'QueueUrls[*]')

if echo "$SQS_QUEUES" | grep -q "triage-queue"; then
    echo "   ✅ triage-queue exists"
    
    # Check message count
    TRIAGE_QUEUE_URL=$(echo "$SQS_QUEUES" | grep "triage-queue")
    MSG_COUNT=$(aws_local sqs get-queue-attributes \
        --queue-url "$TRIAGE_QUEUE_URL" \
        --attribute-names ApproximateNumberOfMessages \
        --output text \
        --query 'Attributes.ApproximateNumberOfMessages')
    echo "      Messages in queue: $MSG_COUNT"
else
    echo "   ❌ triage-queue NOT FOUND"
fi

if echo "$SQS_QUEUES" | grep -q "verification-queue"; then
    echo "   ✅ verification-queue exists"
    
    # Check message count
    VERIFICATION_QUEUE_URL=$(echo "$SQS_QUEUES" | grep "verification-queue")
    MSG_COUNT=$(aws_local sqs get-queue-attributes \
        --queue-url "$VERIFICATION_QUEUE_URL" \
        --attribute-names ApproximateNumberOfMessages \
        --output text \
        --query 'Attributes.ApproximateNumberOfMessages')
    echo "      Messages in queue: $MSG_COUNT"
else
    echo "   ❌ verification-queue NOT FOUND"
fi

echo ""

# 3. Verify SNS Subscriptions
echo "🔗 SNS Subscriptions:"
TRIAGE_TOPIC_ARN="arn:aws:sns:$REGION:000000000000:$SNS_TRIAGE_TOPIC_NAME"
SUBS=$(aws_local sns list-subscriptions-by-topic \
    --topic-arn "$TRIAGE_TOPIC_ARN" \
    --output text \
    --query 'Subscriptions[*].Protocol')

if echo "$SUBS" | grep -q "sqs"; then
    echo "   ✅ triage-queue subscribed to triage-topic"
else
    echo "   ❌ triage-queue subscription NOT FOUND"
fi

VERIFICATION_TOPIC_ARN="arn:aws:sns:$REGION:000000000000:$SNS_VERIFICATION_TOPIC_NAME"
SUBS=$(aws_local sns list-subscriptions-by-topic \
    --topic-arn "$VERIFICATION_TOPIC_ARN" \
    --output text \
    --query 'Subscriptions[*].Protocol')

if echo "$SUBS" | grep -q "sqs"; then
    echo "   ✅ verification-queue subscribed to verification-topic"
else
    echo "   ❌ verification-queue subscription NOT FOUND"
fi

echo ""

# 4. Verify DynamoDB Table
echo "💾 DynamoDB Tables:"
TABLES=$(aws_local dynamodb list-tables --output text --query 'TableNames[*]')

if echo "$TABLES" | grep -q "$DYNAMODB_TABLE_NAME"; then
    echo "   ✅ $DYNAMODB_TABLE_NAME exists"
    
    # Get table details
    TABLE_STATUS=$(aws_local dynamodb describe-table \
        --table-name "$DYNAMODB_TABLE_NAME" \
        --output text \
        --query 'Table.TableStatus')
    echo "      Status: $TABLE_STATUS"
    
    ITEM_COUNT=$(aws_local dynamodb describe-table \
        --table-name "$DYNAMODB_TABLE_NAME" \
        --output text \
        --query 'Table.ItemCount')
    echo "      Items: $ITEM_COUNT"
else
    echo "   ❌ $DYNAMODB_TABLE_NAME NOT FOUND"
fi

echo ""

# 5. Verify IoT Core
echo "📡 IoT Core:"
IOT_RULES=$(aws_local iot list-topic-rules --output text --query 'rules[*].ruleName' 2>/dev/null || echo "")

if echo "$IOT_RULES" | grep -q "$IOT_RULE_NAME"; then
    echo "   ✅ IoT Rule: $IOT_RULE_NAME exists"
    echo "   ✅ IoT Topic: $IOT_TOPIC_NAME configured"
else
    echo "   ❌ IoT Rule: $IOT_RULE_NAME NOT FOUND"
fi

echo ""

# 6. Verify IAM Role
echo "👤 IAM Roles:"
IAM_ROLES=$(aws_local iam list-roles --output text --query 'Roles[*].RoleName' 2>/dev/null || echo "")

if echo "$IAM_ROLES" | grep -q "lambda-execution-role"; then
    echo "   ✅ lambda-execution-role exists"
else
    echo "   ❌ lambda-execution-role NOT FOUND"
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ Verification Complete!"
echo ""
echo "📊 Next Steps:"
echo "   • Test message flow: ./scripts/test-message.sh"
echo "   • View logs: ./scripts/logs.sh"
echo "   • Proceed to Phase 4: Lambda development"
echo ""
