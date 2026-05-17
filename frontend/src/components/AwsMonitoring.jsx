import { useEffect, useState } from 'react';

export default function AwsMonitoring() {
  const [data, setData] = useState(null);

  const fetchMonitoring = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/monitoring/aws');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setData({ error: err.message });
    }
  };

  useEffect(() => {
    fetchMonitoring();
    const interval = setInterval(fetchMonitoring, 3000);
    return () => clearInterval(interval);
  }, []);

  if (!data) return <p>Loading AWS monitoring...</p>;
  if (data.error) return <p style={{ color: 'red' }}>{data.error}</p>;

  return (
    <div style={{ padding: '20px' }}>
      <h2>AWS Mesh Monitoring Dashboard</h2>
      <p>Last updated: {data.timestamp}</p>

      <div style={gridStyle}>
        <div style={cardStyle}>
          <h3>SNS Topics</h3>
          {data.sns.topics.map((topic) => (
            <p key={topic}>{topic.split(':').pop()}</p>
          ))}
        </div>

        <div style={cardStyle}>
          <h3>Triage Queue</h3>
          <p>Visible Messages: {data.sqs.triageQueue.ApproximateNumberOfMessages}</p>
          <p>In Processing: {data.sqs.triageQueue.ApproximateNumberOfMessagesNotVisible}</p>
          <p>Delayed: {data.sqs.triageQueue.ApproximateNumberOfMessagesDelayed}</p>
        </div>

        <div style={cardStyle}>
          <h3>Verification Queue</h3>
          <p>Visible Messages: {data.sqs.verificationQueue.ApproximateNumberOfMessages}</p>
          <p>In Processing: {data.sqs.verificationQueue.ApproximateNumberOfMessagesNotVisible}</p>
          <p>Delayed: {data.sqs.verificationQueue.ApproximateNumberOfMessagesDelayed}</p>
        </div>

        <div style={cardStyle}>
          <h3>Lambda Nodes</h3>
          {data.lambda.functions.map((fn) => (
            <div key={fn.name}>
              <b>{fn.name}</b>
              <p>Runtime: {fn.runtime}</p>
              <p>Handler: {fn.handler}</p>
            </div>
          ))}
        </div>

        <div style={cardStyle}>
          <h3>DynamoDB</h3>
          <p>Table: {data.dynamodb.table}</p>
          <p>Total Tickets: {data.dynamodb.totalTickets}</p>
        </div>
      </div>
    </div>
  );
}

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '16px'
};

const cardStyle = {
  border: '1px solid #ddd',
  borderRadius: '10px',
  padding: '16px',
  background: '#f9f9f9'
};
