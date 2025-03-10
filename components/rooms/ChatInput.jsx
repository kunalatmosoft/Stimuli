"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Smile, Image, Paperclip } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const EMOJI_CATEGORIES = {
  smileys: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘"],
  gestures: ["👍", "👎", "👌", "✌️", "🤞", "👊", "✊", "🤛", "🤜", "🤟", "👏", "🙌", "👐", "🤲", "🙏"],
  animals: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🦁", "🐮", "🐷", "🐸", "🐵", "🐔", "🐧"],
  food: ["🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅"],
  activities: ["⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🏓", "🏸", "🏒", "🏑", "🥍", "🏏"],
  travel: ["🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚐", "🚚", "🚛", "🚜", "🛴", "🚲", "🛵"],
  symbols: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟"],
}

export default function ChatInput({ onSendMessage, disabled = false }) {
  const [message, setMessage] = useState("")
  const [currentEmojiCategory, setCurrentEmojiCategory] = useState("smileys")
  const inputRef = useRef(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!message.trim()) return

    onSendMessage(message)
    setMessage("")
  }

  const insertEmoji = (emoji) => {
    setMessage((prev) => prev + emoji)
    inputRef.current?.focus()
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-center">
      <div className="flex gap-1">
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" size="icon" variant="ghost" className="h-9 w-9 rounded-full">
              <Smile className="h-5 w-5 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <div className="p-2 border-b">
              <div className="flex gap-1 overflow-x-auto pb-2">
                {Object.keys(EMOJI_CATEGORIES).map((category) => (
                  <Button
                    key={category}
                    type="button"
                    variant={currentEmojiCategory === category ? "default" : "ghost"}
                    size="sm"
                    className="text-xs"
                    onClick={() => setCurrentEmojiCategory(category)}
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>
            <div className="p-2 grid grid-cols-8 gap-1 max-h-40 overflow-y-auto">
              {EMOJI_CATEGORIES[currentEmojiCategory].map((emoji, index) => (
                <button
                  key={index}
                  type="button"
                  className="text-xl p-1 hover:bg-secondary rounded cursor-pointer"
                  onClick={() => insertEmoji(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Button type="button" size="icon" variant="ghost" className="h-9 w-9 rounded-full">
          <Image className="h-5 w-5 text-muted-foreground" />
        </Button>

        <Button type="button" size="icon" variant="ghost" className="h-9 w-9 rounded-full">
          <Paperclip className="h-5 w-5 text-muted-foreground" />
        </Button>
      </div>

      <Input
        ref={inputRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a message..."
        className="flex-1"
        disabled={disabled}
      />

      <Button type="submit" disabled={!message.trim() || disabled}>
        <Send className="h-4 w-4" />
      </Button>
    </form>
  )
}

