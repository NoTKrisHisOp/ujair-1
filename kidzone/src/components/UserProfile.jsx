// src/components/UserProfile.jsx
import { useState, useEffect } from "react";
import { db, storage, auth } from "../firebase";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp, onSnapshot, setDoc } from "firebase/firestore";
import { useParams, Link } from "react-router-dom";
import Navbar from "./Navbar";

export default function UserProfile() {
  const { userId } = useParams();
  const [userData, setUserData] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showFollowMessage, setShowFollowMessage] = useState(false);
  const [highlightFollowers, setHighlightFollowers] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Set current user
        setCurrentUser(auth.currentUser);

        // Fetch user data
        const userQuery = await getDocs(query(collection(db, "users")));
        const userSnapshot = userQuery.docs.find((doc) => doc.id === userId);
        if (userSnapshot) {
          setUserData({ id: userSnapshot.id, ...userSnapshot.data() });
        }

        // Fetch user notes
        const notesQuery = query(collection(db, "notes"), where("userId", "==", userId));
        const notesSnapshot = await getDocs(notesQuery);
        setNotes(notesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));

        // Fetch follow data if current user exists
        if (auth.currentUser && auth.currentUser.uid !== userId) {
          await fetchFollowData();
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  // Realtime listeners for follow state and counts
  useEffect(() => {
    const unsubscribers = [];

    // Followers count for viewed user
    const followersQuery = query(
      collection(db, "follows"),
      where("followingId", "==", userId)
    );
    const unsubFollowers = onSnapshot(followersQuery, (snapshot) => {
      setFollowersCount(snapshot.size);
    });
    unsubscribers.push(unsubFollowers);

    // Following count for viewed user
    const followingQuery = query(
      collection(db, "follows"),
      where("followerId", "==", userId)
    );
    const unsubFollowing = onSnapshot(followingQuery, (snapshot) => {
      setFollowingCount(snapshot.size);
    });
    unsubscribers.push(unsubFollowing);

    // Is current user following viewed user?
    if (auth.currentUser && auth.currentUser.uid !== userId) {
      const followQuery = query(
        collection(db, "follows"),
        where("followerId", "==", auth.currentUser.uid),
        where("followingId", "==", userId)
      );
      const unsubIsFollowing = onSnapshot(followQuery, (snapshot) => {
        setIsFollowing(!snapshot.empty);
      });
      unsubscribers.push(unsubIsFollowing);
    }

    return () => {
      unsubscribers.forEach((unsub) => unsub && unsub());
    };
  }, [userId]);

  const fetchFollowData = async () => {
    try {
      const currentUserId = auth.currentUser.uid;
      
      // Check if current user is following this user
      const followQuery = query(
        collection(db, "follows"),
        where("followerId", "==", currentUserId),
        where("followingId", "==", userId)
      );
      const followSnapshot = await getDocs(followQuery);
      setIsFollowing(!followSnapshot.empty);

      // Get followers count
      const followersQuery = query(
        collection(db, "follows"),
        where("followingId", "==", userId)
      );
      const followersSnapshot = await getDocs(followersQuery);
      setFollowersCount(followersSnapshot.size);

      // Get following count
      const followingQuery = query(
        collection(db, "follows"),
        where("followerId", "==", userId)
      );
      const followingSnapshot = await getDocs(followingQuery);
      setFollowingCount(followingSnapshot.size);
    } catch (error) {
      console.error("Error fetching follow data:", error);
    }
  };

  const handleFollow = async () => {
    if (!currentUser || currentUser.uid === userId) return;
    
    setFollowLoading(true);
    try {
      if (isFollowing) {
        // Unfollow using deterministic doc id
        const followDocId = `${currentUser.uid}_${userId}`;
        await deleteDoc(doc(db, "follows", followDocId));
        setIsFollowing(false);
        setFollowersCount(prev => Math.max(0, prev - 1));
        setShowFollowMessage(true);
        setHighlightFollowers(true);
        setTimeout(() => setShowFollowMessage(false), 3000);
        setTimeout(() => setHighlightFollowers(false), 2000);
      } else {
        // Follow: Create/overwrite deterministic follow document
        const followDocId = `${currentUser.uid}_${userId}`;
        await setDoc(doc(db, "follows", followDocId), {
          followerId: currentUser.uid,
          followingId: userId,
          createdAt: serverTimestamp(),
        });
        // Instant UI updates for better user experience
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
        setShowFollowMessage(true);
        setHighlightFollowers(true);
        setTimeout(() => setShowFollowMessage(false), 3000);
        setTimeout(() => setHighlightFollowers(false), 2000);
      }
    } catch (error) {
      console.error("Error handling follow:", error);
      const code = error?.code || "unknown";
      const msg = error?.message || String(error);
      alert(`Follow action failed (code: ${code}).\n${msg}`);
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading profile...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">User Not Found</h2>
            <p className="text-gray-600 mb-6">The user you're looking for doesn't exist or has been removed.</p>
            <Link
              to="/profile"
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Back to Your Profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* User Profile Header */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border p-8">
          <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
            {/* Profile Picture */}
            <div className="flex-shrink-0">
              <img
                src="https://via.placeholder.com/150x150?text=U"
                alt="Profile"
                className="w-32 h-32 rounded-full border-4 border-indigo-500 object-cover"
              />
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-2 md:space-y-0 mb-4">
                <h1 className="text-2xl font-bold text-gray-900">
                  {userData.name || "Anonymous User"}
                </h1>
              </div>

              {/* Stats */}
              <div className="flex justify-center md:justify-start space-x-8 text-gray-600 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{notes.length}</div>
                  <div className="text-sm">Notes</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold transition-all duration-500 ${
                    highlightFollowers 
                      ? 'text-green-600 scale-110 bg-green-50 px-2 py-1 rounded-lg' 
                      : 'text-gray-900'
                  }`}>
                    {followersCount}
                  </div>
                  <div className="text-sm">Followers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{followingCount}</div>
                  <div className="text-sm">Following</div>
                </div>
              </div>

              {/* Follow Button */}
              {currentUser && currentUser.uid !== userId && (
                <div className="mb-4">
                  <button
                    onClick={handleFollow}
                    disabled={followLoading}
                    className={`group relative overflow-hidden px-6 py-3 rounded-xl font-semibold text-base transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95 flex items-center justify-center space-x-2 border ${
                      isFollowing
                        ? 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100 hover:border-red-400'
                        : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-transparent hover:from-blue-600 hover:to-indigo-700'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className={`absolute inset-0 transition-opacity duration-300 ${
                      isFollowing 
                        ? 'bg-red-200 opacity-0 group-hover:opacity-20' 
                        : 'bg-gradient-to-r from-blue-400 to-indigo-500 opacity-0 group-hover:opacity-20'
                    }`}></div>
                    <div className="relative flex items-center space-x-2">
                      {followLoading ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <svg className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {isFollowing ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                          )}
                        </svg>
                      )}
                      <span className="font-medium">
                        {followLoading ? 'Loading...' : isFollowing ? 'UNFOLLOW' : 'Follow'}
                      </span>
                    </div>
                  </button>
                </div>
              )}

              {/* Back Button */}
              <Link
                to="/profile"
                className="inline-flex items-center text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Your Profile
              </Link>
            </div>
          </div>
        </div>

        {/* Notes Grid */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {userData.name}'s Notes
            </h2>
            <span className="text-gray-500">{notes.length} notes</span>
          </div>
          
          {notes.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No notes yet</h3>
              <p className="text-gray-500">
                {userData.name} hasn't shared any notes yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {notes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => window.open(note.fileURL, '_blank')}
                  className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
                >
                  {note.type === "image" ? (
                    <div className="aspect-square relative">
                      <img
                        src={note.fileURL}
                        alt={note.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-square bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center group-hover:from-indigo-200 group-hover:to-purple-200 transition-all duration-300">
                      <div className="text-center p-4 group-hover:scale-105 transition-transform duration-300">
                        <svg className="w-12 h-12 text-indigo-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs text-indigo-600 font-medium">PDF</span>
                      </div>
                    </div>
                  )}
                  <div className="p-3">
                    <h3 className="font-medium text-gray-900 text-sm truncate" title={note.title}>
                      {note.title || "Untitled"}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {note.type === "image" ? "Image" : "PDF Document"}
                    </p>
                    <span className="text-xs text-indigo-600 hover:text-indigo-700 mt-2 inline-block">
                      Click to open
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Success Notification */}
      {showFollowMessage && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg z-50 animate-slide-in-from-right">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">
              {isFollowing ? `Now following ${userData?.name}!` : `Unfollowed ${userData?.name}`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
