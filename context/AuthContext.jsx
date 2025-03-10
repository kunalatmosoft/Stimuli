"use client"

import { createContext, useContext, useEffect, useState } from "react"
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth"
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { auth, db, storage } from "@/firebase/config"
import { useRouter } from "next/navigation"

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, "users", user.uid)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          setUser({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            ...docSnap.data(),
          })
        } else {
          setUser({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
          })
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signup = async (email, password, username) => {
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password)

      // Update profile
      await updateProfile(user, {
        displayName: username,
      })

      // Create user document in Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: email,
        displayName: username,
        photoURL: "",
        bio: "",
        following: [],
        followers: [],
        interests: [],
        createdAt: new Date().toISOString(),
      })

      return user
    } catch (error) {
      throw error
    }
  }

  const login = async (email, password) => {
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password)
      return user
    } catch (error) {
      throw error
    }
  }

  const logout = async () => {
    setUser(null)
    await signOut(auth)
    router.push("/login")
  }

  const resetPassword = (email) => {
    return sendPasswordResetEmail(auth, email)
  }

  const updateUserProfile = async (data) => {
    try {
      const userDocRef = doc(db, "users", user.uid)

      await updateDoc(userDocRef, data)

      if (data.displayName) {
        await updateProfile(auth.currentUser, {
          displayName: data.displayName,
        })
      }

      // Update local user state
      setUser((prevUser) => ({
        ...prevUser,
        ...data,
      }))

      return true
    } catch (error) {
      console.error("Error updating profile:", error)
      throw error
    }
  }

  const uploadProfilePicture = async (file) => {
    try {
      const fileRef = ref(storage, `profile-pictures/${user.uid}`)
      await uploadBytes(fileRef, file)

      const photoURL = await getDownloadURL(fileRef)

      // Update auth profile
      await updateProfile(auth.currentUser, {
        photoURL: photoURL,
      })

      // Update firestore document
      const userDocRef = doc(db, "users", user.uid)
      await updateDoc(userDocRef, {
        photoURL: photoURL,
      })

      // Update local user state
      setUser((prevUser) => ({
        ...prevUser,
        photoURL: photoURL,
      }))

      return photoURL
    } catch (error) {
      console.error("Error uploading profile picture:", error)
      throw error
    }
  }

  const followUser = async (userId) => {
    try {
      const userRef = doc(db, "users", user.uid)
      const targetUserRef = doc(db, "users", userId)

      // Add to current user's following
      await updateDoc(userRef, {
        following: [...(user.following || []), userId],
      })

      // Add to target user's followers
      const targetUserSnap = await getDoc(targetUserRef)
      if (targetUserSnap.exists()) {
        const targetUserData = targetUserSnap.data()
        await updateDoc(targetUserRef, {
          followers: [...(targetUserData.followers || []), user.uid],
        })
      }

      // Update local state
      setUser((prevUser) => ({
        ...prevUser,
        following: [...(prevUser.following || []), userId],
      }))

      return true
    } catch (error) {
      console.error("Error following user:", error)
      throw error
    }
  }

  const unfollowUser = async (userId) => {
    try {
      const userRef = doc(db, "users", user.uid)
      const targetUserRef = doc(db, "users", userId)

      // Remove from current user's following
      await updateDoc(userRef, {
        following: user.following.filter((id) => id !== userId),
      })

      // Remove from target user's followers
      const targetUserSnap = await getDoc(targetUserRef)
      if (targetUserSnap.exists()) {
        const targetUserData = targetUserSnap.data()
        await updateDoc(targetUserRef, {
          followers: targetUserData.followers.filter((id) => id !== user.uid),
        })
      }

      // Update local state
      setUser((prevUser) => ({
        ...prevUser,
        following: prevUser.following.filter((id) => id !== userId),
      }))

      return true
    } catch (error) {
      console.error("Error unfollowing user:", error)
      throw error
    }
  }

  const value = {
    user,
    loading,
    signup,
    login,
    logout,
    resetPassword,
    updateUserProfile,
    uploadProfilePicture,
    followUser,
    unfollowUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

