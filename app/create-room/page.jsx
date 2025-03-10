"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { useRoom } from "@/context/RoomContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/Header"; // Assuming you have a Header component

export default function CreateRoomPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [isCreating, setIsCreating] = useState(false);
  const [topic, setTopic] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("50");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const { createRoom } = useRoom();
  const router = useRouter();
  const { toast } = useToast();
  const dropdownRef = useRef(null);

  const TOPICS = [
    "Technology",
    "Business",
    "Science",
    "Health",
    "Education",
    "Entertainment",
    "Sports",
    "Politics",
    "Art",
    "Music",
    "Gaming",
    "Travel",
    "Food",
    "Fashion",
    "General",
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Room title is required",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const maxParts = parseInt(maxParticipants, 10);
      const roomData = {
        title: title.trim(),
        description: description.trim(),
        isPrivate,
        topic: topic || "General",
        maxParticipants: isNaN(maxParts) ? 50 : Math.min(Math.max(maxParts, 2), 100),
        ...(isScheduling && {
          scheduledFor: scheduledDate.toISOString(),
        }),
      };

      const newRoom = await createRoom(roomData);

      toast({
        title: isScheduling ? "Room scheduled" : "Room created",
        description: isScheduling
          ? "Your room has been scheduled successfully."
          : "Your room has been created successfully.",
      });

      resetForm();

      if (!isScheduling) {
        router.push(`/room/${newRoom.id}`);
      } else {
        router.push("/"); // Redirect to home or rooms list after scheduling
      }
    } catch (error) {
      console.error("Error creating room:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create room. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setIsPrivate(false);
    setIsScheduling(false);
    setScheduledDate(new Date());
    setTopic("");
    setMaxParticipants("50");
    setDropdownOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header /> {/* Assuming you have a header component */}
      <main className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold mb-6">
          {isScheduling ? "Schedule a Chat Room" : "Create a Chat Room"}
        </h1>
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Room Title</Label>
            <Input
              id="title"
              placeholder="What do you want to talk about?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={isCreating}
            />
          </div>

          {/* Custom Dropdown for Topic */}
          <div className="space-y-2">
            <Label htmlFor="topic">Topic</Label>
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                className={cn(
                  "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground",
                  isCreating && "cursor-not-allowed opacity-50",
                  dropdownOpen && "ring-2 ring-ring ring-offset-2"
                )}
                onClick={() => !isCreating && setDropdownOpen(!dropdownOpen)}
                disabled={isCreating}
              >
                <span>{topic || "Select a topic"}</span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </button>
              {dropdownOpen && (
                <div
                  className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md"
                  style={{ textSizeAdjust: "100%" }}
                >
                  {TOPICS.map((t) => (
                    <div
                      key={t}
                      className={cn(
                        "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                        topic === t && "bg-accent text-accent-foreground"
                      )}
                      onClick={() => {
                        setTopic(t);
                        setDropdownOpen(false);
                      }}
                    >
                      {t}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Add some details about your room"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={isCreating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxParticipants">Maximum Participants</Label>
            <Input
              id="maxParticipants"
              type="number"
              min="2"
              max="100"
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(e.target.value)}
              disabled={isCreating}
            />
            <p className="text-xs text-muted-foreground">
              Limit: 2-100 participants
            </p>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="scheduling" className="cursor-pointer">
              Schedule for later
            </Label>
            <Switch
              id="scheduling"
              checked={isScheduling}
              onCheckedChange={setIsScheduling}
              disabled={isCreating}
            />
          </div>

          {isScheduling && (
            <div className="space-y-2">
              <Label>Scheduled Date and Time</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal w-full",
                      !scheduledDate && "text-muted-foreground"
                    )}
                    disabled={isCreating}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduledDate
                      ? format(scheduledDate, "PPP 'at' HH:mm")
                      : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={scheduledDate}
                    onSelect={(date) => setScheduledDate(date || new Date())}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label htmlFor="private" className="cursor-pointer">
              Private Room
            </Label>
            <Switch
              id="private"
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
              disabled={isCreating}
            />
          </div>

          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/")}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating
                ? isScheduling
                  ? "Scheduling..."
                  : "Creating..."
                : isScheduling
                  ? "Schedule Chat Room"
                  : "Create Chat Room"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}