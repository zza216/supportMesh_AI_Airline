import json
import boto3
import uuid
import urllib.request
import urllib.error
import os
import time
from datetime import datetime


# ============================================================
# CONFIGURATION
# ============================================================

AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")

# LocalStack endpoint used by Lambda container.
# For Docker-based Lambda execution on Mac, host.docker.internal is safer than localhost.
LOCALSTACK_ENDPOINT = os.environ.get(
    "LOCALSTACK_ENDPOINT",
    "http://host.docker.internal:4566"
)

TICKETS_TABLE = os.environ.get(
    "TICKETS_TABLE",
    "supportmesh-tickets"
)

VERIFICATION_TOPIC_ARN = os.environ.get(
    "VERIFICATION_TOPIC_ARN",
    "arn:aws:sns:us-east-1:000000000000:verification-topic"
)

# NEW: Auto-response topic for high confidence tickets
AUTO_RESPONSE_TOPIC_ARN = os.environ.get(
    "AUTO_RESPONSE_TOPIC_ARN",
    "arn:aws:sns:us-east-1:000000000000:auto-response-topic"
)

# New GCP distributed async pipeline base URL
GCP_TRIAGE_URL = os.environ.get(
    "GCP_TRIAGE_URL",
    "https://supportmesh-triage-70006858305.us-central1.run.app"
)

# Polling config
MAX_POLL_ATTEMPTS = int(os.environ.get("MAX_POLL_ATTEMPTS", "12"))
POLL_INTERVAL_SECONDS = int(os.environ.get("POLL_INTERVAL_SECONDS", "5"))

# NEW: Auto-response threshold (95% confidence)
AUTO_RESPONSE_THRESHOLD = float(os.environ.get("AUTO_RESPONSE_THRESHOLD", "0.95"))


# ============================================================
# AWS CLIENTS
# ============================================================

dynamodb = boto3.resource(
    "dynamodb",
    region_name=AWS_REGION,
    endpoint_url=LOCALSTACK_ENDPOINT,
    aws_access_key_id="test",
    aws_secret_access_key="test"
)

sns = boto3.client(
    "sns",
    region_name=AWS_REGION,
    endpoint_url=LOCALSTACK_ENDPOINT,
    aws_access_key_id="test",
    aws_secret_access_key="test"
)

table = dynamodb.Table(TICKETS_TABLE)


# ============================================================
# LOCAL FALLBACK CLASSIFICATION
# Used only if GCP is unavailable or returns an error.
# ============================================================

def local_fallback_classification(message, ticket_id):
    message_lower = message.lower()

    if "refund" in message_lower:
        intent = "refund_request"
        sentiment = "frustrated"
        priority = "HIGH"
    elif "delay" in message_lower or "delayed" in message_lower:
        intent = "flight_delay"
        sentiment = "frustrated"
        priority = "HIGH"
    elif "baggage" in message_lower or "luggage" in message_lower:
        intent = "baggage_issue"
        sentiment = "concerned"
        priority = "MEDIUM"
    elif "cancel" in message_lower or "cancellation" in message_lower:
        intent = "cancellation_request"
        sentiment = "neutral"
        priority = "MEDIUM"
    else:
        intent = "general_inquiry"
        sentiment = "neutral"
        priority = "LOW"

    return {
        "ticket_id": ticket_id,
        "intent": intent,
        "sentiment": sentiment,
        "priority": priority,
        "confidence": 0.0,
        "reasoning": "Fallback classification was used because the GCP AI pipeline was unavailable.",
        "retrieved_docs": [],
        "draft_response": "Thank you for contacting support. We have received your message and will route it to the appropriate team.",
        "status": "fallback",
        "gcpStatus": "fallback"
    }


# ============================================================
# HTTP HELPERS
# ============================================================

def post_json(url, payload, timeout=15):
    data = json.dumps(payload).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    with urllib.request.urlopen(req, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def get_json(url, timeout=15):
    req = urllib.request.Request(
        url,
        headers={"Content-Type": "application/json"},
        method="GET"
    )

    with urllib.request.urlopen(req, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


# ============================================================
# GCP ASYNC PIPELINE CALL
# ============================================================

def classify_with_gcp_async(message, ticket_id):
 

    classify_url = f"{GCP_TRIAGE_URL}/classify"
    result_url = f"{GCP_TRIAGE_URL}/result/{ticket_id}"

    initial_payload = {
        "message": message,
        "ticket_id": ticket_id
    }

    try:
        print("========== SENDING TO GCP TRIAGE NODE ==========")
        print(json.dumps(initial_payload, indent=2))
        print("POST URL:", classify_url)

        # Call 1: Submit to GCP triage node
        initial_result = post_json(
            classify_url,
            initial_payload,
            timeout=20
        )

        print("========== INITIAL GCP RESPONSE ==========")
        print(json.dumps(initial_result, indent=2))

        # Keep initial classification as backup in case GCP remains processing.
        partial_result = {
            "ticket_id": ticket_id,
            "intent": initial_result.get("intent", "general_inquiry"),
            "sentiment": initial_result.get("sentiment", "neutral"),
            "priority": initial_result.get("priority", "LOW"),
            "confidence": initial_result.get("confidence", 0.0),
            "reasoning": initial_result.get(
                "reasoning",
                "Initial GCP triage classification completed, but final result is still processing."
            ),
            "retrieved_docs": initial_result.get("retrieved_docs", []),
            "draft_response": initial_result.get(
                "draft_response",
                "Your request is still being processed by the AI support pipeline."
            ),
            "status": initial_result.get("status", "processing"),
            "gcpStatus": "timeout"
        }

        # Call 2: Poll GCP result endpoint
        for attempt in range(1, MAX_POLL_ATTEMPTS + 1):
            print(
                f"Polling GCP result attempt {attempt}/{MAX_POLL_ATTEMPTS}: {result_url}"
            )

            time.sleep(POLL_INTERVAL_SECONDS)

            poll_result = get_json(
                result_url,
                timeout=20
            )

            print("========== GCP POLL RESPONSE ==========")
            print(json.dumps(poll_result, indent=2))

            if poll_result.get("status") == "complete":
                print("GCP processing complete.")

                return {
                    "ticket_id": poll_result.get("ticket_id", ticket_id),
                    "intent": poll_result.get("intent", partial_result["intent"]),
                    "sentiment": poll_result.get("sentiment", partial_result["sentiment"]),
                    "priority": poll_result.get("priority", partial_result["priority"]),
                    "confidence": poll_result.get("confidence", partial_result["confidence"]),
                    "reasoning": poll_result.get("reasoning", partial_result["reasoning"]),
                    "retrieved_docs": poll_result.get("retrieved_docs", []),
                    "draft_response": poll_result.get(
                        "draft_response",
                        partial_result["draft_response"]
                    ),
                    "status": "complete",
                    "gcpStatus": "complete"
                }

        # If loop finishes, GCP never returned complete within 60 seconds.
        print("GCP polling timed out. Returning partial classification.")

        partial_result["reasoning"] = (
            partial_result.get("reasoning", "")
            + " Final GCP Knowledge/Resolution result did not complete within 60 seconds."
        )

        return partial_result

    except Exception as e:
        print("========== GCP ERROR - USING FALLBACK ==========")
        print(str(e))

        return local_fallback_classification(
            message,
            ticket_id
        )


# ============================================================
# NEW: AUTO-RESPONSE SENDER
# ============================================================

def send_auto_response(ticket_data):

    try:
        response_payload = {
            'ticketId': ticket_data['ticketId'],
            'customerEmail': ticket_data['email'],
            'draftResponse': ticket_data['draftResponse'],
            'confidence': ticket_data['confidence'],
            'intent': ticket_data['intent'],
            'priority': ticket_data['priority'],
            'autoSent': True,
            'sentAt': datetime.utcnow().isoformat()
        }
        
        print("========== SENDING AUTO-RESPONSE ==========")
        print(f"Ticket: {ticket_data['ticketId']}")
        print(f"Confidence: {ticket_data['confidence']}")
        print(f"Email: {ticket_data['email']}")
        
        sns.publish(
            TopicArn=AUTO_RESPONSE_TOPIC_ARN,
            Subject=f"Auto-Response: {ticket_data['intent']}",
            Message=json.dumps(response_payload)
        )
        
        print("✅ Auto-response published successfully")
        return True
        
    except Exception as e:
        print(f"❌ Failed to send auto-response: {str(e)}")
        return False


# ============================================================
# LAMBDA HANDLER
# ============================================================

def lambda_handler(event, context):
    print("Received event:", json.dumps(event))

    for record in event.get("Records", []):
        try:
            body = json.loads(record["body"])

            # Message is SNS-wrapped inside SQS.
            sns_message = json.loads(body["Message"])

            customer_message = sns_message.get("message", "")
            customer_email = sns_message.get("email", "unknown@example.com")

            # ticket_id = f"TKT-{str(uuid.uuid4())[:8].upper()}"
            ticket_id = (
                sns_message.get("ticket_id")
                or sns_message.get("ticketId")
                or f"TKT-{str(uuid.uuid4())[:8].upper()}"
            )
            
            print("========== NEW CUSTOMER MESSAGE ==========")
            print("Ticket ID:", ticket_id)
            print("Email:", customer_email)
            print("Message:", customer_message)

            # Call GCP async distributed pipeline.
            ai_result = classify_with_gcp_async(
                customer_message,
                ticket_id
            )

            print("========== FINAL AI RESULT USED BY AWS ==========")
            print(json.dumps(ai_result, indent=2))

            # Convert confidence to float for comparison
            confidence_value = float(ai_result.get("confidence", 0.0))
            
            # NEW: Determine status based on confidence
            if confidence_value > AUTO_RESPONSE_THRESHOLD:
                status = "AUTO_APPROVED"
                auto_responded = True
                print(f"\n✅ HIGH CONFIDENCE ({confidence_value:.2f}) - AUTO-APPROVAL")
            else:
                status = "NEEDS_HUMAN_REVIEW"
                auto_responded = False
                print(f"\n⚠️ CONFIDENCE ({confidence_value:.2f}) < {AUTO_RESPONSE_THRESHOLD} - HUMAN REVIEW REQUIRED")

            #Create timestamp ONCE and reuse it throughout
            now_iso = datetime.utcnow().isoformat()
            now_ts = int(datetime.utcnow().timestamp())

            # Keep existing DynamoDB schema, add new fields
            ticket_data = {
                "ticketId": ticket_id,
                "timestamp": now_ts,  

                "message": customer_message,
                "originalMessage": customer_message,

                "email": customer_email,
                "customerEmail": customer_email,

                "intent": ai_result.get("intent", "general_inquiry"),
                "sentiment": ai_result.get("sentiment", "neutral"),
                "priority": ai_result.get("priority", "LOW"),
                "confidence": str(ai_result.get("confidence", 0.0)),

                "reasoning": ai_result.get("reasoning", ""),
                "ragDocuments": ai_result.get("retrieved_docs", []),
                "draftResponse": ai_result.get("draft_response", ""),

                "gcpStatus": ai_result.get("gcpStatus", "fallback"),

                # NEW: Status based on confidence
                "status": status,
                
                # NEW: Auto-response flag
                "autoResponded": auto_responded,

                "createdAt": now_iso,
                "updatedAt": now_iso
            }

            # Store ticket in DynamoDB
            table.put_item(Item=ticket_data)
            print(f"Stored ticket {ticket_id} in DynamoDB with status: {status}")

            # NEW: Route based on confidence
            if auto_responded:
                # HIGH CONFIDENCE: Send auto-response
                auto_response_sent = send_auto_response(ticket_data)
                
                if auto_response_sent:

                    table.update_item(
                        Key={
                            'ticketId': ticket_id,
                            'timestamp': now_ts  
                        },
                        UpdateExpression='SET responseSentAt = :sentAt, updatedAt = :updated',
                        ExpressionAttributeValues={
                            ':sentAt': now_iso,
                            ':updated': datetime.utcnow().isoformat()
                        }
                    )
                    print(f"✅ Auto-response sent for ticket {ticket_id}")
                else:
                    print(f"⚠️ Auto-response failed for ticket {ticket_id}")
                    
            else:
                # LOW CONFIDENCE: Send to verification queue for human review
                print(f"📋 Sending ticket {ticket_id} to verification queue...")
                sns.publish(
                    TopicArn=VERIFICATION_TOPIC_ARN,
                    Subject=f"Verification Required - {ticket_data['priority']} Priority",
                    Message=json.dumps(ticket_data)
                )
                print(f"✅ Published ticket {ticket_id} to verification topic")

            print(f"\n{'='*60}")
            print(f"Ticket {ticket_id} processing complete")
            print(f"Intent: {ai_result.get('intent')}")
            print(f"Priority: {ai_result.get('priority')}")
            print(f"Confidence: {confidence_value:.2f}")
            print(f"Status: {status}")
            print(f"Auto-Response: {'YES ✅' if auto_responded else 'NO - Human review needed'}")
            print(f"{'='*60}\n")

        except Exception as e:
            print("ERROR processing SQS record:", str(e))
            raise e

    return {
        "statusCode": 200,
        "body": json.dumps({
            "message": "Triage processing complete"
        })
    }