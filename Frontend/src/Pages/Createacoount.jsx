import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion as Motion } from "framer-motion";
import LogoApp from "../assets/ChatGPT Image Jul 16, 2025, 04_04_45 PM.png";
import UseAuthStore from "../AuthStore/UseAuthStore";
import { useGoogleLogin } from "@react-oauth/google";
import axios from "axios";
const BASE_URL = import.meta.env.VITE_API_URL;
const Createacoount = () => {
  //account creation states
  const [FormData, setFormData] = useState({
    Firstname: "",
    Lastname: "",
    Age: "",
    Email: "",
    Password: "",
  });
  const [loginFormData, setloginFormData] = useState({
    Email: "",
    Password: "",
  });
  // logo text animations
  const LogoWordAnimations = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.2,
      },
    },
  };
  const logowords = {
    hidden: { opacity: 0, x: -10 },
    show: { opacity: 1, x: 0, transition: { duration: 0.2, ease: "easeOut" } },
  };
  // navigations
  const Navigate = useNavigate();
  //authstore
  const { signin, signup } = UseAuthStore();
  //handlelogin
  const handlelogin = async (e) => {
    e.preventDefault();
    const result = await signin(loginFormData);
    if (result?.success) {
      Navigate("/home");
    } else {
      console.error("Login failed:", result?.message);
      alert(result?.message || "Login Failed");
    }
  };
  //handlesignup
  const handlesignup = async (e) => {
    e.preventDefault();
    try {
      const result = await signup(FormData);
      if (result?.success) {
        Navigate("/home");
      } else {
        console.error("Signup failed:", result?.message);
        // Display an error message to the user
        alert(result?.message || "Signup failed");
      }
    } catch (error) {
      console.log("error in logging in:", error);
      alert("Signup failed: " + error.message);
    }
  };
  // handle google login
  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const response = await axios.post(
          `${BASE_URL}/auth/google/callback`,
          {
            access_token: tokenResponse.access_token,
          },
          { headers: { "Content-Type": "application/json" } }
        );
        // Use your auth store instead of direct sessionStorage
        const result = await UseAuthStore.getState().handleGoogleCallback(
          response.data
        );
        if (result?.success) {
          Navigate("/home");
        }
      } catch (error) {
        console.error("Network Error Details:", {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          url: error.config?.url,
        });
        alert("Login failed: " + error.message);
      }
    },
    onError: (error) => {
      console.error("Google login failed:", error);
      alert("Google login failed");
    },
  });
  return (
    <>
      <div className="flex h-[120vh] w-screen bg-gradient-to-t from-sky-500 to-indigo-500 bg-cover items-center flex-col relative">
        {/* logo and logo text  */}
        <div className="flex flex-row justify-center items-center gap-[10px]">
          <img
            src={LogoApp}
            alt="Loading... 📄"
            loading="lazy"
            className="h-[50px] w-[50px] rounded-[50%] "
          />
          <Motion.div
            variants={LogoWordAnimations}
            initial="hidden"
            animate="show"
            className="text-white font-bold"
          >
            {["P", "h", "o", "t", "o", "S", "a", "f", "e"].map((text, idx) => (
              <Motion.p className="inline-block" key={idx} variants={logowords}>
                {text}
              </Motion.p>
            ))}
          </Motion.div>
        </div>
        {/* login and signup */}
        <div className="wrapper">
          <div className="card-switch">
            <label className="switch">
              <input type="checkbox" className="toggle" />
              <span className="slider"></span>
              <span className="card-side"></span>
              <div className="flip-card__inner">
                <div className="flip-card__front">
                  <div className="title">Log in</div>
                  <form className="flip-card__form" onSubmit={handlelogin}>
                    <input
                      className="flip-card__input"
                      name="Email"
                      value={loginFormData.Email}
                      placeholder="Email"
                      type="email"
                      required
                      onChange={(e) =>
                        setloginFormData({
                          ...loginFormData,
                          Email: e.target.value,
                        })
                      }
                    />
                    <input
                      className="flip-card__input"
                      name="Password"
                      placeholder="Password"
                      type="password"
                      value={loginFormData.Password}
                      onChange={(e) =>
                        setloginFormData({
                          ...loginFormData,
                          Password: e.target.value,
                        })
                      }
                      required
                    />
                    <button className="flip-card__btn" type="submit">
                      Let's go!
                    </button>
                  </form>
                </div>
                <div className="flip-card__back">
                  <div className="title">Sign up</div>
                  <form className="flip-card__form" onSubmit={handlesignup}>
                    <input
                      className="flip-card__input"
                      name="Firstname"
                      placeholder="First name"
                      type="text"
                      required
                      onChange={(e) =>
                        setFormData({ ...FormData, Firstname: e.target.value })
                      }
                      value={FormData.Firstname}
                    />
                    <input
                      className="flip-card__input"
                      name="Lastname"
                      placeholder="Last name"
                      type="text"
                      required
                      onChange={(e) =>
                        setFormData({ ...FormData, Lastname: e.target.value })
                      }
                      value={FormData.Lastname}
                    />
                    <input
                      className="flip-card__input"
                      name="Email"
                      placeholder="Email"
                      type="email"
                      required
                      onChange={(e) =>
                        setFormData({ ...FormData, Email: e.target.value })
                      }
                      value={FormData.Email}
                    />
                    <input
                      className="flip-card__input"
                      name="Password"
                      placeholder="Password"
                      type="password"
                      required
                      onChange={(e) =>
                        setFormData({ ...FormData, Password: e.target.value })
                      }
                      value={FormData.Password}
                    />
                    <input
                      type="number"
                      name="Age"
                      placeholder="Enter your age (must be above 13)"
                      className="flip-card__input"
                      min="13"
                      required
                      onChange={(e) =>
                        setFormData({ ...FormData, Age: e.target.value })
                      }
                      value={FormData.Age}
                    />
                    <button className="flip-card__btn" type="submit">
                      Confirm!
                    </button>
                  </form>
                </div>
              </div>
            </label>
          </div>
        </div>
        <div className="login_with_google">
          <button
            className="loginBtn"
            onClick={handleGoogleLogin}
            style={{ backgroundColor: "white" }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="xMidYMid"
              viewBox="0 0 256 262"
            >
              <path
                fill="#4285F4"
                d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
              ></path>
              <path
                fill="#34A853"
                d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
              ></path>
              <path
                fill="#FBBC05"
                d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782"
              ></path>
              <path
                fill="#EB4335"
                d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
              ></path>
            </svg>
            Continue with Google
          </button>
        </div>
        <div
          className="GoBackBtn absolute bottom-[0px]"
          onClick={() => {
            Navigate("/");
          }}
        >
          Go Back !
        </div>
      </div>
    </>
  );
};

export default Createacoount;
