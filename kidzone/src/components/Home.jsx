import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useState, useEffect } from "react";
import Navbar from "./Navbar";

export default function Home() {
  const user = auth.currentUser;
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Search for users by name
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    try {
      const q = query(
        collection(db, "users"),
        where("nameLower", "==", searchQuery.trim().toLowerCase())
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const userData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        navigate(`/user/${userData.id}`);
      } else {
        alert("User not found");
      }
    } catch (error) {
      console.error("Error searching for user:", error);
      alert("Error searching for user");
    }
  };

  const handleUserClick = (userId) => {
    navigate(`/user/${userId}`);
    setSearchQuery("");
    setShowSearchResults(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Navigation */}
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
                      <div className="bg-indigo-600 text-white px-3 py-1 rounded-full text-sm font-medium hover:bg-indigo-700 transition-all duration-300 hover:scale-105 active:scale-95">
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
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  {/* Community Button */}
                  <Link
                    to="/community"
                    className="text-gray-600 hover:text-indigo-600 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 hover:bg-indigo-50 hover:scale-105 flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span>Community</span>
                  </Link>
                  
                  {/* Profile Button */}
                  <Link
                    to="/profile"
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95 flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>Go to Profile</span>
                  </Link>

                  {/* Chat Button */}
                  <Link
                    to="/chat"
                    className="bg-gradient-to-r from-green-600 to-green-600 text-black px-6 py-2 rounded-lg text-sm font-medium hover:from-green-700 hover:to-teal-700 transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95 flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    <span>Chat</span>
                  </Link>
                </>
              ) : (
                <div className="flex space-x-3">
                  <Link
                    to="/login"
                    className="text-gray-600 hover:text-indigo-600 px-3 py-2 rounded-lg transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          <div className="animate-fade-in-up">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Share Knowledge,
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent animate-gradient-x">
                {" "}Learn Together
              </span>
            </h1>
          </div>
          <div className="animate-fade-in-up animation-delay-200">
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              KidZone is the perfect platform for students and educators to share notes, 
              collaborate on learning materials, and discover new educational content.
            </p>
          </div>
          {!user && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up animation-delay-400">
              <Link
                to="/signup"
                className="btn btn-gradient px-8 py-4 text-lg transform"
              >
                Start Learning Today
              </Link>
              <Link
                to="/login"
                className="btn btn-secondary px-8 py-4 text-lg transform"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why Choose MindBridge?
            </h2>
            <p className="text-lg text-gray-600">
              Everything you need for collaborative learning
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-8 bg-white rounded-2xl shadow-sm border hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group">
              <div className="bg-gradient-to-r from-indigo-100 to-indigo-200 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:from-indigo-200 group-hover:to-indigo-300 transition-all duration-300 group-hover:scale-110">
                <span className="text-3xl">📝</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900 group-hover:text-indigo-600 transition-colors duration-300">Share Notes</h3>
              <p className="text-gray-600 leading-relaxed">
                Upload and share PDF documents and images with your learning community.
              </p>
            </div>
            
            <div className="text-center p-8 bg-white rounded-2xl shadow-sm border hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group">
              <div className="bg-gradient-to-r from-green-100 to-green-200 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:from-green-200 group-hover:to-green-300 transition-all duration-300 group-hover:scale-110">
                <span className="text-3xl">👥</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900 group-hover:text-green-600 transition-colors duration-300">Connect & Discover</h3>
              <p className="text-gray-600 leading-relaxed">
                Find other learners, explore their shared content, and expand your knowledge.
              </p>
            </div>
            
            <div className="text-center p-8 bg-white rounded-2xl shadow-sm border hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group">
              <div className="bg-gradient-to-r from-purple-100 to-purple-200 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:from-purple-200 group-hover:to-purple-300 transition-all duration-300 group-hover:scale-110">
                <span className="text-3xl">🎯</span>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900 group-hover:text-purple-600 transition-colors duration-300">Organized Learning</h3>
              <p className="text-gray-600 leading-relaxed">
                Keep your study materials organized and easily accessible in one place.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      {!user && (
        <div className="bg-indigo-600 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Start Your Learning Journey?
            </h2>
            <p className="text-xl text-indigo-100 mb-8">
              Join thousands of students and educators sharing knowledge every day.
            </p>
            <Link
              to="/signup"
              className="bg-white text-indigo-600 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Create Your Account
            </Link>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            © 2024 MindBridge. Made with ❤️ for learners everywhere.
          </p>
        </div>
      </footer>
    </div>
  );
}
