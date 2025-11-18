
import React from 'react';

export interface Event {
  id: string;
  timestamp: Date;
  type: 'info' | 'warning' | 'alert';
  message: string;
}

interface LiveEventStreamProps {
  events: Event[];
}

const EVENT_CONFIG = {
  info: {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    style: 'border-l-cyan-400',
  },
  warning: {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    style: 'border-l-yellow-400',
  },
  alert: {
    icon: (
       <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
    style: 'border-l-red-500',
  },
};

const LiveEventStream: React.FC<LiveEventStreamProps> = ({ events }) => {
  return (
    <div className="bg-black border border-[#1c2029] rounded-2xl p-6 h-[400px] flex flex-col">
      <h3 className="text-xl font-semibold text-gray-200 mb-4 tracking-wide">
        Live Event Stream
      </h3>
      <div className="flex-grow bg-black/20 p-2 rounded-lg border border-gray-800 overflow-y-auto flex flex-col-reverse">
        <div className="space-y-2">
          {events.length === 0 ? (
             <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                Awaiting system events...
             </div>
          ) : (
            events.map(event => (
              <div 
                key={event.id} 
                className={`flex items-start gap-3 p-2 rounded-md bg-gray-900/50 border-l-4 ${EVENT_CONFIG[event.type].style}`}
              >
                <div className="flex-shrink-0 mt-0.5">{EVENT_CONFIG[event.type].icon}</div>
                <div className="flex-grow">
                  <p className="text-sm text-gray-300">{event.message}</p>
                  <p className="text-xs text-gray-500 font-mono">
                    {event.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <p className="text-gray-500 text-xs mt-4 text-center">
        Real-time feed of checkpoint operational events.
      </p>
    </div>
  );
};

export default LiveEventStream;
