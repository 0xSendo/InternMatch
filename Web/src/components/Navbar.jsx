import { Link } from "react-router-dom";
import { useContext } from "react";
import AuthContext from "../context/AuthContext";
import "../styles/navbar.css";

export default function Navbar({ onNotificationClick, notificationCount = 0 }) {
	const { isAuthenticated, currentUser, logout } = useContext(AuthContext);

	const onLogout = () => {
		const confirmed = window.confirm("Are you sure you want to log out?");
		if (!confirmed) return;
		logout();
	};

	return (
		<nav className="navbar">
			<Link to="/" className="navbar-logo">
				<h2>InternMatch</h2>
			</Link>
			<div className="navbar-actions">
				{!isAuthenticated && <Link to="/login">Login</Link>}
				{!isAuthenticated && <Link className="nav-btn" to="/register">Get Started</Link>}
				{isAuthenticated && (
					<div className="nav-user">
						<button 
							className="nav-notif-btn" 
							type="button" 
							title="Notifications"
							aria-label="Notifications"
							onClick={onNotificationClick}
						>
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
								<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
								<path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" />
							</svg>
							{notificationCount > 0 && <span className="notif-badge">{notificationCount}</span>}
						</button>
						<div className="nav-user-info">
							<span className="nav-user-name">{currentUser?.name || "User"}</span>
							<span className="nav-user-role">{currentUser?.role || "Student"}</span>
						</div>
						<button className="nav-logout" type="button" onClick={onLogout}>
							Logout
						</button>
					</div>
				)}
			</div>
		</nav>
	);
}