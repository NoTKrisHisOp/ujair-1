import { useState, useEffect } from "react";
import { auth, storage, db } from "../firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { updateProfile } from "firebase/auth";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";

export default function Profile() {
  const [user, setUser] = useState(auth.currentUser);
  const [editing, setEditing] = useState(false);
  const [file, setFile] = useState(null);
  const [name, setName] = useState(user?.displayName || "");
  const [uploading, setUploading] = useState(false);

  const [noteFile, setNoteFile] = useState(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [uploadingNote, setUploadingNote] = useState(false);
  const [notes, setNotes] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const navigate = useNavigate();

  // Check auth
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) setUser(currentUser);
      else navigate("/login");
    });
    return () => unsubscribe();
  }, [navigate]);

  // Fetch user notes
  const fetchNotes = async () => {
    if (!user) return;
    const q = query(collection(db, "notes"), where("userId", "==", user.uid));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setNotes(data);
  };

  useEffect(() => {
    fetchNotes();
  }, [user]);

  // Logout
  const handleLogout = async () => {
    await auth.signOut();
    navigate("/login");
  };

  // Save profile edits
  const handleSave = async () => {
    setUploading(true);
    try {
      let photoURL = user.photoURL;

      if (file) {
        const storageRef = ref(storage, `profilePics/${user.uid}-${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        await new Promise((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            null,
            (error) => reject(error),
            async () => {
              photoURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve();
            }
          );
        });
      }

      await updateProfile(user, { displayName: name, photoURL });
      setUser({ ...user, displayName: name, photoURL });
      setEditing(false);
      setFile(null);
    } catch (error) {
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  // Upload a note
  const handleNoteUpload = async () => {
    if (!noteFile || !noteTitle.trim()) return;
    setUploadingNote(true);
    try {
      const storageRef = ref(storage, `notes/${user.uid}-${noteFile.name}`);
      const uploadTask = uploadBytesResumable(storageRef, noteFile);

      let fileURL = "";
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

      await addDoc(collection(db, "notes"), {
        userId: user.uid,
        fileURL,
        title: noteTitle.trim(),
        type: noteFile.type.startsWith("image") ? "image" : "pdf",
        timestamp: serverTimestamp(),
      });

      setNoteFile(null);
      setNoteTitle("");
      setShowUploadModal(false); // Close modal after successful upload
      setShowSuccessMessage(true); // Show success message
      setTimeout(() => setShowSuccessMessage(false), 3000); // Hide after 3 seconds
      fetchNotes(); // refresh UI
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingNote(false);
    }
  };

  // Search for users by name
  const handleSearch = async (searchTerm) => {
    if (!searchTerm.trim()) return;
    try {
      const q = query(
        collection(db, "users"),
        where("nameLower", "==", searchTerm.trim().toLowerCase())
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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onSearch={handleSearch} />
      
      {/* Profile Header */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border p-8">
          <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
            {/* Profile Picture */}
            <div className="flex-shrink-0">
              <div className="relative">
                <img
                  src={
                    file ? URL.createObjectURL(file) : user.photoURL || "https://via.placeholder.com/150x150?text=U"
                  }
                  alt="Profile"
                  className="w-32 h-32 rounded-full border-4 border-indigo-500 object-cover"
                />
                {editing && (
                  <label className="absolute bottom-0 right-0 bg-indigo-600 text-white rounded-full p-2 cursor-pointer hover:bg-indigo-700 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setFile(e.target.files[0])}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-2 md:space-y-0 mb-4">
                {editing ? (
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="text-2xl font-bold border-2 border-indigo-300 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <h1 className="text-2xl font-bold text-gray-900">
                    {user.displayName || "No Name"}
                  </h1>
                )}

                {!editing && (
                  <button
                    onClick={() => setEditing(true)}
                    className="btn btn-gradient px-6 py-3"
                  >
                    <div className="relative flex items-center space-x-2">
                      <svg className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit Profile
                    </div>
                  </button>
                )}
              </div>

              {/* Stats */}
              <div className="flex justify-center md:justify-start space-x-8 text-gray-600 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{notes.length}</div>
                  <div className="text-sm">Notes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">0</div>
                  <div className="text-sm">Followers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">0</div>
                  <div className="text-sm">Following</div>
                </div>
              </div>

              {/* Upload Button */}
              <div className="flex justify-center md:justify-start">
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="btn btn-gradient px-6 py-3"
                >
                  <div className="relative flex items-center space-x-2">
                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    Upload Note
                  </div>
                </button>
              </div>

              {/* Save/Cancel buttons */}
              {editing && (
                <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                  <button
                    onClick={handleSave}
                    disabled={uploading}
                    className="btn btn-gradient px-8 py-3"
                  >
                    <div className="relative flex items-center space-x-2">
                      {uploading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      Save Changes
                    </div>
                  </button>
                  
                  <button
                    onClick={() => {
                      setEditing(false);
                      setFile(null);
                    }}
                    className="btn btn-secondary px-8 py-3"
                  >
                    <div className="relative flex items-center space-x-2">
                      <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Cancel
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notes Grid */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Your Notes</h2>
            <span className="text-gray-500">{notes.length} notes</span>
          </div>
          
          {notes.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No notes yet</h3>
              <p className="text-gray-500 mb-4">Share your first note with the community!</p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="group relative overflow-hidden bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 transition-all duration-500 hover:scale-105 hover:shadow-2xl active:scale-95 flex items-center justify-center space-x-3 border-2 border-transparent hover:border-white/20"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-pink-400 opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>
                <div className="relative flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-full group-hover:bg-white/30 transition-all duration-300 group-hover:rotate-12">
                    <svg className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <span className="font-bold tracking-wide">Upload Your First Note</span>
                </div>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {notes.map((note, index) => (
                <div
                  key={note.id}
                  onClick={() => window.open(note.fileURL, '_blank')}
                  className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-xl hover:-translate-y-2 transition-all duration-300 cursor-pointer group animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {note.type === "image" ? (
                    <div className="aspect-square relative overflow-hidden">
                      <img
                        src={note.fileURL}
                        alt={note.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-center pb-4">
                        <div className="text-center">
                          <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 mb-2">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </div>
                          <p className="text-white text-sm font-medium">Click to view</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-square bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex items-center justify-center group-hover:from-indigo-200 group-hover:via-purple-100 group-hover:to-pink-200 transition-all duration-500 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/10 to-purple-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="text-center p-4 relative z-10 group-hover:scale-110 transition-transform duration-300">
                        <svg className="w-16 h-16 text-indigo-600 mx-auto mb-3 group-hover:text-indigo-700 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm text-indigo-600 font-semibold group-hover:text-indigo-700 transition-colors duration-300">PDF</span>
                      </div>
                    </div>
                  )}
                  <div className="p-4 bg-white">
                    <h3 className="font-semibold text-gray-900 text-sm truncate group-hover:text-indigo-600 transition-colors duration-300" title={note.title}>
                      {note.title || "Untitled"}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 group-hover:text-gray-600 transition-colors duration-300">
                      {note.type === "image" ? "Image Document" : "PDF Document"}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-indigo-500 font-medium group-hover:text-indigo-600 transition-colors duration-300">Click anywhere to open</span>
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Upload New Note</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Note Title
                </label>
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter note title..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  File (PDF or Image)
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setNoteFile(e.target.files[0])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleNoteUpload}
                  disabled={!noteFile || uploadingNote || !noteTitle.trim()}
                  className="flex-1 group relative overflow-hidden bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95 flex items-center justify-center space-x-2"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-purple-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                  <div className="relative flex items-center space-x-2">
                    {uploadingNote ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    )}
                    <span className="font-medium">
                      {uploadingNote ? "Uploading..." : "Upload Note"}
                    </span>
                  </div>
                </button>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Success Notification */}
      {showSuccessMessage && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg z-50 animate-slide-in-from-right">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">Note uploaded successfully!</span>
          </div>
        </div>
      )}
    </div>
  );
}
