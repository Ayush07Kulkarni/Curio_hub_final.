import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { api, getSocketUrl } from "../lib/api";

export default function ChatRoomPage({ user }) {
  const { roomId } = useParams();
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");

  const token = useMemo(() => localStorage.getItem("curiohub_token"), []);

  useEffect(() => {
    let active = true;

    async function loadMessages() {
      try {
        const data = await api(`/api/chatrooms/${roomId}/messages`);
        if (active) {
          setMessages(data);
        }
      } catch (err) {
        if (active) {
          setError(err.message);
        }
      }
    }

    loadMessages();
    return () => {
      active = false;
    };
  }, [roomId]);

  const socket = useMemo(() => {
    if (!token) return null;

    return io(getSocketUrl(), {
      auth: { token }
    });
  }, [token]);

  useEffect(() => {
    if (!socket) return;

    socket.emit("room:join", { roomId });

    socket.on("room:error", (payload) => {
      setError(payload.message || "Chat error");
    });

    socket.on("room:message", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      socket.disconnect();
    };
  }, [socket, roomId]);

  function sendMessage(event) {
    event.preventDefault();
    if (!socket || !content.trim()) return;

    socket.emit("room:message", {
      roomId,
      content: content.trim()
    });
    setContent("");
  }

  return (
    <main className="container">
      <header className="topbar card">
        <div>
          <h1>Chatroom</h1>
          <p>{user.name} is connected</p>
        </div>
        <Link className="button-link" to="/">
          Back to dashboard
        </Link>
      </header>

      {error && <div className="error card">{error}</div>}

      <section className="card chat-shell">
        <div className="chat-log">
          {messages.map((msg) => (
            <div key={msg.id} className="chat-msg">
              <strong>{msg.sender?.name || "Unknown"}</strong>
              <p>{msg.content}</p>
              <small>{new Date(msg.createdAt).toLocaleString()}</small>
            </div>
          ))}
        </div>

        <form onSubmit={sendMessage} className="chat-form">
          <input
            placeholder="Type a message"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={1000}
          />
          <button type="submit">Send</button>
        </form>
      </section>
    </main>
  );
}
