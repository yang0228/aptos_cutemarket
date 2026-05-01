import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WalletProvider } from './context/WalletProvider';
import { Header } from './components/Header';
import { WalletButton } from './components/WalletButton';
import { Home } from './pages/Home';
import { ProjectDetail } from './pages/ProjectDetail';

function App() {
  return (
    <WalletProvider>
      <Router>
        <div className="min-h-screen">
          <Header />
          <WalletButton />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/project/:id" element={<ProjectDetail />} />
          </Routes>
        </div>
      </Router>
    </WalletProvider>
  );
}

export default App;

