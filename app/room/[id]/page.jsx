"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams } from 'next/navigation';
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useRoom } from "@/context/RoomContext";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase/config";
import { LogOut, X, Shield, UserMinus, Share2, Copy, Info, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import ChatInput from "@/components/rooms/ChatInput";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function RoomPage() {
  const params = useParams();
  const id = params?.id || "";

  const { user, loading } = useAuth();
  const {
    currentRoom,
    messages,
    joinRoom,
    leaveRoom,
    sendMessage,
    promoteToModerator,
    removeFromRoom,
    endRoom,
  } = useRoom();
  const [roomUsers, setRoomUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [showRoomInfo, setShowRoomInfo] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isCreator, setIsCreator] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const messagesEndRef = useRef(null);
  const router = useRouter();
  const { toast } = useToast();
  const connectivityRef = useRef(null);
  const hasJoinedRef = useRef(false);

  // Improved Firebase connectivity monitoring
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "status", "onlineCheck"),
      (doc) => {
        if (connectivityRef.current === false) {
          toast({
            title: "Online",
            description: "Your connection has been restored.",
            variant: "success",
          });
        }
        setIsOnline(true);
        connectivityRef.current = true;
      },
      (error) => {
        console.error("Firestore connectivity error:", error);
        setIsOnline(false);
        connectivityRef.current = false;
        toast({
          title: "Offline",
          description: "You're offline. Using cached data. Some features may be limited.",
          variant: "warning",
        });
      }
    );

    // Add network status listeners as backup
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  // Check if room exists and user permissions before joining
  useEffect(() => {
    const checkRoomAndJoin = async () => {
      if (!user || loading || hasJoinedRef.current) return;
      
      try {
        // Check if room exists and get initial data
        const roomDoc = await getDoc(doc(db, "rooms", id));
        if (!roomDoc.exists()) {
          toast({
            title: "Room not found",
            description: "This room no longer exists or you don't have access.",
            variant: "destructive",
          });
          router.push("/");
          return;
        }
        
        const roomData = roomDoc.data();
        // Set creator status early
        if (roomData.createdBy === user.uid) {
          setIsCreator(true);
        }
        
        // Set moderator status early
        if (Array.isArray(roomData.moderators) && roomData.moderators.includes(user.uid)) {
          setIsModerator(true);
        }
        
        // Only join if not already in room
        if (!currentRoom || currentRoom.id !== id) {
          hasJoinedRef.current = true;
          await joinRoom(id);
          toast({
            title: "Joined Room",
            description: `Successfully joined ${roomData.title || "the room"}`,
          });
        }
      } catch (error) {
        console.error("Error checking/joining room:", error);
        toast({
          title: "Error joining room",
          description: error.code === "unavailable" && !isOnline
            ? "You're offline. Please check your internet connection."
            : error.message,
          variant: "destructive",
        });
        router.push("/");
      }
    };
    
    if (user && id && !loading) {
      checkRoomAndJoin();
    }
    
    // Cleanup function - only leave room when actually navigating away from page
    return () => {
      // Only execute leaveRoom if we're navigating to a different page, not just reloading
      const isNavigatingAway = window.location.pathname !== `/room/${id}`;
      if (isNavigatingAway && currentRoom && currentRoom.id === id) {
        leaveRoom();
        hasJoinedRef.current = false;
      }
    };
  }, [id, user, loading, currentRoom, router, toast, joinRoom, leaveRoom, isOnline]);

  // Update room permissions when currentRoom changes
  useEffect(() => {
    if (currentRoom) {
      setIsCreator(currentRoom.createdBy === user?.uid);
      setIsModerator(
        Array.isArray(currentRoom.moderators) && 
        currentRoom.moderators.includes(user?.uid)
      );
    }
  }, [currentRoom, user]);

  // Fetch room users when currentRoom updates
  useEffect(() => {
    if (currentRoom) {
      fetchRoomUsers();
    }
  }, [currentRoom]);

  // Scroll to bottom when messages update
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchRoomUsers = async () => {
    setIsLoadingUsers(true);
    try {
      if (!Array.isArray(currentRoom?.members)) {
        setRoomUsers([]);
        setIsLoadingUsers(false);
        return;
      }

      const userPromises = currentRoom.members.map((uid) =>
        getDoc(doc(db, "users", uid))
      );
      
      const userDocs = await Promise.all(userPromises);
      const users = userDocs
        .filter((doc) => doc.exists())
        .map((doc) => ({ id: doc.id, ...doc.data() }));

      setRoomUsers(users);
    } catch (error) {
      console.error("Error fetching room users:", error);
      toast({
        title: "Error",
        description:
          error.code === "unavailable" && !isOnline
            ? "Offline: Showing cached users if available."
            : "Failed to load room participants.",
        variant: "destructive",
      });
      // Fallback to cached data if available
      if (currentRoom?.members) {
        setRoomUsers(
          currentRoom.members.map((uid) => ({
            id: uid,
            displayName: "Unknown (Offline)",
          }))
        );
      }
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleLeaveRoom = async () => {
    try {
      await leaveRoom();
      hasJoinedRef.current = false;
      router.push("/");
      toast({
        title: "Left Room",
        description: "You have left the room.",
      });
    } catch (error) {
      console.error("Error leaving room:", error);
      toast({
        title: "Error leaving room",
        description:
          error.code === "unavailable" && !isOnline
            ? "Offline: You'll be removed when you reconnect."
            : error.message,
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = async (content) => {
    try {
      // Create message index if not already created
      await sendMessage(content);
    } catch (error) {
      console.error("Error sending message:", error);
      
      // Handle Firebase index errors specifically
      if (error.code === "failed-precondition" && error.message.includes("requires an index")) {
        toast({
          title: "Database index required",
          description: "The application needs to create a database index. Please contact the administrator with this error.",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Error sending message",
        description:
          error.code === "unavailable" && !isOnline
            ? "Offline: Message will sync when you're back online."
            : error.message,
        variant: "destructive",
      });

      // Queue message locally if offline
      if (!isOnline) {
        toast({
          title: "Message queued",
          description: "Your message will be sent when you reconnect.",
          variant: "info",
        });
      }
    }
  };

  const handlePromoteUser = async (userId) => {
    try {
      await promoteToModerator(userId);
      toast({
        title: "User promoted",
        description: "User has been promoted to moderator.",
      });
    } catch (error) {
      console.error("Error promoting user:", error);
      toast({
        title: "Error",
        description:
          error.code === "unavailable" && !isOnline
            ? "Offline: Action will apply when you reconnect."
            : error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveUser = async (userId) => {
    try {
      await removeFromRoom(userId);
      toast({
        title: "User removed",
        description: "User has been removed from the room.",
      });
    } catch (error) {
      console.error("Error removing user:", error);
      toast({
        title: "Error",
        description:
          error.code === "unavailable" && !isOnline
            ? "Offline: Action will apply when you reconnect."
            : error.message,
        variant: "destructive",
      });
    }
  };

  const handleEndRoom = async () => {
    try {
      await endRoom(id);
      hasJoinedRef.current = false;
      router.push("/");
      toast({
        title: "Room Ended",
        description: "The room has been ended.",
      });
    } catch (error) {
      console.error("Error ending room:", error);
      toast({
        title: "Error ending room",
        description:
          error.code === "unavailable" && !isOnline
            ? "Offline: Room will end when you reconnect."
            : error.message,
        variant: "destructive",
      });
    }
  };

  const handleShareRoom = () => {
    const roomUrl = `${window.location.origin}/room/${id}`;
    if (navigator.share) {
      navigator
        .share({
          title: currentRoom.title,
          text: `Join me in ${currentRoom.title} on ChatClub!`,
          url: roomUrl,
        })
        .catch((err) => {
          console.error("Error sharing:", err);
        });
    } else {
      navigator.clipboard.writeText(roomUrl).then(() => {
        toast({
          title: "Link copied",
          description: "Room link copied to clipboard!",
        });
      });
    }
  };

  if (loading || !currentRoom) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.createdAt).toLocaleDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="container py-6 flex-1 flex flex-col">
        {!isOnline && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6">
            <p>You&apos;re offline. Using cached data. Actions will sync when you&apos;re back online.</p>
          </div>
        )}
        <Card className="overflow-hidden flex flex-col flex-1">
          <div className="p-6 bg-primary/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">{currentRoom.title}</h1>
                  {currentRoom.topic && (
                    <Badge variant="outline">{currentRoom.topic}</Badge>
                  )}
                  {currentRoom.isPrivate && (
                    <Badge variant="secondary">
                      <Lock className="h-3 w-3 mr-1" />
                      Private
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground">
                  {currentRoom.description || "No description"}
                </p>
              </div>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowRoomInfo(true)}
                      aria-label="Room Information"
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Room Information</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleShareRoom} variant="outline">
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>

              {isCreator && (
                <Button onClick={handleEndRoom} variant="destructive" disabled={!isOnline}>
                  <X className="mr-2 h-4 w-4" />
                  End Room
                </Button>
              )}

              <Button onClick={handleLeaveRoom} variant="outline">
                <LogOut className="mr-2 h-4 w-4" />
                Leave
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] flex-1 max-h-[calc(100vh-250px)]">
            {/* Chat Messages */}
            <div className="flex flex-col p-4 overflow-hidden">
              <div className="flex-1 overflow-y-auto mb-4 space-y-4">
                {Object.keys(groupedMessages).length > 0 ? (
                  Object.entries(groupedMessages).map(([date, dateMessages]) => (
                    <div key={date} className="space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="h-px flex-1 bg-border"></div>
                        <p className="text-xs text-muted-foreground">{date}</p>
                        <div className="h-px flex-1 bg-border"></div>
                      </div>

                      {dateMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.senderId === user.uid
                              ? "justify-end"
                              : "justify-start"
                          } ${message.type === "system" ? "justify-center" : ""}`}
                        >
                          {message.type === "system" ? (
                            <div className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">
                              {message.content}
                            </div>
                          ) : (
                            <div
                              className={`flex max-w-[80%] ${
                                message.senderId === user.uid
                                  ? "flex-row-reverse"
                                  : "flex-row"
                              } items-start gap-2`}
                            >
                              <Avatar className="h-8 w-8 mt-1">
                                <AvatarImage
                                  src={message.senderPhoto}
                                  alt={message.senderName}
                                />
                                <AvatarFallback>
                                  {message.senderName?.[0]?.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div
                                className={`rounded-lg px-4 py-2 ${
                                  message.senderId === user.uid
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-secondary"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <p className="text-xs font-medium">
                                    {message.senderName}
                                  </p>
                                  <span className="text-xs opacity-70">
                                    {formatDistanceToNow(
                                      new Date(message.createdAt),
                                      { addSuffix: true }
                                    )}
                                  </span>
                                </div>
                                <p>{message.content}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">
                      No messages yet. Start the conversation!
                    </p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <ChatInput onSendMessage={handleSendMessage} disabled={!isOnline} />
            </div>

            {/* Room Members */}
            <div className="border-l p-4 overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">
                Members ({roomUsers.length})
              </h2>

              {isLoadingUsers ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="space-y-3">
                  {roomUsers.map((roomUser) => (
                    <div
                      key={roomUser.id}
                      className="flex items-center justify-between"
                    >
                      <div
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => router.push(`/profile/${roomUser.id}`)}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={roomUser.photoURL}
                            alt={roomUser.displayName}
                          />
                          <AvatarFallback>
                            {roomUser.displayName?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {roomUser.displayName}
                          </p>
                          <div className="flex items-center gap-1">
                            {roomUser.id === currentRoom.createdBy && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                Creator
                              </span>
                            )}
                            {Array.isArray(currentRoom.moderators) &&
                              currentRoom.moderators.includes(roomUser.id) &&
                              roomUser.id !== currentRoom.createdBy && (
                                <span className="text-xs bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded-full">
                                  Mod
                                </span>
                              )}
                          </div>
                        </div>
                      </div>

                      {(isCreator || isModerator) &&
                        roomUser.id !== user.uid && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                disabled={!isOnline}
                              >
                                <span className="sr-only">Open menu</span>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="h-4 w-4"
                                >
                                  <circle cx="12" cy="12" r="1" />
                                  <circle cx="12" cy="5" r="1" />
                                  <circle cx="12" cy="19" r="1" />
                                </svg>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {isCreator &&
                                Array.isArray(currentRoom.moderators) &&
                                !currentRoom.moderators.includes(
                                  roomUser.id
                                ) && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handlePromoteUser(roomUser.id)
                                    }
                                  >
                                    <Shield className="mr-2 h-4 w-4" />
                                    <span>Make Moderator</span>
                                  </DropdownMenuItem>
                                )}
                              <DropdownMenuItem
                                onClick={() => handleRemoveUser(roomUser.id)}
                              >
                                <UserMinus className="mr-2 h-4 w-4" />
                                <span>Remove from Room</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      </main>

      <Dialog open={showRoomInfo} onOpenChange={setShowRoomInfo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Room Information</DialogTitle>
            <DialogDescription>Details about this chat room</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <h3 className="font-medium mb-1">Title</h3>
              <p>{currentRoom.title}</p>
            </div>

            {currentRoom.description && (
              <div>
                <h3 className="font-medium mb-1">Description</h3>
                <p>{currentRoom.description}</p>
              </div>
            )}

            <div>
              <h3 className="font-medium mb-1">Topic</h3>
              <p>{currentRoom.topic || "General"}</p>
            </div>

            <div>
              <h3 className="font-medium mb-1">Created</h3>
              <p>
                {currentRoom.createdAt
                  ? formatDistanceToNow(
                      new Date(currentRoom.createdAt.seconds * 1000),
                      { addSuffix: true }
                    )
                  : "Recently"}
              </p>
            </div>

            <div>
              <h3 className="font-medium mb-1">Room Type</h3>
              <p>{currentRoom.isPrivate ? "Private" : "Public"}</p>
            </div>

            <div>
              <h3 className="font-medium mb-1">Participants</h3>
              <p>
                {Array.isArray(currentRoom.members)
                  ? currentRoom.members.length
                  : 0}{" "}
                / {currentRoom.maxParticipants || "Unlimited"}
              </p>
            </div>

            <div>
              <h3 className="font-medium mb-1">Room ID</h3>
              <div className="flex items-center gap-2">
                <code className="bg-muted p-1 rounded text-sm">{id}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(id);
                    toast({
                      title: "Copied",
                      description: "Room ID copied to clipboard",
                    });
                  }}
                  aria-label="Copy Room ID"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}