import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, onSnapshot, query, orderBy, where, serverTimestamp, getDocs, deleteDoc, doc, setDoc } from 'firebase/firestore';

function Chat() {
  const [messages, setMessages] = useState([]);
  const [pendingByKey, setPendingByKey] = useState({});
  const [newMessage, setNewMessage] = useState('');
  const [users, setUsers] = useState([]);
  const [recipient, setRecipient] = useState('');
  const [conversations, setConversations] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => auth.currentUser || null);

  // Stay reactive to auth changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => setCurrentUser(u));
    return () => unsubscribe();
  }, []);

  const currentUserId = currentUser?.uid;
  const selectedUser = useMemo(() => users.find(u => u.id === recipient), [users, recipient]);
  const selectedUserUid = useMemo(() => (selectedUser?.uid || selectedUser?.id || ''), [selectedUser]);
  const conversationKey = useMemo(() => {
    if (!currentUserId || !selectedUserUid) return '';
    const a = currentUserId;
    const b = selectedUserUid;
    return a < b ? `${a}_${b}` : `${b}_${a}`;
  }, [currentUserId, selectedUserUid]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setUsersLoading(true);
        const usersRef = collection(db, 'users');
        const querySnapshot = await getDocs(usersRef);
        const usersList = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setUsers(usersList.filter(u => !currentUserId || u.uid !== currentUserId));
      } catch (e) {
        console.error('Error loading users:', e);
      } finally {
        setUsersLoading(false);
      }
    };

    fetchUsers();
  }, [currentUserId]);

  // Subscribe to conversations for current user (ordered by last activity)
  useEffect(() => {
    if (!currentUserId) return;
    const convRef = collection(db, 'conversations');
    const q = query(
      convRef,
      where('participants', 'array-contains', currentUserId),
      orderBy('lastAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const convs = snap.docs.map((d) => {
        const c = { id: d.id, ...d.data() };
        const otherId = (c.participants || []).find((p) => p !== currentUserId);
        const otherUser = users.find(u => (u.uid || u.id) === otherId);
        return {
          conversationKey: c.id,
          otherUserId: otherId,
          otherName: otherUser?.name || otherUser?.displayName || otherUser?.email || 'User',
          lastText: c.lastText || '',
          lastAt: c.lastAt,
        };
      });
      setConversations(convs);
    });
    return () => unsub();
  }, [currentUserId, users]);

  const handleRecipientChange = (event) => {
    setRecipient(event.target.value);
  };

  useEffect(() => {
    if (!conversationKey) {
      setMessages([]);
      return;
    }
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('conversationKey', '==', conversationKey),
      orderBy('createdAt')
    );

    setMessagesLoading(true);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      // Reconcile pending optimistic messages by clientId
      setPendingByKey((current) => {
        const pendingForKey = current[conversationKey] || [];
        const serverClientIds = new Set(docs.map(m => m.clientId).filter(Boolean));
        const stillPending = pendingForKey.filter(m => !serverClientIds.has(m.clientId));
        // Merge server messages with any still-pending optimistic ones
        setMessages([...docs, ...stillPending]);
        return { ...current, [conversationKey]: stillPending };
      });
      setMessagesLoading(false);
    }, (err) => {
      console.error('Error subscribing to messages:', err);
      setMessagesLoading(false);
    });

    return () => unsubscribe();
  }, [conversationKey]);

  // Auto-scroll to latest message
  const bottomRef = useRef(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleNewMessageChange = (event) => {
    setNewMessage(event.target.value);
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();

    if (newMessage.trim() === '' || !recipient) {
      return;
    }

    try {
      if (!currentUserId) {
        alert('Please login to send messages.');
        return;
      }
      if (!selectedUserUid || !conversationKey) {
        alert('Please select a user to chat with.');
        return;
      }

      // Optimistic message
      const clientId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const optimistic = {
        id: `temp:${clientId}`,
        clientId,
        text: newMessage.trim(),
        createdAt: { toDate: () => new Date() },
        conversationKey,
        participants: [currentUserId, selectedUserUid],
        senderId: currentUserId,
        recipientId: selectedUserUid,
        senderDisplayName: currentUser?.displayName || 'User',
        senderPhotoURL: currentUser?.photoURL || '',
        status: 'sending',
      };
      setPendingByKey((current) => {
        const arr = current[conversationKey] || [];
        return { ...current, [conversationKey]: [...arr, optimistic] };
      });
      setMessages((curr) => [...curr, optimistic]);

      // Persist to Firestore (message document)
      const messagesRef = collection(db, 'messages');
      await addDoc(messagesRef, {
        text: optimistic.text,
        createdAt: serverTimestamp(),
        conversationKey,
        participants: [currentUserId, selectedUserUid],
        senderId: currentUserId,
        recipientId: selectedUserUid,
        senderDisplayName: currentUser?.displayName || 'User',
        senderPhotoURL: currentUser?.photoURL || '',
        status: 'sent',
        clientId,
      });

      // Upsert conversation summary for fast listing
      await setDoc(
        doc(db, 'conversations', conversationKey),
        {
          participants: [currentUserId, selectedUserUid],
          lastText: optimistic.text,
          lastAt: serverTimestamp(),
          lastSenderId: currentUserId,
        },
        { merge: true }
      );

      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      const code = err?.code || 'unknown';
      const msg = err?.message || String(err);
      alert(`Error sending message (code: ${code}).\n${msg}`);
    }
  };

  const handleDeleteConversation = async () => {
    if (!conversationKey) return;
    const ok = window.confirm('Delete entire conversation for both participants?');
    if (!ok) return;
    const messagesRef = collection(db, 'messages');
    const q = query(messagesRef, where('conversationKey', '==', conversationKey));
    try {
      const snap = await getDocs(q);
      await Promise.all(snap.docs.map(d => deleteDoc(doc(db, 'messages', d.id))));
    } catch (e) {
      console.error('Error deleting conversation:', e);
      alert('Failed to delete conversation.');
    }
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar: conversations */}
      <div className="w-72 border-r bg-gray-50 p-3 overflow-y-auto">
        <div className="text-xs font-semibold text-gray-500 mb-2">Conversations</div>
        <div className="space-y-1">
          {conversations.length === 0 && (
            <div className="text-xs text-gray-500">No conversations yet</div>
          )}
          {conversations.map(c => (
            <button
              key={c.conversationKey}
              onClick={() => setRecipient((users.find(u => (u.uid || u.id) === c.otherUserId)?.id) || '')}
              className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 ${selectedUser?.uid === c.otherUserId ? 'bg-gray-100' : ''}`}
            >
              <div className="text-sm font-medium text-gray-900">{c.otherName}</div>
              <div className="text-xs text-gray-500 truncate">{c.lastText}</div>
            </button>
          ))}
        </div>
        <div className="mt-4">
          <div className="text-xs font-semibold text-gray-500 mb-1">Start new chat</div>
          <select
            id="recipient"
            value={recipient}
            onChange={handleRecipientChange}
            className="w-full shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          >
            <option value="">Select a user…</option>
            {usersLoading && <option disabled>Loading users…</option>}
            {!usersLoading && users.length === 0 && <option disabled>No other users</option>}
            {!usersLoading && users.map(user => (
              <option key={user.id} value={user.id}>
                {user.displayName || user.name || user.email}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main column */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-gray-100 p-4 border-b flex items-center justify-between">
          <h1 className="font-semibold">{selectedUser ? (selectedUser.displayName || selectedUser.name || selectedUser.email) : 'Direct Messages'}</h1>
          {recipient && (
            <button onClick={handleDeleteConversation} className="text-sm text-red-600 hover:text-red-700">Delete chat</button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 bg-white">
        {!recipient ? (
          <div className="h-full flex items-center justify-center text-gray-500">Select someone to start chatting</div>
        ) : messagesLoading ? (
          <div className="h-full flex items-center justify-center text-gray-500">Loading messages…</div>
        ) : (
          <div className="space-y-2">
            {messages.length === 0 && (
              <div className="h-full flex items-center justify-center text-gray-400">No messages yet. Say hi!</div>
            )}
            {messages.map(message => {
              const isMine = message.senderId === currentUserId;
              const ts = message.createdAt?.toDate ? message.createdAt.toDate() : null;
              const time = ts ? ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
              return (
                <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-lg px-3 py-2 shadow text-sm ${isMine ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                    {!isMine && (
                      <div className="font-semibold mb-0.5">{message.senderDisplayName}</div>
                    )}
                    <div>{message.text}</div>
                    <div className={`mt-1 text-[10px] ${isMine ? 'text-indigo-100' : 'text-gray-500'}`}>{time}</div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
        </div>

        {/* Composer */}
        <div className="p-4 border-t bg-gray-50">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={handleNewMessageChange}
              placeholder={recipient ? 'Type a message…' : 'Select a user to chat'}
              disabled={!recipient || !currentUserId}
              className="flex-1 border rounded-md py-2 px-3 text-gray-700 focus:outline-none disabled:bg-gray-100"
            />
            <button
              type="submit"
              disabled={!recipient || newMessage.trim() === '' || !currentUserId}
              className="btn btn-primary py-2 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Chat;