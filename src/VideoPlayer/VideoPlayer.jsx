import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { Context } from "../Context/ContextGoogle";
import { formatTime } from "../utils/formatTime";
import "./VideoPlayer.scss";
import axios from "axios"; //To fetch the urls of the API
import PropTypes from "prop-types";

function VideoPlayer({ autoplay = false, isFullScreen, handleFullScreen }) {
  // The numbers here are the states to see in React Developer Tools
  const { mediaList, currentMedia, setCurrentMedia } = useContext(Context); // 0
  const [isPlaying, setIsPlaying] = useState(autoplay); // 1
  const [currentVolume, setCurrentVolume] = useState(1); // 2
  const [isMute, setIsMute] = useState(true); // 3
  const [imageElapsed, setImageElapsed] = useState(0); // 4
  const containerRef = useRef(null); // 5
  const videoRef = useRef(null); // 6
  const videoRangeRef = useRef(null); // 7
  const volumeRangeRef = useRef(null); // 8
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0); // 9
  const imageTimerRef = useRef(null); // 10

  const [duration, setDuration] = useState([0, 0]); // 11
  const [currentTime, setCurrentTime] = useState([0, 0]); // 12
  const [durationSec, setDurationSec] = useState(0); // 13
  const [currentSec, setCurrentTimeSec] = useState(0); // 14

  const [isDropdownActive, setIsDropdownActive] = useState(false); // 15
  const [index, setIndex] = useState(0); // 16
  const [selectedMediaList, setSelectedMediaList] = useState([]); // 17
  const [listofMedia, setListofMedia] = useState({}); // 18
  const [loadedFeeds, setLoadedFeeds] = useState([]); // 19
  const [loadingFeeds, setLoadingFeeds] = useState({}); // 20

  const [isLoading, setIsLoading] = useState(true); // 21
  const [activeFeed, setActiveFeed] = useState("nasa"); // 22

  const imageDuration = 4;

  useEffect(() => {
    if (mediaList && mediaList.length > 0) {
      processMediaList();
    }
  }, [mediaList]);

  const processMediaList = async () => {
    setIsLoading(true);
    const templistofMedia = {};

    // Find the NASA feed
    const nasaFeed = mediaList.find(
      (media) => media.feed.trim().toLowerCase() === "nasa"
    );

    if (nasaFeed) {
      // Load NASA feed first
      await loadFeed(nasaFeed, templistofMedia);
      setLoadedFeeds(["nasa"]);

      // Set initial media
      setListofMedia(templistofMedia);
      setSelectedMediaList(templistofMedia[nasaFeed.title]);
      setCurrentMedia(templistofMedia[nasaFeed.title][0]);
    }

    setIsLoading(false);
  };

  const loadFeed = async (media, templistofMedia) => {
    setLoadingFeeds((prev) => ({ ...prev, [media.title]: true }));
    try {
      const mediaItems = await fetchMediaFromAPI(media);
      templistofMedia[media.title] = Array.isArray(mediaItems)
        ? mediaItems
        : [mediaItems];
      setLoadedFeeds((prev) => [...prev, media.feed.trim().toLowerCase()]);
      setListofMedia((prev) => ({
        ...prev,
        [media.title]: templistofMedia[media.title],
      }));
    } catch (error) {
      console.error(`Error processing media with title ${media.title}:`, error);
      templistofMedia[media.title] = [];
    }
    setLoadingFeeds((prev) => ({ ...prev, [media.title]: false }));
  };

  const fetchMediaFromAPI = async (media) => {
    try {
      setActiveFeed(media.feed.trim().toLowerCase());
      const response = await axios.get(media.url);
      const owner = "modelearth";
      const repo = "requests";
      const branch = "main";
      const repoFeed = mediaList.find((media) => media.feed.trim() === "repo");
      console.log("Repo data URL : " + repoFeed.url);
      const responseRepo = await axios.get(`${repoFeed.url}`);

      switch (media.feed.trim().toLowerCase()) {
        case "seeclickfix-311":
          return response.data.issues.map((item) => ({
            url: item.media.image_full || item.media.representative_image_url,
            text: item.description || "No description available",
            title: item.summary,
          }));
        case "film-scouting":
          return response.data.flatMap((item) => {
            const photos = [];
            for (let i = 1; i <= 10; i++) {
              const photoKey = `photo${i}`;
              if (item[photoKey]) {
                photos.push({
                  url: item[photoKey],
                  text: item.description || "No description available",
                  title: item[`photoText${i}`] || "No title available",
                });
              }
            }
            return photos;
          });
        case "repo":
          return responseRepo.data.tree
            .filter((file) => /\.(jpg|jpeg|gif)$/i.test(file.path))
            .map((file) => ({
              url: `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file.path}`,
              text: "No description available",
              title: file.path.split("/").pop(),
            }));
        default:
          return response.data.map((item) => ({
            url: item.hdurl || item.url,
            text: item.explanation || "No description available",
            title: item.title,
          }));
      }
    } catch (error) {
      console.error("Error fetching from API for", media.title, ":", error);
      return [];
    }
  };

  const isImageFile = (src) => {
    if (!src) return false;
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];
    return (
      src &&
      imageExtensions.some((extension) => src.toLowerCase().endsWith(extension))
    );
  };

  const isVideoFile = (src) => {
    if (!src) return false;
    const videoExtensions = [".mp4", ".webm", ".ogg"];
    return (
      src &&
      videoExtensions.some((extension) => src.toLowerCase().endsWith(extension))
    );
  };

  const handlePlayPause = () => {
    console.log("Play/Pause clicked. Current isPlaying:", isPlaying);
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  const play = async () => {
    console.log("Play function called");
    if (currentMedia) {
      if (isImageFile(currentMedia.url)) {
        playImage();
        setIsPlaying(true);
      } else if (isVideoFile(currentMedia.url) && videoRef.current) {
        try {
          videoRef.current.muted = isMute; // Ensure video is muted if isMute is true
          await videoRef.current.play();
          setIsPlaying(true);
          console.log("Video started playing:", currentMedia.url);
        } catch (error) {
          console.error("Can't play video", error);
          handleNext();
          return;
        }
      }
    }
  };

  const pause = () => {
    console.log("Pause function called");
    if (currentMedia) {
      if (isImageFile(currentMedia.url)) {
        pauseImage();
      } else if (isVideoFile(currentMedia.url) && videoRef.current) {
        videoRef.current.pause();
        console.log("Video paused:", currentMedia.url);
      }
    }
    setIsPlaying(false);
  };

  const stop = () => {
    if (currentMedia && isImageFile(currentMedia.url)) {
      clearTimeout(imageTimerRef.current);
      setImageElapsed(0);
    } else if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    setCurrentTimeSec(0);
    setCurrentTime([0, 0]);
    setIsPlaying(false);
  };

  const playImage = () => {
    clearTimeout(imageTimerRef.current);
    const timer = setTimeout(() => {
      handleNext();
    }, (imageDuration - imageElapsed) * 1000);
    imageTimerRef.current = timer;
  };

  const pauseImage = () => {
    clearTimeout(imageTimerRef.current);
  };

  const handleNext = useCallback(() => {
    setCurrentMediaIndex((prevIndex) => {
      const nextIndex = (prevIndex + 1) % mediaList.length;
      console.log("Moving to next media. New index: ", nextIndex);
      return nextIndex;
    });
  }, [mediaList.length]);

  const handlePrev = useCallback(() => {
    setCurrentMediaIndex((prevIndex) => {
      const nextIndex = (prevIndex - 1 + mediaList.length) % mediaList.length;
      console.log("Moving to previous media. New index: ", nextIndex);
      return nextIndex;
    });
  }, [mediaList.length]);

  const clickToMove = () => {};

  const handleVideoRange = () => {
    if (currentMedia && isVideoFile(currentMedia.url) && videoRef.current) {
      videoRef.current.currentTime = videoRangeRef.current.value;
      setCurrentTimeSec(videoRangeRef.current.value);
    }
  };

  const toggleFullScreen = () => {
    // Call the function passed from the parent
    handleFullScreen();
  };

  const handleVolumeRange = () => {
    if (volumeRangeRef.current) {
      let volume = volumeRangeRef.current.value;
      if (videoRef.current) {
        videoRef.current.volume = volume;
        videoRef.current.muted = volume === "0";
      }
      setCurrentVolume(volume);
      setIsMute(volume === "0");
    }
  };

  const handleMute = () => {
    setIsMute(!isMute);
    if (videoRef.current) {
      videoRef.current.muted = !isMute;
    }
  };

  useEffect(() => {
    let interval;
    if (
      isPlaying &&
      currentMedia &&
      isVideoFile(currentMedia.url) &&
      videoRef.current
    ) {
      interval = setInterval(() => {
        const { min, sec } = formatTime(videoRef.current.currentTime);
        setCurrentTimeSec(videoRef.current.currentTime);
        setCurrentTime([min, sec]);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentMedia]);

  useEffect(() => {
    const handleLoadedData = () => {
      if (videoRef.current) {
        setDurationSec(videoRef.current.duration);
        const { min, sec } = formatTime(videoRef.current.duration);
        setDuration([min, sec]);
        console.log("Video loaded: ", currentMedia.url);
      }
    };

    const handleEnded = () => {
      console.log("Media ended. Moving to next media.");
      setIsPlaying(false);
      handleNext();
    };

    if (currentMedia) {
      if (isVideoFile(currentMedia.url) && videoRef.current) {
        videoRef.current.addEventListener("loadeddata", handleLoadedData);
        videoRef.current.addEventListener("ended", handleEnded);
        videoRef.current.muted = isMute;
      }
    }

    return () => {
      clearTimeout(imageTimerRef.current);
      if (videoRef.current) {
        videoRef.current.removeEventListener("loadeddata", handleLoadedData);
        videoRef.current.removeEventListener("ended", handleEnded);
      }
    };
  }, [currentMedia, handleNext, isMute]);

  useEffect(() => {
    if (selectedMediaList.length > 0) {
      setCurrentMedia(selectedMediaList[currentMediaIndex]);
      console.log(
        "Current media set: ",
        selectedMediaList[currentMediaIndex],
        "Index: ",
        currentMediaIndex
      );
    }
  }, [currentMediaIndex, mediaList, setCurrentMedia]);

  useEffect(() => {
    if (selectedMediaList.length > 0 && !currentMedia) {
      setCurrentMediaIndex(0);
      setCurrentMedia(selectedMediaList[0]);
      console.log("Initial media set:", selectedMediaList[0], "Index: 0");
    }
  }, [selectedMediaList, currentMedia, setCurrentMedia]);

  useEffect(() => {
    console.log(
      "Current media changed: " + currentMedia + "Index: " + currentMediaIndex
    );
    setCurrentTimeSec(0);
    setCurrentTime([0, 0]);
    setImageElapsed(0);
    setIsPlaying(false);

    if (currentMedia && autoplay) {
      play();
    }
  }, [currentMedia, currentMediaIndex, autoplay, listofMedia, mediaList]);

  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(
        document.fullscreenElement ||
          document.webkitFullscreenElement ||
          document.mozFullScreenElement ||
          document.msFullscreenElement
      );
    };

    document.addEventListener("fullscreenchange", handleFullScreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullScreenChange);
    document.addEventListener("mozfullscreenchange", handleFullScreenChange);
    document.addEventListener("MSFullscreenChange", handleFullScreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullScreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullScreenChange
      );
      document.removeEventListener(
        "mozfullscreenchange",
        handleFullScreenChange
      );
      document.removeEventListener(
        "MSFullscreenChange",
        handleFullScreenChange
      );
    };
  }, []);

  return (
    <div
      className={`VideoPlayer ${isFullScreen ? "fullscreen" : ""}`}
      ref={containerRef}
    >
      <div className="VideoPlayer__video-container">
        {isLoading ? (
          <div className="VideoPlayer__loading">
            <div className="spinner"></div>
            <p>Loading media...</p>
          </div>
        ) : currentMedia && currentMedia.url ? (
          isImageFile(currentMedia.url) ? (
            <img
              className="video-image"
              src={currentMedia.url}
              alt={currentMedia.title || "Media"}
            />
          ) : isVideoFile(currentMedia.url) ? (
            <video
              ref={videoRef}
              src={currentMedia.url}
              poster="src/assets/videos/intro.jpg"
              muted={isMute}
            ></video>
          ) : (
            <div className="VideoPlayer__unsupported-media">
              <p>Unsupported media type</p>
            </div>
          )
        ) : (
          <div className="VideoPlayer__no-media">
            <p>No media available</p>
          </div>
        )}
        <div className="VideoPlayer__progress-bg">
          <div
            className="VideoPlayer__progress"
            style={{
              width:
                selectedMediaList.length > 0
                  ? `${
                      ((currentMediaIndex + 1) /
                        (selectedMediaList.length < 7
                          ? selectedMediaList.length
                          : 7)) *
                      100
                    }%`
                  : "0%",
            }}
          ></div>
          {selectedMediaList.slice(0, 7).map(
            (item, index) =>
              index > 0 && (
                <div
                  key={index}
                  className="VideoPlayer__progress-point"
                  style={{
                    left: `${
                      (index /
                        (selectedMediaList.length < 7
                          ? selectedMediaList.length
                          : 7)) *
                      100
                    }%`,
                  }}
                ></div>
              )
          )}
        </div>
        {!isLoading && currentMedia && (
          <div className="VideoPlayer__overlay">
            <div className="VideoPlayer__info">
              <h2>{currentMedia.title || "Untitled"}</h2>
              <p>{currentMedia.text || "No description available"}</p>
            </div>
          </div>
        )}
        <div className="VideoPlayer__dropdown">
          <div
            className="VideoPlayer__select"
            onClick={() => setIsDropdownActive(!isDropdownActive)}
          >
            <span>
              {mediaList && mediaList[index]
                ? mediaList[index].title
                : "Select Media"}
            </span>
            <div className="VideoPlayer__caret"></div>
          </div>
          <ul
            className={`VideoPlayer__menu ${isDropdownActive ? "active" : ""}`}
          >
            {mediaList &&
              mediaList.map((media, idx) => (
                <li
                  key={idx}
                  className={`${currentMediaIndex === idx ? "active" : ""} ${
                    loadedFeeds.includes(media.feed.trim().toLowerCase())
                      ? ""
                      : "loading"
                  }`}
                  onClick={() => {
                    if (loadedFeeds.includes(media.feed.trim().toLowerCase())) {
                      setIndex(idx);
                      setIsDropdownActive(false);
                      setCurrentMediaIndex(0);
                      setSelectedMediaList(listofMedia[media.title]);
                      setCurrentMedia(listofMedia[media.title][0]);
                    } else {
                      loadFeed(media, listofMedia);
                    }
                  }}
                >
                  {media.title || media.feed}
                  {loadingFeeds[media.title]
                    ? " (Loading...)"
                    : !loadedFeeds.includes(media.feed.trim().toLowerCase()) &&
                      " (Click to load)"}
                </li>
              ))}
          </ul>
        </div>
      </div>
      <div className="VideoPlayer__controls">
        <div className="control-group control-group-btn">
          <button className="control-button prev" onClick={handlePrev}>
            <i className="ri-skip-back-fill icon"></i>
          </button>
          <button
            className="control-button play-pause"
            onClick={handlePlayPause}
          >
            <i className={`ri-${isPlaying ? "pause" : "play"}-fill icon`}></i>
          </button>
          <button className="control-button next" onClick={handleNext}>
            <i className="ri-skip-forward-fill icon"></i>
          </button>
          <button className="control-button stop" onClick={stop}>
            <i className="ri-stop-fill icon"></i>
          </button>
        </div>
        <div className="control-group control-group-slider">
          {currentMedia && isVideoFile(currentMedia.url) && (
            <>
              <input
                type="range"
                className="range-input"
                ref={videoRangeRef}
                onChange={handleVideoRange}
                max={durationSec}
                value={currentSec}
                min={0}
              />
              <span className="time">
                {currentTime[0]}:{currentTime[1]} / {duration[0]}:{duration[1]}
              </span>
            </>
          )}
        </div>
        <div className="control-group control-group-volume">
          <button className="control-button volume" onClick={handleMute}>
            <i className={`ri-volume-${isMute ? "mute" : "up"}-fill`}></i>
          </button>
          <input
            type="range"
            className="range-input"
            ref={volumeRangeRef}
            max={1}
            min={0}
            value={currentVolume}
            onChange={handleVolumeRange}
            step={0.1}
          />
          <button
            className="control-button full-screen"
            onClick={toggleFullScreen}
          >
            <i
              className={`ri-${
                isFullScreen ? "fullscreen-exit" : "fullscreen"
              }-line`}
            ></i>
          </button>
        </div>
      </div>
    </div>
  );
}

VideoPlayer.propTypes = {
  autoplay: PropTypes.bool,
  isFullScreen: PropTypes.bool.isRequired,
  handleFullScreen: PropTypes.func.isRequired,
};

export default VideoPlayer;
