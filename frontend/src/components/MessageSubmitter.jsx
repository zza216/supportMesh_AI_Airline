import { useState } from 'react';

function MessageSubmitter({ onSubmit }) {
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('customer@example.com');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!message.trim() || !email.trim()) {
      return;
    }

    setSubmitting(true);
    setResult(null);

    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, email }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({ type: 'success', message: 'Message submitted successfully!' });
        setMessage('');
        if (onSubmit) onSubmit();
      } else {
        setResult({ type: 'error', message: data.error || 'Failed to submit message' });
      }
    } catch (error) {
      setResult({ type: 'error', message: 'Network error. Is the backend running?' });
    } finally {
      setSubmitting(false);
    }
  };

  const loadSample = (type) => {
    const samples = {
      refund: "My flight was cancelled last week and I still haven't received my refund. This is unacceptable! I need my money back immediately.",
      delay: "My flight was delayed by 5 hours and I missed an important meeting. What compensation am I entitled to?",
      baggage: "My luggage was lost during my trip from NYC to LAX. It's been 3 days and I haven't heard anything. Please help!",
      general: "I'd like to know about your pet travel policy for international flights."
    };
    setMessage(samples[type]);
  };

  return (
    <div style={{
      background: 'white',
      borderRadius: '8px',
      padding: '1.5rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
        Test Message Submission
      </h2>
      <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1.5rem' }}>
        Submit a customer support message to test the pipeline
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
            Customer Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="customer@example.com"
            required
            style={{
              width: '100%',
              padding: '0.625rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.875rem'
            }}
          />
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
            Support Message
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter customer support message..."
            rows={6}
            required
            style={{
              width: '100%',
              padding: '0.625rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.875rem',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
          />
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>
            Quick samples:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <button type="button" onClick={() => loadSample('refund')} style={{
              padding: '0.375rem 0.75rem',
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '0.75rem',
              cursor: 'pointer'
            }}>
              Refund Request
            </button>
            <button type="button" onClick={() => loadSample('delay')} style={{
              padding: '0.375rem 0.75rem',
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '0.75rem',
              cursor: 'pointer'
            }}>
              Flight Delay
            </button>
            <button type="button" onClick={() => loadSample('baggage')} style={{
              padding: '0.375rem 0.75rem',
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '0.75rem',
              cursor: 'pointer'
            }}>
              Baggage Issue
            </button>
            <button type="button" onClick={() => loadSample('general')} style={{
              padding: '0.375rem 0.75rem',
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '0.75rem',
              cursor: 'pointer'
            }}>
              General Inquiry
            </button>
          </div>
        </div>

        <button type="submit" disabled={submitting} style={{
          width: '100%',
          padding: '0.75rem',
          background: submitting ? '#93c5fd' : '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '0.875rem',
          fontWeight: '500',
          cursor: submitting ? 'not-allowed' : 'pointer'
        }}>
          {submitting ? 'Submitting...' : 'Submit Message'}
        </button>

        {result && (
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem',
            borderRadius: '6px',
            fontSize: '0.875rem',
            background: result.type === 'success' ? '#d1fae5' : '#fee2e2',
            color: result.type === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${result.type === 'success' ? '#10b981' : '#ef4444'}`
          }}>
            {result.message}
          </div>
        )}
      </form>
    </div>
  );
}

export default MessageSubmitter;
