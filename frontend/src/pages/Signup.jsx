import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Lock, Mail, User, ArrowLeft } from 'lucide-react'
import { auth, googleProvider } from '../firebase'
import { createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth'

function Signup() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [name, setName] = useState('')
    const [error, setError] = useState('')
    const navigate = useNavigate()

    const handleSignup = async (e) => {
        e.preventDefault()
        try {
            await createUserWithEmailAndPassword(auth, email, password)
            // Ideally update profile with name here using updateProfile
            navigate('/dashboard')
        } catch (err) {
            setError("Failed to create account. Email usage?")
        }
    }

    const handleGoogleSignup = async () => {
        try {
            await signInWithPopup(auth, googleProvider)
            navigate('/dashboard')
        } catch (err) {
            setError("Google Sign-In failed.")
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-medical-blue/20 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2"></div>

            <div className="glass-panel max-w-md w-full p-10 relative z-10 animate-fade-in-up">

                {/* Back Arrow */}
                <Link to="/" className="absolute top-6 left-6 text-gray-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </Link>

                <div className="text-center mt-4">
                    <h2 className="text-3xl font-extrabold text-white">Create Account</h2>
                    <p className="mt-2 text-sm text-gray-400">
                        Join the patient health network
                    </p>
                </div>

                {error && <div className="mt-4 text-center text-red-500 bg-red-500/10 p-2 rounded border border-red-500/20">{error}</div>}

                <form className="mt-8 space-y-6" onSubmit={handleSignup}>
                    <div className="rounded-md shadow-sm space-y-4">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-gray-500" />
                            </div>
                            <input
                                type="text"
                                required
                                className="block w-full pl-10 pr-3 py-3 border border-gray-700 rounded-lg leading-5 bg-black/40 text-gray-300 placeholder-gray-500 focus:outline-none focus:border-medical-blue focus:ring-1 focus:ring-medical-blue sm:text-sm transition-colors"
                                placeholder="Full Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-gray-500" />
                            </div>
                            <input
                                type="email"
                                required
                                className="block w-full pl-10 pr-3 py-3 border border-gray-700 rounded-lg leading-5 bg-black/40 text-gray-300 placeholder-gray-500 focus:outline-none focus:border-medical-blue focus:ring-1 focus:ring-medical-blue sm:text-sm transition-colors"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-gray-500" />
                            </div>
                            <input
                                type="password"
                                required
                                className="block w-full pl-10 pr-3 py-3 border border-gray-700 rounded-lg leading-5 bg-black/40 text-gray-300 placeholder-gray-500 focus:outline-none focus:border-medical-blue focus:ring-1 focus:ring-medical-blue sm:text-sm transition-colors"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-purple-600 to-medical-blue hover:from-medical-blue hover:to-purple-600 focus:outline-none transition-all shadow-lg"
                        >
                            Register
                        </button>
                    </div>
                </form>

                <div className="my-6 flex items-center">
                    <div className="flex-grow border-t border-gray-700"></div>
                    <span className="flex-shrink-0 mx-4 text-gray-500 text-xs">OR CONTINUE WITH</span>
                    <div className="flex-grow border-t border-gray-700"></div>
                </div>

                <button
                    type="button"
                    onClick={handleGoogleSignup}
                    className="w-full flex justify-center items-center gap-3 py-3 px-4 border border-gray-600 rounded-lg text-white bg-transparent hover:bg-white/5 transition-colors"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Sign in with Google
                </button>

                <div className="text-center mt-4">
                    <Link to="/login" className="text-sm text-gray-400 hover:text-white transition-colors">Already have an account? Login</Link>
                </div>
            </div>
        </div>
    )
}

export default Signup
