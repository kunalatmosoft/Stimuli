import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/context/AuthContext"
import { RoomProvider } from "@/context/RoomContext"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Clubhouse Clone",
  description: "A Clubhouse clone built with Next.js and Firebase",
    generator: 'v0.dev'
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <RoomProvider>{children}</RoomProvider>
        </AuthProvider>
      </body>
    </html>
  )
}



import './globals.css'