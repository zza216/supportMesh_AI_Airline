#!/bin/bash

# Cleanup script - Delete all AWS resources from LocalStack
# Keeps LocalStack running but removes all created resources

set -e

source .env

ENDPOINT="http://localhost:4566"
REGION="us-east-1"

echo "🗑️  Cleaning Up AWS Resources"
echo "═══════════════════════════════════════════════════════"
echo ""

read -p "⚠️  This will delete ALL resources. Continue? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo ""

# Helper function
aws_local() {
    docker-compose run --rm awscli "$@" \
        --endpoint-url=http://localstack:4566 \
        --region=$REGION 2>/dev/null || true
}

# 1. Delete IoT Rule
echo "🔌 Deleting IoT Resources..."
aws_local iot delete-topic-rule --rule-name "$IOT_RULE_NAME"
echo "   ✅ Deleted IoT Rule: $IOT_RULE_NAME"

# 2. Unsubscribe SQS from SNS
echo ""
echo "🔗 Removing SNS Subscriptions..."

# Get subscription ARNs
TRIAGE_TOPIC_ARN="arn:aws:sns:$REGION:000000000000:$SNS_TRIAGE_TOPIC_NAME"
TRIAGE_SUBS=$(aws_local sns list-subscriptions-by-topic \
    --topic-arn "$TRIAGE_TOPIC_ARN" \
    --output text \
    --query 'Subscriptions[*].SubscriptionArn')

for SUB_ARN in $TRIAGE_SUBS; do
    if [ "$SUB_ARN" != "None" ] && [ "$SUB_ARN" != "PendingConfirmation" ]; then
        aws_local sns unsubscribe --subscription-arn "$SUB_ARN"
        echo "   ✅ Unsubscribed: $SUB_ARN"
    fi
done

VERIFICATION_TOPIC_ARN="arn:aws:sns:$REGION:000000000000:$SNS_VERIFICATION_TOPIC_NAME"
VERIFICATION_SUBS=$(aws_local sns list-subscriptions-by-topic \
    --topic-arn "$VERIFICATION_TOPIC_ARN" \
    --output text \
    --query 'Subscriptions[*].SubscriptionArn')

for SUB_ARN in $VERIFICATION_SUBS; do
    if [ "$SUB_ARN" != "None" ] && [ "$SUB_ARN" != "PendingConfirmation" ]; then
        aws_local sns unsubscribe --subscription-arn "$SUB_ARN"
        echo "   ✅ Unsubscribed: $SUB_ARN"
    fi
done

# 3. Delete SQS Queues
echo ""
echo "📬 Deleting SQS Queues..."

TRIAGE_QUEUE_URL="http://localstack:4566/000000000000/$SQS_TRIAGE_QUEUE_NAME"
aws_local sqs delete-queue --queue-url "$TRIAGE_QUEUE_URL"
echo "   ✅ Deleted: $SQS_TRIAGE_QUEUE_NAME"

VERIFICATION_QUEUE_URL="http://localstack:4566/000000000000/$SQS_VERIFICATION_QUEUE_NAME"
aws_local sqs delete-queue --queue-url "$VERIFICATION_QUEUE_URL"
echo "   ✅ Deleted: $SQS_VERIFICATION_QUEUE_NAME"

# 4. Delete SNS Topics
echo ""
echo "📢 Deleting SNS Topics..."

aws_local sns delete-topic --topic-arn "$TRIAGE_TOPIC_ARN"
echo "   ✅ Deleted: $SNS_TRIAGE_TOPIC_NAME"

aws_local sns delete-topic --topic-arn "$VERIFICATION_TOPIC_ARN"
echo "   ✅ Deleted: $SNS_VERIFICATION_TOPIC_NAME"

# 5. Delete DynamoDB Table
echo ""
echo "💾 Deleting DynamoDB Table..."

aws_local dynamodb delete-table --table-name "$DYNAMODB_TABLE_NAME"
echo "   ✅ Deleted: $DYNAMODB_TABLE_NAME"

# 6. Delete IAM Role
echo ""
echo "👤 Deleting IAM Role..."

# Detach policies first
aws_local iam detach-role-policy \
    --role-name lambda-execution-role \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

aws_local iam delete-role --role-name lambda-execution-role
echo "   ✅ Deleted: lambda-execution-role"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✨ Cleanup Complete!"
echo ""
echo "All AWS resources have been deleted."
echo "LocalStack is still running."
echo ""
echo "To recreate resources:"
echo "   ./scripts/create-resources.sh"
echo ""
echo "To stop LocalStack:"
echo "   docker-compose down"
echo ""
