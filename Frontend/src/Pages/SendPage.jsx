import React, { useEffect, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import UseAuthStore from "../AuthStore/UseAuthStore";
import ProfileImage from "../assets/reshot-icon-profile-image-SBDVTH9PEA (1).png";

const SendPage = () => {
  const [selecteduser, setselecteduser] = useState(null);
  const [userImages, setuserImages] = useState([]);
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();
  const {
    user,
    fetchUser,
    users,
    fetchallUsers,
    UploadImage,
    GetALLImage,
    images,
    checkPrivateChatAccess,
  } = UseAuthStore();

  useEffect(() => {
    const validatePrivateAccess = async () => {
      const { unlocked } = await checkPrivateChatAccess();
      if (!unlocked) {
        navigate("/home");
      }
    };

    validatePrivateAccess();
    fetchallUsers();
    fetchUser();
  }, [checkPrivateChatAccess, fetchallUsers, fetchUser, navigate]);

  useEffect(() => {
    if (selecteduser) GetALLImage(selecteduser.id || selecteduser._id);
  }, [selecteduser, GetALLImage]);

  const currentUser = user;

  const Imagesend = async (e) => {
    const file = e.target.files[0];
    const input = e.currentTarget;
    setUploadError("");
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Image is too large. Choose an image smaller than 10 MB.");
      input.value = "";
      return;
    }

    const ReceiverID = selecteduser._id || selecteduser.id;

    try {
      setIsUploading(true);
      const res = await UploadImage(file, ReceiverID);
      if (res?.imageUrl) {
        const updated = [...userImages, { ReceiverID, imageUrl: res.imageUrl }];
        setuserImages(updated);
      } else {
        setUploadError("The image could not be uploaded. Please try again.");
      }
    } catch (err) {
      console.error("Upload error:", err);
      setUploadError(
        err.response?.data?.message || "Image upload failed. Please try again."
      );
    } finally {
      setIsUploading(false);
      input.value = "";
    }
  };

  return (
    <div className="flex h-screen">
      <div className="w-1/4 bg-gray-700 border-r overflow-y-auto">
        <div className="p-4 font-bold text-lg font-sans text-white">Users</div>
        <input
          type="text"
          placeholder=" 🔎Search the user..."
          className="w-full border-b-2 border-b-white text-amber-100"
        />
        <div className="space-y-2">
          {users && currentUser ? (
            users
              .filter((user) => user._id !== currentUser._id)
              .map((u) => (
                <Motion.div
                  key={u.id || u._id}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.94 }}
                  className="flex items-center gap-2 p-2 hover:bg-gray-200 cursor-pointer rounded-l-lg mt-[10px]"
                  onClick={() => setselecteduser(u)}
                >
                  <img src={u.Profilepic || ProfileImage} alt="" className="w-10 h-10 rounded-full" />
                  <span className="font-medium text-lg font-sans text-amber-200">{u.Firstname}</span>
                </Motion.div>
              ))
          ) : (
            <div className="loader">
              <div className="wrapper">
                <div className="circle"></div>
                <div className="line-1"></div>
                <div className="line-2"></div>
                <div className="line-3"></div>
                <div className="line-4"></div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col relative overflow-hidden">
        <AnimatePresence mode="wait">
          {selecteduser ? (
            <Motion.div
              key={selecteduser.id || selecteduser._id}
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              transition={{ type: "spring", stiffness: 80 }}
              className="flex flex-col h-full"
            >
              <div className="flex items-center gap-2 p-[4px] border-b shadow-sm bg-amber-500">
                <img src={selecteduser.Profilepic || ProfileImage} alt="" className="w-10 h-10 rounded-full" />
                <h2 className="font-medium text-lg font-sans text-amber-200">{selecteduser.Firstname}</h2>
              </div>
              <div className="flex overflow-y-auto p-4 bg-gray-100">
                <div>
                  <p>Your sent image:</p>
                  {images && images.length > 0 ? (
                    images.map((i) => (
                      <img key={i._id} src={i.imageUrl} alt="sent" className="w-20 h-20 m-1 rounded" />
                    ))
                  ) : (
                    <p>No images sent yet</p>
                  )}
                </div>
              </div>
              <div className="p-2 border-t bg-white">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    className="hidden"
                    id="imageUpload"
                    accept="image/jpeg,image/png"
                    disabled={isUploading}
                    onChange={Imagesend}
                  />
                  <label
                    htmlFor="imageUpload"
                    className={`rounded-lg px-3 py-2 text-white ${isUploading ? "cursor-wait bg-blue-300" : "cursor-pointer bg-blue-500"}`}
                  >
                    {isUploading ? "Uploading..." : "Send 📩"}
                  </label>
                  {uploadError && (
                    <p className="text-sm text-red-600" role="alert">{uploadError}</p>
                  )}
                </div>
              </div>
            </Motion.div>
          ) : (
            <Motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center flex-1 text-gray-500"
            >
              Select a user to start sending...
            </Motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SendPage;
