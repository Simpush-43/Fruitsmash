import React, { useEffect } from "react";
import UseAuthStore from "../AuthStore/UseAuthStore";
import { useNavigate } from "react-router-dom";
const ProfilePAge = () => {
  const { user, fetchUser, signout } = UseAuthStore();
  const navigate = useNavigate();
  useEffect(() => {
    fetchUser();
  }, []);
  const handlelogout = async () => {
    const result = await signout();
    if (result?.success) {
      navigate("/home");
    }
  };
  const handleGoBack = ()=>{
    navigate('/home')
  }
  return (
    <div className="Profile_page">
      {user ? (
        <>
          <div class="card">
            {user.Profilepic ? (
              <img src={user.Profilepic} alt="Photo" />
            ) : (
              <div className="card-photo"></div>
            )}
            <div class="card-title">
              {user.Firstname} {user.Lastname} <br />
              <span>Fullstack dev &amp; UX UI</span>
            </div>
            <div class="card-socials">
              <button
                className="bg-red-500 p-[4px] rounded-sm text-amber-50 "
                onClick={handlelogout}
              >
                Logout
              </button>
            </div>
          </div>
        </>
      ) : (
        <div class="loader">
          <div class="wrapper">
            <div class="circle"></div>
            <div class="line-1"></div>
            <div class="line-2"></div>
            <div class="line-3"></div>
            <div class="line-4"></div>
          </div>
        </div>
      )}
      <div className="GoBackBtn absolute bottom-[0px]" onClick={handleGoBack}>Go Back !</div>
    </div>
  );
};

export default ProfilePAge;
