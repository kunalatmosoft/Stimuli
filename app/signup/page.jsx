"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { X, ArrowRight, ArrowLeft, Check } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

// Custom Modal Component
const CustomModal = ({ isOpen, onClose, onAccept, title, description, children }) => {
  const modalRef = useRef(null)
  
  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose()
      }
    }
    
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      // Prevent scrolling on body when modal is open
      document.body.style.overflow = "hidden"
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.body.style.overflow = "auto"
    }
  }, [isOpen, onClose])
  
  // Handle escape key press
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === "Escape") {
        onClose()
      }
    }
    
    if (isOpen) {
      document.addEventListener("keydown", handleEscKey)
    }
    
    return () => {
      document.removeEventListener("keydown", handleEscKey)
    }
  }, [isOpen, onClose])
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity">
      <div 
        ref={modalRef}
        className="w-full max-w-md max-h-[80vh] bg-background rounded-lg shadow-lg overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Modal Header */}
        <div className="p-6 border-b">
          <h2 id="modal-title" className="text-xl font-semibold">{title}</h2>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
        
        {/* Modal Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-180px)]">
          {children}
        </div>
        
        {/* Modal Footer */}
        <div className="p-6 border-t flex justify-end space-x-4">
          <Button 
            variant="outline" 
            onClick={onClose}
          >
            Close
          </Button>
          <Button 
            onClick={() => {
              onAccept()
              onClose()
            }}
          >
            Accept Terms
          </Button>
        </div>
      </div>
    </div>
  )
}

// Interests Modal Component
const InterestsModal = ({ isOpen, onClose, availableInterests, selectedInterests, onInterestsChange }) => {
  const modalRef = useRef(null)
  const [searchTerm, setSearchTerm] = useState("")
  
  // Filter interests based on search term
  const filteredInterests = availableInterests.filter(interest => 
    interest.toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose()
      }
    }
    
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      document.body.style.overflow = "hidden"
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.body.style.overflow = "auto"
    }
  }, [isOpen, onClose])
  
  // Handle escape key press
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === "Escape") {
        onClose()
      }
    }
    
    if (isOpen) {
      document.addEventListener("keydown", handleEscKey)
    }
    
    return () => {
      document.removeEventListener("keydown", handleEscKey)
    }
  }, [isOpen, onClose])
  
  if (!isOpen) return null
  
  // Function to toggle interest selection
  const toggleInterest = (interest) => {
    if (selectedInterests.includes(interest)) {
      onInterestsChange(selectedInterests.filter(item => item !== interest))
    } else {
      onInterestsChange([...selectedInterests, interest])
    }
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity">
      <div 
        ref={modalRef}
        className="w-full max-w-md max-h-[80vh] bg-background rounded-lg shadow-lg overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="interests-modal-title"
      >
        {/* Modal Header */}
        <div className="p-6 border-b">
          <h2 id="interests-modal-title" className="text-xl font-semibold">Select Your Interests</h2>
          <p className="text-sm text-muted-foreground mt-1">Choose topics you're interested in to personalize your experience</p>
        </div>
        
        {/* Search */}
        <div className="px-6 pt-4">
          <Input
            type="text"
            placeholder="Search interests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {/* Selected Interests */}
        {selectedInterests.length > 0 && (
          <div className="px-6 pt-4">
            <Label className="text-sm font-medium mb-2 block">Selected Interests</Label>
            <div className="flex flex-wrap gap-2">
              {selectedInterests.map(interest => (
                <Badge key={interest} variant="secondary" className="flex items-center gap-1">
                  {interest}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => toggleInterest(interest)} 
                  />
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Interests List */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-240px)]">
          <Label className="text-sm font-medium mb-2 block">Available Interests</Label>
          <div className="grid grid-cols-2 gap-2">
            {filteredInterests.map(interest => (
              <div 
                key={interest}
                className={`p-2 rounded-md cursor-pointer border ${
                  selectedInterests.includes(interest) 
                    ? "bg-primary/10 border-primary" 
                    : "hover:bg-primary/5 border-transparent"
                }`}
                onClick={() => toggleInterest(interest)}
              >
                {interest}
              </div>
            ))}
            {filteredInterests.length === 0 && (
              <div className="col-span-2 text-center py-4 text-muted-foreground">
                No interests match your search
              </div>
            )}
          </div>
        </div>
        
        {/* Modal Footer */}
        <div className="p-6 border-t flex justify-end space-x-4">
          <Button onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  )
}

// Progress indicator component
const ProgressIndicator = ({ currentStep, totalSteps }) => {
  return (
    <div className="flex justify-center space-x-2 mb-6">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div 
          key={index} 
          className={`h-1 rounded-full transition-all duration-300 ${
            index === currentStep 
              ? "w-8 bg-primary" 
              : index < currentStep 
                ? "w-8 bg-primary/60" 
                : "w-8 bg-muted"
          }`}
        />
      ))}
    </div>
  )
}

export default function Signup() {
  const [currentStep, setCurrentStep] = useState(0)
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [showInterestsModal, setShowInterestsModal] = useState(false)
  
  // Interests related states
  const [interestLevel, setInterestLevel] = useState(5) // On a scale of 1-10
  const [selectedInterests, setSelectedInterests] = useState([])
  
  // Avatar & Profile related states
  const [avatar, setAvatar] = useState(null)
  const [bio, setBio] = useState("")
  
  // Available interests - this could be fetched from an API
  const availableInterests = [
    "Technology", "Sports", "Music", "Movies", "Books", "Science", 
    "Travel", "Food", "Fashion", "Art", "Gaming", "Photography",
    "Fitness", "Politics", "Business", "Finance", "Education",
    "Health", "Pets", "Environment", "Design", "DIY", "History",
    "Philosophy", "Psychology", "Cooking", "Dance", "Nature"
  ]
  
  const { signup } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  // Step validation functions
  const validateStep0 = () => {
    if (!username.trim()) {
      toast({
        title: "Username required",
        description: "Please enter a username to continue.",
        variant: "destructive",
      })
      return false
    }
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter an email address to continue.",
        variant: "destructive",
      })
      return false
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      })
      return false
    }
    return true
  }
  
  const validateStep1 = () => {
    if (!password) {
      toast({
        title: "Password required",
        description: "Please enter a password to continue.",
        variant: "destructive",
      })
      return false
    }
    if (password.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      })
      return false
    }
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      })
      return false
    }
    return true
  }
  
  const validateStep2 = () => {
    if (selectedInterests.length === 0) {
      toast({
        title: "Interests required",
        description: "Please select at least one interest to continue.",
        variant: "destructive",
      })
      return false
    }
    return true
  }
  
  const validateStep3 = () => {
    if (!acceptedTerms) {
      toast({
        title: "Terms required",
        description: "You must accept the terms and conditions to create an account.",
        variant: "destructive",
      })
      return false
    }
    return true
  }
  
  // Next step handler
  const handleNextStep = () => {
    if (currentStep === 0 && !validateStep0()) return
    if (currentStep === 1 && !validateStep1()) return
    if (currentStep === 2 && !validateStep2()) return
    if (currentStep === 3 && !validateStep3()) return
    
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    } else {
      handleSubmit()
    }
  }
  
  // Previous step handler
  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    setIsLoading(true)

    try {
      // Include all user data
      await signup(email, password, username, {
        interests: selectedInterests,
        interestLevel: interestLevel,
        bio: bio,
        // You would handle avatar upload separately or include it in this object
      })
      
      toast({
        title: "Account created",
        description: "Welcome to Clubhouse! Your account has been created successfully.",
      })
      router.push("/")
    } catch (error) {
      toast({
        title: "Signup failed",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  // Slide animation variants
  const slideVariants = {
    hidden: (direction) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
    }),
    visible: {
      x: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
      },
    },
    exit: (direction) => ({
      x: direction > 0 ? '-100%' : '100%',
      opacity: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
      },
    }),
  }
  
  // Track animation direction
  const [direction, setDirection] = useState(0)
  
  // Custom next/prev handlers with direction setting
  const goNext = () => {
    setDirection(1)
    handleNextStep()
  }
  
  const goPrev = () => {
    setDirection(-1)
    handlePrevStep()
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background bg-gradient-to-b from-background to-background/80">
      <div className="w-full max-w-md p-4">
        <Card className="border-none shadow-xl overflow-hidden">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-bold">Join Clubhouse</CardTitle>
            <CardDescription>Connect with people who share your interests</CardDescription>
          </CardHeader>
          
          <ProgressIndicator currentStep={currentStep} totalSteps={4} />
          
          <CardContent className="relative overflow-hidden">
            <AnimatePresence custom={direction} mode="wait">
              <motion.div
                key={currentStep}
                custom={direction}
                variants={slideVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="w-full"
              >
                {/* Step 1: Basic Info */}
                {currentStep === 0 && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold">Let's get started</h2>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="username">Choose a username</Label>
                        <Input
                          id="username"
                          type="text"
                          placeholder="johndoe"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="h-12"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Enter your email</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="your.email@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="h-12"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          We'll send a verification link to this email
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Step 2: Security */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold">Secure your account</h2>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="password">Create a password</Label>
                        <Input
                          id="password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="At least 8 characters"
                          className="h-12"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Must be at least 8 characters
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm password</Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter your password"
                          className="h-12"
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Step 3: Interests */}
                {currentStep === 2 && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold">Personalize your experience</h2>
                    
                    {/* Selected Interests Display */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label>What are you interested in?</Label>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setShowInterestsModal(true)}
                          className="text-primary"
                        >
                          {selectedInterests.length === 0 ? "Select topics" : "Edit topics"}
                        </Button>
                      </div>
                      
                      {selectedInterests.length > 0 ? (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedInterests.map(interest => (
                            <Badge key={interest} variant="secondary">
                              {interest}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <div 
                          onClick={() => setShowInterestsModal(true)}
                          className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-primary/40 transition-colors"
                        >
                          <p className="text-muted-foreground text-center">
                            Select at least one interest to personalize your feed
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {/* Interest Level Slider */}
                    {selectedInterests.length > 0 && (
                      <div className="space-y-3 mt-4">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="interest-level" className="text-sm">How interested are you in these topics?</Label>
                          <span className="text-primary font-medium">{interestLevel}/10</span>
                        </div>
                        <Slider
                          id="interest-level"
                          min={1}
                          max={10}
                          step={1}
                          value={[interestLevel]}
                          onValueChange={(value) => setInterestLevel(value[0])}
                          className="py-4"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Casually interested</span>
                          <span>Very passionate</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Profile Bio */}
                    <div className="space-y-2 mt-4">
                      <Label htmlFor="bio">Short bio (optional)</Label>
                      <textarea
                        id="bio"
                        rows={3}
                        placeholder="Tell others a bit about yourself..."
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        maxLength={160}
                        className="w-full px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <p className="text-xs text-muted-foreground text-right">
                        {bio.length}/160
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Step 4: Final Step */}
                {currentStep === 3 && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold">Almost there!</h2>
                    
                    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="bg-primary/10 rounded-full p-1 mt-0.5">
                          <Check size={16} className="text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium">Account details</h3>
                          <p className="text-sm text-muted-foreground">{username} • {email}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="bg-primary/10 rounded-full p-1 mt-0.5">
                          <Check size={16} className="text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium">Interests</h3>
                          <p className="text-sm text-muted-foreground">
                            {selectedInterests.length} topics selected
                          </p>
                        </div>
                      </div>
                      
                      {bio && (
                        <div className="flex items-start gap-3">
                          <div className="bg-primary/10 rounded-full p-1 mt-0.5">
                            <Check size={16} className="text-primary" />
                          </div>
                          <div>
                            <h3 className="font-medium">Bio</h3>
                            <p className="text-sm text-muted-foreground">{bio}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Terms Checkbox */}
                    <div className="flex items-center space-x-2 mt-4">
                      <Checkbox 
                        id="terms" 
                        checked={acceptedTerms}
                        onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                      />
                      <Label 
                        htmlFor="terms" 
                        className="text-sm cursor-pointer"
                      >
                        I agree to the{" "}
                        <span 
                          className="text-primary hover:underline cursor-pointer" 
                          onClick={(e) => {
                            e.preventDefault();
                            setShowTermsModal(true);
                          }}
                        >
                          terms and conditions
                        </span>
                      </Label>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </CardContent>
          
          <CardFooter className="flex justify-between pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={goPrev}
              disabled={currentStep === 0 || isLoading}
              className={currentStep === 0 ? "invisible" : ""}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            
            <Button
              type="button"
              onClick={goNext}
              disabled={isLoading}
              className={currentStep === 3 ? "bg-green-600 hover:bg-green-700" : ""}
            >
              {isLoading ? (
                "Creating account..."
              ) : currentStep === 3 ? (
                "Create account"
              ) : (
                <>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </CardFooter>
          
          {currentStep < 3 && (
            <div className="px-6 pb-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </div>
          )}
        </Card>
      </div>

      {/* Custom Terms and Conditions Modal */}
      <CustomModal 
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={() => setAcceptedTerms(true)}
        title="Terms and Conditions"
        description="Please read and accept our terms and conditions to continue"
      >
        <div className="space-y-4 text-sm">
          <h3 className="font-semibold">1. Introduction</h3>
          <p>
            Welcome to Clubhouse. By creating an account and using our service, you agree to comply with and be bound by the following terms and conditions. Please review them carefully.
          </p>
          
          <h3 className="font-semibold">2. User Accounts</h3>
          <p>
            When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account.
          </p>
          
          <h3 className="font-semibold">3. User Content</h3>
          <p>
            Our service allows you to post, link, store, share and otherwise make available certain information, text, graphics, videos, or other material. You are responsible for the content you post and its legality.
          </p>
          
          <h3 className="font-semibold">4. Prohibited Activities</h3>
          <p>
            You agree not to use the platform for any illegal purposes or to conduct any unlawful activity, including, but not limited to:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Harassment, abuse, or harm of another person</li>
            <li>Impersonating another user or person</li>
            <li>Posting illegal or unauthorized content</li>
            <li>Attempting to compromise the system's security</li>
            <li>Engaging in data mining without permission</li>
          </ul>
          
          <h3 className="font-semibold">5. Privacy Policy</h3>
          <p>
            Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect your personal information when you use our service.
          </p>
          
          <h3 className="font-semibold">6. Limitation of Liability</h3>
          <p>
            In no event shall Clubhouse, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages.
          </p>

          <h3 className="font-semibold">7. Termination</h3>
          <p>
            We may terminate or suspend your account immediately, without prior notice or liability, for any reason, including without limitation if you breach the Terms.
          </p>

          <h3 className="font-semibold">8. Changes</h3>
          <p>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. It is your responsibility to review these Terms periodically for changes.
          </p>
        </div>
      </CustomModal>
      
      {/* Interests Selection Modal */}
      <InterestsModal
        isOpen={showInterestsModal}
        onClose={() => setShowInterestsModal(false)}
        availableInterests={availableInterests}
        selectedInterests={selectedInterests}
        onInterestsChange={setSelectedInterests}
      />
    </div>
  )
}