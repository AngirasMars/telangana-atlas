// src/components/GeminiChatPanel.js
import React, { useEffect, useState, useRef } from "react";

const GeminiChatPanel = ({ selectedDistrict, isCompareMode, comparisonContext }) => {
  const [chatHistory, setChatHistory] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);

  const sendToGemini = async (message, isSystem = false) => {
    setIsLoading(true);

    try {
      const context = chatHistory
        .map(msg => `${msg.sender}: ${msg.message}`)
        .join("\n");

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          districtName: selectedDistrict?.district || "Telangana",
          context,
        }),
      });

      const data = await response.json();
      const rawReply = data.reply;

      const cleanedReply = rawReply.replace(/```json[\s\S]*?```/, "").trim();

      setChatHistory(prev => [
        ...prev,
        ...(isSystem ? [] : [{ sender: "user", message }]),
        { sender: "gemini", message: cleanedReply }
      ]);

      if (data.pins && Array.isArray(data.pins) && data.pins.length > 0) {
        window.dispatchEvent(new CustomEvent("fly-to-pins", { detail: data.pins }));
      }

      const jsonMatch = rawReply.match(/```json\s*({[\s\S]*?})\s*```/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]);
        const location = parsed.location || "";
        const incident = parsed.incident || "";

        if (location || incident) {
          (async () => {
            const pinRes = await fetch("/api/get-matching-pins", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ location, incident })
            });
            const pinData = await pinRes.json();
            
            // Log pins for debugging
            console.log("Gemini pins:", pinData.pins);

            if (pinData.pins && pinData.pins.length > 0) {
              window.dispatchEvent(
                new CustomEvent("fly-to-pins", {
                  detail: pinData.pins,
                })
              );
            }
          })();
        }
      }

    } catch (err) {
      console.error("Gemini error:", err);
      setChatHistory(prev => [...prev, { sender: "gemini", message: "Oops, something went wrong." }]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let message = "";

    if (isCompareMode && comparisonContext) {
      message = `Compare ${comparisonContext.left} and ${comparisonContext.right} districts in Telangana. Provide a quick, insightful difference in terms of population, literacy, urbanization, and any other standout metrics.`;
    } else if (selectedDistrict) {
      message = `Greet the user with a short fact about ${selectedDistrict.district}. Population: ${selectedDistrict.population}, Density: ${selectedDistrict.density}, Literacy: ${selectedDistrict.literacy_rate}%.`;
    } else {
      message = `Suggest the top 3 most livable districts in Telangana based on literacy, urban percentage, and population density.`;
    }

    if (message) {
      sendToGemini(message, true);
    }
  }, [selectedDistrict, isCompareMode, comparisonContext]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const handleSend = () => {
    if (!userInput.trim() || isLoading) return;
    sendToGemini(userInput.trim());
    setUserInput("");
  };

  return (
    <div className="w-full p-4 bg-gray-800 rounded-xl shadow-md border border-gray-700 max-h-[65vh] overflow-hidden flex flex-col">
      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {chatHistory.map((msg, i) => (
          <div key={i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
            <span className={`max-w-[70%] px-4 py-2 rounded-lg text-sm shadow
              ${msg.sender === "user"
                ? "bg-blue-600 text-white rounded-br-none"
                : "bg-gray-700 text-gray-100 rounded-bl-none"}`}>
              {msg.message}
            </span>
          </div>
        ))}
        {isLoading && (
          <div className="text-left text-gray-400 italic">Gemini is thinking...</div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="flex mt-4 items-center">
        <input
          type="text"
          className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-l-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-pink-500"
          placeholder="Ask Gemini anything..."
          value={userInput}
          onChange={e => setUserInput(e.target.value)}
          onKeyPress={e => {
            if (e.key === "Enter") handleSend();
          }}
          disabled={isLoading}
        />
        <button
          className="px-5 py-2 bg-pink-600 rounded-r-md hover:bg-pink-700 focus:outline-none"
          onClick={handleSend}
          disabled={isLoading}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default GeminiChatPanel;