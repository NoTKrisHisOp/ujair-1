// src/components/UploadNote.jsx
import { useState } from "react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { storage, db, auth } from "../firebase";

export default function UploadNote() {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file!");
      return;
    }

    const storageRef = ref(
      storage,
      `notes/${auth.currentUser.uid}/${file.name}`
    );
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const prog = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(prog.toFixed(0));
      },
      (error) => {
        console.error(error);
        setMessage("Upload failed");
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

        await addDoc(collection(db, "posts"), {
          userId: auth.currentUser.uid,
          username: auth.currentUser.displayName || auth.currentUser.email,
          imageURL: downloadURL,
          title: title || "",
          timestamp: serverTimestamp(),
        });

        setMessage("Upload successful!");
        setFile(null);
        setTitle("");
        setProgress(0);
      }
    );
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-blue-50 rounded-xl shadow-md mb-4">
      <h2 className="text-xl font-bold mb-2">Upload a Note</h2>
      <input
        type="text"
        placeholder="Enter title (optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="border p-2 mb-2 w-full rounded"
      />
      <input type="file" onChange={handleFileChange} className="mb-2 w-full" />
      {progress > 0 && <p>Uploading: {progress}%</p>}
      <button
        onClick={handleUpload}
        className="btn btn-primary px-4 py-2"
      >
        Upload
      </button>
      {message && <p className="mt-2">{message}</p>}
    </div>
  );
}
