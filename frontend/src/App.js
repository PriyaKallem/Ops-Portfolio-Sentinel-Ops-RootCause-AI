import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Landing from "@/pages/Landing";
import SentinelOps from "@/pages/SentinelOps";
import RootCauseAI from "@/pages/RootCauseAI";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/sentinel" element={<SentinelOps />} />
          <Route path="/rootcause" element={<RootCauseAI />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
