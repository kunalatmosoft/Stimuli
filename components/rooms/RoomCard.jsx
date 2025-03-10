"use client"

import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, Calendar, Users, Lock } from "lucide-react"
import { useState, useEffect } from "react"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/firebase/config"

export default function RoomCard({ room, isUpcoming = false }) {
  const router = useRouter()
  const [members, setMembers] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        // Only fetch the first 3 members to show in the card
        const memberPromises = Array.isArray(room.members)
          ? room.members.slice(0, 3).map((uid) => getDoc(doc(db, "users", uid)))
          : []

        const memberDocs = await Promise.all(memberPromises)

        const membersData = memberDocs
          .filter((doc) => doc.exists())
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))

        setMembers(membersData)
      } catch (error) {
        console.error("Error fetching members:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMembers()
  }, [room.members])

  const handleClick = () => {
    if (!isUpcoming) {
      router.push(`/room/${room.id}`)
    }
  }

  return (
    <Card
      className={`overflow-hidden ${!isUpcoming ? "cursor-pointer hover:border-primary transition-colors" : ""}`}
      onClick={!isUpcoming ? handleClick : undefined}
    >
      <CardHeader className="p-4 bg-primary/5 flex flex-row justify-between items-start">
        <div>
          <CardTitle className="text-xl">{room.title}</CardTitle>
          {room.topic && (
            <Badge variant="outline" className="mt-1">
              {room.topic}
            </Badge>
          )}
        </div>
        {room.isPrivate && (
          <Badge variant="secondary" className="ml-2">
            <Lock className="h-3 w-3 mr-1" />
            Private
          </Badge>
        )}
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <Users className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">Members</p>
              {isLoading ? (
                <div className="h-8 flex items-center">
                  <div className="animate-pulse h-2 w-24 bg-muted rounded"></div>
                </div>
              ) : members.length > 0 ? (
                <div className="flex flex-col gap-2 mt-2">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={member.photoURL} alt={member.displayName} />
                        <AvatarFallback>{member.displayName?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{member.displayName}</span>
                      {member.id === room.createdBy && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Creator</span>
                      )}
                    </div>
                  ))}
                  {Array.isArray(room.members) && room.members.length > 3 && (
                    <p className="text-xs text-muted-foreground">+{room.members.length - 3} more members</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No members yet</p>
              )}
            </div>
          </div>

          {room.description && (
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-sm">{room.description}</p>
              </div>
            </div>
          )}

          {isUpcoming && room.scheduledFor && (
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="text-sm">
                  Starts {formatDistanceToNow(new Date(room.scheduledFor), { addSuffix: true })}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{Array.isArray(room.members) ? room.members.length : 0} participants</span>
            </div>

            {room.maxParticipants && (
              <div className="flex items-center gap-1">
                <span>Max: {room.maxParticipants}</span>
              </div>
            )}

            {room.createdAt && (
              <div className="flex items-center gap-1">
                <span>Created {formatDistanceToNow(new Date(room.createdAt.seconds * 1000), { addSuffix: true })}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-end">
        {isUpcoming ? (
          <Button variant="outline" size="sm" disabled>
            Coming soon
          </Button>
        ) : (
          <Button size="sm">Join Chat</Button>
        )}
      </CardFooter>
    </Card>
  )
}

