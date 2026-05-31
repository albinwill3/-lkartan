import { useState } from "react"
import { supabase } from "../lib/supabase"

export default function AuthForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLogin, setIsLogin] = useState(true)
  const [message, setMessage] = useState("")
  const [isError, setIsError] = useState(false)
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
      setIsError(true)
      setLoading(false)
      return
    }

    setIsError(false)
    setMessage(isLogin ? "Du är inloggad!" : "Konto skapat! Verifiera ditt konto på mail.")
    setEmail("")
    setPassword("")
    setLoading(false)
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2>{isLogin ? "Logga in" : "Skapa konto"}</h2>

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

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? "Laddar..." : isLogin ? "Logga in" : "Skapa konto"}
      </button>

      <button type="button" className="btn-secondary" onClick={() => setIsLogin(!isLogin)}>
        {isLogin ? "Skapa konto istället" : "Logga in istället"}
      </button>

      {message && (
        <p className={`message ${isError ? "error" : "success"}`}>{message}</p>
      )}
    </form>
  )
}
