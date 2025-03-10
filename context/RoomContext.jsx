"use client"

import {
  collection,
  addDoc,
  query,
  where,
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore"
import { db } from "@/firebase/config"
import { useAuth } from "./AuthContext"
import { createContext, useContext, useState, useEffect } from "react"

const RoomContext = createContext({})

export const useRoom = () => useContext(RoomContext)

export const RoomProvider = ({ children }) => {
  const { user } = useAuth()
  const [activeRooms, setActiveRooms] = useState([])
  const [trendingRooms, setTrendingRooms] = useState([])
  const [currentRoom, setCurrentRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [listeners, setListeners] = useState({})
  const [isLoadingRooms, setIsLoadingRooms] = useState(true)

  // Load active rooms
  useEffect(() => {
    let unsubscribe

    if (user) {
      setIsLoadingRooms(true)
      const roomsQuery = query(collection(db, "rooms"), where("status", "==", "active"))

      unsubscribe = onSnapshot(roomsQuery, (snapshot) => {
        const roomsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setActiveRooms(roomsData)
        setIsLoadingRooms(false)

        // Calculate trending rooms based on member count
        const trending = [...roomsData].sort((a, b) => (b.members?.length || 0) - (a.members?.length || 0)).slice(0, 5)
        setTrendingRooms(trending)
      })
    }

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [user])

  const createRoom = async (roomData) => {
    try {
      if (!user) throw new Error("You must be logged in to create a room")

      const newRoomData = {
        ...roomData,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        status: "active",
        members: [user.uid],
        moderators: [user.uid],
        speakers: [user.uid],
      }

      const roomRef = await addDoc(collection(db, "rooms"), newRoomData)

      // Create a welcome message
      await addDoc(collection(db, "messages"), {
        roomId: roomRef.id,
        senderId: "system",
        senderName: "System",
        senderPhoto: "",
        content: `Welcome to ${roomData.title}! This room was created by ${user.displayName}.`,
        type: "system",
        createdAt: serverTimestamp(),
      })

      return { id: roomRef.id, ...newRoomData }
    } catch (error) {
      console.error("Error creating room:", error)
      throw error
    }
  }

  const joinRoom = async (roomId) => {
    try {
      if (!user) throw new Error("You must be logged in to join a room")

      const roomRef = doc(db, "rooms", roomId)
      const roomSnap = await getDoc(roomRef)

      if (!roomSnap.exists()) {
        throw new Error("Room not found")
      }

      const roomData = roomSnap.data()

      // Check if room is private and user is not already a member
      if (roomData.isPrivate && !roomData.members.includes(user.uid) && roomData.createdBy !== user.uid) {
        throw new Error("This is a private room. You need an invitation to join.")
      }

      // Check if room is at capacity
      if (roomData.maxParticipants && roomData.members.length >= roomData.maxParticipants) {
        throw new Error("This room is at maximum capacity.")
      }

      if (!roomData.members.includes(user.uid)) {
        await updateDoc(roomRef, {
          members: arrayUnion(user.uid),
        })

        // Add a system message that user joined
        await addDoc(collection(db, "messages"), {
          roomId: roomId,
          senderId: "system",
          senderName: "System",
          senderPhoto: "",
          content: `${user.displayName} joined the room.`,
          type: "system",
          createdAt: serverTimestamp(),
        })
      }

      setupRoomListener(roomId)
      setupChatListener(roomId)

      // Return updated room data
      const updatedRoomSnap = await getDoc(roomRef)
      const updatedRoomData = {
        id: updatedRoomSnap.id,
        ...updatedRoomSnap.data(),
      }

      setCurrentRoom(updatedRoomData)
      return updatedRoomData
    } catch (error) {
      console.error("Error joining room:", error)
      throw error
    }
  }

  const leaveRoom = async () => {
    try {
      if (!user || !currentRoom) return

      const roomRef = doc(db, "rooms", currentRoom.id)

      await updateDoc(roomRef, {
        members: arrayRemove(user.uid),
      })

      // Add a system message that user left
      await addDoc(collection(db, "messages"), {
        roomId: currentRoom.id,
        senderId: "system",
        senderName: "System",
        senderPhoto: "",
        content: `${user.displayName} left the room.`,
        type: "system",
        createdAt: serverTimestamp(),
      })

      // If user is the creator and last member, close the room
      if (currentRoom.createdBy === user.uid && currentRoom.members.length <= 1) {
        await updateDoc(roomRef, { status: "ended" })
      }

      // Clean up listeners
      if (listeners[currentRoom.id]) {
        Object.values(listeners[currentRoom.id]).forEach((unsubscribe) => unsubscribe())
        setListeners((prev) => {
          const newListeners = { ...prev }
          delete newListeners[currentRoom.id]
          return newListeners
        })
      }

      setCurrentRoom(null)
      setMessages([])
    } catch (error) {
      console.error("Error leaving room:", error)
      throw error
    }
  }

  const sendMessage = async (content, type = "text") => {
    try {
      if (!user || !currentRoom) throw new Error("You must be in a room to send messages")

      const messageData = {
        roomId: currentRoom.id,
        senderId: user.uid,
        senderName: user.displayName,
        senderPhoto: user.photoURL || "",
        content,
        type,
        createdAt: serverTimestamp(),
      }

      await addDoc(collection(db, "messages"), messageData)
    } catch (error) {
      console.error("Error sending message:", error)
      throw error
    }
  }

  const setupRoomListener = (roomId) => {
    // Cleanup existing listener for this room if it exists
    if (listeners[roomId]?.room) {
      listeners[roomId].room()
    }

    // Setup new listener
    const roomRef = doc(db, "rooms", roomId)
    const unsubscribe = onSnapshot(roomRef, (doc) => {
      if (doc.exists()) {
        const roomData = {
          id: doc.id,
          ...doc.data(),
        }
        setCurrentRoom(roomData)
      } else {
        // Room was deleted
        setCurrentRoom(null)
      }
    })

    // Store listener reference
    setListeners((prev) => ({
      ...prev,
      [roomId]: {
        ...(prev[roomId] || {}),
        room: unsubscribe,
      },
    }))
  }

  const setupChatListener = (roomId) => {
    // Cleanup existing listener for this room's chat if it exists
    if (listeners[roomId]?.chat) {
      listeners[roomId].chat()
    }

    // Setup new listener for messages
    const messagesQuery = query(
      collection(db, "messages"),
      where("roomId", "==", roomId),
      orderBy("createdAt", "desc"),
      limit(100),
    )

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate().toISOString() || new Date().toISOString(),
        }))
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

      setMessages(messagesData)
    })

    // Store listener reference
    setListeners((prev) => ({
      ...prev,
      [roomId]: {
        ...(prev[roomId] || {}),
        chat: unsubscribe,
      },
    }))
  }

  const promoteToModerator = async (userId) => {
    try {
      if (!user || !currentRoom) return

      // Check if the current user is a moderator
      if (!currentRoom.moderators.includes(user.uid)) {
        throw new Error("Only moderators can promote users")
      }

      const roomRef = doc(db, "rooms", currentRoom.id)

      await updateDoc(roomRef, {
        moderators: arrayUnion(userId),
      })

      // Add a system message
      await addDoc(collection(db, "messages"), {
        roomId: currentRoom.id,
        senderId: "system",
        senderName: "System",
        senderPhoto: "",
        content: `${user.displayName} promoted a user to moderator.`,
        type: "system",
        createdAt: serverTimestamp(),
      })
    } catch (error) {
      console.error("Error promoting user:", error)
      throw error
    }
  }

  const removeFromRoom = async (userId) => {
    try {
      if (!user || !currentRoom) return

      // Check if the current user is a moderator
      if (!currentRoom.moderators.includes(user.uid)) {
        throw new Error("Only moderators can remove users")
      }

      const roomRef = doc(db, "rooms", currentRoom.id)

      // Get user info for the system message
      const userDoc = await getDoc(doc(db, "users", userId))
      const removedUserName = userDoc.exists() ? userDoc.data().displayName : "A user"

      await updateDoc(roomRef, {
        members: arrayRemove(userId),
      })

      // Also remove from moderators if they are one
      if (currentRoom.moderators.includes(userId)) {
        await updateDoc(roomRef, {
          moderators: arrayRemove(userId),
        })
      }

      // Add a system message
      await addDoc(collection(db, "messages"), {
        roomId: currentRoom.id,
        senderId: "system",
        senderName: "System",
        senderPhoto: "",
        content: `${removedUserName} was removed from the room.`,
        type: "system",
        createdAt: serverTimestamp(),
      })
    } catch (error) {
      console.error("Error removing user:", error)
      throw error
    }
  }

  const endRoom = async (roomId) => {
    try {
      if (!user) return

      const roomToEnd = roomId || (currentRoom ? currentRoom.id : null)
      if (!roomToEnd) throw new Error("No room specified")

      const roomRef = doc(db, "rooms", roomToEnd)
      const roomSnap = await getDoc(roomRef)

      if (!roomSnap.exists()) {
        throw new Error("Room not found")
      }

      const roomData = roomSnap.data()

      // Only creator can end the room
      if (roomData.createdBy !== user.uid) {
        throw new Error("Only the room creator can end the room")
      }

      await updateDoc(roomRef, { status: "ended" })

      // Add a system message
      await addDoc(collection(db, "messages"), {
        roomId: roomToEnd,
        senderId: "system",
        senderName: "System",
        senderPhoto: "",
        content: `The room has been ended by ${user.displayName}.`,
        type: "system",
        createdAt: serverTimestamp(),
      })

      if (roomToEnd === currentRoom?.id) {
        setCurrentRoom(null)
        setMessages([])
      }
    } catch (error) {
      console.error("Error ending room:", error)
      throw error
    }
  }

  const searchRooms = async (searchTerm, filters = {}) => {
    try {
      if (!searchTerm && Object.keys(filters).length === 0) {
        return activeRooms
      }

      const roomsQuery = query(collection(db, "rooms"), where("status", "==", "active"))
      const snapshot = await getDocs(roomsQuery)

      let results = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      // Apply search term filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        results = results.filter(
          (room) =>
            room.title?.toLowerCase().includes(term) ||
            room.description?.toLowerCase().includes(term) ||
            room.topic?.toLowerCase().includes(term),
        )
      }

      // Apply topic filter
      if (filters.topic) {
        results = results.filter((room) => room.topic === filters.topic)
      }

      // Apply private/public filter
      if (filters.isPrivate !== undefined) {
        results = results.filter((room) => room.isPrivate === filters.isPrivate)
      }

      // Apply creator filter
      if (filters.createdBy) {
        results = results.filter((room) => room.createdBy === filters.createdBy)
      }

      return results
    } catch (error) {
      console.error("Error searching rooms:", error)
      throw error
    }
  }

  const value = {
    activeRooms,
    trendingRooms,
    currentRoom,
    messages,
    isLoadingRooms,
    createRoom,
    joinRoom,
    leaveRoom,
    sendMessage,
    promoteToModerator,
    removeFromRoom,
    endRoom,
    searchRooms,
  }

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>
}

