"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function SignupPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            alert("Usuario creado exitosamente");
            router.push("/login");
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="p-8">
            <h1>Crear Usuario (Admin)</h1>
            <form onSubmit={handleSignup} className="space-y-4 max-w-sm">
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border p-2 w-full"
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border p-2 w-full"
                />
                <button type="submit" className="bg-blue-500 text-white p-2 w-full">
                    Crear Usuario
                </button>
                {error && <p className="text-red-500">{error}</p>}
            </form>
        </div>
    );
}
