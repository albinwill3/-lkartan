import { useState } from "react"
import { supabase } from "../lib/supabase"

export default function AuthForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLogin, setIsLogin] = useState(true)
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    const { error } = isLogin
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    setMessage(isLogin ? "Du är inloggad!" : "Konto skapat! Verifiera ditt konto på mail.")
    setEmail("")
    setPassword("")
    setLoading(false)
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>{isLogin ? "Logga in" : "Skapa konto"}</h1>

        <input
          type="email"
          placeholder="E-post"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Lösenord"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />

        <button type="submit" disabled={loading}>
          {loading ? "Laddar..." : isLogin ? "Logga in" : "Skapa konto"}
        </button>

        <button type="button" onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "Skapa konto istället" : "Logga in istället"}
        </button>

        {message && <p>{message}</p>}
      </form>
    </div>
  )
}