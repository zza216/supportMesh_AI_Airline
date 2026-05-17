import { useState } from 'react';

function TicketDetail({ ticket, onUpdate, onClose }) {
  const [editing, setEditing] = useState(false);
  const [editedResponse, setEditedResponse] = useState(ticket.draftResponse);
  const [processing, setProcessing] = useState(false);

  const handleAction = async (action) => {
    setProcessing(true);

    try {
      const response = await fetch(`/api/tickets/${ticket.ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          approver: 'Dashboard User',
          editedResponse: editing ? editedResponse : undefined,
        }),
      });

      if (response.ok) {
        if (onUpdate) onUpdate();
        if (onClose) onClose();
      } else {
        console.error('Failed to update ticket');
      }
    } catch (error) {
      console.error('Error updating ticket:', error);
    } finally {
      setProcessing(false);
    }
  };

  const canTakeAction = ticket.status === 'pending_verification';
  const confidence = parseFloat(ticket.confidence || 0);
  const isGcpClassified = confidence > 0;

  return (
    <div style={{
      flex: 1,
      background: 'white',
      borderRadius: '8px',
      padding: '1.5rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      display: 'flex',
      flexDirection: 'column',
      maxHeight: '100%',
      overflow: 'hidden'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.25rem' }}>
            Ticket Details
          </h2>
          {!isGcpClassified && (
            <span style={{
              fontSize: '0.75rem',
              color: '#ef4444',
              background: '#fee2e2',
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              fontWeight: '500'
            }}>
              ⚠️ Fallback Mode - GCP Unavailable
            </span>
          )}
        </div>
        <button onClick={onClose} style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0.25rem',
          borderRadius: '4px',
          color: '#6b7280',
          fontSize: '1.25rem'
        }}>
          ✕
        </button>
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
      }}>
        {/* Ticket Information */}
        <div>
          <h3 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem' }}>
            Ticket Information
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <span style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                Ticket ID
              </span>
              <span style={{ fontSize: '0.875rem', fontFamily: 'monospace' }}>
                {ticket.ticketId.substring(0, 12)}...
              </span>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                Status
              </span>
              <span style={{
                display: 'inline-block',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: '600',
                textTransform: 'uppercase',
                background: ticket.status === 'pending_verification' ? '#fef3c7' : 
                           ticket.status === 'approved' ? '#d1fae5' :
                           ticket.status === 'rejected' ? '#fee2e2' : '#f3f4f6',
                color: ticket.status === 'pending_verification' ? '#92400e' :
                       ticket.status === 'approved' ? '#065f46' :
                       ticket.status === 'rejected' ? '#991b1b' : '#374151'
              }}>
                {ticket.status.replace(/_/g, ' ')}
              </span>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                Priority
              </span>
              <span style={{
                display: 'inline-block',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: '600',
                textTransform: 'uppercase',
                background: ticket.priority === 'HIGH' ? '#fee2e2' : 
                           ticket.priority === 'MEDIUM' ? '#fef3c7' : '#dbeafe',
                color: ticket.priority === 'HIGH' ? '#991b1b' : 
                       ticket.priority === 'MEDIUM' ? '#92400e' : '#1e40af'
              }}>
                {ticket.priority}
              </span>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                Created
              </span>
              <span style={{ fontSize: '0.875rem' }}>
                {new Date(ticket.createdAt).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* GCP Classification */}
        <div>
          <h3 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem' }}>
            {isGcpClassified ? '🤖 GCP AI Classification' : '⚙️ Fallback Classification'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <span style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                Intent
              </span>
              <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                {ticket.intent.replace(/_/g, ' ')}
              </span>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                Confidence
              </span>
              <span style={{ 
                fontSize: '0.875rem', 
                fontWeight: '600',
                color: confidence > 0.8 ? '#10b981' : confidence > 0 ? '#f59e0b' : '#ef4444'
              }}>
                {Math.round(confidence * 100)}%
                {confidence === 0 && ' (Fallback)'}
              </span>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                Sentiment
              </span>
              <span style={{ fontSize: '0.875rem' }}>
                {ticket.sentiment || 'N/A'}
              </span>
            </div>
            {/* FIXED: Show reasoning instead of non-existent sentimentScore */}
            <div>
              <span style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                Source
              </span>
              <span style={{ 
                fontSize: '0.875rem',
                color: isGcpClassified ? '#10b981' : '#ef4444',
                fontWeight: '500'
              }}>
                {isGcpClassified ? 'GCP AI' : 'Fallback'}
              </span>
            </div>
          </div>

          {/* AI Reasoning */}
          {ticket.reasoning && (
            <div style={{ marginTop: '0.75rem' }}>
              <span style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                AI Reasoning
              </span>
              <div style={{
                fontSize: '0.875rem',
                color: '#374151',
                background: '#f9fafb',
                padding: '0.75rem',
                borderRadius: '4px',
                border: '1px solid #e5e7eb',
                fontStyle: 'italic'
              }}>
                {ticket.reasoning}
              </div>
            </div>
          )}
        </div>

        {/* Customer Message */}
        <div>
          <h3 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem' }}>
            📧 Customer Message
          </h3>
          <div style={{
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            padding: '1rem',
            fontSize: '0.875rem',
            lineHeight: '1.6'
          }}>
            <p style={{ marginBottom: '0.5rem', color: '#6b7280' }}>
              {/* FIXED: Use 'email' not 'customerEmail' */}
              <strong>From:</strong> {ticket.email}
            </p>
            <p style={{ color: '#374151' }}>
              {/* FIXED: Use 'message' not 'originalMessage' */}
              {ticket.message}
            </p>
          </div>
        </div>

        {/* RAG Documents */}
        {ticket.ragDocuments && ticket.ragDocuments.length > 0 && (
          <div>
            <h3 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem' }}>
              📄 Policy Documents Referenced
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {ticket.ragDocuments.map((doc, index) => (
                <div key={index} style={{
                  padding: '0.75rem',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: '#1e40af'
                }}>
                  <span>📎</span>
                  <span>{doc}</span>
                </div>
              ))}
            </div>
            {!isGcpClassified && (
              <p style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                marginTop: '0.5rem',
                fontStyle: 'italic'
              }}>
                No policy documents retrieved (GCP unavailable)
              </p>
            )}
          </div>
        )}

        {/* AI Draft Response */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: '600' }}>
              ✍️ AI Draft Response
            </h3>
            {canTakeAction && !editing && (
              <button onClick={() => setEditing(true)} style={{
                background: '#f3f4f6',
                border: '1px solid #d1d5db',
                padding: '0.375rem 0.75rem',
                borderRadius: '4px',
                fontSize: '0.75rem',
                cursor: 'pointer',
                fontWeight: '500'
              }}>
                ✏️ Edit
              </button>
            )}
          </div>
          {editing ? (
            <textarea
              value={editedResponse}
              onChange={(e) => setEditedResponse(e.target.value)}
              rows={10}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontFamily: 'inherit',
                lineHeight: '1.6',
                resize: 'vertical'
              }}
            />
          ) : (
            <div style={{
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              padding: '1rem',
              fontSize: '0.875rem',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap'
            }}>
              {ticket.draftResponse}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {canTakeAction && (
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            paddingTop: '1rem',
            borderTop: '1px solid #e5e7eb'
          }}>
            <button
              onClick={() => handleAction('approve')}
              disabled={processing}
              style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: processing ? 'not-allowed' : 'pointer',
                background: processing ? '#93c5fd' : '#10b981',
                color: 'white',
                border: 'none'
              }}
            >
              ✅ {editing ? 'Approve with Edits' : 'Approve Response'}
            </button>
            <button
              onClick={() => handleAction('reject')}
              disabled={processing}
              style={{
                flex: 1,
                padding: '0.75rem',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: processing ? 'not-allowed' : 'pointer',
                background: processing ? '#fca5a5' : '#ef4444',
                color: 'white',
                border: 'none'
              }}
            >
              ❌ Reject Response
            </button>
            {editing && (
              <button onClick={() => {
                setEditing(false);
                setEditedResponse(ticket.draftResponse);
              }} style={{
                padding: '0.75rem',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                background: '#f3f4f6',
                border: '1px solid #d1d5db',
                color: '#374151'
              }}>
                Cancel
              </button>
            )}
          </div>
        )}

        {/* Approval Info */}
        {ticket.approvedBy && (
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '6px',
            padding: '0.75rem',
            fontSize: '0.75rem',
            color: '#166534'
          }}>
            <p style={{ marginBottom: '0.25rem' }}>
              <strong>✅ Approved by:</strong> {ticket.approvedBy}
            </p>
            <p>
              <strong>At:</strong> {new Date(ticket.approvedAt).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default TicketDetail;
