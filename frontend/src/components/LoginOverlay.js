// src/components/LoginOverlay.js
import React, { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";

const LoginOverlay = () => {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [mode, setMode] = useState("login"); // or "signup"
  const [error, setError] = useState("");

  const handleAuth = async () => {
    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, pass);
      } else {
        await createUserWithEmailAndPassword(auth, email, pass);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white/10 backdrop-blur-lg border border-white/30 shadow-xl rounded-2xl p-8 w-[90%] max-w-md text-white">
        <h2 className="text-2xl font-bold mb-6 text-center">
          {mode === "login" ? "Welcome Back" : "Join Telangana Atlas"}
        </h2>
        {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
        <input
          type="email"
          placeholder="Email"
          className="w-full mb-3 p-2 rounded text-black"
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full mb-4 p-2 rounded text-black"
          onChange={(e) => setPass(e.target.value)}
        />
        <button
          onClick={handleAuth}
          className="bg-pink-600 w-full py-2 rounded hover:bg-pink-700 transition"
        >
          {mode === "login" ? "Login" : "Sign Up"}
        </button>
        <p className="text-center mt-4 text-sm">
          {mode === "login" ? "New user?" : "Already have an account?"}{" "}
          <button
            className="text-pink-300 underline"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
          >
            {mode === "login" ? "Sign up" : "Log in"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginOverlay;
