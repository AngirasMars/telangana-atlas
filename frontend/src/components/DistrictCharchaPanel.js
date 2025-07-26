// src/components/DistrictCharchaPanel.js
import React, { useEffect, useState, useRef } from "react";
import { db, storage } from "../components/firebase_keys";
import { getAuth } from "firebase/auth";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  runTransaction,
  deleteDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
// Remove: import ReactMarkdown from "react-markdown";

const DistrictCharchaPanel = ({
  district,
  isPlacingPin,
  setIsPlacingPin,
  
  pendingPinCoords,
  setPendingPinCoords,
  selectedPinType,
  setSelectedPinType,
}) => {
  const [text, setText] = useState("");
  const [media, setMedia] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [pinNoticeShown, setPinNoticeShown] = useState(false);
  const [commentText, setCommentText] = useState({});
  const [replyText, setReplyText] = useState({});
  const [replyingTo, setReplyingTo] = useState({});
  const [commentUnsubscribers, setCommentUnsubscribers] = useState([]);

  const postRefs = useRef({});

  // Added handleDeletePost function
  const handleDeletePost = async (post) => {
    const user = getAuth().currentUser;
    if (!user || user.uid !== post.userId) return;

    const confirmed = window.confirm("Are you sure you want to delete this post?");
    if (!confirmed) return;

    const postRef = doc(db, "charcha", district.district, "posts", post.id);

    try {
      // Soft delete the post
      await runTransaction(db, async (transaction) => {
        const docSnap = await transaction.get(postRef);
        if (!docSnap.exists()) return;

        transaction.update(postRef, {
          isDeleted: true,
          deletedAt: serverTimestamp(),
        });
      });

      // Delete media from storage if present
      if (post.mediaURL) {
        const mediaRef = ref(storage, post.mediaURL);
        await deleteObject(mediaRef).catch(() => {}); // avoid error if already deleted
      }

      // Delete pin from pins collection if present
      if (post.lat && post.lng) {
        const pinRef = doc(db, "pins", post.id);
        await deleteDoc(pinRef).catch(() => {});
      }

    } catch (err) {
      console.error("Error deleting post:", err);
      alert("Failed to delete post. Try again.");
    }
  };

  useEffect(() => {
    const handleScrollToPost = (e) => {
      const postId = e.detail.postId;

      // Step 1: Tell the app to open Charcha if it's not already
      const openCharchaEvent = new CustomEvent("open-charcha");
      window.dispatchEvent(openCharchaEvent);

      // Step 2: Wait for DOM to fully update/render
      setTimeout(() => {
        const postEl = document.getElementById(`post-${postId}`);
        if (postEl) {
          postEl.scrollIntoView({ behavior: "smooth", block: "center" });

          // Optional: highlight it too
          postEl.classList.add("highlight-flash");
          setTimeout(() => postEl.classList.remove("highlight-flash"), 1500);
        }
      }, 300); // Delay allows time for rendering
    };

    window.addEventListener("scroll-to-post", handleScrollToPost);
    return () => window.removeEventListener("scroll-to-post", handleScrollToPost);
  }, []);

  const handlePost = async () => {
    const user = getAuth().currentUser;
    if (!text.trim() || !user || !district?.district) return;

    try {
      const postData = {
        text: text.trim(),
        userId: user.uid,
        userName: user.email.split("@")[0],
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
        pinType: selectedPinType,
      };

      if (pendingPinCoords) {
        postData.lat = pendingPinCoords.lat;
        postData.lng = pendingPinCoords.lng;
      }

      if (media) {
        const mediaRef = ref(
          storage,
          `charcha_media/${district.district}/${Date.now()}_${media.name}`
        );
        await uploadBytes(mediaRef, media);
        const downloadURL = await getDownloadURL(mediaRef);
        postData.mediaURL = downloadURL;
        postData.mediaType = media.type.startsWith("image") ? "image" : "video";
      }

      await addDoc(collection(db, "charcha", district.district, "posts"), postData);

      // Dispatch refresh-pins event to update map pins immediately
      window.dispatchEvent(new CustomEvent("refresh-pins", {
        detail: { district: district.district }
      }));

      setText("");
      setMedia(null);
      setPendingPinCoords(null);
      setPinNoticeShown(false);
      setSelectedPinType("live"); // Reset to default
    } catch (error) {
      console.error("Failed to post:", error);
    }
  };

  const handleAttachPin = () => {
    setIsPlacingPin(true);
    setPendingPinCoords(null);
    setPinNoticeShown(true);
  };

  useEffect(() => {
    if (!district?.district) {
      setPosts([]);
      return;
    }

    setLoadingPosts(true);
    const q = query(
      collection(db, "charcha", district.district, "posts"),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Filter out deleted posts
      const postDocs = snapshot.docs
        .map((docSnap) => {
          const post = { id: docSnap.id, ...docSnap.data() };
          if (post.isDeleted) return null;
          post.voteCount = Object.values(post.votes || {}).reduce(
            (acc, val) => acc + val,
            0
          );
          post.comments = [];
          return post;
        })
        .filter(Boolean);

      commentUnsubscribers.forEach((unsub) => unsub());

      const newUnsubs = postDocs.map((post, index) => {
        const commentsRef = collection(
          db,
          "charcha",
          district.district,
          "posts",
          post.id,
          "comments"
        );

        return onSnapshot(
          query(commentsRef, orderBy("timestamp", "asc")),
          (snapshot) => {
            const commentDocs = snapshot.docs.map((docSnap) => ({
              id: docSnap.id,
              ...docSnap.data(),
              replies: [],
            }));

            commentDocs.forEach((comment, cIndex) => {
              const repliesRef = collection(
                db,
                "charcha",
                district.district,
                "posts",
                post.id,
                "comments",
                comment.id,
                "replies"
              );
              onSnapshot(
                query(repliesRef, orderBy("timestamp", "asc")),
                (replySnap) => {
                  commentDocs[cIndex].replies = replySnap.docs.map((r) => ({
                    id: r.id,
                    ...r.data(),
                  }));
                  setPosts((prevPosts) => {
                    const updated = [...prevPosts];
                    updated[index] = {
                      ...updated[index],
                      comments: commentDocs,
                    };
                    return updated;
                  });
                }
              );
            });
          }
        );
      });

      setPosts(postDocs);
      setCommentUnsubscribers(newUnsubs);
      setLoadingPosts(false);
    });

    return () => {
      unsubscribe();
      commentUnsubscribers.forEach((unsub) => unsub());
      setPosts([]);
    };
  }, [district?.district]);

  const handleVote = async (postId, voteValue) => {
    const user = getAuth().currentUser;
    if (!user) return;

    const postRef = doc(db, "charcha", district.district, "posts", postId);

    await runTransaction(db, async (transaction) => {
      const postDoc = await transaction.get(postRef);
      if (!postDoc.exists()) return;

      const currentVotes = postDoc.data().votes || {};
      const existingVote = currentVotes[user.uid];

      if (existingVote === voteValue) {
        delete currentVotes[user.uid];
      } else {
        currentVotes[user.uid] = voteValue;
      }

      transaction.update(postRef, { votes: currentVotes });
    });
  };

  const handleAddComment = async (postId) => {
    const user = getAuth().currentUser;
    const text = commentText[postId];
    if (!user || !text?.trim()) return;

    await addDoc(
      collection(db, "charcha", district.district, "posts", postId, "comments"),
      {
        uid: user.uid,
        userName: user.email.split("@")[0],
        text: text.trim(),
        timestamp: serverTimestamp(),
      }
    );
    setCommentText((prev) => ({ ...prev, [postId]: "" }));
  };

  const handleAddReply = async (postId, commentId) => {
    const user = getAuth().currentUser;
    const text = replyText[commentId];
    if (!user || !text?.trim()) return;

    await addDoc(
      collection(
        db,
        "charcha",
        district.district,
        "posts",
        postId,
        "comments",
        commentId,
        "replies"
      ),
      {
        uid: user.uid,
        userName: user.email.split("@")[0],
        text: text.trim(),
        timestamp: serverTimestamp(),
      }
    );

    setReplyText((prev) => ({ ...prev, [commentId]: "" }));
    setReplyingTo((prev) => ({ ...prev, [commentId]: false }));
  };

  return (
    <div className="text-white space-y-4 p-4">
      <h2 className="text-2xl font-bold text-pink-400">Charcha in {district.district}</h2>

      {/* Post Form */}
      <div className="space-y-2">
        {pinNoticeShown && !pendingPinCoords && (
          <div className="text-sm text-yellow-400 italic">
            Click on the map to drop your pin…
          </div>
        )}
        {pendingPinCoords && (
          <div className="text-xs text-green-400">
            📍 Pin attached at: {pendingPinCoords.lat.toFixed(4)},{" "}
            {pendingPinCoords.lng.toFixed(4)}
          </div>
        )}
        <textarea
          className="w-full p-3 rounded bg-gray-800 border border-gray-600"
          placeholder="What's happening in this district?"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          disabled={isPlacingPin}
        />
        <input
          type="file"
          accept="image/*,video/*"
          onChange={(e) => setMedia(e.target.files[0])}
          disabled={isPlacingPin}
          className="block text-sm text-gray-300"
        />
        {media && (
          <p className="text-xs text-gray-400">📁 Attached: {media.name}</p>
        )}
        
        {/* Pin Type Selection - Show immediately after clicking Attach Pin */}
        {isPlacingPin && !pendingPinCoords && (
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Pin Type:</label>
            <select
              value={selectedPinType}
              onChange={(e) => setSelectedPinType(e.target.value)}
              className="bg-gray-800 text-white p-2 rounded border border-gray-600"
            >
              <option value="persistent">🟡 Persistent</option>
              <option value="live">🔴 Live</option>
            </select>
          </div>
        )}
        
        <div className="flex gap-2">
          <button
            onClick={handlePost}
            className="bg-pink-600 px-4 py-2 rounded hover:bg-pink-700 transition"
            disabled={isPlacingPin}
          >
            Post
          </button>
          <button
            onClick={handleAttachPin}
            className="bg-gray-700 px-4 py-2 rounded hover:bg-gray-600 text-sm"
            disabled={isPlacingPin}
          >
            📍 Attach Pin
          </button>
        </div>
      </div>

      {/* Post Feed */}
      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        {loadingPosts ? (
          <p className="text-sm text-gray-400 italic">Loading posts...</p>
        ) : posts.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No posts yet. Be the first!</p>
        ) : (
          posts.map((post) => (
            // ⚡ Step 2: Add onClick event and classes to the post container
            <div
              key={post.id}
              ref={(el) => (postRefs.current[post.id] = el)}
              id={`post-${post.id}`}
              onClick={() => {
                if (post.lat && post.lng) {
                  window.dispatchEvent(
                    new CustomEvent("fly-to-pin", {
                      detail: { lat: post.lat, lng: post.lng, postId: post.id },
                    })
                  );
                }
              }}
              className="bg-gray-800 border border-gray-700 p-4 rounded-lg space-y-2 hover:ring hover:ring-pink-400"
            >
              {/* Added Delete Button */}
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-pink-400">@{post.userName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {post.timestamp?.toDate()?.toLocaleString() || "Just now"}
                  </span>
                  {getAuth().currentUser?.uid === post.userId && (
                    <button
                      onClick={() => handleDeletePost(post)}
                      className="text-xs text-red-400 hover:text-red-500"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
              
              <div className="flex flex-row items-start gap-4">
                {/* Vote block on the left */}
                <div className="flex flex-col items-center gap-1 pt-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleVote(post.id, 1); }}
                    className="text-gray-400 hover:text-green-400"
                  >
                    ▲
                  </button>
                  <span className="text-sm font-semibold">
                    {post.voteCount || 0}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleVote(post.id, -1); }}
                    className="text-gray-400 hover:text-red-400"
                  >
                    ▼
                  </button>
                </div>
                {/* Post content on the right */}
                <div className="flex-1 min-w-0">
                  <p className="text-gray-100">{post.text}</p>
                  {post.lat && post.lng && (
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-gray-400 italic">
                        📍 {post.lat.toFixed(3)}, {post.lng.toFixed(3)}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.dispatchEvent(
                            new CustomEvent("start-triangle-mode", {
                              detail: { lat: post.lat, lng: post.lng }
                            })
                          );
                        }}
                        className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-white"
                      >
                        🧭 Navigate
                      </button>
                    </div>
                  )}
                  {post.mediaURL && post.mediaType === "image" && (
                    <div className="mt-2 overflow-hidden rounded-md border border-gray-600 shadow max-h-[75vh]">
                      <img
                        src={post.mediaURL}
                        alt="Post"
                        className="w-full object-cover transition-transform duration-300 ease-in-out transform hover:scale-125"
                        style={{ maxHeight: "100%", height: "auto" }}
                      />
                    </div>
                  )}
                  {post.mediaURL && post.mediaType === "video" && (
                    <video src={post.mediaURL} controls className="w-full mt-2 rounded" />
                  )}

                  <div className="mt-3 space-y-1">
                    <textarea
                      placeholder="Add a comment..."
                      value={commentText[post.id] || ""}
                      onChange={(e) =>
                        setCommentText((prev) => ({ ...prev, [post.id]: e.target.value }))
                      }
                      className="w-full p-2 bg-gray-700 text-sm rounded"
                      rows={2}
                    />
                    <button
                      onClick={() => handleAddComment(post.id)}
                      className="text-sm bg-pink-600 hover:bg-pink-700 px-3 py-1 rounded"
                    >
                      Comment
                    </button>
                  </div>

                  {post.comments && post.comments.length > 0 && (
                    <div className="mt-3 space-y-2 border-t border-gray-600 pt-2">
                      {post.comments.map((comment) => (
                        <div key={comment.id} className="text-sm space-y-1">
                          <div>
                            <span className="text-pink-300 font-semibold">@{comment.userName}</span>{" "}
                            <span className="text-gray-300">{comment.text}</span>
                            <span className="text-xs text-gray-500 ml-2">
                              {comment.timestamp?.toDate()?.toLocaleString() || "Just now"}
                            </span>
                            <button
                              onClick={() =>
                                setReplyingTo((prev) => ({ ...prev, [comment.id]: true }))
                              }
                              className="ml-3 text-xs text-blue-400 hover:underline"
                            >
                              Reply
                            </button>
                          </div>

                          {replyingTo[comment.id] && (
                            <div className="ml-4 mt-1 space-y-1">
                              <textarea
                                value={replyText[comment.id] || ""}
                                onChange={(e) =>
                                  setReplyText((prev) => ({
                                    ...prev,
                                    [comment.id]: e.target.value,
                                  }))
                                }
                                className="w-full p-2 bg-gray-700 text-sm rounded"
                                rows={2}
                                placeholder="Write a reply..."
                              />
                              <button
                                onClick={() => handleAddReply(post.id, comment.id)}
                                className="text-sm bg-pink-600 hover:bg-pink-700 px-3 py-1 rounded"
                              >
                                Reply
                              </button>
                            </div>
                          )}

                          {comment.replies && comment.replies.length > 0 && (
                            <div className="ml-6 mt-2 space-y-1 border-l border-gray-600 pl-2">
                              {comment.replies.map((reply) => (
                                <div key={reply.id} className="text-sm">
                                  <span className="text-blue-300 font-semibold">@{reply.userName}</span>{" "}
                                  <span className="text-gray-200">{reply.text}</span>
                                  <span className="text-xs text-gray-500 ml-2">
                                    {reply.timestamp?.toDate()?.toLocaleString() || "Just now"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DistrictCharchaPanel;