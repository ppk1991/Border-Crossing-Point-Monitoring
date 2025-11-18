
import React, { useState, useCallback, useEffect } from 'react';
import CheckpointStatusWindow, { BCP_DATA } from './components/CheckpointStatusWindow';
import TrafficSchematic from './components/TrafficSchematic';
import LiveEventStream, { Event as EventType } from './components/LiveEventStream';

const bcpOptions = Object.keys(BCP_DATA);

export type AddEventFunction = (event: Omit<EventType, 'id' | 'timestamp'>) => void;

const App: React.FC = () => {
  const [selectedBcp, setSelectedBcp] = useState(bcpOptions[0]);
  const [events, setEvents] = useState<EventType[]>([]);

  const addEvent = useCallback<AddEventFunction>((event) => {
    setEvents(prevEvents => [
      { 
        ...event, 
        id: new Date().toISOString() + Math.random(), 
        timestamp: new Date() 
      }, 
      ...prevEvents
    ].slice(0, 50)); // Keep the list size manageable
  }, []);
  
  // Effect to initialize events when BCP changes
  useEffect(() => {
    const bcpData = BCP_DATA[selectedBcp];
    const initialEvents: EventType[] = [];
    
    bcpData.vehicles.forEach(v => {
      if (v.riskBand === 'high') {
        initialEvents.push({ 
          type: 'alert', 
          message: `High-risk vehicle detected: ${v.plate} (Score: ${v.riskScore}) in lane ${v.laneId}.`, 
          id: v.id, 
          timestamp: new Date(v.arrivedAt) 
        });
      }
    });

    bcpData.declarations.forEach(d => {
      if (d.selectivity === 'RED') {
        initialEvents.push({ 
          type: 'alert', 
          message: `Declaration ${d.mrn} flagged for RED channel inspection.`, 
          id: d.id, 
          // Give it a slightly different timestamp to avoid key issues if IDs were same
          timestamp: new Date(Date.now() + Math.random() * 1000) 
        });
      }
    });
    
    // Sort by timestamp desc and set as initial state
    setEvents(initialEvents.sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime()));
    
  }, [selectedBcp]);

  return (
    <main className="bg-black min-h-screen text-gray-200 p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-screen-2xl mx-auto">
        <header className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-cyan-300 tracking-wider filter drop-shadow-[0_0_8px_rgba(107,235,244,0.5)]">
                OPERATIONAL COORDINATION CENTER
            </h1>
            <p className="text-gray-400 mt-2 text-lg">Border Crossing Point Monitoring</p>
        </header>

        <div className="mb-8 max-w-md mx-auto">
          <label htmlFor="bcp-select" className="block text-sm font-medium text-gray-400 mb-2 text-center tracking-wider uppercase">
            Select Border Crossing Point
          </label>
          <div className="relative">
            <select
              id="bcp-select"
              value={selectedBcp}
              onChange={(e) => setSelectedBcp(e.target.value)}
              className="w-full bg-black border border-[#1c2029] text-white text-center text-lg p-3 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 appearance-none cursor-pointer"
            >
              {bcpOptions.map(bcp => (
                <option key={bcp} value={bcp} className="bg-black text-white">
                  {bcp}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
              <svg className="fill-current h-6 w-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
              </svg>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <CheckpointStatusWindow key={selectedBcp} data={BCP_DATA[selectedBcp]} addEvent={addEvent} />
          </div>
          <div className="flex flex-col gap-8">
            <TrafficSchematic />
            <LiveEventStream events={events} />
          </div>
        </div>
      </div>
    </main>
  );
};

export default App;
