import { useState, useEffect, useRef } from "react";
import "./login.css";
import bg2 from "./assets/images/bg2.jpg";
import logo from "./assets/images/arl-logo.png";

function Login({
    formData,
    setFormData,
    onLogin,
    error,
}) {
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [focusedInput, setFocusedInput] = useState(null);

    // High performance mouse tracking with requestAnimationFrame
    const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
    const animFrameRef = useRef(null);
    const lastMouseRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e) => {
            lastMouseRef.current = { x: e.clientX, y: e.clientY };

            if (!animFrameRef.current) {
                animFrameRef.current = requestAnimationFrame(() => {
                    const width = window.innerWidth || 1000;
                    const height = window.innerHeight || 800;

                    // Normalized mouse pos -1 to 1
                    const normX = (lastMouseRef.current.x / width) * 2 - 1;
                    const normY = (lastMouseRef.current.y / height) * 2 - 1;

                    // Max 7px eye translation
                    setEyeOffset({
                        x: Math.max(-7, Math.min(7, normX * 7)),
                        y: Math.max(-6, Math.min(6, normY * 6))
                    });

                    animFrameRef.current = null;
                });
            }
        };

        window.addEventListener("mousemove", handleMouseMove, { passive: true });
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onLogin();
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calculate eye shift based on focus state or mouse movement
    const getEyeTransform = () => {
        if (focusedInput === "username") {
            return "translate(0px, 5px)"; // Character looking down at username input
        }
        return `translate(${eyeOffset.x.toFixed(1)}px, ${eyeOffset.y.toFixed(1)}px)`;
    };

    return (
        <div
            className="auth-page"
            style={{ backgroundImage: `url(${bg2})` }}
        >
            {/* Optimized Ambient Background Glows */}
            <div className="auth-ambient-glow glow-1" aria-hidden="true" />
            <div className="auth-ambient-glow glow-2" aria-hidden="true" />

            {/* Main Login Wrapper containing Mascot Character pulling in the Card */}
            <div className="auth-stage">
                
                {/* CHARACTER MASCOT PULLING IN THE CARD */}
                <div className={`auth-puller-character ${focusedInput === "password" ? "privacy-mode" : ""} ${error ? "error-mode" : ""}`}>
                    <svg 
                        className="character-svg" 
                        width="110" 
                        height="100" 
                        viewBox="0 0 120 110" 
                        fill="none" 
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        {/* Antenna & Pulsing Light */}
                        <circle cx="60" cy="12" r="5" fill="#3b82f6" className="char-antenna-light" />
                        <line x1="60" y1="17" x2="60" y2="26" stroke="#60a5fa" strokeWidth="3" />

                        {/* Hands holding / pulling the card top edge */}
                        <g className="char-hands-pulling">
                            <rect x="22" y="92" width="16" height="12" rx="5" fill="#3b82f6" stroke="#1e40af" strokeWidth="2" />
                            <rect x="82" y="92" width="16" height="12" rx="5" fill="#3b82f6" stroke="#1e40af" strokeWidth="2" />
                        </g>
                        
                        {/* Robot Head Outer Shell */}
                        <rect x="30" y="26" width="60" height="52" rx="18" fill="url(#botHeadGrad)" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                        
                        {/* Visor Screen */}
                        <rect x="37" y="35" width="46" height="30" rx="10" fill="#090d16" stroke="#1e293b" strokeWidth="2" />

                        {/* Eye pupil logic */}
                        {focusedInput === "password" && !showPassword ? (
                            /* Privacy Shield visor when typing password */
                            <g className="char-shield-eyes">
                                <path d="M44 50 L52 50 M68 50 L76 50" stroke="#60a5fa" strokeWidth="4" strokeLinecap="round" />
                                <rect x="53" y="42" width="14" height="16" rx="4" fill="#3b82f6" />
                                <path d="M60 45 V52" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                            </g>
                        ) : (
                            /* Eye Pupil Mouse Tracking */
                            <g className="char-eyes-group" style={{ transform: getEyeTransform() }}>
                                {/* Left Eye */}
                                <circle cx="50" cy="50" r="6.5" fill={error ? "#ef4444" : "#60a5fa"} />
                                <circle cx="52" cy="48" r="2.2" fill="#ffffff" />
                                
                                {/* Right Eye */}
                                <circle cx="70" cy="50" r="6.5" fill={error ? "#ef4444" : "#60a5fa"} />
                                <circle cx="72" cy="48" r="2.2" fill="#ffffff" />
                            </g>
                        )}

                        {/* Mouth expression */}
                        <path 
                            d={error ? "M52 61 Q60 56 68 61" : focusedInput ? "M53 58 Q60 64 67 58" : "M54 59 Q60 63 66 59"} 
                            stroke={error ? "#ef4444" : "#94a3b8"} 
                            strokeWidth="2.5" 
                            strokeLinecap="round" 
                            fill="none"
                        />

                        {/* Cheek glows */}
                        <circle cx="42" cy="57" r="3" fill="#38bdf8" opacity="0.4" />
                        <circle cx="78" cy="57" r="3" fill="#38bdf8" opacity="0.4" />

                        {/* Neck Connection */}
                        <path d="M48 78 L72 78 L76 94 L44 94 Z" fill="url(#botBodyGrad)" opacity="0.9" />

                        <defs>
                            <linearGradient id="botHeadGrad" x1="30" y1="26" x2="90" y2="78" gradientUnits="userSpaceOnUse">
                                <stop stopColor="#1e293b" />
                                <stop offset="1" stopColor="#0f172a" />
                            </linearGradient>
                            <linearGradient id="botBodyGrad" x1="44" y1="78" x2="76" y2="94" gradientUnits="userSpaceOnUse">
                                <stop stopColor="#334155" />
                                <stop offset="1" stopColor="#1e293b" />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>

                {/* STATIONARY LOGIN CARD */}
                <div className="auth-card">
                    {/* Top Glow Highlight */}
                    <div className="auth-card-top-glow" />

                    {/* Company Branding Header */}
                    <div className="auth-header">
                        <div className="auth-logo-badge">
                            <img
                                src={logo}
                                alt="ARL Logo"
                                className="auth-logo-img"
                                onError={(e) => {
                                    e.target.style.display = "none";
                                }}
                            />
                            <span className="auth-brand-text">ARL</span>
                        </div>

                        <h1 className="auth-main-title">Enterprise Portal</h1>
                        <p className="auth-subtitle">
                            Sign in to access your modules & dashboard
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="auth-form">
                        {/* Username Field */}
                        <div className="auth-field" style={{ "--delay": "0.1s" }}>
                            <label htmlFor="username">Username</label>
                            <div className="auth-input-wrapper">
                                <span className="auth-input-icon">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                        <circle cx="12" cy="7" r="4" />
                                    </svg>
                                </span>
                                <input
                                    id="username"
                                    type="text"
                                    placeholder="Enter your username"
                                    autoComplete="username"
                                    value={formData.username || ""}
                                    onFocus={() => setFocusedInput("username")}
                                    onBlur={() => setFocusedInput(null)}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            username: e.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="auth-field" style={{ "--delay": "0.2s" }}>
                            <label htmlFor="password">Password</label>
                            <div className="auth-input-wrapper">
                                <span className="auth-input-icon">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                </span>
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter your password"
                                    autoComplete="current-password"
                                    value={formData.password || ""}
                                    onFocus={() => setFocusedInput("password")}
                                    onBlur={() => setFocusedInput(null)}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            password: e.target.value,
                                        })
                                    }
                                    required
                                />
                                <button
                                    type="button"
                                    className="auth-password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex={-1}
                                    title={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                            <line x1="1" y1="1" x2="23" y2="23" />
                                        </svg>
                                    ) : (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Error Banner */}
                        {error && (
                            <div className="auth-error" role="alert">
                                <svg className="auth-error-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Submit Button */}
                        <div className="auth-action" style={{ "--delay": "0.3s" }}>
                            <button
                                type="submit"
                                className={`auth-button ${isSubmitting ? "loading" : ""}`}
                                disabled={isSubmitting}
                            >
                                <span className="auth-button-content">
                                    <span>Sign In</span>
                                    <svg className="auth-btn-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="5" y1="12" x2="19" y2="12" />
                                        <polyline points="12 5 19 12 12 19" />
                                    </svg>
                                </span>
                            </button>
                        </div>
                    </form>

                    {/* Footer security note */}
                    <div className="auth-footer">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        <span>Secure End-to-End Enterprise Connection</span>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default Login;
