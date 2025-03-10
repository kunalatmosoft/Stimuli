"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { collection, query, getDocs, limit, startAfter, orderBy, where } from "firebase/firestore"
import { db } from "@/firebase/config"
import { useAuth } from "@/context/AuthContext"
import Header from "@/components/layout/Header"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, UserPlus, UserMinus, MessageSquare, Filter, Mail } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default function Explore() {
  const { user, loading, followUser, unfollowUser } = useAuth()
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchField, setSearchField] = useState("displayName") // displayName, email, interests
  const [lastVisible, setLastVisible] = useState(null)
  const [hasMore, setHasMore] = useState(true)
  const [filterType, setFilterType] = useState("all") // all, following, suggested, friends
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
      return
    }

    fetchUsers()
  }, [loading, user, router, filterType])

  const fetchUsers = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      let usersQuery

      if (filterType === "following" && Array.isArray(user.following) && user.following.length > 0) {
        usersQuery = query(
          collection(db, "users"),
          where("uid", "in", user.following.slice(0, 10)), // Firestore limits "in" queries to 10 items
          limit(10),
        )
      } else if (filterType === "friends") {
        // For friends, we need to get users who follow the current user and are followed by the current user
        // This is a complex query that would require multiple steps
        // First, get all users
        usersQuery = query(
          collection(db, "users"),
          where("uid", "!=", user.uid),
          limit(50), // Get more users to filter from
        )

        const querySnapshot = await getDocs(usersQuery)
        const allUsers = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        // Filter for mutual follows
        const friends = allUsers.filter(
          (u) =>
            Array.isArray(u.following) &&
            Array.isArray(u.followers) &&
            Array.isArray(user.following) &&
            u.following.includes(user.uid) &&
            user.following.includes(u.id),
        )

        setUsers(friends.slice(0, 10))
        setLastVisible(null)
        setHasMore(friends.length > 10)
        setIsLoading(false)
        return
      } else if (filterType === "suggested") {
        // For suggested, we'll just show users the current user is not following
        usersQuery = query(collection(db, "users"), where("uid", "!=", user.uid), limit(10))
      } else {
        // Default "all" filter
        usersQuery = query(collection(db, "users"), where("uid", "!=", user.uid), orderBy("uid"), limit(10))
      }

      const querySnapshot = await getDocs(usersQuery)

      if (querySnapshot.empty) {
        setHasMore(false)
        setUsers([])
      } else {
        const usersData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        // For suggested filter, filter out users that the current user is already following
        if (filterType === "suggested" && Array.isArray(user.following)) {
          const filteredUsers = usersData.filter((u) => !user.following.includes(u.id))
          setUsers(filteredUsers)
        } else {
          setUsers(usersData)
        }

        setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1])
        setHasMore(true)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
      toast({
        title: "Error",
        description: "Failed to load users.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadMoreUsers = async () => {
    if (!lastVisible || !hasMore) return

    setIsLoading(true)
    try {
      const usersQuery = query(
        collection(db, "users"),
        where("uid", "!=", user.uid),
        orderBy("uid"),
        startAfter(lastVisible),
        limit(10),
      )

      const querySnapshot = await getDocs(usersQuery)

      if (querySnapshot.empty) {
        setHasMore(false)
      } else {
        const newUsers = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        setUsers((prev) => [...prev, ...newUsers])
        setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1])
      }
    } catch (error) {
      console.error("Error loading more users:", error)
      toast({
        title: "Error",
        description: "Failed to load more users.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault()

    if (!searchQuery.trim()) {
      fetchUsers()
      return
    }

    setIsLoading(true)
    try {
      let usersQuery

      if (searchField === "displayName") {
        // Search by displayName that starts with the search query
        usersQuery = query(
          collection(db, "users"),
          where("displayName", ">=", searchQuery),
          where("displayName", "<=", searchQuery + "\uf8ff"),
          limit(10),
        )
      } else if (searchField === "email") {
        // Search by email
        usersQuery = query(
          collection(db, "users"),
          where("email", ">=", searchQuery),
          where("email", "<=", searchQuery + "\uf8ff"),
          limit(10),
        )
      } else if (searchField === "interests") {
        // For interests, we need to get all users and filter manually
        usersQuery = query(
          collection(db, "users"),
          where("uid", "!=", user.uid),
          limit(50), // Get more to filter from
        )
      }

      const querySnapshot = await getDocs(usersQuery)

      let usersData = querySnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((userData) => userData.uid !== user.uid)

      // For interests, filter manually
      if (searchField === "interests") {
        const searchLower = searchQuery.toLowerCase()
        usersData = usersData
          .filter(
            (userData) =>
              Array.isArray(userData.interests) &&
              userData.interests.some((interest) => interest.toLowerCase().includes(searchLower)),
          )
          .slice(0, 10)
      }

      setUsers(usersData)
      setHasMore(false) // Disable load more for search results
    } catch (error) {
      console.error("Error searching users:", error)
      toast({
        title: "Error",
        description: "Failed to search users.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFollow = async (userId) => {
    try {
      await followUser(userId)

      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, followers: [...(Array.isArray(u.followers) ? u.followers : []), user.uid] } : u,
        ),
      )

      toast({
        title: "Success",
        description: "You are now following this user.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleUnfollow = async (userId) => {
    try {
      await unfollowUser(userId)

      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, followers: Array.isArray(u.followers) ? u.followers.filter((id) => id !== user.uid) : [] }
            : u,
        ),
      )

      toast({
        title: "Success",
        description: "You are no longer following this user.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleMessage = (userId) => {
    // In a real app, this would create a direct message room or navigate to an existing one
    toast({
      title: "Coming soon",
      description: "Direct messaging will be available in a future update.",
    })
  }

  if (loading && !users.length) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h1 className="text-3xl font-bold">Explore People</h1>

          <div className="flex gap-2 w-full md:w-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex gap-2">
                  <Filter className="h-4 w-4" />
                  {filterType === "all"
                    ? "All Users"
                    : filterType === "following"
                      ? "Following"
                      : filterType === "friends"
                        ? "Friends"
                        : "Suggested"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setFilterType("all")}>All Users</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterType("following")}>Following</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterType("friends")}>Friends</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterType("suggested")}>Suggested</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Select value={searchField} onValueChange={setSearchField}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Search by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="displayName">Username</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="interests">Interests</SelectItem>
            </SelectContent>
          </Select>

          <Button type="submit">Search</Button>
        </form>

        <div className="space-y-4">
          {users.length > 0 ? (
            users.map((profileUser) => (
              <div key={profileUser.id} className="flex items-center justify-between p-4 rounded-lg border">
                <div
                  className="flex items-center space-x-4 flex-1"
                  onClick={() => router.push(`/profile/${profileUser.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={profileUser.photoURL} alt={profileUser.displayName} />
                    <AvatarFallback>{profileUser.displayName?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{profileUser.displayName}</h3>
                      {Array.isArray(profileUser.followers) &&
                        Array.isArray(profileUser.following) &&
                        Array.isArray(user.following) &&
                        profileUser.followers.includes(user.uid) &&
                        profileUser.following.includes(user.uid) && (
                          <Badge variant="outline" className="text-xs">
                            Friends
                          </Badge>
                        )}
                    </div>

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="text-sm text-muted-foreground line-clamp-1 flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {profileUser.email}
                          </p>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{profileUser.email}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {profileUser.bio && <p className="text-sm text-muted-foreground line-clamp-1">{profileUser.bio}</p>}

                    {Array.isArray(profileUser.interests) && profileUser.interests.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {profileUser.interests.slice(0, 3).map((interest, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {interest}
                          </Badge>
                        ))}
                        {profileUser.interests.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{profileUser.interests.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span>{Array.isArray(profileUser.followers) ? profileUser.followers.length : 0} followers</span>
                      <span>{Array.isArray(profileUser.following) ? profileUser.following.length : 0} following</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="hidden sm:flex"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleMessage(profileUser.id)
                    }}
                    aria-label="Message user"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>

                  {Array.isArray(user.following) && user.following.includes(profileUser.id) ? (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleUnfollow(profileUser.id)
                      }}
                      variant="outline"
                      size="sm"
                      aria-label="Unfollow user"
                    >
                      <UserMinus className="mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">Unfollow</span>
                    </Button>
                  ) : (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleFollow(profileUser.id)
                      }}
                      size="sm"
                      aria-label="Follow user"
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">Follow</span>
                    </Button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <h3 className="text-xl font-medium mb-2">No users found</h3>
              <p className="text-muted-foreground">
                {searchQuery ? `No users match '${searchQuery}'` : "There are no other users to display."}
              </p>
            </div>
          )}

          {hasMore && (
            <div className="flex justify-center mt-6">
              <Button onClick={loadMoreUsers} variant="outline" disabled={isLoading}>
                {isLoading ? "Loading..." : "Load More"}
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

