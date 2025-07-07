// src/components/GeminiAssistantButton.js
import React, { useState } from "react";
import { MessageCircle } from "lucide-react";
import GeminiChatPanel from "./GeminiChatPanel";

const GeminiAssistantButton = ({ selectedDistrict }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Button */}
      <button
        className="fixed bottom-6 right-6 z-50 bg-pink-600 hover:bg-pink-700 text-white p-4 rounded-full shadow-lg focus:outline-none"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Talk to Gemini"
      >
        <MessageCircle size={24} />
      </button>

      {/* Gemini Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 z-50 w-[90vw] max-w-md bg-gray-900 text-white rounded-2xl shadow-2xl border border-pink-500 p-4 backdrop-blur-md">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold text-pink-400">Gemini Assistant</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-pink-400 transition"
            >
              ✕
            </button>
          </div>

          <GeminiChatPanel
            selectedDistrict={selectedDistrict}
            isCompareMode={false}
            comparisonContext={null}
          />
        </div>
      )}
    </>
  );
};

export default GeminiAssistantButton;
