function TicketList({ tickets, selectedTicket, onSelectTicket }) {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'HIGH': return { bg: '#fee2e2', text: '#991b1b' };
      case 'MEDIUM': return { bg: '#fef3c7', text: '#92400e' };
      case 'LOW': return { bg: '#dbeafe', text: '#1e40af' };
      default: return { bg: '#f3f4f6', text: '#374151' };
    }
  };

  const getStatusColor = (status) => {
    if (status === 'pending_verification') return '#f59e0b';
    if (status === 'approved') return '#10b981';
    if (status === 'rejected') return '#ef4444';
    return '#6b7280';
  };

  const getStatusEmoji = (status) => {
    if (status === 'pending_verification') return '⏳';
    if (status === 'approved') return '✅';
    if (status === 'rejected') return '❌';
    return '📋';
  };

  if (!tickets || tickets.length === 0) {
    return (
      <div style={{
        flex: 1,
        background: 'white',
        borderRadius: '8px',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
          Tickets (0)
        </h2>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '3rem 1rem',
          color: '#9ca3af',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '3rem' }}>⏱️</div>
          <p style={{ marginTop: '1rem', fontSize: '0.875rem' }}>No tickets yet</p>
          <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
            Submit a test message to create your first ticket
          </p>
        </div>
      </div>
    );
  }

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
      <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
        Tickets ({tickets.length})
      </h2>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}>
        {tickets.map((ticket) => {
          const priorityColor = getPriorityColor(ticket.priority);
          const isSelected = selectedTicket?.ticketId === ticket.ticketId;
          const confidence = parseFloat(ticket.confidence || 0);
          
          return (
            <div
              key={ticket.ticketId}
              onClick={() => onSelectTicket(ticket)}
              style={{
                padding: '1rem',
                border: isSelected ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                borderRadius: '6px',
                cursor: 'pointer',
                background: isSelected ? '#eff6ff' : 'white',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  background: priorityColor.bg,
                  color: priorityColor.text
                }}>
                  {ticket.priority}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  {new Date(ticket.createdAt).toLocaleTimeString()}
                </span>
              </div>

              <div style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '0.5rem',
                textTransform: 'capitalize'
              }}>
                {ticket.intent.replace(/_/g, ' ')}
              </div>

              <div style={{
                fontSize: '0.875rem',
                color: '#4b5563',
                marginBottom: '0.75rem',
                lineHeight: '1.5'
              }}>
                {/* FIXED: Use 'message' not 'originalMessage' */}
                {(ticket.message || '').substring(0, 100)}
                {(ticket.message || '').length > 100 && '...'}
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '0.75rem',
                borderTop: '1px solid #e5e7eb'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  color: getStatusColor(ticket.status)
                }}>
                  <span>{getStatusEmoji(ticket.status)}</span>
                  <span>{ticket.status.replace(/_/g, ' ')}</span>
                </div>
                <div style={{ 
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  color: confidence > 0.8 ? '#10b981' : confidence > 0 ? '#f59e0b' : '#ef4444'
                }}>
                  {confidence === 0 ? '🤖 Fallback' : `🎯 ${Math.round(confidence * 100)}%`}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TicketList;
