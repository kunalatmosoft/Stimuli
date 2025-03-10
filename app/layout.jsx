import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { RoomProvider } from "@/context/RoomContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Stemuli - Real-Time Audio Discussions | Atmosoft",
  description:
    "Stemuli is a real-time audio discussion platform, a Clubhouse alternative by Atmosoft. Join live voice chats, network, engage in meaningful conversations, and collaborate seamlessly.",
  keywords:
    "Stemuli, Clubhouse alternative, real-time audio discussions, voice chat platform, Atmosoft, live conversations, social networking, AI-powered engagement, group audio calls, online networking, audio-based social media, podcasting, voice rooms, live chat, virtual meetings, collaborative discussions",
  openGraph: {
    title: "Stemuli - Join Real-Time Audio Discussions",
    description:
      "Stemuli is a next-generation voice chat platform by Atmosoft, offering real-time audio conversations, networking, and collaborative discussions.",
    type: "website",
    url: "https://stemul.netlify.app",
    image: "https://stemul.netlify.app/og-image.jpg",
  },
  twitter: {
    card: "summary_large_image",
    site: "@yourhandle",
    title: "Stemuli - Clubhouse Alternative for Live Audio Conversations",
    description:
      "Join Stemuli, an AI-powered voice chat platform by Atmosoft. Experience real-time networking and meaningful discussions with professionals worldwide.",
    image: "https://stemul.netlify.app/twitter-image.jpg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content={metadata.description} />
        <meta name="keywords" content={metadata.keywords} />
        <meta name="author" content="Atmosoft" />
        <meta name="robots" content="index, follow" />
        <meta name="theme-color" content="#ffffff" />

        {/* Open Graph Meta Tags */}
        <meta property="og:title" content={metadata.openGraph.title} />
        <meta property="og:description" content={metadata.openGraph.description} />
        <meta property="og:type" content={metadata.openGraph.type} />
        <meta property="og:url" content={metadata.openGraph.url} />
        <meta property="og:image" content={metadata.openGraph.image} />

        {/* Twitter Meta Tags */}
        <meta name="twitter:card" content={metadata.twitter.card} />
        <meta name="twitter:site" content={metadata.twitter.site} />
        <meta name="twitter:title" content={metadata.twitter.title} />
        <meta name="twitter:description" content={metadata.twitter.description} />
        <meta name="twitter:image" content={metadata.twitter.image} />

        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />

        {/* Canonical URL */}
        <link rel="canonical" href="https://stemul.netlify.app" />

        {/* Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: metadata.title,
              description: metadata.description,
              url: metadata.openGraph.url,
              applicationCategory: "SocialNetworkingApplication",
              keywords: metadata.keywords,
              publisher: {
                "@type": "Organization",
                name: "Atmosoft",
                url: "https://atmosoft.com",
              },
              potentialAction: {
                "@type": "SearchAction",
                target: "https://stemul.netlify.app/search?q={search_term_string}",
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <RoomProvider>
            <main>{children}</main>
          </RoomProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
