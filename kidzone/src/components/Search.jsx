// src/components/Search.jsx
import { useState } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function Search() {
  const [searchName, setSearchName] = useState("");
  const [results, setResults] = useState([]);
  const navigate = useNavigate();

  const handleSearch = async () => {
    const term = searchName.trim().toLowerCase();
    if (!term) return;

    const q = query(
      collection(db, "users"),
      where("nameLower", ">=", term),
      where("nameLower", "<=", term + "\uf8ff")
    );

    const snapshot = await getDocs(q);
    const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setResults(users);
  };

  return (
    <div className="max-w-xl mx-auto mt-10 p-6">
      <h2 className="text-xl font-bold mb-4">Search Users</h2>
      <div className="flex space-x-2 mb-4">
        <input
          type="text"
          placeholder="Enter name"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          className="border p-2 flex-1 rounded"
        />
        <button
          onClick={handleSearch}
          className="btn btn-primary px-4 py-2"
        >
          Search
        </button>
      </div>

      <div className="space-y-2">
        {results.map((user) => (
          <div
            key={user.id}
            className="p-2 border rounded cursor-pointer hover:bg-gray-100"
            onClick={() => navigate(`/profile/${user.id}`)}
          >
            {user.name}
          </div>
        ))}
        {results.length === 0 && searchName.trim() && (
          <div className="text-sm text-gray-500">No users found</div>
        )}
      </div>
    </div>
  );
}
