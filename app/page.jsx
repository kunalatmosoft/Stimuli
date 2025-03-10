"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useRoom } from "@/context/RoomContext";
import RoomCard from "@/components/rooms/RoomCard";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Search, TrendingUp, PlusCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link"; // Added for navigation to CreateRoomPage

export default function Home() {
  const { user, loading } = useAuth();
  const { activeRooms, trendingRooms, isLoadingRooms, searchRooms } = useRoom();
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [topicFilter, setTopicFilter] = useState("");
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (activeRooms.length > 0) {
      filterRooms();
    }
  }, [activeRooms, searchQuery, topicFilter]);

  const filterRooms = async () => {
    try {
      if (!searchQuery && !topicFilter) {
        setFilteredRooms(activeRooms);
        return;
      }

      const filters = {};
      if (topicFilter && topicFilter !== "all") { // Handle "all" case
        filters.topic = topicFilter;
      }

      const results = await searchRooms(searchQuery, filters);
      setFilteredRooms(results);
    } catch (error) {
      console.error("Error filtering rooms:", error);
      toast({
        title: "Error",
        description: "Failed to filter rooms. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    filterRooms();
  };

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

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const upcomingRooms = filteredRooms.filter(
    (room) => room.scheduledFor && new Date(room.scheduledFor) > new Date()
  );
  const liveRooms = filteredRooms.filter(
    (room) => !room.scheduledFor || new Date(room.scheduledFor) <= new Date()
  );
  const followingRooms = filteredRooms.filter(
    (room) =>
      Array.isArray(room.members) &&
      Array.isArray(user.following) &&
      room.members.some((memberId) => user.following.includes(memberId))
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">
            Good {getTimeOfDay()}, {user.displayName}
          </h1>
          <Link href="/create-room">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create a Room
            </Button>
          </Link>
        </div>

        <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center">
          <form onSubmit={handleSearch} className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search rooms..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>

          <Select value={topicFilter} onValueChange={setTopicFilter}>
            <SelectTrigger
              className="w-full md:w-[180px]"
              aria-label="Filter rooms by topic"
            >
              <SelectValue placeholder="Filter by topic" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Topics</SelectItem>
              {TOPICS.map((topic) => (
                <SelectItem key={topic} value={topic}>
                  {topic}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {trendingRooms.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Trending Rooms</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trendingRooms.map((room) => (
                <RoomCard key={room.id} room={room} />
              ))}
            </div>
          </div>
        )}

        <Tabs defaultValue="live" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="live">Live Now</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="following">Following</TabsTrigger>
          </TabsList>

          <TabsContent value="live">
            {isLoadingRooms ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : liveRooms.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {liveRooms.map((room) => (
                  <RoomCard key={room.id} room={room} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <h3 className="text-xl font-medium mb-2">
                  No live rooms at the moment
                </h3>
                <p className="text-muted-foreground mb-6">
                  Why not start your own room?
                </p>
                <Link href="/create-room">
                  <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Start a Room
                  </Button>
                </Link>
              </div>
            )}
          </TabsContent>

          <TabsContent value="upcoming">
            {isLoadingRooms ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : upcomingRooms.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingRooms.map((room) => (
                  <RoomCard key={room.id} room={room} isUpcoming />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <h3 className="text-xl font-medium mb-2">No upcoming rooms</h3>
                <p className="text-muted-foreground mb-6">
                  Schedule a room for later
                </p>
                <Link href="/create-room">
                  <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Schedule a Room
                  </Button>
                </Link>
              </div>
            )}
          </TabsContent>

          <TabsContent value="following">
            {isLoadingRooms ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : followingRooms.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {followingRooms.map((room) => (
                  <RoomCard key={room.id} room={room} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <h3 className="text-xl font-medium mb-2">
                  No rooms from people you follow
                </h3>
                <p className="text-muted-foreground mb-6">
                  Follow more people to see their rooms
                </p>
                <Button
                  variant="outline"
                  onClick={() => router.push("/explore")}
                >
                  Explore users
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}