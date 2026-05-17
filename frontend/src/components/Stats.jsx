function Stats({ stats }) {
  if (!stats) {
    return (
      <div style={{
        background: 'white',
        borderRadius: '8px',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem' }}>
          System Stats
        </h3>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', textAlign: 'center', padding: '1rem 0' }}>
          Loading stats...
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: 'white',
      borderRadius: '8px',
      padding: '1.5rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem' }}>
        System Stats
      </h3>

      {/* Queue Status */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h4 style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.75rem' }}>
          📬 Queue Status
        </h4>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f3f4f6' }}>
          <span style={{ fontSize: '0.875rem', color: '#4b5563' }}>Triage Queue</span>
          <span style={{ 
            fontSize: '0.875rem', 
            fontWeight: '600',
            color: stats.queues.triage > 0 ? '#f59e0b' : '#10b981'
          }}>
            {stats.queues.triage}
            {stats.queues.triageInFlight > 0 && (
              <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: '0.25rem' }}>
                (+{stats.queues.triageInFlight} processing)
              </span>
            )}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
          <span style={{ fontSize: '0.875rem', color: '#4b5563' }}>Verification Queue</span>
          <span style={{ 
            fontSize: '0.875rem', 
            fontWeight: '600',
            color: stats.queues.verification > 0 ? '#f59e0b' : '#10b981'
          }}>
            {stats.queues.verification}
            {stats.queues.verificationInFlight > 0 && (
              <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: '0.25rem' }}>
                (+{stats.queues.verificationInFlight} processing)
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Ticket Status */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h4 style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.75rem' }}>
          🎫 Tickets by Status
        </h4>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f3f4f6' }}>
          <span style={{ fontSize: '0.875rem', color: '#4b5563' }}>Total</span>
          <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>{stats.tickets.total}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f3f4f6' }}>
          <span style={{ fontSize: '0.875rem', color: '#4b5563' }}>⏳ Pending</span>
          <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#f59e0b' }}>{stats.tickets.pending}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f3f4f6' }}>
          <span style={{ fontSize: '0.875rem', color: '#4b5563' }}>✅ Approved</span>
          <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#10b981' }}>{stats.tickets.approved}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
          <span style={{ fontSize: '0.875rem', color: '#4b5563' }}>❌ Rejected</span>
          <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#ef4444' }}>{stats.tickets.rejected}</span>
        </div>
      </div>

      {/* Priority Distribution */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h4 style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.75rem' }}>
          📊 By Priority
        </h4>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f3f4f6' }}>
          <span style={{ fontSize: '0.875rem', color: '#4b5563' }}>🔴 High</span>
          <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#ef4444' }}>{stats.tickets.highPriority}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f3f4f6' }}>
          <span style={{ fontSize: '0.875rem', color: '#4b5563' }}>🟡 Medium</span>
          <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#f59e0b' }}>{stats.tickets.mediumPriority}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
          <span style={{ fontSize: '0.875rem', color: '#4b5563' }}>🟢 Low</span>
          <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#10b981' }}>{stats.tickets.lowPriority}</span>
        </div>
      </div>

      {/* GCP AI Performance */}
      <div>
        <h4 style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.75rem' }}>
          🤖 GCP AI Performance
        </h4>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f3f4f6' }}>
          <span style={{ fontSize: '0.875rem', color: '#4b5563' }}>High Confidence (&gt;80%)</span>
          <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#10b981' }}>{stats.tickets.highConfidence}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #f3f4f6' }}>
          <span style={{ fontSize: '0.875rem', color: '#4b5563' }}>Low Confidence (&lt;80%)</span>
          <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#f59e0b' }}>{stats.tickets.lowConfidence}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
          <span style={{ fontSize: '0.875rem', color: '#4b5563' }}>Fallback Mode</span>
          <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#ef4444' }}>{stats.tickets.fallback}</span>
        </div>
        
        {/* GCP Success Rate */}
        <div style={{
          marginTop: '0.75rem',
          padding: '0.75rem',
          background: stats.tickets.fallback === 0 ? '#d1fae5' : stats.tickets.fallback > stats.tickets.total / 2 ? '#fee2e2' : '#fef3c7',
          borderRadius: '6px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
            GCP Success Rate
          </div>
          <div style={{ 
            fontSize: '1.25rem', 
            fontWeight: '600',
            color: stats.tickets.fallback === 0 ? '#065f46' : stats.tickets.fallback > stats.tickets.total / 2 ? '#991b1b' : '#92400e'
          }}>
            {stats.tickets.total > 0 
              ? Math.round(((stats.tickets.total - stats.tickets.fallback) / stats.tickets.total) * 100)
              : 0}%
          </div>
        </div>
      </div>
    </div>
  );
}

export default Stats;
