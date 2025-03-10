"use client";

import React, { useState } from "react";

const EMOJIS = [
  "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇",
  "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚",
  "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩",
  "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣",
  "👍", "👎", "👏", "👋", "✌️", "🤞", "🤟", "🤘", "👌", "🤌",
  "🖐️", "✋", "👐", "🙌", "🤲", "🫶", "❤️", "🔥", "⭐", "✨"
];

const EmojiPicker = ({ onSelectEmoji }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [recentEmojis, setRecentEmojis] = useState([]);

  const filteredEmojis = searchQuery 
    ? EMOJIS.filter(emoji => emoji.includes(searchQuery))
    : EMOJIS;

  const handleEmojiClick = (emoji) => {
    if (onSelectEmoji) {
      onSelectEmoji(emoji);
    }
    
    // Add to recent emojis
    setRecentEmojis(prev => {
      const updated = [emoji, ...prev.filter(e => e !== emoji)].slice(0, 8);
      return updated;
    });
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-lg border max-w-xs">
      <div className="mb-3">
        <input
          type="text"
          placeholder="Search emojis..."
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      {recentEmojis.length > 0 && (
        <div className="mb-3">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Recently Used</h3>
          <div className="grid grid-cols-8 gap-1">
            {recentEmojis.map((emoji, index) => (
              <button
                key={`recent-${index}`}
                className="w-8 h-8 flex items-center justify-center text-xl hover:bg-gray-100 rounded cursor-pointer"
                onClick={() => handleEmojiClick(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-8 gap-1">
        {filteredEmojis.map((emoji, index) => (
          <button
            key={index}
            className="w-8 h-8 flex items-center justify-center text-xl hover:bg-gray-100 rounded cursor-pointer transition-colors"
            onClick={() => handleEmojiClick(emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>
      
      {filteredEmojis.length === 0 && (
        <div className="py-4 text-center text-gray-500">
          No emojis found
        </div>
      )}
    </div>
  );
};

export default EmojiPicker;

// Usage example:
// import EmojiPicker from './EmojiPicker';
//
// function MyComponent() {
//   const handleSelectEmoji = (emoji) => {
//     console.log('Selected emoji:', emoji);
//     // Add emoji to your text input, message, etc.
//   };
//
//   return (
//     <div>
//       <EmojiPicker onSelectEmoji={handleSelectEmoji} />
//     </div>
//   );
// }