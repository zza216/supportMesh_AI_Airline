#!/bin/bash

set -e

echo "Deploying SupportMesh Lambda functions..."

AWS_ENDPOINT="http://localhost:4566"
AWS_REGION="us-east-1"
ACCOUNT_ID="000000000000"

TICKETS_TABLE="SupportMeshTickets"
VERIFICATION_TOPIC_ARN="arn:aws:sns:${AWS_REGION}:${ACCOUNT_ID}:verification-topic"
LOCALSTACK_ENDPOINT="http://host.docker.internal:4566"

GCP_TRIAGE_URL="https://supportmesh-triage-70006858305.us-central1.run.app"

export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=$AWS_REGION

mkdir -p lambda-functions/packages

echo "Packaging TriageNode..."
cd lambda-functions/triage
zip -r ../packages/triage.zip handler.py
cd ../..

echo "Packaging VerificationNode..."
cd lambda-functions/verification
zip -r ../packages/verification.zip handler.py
cd ../..

echo "Deleting old Lambda functions if they exist..."

aws --endpoint-url=$AWS_ENDPOINT lambda delete-function \
  --function-name TriageNode 2>/dev/null || true

aws --endpoint-url=$AWS_ENDPOINT lambda delete-function \
  --function-name VerificationNode 2>/dev/null || true

echo "Creating TriageNode with 90s timeout..."

aws --endpoint-url=$AWS_ENDPOINT lambda create-function \
  --function-name TriageNode \
  --runtime python3.9 \
  --role arn:aws:iam::000000000000:role/lambda-role \
  --handler handler.lambda_handler \
  --zip-file fileb://lambda-functions/packages/triage.zip \
  --timeout 90 \
  --memory-size 256 \
  --environment "Variables={AWS_REGION=${AWS_REGION},LOCALSTACK_ENDPOINT=${LOCALSTACK_ENDPOINT},TICKETS_TABLE=${TICKETS_TABLE},VERIFICATION_TOPIC_ARN=${VERIFICATION_TOPIC_ARN},GCP_TRIAGE_URL=${GCP_TRIAGE_URL},MAX_POLL_ATTEMPTS=12,POLL_INTERVAL_SECONDS=5}"

echo "Creating VerificationNode with 90s timeout..."

aws --endpoint-url=$AWS_ENDPOINT lambda create-function \
  --function-name VerificationNode \
  --runtime python3.9 \
  --role arn:aws:iam::000000000000:role/lambda-role \
  --handler handler.lambda_handler \
  --zip-file fileb://lambda-functions/packages/verification.zip \
  --timeout 90 \
  --memory-size 256 \
  --environment "Variables={AWS_REGION=${AWS_REGION},LOCALSTACK_ENDPOINT=${LOCALSTACK_ENDPOINT},TICKETS_TABLE=${TICKETS_TABLE}}"

echo "Getting SQS queue ARNs..."

TRIAGE_QUEUE_URL=$(aws --endpoint-url=$AWS_ENDPOINT sqs get-queue-url \
  --queue-name triage-queue \
  --query 'QueueUrl' \
  --output text)

VERIFICATION_QUEUE_URL=$(aws --endpoint-url=$AWS_ENDPOINT sqs get-queue-url \
  --queue-name verification-queue \
  --query 'QueueUrl' \
  --output text)

TRIAGE_QUEUE_ARN=$(aws --endpoint-url=$AWS_ENDPOINT sqs get-queue-attributes \
  --queue-url "$TRIAGE_QUEUE_URL" \
  --attribute-names QueueArn \
  --query 'Attributes.QueueArn' \
  --output text)

VERIFICATION_QUEUE_ARN=$(aws --endpoint-url=$AWS_ENDPOINT sqs get-queue-attributes \
  --queue-url "$VERIFICATION_QUEUE_URL" \
  --attribute-names QueueArn \
  --query 'Attributes.QueueArn' \
  --output text)

echo "Creating Lambda event source mappings..."

aws --endpoint-url=$AWS_ENDPOINT lambda create-event-source-mapping \
  --function-name TriageNode \
  --event-source-arn "$TRIAGE_QUEUE_ARN" \
  --batch-size 1

aws --endpoint-url=$AWS_ENDPOINT lambda create-event-source-mapping \
  --function-name VerificationNode \
  --event-source-arn "$VERIFICATION_QUEUE_ARN" \
  --batch-size 1

echo "Lambda deployment complete."
echo "TriageNode timeout: 90 seconds"
echo "GCP_TRIAGE_URL: $GCP_TRIAGE_URL"
