import { useState } from 'react';
import './App.css';
import Map from './components/map';
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

  return (
    <div className="App">
        <Timeline year={year} setYear={setYear} />
        <Map lines={currentLines} />
        <Desc desc={currentDesc} />
    </div>
  );
}

export default App;
