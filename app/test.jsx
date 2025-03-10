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
import { doc, getDoc, onSnapshot, deleteDoc, collection, query, where, getDocs, writeBatch, updateDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import { LogOut, X, Shield, UserMinus, Share2, Copy, Info, Lock, Download, Settings, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import ChatInput from "@/components/rooms/ChatInput";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
  const [showEndRoomDialog, setShowEndRoomDialog] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isCreator, setIsCreator] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [scrollable, setScrollable] = useState(true);
  const [isExportingChat, setIsExportingChat] = useState(false);
  const [roomSettings, setRoomSettings] = useState(false);
  const [isMember, setIsMember] = useState(true);
  const [updatingSettings, setUpdatingSettings] = useState(false);
  
  // Room settings form state
  const [settingsForm, setSettingsForm] = useState({
    title: "",
    description: "",
    topic: "",
    isPrivate: false,
    maxParticipants: 0
  });
  
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const membersContainerRef = useRef(null);
  const router = useRouter();
  const { toast } = useToast();
  const connectivityRef = useRef(null);
  const hasJoinedRef = useRef(false);
  const [autoScroll, setAutoScroll] = useState(true);

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
        
        // Check if user is a member of the room
        if (Array.isArray(roomData.members) && !roomData.members.includes(user.uid)) {
          setIsMember(false);
          toast({
            title: "Access Denied",
            description: "You are no longer a member of this room.",
            variant: "destructive",
          });
          router.push("/");
          return;
        }
        
        // Set creator status early
        if (roomData.createdBy === user.uid) {
          setIsCreator(true);
        }
        
        // Set moderator status early
        if (Array.isArray(roomData.moderators) && roomData.moderators.includes(user.uid)) {
          setIsModerator(true);
        }
        
        // Initialize settings form with current values
        setSettingsForm({
          title: roomData.title || "",
          description: roomData.description || "",
          topic: roomData.topic || "General",
          isPrivate: roomData.isPrivate || false,
          maxParticipants: roomData.maxParticipants || 0
        });
        
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
      setIsMember(
        Array.isArray(currentRoom.members) && 
        currentRoom.members.includes(user?.uid)
      );
    }
  }, [currentRoom, user]);

  // Listen for changes to room membership
  useEffect(() => {
    if (!id || !user) return;
    
    const unsubscribe = onSnapshot(
      doc(db, "rooms", id),
      (doc) => {
        if (doc.exists()) {
          const roomData = doc.data();
          // Check if user is still a member
          const stillMember = Array.isArray(roomData.members) && roomData.members.includes(user.uid);
          setIsMember(stillMember);
          
          if (!stillMember) {
            // User was removed from the room
            toast({
              title: "Removed from Room",
              description: "You have been removed from this room.",
              variant: "destructive",
            });
            router.push("/");
          }
        } else {
          // Room was deleted
          toast({
            title: "Room Closed",
            description: "This room has been closed by its creator.",
            variant: "info",
          });
          router.push("/");
        }
      },
      (error) => {
        console.error("Error listening to room:", error);
      }
    );
    
    return () => unsubscribe();
  }, [id, user, router, toast]);

  // Fetch room users when currentRoom updates
  useEffect(() => {
    if (currentRoom) {
      fetchRoomUsers();
    }
  }, [currentRoom]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (autoScroll) {
      scrollToBottom();
    }
  }, [messages, autoScroll]);

  // Setup scroll event listeners for auto-scroll decision
  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    if (!chatContainer) return;

    const handleScroll = () => {
      // Check if user has scrolled up (manual scrolling)
      const isAtBottom = chatContainer.scrollHeight - chatContainer.clientHeight <= chatContainer.scrollTop + 50;
      setAutoScroll(isAtBottom);
    };

    chatContainer.addEventListener('scroll', handleScroll);
    return () => chatContainer.removeEventListener('scroll', handleScroll);
  }, []);

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
    // Check if user is still a member of the room
    if (!isMember) {
      toast({
        title: "Cannot send message",
        description: "You are no longer a member of this room.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create message index if not already created
      await sendMessage(content);
      // Set auto-scroll to true whenever user sends a message
      setAutoScroll(true);
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

  const handleDeleteRoomData = async () => {
    if (!isCreator) {
      toast({
        title: "Permission Denied",
        description: "Only the room creator can delete this room.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setShowEndRoomDialog(false);
      
      // 1. Get all messages for this room
      const messagesQuery = query(
        collection(db, "messages"),
        where("roomId", "==", id)
      );
      const messagesSnapshot = await getDocs(messagesQuery);
      
      // 2. Create a batch for deleting all messages
      const batch = writeBatch(db);
      messagesSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      // 3. Delete the room document
      batch.delete(doc(db, "rooms", id));
      
      // 4. Execute the batch
      await batch.commit();
      
      // 5. Notify all members through endRoom (updates context)
      await endRoom(id);
      hasJoinedRef.current = false;
      
      // 6. Redirect to home
      router.push("/");
      
      toast({
        title: "Room Deleted",
        description: "The room and all its messages have been permanently deleted.",
        variant: "success"
      });
    } catch (error) {
      console.error("Error deleting room data:", error);
      toast({
        title: "Error deleting room",
        description: 
          error.code === "unavailable" && !isOnline
            ? "Offline: Cannot delete data while offline."
            : "Failed to delete room data. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleEndRoom = () => {
    // Open confirmation dialog
    setShowEndRoomDialog(true);
  };

  const handleExportChat = async () => {
    try {
      setIsExportingChat(true);
      
      // Format messages for export
      const exportData = {
        roomTitle: currentRoom.title,
        roomDescription: currentRoom.description,
        roomTopic: currentRoom.topic || "General",
        exportDate: new Date().toISOString(),
        messages: messages.map(msg => ({
          sender: msg.senderName,
          content: msg.content,
          timestamp: new Date(msg.createdAt).toISOString(),
          type: msg.type
        }))
      };
      
      // Create a blob with the JSON data
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      
      // Create a download link and trigger the download
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentRoom.title.replace(/\s+/g, '_')}_chat_export.json`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Chat Exported",
        description: "Chat history has been exported successfully.",
        variant: "success"
      });
    } catch (error) {
      console.error("Error exporting chat:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export chat history. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExportingChat(false);
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
  
  const handleSettingsChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettingsForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const handleSaveSettings = async () => {
    if (!isCreator && !isModerator) {
      toast({
        title: "Permission Denied",
        description: "Only creators and moderators can update room settings.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setUpdatingSettings(true);
      
      // Basic validation
      if (!settingsForm.title.trim()) {
        toast({
          title: "Invalid Title",
          description: "Room title cannot be empty.",
          variant: "destructive"
        });
        return;
      }
      
      // Prepare update data
      const roomUpdates = {
        title: settingsForm.title.trim(),
        description: settingsForm.description.trim(),
        topic: settingsForm.topic.trim() || "General",
        isPrivate: settingsForm.isPrivate,
        maxParticipants: parseInt(settingsForm.maxParticipants) || 0,
        updatedAt: new Date()
      };
      
      // Update room document
      await updateDoc(doc(db, "rooms", id), roomUpdates);
      
      setRoomSettings(false);
      toast({
        title: "Settings Updated",
        description: "Room settings have been updated successfully.",
        variant: "success"
      });
      
      // Add system message about updated settings
      await sendMessage("Room settings were updated.", "system");
      
    } catch (error) {
      console.error("Error updating room settings:", error);
      toast({
        title: "Update Failed",
        description: 
          error.code === "unavailable" && !isOnline
            ? "Offline: Cannot update settings while offline."
            : "Failed to update room settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUpdatingSettings(false);
    }
  };

  const toggleScrollable = () => {
    setScrollable(!scrollable);
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
        
        {!isMember && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
            <p>You have been removed from this room. You can no longer send messages.</p>
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
              {(isCreator || isModerator) && (
                <Button 
                  variant="outline" 
                  onClick={() => setRoomSettings(true)}
                  disabled={!isOnline}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Room Settings
                </Button>
              )}
              
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
              <div 
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto mb-4 space-y-4 custom-scrollbar"
                style={{ 
                  maxHeight: "calc(100vh - 310px)",
                  scrollBehavior: scrollable ? "smooth" : "auto"
                }}
              >
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

              {!autoScroll && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mb-2 self-center"
                  onClick={() => {
                    setAutoScroll(true);
                    scrollToBottom();
                  }}
                >
                  Scroll to latest messages
                </Button>
              )}

              <ChatInput 
                onSendMessage={handleSendMessage} 
                disabled={!isOnline || !isMember} 
              />
            </div>

            {/* Room Members */}
            <div className="border-l p-4 overflow-hidden flex flex-col">
              <h2 className="text-xl font-bold mb-4">
                Members ({roomUsers.length})
              </h2>

              {isLoadingUsers ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div 
                  ref={membersContainerRef}
                  className="space-y-3 overflow-y-auto custom-scrollbar flex-1"
                  style={{ maxHeight: "calc(100vh - 350px)" }}
                >
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
    {roomUser.id === user.uid && " (You)"}
    {roomUser.id === currentRoom.createdBy && (
      <Badge variant="outline" className="ml-2">
        Creator
      </Badge>
    )}
    {Array.isArray(currentRoom.moderators) &&
      currentRoom.moderators.includes(roomUser.id) &&
      roomUser.id !== currentRoom.createdBy && (
        <Badge variant="outline" className="ml-2">
          Moderator
        </Badge>
      )}
  </p>
</div>
</div>

{(isCreator || (isModerator && roomUser.id !== currentRoom.createdBy)) && 
  roomUser.id !== user.uid && (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon">
        <Settings className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      {isCreator && !currentRoom.moderators?.includes(roomUser.id) && (
        <DropdownMenuItem 
          onClick={() => handlePromoteUser(roomUser.id)}
          disabled={!isOnline}
        >
          <Shield className="mr-2 h-4 w-4" />
          Make Moderator
        </DropdownMenuItem>
      )}
      <DropdownMenuItem 
        onClick={() => handleRemoveUser(roomUser.id)}
        className="text-destructive"
        disabled={!isOnline}
      >
        <UserMinus className="mr-2 h-4 w-4" />
        Remove from Room
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
)}
</div>
))}
</div>
)}

<div className="mt-4">
  <Button 
    variant="ghost" 
    size="sm" 
    onClick={handleExportChat}
    className="w-full"
    disabled={isExportingChat}
  >
    {isExportingChat ? (
      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current"></div>
    ) : (
      <>
        <Download className="mr-2 h-4 w-4" />
        Export Chat History
      </>
    )}
  </Button>
</div>
</div>
</div>
</Card>
</main>

{/* Room Info Dialog */}
<Dialog open={showRoomInfo} onOpenChange={setShowRoomInfo}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Room Information</DialogTitle>
      <DialogDescription>
        Details about this chat room.
      </DialogDescription>
    </DialogHeader>
    <div className="space-y-4">
      <div>
        <h3 className="font-medium">Room Title</h3>
        <p>{currentRoom.title}</p>
      </div>
      <div>
        <h3 className="font-medium">Description</h3>
        <p>{currentRoom.description || "No description provided"}</p>
      </div>
      <div>
        <h3 className="font-medium">Topic</h3>
        <p>{currentRoom.topic || "General"}</p>
      </div>
      <div>
        <h3 className="font-medium">Created</h3>
        <div>
          {currentRoom.createdAt && !isNaN(new Date(currentRoom.createdAt).getTime())
            ? formatDistanceToNow(new Date(currentRoom.createdAt), {
                addSuffix: true,
              })
            : "Unknown"}
        </div>
      </div>
      <div>
        <h3 className="font-medium">Visibility</h3>
        <p>{currentRoom.isPrivate ? "Private Room" : "Public Room"}</p>
      </div>
      <div>
        <h3 className="font-medium">Members</h3>
        <p>{roomUsers.length} participants</p>
      </div>
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setShowRoomInfo(false)}>
        Close
      </Button>
      <Button onClick={handleShareRoom}>
        <Share2 className="mr-2 h-4 w-4" />
        Share
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

{/* End Room Dialog */}
<AlertDialog open={showEndRoomDialog} onOpenChange={setShowEndRoomDialog}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>End this room?</AlertDialogTitle>
      <AlertDialogDescription>
        This action is irreversible. The room and all its messages will be permanently deleted for all participants.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleDeleteRoomData}>
        Yes, end this room
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

{/* Room Settings Dialog */}
<Dialog open={roomSettings} onOpenChange={setRoomSettings}>
  <DialogContent className="sm:max-w-lg">
    <DialogHeader>
      <DialogTitle>Room Settings</DialogTitle>
      <DialogDescription>
        Customize room properties and permissions
      </DialogDescription>
    </DialogHeader>
    
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <Label htmlFor="title">Room Title</Label>
        <Input 
          id="title" 
          name="title"
          value={settingsForm.title} 
          onChange={handleSettingsChange}
          placeholder="Enter room title"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea 
          id="description" 
          name="description"
          value={settingsForm.description} 
          onChange={handleSettingsChange}
          placeholder="Enter room description"
          rows={3}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="topic">Topic</Label>
        <Input 
          id="topic" 
          name="topic"
          value={settingsForm.topic} 
          onChange={handleSettingsChange}
          placeholder="Enter room topic (e.g. Gaming, Technology, etc.)"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="maxParticipants">Maximum Participants (0 for unlimited)</Label>
        <Input 
          id="maxParticipants" 
          name="maxParticipants"
          type="number"
          min="0"
          value={settingsForm.maxParticipants} 
          onChange={handleSettingsChange}
        />
      </div>
      
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="isPrivate">Private Room</Label>
          <p className="text-xs text-muted-foreground">Private rooms are only visible to invited members</p>
        </div>
        <Switch 
          id="isPrivate" 
          name="isPrivate"
          checked={settingsForm.isPrivate} 
          onCheckedChange={(checked) => setSettingsForm(prev => ({...prev, isPrivate: checked}))}
        />
      </div>
    </div>
    
    <DialogFooter>
      <Button variant="outline" onClick={() => setRoomSettings(false)}>
        Cancel
      </Button>
      <Button onClick={handleSaveSettings} disabled={updatingSettings}>
        {updatingSettings ? (
          <span className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current"></div>
            Saving...
          </span>
        ) : "Save Changes"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

</div>
);
}