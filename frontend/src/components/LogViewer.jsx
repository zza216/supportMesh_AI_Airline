function LogViewer({ logs }) {
  if (!logs || logs.length === 0) {
    return (
      <div style={{
        height: 'calc(100vh - 220px)',
        background: 'white',
        borderRadius: '8px',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <h2 style={{
          fontSize: '1.125rem',
          fontWeight: '600',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          🖥️ System Logs
        </h2>
        <div style={{
          flex: 1,
          background: '#111827',
          borderRadius: '6px',
          padding: '3rem',
          textAlign: 'center',
          color: '#9ca3af',
          fontFamily: 'Monaco, Menlo, Courier New, monospace'
        }}>
          <p>No logs available yet</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      height: 'calc(100vh - 220px)',
      background: 'white',
      borderRadius: '8px',
      padding: '1.5rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <h2 style={{
        fontSize: '1.125rem',
        fontWeight: '600',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        🖥️ System Logs
      </h2>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        background: '#111827',
        borderRadius: '6px',
        padding: '1rem',
        fontFamily: 'Monaco, Menlo, Courier New, monospace'
      }}>
        {logs.map((log, index) => (
          <div key={index} style={{
            display: 'flex',
            gap: '0.75rem',
            padding: '0.375rem 0',
            fontSize: '0.8125rem',
            lineHeight: '1.5',
            color: '#e5e7eb',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
          }}>
            <span style={{ color: '#9ca3af', flexShrink: 0, width: '80px' }}>
              {new Date(log.timestamp).toLocaleTimeString()}
            </span>
            <span style={{ color: '#60a5fa', flexShrink: 0, fontWeight: '500' }}>
              [{log.ticketId.substring(0, 8)}]
            </span>
            <span style={{ color: '#34d399', flexShrink: 0, minWidth: '200px' }}>
              {log.event}
            </span>
            <span style={{ color: '#e5e7eb', flex: 1 }}>
              {log.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LogViewer;
