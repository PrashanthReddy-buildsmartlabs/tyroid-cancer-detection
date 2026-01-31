import { useState, useEffect } from 'react'
import { auth, db, storage } from '../firebase'
import { useNavigate } from 'react-router-dom'
import { collection, addDoc, query, where, getDocs, doc, setDoc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { updateProfile, updateEmail, deleteUser } from 'firebase/auth'
import {
    Activity,
    FileText,
    Settings,
    HelpCircle,
    LogOut,
    User,
    Menu,
    Plus,
    Clock,
    Edit2,
    Save,
    Trash2,
    Camera,
    X,
    Info,
    Sun,
    ArrowRight
} from 'lucide-react'

const MEDICAL_EXPLANATIONS = {
    "Benign": "A non-cancerous growth. It does not spread to other parts of the body and is usually harmless unless it grows large enough to press on nearby structures.",
    "Malignant": "Cancerous cells detected. Requires immediate medical attention and further diagnostic testing (FNAC/Biopsy).",
    "Papillary Thyroid Carcinoma": "The most common form of thyroid cancer (80% of cases). It usually grows slowly and typically spreads to lymph nodes in the neck. Highly curable.",
    "Follicular Thyroid Carcinoma": "The second most common type (10-15%). It is more likely to spread to distant organs like lungs or bones via the blood.",
    "Anaplastic Thyroid Carcinoma": "A rare and aggressive form of thyroid cancer (less than 2%). It grows very quickly and spreads rapidly. Urgent oncologist referral is critical.",
    "Medullary Thyroid Carcinoma": "A rare cancer (4%) that develops from C-cells. It can be genetic (MEN2 syndrome). Requires checking Calcitonin levels.",
    "Unknown": "The AI could not confidently classify this nodule. Please re-scan with a clearer image or consult a specialist."
}

function Dashboard() {
    const [file, setFile] = useState(null)
    const [preview, setPreview] = useState(null)
    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(false)
    const [heatmapActive, setHeatmapActive] = useState(false)
    const [user, setUser] = useState(null)
    const [userData, setUserData] = useState({}) // Extended Firestore data
    const [activeTab, setActiveTab] = useState('scan')

    // History State
    const [history, setHistory] = useState([])
    const [historyLoading, setHistoryLoading] = useState(false)





    // Account Editing State
    const [isEditing, setIsEditing] = useState(false)
    const [editForm, setEditForm] = useState({
        displayName: '',
        email: '',
        phone: '',
        address: ''
    })
    const [isSaving, setIsSaving] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    // Process Flow State
    const [processStep, setProcessStep] = useState(0)
    const [isProcessing, setIsProcessing] = useState(false)
    const [processFile, setProcessFile] = useState(null)
    const [processPreview, setProcessPreview] = useState(null)
    const [processResult, setProcessResult] = useState(null)

    const handleProcessUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        setProcessFile(file)
        setProcessPreview(URL.createObjectURL(file))
        setProcessResult(null)
        setProcessStep(1) // Step 1: Image Acquisition
        setIsProcessing(true)

        const animationPromise = new Promise(resolve => {
            setTimeout(() => { setProcessStep(2); }, 1500) // Step 2: Preprocessing
            setTimeout(() => { setProcessStep(3); resolve() }, 3500) // Step 3: Analysis
        })

        const formData = new FormData()
        formData.append('file', file)

        try {
            // Real Backend Call
            const apiPromise = fetch('http://localhost:5000/predict', {
                method: 'POST',
                body: formData
            }).then(res => res.json())

            // Wait for both animation and API
            const [_, data] = await Promise.all([animationPromise, apiPromise])

            if (data && data.result) {
                setProcessResult(data)
                setProcessStep(4) // Step 4: Heatmap

                // Step 5: Persistence (Delayed slightly for visual flow)
                setTimeout(async () => {
                    setProcessStep(5)
                    if (user) {
                        try {
                            await addDoc(collection(db, "scans"), {
                                userId: user.uid,
                                timestamp: new Date(),
                                diagnosis: data.diagnosis,
                                subtype: data.result,
                                confidence: data.confidence,
                                recommendation: data.recommendation,
                                heatmap_url: data.heatmap_url,
                                original_url: data.original_url
                            })
                            fetchHistory(user.uid) // Refresh history tab
                        } catch (err) {
                            console.error("Error saving scan:", err)
                        }
                    }
                }, 2000)

                // Step 6: Report Ready
                setTimeout(() => {
                    setProcessStep(6)
                    setIsProcessing(false)
                }, 4000)
            } else {
                alert("Analysis failed: " + (data.error || "Unknown error"))
                setIsProcessing(false)
            }

        } catch (error) {
            console.error("Process Flow Error:", error)
            alert("Error connecting to diagnostic server")
            setIsProcessing(false)
        }
    }

    /* REMOVED startProcessAnimation helper as it's merged above */


    const navigate = useNavigate()

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            if (currentUser) {
                setUser(currentUser)
                // Fetch extended profile
                const userDocFn = await getDoc(doc(db, "users", currentUser.uid))
                if (userDocFn.exists()) {
                    setUserData(userDocFn.data())
                }
                fetchHistory(currentUser.uid)

                // Init form
                setEditForm({
                    displayName: currentUser.displayName || '',
                    email: currentUser.email || '',
                    phone: userDocFn.data()?.phone || '',
                    address: userDocFn.data()?.address || ''
                })
            }
        })
        return () => unsubscribe()
    }, [])

    const fetchHistory = async (userId) => {
        setHistoryLoading(true)
        try {
            // REMOVED orderBy to avoid index issues. Sorting in JS.
            const q = query(
                collection(db, "scans"),
                where("userId", "==", userId)
            );
            const querySnapshot = await getDocs(q);
            const docs = []
            querySnapshot.forEach((doc) => {
                docs.push({ id: doc.id, ...doc.data() })
            });
            // Client-side sort
            docs.sort((a, b) => {
                const timeA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(0)
                const timeB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(0)
                return timeB - timeA
            })
            setHistory(docs)
        } catch (error) {
            console.error("Error fetching history:", error)
        } finally {
            setHistoryLoading(false)
        }
    }

    const handleLogout = () => {
        auth.signOut()
        navigate('/login')
    }

    const handleFileChange = (e) => {
        const selected = e.target.files[0]
        if (selected) {
            setFile(selected)
            setPreview(URL.createObjectURL(selected))
            setResult(null)
        }
    }

    const handleUpload = async () => {
        if (!file) return
        setLoading(true)

        const formData = new FormData()
        formData.append('file', file)

        try {
            const response = await fetch('http://localhost:5000/predict', {
                method: 'POST',
                body: formData
            })
            const data = await response.json()
            if (response.ok) {
                setResult(data)
                if (user) {
                    await addDoc(collection(db, "scans"), {
                        userId: user.uid,
                        timestamp: new Date(),
                        diagnosis: data.diagnosis,
                        subtype: data.result,
                        confidence: data.confidence,
                        recommendation: data.recommendation,
                        heatmap_url: data.heatmap_url,
                        original_url: data.original_url
                    })
                    fetchHistory(user.uid)
                }
            } else {
                alert("Error: " + data.error)
            }
        } catch (error) {
            alert("Error connecting to server")
        } finally {
            setLoading(false)
        }
    }

    const handleProfileUpdate = async () => {
        setIsSaving(true)
        try {
            // 1. Update Auth Profile (Name, Email)
            if (auth.currentUser) {
                if (editForm.displayName !== user.displayName) {
                    await updateProfile(auth.currentUser, { displayName: editForm.displayName })
                }
                if (editForm.email !== user.email && editForm.email) {
                    // Note: Re-auth might be required in production
                    await updateEmail(auth.currentUser, editForm.email)
                }
            }

            // 2. Update Firestore Profile (Phone, Address)
            await setDoc(doc(db, "users", user.uid), {
                phone: editForm.phone,
                address: editForm.address,
                updatedAt: new Date()
            }, { merge: true })

            // Refresh local state
            setUser({ ...auth.currentUser })
            setUserData(prev => ({ ...prev, phone: editForm.phone, address: editForm.address }))
            setIsEditing(false)
            alert("Profile updated successfully!")
        } catch (error) {
            console.error(error)
            alert("Failed to update profile: " + error.message)
        } finally {
            setIsSaving(false)
        }
    }

    const handleProfilePicUpload = async (e) => {
        const file = e.target.files[0]
        if (!file || !user) return

        try {
            const storageRef = ref(storage, `profile_images/${user.uid}`)
            await uploadBytes(storageRef, file)
            const url = await getDownloadURL(storageRef)

            await updateProfile(auth.currentUser, { photoURL: url })
            setUser({ ...auth.currentUser, photoURL: url }) // Force re-render
        } catch (error) {
            alert("Error uploading image")
        }
    }

    const handleDeleteScan = async (scanId) => {
        if (!scanId) return

        if (window.confirm("Are you sure you want to permanently delete this record?")) {
            try {
                await deleteDoc(doc(db, "scans", scanId))
                setHistory(prev => prev.filter(item => item.id !== scanId))
            } catch (error) {
                console.error("Error deleting scan:", error)
                alert("Failed to delete record: " + error.message)
            }
        }
    }

    const findHospital = () => {
        window.open("https://www.google.com/maps/search/thyroid+cancer+specialists+hospitals+near+me", "_blank")
    }

    const handleDeleteAccount = async () => {
        if (window.confirm("Are you sure you want to delete your account? This cannot be undone.")) {
            try {
                await deleteUser(auth.currentUser)
                // navigate passed via props or hook usage, typically handled by AuthStateChange in App.jsx but good to have explicit redirect
                window.location.reload()
            } catch (e) {
                alert("Wait! Need to re-login to perform sensitive action.")
            }
        }
    }



    const toggleProcessFlow = async () => {
        if (!user) return
        const newValue = !userData.showProcessFlow
        setUserData({ ...userData, showProcessFlow: newValue })
        try {
            await setDoc(doc(db, "users", user.uid), { showProcessFlow: newValue }, { merge: true })
        } catch (error) {
            console.error("Error updating settings:", error)
            // Revert on error
            setUserData({ ...userData, showProcessFlow: !newValue })
        }
    }

    const downloadReport = async (predictionData = result) => {
        if (!predictionData) return
        try {
            const response = await fetch('http://localhost:5000/generate_report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: Date.now(),
                    dataset: "Thyroid Ultrasound",
                    prediction: predictionData,
                    date: new Date().toLocaleDateString() // Added Date Fix
                })
            })
            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `Thyroid_Report_${Date.now()}.pdf`
            a.click()
        } catch (e) {
            alert("Failed to download report")
        }
    }

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-gray-100 transition-colors duration-300">

            {/* SIDEBAR */}
            <aside className="w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 hidden md:flex flex-col transition-colors duration-300">
                <div className="h-16 flex items-center px-6 border-b border-gray-100 dark:border-slate-800">
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-500 to-indigo-600">
                        ThyroScan AI
                    </span>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <SidebarItem
                        icon={<Plus size={20} />}
                        label="New Scan"
                        active={activeTab === 'scan'}
                        onClick={() => setActiveTab('scan')}
                    />
                    <SidebarItem
                        icon={<Clock size={20} />}
                        label="History"
                        active={activeTab === 'history'}
                        onClick={() => setActiveTab('history')}
                    />
                    <SidebarItem
                        icon={<FileText size={20} />}
                        label="My Reports"
                        active={activeTab === 'reports'}
                        onClick={() => setActiveTab('reports')}
                    />
                    {/* Process Flow Tab (Conditional) */}
                    {userData.showProcessFlow && (
                        <SidebarItem
                            icon={<Activity size={20} />}
                            label="AI Process Flow"
                            active={activeTab === 'process'}
                            onClick={() => setActiveTab('process')}
                        />
                    )}

                    <div className="pt-8 pb-2 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Settings
                    </div>
                    <SidebarItem
                        icon={<Settings size={20} />}
                        label="Account"
                        active={activeTab === 'account'}
                        onClick={() => setActiveTab('account')}
                    />
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-3 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                    >
                        <LogOut size={20} />
                        <span className="font-medium">Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col overflow-hidden">

                {/* HEADER */}
                <header className="h-16 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between px-8 shadow-sm z-10 transition-colors duration-300">
                    <div className="md:hidden">
                        <button onClick={() => setIsMobileMenuOpen(true)}>
                            <Menu className="text-gray-500 dark:text-gray-400" />
                        </button>
                    </div>

                    <div className="flex-1 px-8 md:block hidden">
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                            {activeTab === 'scan' && 'Dashboard Overview'}
                            {activeTab === 'history' && 'Scan History'}
                            {activeTab === 'reports' && 'Generated Reports'}
                            {activeTab === 'account' && 'My Profile'}
                        </h2>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3 pl-6 border-l border-gray-200 dark:border-slate-700">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.displayName || "Loading..."}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email || ""}</p>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-sky-100 to-indigo-100 dark:from-sky-900 dark:to-indigo-900 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center overflow-hidden">
                                {user?.photoURL ? (
                                    <img src={user.photoURL} alt="Profile" className="h-full w-full object-cover" />
                                ) : (
                                    <User className="text-indigo-400" size={20} />
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {/* CONTENT SCROLLABLE AREA */}
                <main className="flex-1 overflow-auto bg-gray-50 dark:bg-slate-950 p-4 md:p-8 transition-colors duration-300">

                    {/* TAB: NEW SCAN (Active) */}
                    {activeTab === 'scan' && (
                        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

                            {/* LEFT: Upload Card */}
                            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 flex flex-col h-full transition-colors duration-300">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                    <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
                                    Ultrasound Input
                                </h3>

                                <div className="w-full h-72 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center relative overflow-hidden group hover:border-blue-400 dark:hover:border-blue-500 transition-colors bg-gray-50 dark:bg-slate-950">
                                    {preview ? (
                                        <img src={preview} alt="Upload Preview" className="w-full h-full object-contain p-2" />
                                    ) : (
                                        <div className="text-center p-6">
                                            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                                                <Plus size={32} />
                                            </div>
                                            <p className="text-gray-600 dark:text-gray-300 font-medium">Click to upload ultrasound</p>
                                            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Supports PNG, JPG, DICOM (Converted)</p>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        onChange={handleFileChange}
                                    />
                                </div>

                                <button
                                    onClick={handleUpload}
                                    disabled={!file || loading}
                                    className={`mt-6 w-full py-3.5 rounded-xl font-semibold shadow-lg transition-all transform active:scale-95 ${(!file || loading)
                                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-blue-500/30'
                                        }`}
                                >
                                    {loading ? 'Processing Analysis...' : 'Run Diagnostics'}
                                </button>
                            </div>

                            {/* RIGHT: Results Card */}
                            {result ? (
                                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 flex flex-col h-full animate-fade-in-up transition-colors duration-300">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Diagnosis Report</h3>
                                            <p className="text-gray-400 dark:text-gray-500 text-sm">ID: #{Date.now().toString().slice(-6)}</p>
                                        </div>
                                        <span className={`px-4 py-1 rounded-full text-sm font-bold border ${result.diagnosis === 'Malignant'
                                            ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/50'
                                            : 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-100 dark:border-green-900/50'
                                            }`}>
                                            {result.diagnosis === 'Benign' ? 'Benign Nodule' : result.result}
                                        </span>
                                    </div>

                                    <div className="space-y-4 flex-1 flex flex-col justify-between">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700">
                                                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-semibold">Confidence</p>
                                                <p className="text-lg font-mono font-bold text-slate-800 dark:text-white mt-0.5">{result.confidence}</p>
                                            </div>
                                            <div className="bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700 relative group/tooltip cursor-help">
                                                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-semibold">Type (Hover Info)</p>
                                                <p className="text-base font-bold text-slate-800 dark:text-white mt-0.5 truncate flex items-center gap-2">
                                                    {result.diagnosis}
                                                    <Info size={14} className="text-blue-400" />
                                                </p>

                                                {/* HOVER HINT DROPDOWN */}
                                                <div className="absolute top-full left-0 mt-2 w-64 bg-gray-900/95 dark:bg-black/95 text-white text-xs p-3 rounded-xl shadow-xl backdrop-blur z-20 opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none group-hover/tooltip:pointer-events-auto">
                                                    <p className="font-bold mb-1 border-b border-gray-700 pb-1">{result.diagnosis}</p>
                                                    <p className="leading-relaxed text-gray-300">
                                                        {MEDICAL_EXPLANATIONS[result.diagnosis] || MEDICAL_EXPLANATIONS["Unknown"]}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-100 dark:border-amber-900/40">
                                            <p className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-semibold mb-0.5 flex items-center gap-2">
                                                <Activity size={10} /> Clinical Recommendation
                                            </p>
                                            <p className="text-amber-900 dark:text-amber-200 font-medium text-sm">{result.recommendation}</p>
                                        </div>

                                        {/* Nearest Hospital Button for Malignant Cases */}
                                        {result.diagnosis === 'Malignant' && (
                                            <button
                                                onClick={findHospital}
                                                className="w-full py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                                            >
                                                <Activity size={16} /> Locate Nearest Specialists
                                            </button>
                                        )}

                                        {/* Heatmap Toggle View - Simple Code */}
                                        <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 group bg-black h-72">
                                            <div className="absolute top-3 right-3 z-10">
                                                <button
                                                    onClick={() => setHeatmapActive(!heatmapActive)}
                                                    className="bg-white/90 dark:bg-black/90 hover:bg-white dark:hover:bg-black text-gray-800 dark:text-gray-200 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm backdrop-blur transition-all"
                                                >
                                                    {heatmapActive ? 'Show Original' : 'Show AI Attention'}
                                                </button>
                                            </div>
                                            <img
                                                src={`http://localhost:5000${heatmapActive ? result.heatmap_url : result.original_url}?t=${Date.now()}`}
                                                className="w-full h-full object-contain bg-black"
                                                alt="Analysis Result"
                                            />
                                        </div>
                                    </div>

                                    <button onClick={() => downloadReport(result)} className="mt-4 w-full py-3 rounded-xl border-2 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold hover:border-slate-200 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
                                        <FileText size={18} />
                                        Download PDF Report
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 flex flex-col h-full items-center justify-center text-center min-h-[400px] transition-colors duration-300">
                                    <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-gray-300 dark:text-slate-600">
                                        <Activity size={32} />
                                    </div>
                                    <h4 className="text-gray-900 dark:text-white font-medium mb-2">Ready to Analyze</h4>
                                    <p className="text-gray-400 dark:text-gray-500 text-sm max-w-xs">Upload a scan on the left to generate a real-time AI diagnosis report.</p>
                                </div>
                            )}
                        </div>
                    )}



                    {/* TAB: HISTORY (REAL) */}
                    {activeTab === 'history' && (
                        <div className="max-w-6xl mx-auto">
                            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors duration-300 overflow-x-auto">
                                <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center">
                                    <span className="font-semibold text-gray-700 dark:text-gray-200">Scan History</span>
                                    <button onClick={() => user && fetchHistory(user.uid)} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Refresh</button>
                                </div>
                                {historyLoading ? (
                                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading history...</div>
                                ) : history.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">No scans found. Start a new diagnosis!</div>
                                ) : (
                                    <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                                        <thead className="bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 uppercase text-xs">
                                            <tr>
                                                <th className="px-6 py-3">Date</th>
                                                <th className="px-6 py-3">Subtype</th>
                                                <th className="px-6 py-3">Diagnosis</th>
                                                <th className="px-6 py-3">Confidence</th>
                                                <th className="px-6 py-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                            {history.map((scan) => (
                                                <tr key={scan.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                                                        {scan.timestamp?.toDate ? scan.timestamp.toDate().toLocaleDateString() : 'Just now'}
                                                    </td>
                                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{scan.subtype}</td>
                                                    <td className={`px-6 py-4 font-bold ${scan.diagnosis === 'Malignant' ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                                        {scan.diagnosis}
                                                    </td>
                                                    <td className="px-6 py-4">{scan.confidence}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteScan(scan.id); }}
                                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                            title="Delete Record"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB: REPORTS */}
                    {activeTab === 'reports' && (
                        <div className="max-w-4xl mx-auto">
                            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors duration-300">
                                <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 font-semibold text-gray-700 dark:text-gray-200">My Reports</div>
                                {history.length === 0 ? (
                                    <div className="p-12 text-center text-gray-400">
                                        <FileText size={48} className="mb-4 text-gray-200 dark:text-gray-700 mx-auto" />
                                        <p>No reports generated yet.</p>
                                    </div>
                                ) : (
                                    <ul className="divide-y divide-gray-100 dark:divide-slate-800">
                                        {history.map((scan) => (
                                            <li key={scan.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
                                                        <FileText size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900 dark:text-gray-100">Medical Report - {scan.subtype}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">{scan.timestamp?.toDate ? scan.timestamp.toDate().toLocaleDateString() : 'Just now'}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => downloadReport({
                                                        result: scan.subtype,
                                                        diagnosis: scan.diagnosis,
                                                        confidence: scan.confidence,
                                                        recommendation: scan.recommendation,
                                                        heatmap_url: scan.heatmap_url,
                                                        original_url: scan.original_url
                                                    })}
                                                    className="px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-medium hover:bg-white dark:hover:bg-slate-800 hover:border-blue-400 hover:text-blue-600 transition-colors dark:text-gray-300"
                                                >
                                                    Download
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB: ACCOUNT (EDITABLE) */}
                    {activeTab === 'account' && (
                        <div className="max-w-3xl mx-auto">
                            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors duration-300">
                                <div className="p-6 md:p-8 border-b border-gray-100 dark:border-slate-800 flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
                                    {/* Profile Image with Edit Overlay */}
                                    <div className="relative group w-24 h-24 rounded-full bg-gray-100 dark:bg-slate-800 flex-shrink-0 cursor-pointer overflow-hidden border-4 border-white dark:border-slate-700 shadow-md">
                                        {user?.photoURL ? (
                                            <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                <User size={40} />
                                            </div>
                                        )}
                                        <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                            <Camera className="text-white" size={24} />
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleProfilePicUpload}
                                            />
                                        </label>
                                    </div>

                                    <div className="flex-1 w-full md:w-auto text-center md:text-left">
                                        <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-4">
                                            <div className="min-w-0">
                                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white truncate" title={user?.displayName}>{user?.displayName || "User Name"}</h2>
                                                <p className="text-gray-500 dark:text-gray-400 truncate" title={user?.email}>{user?.email}</p>
                                            </div>
                                            <button
                                                onClick={() => setIsEditing(!isEditing)}
                                                className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-medium text-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                                            >
                                                {isEditing ? <X size={16} /> : <Edit2 size={16} />}
                                                {isEditing ? 'Cancel' : 'Edit Profile'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-8">
                                    {isEditing ? (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                                    <input
                                                        type="text"
                                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                        value={editForm.displayName}
                                                        onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                                    <input
                                                        type="email"
                                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                        value={editForm.email}
                                                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                                    <input
                                                        type="tel"
                                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                        value={editForm.phone}
                                                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                                        placeholder="+1 (555) 000-0000"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                                <textarea
                                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                                                    value={editForm.address}
                                                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                                    placeholder="Enter your clinic or home address..."
                                                />
                                            </div>
                                            <div className="flex justify-end gap-3 pt-4">
                                                <button
                                                    onClick={handleProfileUpdate}
                                                    disabled={isSaving}
                                                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:bg-blue-400"
                                                >
                                                    <Save size={18} />
                                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="grid grid-cols-2 gap-8">
                                                <div>
                                                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Phone Number</p>
                                                    <p className="text-gray-900 font-medium">{userData.phone || "Not set"}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Address</p>
                                                    <p className="text-gray-900">{userData.address || "Not set"}</p>
                                                </div>
                                            </div>



                                            <div className="flex items-center justify-between py-4 border-t border-gray-100">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg ${userData.showProcessFlow ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                                                        <Activity size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900">Show AI Process Flow</p>
                                                        <p className="text-xs text-gray-500">Visualize the diagnosis pipeline</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={toggleProcessFlow}
                                                    className={`relative w-12 h-6 rounded-full transition-colors ${userData.showProcessFlow ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                                >
                                                    <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${userData.showProcessFlow ? 'translate-x-6' : 'translate-x-0'}`} />
                                                </button>
                                            </div>

                                            <div className="pt-8 border-t border-gray-100 flex gap-4">
                                                <button onClick={handleLogout} className="text-gray-600 hover:text-gray-900 text-sm font-medium flex items-center gap-2">
                                                    <LogOut size={16} /> Sign Out
                                                </button>
                                                <button onClick={handleDeleteAccount} className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center gap-2">
                                                    <Trash2 size={16} /> Delete Account
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}



                    {/* TAB: PROCESS FLOW (New) */}
                    {activeTab === 'process' && (
                        <div className="max-w-5xl mx-auto">
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-h-[600px] flex flex-col">
                                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                    <div>
                                        <h3 className="font-bold text-gray-800 text-lg">Real-Time AI Processing</h3>
                                        <p className="text-gray-500 text-xs">Live diagnostic pipeline with real-time Grad-CAM visualization</p>
                                    </div>
                                    {isProcessing && <span className="animate-pulse text-indigo-600 font-bold text-sm">Processing Scan...</span>}
                                </div>

                                <div className="p-8 flex-1 flex flex-col items-center justify-center">
                                    {!processPreview ? (
                                        <div className="text-center">
                                            <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-500 animate-bounce-slow">
                                                <Camera size={48} />
                                            </div>
                                            <h2 className="text-2xl font-bold text-gray-800 mb-2">Inititate Diagnostic Pipeline</h2>
                                            <p className="text-gray-500 max-w-md mx-auto mb-8">
                                                Upload a live patient ultrasound. The system will process it through the Hybrid CNN+LSTM model, generate a real-time Grad-CAM heatmap, and store the clinical report.
                                            </p>
                                            <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-blue-200 transition-all transform hover:scale-105 active:scale-95">
                                                <span>Run Live Diagnosis</span>
                                                <input type="file" className="hidden" accept="image/*" onChange={handleProcessUpload} />
                                            </label>
                                        </div>
                                    ) : (
                                        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                                            {/* Visualizer Area */}
                                            <div className="flex flex-col gap-4">
                                                <div
                                                    className="relative aspect-square bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border-4 border-gray-800 group cursor-pointer"
                                                    onClick={() => processStep === 6 && downloadReport(processResult)}
                                                    title={processStep === 6 ? "Click to Download Report" : ""}
                                                >
                                                    {/* Base Image (Hidden when heatmap is fully active, or visible for comparison) */}
                                                    <img
                                                        src={processPreview}
                                                        className={`w-full h-full object-cover transition-all duration-700 ${processStep >= 4 ? 'opacity-20' : 'opacity-100'}`}
                                                        alt="Process Input"
                                                    />

                                                    {/* Step 2: Scanner Effect */}
                                                    {processStep === 2 && (
                                                        <div className="absolute inset-0 bg-indigo-500/10 flex items-center justify-center z-20">
                                                            <div className="w-full h-1 bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.8)] animate-[scan_2s_linear_infinite]"></div>
                                                            <div className="absolute top-4 left-4 text-cyan-400 font-mono text-xs bg-black/70 px-2 py-1 rounded border border-cyan-500/30">Preprocessing: 224x224 Norm</div>
                                                        </div>
                                                    )}

                                                    {/* Step 3: CNN Grid Analysis */}
                                                    {processStep === 3 && (
                                                        <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 gap-0.5 opacity-40 z-20">
                                                            {[...Array(16)].map((_, i) => (
                                                                <div key={i} className="bg-emerald-400/30 animate-pulse border border-emerald-500/20" style={{ animationDelay: `${i * 100}ms` }} />
                                                            ))}
                                                            <div className="absolute bottom-4 left-4 text-emerald-400 font-mono text-xs bg-black/70 px-2 py-1 rounded border border-emerald-500/30">Feature Extraction: Active</div>
                                                        </div>
                                                    )}

                                                    {/* Step 4+: Real Gradient Heatmap */}
                                                    {(processStep >= 4 && processResult?.heatmap_url) && (
                                                        <div className="absolute inset-0 z-10 transition-opacity duration-1000 group-hover:opacity-0">
                                                            <img src={`http://localhost:5000${processResult.heatmap_url}`} className="w-full h-full object-cover" alt="Grad-CAM Heatmap" />
                                                            <div className="absolute top-4 right-4 text-white font-bold text-xs bg-red-600/90 px-3 py-1 rounded-full shadow-lg backdrop-blur-sm animate-fade-in">Malignancy Hotspot</div>
                                                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-xs font-mono">Hover to see original</div>
                                                        </div>
                                                    )}

                                                    {/* Original Image Reveal on Hover (Active at Step 4+) */}
                                                    {(processStep >= 4) && (
                                                        <img
                                                            src={processPreview}
                                                            className="absolute inset-0 w-full h-full object-cover z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                                            alt="Original Reveal"
                                                        />
                                                    )}

                                                    {/* Final Download Overlay */}
                                                    {processStep === 6 && (
                                                        <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-colors z-30 flex items-center justify-center pointer-events-none group-hover:pointer-events-auto">
                                                            <div className="opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                                                                <button className="bg-white text-indigo-600 px-6 py-2 rounded-full font-bold shadow-lg flex items-center gap-2">
                                                                    <FileText size={18} /> Download Report
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Meta Data Box (Appears at End) */}
                                                {processStep >= 5 && processResult && (
                                                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm animate-fade-in">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className="font-bold text-gray-700">Analysis Results</span>
                                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${processResult.diagnosis === 'Malignant' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                                                {processResult.diagnosis}
                                                            </span>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-y-1 text-gray-600">
                                                            <span>Subtype:</span> <span className="font-mono text-gray-900">{processResult.result}</span>
                                                            <span>Confidence:</span> <span className="font-mono text-gray-900">{processResult.confidence}</span>
                                                            <span>Date:</span> <span className="font-mono text-gray-900">{new Date().toLocaleDateString()}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Timeline Steps */}
                                            <div className="space-y-6">
                                                <ProcessStep
                                                    step={1} current={processStep}
                                                    icon={<Camera size={20} />}
                                                    title="Image Acquisition"
                                                    desc="Scanning high-resolution ultrasound input."
                                                    details="Captures high-resolution ultrasound images directly from the user upload. The system accepts standard image formats (PNG, JPG) and automatically converts medical DICOM files for processing."
                                                />
                                                <ProcessStep
                                                    step={2} current={processStep}
                                                    icon={<Settings size={20} />}
                                                    title="Preprocessing"
                                                    desc="Normalization & Noise Reduction (CLAHE)."
                                                    details="Standardizes the input image by resizing it to a fixed 224x224 pixel matrix and applies Contrast Limited Adaptive Histogram Equalization (CLAHE) to enhance nodule visibility and reduce sensor noise."
                                                />
                                                <ProcessStep
                                                    step={3} current={processStep}
                                                    icon={<Activity size={20} />}
                                                    title="CNN + LSTM Analysis"
                                                    desc="Hybrid Architecture scanning features & sequences."
                                                    details="A wrapper Hybrid Deep Learning model where the Convolutional Neural Network (CNN) extracts spatial features (texture, edges) and the Long Short-Term Memory (LSTM) network interprets sequential spatial dependencies."
                                                />
                                                <ProcessStep
                                                    step={4} current={processStep}
                                                    icon={<Sun size={20} />}
                                                    title="Grad-CAM Visualization"
                                                    desc="Generating class-activation heatmap overlay."
                                                    details="Gradient-weighted Class Activation Mapping (Grad-CAM) algorithm generates a heatmap overlay, highlighting the exact regions (pixels) of the nodule that the AI focused on to arrive at its diagnosis."
                                                />
                                                <ProcessStep
                                                    step={5} current={processStep}
                                                    icon={<Save size={20} />}
                                                    title="Cloud Persistence"
                                                    desc={`Encrypted storage in user/${user?.uid || 'guest'}/scans.`}
                                                    details="Securely encrypts and stores the unique scan results, diagnosis data, and generated images in Firestore and Firebase Storage for long-term retrieval and patient history tracking."
                                                />
                                                <ProcessStep
                                                    step={6} current={processStep}
                                                    icon={<FileText size={20} />}
                                                    title="Report Generation"
                                                    desc="Compiling clinical PDF with findings."
                                                    details="Compiles all diagnostic findings, including the generated heatmap, confidence scores, and raw metadata, into a professional PDF report ready for clinical review and download."
                                                    isLast
                                                />

                                                {processStep === 6 && (
                                                    <button
                                                        onClick={() => { setProcessStep(0); setProcessPreview(null); setProcessResult(null); }}
                                                        className="mt-6 w-full py-3 border-2 border-dashed border-gray-300 text-gray-500 hover:border-indigo-500 hover:text-indigo-600 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
                                                    >
                                                        Run New Analysis <ArrowRight size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                </main>
            </div >

            {/* MOBILE MENU OVERLAY */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-50 md:hidden flex">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsMobileMenuOpen(false)}
                    ></div>

                    {/* Drawer */}
                    <aside className="relative w-64 bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col animate-slide-in-left">
                        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100 dark:border-slate-800">
                            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-500 to-indigo-600">
                                ThyroScan AI
                            </span>
                            <button onClick={() => setIsMobileMenuOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                            <SidebarItem
                                icon={<Plus size={20} />}
                                label="New Scan"
                                active={activeTab === 'scan'}
                                onClick={() => { setActiveTab('scan'); setIsMobileMenuOpen(false); }}
                            />
                            <SidebarItem
                                icon={<Clock size={20} />}
                                label="History"
                                active={activeTab === 'history'}
                                onClick={() => { setActiveTab('history'); setIsMobileMenuOpen(false); }}
                            />
                            <SidebarItem
                                icon={<FileText size={20} />}
                                label="My Reports"
                                active={activeTab === 'reports'}
                                onClick={() => { setActiveTab('reports'); setIsMobileMenuOpen(false); }}
                            />
                            {userData.showProcessFlow && (
                                <SidebarItem
                                    icon={<Activity size={20} />}
                                    label="AI Process Flow"
                                    active={activeTab === 'process'}
                                    onClick={() => { setActiveTab('process'); setIsMobileMenuOpen(false); }}
                                />
                            )}

                            <div className="pt-8 pb-2 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                Settings
                            </div>
                            <SidebarItem
                                icon={<Settings size={20} />}
                                label="Account"
                                active={activeTab === 'account'}
                                onClick={() => { setActiveTab('account'); setIsMobileMenuOpen(false); }}
                            />
                        </nav>

                        <div className="p-4 border-t border-gray-100 dark:border-slate-800">
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-3 w-full px-4 py-3 text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 rounded-lg transition-colors"
                            >
                                <LogOut size={20} />
                                <span className="font-medium">Sign Out</span>
                            </button>
                        </div>
                    </aside>
                </div>
            )}
        </div >
    )
}

// Helper Components
// Helper Component for Animation
function ProcessStep({ step, current, icon, title, desc, details, isLast }) {
    const isActive = current === step
    const isCompleted = current > step

    return (
        <div className="flex gap-4 relative group cursor-help">
            <div className={`
                w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 shrink-0 z-10
                ${isCompleted ? 'bg-green-100 text-green-600' : isActive ? 'bg-blue-600 text-white scale-110 shadow-lg' : 'bg-gray-100 text-gray-400'}
            `}>
                {isCompleted ? <div className="text-lg">✓</div> : icon}
            </div>

            {!isLast && (
                <div className={`absolute left-5 top-10 bottom-[-32px] w-0.5 -z-0 transition-colors duration-500 ${isCompleted ? 'bg-green-200' : 'bg-gray-100'}`}></div>
            )}

            <div className={`transition-opacity duration-500 ${isActive || isCompleted ? 'opacity-100' : 'opacity-40'}`}>
                <h4 className={`font-bold text-sm ${isActive ? 'text-blue-600' : 'text-gray-900'}`}>{title}</h4>
                <p className="text-xs text-gray-500">{desc}</p>
            </div>

            {/* Hover Tooltip - Popup to Right */}
            <div className="absolute left-14 top-0 ml-2 w-64 bg-gray-900/95 text-white p-4 rounded-xl shadow-2xl z-50 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none transform translate-x-4 group-hover:translate-x-0 invisible group-hover:visible backdrop-blur-sm border border-gray-700">
                <div className="absolute top-3 -left-2 w-4 h-4 bg-gray-900/95 transform rotate-45 border-l border-b border-gray-700"></div>
                <h5 className="font-bold text-sm mb-1 text-indigo-300 flex items-center gap-2">
                    {icon} {title}
                </h5>
                <p className="text-xs leading-relaxed text-gray-300 font-light tracking-wide">
                    {details || desc}
                </p>
            </div>
        </div>
    )
}



function SidebarItem({ icon, label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${active
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
        >
            {icon}
            <span className="text-sm">{label}</span>
        </button>
    )
}

export default Dashboard
