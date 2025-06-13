// src/components/Drawer.js
import React, { useState, useEffect, useRef } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

function Drawer({ district, isExpanded, setIsExpanded }) {
  // ---- ALL REACT HOOKS MUST BE DECLARED AT THE TOP LEVEL AND UNCONDITIONALLY ----
  const [chatHistory, setChatHistory] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [isLoadingChat, setIsLoadingChat] = useState(false); // State to show loading indicator
  const chatMessagesEndRef = useRef(null); // Ref to scroll chat to bottom

  // Effect to handle initial greeting or district change
  // This useEffect will run when the 'district' prop changes
  useEffect(() => {
    // Only proceed if a district is actually selected
    if (district) {
      setChatHistory([]); // Clear chat history for new district
      // Initial prompt for Gemini, sent through the backend
      const initialMessage = `Greet the user by saying "Welcome to ${district.district}, what would you like to know?" followed by a brief, interesting fact about its population density based on the provided data: population ${district.population}, area ${district.area_km2} km², density ${district.density} per km². Keep it concise and friendly.`;
      sendToGeminiBackend(initialMessage, district.district, []); // No prior chat history for initial greeting
    }
  }, [district]); // Dependency array: re-run this effect when 'district' changes

  // Effect to scroll to the bottom of the chat history
  // This useEffect will run whenever 'chatHistory' updates
  useEffect(() => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);


  // ---- NOW YOU CAN ADD CONDITIONAL RENDERING OR EARLY RETURNS ----
  // This checks if a district is selected; if not, it renders nothing.
  // This must come AFTER all Hook declarations.
  if (!district) return null;


  // Function to send messages to your backend API (can be declared here, not a Hook itself)
  const sendToGeminiBackend = async (message, currentDistrictName, currentChatHistory) => {
      setIsLoadingChat(true); // Start loading
      try {
          // Flatten chat history into a string for context
          const context = currentChatHistory
              .filter(msg => msg.sender === 'user' || msg.sender === 'gemini') // Only include actual messages
              .map(msg => `${msg.sender}: ${msg.message}`)
              .join('\n');

          const response = await fetch('/api/chat', { // This will proxy to localhost:5000/api/chat
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                  message: message,
                  districtName: currentDistrictName,
                  context: context // Pass recent chat history as context
              }),
          });

          if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          setChatHistory(prev => [...prev, { sender: "gemini", message: data.reply }]);
      } catch (error) {
          console.error("Error communicating with backend:", error);
          setChatHistory(prev => [...prev, { sender: "gemini", message: "Sorry, I couldn't get information from the AI at the moment. Please try again." }]);
      } finally {
          setIsLoadingChat(false); // End loading
      }
  };

  const handleSendMessage = () => {
      if (userInput.trim() && !isLoadingChat) { // Prevent sending if input is empty or loading
          const userMessage = userInput.trim();
          setChatHistory(prev => [...prev, { sender: "user", message: userMessage }]);
          sendToGeminiBackend(userMessage, district.district, chatHistory); // Pass current chat history
          setUserInput(""); // Clear input field
      }
  };

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out
        bg-gray-900 text-white shadow-2xl border-t border-pink-500
        rounded-t-2xl px-5 pt-3 pb-4
        ${isExpanded ? "h-[65vh]" : "h-[5vh]"}`} // Increased height for chatbox
    >
      {/* Toggle Button */}
      <div className="flex justify-center mb-2">
        <button
          onClick={() => setIsExpanded((prev) => !prev)}
          className="bg-gray-800 p-1 rounded-full shadow-md hover:bg-gray-700"
          aria-label="Toggle Drawer"
        >
          {isExpanded ? (
            <ChevronDown className="text-pink-400 w-6 h-6" />
          ) : (
            <ChevronUp className="text-pink-400 w-6 h-6" />
          )}
        </button>
      </div>

      {/* Main Content Area (visible when expanded) */}
      {isExpanded && (
          <div className="flex flex-row h-full overflow-hidden"> {/* Use flex-row for horizontal split */}

              {/* Left Pane: District Name and Stats (25%) */}
              <div className="w-1/4 p-4 flex flex-col items-start border-r border-gray-700 pr-5"> {/* Added border-r and pr-5 for separation */}
                  <h2 className="text-3xl font-extrabold text-pink-400 mb-6 text-left leading-tight"> {/* Larger, left-aligned title */}
                      {district.district}
                  </h2>
                  <ul className="text-sm space-y-2 text-gray-300"> {/* Adjusted text color for contrast */}
                      <li><strong>Population:</strong> {district.population.toLocaleString()}</li>
                      <li><strong>Density:</strong> {district.density} per km²</li>
                      <li><strong>Area:</strong> {district.area_km2} km²</li>
                      <li><strong>Literacy:</strong> {district.literacy_rate}%</li>
                      <li><strong>Sex Ratio:</strong> {district.sex_ratio}</li>
                      <li><strong>Urban Pop:</strong> {district.urban_percent}%</li>
                      <li><strong>Rural Pop:</strong> {district.rural_percent}%</li>
                  </ul>
              </div>

              {/* Right Pane: Gemini Chat Section (75%) */}
              <div className="w-3/4 p-4 flex flex-col overflow-hidden pl-5"> {/* Added pl-5 for separation */}
                  <h3 className="text-lg font-semibold text-pink-400 mb-3 text-center">Chat with Gemini AI</h3>
                  <div className="flex-1 bg-gray-800 rounded-lg p-4 overflow-y-auto custom-scrollbar flex flex-col space-y-3"> {/* Increased padding, added space-y for message separation */}
                      {chatHistory.map((msg, index) => (
                          <div
                              key={index}
                              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                          >
                              <span
                                  className={`inline-block p-3 rounded-lg text-sm max-w-[80%] break-words shadow-md
                                      ${msg.sender === "user"
                                          ? "bg-blue-600 text-white rounded-br-none" // User messages
                                          : "bg-gray-700 text-gray-100 rounded-bl-none" // Gemini messages
                                      }`}
                              >
                                  {msg.message}
                              </span>
                          </div>
                      ))}
                      {isLoadingChat && (
                          <div className="text-left text-gray-500 italic mt-2">
                              Gemini is thinking...
                          </div>
                      )}
                      <div ref={chatMessagesEndRef} /> {/* Scroll target */}
                  </div>
                  <div className="flex mt-4 items-center"> {/* Increased margin-top, added items-center for alignment */}
                      <input
                          type="text"
                          value={userInput}
                          onChange={(e) => setUserInput(e.target.value)}
                          onKeyPress={(e) => {
                              if (e.key === "Enter" && userInput.trim() && !isLoadingChat) {
                                  handleSendMessage();
                              }
                          }}
                          placeholder="Ask Gemini about this district..."
                          className="flex-1 p-3 rounded-l-lg bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-pink-500 placeholder-gray-400 text-base" // Larger padding, better placeholder, text size
                          disabled={isLoadingChat} // Disable input while loading
                      />
                      <button
                          onClick={handleSendMessage}
                          className="px-5 py-3 bg-pink-600 rounded-r-lg hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500 font-semibold text-base" // Larger padding, font-weight, text size
                          disabled={isLoadingChat || !userInput.trim()} // Disable button while loading or if input is empty
                      >
                          Send
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

export default Drawer;