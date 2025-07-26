// src/components/LoginOverlay.js
import React, { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../components/firebase_keys";

const LoginOverlay = () => {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [username, setUsername] = useState("");
  const [mode, setMode] = useState("login"); // 'login' or 'signup'
  const [error, setError] = useState("");

  const handleAuth = async () => {
    try {
      if (mode === "signup") {
        if (pass !== confirmPass) {
          setError("Passwords do not match");
          return;
        }
        const userCred = await createUserWithEmailAndPassword(auth, email, pass);
        await sendEmailVerification(userCred.user);
        const finalUsername = username || `anon${Math.floor(Math.random() * 10000)}`;
        await setDoc(doc(db, "users", userCred.user.uid), {
          email,
          username: finalUsername,
        });
        setError("");
        alert("Signup successful! Please verify your email before logging in.");
      } else {
        const userCred = await signInWithEmailAndPassword(auth, email, pass);
        if (!userCred.user.emailVerified) {
          setError("Please verify your email before logging in.");
          return;
        }
        setError("");
        // Proceed to redirect or close overlay as needed
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
          className="w-full mb-3 p-2 rounded text-black"
          onChange={(e) => setPass(e.target.value)}
        />
        {mode === "signup" && (
          <>
            <input
              type="text"
              placeholder="Choose a username"
              className="w-full mb-3 p-2 rounded text-black"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              type="password"
              placeholder="Confirm password"
              className="w-full mb-4 p-2 rounded text-black"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
            />
          </>
        )}
        {mode !== "signup" && (
          <div style={{ marginBottom: "1rem" }} />
        )}
        <button
          onClick={handleAuth}
          className="bg-pink-600 w-full py-2 rounded hover:bg-pink-700 transition"
        >
          {mode === "login" ? "Login" : "Sign Up"}
        </button>
        <p className="text-center mt-4 text-sm">
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}
          <button
            className="text-pink-300 underline ml-2"
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
