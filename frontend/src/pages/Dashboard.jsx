import { useState, useEffect } from 'react';
import MessageSubmitter from '../components/MessageSubmitter';
import TicketList from '../components/TicketList';
import TicketDetail from '../components/TicketDetail';
import LogViewer from '../components/LogViewer';
import Stats from '../components/Stats';

function Dashboard() {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('tickets');
  const [loading, setLoading] = useState(false);

  const fetchTickets = async () => {
    try {
      const response = await fetch('/api/tickets');
      if (!response.ok) throw new Error('Failed to fetch tickets');
      const data = await response.json();
      setTickets(data.tickets || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/logs');
      if (!response.ok) throw new Error('Failed to fetch logs');
      const data = await response.json();
      setLogs(data.logs || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchStats();
    fetchLogs();

    const interval = setInterval(() => {
      fetchTickets();
      fetchStats();
      fetchLogs();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    Promise.all([fetchTickets(), fetchStats(), fetchLogs()]).finally(() => {
      setLoading(false);
    });
  };

  const handleTicketUpdate = () => {
    fetchTickets();
    fetchStats();
    fetchLogs();
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '1rem 2rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          maxWidth: '1600px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            color: '#3b82f6'
          }}>
            <div style={{ fontSize: '2rem' }}>📊</div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '600' }}>
              SupportMesh Dashboard
            </h1>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              color: '#374151',
              opacity: loading ? 0.5 : 1
            }}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div style={{
        flex: 1,
        display: 'flex',
        maxWidth: '1600px',
        width: '100%',
        margin: '0 auto',
        padding: '2rem',
        gap: '2rem'
      }}>
        {/* Sidebar */}
        <aside style={{
          width: '380px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}>
          <MessageSubmitter onSubmit={handleTicketUpdate} />
          <Stats stats={stats} />
        </aside>

        {/* Main Content */}
        <main style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          minWidth: 0
        }}>
          {/* Tabs */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            borderBottom: '2px solid #e5e7eb',
            paddingBottom: 0
          }}>
            <button
              onClick={() => setActiveTab('tickets')}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'transparent',
                border: 'none',
                borderBottom: `2px solid ${activeTab === 'tickets' ? '#3b82f6' : 'transparent'}`,
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: activeTab === 'tickets' ? '#3b82f6' : '#6b7280',
                marginBottom: '-2px',
                transition: 'all 0.2s'
              }}
            >
              Tickets
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'transparent',
                border: 'none',
                borderBottom: `2px solid ${activeTab === 'logs' ? '#3b82f6' : 'transparent'}`,
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: activeTab === 'logs' ? '#3b82f6' : '#6b7280',
                marginBottom: '-2px',
                transition: 'all 0.2s'
              }}
            >
              Logs
            </button>
          </div>

          {/* Tab Content */}
          <div style={{ flex: 1 }}>
            {activeTab === 'tickets' && (
              <div style={{
                display: 'flex',
                gap: '1.5rem',
                height: 'calc(100vh - 220px)'
              }}>
                <TicketList
                  tickets={tickets}
                  selectedTicket={selectedTicket}
                  onSelectTicket={setSelectedTicket}
                />
                {selectedTicket && (
                  <TicketDetail
                    ticket={selectedTicket}
                    onUpdate={handleTicketUpdate}
                    onClose={() => setSelectedTicket(null)}
                  />
                )}
              </div>
            )}

            {activeTab === 'logs' && <LogViewer logs={logs} />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
