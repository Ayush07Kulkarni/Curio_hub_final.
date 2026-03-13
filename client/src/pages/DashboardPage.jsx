import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, clearSession } from "../lib/api";

export default function DashboardPage({ user, onLogout }) {
  const [rooms, setRooms] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const [roomsData, mineData] = await Promise.all([
        api("/api/chatrooms"),
        api("/api/chatroom-requests/mine")
      ]);
      setRooms(roomsData);
      setMyRequests(mineData);

      if (user.role === "ADMIN") {
        const pending = await api("/api/admin/chatroom-requests");
        setPendingRequests(pending);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function submitRequest(event) {
    event.preventDefault();
    setError("");

    try {
      await api("/api/chatroom-requests", {
        method: "POST",
        body: JSON.stringify({ name, description })
      });
      setName("");
      setDescription("");
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

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
          <h1>CurioHub Dashboard</h1>
          <p>
            Signed in as <strong>{user.name}</strong> ({user.role})
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
          <h2>Request a New Chatroom</h2>
          <form onSubmit={submitRequest} className="stack">
            <label>
              Room name
              <input value={name} onChange={(event) => setName(event.target.value)} required minLength={3} />
            </label>
            <label>
              Description
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                required
                minLength={10}
              />
            </label>
            <button type="submit">Submit Request</button>
          </form>
        </article>
      </section>

      <section className="grid-2">
        <article className="card">
          <h2>My Requests</h2>
          {myRequests.length === 0 ? (
            <p>No requests yet.</p>
          ) : (
            <ul className="list">
              {myRequests.map((req) => (
                <li key={req.id} className="list-item">
                  <div>
                    <h3>{req.name}</h3>
                    <p>{req.description}</p>
                  </div>
                  <span className={`badge status-${req.status.toLowerCase()}`}>{req.status}</span>
                </li>
              ))}
            </ul>
          )}
        </article>

        {user.role === "ADMIN" && (
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
        )}
      </section>
    </main>
  );
}
