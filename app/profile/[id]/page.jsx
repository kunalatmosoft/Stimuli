"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore"
import { db } from "@/firebase/config"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Header from "@/components/layout/Header"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDistanceToNow } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import { MessageSquare, UserPlus, UserMinus } from "lucide-react"
import RoomCard from "@/components/rooms/RoomCard"
import React from "react" // Add this import

export default function UserProfile({ params: paramsPromise }) {
  // Unwrap the params Promise using React.use()
  const params = React.use(paramsPromise)
  const id = params?.id || ""
  const { user, loading, followUser, unfollowUser } = useAuth()
  const [profileUser, setProfileUser] = useState(null)
  const [userRooms, setUserRooms] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
      return
    }

    const fetchUser = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", id))

        if (userDoc.exists()) {
          setProfileUser({ id: userDoc.id, ...userDoc.data() })
        } else {
          toast({
            title: "User not found",
            description: "The requested user profile does not exist.",
            variant: "destructive",
          })
          router.push("/")
        }
      } catch (error) {
        console.error("Error fetching user:", error)
        toast({
          title: "Error",
          description: "Failed to load user profile.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    const fetchUserRooms = async () => {
      try {
        const roomsQuery = query(collection(db, "rooms"), where("createdBy", "==", id), where("status", "==", "active"))
        const roomsSnapshot = await getDocs(roomsQuery)
        const roomsData = roomsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setUserRooms(roomsData)
      } catch (error) {
        console.error("Error fetching user rooms:", error)
      }
    }

    if (!loading && user && id) {
      fetchUser()
      fetchUserRooms()
    }
  }, [id, loading, user, router, toast])

  const handleFollow = async () => {
    try {
      await followUser(id)
      toast({
        title: "Success",
        description: `You are now following ${profileUser.displayName}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleUnfollow = async () => {
    try {
      await unfollowUser(id)
      toast({
        title: "Success",
        description: `You are no longer following ${profileUser.displayName}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleMessage = () => {
    toast({
      title: "Coming soon",
      description: "Direct messaging will be available in a future update.",
    })
  }

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  const isCurrentUser = user.uid === id
  const isFollowing = Array.isArray(user.following) && user.following.includes(id)

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-6">
        <Card className="rounded-lg overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-primary to-primary/50"></div>
          <div className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Avatar className="h-24 w-24 border-4 border-background -mt-16">
                <AvatarImage src={profileUser?.photoURL} alt={profileUser?.displayName} />
                <AvatarFallback>{profileUser?.displayName?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>

              <div className="flex-1 mt-4 sm:mt-0">
                <h1 className="text-2xl font-bold">{profileUser?.displayName}</h1>
                <p className="text-muted-foreground">
                  Joined{" "}
                  {profileUser?.createdAt
                    ? formatDistanceToNow(new Date(profileUser.createdAt), { addSuffix: true })
                    : "recently"}
                </p>
              </div>

              <div className="mt-4 sm:mt-0 flex gap-2">
                {isCurrentUser ? (
                  <Button onClick={() => router.push("/settings")} variant="outline">
                    Edit Profile
                  </Button>
                ) : (
                  <>
                    <Button onClick={handleMessage} variant="outline">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Message
                    </Button>
                    {isFollowing ? (
                      <Button onClick={handleUnfollow} variant="outline">
                        <UserMinus className="mr-2 h-4 w-4" />
                        Unfollow
                      </Button>
                    ) : (
                      <Button onClick={handleFollow}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Follow
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="mt-6">
              <div className="flex space-x-8 text-sm text-muted-foreground mb-4">
                <div>
                  <span className="font-bold text-foreground mr-1">
                    {Array.isArray(profileUser?.followers) ? profileUser.followers.length : 0}
                  </span>
                  Followers
                </div>
                <div>
                  <span className="font-bold text-foreground mr-1">
                    {Array.isArray(profileUser?.following) ? profileUser.following.length : 0}
                  </span>
                  Following
                </div>
              </div>

              {profileUser?.bio && <p className="mt-4">{profileUser.bio}</p>}

              {Array.isArray(profileUser?.interests) && profileUser.interests.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {profileUser.interests.map((interest, index) => (
                    <div key={index} className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full">
                      {interest}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>

        <div className="mt-8">
          <Tabs defaultValue="rooms">
            <TabsList className="mb-6">
              <TabsTrigger value="rooms">Active Rooms</TabsTrigger>
              <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            </TabsList>

            <TabsContent value="rooms">
              {userRooms.filter((room) => !room.scheduledFor || new Date(room.scheduledFor) <= new Date()).length >
              0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userRooms
                    .filter((room) => !room.scheduledFor || new Date(room.scheduledFor) <= new Date())
                    .map((room) => (
                      <RoomCard key={room.id} room={room} />
                    ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <h3 className="text-xl font-medium mb-2">No active rooms</h3>
                  <p className="text-muted-foreground">
                    {isCurrentUser
                      ? "You haven't created any rooms yet."
                      : `${profileUser?.displayName} hasn't created any rooms yet.`}
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="scheduled">
              {userRooms.filter((room) => room.scheduledFor && new Date(room.scheduledFor) > new Date()).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userRooms
                    .filter((room) => room.scheduledFor && new Date(room.scheduledFor) > new Date())
                    .map((room) => (
                      <RoomCard key={room.id} room={room} isUpcoming />
                    ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <h3 className="text-xl font-medium mb-2">No scheduled rooms</h3>
                  <p className="text-muted-foreground">
                    {isCurrentUser
                      ? "You don't have any upcoming rooms."
                      : `${profileUser?.displayName} doesn't have any upcoming rooms.`}
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}