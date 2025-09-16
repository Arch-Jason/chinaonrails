import { useState } from 'react';
import './App.css';
import Map from './components/map';
import Topbar from './components/topbar';
import Timeline from './components/timeline';
import Desc from './components/desc';
import { lines } from './lines';
import { desc } from './desc';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Modal } from 'react-bootstrap';

function App() {
  const availableYears = Object.keys(lines).map(Number);
  const [year, setYear] = useState<number>(Math.min(...availableYears));
  const currentLines = lines[year] || [];
  const currentDesc = desc[year] || "";
  const [showSharePoints, setShowSharePoints] = useState<boolean>(true);
  const [showLines, setShowLines] = useState<boolean>(true);

  const [showAnnouncement, setShowAnnouncement] = useState(true);
  return (
    <div className="App">
      <Modal
        size="lg"
        centered
        show={showAnnouncement}
        onHide={() => setShowAnnouncement(false)}
      >
        <Modal.Header closeButton>
          <Modal.Title>公告</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>请您做一名有素质的火车迷，不乱上传点位。谢谢。</p>
          <a href="mailto:report@chinaonrails.org">点我发送反馈邮件</a>
        </Modal.Body>
      </Modal>
      <Topbar setShowSharePoints={setShowSharePoints} setShowLines={setShowLines} />
      <Timeline year={year} setYear={setYear} showLines={showLines} />
      <Map lines={currentLines} showSharePoints={showSharePoints} showLines={showLines} />
      <Desc desc={currentDesc} showLines={showLines} />
    </div>
  );
}

export default App;
