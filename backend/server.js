const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const AWS = require('aws-sdk');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Configure AWS SDK for LocalStack
const awsConfig = {
  endpoint: 'http://localstack:4566',
  region: 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
  s3ForcePathStyle: true
};

console.log('AWS Configuration:', {
  endpoint: awsConfig.endpoint,
  region: awsConfig.region
});

const sns = new AWS.SNS(awsConfig);
const dynamodb = new AWS.DynamoDB.DocumentClient(awsConfig);
const sqs = new AWS.SQS(awsConfig);

// FIXED: Correct table name to match Lambda
const TABLE_NAME = 'SupportMeshTickets';

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'supportmesh-backend' });
});

// Submit new support message
// app.post('/api/submit', async (req, res) => {
//   try {
//     const { message, email } = req.body;
//     const ticketId = `TKT-${Date.now()}`;

//       Message: JSON.stringify({
//       ticket_id: ticketId,
//       ticketId: ticketId,
//       message,
//       email,
//       submittedAt: new Date().toISOString()
//     })

//     if (!message || !email) {
//       return res.status(400).json({ error: 'Message and email are required' });
//     }

//     const payload = {
//       message,
//       email,
//       submittedAt: new Date().toISOString()
//     };

//     // Publish to triage topic
//     const params = {
//       TopicArn: 'arn:aws:sns:us-east-1:000000000000:triage-topic',
//       Message: JSON.stringify(payload),
//       Subject: 'New Support Request'
//     };

//     const result = await sns.publish(params).promise();

//     console.log(`Message published to SNS: ${result.MessageId}`);

//     res.json({
//       success: true,
//       messageId: result.MessageId,
//       message: 'Support request submitted successfully'
//     });

//   } catch (error) {
//     console.error('Error submitting message:', error);
//     res.status(500).json({ error: error.message });
//   }
// });
app.post('/api/submit', async (req, res) => {
  try {
    const { message, email } = req.body;

    if (!message || !email) {
      return res.status(400).json({ error: 'Message and email are required' });
    }

    // Create ticketId in backend so frontend and Lambda use the same ID
    const ticketId = `TKT-${Date.now()}`;

    const payload = {
      ticket_id: ticketId,
      ticketId: ticketId,
      message,
      email,
      submittedAt: new Date().toISOString()
    };

    const params = {
      TopicArn: 'arn:aws:sns:us-east-1:000000000000:triage-topic',
      Message: JSON.stringify(payload),
      Subject: 'New Support Request'
    };

    const result = await sns.publish(params).promise();

    console.log(`Message published to SNS: ${result.MessageId}`);
    console.log(`Ticket created: ${ticketId}`);

    res.json({
      success: true,
      ticketId: ticketId,
      messageId: result.MessageId,
      message: 'Support request submitted successfully'
    });

  } catch (error) {
    console.error('Error submitting message:', error);
    res.status(500).json({ error: error.message });
  }
});


// Get all tickets
app.get('/api/tickets', async (req, res) => {
  try {
    console.log(`Fetching tickets from table: ${TABLE_NAME}`);
    
    const params = {
      TableName: TABLE_NAME
    };

    const result = await dynamodb.scan(params).promise();
    
    console.log(`Found ${result.Items.length} tickets in DynamoDB`);
    
    // FIXED: Sort by createdAt (not timestamp which doesn't exist)
    const tickets = result.Items.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateB - dateA; // Newest first
    });

    // Log first ticket to verify GCP fields
    if (tickets.length > 0) {
      console.log('Sample ticket fields:', Object.keys(tickets[0]));
      console.log('Sample confidence:', tickets[0].confidence);
      console.log('Sample intent:', tickets[0].intent);
    }

    res.json({ tickets });

  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ 
      error: error.message,
      tickets: [] // Return empty array on error
    });
  }
});

// Get single ticket by ID
app.get('/api/tickets/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;
    
    console.log(`Fetching ticket: ${ticketId}`);

    // FIXED: Use get instead of query (simple primary key)
    const params = {
      TableName: TABLE_NAME,
      Key: {
        ticketId: ticketId
      }
    };

    const result = await dynamodb.get(params).promise();

    if (!result.Item) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json({ ticket: result.Item });

  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ error: error.message });
  }
});

// Approve or reject ticket (HITL action)
app.patch('/api/tickets/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { action, approver, editedResponse } = req.body;

    console.log(`Updating ticket ${ticketId}: action=${action}`);

    if (!['approve', 'reject', 'edit'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    // FIXED: Simple key structure (no timestamp)
    const updateParams = {
      TableName: TABLE_NAME,
      Key: {
        ticketId: ticketId
      },
      UpdateExpression: 'SET #status = :status, humanDecision = :decision, approvedBy = :approver, approvedAt = :approvedAt, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'edited',
        ':decision': action,
        ':approver': approver || 'System',
        ':approvedAt': new Date().toISOString(),
        ':updatedAt': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    };

    // If response was edited, update it
    if (editedResponse) {
      updateParams.UpdateExpression += ', draftResponse = :editedResponse';
      updateParams.ExpressionAttributeValues[':editedResponse'] = editedResponse;
    }

    const result = await dynamodb.update(updateParams).promise();

    console.log(`Ticket ${ticketId} ${action}ed by ${approver}`);

    res.json({
      success: true,
      ticket: result.Attributes
    });

  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get queue statistics
app.get('/api/stats', async (req, res) => {
  try {
    // Get queue attributes
    const triageQueueParams = {
      QueueUrl: 'http://localstack:4566/000000000000/triage-queue',
      AttributeNames: ['ApproximateNumberOfMessages', 'ApproximateNumberOfMessagesNotVisible']
    };

    const verificationQueueParams = {
      QueueUrl: 'http://localstack:4566/000000000000/verification-queue',
      AttributeNames: ['ApproximateNumberOfMessages', 'ApproximateNumberOfMessagesNotVisible']
    };

    const [triageQueue, verificationQueue] = await Promise.all([
      sqs.getQueueAttributes(triageQueueParams).promise().catch(() => ({ Attributes: { ApproximateNumberOfMessages: '0' } })),
      sqs.getQueueAttributes(verificationQueueParams).promise().catch(() => ({ Attributes: { ApproximateNumberOfMessages: '0' } }))
    ]);

    // Get ticket counts from DynamoDB
    const scanParams = {
      TableName: TABLE_NAME
    };

    const tickets = await dynamodb.scan(scanParams).promise();

    const stats = {
      queues: {
        triage: parseInt(triageQueue.Attributes.ApproximateNumberOfMessages) || 0,
        triageInFlight: parseInt(triageQueue.Attributes.ApproximateNumberOfMessagesNotVisible) || 0,
        verification: parseInt(verificationQueue.Attributes.ApproximateNumberOfMessages) || 0,
        verificationInFlight: parseInt(verificationQueue.Attributes.ApproximateNumberOfMessagesNotVisible) || 0
      },
      tickets: {
        total: tickets.Items.length,
        pending: tickets.Items.filter(t => t.status === 'pending_verification').length,
        approved: tickets.Items.filter(t => t.status === 'approved').length,
        rejected: tickets.Items.filter(t => t.status === 'rejected').length,
        highPriority: tickets.Items.filter(t => t.priority === 'HIGH').length,
        mediumPriority: tickets.Items.filter(t => t.priority === 'MEDIUM').length,
        lowPriority: tickets.Items.filter(t => t.priority === 'LOW').length,
        highConfidence: tickets.Items.filter(t => parseFloat(t.confidence) > 0.8).length,
        lowConfidence: tickets.Items.filter(t => parseFloat(t.confidence) <= 0.8 && parseFloat(t.confidence) > 0).length,
        fallback: tickets.Items.filter(t => parseFloat(t.confidence) === 0).length
      }
    };

    res.json(stats);

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ 
      error: error.message,
      queues: { triage: 0, verification: 0 },
      tickets: { total: 0 }
    });
  }
});

// Get logs (simplified - shows recent ticket activity)
app.get('/api/logs', async (req, res) => {
  try {
    const params = {
      TableName: TABLE_NAME,
      Limit: 50
    };

    const result = await dynamodb.scan(params).promise();
    const logs = result.Items
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 20)
      .map(ticket => ({
        timestamp: ticket.createdAt,
        ticketId: ticket.ticketId,
        event: `${ticket.status} - ${ticket.intent} (confidence: ${ticket.confidence})`,
        message: (ticket.message || '').substring(0, 100),
        priority: ticket.priority,
        confidence: ticket.confidence
      }));

    res.json({ logs });

  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ 
      error: error.message,
      logs: []
    });
  }
});

// Debug endpoint - check table and data
app.get('/api/debug', async (req, res) => {
  try {
    const params = {
      TableName: TABLE_NAME
    };

    const result = await dynamodb.scan(params).promise();
    
    const debug = {
      tableName: TABLE_NAME,
      itemCount: result.Items.length,
      sampleTicket: result.Items[0] || null,
      allTicketIds: result.Items.map(t => t.ticketId),
      gcpIntegrationWorking: result.Items.some(t => parseFloat(t.confidence) > 0)
    };

    res.json(debug);

  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({ 
      error: error.message,
      tableName: TABLE_NAME
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════╗
║   SupportMesh Backend API Server      ║
╠════════════════════════════════════════╣
║  Port: ${PORT}                         ║
║  DynamoDB Table: ${TABLE_NAME}         ║
║  LocalStack: http://localstack:4566   ║
╚════════════════════════════════════════╝
  `);
});

