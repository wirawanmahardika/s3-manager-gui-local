'use client';

import { login } from '@/app/actions/auth';
import { useActionState } from 'react';
import { AlertCircle, Database, Loader2, Lock, User } from 'lucide-react';

export default function Login() {
    const [state, action, pending] = useActionState(login, undefined);

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden bg-linear-to-br from-base-200 via-base-100 to-base-200">
            {/* Decorative background glow */}
            <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-secondary/15 blur-3xl" />

            <div className="relative w-full max-w-sm">
                <div className="card bg-base-100/95 backdrop-blur border border-base-200 shadow-xl">
                    <div className="card-body p-7 space-y-5">
                        {/* Brand Header */}
                        <div className="flex flex-col items-center text-center space-y-2">
                            <div className="h-12 w-12 rounded-2xl bg-linear-to-br from-primary to-secondary text-primary-content flex items-center justify-center shadow-md">
                                <Database className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight">S3 Manager</h1>
                                <p className="text-xs text-base-content/60">
                                    Object Storage Console • Powered by Bun
                                </p>
                            </div>
                        </div>

                        {state?.message && (
                            <div role="alert" className="alert alert-error text-xs py-2.5">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{state.message}</span>
                            </div>
                        )}

                        <form action={action} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-base-content/80 block">
                                    Username
                                </label>
                                <label
                                    className={`input input-bordered w-full flex items-center gap-2.5 ${state?.errors?.username ? 'input-error' : ''
                                        }`}
                                >
                                    <User className="w-4 h-4 text-base-content/50 shrink-0" />
                                    <input
                                        type="text"
                                        name="username"
                                        placeholder="Masukkan username"
                                        autoComplete="username"
                                        className="grow text-sm"
                                    />
                                </label>
                                {state?.errors?.username && (
                                    <p className="text-error text-xs">{state.errors.username[0]}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-base-content/80 block">
                                    Password
                                </label>
                                <label
                                    className={`input input-bordered w-full flex items-center gap-2.5 ${state?.errors?.password ? 'input-error' : ''
                                        }`}
                                >
                                    <Lock className="w-4 h-4 text-base-content/50 shrink-0" />
                                    <input
                                        type="password"
                                        name="password"
                                        placeholder="Masukkan password"
                                        autoComplete="current-password"
                                        className="grow text-sm"
                                    />
                                </label>
                                {state?.errors?.password && (
                                    <ul className="text-error text-xs list-disc list-inside space-y-0.5">
                                        {state.errors.password.map((err) => (
                                            <li key={err}>{err}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={pending}
                                className="btn btn-primary w-full gap-2 mt-2"
                            >
                                {pending && <Loader2 className="w-4 h-4 animate-spin" />}
                                {pending ? 'Masuk...' : 'Masuk ke Console'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
