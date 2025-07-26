import React, { useState } from "react";
import "./PinMarker.css";

const PinMarker = ({ post, onClick, isHighlighted }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`pin-marker ${isHighlighted || isHovered ? 'highlighted' : ''}`}
      style={{ backgroundColor: (post.pinColor || "yellow").toLowerCase() }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    />
  );
};

export default PinMarker; 