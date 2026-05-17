import { useState } from 'react';

function CustomerPortal() {
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [result, setResult] = useState(null);
  const [response, setResponse] = useState(null);
  const [ticketId, setTicketId] = useState(null);

  const customerData = {
    name: 'Sarah Johnson',
    bookingRef: 'ABC123XYZ',
    flight: 'AA 1234',
    route: 'New York (JFK) → Los Angeles (LAX)',
    date: 'May 15, 2026',
    seat: '12A',
    class: 'Economy'
  };

  const formatConfidence = (value) => {
    const confidence = parseFloat(value);

    if (Number.isNaN(confidence)) {
      return 'N/A';
    }

    if (confidence <= 1) {
      return `${Math.round(confidence * 100)}%`;
    }

    return `${Math.round(confidence)}%`;
  };

  const checkForAutoResponse = async (submittedTicketId) => {
    console.log(`Checking for auto-response for ticket: ${submittedTicketId}`);

    try {
      const res = await fetch(`/api/tickets/${submittedTicketId}`);
      const data = await res.json();

      if (res.ok && data.ticket) {
        const ticket = data.ticket;
        console.log('Ticket data:', ticket);

        const confidence = parseFloat(ticket.confidence);
        const isHighConfidence = confidence >= 0.95 || confidence >= 95;
        const hasDraftResponse = Boolean(ticket.draftResponse);

        if (isHighConfidence && hasDraftResponse) {
          console.log('✅ High-confidence auto-response found!');

          return {
            received: true,
            response: ticket.draftResponse,
            confidence: ticket.confidence,
            intent: ticket.intent
          };
        }
      }

      return { received: false };
    } catch (error) {
      console.error('Error checking for response:', error);
      return { received: false };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!message.trim() || !email.trim()) {
      return;
    }

    setSubmitting(true);
    setResult(null);
    setResponse(null);
    setTicketId(null);

    try {
      const submitResponse = await fetch('/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message, email })
      });

      const submitData = await submitResponse.json();

      if (!submitResponse.ok) {
        setResult({
          type: 'error',
          message: submitData.error || 'Failed to submit message. Please try again.'
        });
        setSubmitting(false);
        return;
      }

      const submittedTicketId = submitData.ticketId || submitData.messageId;
      setTicketId(submittedTicketId);

      setResult({
        type: 'success',
        message: 'Message submitted! Checking for instant response...',
        ticketId: submittedTicketId
      });

      setSubmitting(false);
      setWaiting(true);

      console.log('Waiting for auto-response...');

      let autoResponseReceived = false;

      for (let attempt = 1; attempt <= 20; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 2000));

        console.log(`Polling attempt ${attempt}/20...`);

        const checkResult = await checkForAutoResponse(submittedTicketId);

        if (checkResult.received) {
          console.log('Auto-response received!');

          setResponse({
            text: checkResult.response,
            confidence: checkResult.confidence,
            intent: checkResult.intent,
            auto: true
          });

          autoResponseReceived = true;
          break;
        }
      }

      setWaiting(false);

      if (!autoResponseReceived) {
        console.log('No auto-response - human review required');

        setResponse({
          text: null,
          auto: false,
          humanReview: true
        });
      }

      setMessage('');
    } catch (error) {
      console.error('Submit error:', error);

      setResult({
        type: 'error',
        message: 'Network error. Please check your connection and try again.'
      });

      setSubmitting(false);
      setWaiting(false);
    }
  };

  const loadSample = (type) => {
    const samples = {
      refund:
        "My flight was cancelled last week and I still haven't received my refund. This is unacceptable! I need my money back immediately.",
      delay:
        'My flight was delayed by 5 hours and I missed an important meeting. What compensation am I entitled to?',
      baggage:
        "My luggage was lost during my trip from NYC to LAX. It's been 3 days and I haven't heard anything. Please help!",
      seat:
        'I booked a window seat but was given a middle seat. I have a medical condition that requires access to the window. Can this be fixed?'
    };

    setMessage(samples[type]);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '900px',
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '2rem',
            textAlign: 'center',
            color: 'white'
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              background: 'white',
              borderRadius: '50%',
              margin: '0 auto 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}
          >
            <img
              src="/nyusky-logo.png"
              alt="NYUsky Logo"
              style={{
                width: '60px',
                height: '60px',
                objectFit: 'contain'
              }}
            />
          </div>

          <h1
            style={{
              fontSize: '2rem',
              fontWeight: '600',
              margin: '0 0 0.5rem',
              letterSpacing: '0.5px'
            }}
          >
            NYUSky Airways
          </h1>

          <p
            style={{
              fontSize: '1rem',
              opacity: 0.95,
              margin: 0
            }}
          >
            Customer Support
          </p>
        </div>

        <div style={{ padding: '2rem' }}>
          {response && response.auto === true && (
            <div
              style={{
                background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
                border: '2px solid #10b981',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '2rem',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '1rem'
                }}
              >
                <span style={{ fontSize: '2rem' }}>✅</span>

                <div>
                  <h3
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: '600',
                      margin: 0,
                      color: '#065f46'
                    }}
                  >
                    Instant Response Received!
                  </h3>

                  <p
                    style={{
                      fontSize: '0.875rem',
                      margin: '0.25rem 0 0',
                      color: '#047857'
                    }}
                  >
                    Our AI system resolved your request Confidence:{' '}
                    {formatConfidence(response.confidence)}
                  </p>
                </div>
              </div>

              <div
                style={{
                  background: 'white',
                  borderRadius: '8px',
                  padding: '1.25rem',
                  marginTop: '1rem',
                  border: '1px solid #d1fae5'
                }}
              >
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    marginBottom: '0.5rem',
                    textTransform: 'uppercase',
                    fontWeight: '600',
                    letterSpacing: '0.5px'
                  }}
                >
                  Response:
                </div>

                <div
                  style={{
                    fontSize: '0.9375rem',
                    lineHeight: '1.7',
                    color: '#1f2937',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {response.text}
                </div>
              </div>

              <div
                style={{
                  marginTop: '1rem',
                  padding: '0.75rem',
                  background: 'rgba(255,255,255,0.6)',
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  color: '#047857'
                }}
              >
                📧 A copy of this response has been sent to your email:{' '}
                <strong>{email}</strong>
              </div>
            </div>
          )}

          {response && response.auto === false && (
            <div
              style={{
                background: '#dbeafe',
                border: '2px solid #3b82f6',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '2rem',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '1rem'
                }}
              >
                <span style={{ fontSize: '2rem' }}>ℹ️</span>

                <div>
                  <h3
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: '600',
                      margin: 0,
                      color: '#1e40af'
                    }}
                  >
                    Request Under Review
                  </h3>

                  <p
                    style={{
                      fontSize: '0.875rem',
                      margin: '0.25rem 0 0',
                      color: '#1e3a8a'
                    }}
                  >
                    Our support team is reviewing your case
                  </p>
                </div>
              </div>

              <div
                style={{
                  background: 'white',
                  borderRadius: '8px',
                  padding: '1.25rem',
                  marginTop: '1rem',
                  border: '1px solid #bfdbfe'
                }}
              >
                <p
                  style={{
                    fontSize: '0.9375rem',
                    lineHeight: '1.7',
                    color: '#1f2937',
                    margin: 0
                  }}
                >
                  Thank you for contacting NYUSky Airways. Your request requires
                  personalized attention from our support team. You will receive
                  a detailed response via email within 24 hours.
                </p>
              </div>

              <div
                style={{
                  marginTop: '1rem',
                  padding: '0.75rem',
                  background: 'rgba(255,255,255,0.6)',
                  borderRadius: '6px',
                  fontSize: '0.8125rem',
                  color: '#1e3a8a'
                }}
              >
                📧 Please check your email <strong>{email}</strong> for our response
                within 24 hours
              </div>

              {ticketId && (
                <div
                  style={{
                    marginTop: '0.75rem',
                    padding: '0.5rem 0.75rem',
                    background: 'rgba(255,255,255,0.4)',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    color: '#1e40af',
                    fontFamily: 'monospace'
                  }}
                >
                  Reference: {ticketId}
                </div>
              )}
            </div>
          )}

          {waiting && (
            <div
              style={{
                background: '#eff6ff',
                border: '2px solid #3b82f6',
                borderRadius: '12px',
                padding: '2rem',
                marginBottom: '2rem',
                textAlign: 'center'
              }}
            >
              <div
                style={{
                  fontSize: '3rem',
                  marginBottom: '1rem',
                  animation: 'pulse 2s ease-in-out infinite'
                }}
              >
                🤖
              </div>

              <h3
                style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  marginBottom: '0.5rem',
                  color: '#1e40af'
                }}
              >
                Processing your request...
              </h3>

              <p
                style={{
                  fontSize: '0.875rem',
                  color: '#3b82f6',
                  margin: 0
                }}
              >
                Checking if we can provide an instant response
              </p>
            </div>
          )}

          {!response && !waiting && (
            <div
              style={{
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '1.5rem',
                marginBottom: '2rem'
              }}
            >
              <h2
                style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <span style={{ fontSize: '1.5rem' }}>🎫</span>
                Your Flight Details
              </h2>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem'
                }}
              >
                {Object.entries(customerData).map(([key, value]) => (
                  <div key={key}>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: '#6b7280',
                        marginBottom: '0.25rem',
                        textTransform: 'capitalize'
                      }}
                    >
                      {key}
                    </div>
                    <div style={{ fontWeight: '500' }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!response && !waiting && (
            <form onSubmit={handleSubmit}>
              <h3
                style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <span style={{ fontSize: '1.5rem' }}>💬</span>
                How can we help you?
              </h3>

              <div style={{ marginBottom: '1.25rem' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    marginBottom: '0.5rem',
                    color: '#374151'
                  }}
                >
                  Your Email Address
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sarah.johnson@email.com"
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    marginBottom: '0.5rem',
                    color: '#374151'
                  }}
                >
                  Your Message
                </label>

                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Please describe your issue or question in detail..."
                  rows={6}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    lineHeight: '1.5'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <p
                  style={{
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    marginBottom: '0.5rem',
                    fontWeight: '500'
                  }}
                >
                  Quick examples:
                </p>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                  }}
                >
                  {[
                    { type: 'refund', label: '💰 Refund Request' },
                    { type: 'delay', label: '⏰ Flight Delay' },
                    { type: 'baggage', label: '🧳 Lost Baggage' },
                    { type: 'seat', label: '💺 Seat Issue' }
                  ].map((sample) => (
                    <button
                      key={sample.type}
                      type="button"
                      onClick={() => loadSample(sample.type)}
                      style={{
                        padding: '0.5rem 0.875rem',
                        background: 'white',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                    >
                      {sample.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: submitting
                    ? '#93c5fd'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
                }}
              >
                {submitting ? '✈️ Sending...' : '📨 Submit Support Request'}
              </button>
            </form>
          )}

          {response && (
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <button
                onClick={() => {
                  setResponse(null);
                  setResult(null);
                  setTicketId(null);
                  setMessage('');
                }}
                style={{
                  padding: '0.875rem 1.5rem',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.9375rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
                }}
              >
                📝 Submit Another Request
              </button>
            </div>
          )}

          {!response && !waiting && (
            <div
              style={{
                marginTop: '2rem',
                padding: '1.5rem',
                background: '#f9fafb',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}
            >
              <h4
                style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  marginBottom: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                ℹ️ What happens next?
              </h4>

              <ul
                style={{
                  fontSize: '0.8125rem',
                  color: '#4b5563',
                  lineHeight: '1.6',
                  margin: 0,
                  paddingLeft: '1.25rem'
                }}
              >
                <li>Your message is analyzed by our AI support system.</li>
                <li>If confidence is high ≥95%, you'll get an instant response here.</li>
                <li>Otherwise, a support agent will review and respond via email within 24 hours.</li>
                <li>For urgent matters, call our hotline: 1-800-NYUSKY.</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

export default CustomerPortal;
