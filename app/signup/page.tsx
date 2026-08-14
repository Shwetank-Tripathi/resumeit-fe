"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ApiError, registerUser } from "@/lib/api";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import TextField from "@/components/ui/TextField";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);

    try {
      const result = await registerUser(email, password);
      setMessage(result.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <Card padding="lg" className="w-full max-w-sm">
        <div className="mb-4 flex justify-center">
          <Image
            src="/logo-transparent.png"
            alt="ResumeIt logo"
            width={195}
            height={64}
            unoptimized
            className="h-16 w-auto"
          />
        </div>

        <h1 className="font-serif text-2xl font-medium text-text-primary">
          Sign up
        </h1>

        {message ? (
          <div className="mt-8 flex flex-col gap-6">
            <p className="text-text-primary">{message}</p>
            <Button href="/login" variant="primary" size="md" className="text-center">
              Go to login
            </Button>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-6">
              <TextField
                variant="ledger"
                label="Email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />

              <TextField
                variant="ledger"
                label="Password"
                helper="8-72 characters"
                type="password"
                required
                minLength={8}
                maxLength={72}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />

              {error && (
                <p role="alert" className="text-sm text-danger">
                  {error}
                </p>
              )}

              <Button type="submit" variant="primary" size="md" disabled={submitting}>
                {submitting ? "Signing up…" : "Sign up"}
              </Button>
            </form>

            <p className="mt-6 text-sm text-text-secondary">
              Already have an account?{" "}
              <Link href="/login" className="text-accent hover:underline">
                Log in
              </Link>
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
