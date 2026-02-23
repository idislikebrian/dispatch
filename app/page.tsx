"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export default function HomePage() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Login failed");
      return;
    }

    router.push("/tasks");
  }

  return (
    <div className={styles.container}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.title}>Dispatch</h1>

        <div className={styles.field}>
          <label>Email</label>
          <input name="email" type="email" required />
        </div>

        <div className={styles.field}>
          <label>Password</label>
          <input name="password" type="password" required />
        </div>

        {error && <p style={{ color: "red" }}>{error}</p>}

        <button type="submit" className={styles.button}>
          Log In
        </button>
      </form>
    </div>
  );
}