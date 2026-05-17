import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import CustomerPortal from './pages/CustomerPortal-WithWaiting';
import Dashboard from './pages/Dashboard'; // Your existing dashboard

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Customer-facing portal */}
        <Route path="/" element={<CustomerPortal />} />
        <Route path="/customer" element={<CustomerPortal />} />
        
        {/* Admin dashboard */}
        <Route path="/admin" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
