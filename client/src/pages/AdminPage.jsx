import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, clearSession } from "../lib/api";

export default function AdminPage({ user, onLogout }) {
  const [rooms, setRooms] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const [roomsData, pendingData] = await Promise.all([
        api("/api/chatrooms"),
        api("/api/admin/chatroom-requests")
      ]);
      setRooms(roomsData);
      setPendingRequests(pendingData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function processRequest(id, action) {
    setError("");
    try {
      await api(`/api/admin/chatroom-requests/${id}/${action}`, { method: "POST" });
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  function handleLogout() {
    clearSession();
    onLogout();
  }

  return (
    <main className="container">
      <header className="topbar card">
        <div>
          <h1>Admin Dashboard</h1>
          <p>
            Signed in as <strong>{user.name}</strong>
          </p>
        </div>
        <button onClick={handleLogout}>Logout</button>
      </header>

      {error && <div className="error card">{error}</div>}

      <section className="grid-2">
        <article className="card">
          <h2>Approved Chatrooms</h2>
          {loading ? (
            <p>Loading rooms...</p>
          ) : rooms.length === 0 ? (
            <p>No rooms available yet.</p>
          ) : (
            <ul className="list">
              {rooms.map((room) => (
                <li key={room.id} className="list-item">
                  <div>
                    <h3>{room.name}</h3>
                    <p>{room.description}</p>
                    <small>{room._count.messages} messages</small>
                  </div>
                  <Link className="button-link" to={`/rooms/${room.id}`}>
                    Open chat
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="card">
          <h2>Admin Queue</h2>
          {pendingRequests.length === 0 ? (
            <p>No pending requests.</p>
          ) : (
            <ul className="list">
              {pendingRequests.map((req) => (
                <li key={req.id} className="list-item vertical">
                  <div>
                    <h3>{req.name}</h3>
                    <p>{req.description}</p>
                    <small>
                      Requested by {req.requester.name} ({req.requester.email})
                    </small>
                  </div>
                  <div className="actions">
                    <button onClick={() => processRequest(req.id, "approve")}>Approve</button>
                    <button className="danger" onClick={() => processRequest(req.id, "reject")}>
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </main>
  );
}
