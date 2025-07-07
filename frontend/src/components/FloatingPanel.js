// src/components/FloatingPanel.js
import React, { useState, useRef, useEffect } from "react";

const FloatingPanel = ({ title, children, onClose }) => {
  const [width, setWidth] = useState(480); // default panel width
  const isDragging = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging.current) {
        const newWidth = window.innerWidth - e.clientX - 32; // 32px margin from right
        if (newWidth > 300 && newWidth < 600) {
          setWidth(newWidth);
        }
      }
    };

    const stopDragging = () => {
      isDragging.current = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopDragging);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopDragging);
    };
  }, []);

  return (
    <div
      className="fixed top-20 right-4 z-40 bg-gray-900 text-white rounded-2xl shadow-2xl border border-pink-500 backdrop-blur-md transition-all duration-300 ease-in-out"
      style={{ width: `${width}px` }}
    >
      {/* Header with Close Button */}
      <div className="flex justify-between items-center px-4 py-2 border-b border-gray-700 bg-gray-800 rounded-t-2xl">
        <h2 className="text-base font-bold text-pink-400 tracking-wide uppercase">
          {title}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white font-bold text-lg"
          title="Close"
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div className="p-4 overflow-y-auto max-h-[75vh]">
        {children}
      </div>

      {/* Resizer */}
      <div
        className="absolute left-0 top-0 h-full w-1 cursor-ew-resize bg-pink-500 opacity-30 hover:opacity-60"
        onMouseDown={() => (isDragging.current = true)}
      />
    </div>
  );
};

export default FloatingPanel;
