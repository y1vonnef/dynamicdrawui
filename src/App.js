import logo from "./logo.svg";
import "./App.css";
import React, { useRef, useState, useEffect } from "react";
import OpenAI from "openai";
const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_KEY,
  dangerouslyAllowBrowser: true,
});

function App() {
  const [image, setImage] = useState(null);
  const canvasRef = useRef(null);
  const [result, setResult] = useState(null);
  const [UIlist, setUIlist] = useState(null);

  const touchStartPos = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const isPinching = useRef(false);
  const lastPinchDistance = useRef(0);

  const [emojiSetting, setEmojiSetting] = useState([]); // initial position and size

  useEffect(() => {
    const canvas = canvasRef.current;
    console.log(emojiSetting);
    if (canvas && image) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, image.width / 9, image.height / 9);
      drawEmojiOnCanvas(); // This will draw all emojis in the array
    }
  }, [image, emojiSetting, UIlist]);

  useEffect(() => {
    const canvas = canvasRef.current;
    console.log(emojiSetting);
    if (canvas) {
      const handleStart = (e) => handleTouchStart(e);
      const handleMove = (e) => handleTouchMove(e);
      const handleEnd = (e) => handleTouchEnd(e);

      canvas.addEventListener("touchstart", handleStart, { passive: false });
      canvas.addEventListener("touchmove", handleMove, { passive: false });
      canvas.addEventListener("touchend", handleEnd, { passive: false });

      return () => {
        canvas.removeEventListener("touchstart", handleStart);
        canvas.removeEventListener("touchmove", handleMove);
        canvas.removeEventListener("touchend", handleEnd);
      };
    }
  }, [image]);

  const handleTouchStart = (e) => {
    e.preventDefault(); // Prevent default actions

    if (e.touches.length === 1) {
      isDragging.current = true;
      touchStartPos.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    } else if (e.touches.length > 1) {
      isPinching.current = true;
      lastPinchDistance.current = getPinchDistance(e.touches);
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault(); // Prevent default touch behavior like scrolling
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (isDragging.current && e.touches.length === 1) {
      // Implement dragging logic here
      const touchX = e.touches[0].clientX;
      const touchY = e.touches[0].clientY;
      const deltaX = touchX - touchStartPos.current.x;
      const deltaY = touchY - touchStartPos.current.y;

      setEmojiSetting((prevEmojiSetting) =>
        prevEmojiSetting.map((emoji) => ({
          ...emoji,
          x: emoji.x + deltaX,
          y: emoji.y + deltaY,
        }))
      );

      touchStartPos.current = { x: touchX, y: touchY };
    } else if (isPinching.current && e.touches.length > 1) {
      const currentPinchDistance = getPinchDistance(e.touches);
      const scaleFactor = currentPinchDistance / lastPinchDistance.current;
      // Implement resizing logic here using scaleFactor
      setEmojiSetting((prevEmojiSetting) =>
        prevEmojiSetting.map((emoji) => ({
          ...emoji,
          size: Math.max(10, emoji.size * scaleFactor),
        }))
      );
      lastPinchDistance.current = currentPinchDistance;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, image.width / 9, image.height / 9);
    drawEmojiOnCanvas(emojiSetting);
  };

  const handleTouchEnd = (e) => {
    e.preventDefault(); // Prevent default actions

    isDragging.current = false;
    isPinching.current = false;
  };

  const getPinchDistance = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      processImage(file);
    }
  };

  const processImage = (file) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        canvas.width = img.width / 9;
        canvas.height = img.height / 9;
        ctx.drawImage(img, 0, 0, img.width / 9, img.height / 9);
        // Apply further manipulations here
        setImage(img);
        console.log(img.src);
        handleImageParse(img.src);
      };
    };
  };

  async function handleImageParse(img) {
    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Return a few emoji of an items that can be added to the scene depicted in the photo, separated by comma. For example, if you see a face, you return '🕶️,👒'. when you see a desk, you can return'🍸,🖊️,🪴'",
            },
            {
              type: "image_url",
              image_url: {
                url: img,
              },
            },
          ],
        },
      ],
    });
    console.log(response.choices[0].message.content);
    createUI(response.choices[0].message.content);
    setResult(response.choices[0].message.content);
  }

  const createUI = (inputString) => {
    const parts = inputString.split(",");

    // if (parts[0].trim() === "face") {
    //   setUIlist(["🕶️"]);
    //   return "The first word is 'face'";
    // } else {
    const emojis = parts
      .filter((part) => part.trim() && part.trim() !== "face")
      .map((part) => part.trim());
    setUIlist(emojis);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    //}
  };

  function drawEmojiOnCanvas() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    emojiSetting.forEach((emoji) => {
      ctx.font = `${emoji.size}px Arial`;
      ctx.fillText(emoji.icon, emoji.x, emoji.y);
    });
  }

  return (
    <div className="App">
      <header>
        <h1>Take a Picture :&#41;</h1>
      </header>
      <input
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleImageChange}
      />
      <canvas ref={canvasRef}></canvas>
      <div className="button-container">
        {UIlist &&
          UIlist.map((el) => {
            return (
              <button
                onClick={() => {
                  setEmojiSetting((prevSettings) => [
                    ...prevSettings,
                    { icon: el, x: 50, y: 50, size: 40 },
                  ]);
                }}
              >
                {el}
              </button>
            );
          })}
      </div>
    </div>
  );
}

export default App;
