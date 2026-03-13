import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setSession } from "../lib/api";

export default function AuthPage({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", identifier: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  function updateField(event) {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const path = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload =
        mode === "login"
          ? { identifier: form.identifier, password: form.password }
          : { name: form.name, email: form.email, password: form.password };

      const data = await api(path, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      setSession(data);
      onLogin(data.user);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <h1>CurioHub</h1>
        <p>Build and join serious niche communities.</p>

        {mode === "register" && (
          <label>
            Name
            <input name="name" value={form.name} onChange={updateField} required minLength={2} />
          </label>
        )}

        {mode === "login" ? (
          <label>
            Username or Email
            <input name="identifier" value={form.identifier} onChange={updateField} required />
          </label>
        ) : (
          <label>
            Email
            <input name="email" type="email" value={form.email} onChange={updateField} required />
          </label>
        )}

        <label>
          Password
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={updateField}
            required
            minLength={5}
          />
        </label>

        {error && <div className="error">{error}</div>}

        <button type="submit" disabled={loading}>
          {loading ? "Please wait..." : mode === "login" ? "Login" : "Create account"}
        </button>

        <button
          type="button"
          className="ghost"
          onClick={() => {
            setError("");
            setMode((prev) => (prev === "login" ? "register" : "login"));
          }}
        >
          {mode === "login" ? "Need an account? Register" : "Have an account? Login"}
        </button>
      </form>
    </main>
  );
}
