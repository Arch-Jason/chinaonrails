import { useState } from 'react';
import './App.css';
import Map from './components/map';
import Topbar from './components/topbar';
import Timeline from './components/timeline';
import Desc from './components/desc';
import { lines } from './lines';
import { desc } from './desc';
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  const availableYears = Object.keys(lines).map(Number);
  const [year, setYear] = useState<number>(Math.min(...availableYears));
  const currentLines = lines[year] || [];
  const currentDesc = desc[year] || "";
  const [showSharePoints, setShowSharePoints] = useState<boolean>(true);
  const [showLines, setShowLines] = useState<boolean>(true);

  return (
    <div className="App">
        <Topbar setShowSharePoints={setShowSharePoints} setShowLines={setShowLines} />
        <Timeline year={year} setYear={setYear} />
        <Map lines={currentLines} showSharePoints={showSharePoints} showLines={showLines} />
        <Desc desc={currentDesc} />
    </div>
  );
}

export default App;
