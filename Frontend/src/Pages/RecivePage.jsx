import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import UseAuthStore from "../AuthStore/UseAuthStore";
import ProfileImage from "../assets/reshot-icon-profile-image-SBDVTH9PEA (1).png";

const RecivePage = () => {
  const [selecteduser, setselecteduser] = useState(null);
  const [senderImagecount, setsenderImagecount] = useState({});
  const navigate = useNavigate();
  const { user, fetchUser, users, fetchallUsers, images, ReceiveALLImage, checkPrivateChatAccess } = UseAuthStore();

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
    if (selecteduser) {
      const SenderID = selecteduser.id || selecteduser._id;
      const ReceiverID = user?.id || user?._id;
      if (SenderID && ReceiverID) {
        ReceiveALLImage(SenderID, ReceiverID);
      }
    }
  }, [selecteduser, user, ReceiveALLImage]);

  useEffect(() => {
    if (images && images.length > 0) {
      const countMap = {};
      images.forEach((img) => {
        const senderID = img.SenderID?.id || img.SenderID?._id;
        if (senderID) {
          countMap[senderID] = countMap[senderID] ? countMap[senderID] + 1 : 1;
        }
      });
      setsenderImagecount(countMap);
    }
  }, [images]);

  const currentUser = user;

  const handleuserclick = (u) => {
    setselecteduser(u);
    setsenderImagecount((prev) => ({
      ...prev,
      [u._id]: null,
    }));
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
                <motion.div
                  key={u.id || u._id}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.94 }}
                  className="flex items-center gap-2 p-2 hover:bg-gray-200 cursor-pointer rounded-l-lg mt-[10px]"
                  onClick={() => handleuserclick(u)}
                >
                  <img src={u.Profilepic || ProfileImage} alt="" className="w-10 h-10 rounded-full" />
                  <span className="font-medium text-lg font-sans text-amber-200">{u.Firstname}</span>
                  {senderImagecount[u._id] && (
                    <div className="ml-auto bg-green-500 text-white w-6 h-6 flex items-center justify-center rounded-full text-sm">
                      {senderImagecount[u._id]}
                    </div>
                  )}
                </motion.div>
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
            <motion.div
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
                  {images && images.length > 0 ? (
                    images.map((i) => (
                      <img key={i._id} src={i.imageUrl} alt="sent" className="w-20 h-20 m-1 rounded" />
                    ))
                  ) : (
                    <p>No images Recived yet</p>
                  )}
                </div>
              </div>
              <div className="p-2 border-t flex gap-2 bg-white">
                <input
                  type="text"
                  name="Message"
                  id="messageInput"
                  placeholder="send a message"
                  className="p-2 text-amber-300 rounded-e-sm border-gray-400 bg-gray-600"
                />
                <button className="bg-green-500 text-white px-4 py-2 rounded-lg">Send 📩</button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center flex-1 text-gray-500"
            >
              Click to Check the messages...
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default RecivePage;
