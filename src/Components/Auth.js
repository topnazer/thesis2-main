// src/components/Auth.js
import React, { useState } from "react";
import LoginForm from "./LoginForm";
import SignUpForm from "./SignUpForm";
import './Auth.css';

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);

  const toggleSignUp = () => setIsSignUp(!isSignUp);

  return isSignUp ? (
    <SignUpForm toggleLogin={toggleSignUp} />
  ) : (
    <LoginForm toggleSignUp={toggleSignUp} />
  );
};

export default Auth;
