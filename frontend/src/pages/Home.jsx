import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Activity, Shield, Cpu, Database } from 'lucide-react'

function Home() {
    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-medical-blue/10 rounded-full blur-[100px] -z-10"></div>

            {/* Navigation */}
            <nav className="flex justify-between items-center px-8 py-6 max-w-7xl mx-auto">
                <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-blue-600">
                    ThyroScan AI
                </div>
                <div className="space-x-4">
                    <Link to="/login" className="px-4 py-2 text-gray-300 hover:text-white transition-colors">Login</Link>
                    <Link to="/signup" className="px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/10">Sign Up</Link>
                </div>
            </nav>

            {/* Hero Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
                <div className="inline-flex items-center px-4 py-2 rounded-full bg-medical-blue/10 border border-medical-blue/20 text-medical-blue text-sm font-medium mb-8 animate-fade-in-up">
                    <span className="flex h-2 w-2 rounded-full bg-medical-blue mr-2"></span>
                    FDA-Compliant Architecture
                </div>

                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 animate-fade-in-up delay-100">
                    Next-Gen <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-medical-blue">Thyroid Cancer</span> <br />
                    Detection System
                </h1>

                <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-400 mb-10 animate-fade-in-up delay-200">
                    Harnessing Hybrid CNN+LSTM Deep Learning to detect Malignancy, Papillary, and Follicular carcinomas with medical-grade precision.
                </p>

                <div className="flex justify-center gap-4 animate-fade-in-up delay-300">
                    <Link to="/login" className="px-8 py-4 rounded-lg bg-medical-blue hover:bg-blue-600 text-white font-bold text-lg shadow-lg shadow-medical-blue/25 transition-all flex items-center gap-2">
                        Start Diagnosis <ArrowRight className="w-5 h-5" />
                    </Link>
                    <a href="#features" className="px-8 py-4 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold text-lg border border-gray-700 transition-all">
                        Learn More
                    </a>
                </div>
            </div>

            {/* Features Grid */}
            <div id="features" className="max-w-7xl mx-auto px-4 py-20">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <FeatureCard
                        icon={<Cpu className="w-8 h-8 text-sky-400" />}
                        title="Deep Learning Core"
                        desc="Powered by ResNet50 + LSTM Hybrid architecture for spatial and sequential feature extraction."
                    />
                    <FeatureCard
                        icon={<Activity className="w-8 h-8 text-green-400" />}
                        title="Multi-Class Analysis"
                        desc="Distinguishes between Benign, Papillary, Follicular, Anaplastic, and Medullary subtypes."
                    />
                    <FeatureCard
                        icon={<Shield className="w-8 h-8 text-purple-400" />}
                        title="Privacy First"
                        desc="All processing happens within a secure, isolated container environment. HIPAA ready."
                    />
                </div>
            </div>
        </div>
    )
}

function FeatureCard({ icon, title, desc }) {
    return (
        <div className="p-8 rounded-2xl bg-gray-900/50 border border-gray-800 hover:border-medical-blue/50 transition-colors group">
            <div className="mb-4 p-3 rounded-lg bg-gray-800 w-fit group-hover:bg-gray-700 transition-colors">
                {icon}
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
            <p className="text-gray-400">{desc}</p>
        </div>
    )
}

export default Home
