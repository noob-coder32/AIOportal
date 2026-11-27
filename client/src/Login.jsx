import "./login.css";
import bg2 from "./assets/images/bg2.jpg";

function Login({
    formData,
    setFormData,
    onLogin,
    error,
}) {

    const handleSubmit = (e) => {
        e.preventDefault(); // prevent page refresh
        onLogin();          // call existing login function
    };

    return (
        <div
            className="auth-page"
            style={{ backgroundImage: `url(${bg2})` }}
        >
            {/* Login Card */}
            <div className="auth-card">

                {/* Company Branding */}
                <div className="auth-header">
                    <h1 className="auth-company">ARL</h1>
                    <p className="auth-subtitle">
                        Sign in to your account
                    </p>
                </div>

                <h2 className="auth-title">Login</h2>

                <form onSubmit={handleSubmit}>

                    <div className="auth-field">
                        <label>Username</label>
                        <input
                            type="text"
                            placeholder="Enter your username"
                            value={formData.username || ""}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    username: e.target.value,
                                })
                            }
                        />
                    </div>

                    <div className="auth-field">
                        <label>Password</label>
                        <input
                            type="password"
                            placeholder="Enter your password"
                            value={formData.password || ""}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    password: e.target.value,
                                })
                            }
                        />
                    </div>

                    {error && <div className="auth-error">{error}</div>}

                    <button type="submit" className="auth-button">
                        Sign In
                    </button>

                </form>

            </div>

        </div>
    );


}

export default Login;
