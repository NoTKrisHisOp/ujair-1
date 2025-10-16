import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs, getDoc, doc, updateDoc, arrayUnion, arrayRemove, where, onSnapshot, increment } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";
import Navbar from "./Navbar";

export default function Community() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAskModal, setShowAskModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showGroupDetailModal, setShowGroupDetailModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  
  // Ask Doubt Modal States
  const [doubtTitle, setDoubtTitle] = useState("");
  const [doubtDescription, setDoubtDescription] = useState("");
  const [doubtSubject, setDoubtSubject] = useState("");
  const [doubtFile, setDoubtFile] = useState(null);
  const [uploadingDoubt, setUploadingDoubt] = useState(false);
  
  // Create Group Modal States
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupSubject, setGroupSubject] = useState("");
  
  // Mock Data for demonstration
  const [topDiscussions, setTopDiscussions] = useState([
    {
      id: 1,
      title: "How to solve this microprocessor problem?",
      author: "John Doe",
      replies: 12,
      views: 156,
      solved: true,
      subject: "Microprocessor",
      tags: ["8085", "Assembly", "Programming"]
    },
    {
      id: 2,
      title: "Best resources for DBMS preparation",
      author: "Sarah Wilson",
      replies: 8,
      views: 89,
      solved: false,
      subject: "DBMS",
      tags: ["Database", "SQL", "Normalization"]
    },
    {
      id: 3,
      title: "Data Structures algorithm complexity",
      author: "Mike Chen",
      replies: 15,
      views: 203,
      solved: true,
      subject: "Data Structures",
      tags: ["Algorithms", "Complexity", "Big O"]
    }
  ]);

  const [trendingTopics, setTrendingTopics] = useState([
    { name: "Microprocessor", posts: 45, color: "bg-blue-100 text-blue-800" },
    { name: "DBMS", posts: 38, color: "bg-green-100 text-green-800" },
    { name: "Data Structures", posts: 52, color: "bg-purple-100 text-purple-800" },
    { name: "Operating Systems", posts: 29, color: "bg-orange-100 text-orange-800" },
    { name: "Computer Networks", posts: 33, color: "bg-pink-100 text-pink-800" }
  ]);

  const [recentQuestions, setRecentQuestions] = useState([
    {
      id: 1,
      title: "Help with binary tree traversal",
      author: "Alex Kumar",
      time: "2 hours ago",
      subject: "Data Structures",
      solved: false
    },
    {
      id: 2,
      title: "SQL query optimization tips",
      author: "Priya Singh",
      time: "4 hours ago",
      subject: "DBMS",
      solved: false
    },
    {
      id: 3,
      title: "Memory management in OS",
      author: "David Lee",
      time: "6 hours ago",
      subject: "Operating Systems",
      solved: true
    }
  ]);

  const [studyGroups, setStudyGroups] = useState([]);

  const [leaderboard, setLeaderboard] = useState([
    { rank: 1, name: "John Doe", points: 1250, badge: "Top Helper", avatar: "JD" },
    { rank: 2, name: "Sarah Wilson", points: 980, badge: "Fast Responder", avatar: "SW" },
    { rank: 3, name: "Mike Chen", points: 875, badge: "Knowledge Seeker", avatar: "MC" },
    { rank: 4, name: "Alex Kumar", points: 720, badge: "Active Member", avatar: "AK" },
    { rank: 5, name: "Priya Singh", points: 650, badge: "Study Buddy", avatar: "PS" }
  ]);

  const [announcements, setAnnouncements] = useState([
    {
      id: 1,
      title: "Webinar: Career in Software Development",
      date: "2024-01-15",
      time: "6:00 PM",
      type: "Webinar",
      interested: 45
    },
    {
      id: 2,
      title: "Workshop: Machine Learning Basics",
      date: "2024-01-20",
      time: "10:00 AM",
      type: "Workshop",
      interested: 78
    },
    {
      id: 3,
      title: "Placement Talk: Google Interview Experience",
      date: "2024-01-25",
      time: "4:00 PM",
      type: "Placement Talk",
      interested: 92
    }
  ]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // subscribe to study groups in realtime
        const groupsQuery = query(collection(db, "studyGroups"), orderBy("createdAt", "desc"));
        const unsubGroups = onSnapshot(groupsQuery, (snapshot) => {
          const groups = snapshot.docs.map((d) => ({ id: d.id, ...d.data(), memberCount: d.data().members?.length || d.data().memberCount || 0 }));
          setStudyGroups(groups);
        });
        return () => unsubGroups();
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchStudyGroups = async () => {};

  const fetchGroupMembers = async (groupId) => {
    try {
      const groupDoc = doc(db, "studyGroups", groupId);
      const groupSnapshot = await getDoc(groupDoc);
      
      if (groupSnapshot.exists()) {
        const groupData = groupSnapshot.data();
        const memberIds = groupData.members || [];
        
        // Fetch user details for each member
        const memberPromises = memberIds.map(async (memberId) => {
          const userQuery = query(collection(db, "users"), where("uid", "==", memberId));
          const userSnapshot = await getDocs(userQuery);
          if (!userSnapshot.empty) {
            return { id: memberId, ...userSnapshot.docs[0].data() };
          }
          return { id: memberId, name: "Unknown User", email: "unknown@example.com" };
        });
        
        const members = await Promise.all(memberPromises);
        setGroupMembers(members);
      }
    } catch (error) {
      console.error("Error fetching group members:", error);
    }
  };

  const handleAskDoubt = async () => {
    if (!doubtTitle.trim() || !doubtDescription.trim()) return;
    
    setUploadingDoubt(true);
    try {
      let fileURL = "";
      if (doubtFile) {
        const storageRef = ref(storage, `doubts/${user.uid}-${doubtFile.name}`);
        const uploadTask = uploadBytesResumable(storageRef, doubtFile);
        
        await new Promise((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            null,
            (error) => reject(error),
            async () => {
              fileURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve();
            }
          );
        });
      }

      await addDoc(collection(db, "doubts"), {
        title: doubtTitle.trim(),
        description: doubtDescription.trim(),
        subject: doubtSubject,
        authorId: user.uid,
        authorName: user.displayName || "Anonymous",
        fileURL,
        solved: false,
        createdAt: serverTimestamp(),
        replies: 0,
        views: 0,
        upvotes: 0
      });

      setDoubtTitle("");
      setDoubtDescription("");
      setDoubtSubject("");
      setDoubtFile(null);
      setShowAskModal(false);
      alert("Your doubt has been posted successfully!");
    } catch (error) {
      console.error("Error posting doubt:", error);
      alert("Error posting doubt. Please try again.");
    } finally {
      setUploadingDoubt(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || !groupDescription.trim()) {
      alert("Please enter group name and description.");
      return;
    }
    if (!user || !user.uid) {
      alert("You must be logged in to create a group.");
      return;
    }

    try {
      await addDoc(collection(db, "studyGroups"), {
        name: groupName.trim(),
        description: groupDescription.trim(),
        subject: groupSubject,
        createdBy: user.uid,
        createdByName: user.displayName || "Anonymous",
        createdAt: serverTimestamp(),
        members: [user.uid],
        memberCount: 1,
        isActive: true
      });

      setGroupName("");
      setGroupDescription("");
      setGroupSubject("");
      setShowCreateGroupModal(false);
      alert("Study group created successfully!");
    } catch (error) {
      console.error("Error creating group:", error);
      const code = error?.code || "unknown";
      const msg = error?.message || String(error);
      alert(`Error creating group (code: ${code}).\n${msg}`);
    }
  };

  const handleJoinGroup = async (groupId) => {
    try {
      const groupRef = doc(db, "studyGroups", groupId);
      const groupSnap = await getDoc(groupRef);
      if (groupSnap.exists()) {
        const data = groupSnap.data();
        if (data.members?.includes(user.uid)) {
          alert("You are already a member of this group.");
          return;
        }
      }
      await updateDoc(groupRef, { members: arrayUnion(user.uid), memberCount: increment(1) });
      
      alert("Successfully joined the group!");
    } catch (error) {
      console.error("Error joining group:", error);
      alert("Error joining group. Please try again.");
    }
  };

  const handleLeaveGroup = async (groupId) => {
    try {
      const groupRef = doc(db, "studyGroups", groupId);
      const groupSnap = await getDoc(groupRef);
      if (groupSnap.exists()) {
        const data = groupSnap.data();
        if (!data.members?.includes(user.uid)) {
          alert("You are not a member of this group.");
          return;
        }
      }
      await updateDoc(groupRef, { members: arrayRemove(user.uid), memberCount: increment(-1) });
      
      alert("Successfully left the group!");
    } catch (error) {
      console.error("Error leaving group:", error);
      alert("Error leaving group. Please try again.");
    }
  };

  const handleInviteToGroup = async () => {
    if (!inviteEmail.trim()) return;
    
    setInviteLoading(true);
    try {
      // Find user by email (prefer emailLower; fallback to email for older accounts)
      const emailLc = inviteEmail.trim().toLowerCase();
      let userSnapshot = await getDocs(
        query(collection(db, "users"), where("emailLower", "==", emailLc))
      );
      if (userSnapshot.empty) {
        userSnapshot = await getDocs(
          query(collection(db, "users"), where("email", "==", inviteEmail.trim()))
        );
      }
      if (userSnapshot.empty) {
        alert("User not found with this email address.");
        return;
      }
      const targetUser = userSnapshot.docs[0].data();
      const groupRef = doc(db, "studyGroups", selectedGroup.id);
      
      // Check if user is already a member
      const groupDoc = await getDoc(groupRef);
      if (groupDoc.exists()) {
        const groupData = groupDoc.data();
        if (groupData.members?.includes(targetUser.uid)) {
          alert("User is already a member of this group.");
          return;
        }
      }
      
      await updateDoc(groupRef, {
        members: arrayUnion(targetUser.uid),
        memberCount: (selectedGroup.memberCount || 0) + 1
      });
      
      setInviteEmail("");
      setShowInviteModal(false);
      await fetchStudyGroups(); // Refresh the groups list
      await fetchGroupMembers(selectedGroup.id); // Refresh members list
      alert(`Successfully invited ${targetUser.name} to the group!`);
    } catch (error) {
      console.error("Error inviting user:", error);
      alert("Error inviting user. Please try again.");
    } finally {
      setInviteLoading(false);
    }
  };

  const openGroupDetail = async (group) => {
    setSelectedGroup(group);
    await fetchGroupMembers(group.id);
    setShowGroupDetailModal(true);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please Login to Access Community</h2>
          <p className="text-gray-600">You need to be logged in to access the community features.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold mb-2">Community Hub</h1>
              <p className="text-indigo-100 text-lg">Connect, Learn, and Grow Together</p>
            </div>
            <div className="mt-6 md:mt-0 flex space-x-4">
              <button
                onClick={() => setShowAskModal(true)}
                className="btn btn-secondary px-6 py-3"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Ask a Doubt
              </button>
              <button
                onClick={() => setShowCreateGroupModal(true)}
                className="btn btn-primary px-6 py-3"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Group
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border-b py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-md mx-auto">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search discussions, topics, or users..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: "dashboard", name: "Dashboard", icon: "📊" },
              { id: "discussions", name: "Discussions", icon: "💬" },
              { id: "groups", name: "Study Groups", icon: "👥" },
              { id: "resources", name: "Resources", icon: "📚" },
              { id: "leaderboard", name: "Leaderboard", icon: "🏆" },
              { id: "events", name: "Events", icon: "📅" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-all duration-300 ${
                  activeTab === tab.id
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "dashboard" && (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-8">
              {/* Top Discussions */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">🔥 Top Discussions</h2>
                <div className="space-y-4">
                  {topDiscussions.map((discussion) => (
                    <div key={discussion.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-300">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-semibold text-gray-900 hover:text-indigo-600 cursor-pointer">
                              {discussion.title}
                            </h3>
                            {discussion.solved && (
                              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                                ✅ Solved
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">by {discussion.author} • {discussion.subject}</p>
                          <div className="flex flex-wrap gap-1 mb-3">
                            {discussion.tags.map((tag, index) => (
                              <span key={index} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                                #{tag}
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>💬 {discussion.replies} replies</span>
                            <span>👁️ {discussion.views} views</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Questions */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">❓ Recent Questions</h2>
                <div className="space-y-3">
                  {recentQuestions.map((question) => (
                    <div key={question.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{question.title}</h4>
                        <p className="text-sm text-gray-600">{question.author} • {question.time} • {question.subject}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {question.solved ? (
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Solved</span>
                        ) : (
                          <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">Open</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-8">
              {/* Trending Topics */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">📈 Trending Topics</h2>
                <div className="space-y-3">
                  {trendingTopics.map((topic, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{topic.name}</span>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${topic.color}`}>
                          {topic.posts} posts
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">📊 Quick Stats</h2>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Discussions</span>
                    <span className="font-semibold">1,247</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Active Members</span>
                    <span className="font-semibold">892</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Study Groups</span>
                    <span className="font-semibold">156</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Resources Shared</span>
                    <span className="font-semibold">3,421</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Other tabs content would go here */}
        {activeTab === "discussions" && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">💬 Discussion Forum</h2>
            <p className="text-gray-600">Discussion forum content will be implemented here...</p>
          </div>
        )}

        {activeTab === "groups" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">👥 Study Groups</h2>
                <button
                  onClick={() => setShowCreateGroupModal(true)}
                  className="btn btn-primary px-4 py-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create New Group
                </button>
              </div>
              
              {studyGroups.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">👥</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Study Groups Yet</h3>
                  <p className="text-gray-600 mb-6">Be the first to create a study group and start collaborating!</p>
                  <button
                    onClick={() => setShowCreateGroupModal(true)}
                    className="btn btn-primary px-6 py-3"
                  >
                    Create First Group
                  </button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {studyGroups.map((group) => {
                    const isMember = group.members?.includes(user.uid);
                    const isCreator = group.createdBy === user.uid;
                    
                    return (
                      <div key={group.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-300">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="font-semibold text-gray-900 text-lg">{group.name}</h3>
                          {isCreator && (
                            <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full font-medium">
                              Creator
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3 overflow-hidden" style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'}}>{group.description}</p>
                        
                        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                          <span className="flex items-center space-x-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <span>{group.memberCount || 0} members</span>
                          </span>
                          <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                            {group.subject || "General"}
                          </span>
                        </div>
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openGroupDetail(group)}
                            className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                          >
                            View Details
                          </button>
                          
                          {isMember ? (
                            <button
                              onClick={() => handleLeaveGroup(group.id)}
                              className="btn btn-secondary flex-1 py-2 text-sm"
                            >
                              Leave
                            </button>
                          ) : (
                            <button
                              onClick={() => handleJoinGroup(group.id)}
                              className="btn btn-primary flex-1 py-2 text-sm"
                            >
                              Join Group
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "resources" && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">📚 Resource Sharing</h2>
            <p className="text-gray-600">Resource sharing section will be implemented here...</p>
          </div>
        )}

        {activeTab === "leaderboard" && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">🏆 Leaderboard</h2>
            <div className="space-y-4">
              {leaderboard.map((user) => (
                <div key={user.rank} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                      {user.avatar}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{user.name}</h3>
                      <span className="text-sm text-gray-600">{user.badge}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-indigo-600">{user.points} pts</div>
                    <div className="text-sm text-gray-500">Rank #{user.rank}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "events" && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">📅 Events & Announcements</h2>
            <div className="space-y-4">
              {announcements.map((event) => (
                <div key={event.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{event.title}</h3>
                      <p className="text-sm text-gray-600">{event.date} at {event.time}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                        {event.type}
                      </span>
                      <button className="btn btn-primary px-4 py-2 text-sm">
                        Interested ({event.interested})
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Ask Doubt Modal */}
      {showAskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Ask a Doubt</h3>
              <button
                onClick={() => setShowAskModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={doubtTitle}
                  onChange={(e) => setDoubtTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="What's your question?"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={doubtDescription}
                  onChange={(e) => setDoubtDescription(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Provide more details about your question..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <select
                  value={doubtSubject}
                  onChange={(e) => setDoubtSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select Subject</option>
                  <option value="Microprocessor">Microprocessor</option>
                  <option value="DBMS">DBMS</option>
                  <option value="Data Structures">Data Structures</option>
                  <option value="Operating Systems">Operating Systems</option>
                  <option value="Computer Networks">Computer Networks</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Attach File (Optional)</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setDoubtFile(e.target.files[0])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleAskDoubt}
                  disabled={uploadingDoubt || !doubtTitle.trim() || !doubtDescription.trim()}
                  className="btn btn-primary flex-1 py-3"
                >
                  {uploadingDoubt ? "Posting..." : "Post Question"}
                </button>
                <button
                  onClick={() => setShowAskModal(false)}
                  className="btn btn-secondary px-6 py-3"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Create Study Group</h3>
              <button
                onClick={() => setShowCreateGroupModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Group Name</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter group name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Describe the purpose of this group..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <select
                  value={groupSubject}
                  onChange={(e) => setGroupSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select Subject</option>
                  <option value="Microprocessor">Microprocessor</option>
                  <option value="DBMS">DBMS</option>
                  <option value="Data Structures">Data Structures</option>
                  <option value="Operating Systems">Operating Systems</option>
                  <option value="Computer Networks">Computer Networks</option>
                  <option value="General">General</option>
                </select>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleCreateGroup}
                  disabled={!groupName.trim() || !groupDescription.trim()}
                  className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Create Group
                </button>
                <button
                  onClick={() => setShowCreateGroupModal(false)}
                  className="btn btn-secondary px-6 py-3"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Group Detail Modal */}
      {showGroupDetailModal && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{selectedGroup.name}</h3>
                  <p className="text-gray-600 mb-2">{selectedGroup.description}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span className="flex items-center space-x-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span>{selectedGroup.memberCount || 0} members</span>
                    </span>
                    <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {selectedGroup.subject || "General"}
                    </span>
                    <span>Created by {selectedGroup.createdByName || "Unknown"}</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowGroupDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Group Actions */}
              <div className="flex space-x-3 mb-6">
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="btn btn-primary px-4 py-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Invite Members
                </button>
                
                {selectedGroup.members?.includes(user.uid) ? (
                  <button
                    onClick={() => handleLeaveGroup(selectedGroup.id)}
                    className="btn btn-secondary px-4 py-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Leave Group
                  </button>
                ) : (
                  <button
                    onClick={() => handleJoinGroup(selectedGroup.id)}
                    className="btn btn-primary px-4 py-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    Join Group
                  </button>
                )}
              </div>

              {/* Group Members */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Group Members</h4>
                {groupMembers.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">👥</div>
                    <p className="text-gray-500">Loading members...</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groupMembers.map((member) => (
                      <div key={member.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                        <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                          {member.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900">{member.name || "Unknown User"}</h5>
                          <p className="text-sm text-gray-500">{member.email || "No email"}</p>
                        </div>
                        {member.id === selectedGroup.createdBy && (
                          <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full font-medium">
                            Creator
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Invite Member</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter user's email address"
                />
                <p className="text-xs text-gray-500 mt-1">The user must be registered on the platform</p>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleInviteToGroup}
                  disabled={inviteLoading || !inviteEmail.trim()}
                  className="btn btn-primary flex-1 py-3"
                >
                  {inviteLoading ? "Inviting..." : "Send Invite"}
                </button>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="btn btn-secondary px-6 py-3"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
