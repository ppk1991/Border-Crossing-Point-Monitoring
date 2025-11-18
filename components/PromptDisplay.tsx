
import React from 'react';

const promptText = `ultra-clean UI dashboard, dark cyber-security theme, glowing teal and amber accents, 
modern analytics interface showing 8 of 12 lanes open, cars 15 min, trucks 45 min wait, 
colored indicators (green, yellow, red). 
Small overhead map with vehicle lanes leading to border booths, icons for cars/trucks/buses.
Sleek dark dashboard window with glowing status lights.
--ar 16:9 --style isometric tech --details ultra-sharp`;

const PromptDisplay: React.FC = () => {
  return (
    <div className="bg-black border border-[#1c2029] rounded-2xl p-6 h-full flex flex-col">
      <h3 className="text-xl font-semibold text-gray-200 mb-3 tracking-wide">
        Inspiration Prompt
      </h3>
      <p className="text-sm text-gray-400 mb-4">
        This visual was designed based on the following generative AI prompt:
      </p>
      <pre className="bg-black/40 p-4 rounded-lg text-gray-300 text-xs sm:text-sm font-mono whitespace-pre-wrap overflow-x-auto flex-grow border border-gray-800">
        <code>
          {promptText}
        </code>
      </pre>
    </div>
  );
};

export default PromptDisplay;