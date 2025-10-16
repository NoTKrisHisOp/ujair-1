import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useState, useEffect } from "react";

export default function Navbar({ onSearch }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [user, setUser] = useState(auth.currentUser);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest('.relative')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/");
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    // If onSearch prop is provided (from Profile component), use it
    if (onSearch) {
      onSearch(searchQuery.trim());
      setSearchQuery("");
      setShowSearchResults(false);
      return;
    }
    
    // Otherwise use the dropdown search functionality
    try {
      const q = query(
        collection(db, "users"),
        where("name", ">=", searchQuery.trim()),
        where("name", "<=", searchQuery.trim() + "\uf8ff")
      );
      const snapshot = await getDocs(q);
      const results = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setSearchResults(results);
      setShowSearchResults(true);
    } catch (error) {
      console.error("Search error:", error);
    }
  };

  const handleUserClick = (userId) => {
    navigate(`/user/${userId}`);
    setSearchQuery("");
    setShowSearchResults(false);
  };

  return (
    <nav className="bg-white/95 backdrop-blur-sm shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link 
              to="/" 
              className="flex items-center group transition-transform duration-300 hover:scale-105"
            >
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-2 rounded-xl mr-3 group-hover:from-indigo-700 group-hover:to-purple-700 transition-all duration-300">
                <span className="text-white text-lg">📚</span>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent group-hover:from-indigo-700 group-hover:to-purple-700 transition-all duration-300">
                MindBridge
              </h1>
            </Link>
          </div>

          {/* Search Section */}
          {user && (
            <div className="flex-1 max-w-md mx-8 relative">
              <form onSubmit={handleSearch} className="relative">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search users..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300 hover:shadow-md focus:shadow-lg"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <button
                    type="submit"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <div className="btn btn-primary px-3 py-1 text-sm">
                      Search
                    </div>
                  </button>
                </div>
              </form>

              {/* Search Results Dropdown */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border z-50 max-h-64 overflow-y-auto">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleUserClick(result.id)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors duration-200 flex items-center space-x-3 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="w-8 h-8 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {result.name?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{result.name}</p>
                        <p className="text-sm text-gray-500">{result.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Click outside to close */}
              {showSearchResults && (
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowSearchResults(false)}
                />
              )}
            </div>
          )}

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            {user && (
              <>
                <Link
                  to="/profile"
                  className="text-gray-600 hover:text-indigo-600 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 hover:bg-indigo-50 hover:scale-105"
                >
                  My Profile
                </Link>
                <Link
                  to="/"
                  className="text-gray-600 hover:text-indigo-600 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 hover:bg-indigo-50 hover:scale-105"
                >
                  Discover
                </Link>
              </>
            )}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center space-x-3 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 hover:scale-105"
                >
                  <img
                    className="h-8 w-8 rounded-full object-cover ring-2 ring-indigo-200 hover:ring-indigo-400 transition-all duration-300"
                    src={user.photoURL || "https://via.placeholder.com/32x32?text=U"}
                    alt={user.displayName || "User"}
                  />
                  <span className="text-gray-700 font-medium">
                    {user.displayName || "User"}
                  </span>
                  <svg
                    className={`h-4 w-4 text-gray-400 transition-transform duration-300 ${showDropdown ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl py-2 z-50 border animate-in slide-in-from-top-2 duration-300">
                    <Link
                      to="/profile"
                      className="block px-4 py-3 text-sm text-gray-700 hover:bg-indigo-50 transition-all duration-300 hover:text-indigo-600"
                      onClick={() => setShowDropdown(false)}
                    >
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>Your Profile</span>
                      </div>
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        setShowDropdown(false);
                      }}
                      className="block w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-all duration-300"
                    >
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Sign out</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="text-gray-600 hover:text-indigo-600 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 hover:bg-indigo-50 hover:scale-105"
                >
                  Sign in
                </Link>
                <Link
                  to="/signup"
                  className="btn btn-gradient px-6 py-2 text-sm"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
