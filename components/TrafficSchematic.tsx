import React from 'react';

const TrafficSchematic: React.FC = () => {
  return (
    <div className="bg-black border border-[#1c2029] rounded-2xl p-6 h-full flex flex-col">
      <h3 className="text-xl font-semibold text-gray-200 mb-4 tracking-wide">
        Checkpoint Layout Schematic
      </h3>
      <div className="flex-grow flex items-center justify-center bg-black/20 p-4 rounded-lg border border-gray-800">
        <img 
          src="https://upload.wikimedia.org/wikipedia/commons/7/73/Border_checkpoint_schematic.svg"
          alt="Schematic of border checkpoint traffic lanes"
          className="w-full max-w-md h-auto rounded-lg filter invert drop-shadow-[0_0_8px_rgba(8,247,254,0.5)]"
        />
      </div>
      <p className="text-gray-500 text-xs mt-4 text-center">
        Overhead view of traffic lanes leading to inspection booths.
      </p>
    </div>
  );
};

export default TrafficSchematic;