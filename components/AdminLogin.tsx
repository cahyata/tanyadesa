"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/admin/actions";

export default function AdminLogin() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, null);

  return (
    <form action={action} className="login">
      <label htmlFor="password" className="login__label">
        Kata sandi admin
      </label>
      <div className="login__row">
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={200}
          aria-describedby={state?.error ? "login-error" : undefined}
          aria-invalid={state?.error ? true : undefined}
          className="login__input"
        />
        <button type="submit" disabled={pending} className="key key--primary">
          {pending ? "Memeriksa…" : "Masuk"}
        </button>
      </div>
      {state?.error && (
        <p id="login-error" role="alert" className="login__error">
          {state.error}
        </p>
      )}
    </form>
  );
}
