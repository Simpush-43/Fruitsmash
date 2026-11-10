import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  Cog6ToothIcon,
  MusicalNoteIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import { useNavigate } from "react-router-dom";
import UseAuthStore from "../AuthStore/UseAuthStore";
import LogoApp from "../assets/ChatGPT Image Jul 16, 2025, 04_04_45 PM.png";
import ProfileImage from "../assets/reshot-icon-profile-image-SBDVTH9PEA (1).png";

const fruitPalette = ["#ff6b35", "#ff416c", "#b8e63c", "#ffbf3c", "#bd7bff", "#35c9e8"];
const melody = [261.63, 329.63, 392, 329.63, 293.66, 349.23, 392, 440];

const createFruit = (width, height) => {
  const radius = 27 + Math.random() * 12;
  return {
    x: radius + Math.random() * Math.max(width - radius * 2, 1),
    y: height + radius,
    radius,
    vx: (Math.random() - 0.5) * 3.8,
    vy: -(10 + Math.random() * 2.8),
    color: fruitPalette[Math.floor(Math.random() * fruitPalette.length)],
    rotation: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.08,
  };
};

const distanceToSegment = (point, start, end) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  const amount = lengthSquared === 0
    ? 0
    : Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  const nearestX = start.x + amount * dx;
  const nearestY = start.y + amount * dy;
  return Math.hypot(point.x - nearestX, point.y - nearestY);
};

const Landingpage = () => {
  const navigate = useNavigate();
  const { user, fetchUser, verifyReferralCode } = UseAuthStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(5);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const fruitsRef = useRef([]);
  const particlesRef = useRef([]);
  const trailRef = useRef([]);
  const lastSpawnRef = useRef(0);
  const lastFrameRef = useRef(0);
  const pointerRef = useRef({ x: 0, y: 0, active: false });
  const livesRef = useRef(5);
  const gameOverRef = useRef(false);
  const gameStartedRef = useRef(false);
  const audioContextRef = useRef(null);
  const musicTimeoutRef = useRef(null);
  const musicEnabledRef = useRef(false);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (!settingsOpen && !referralOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (referralOpen) {
          setReferralOpen(false);
          setSettingsOpen(true);
          setReferralCode("");
          setFeedback("");
        } else {
          setSettingsOpen(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [settingsOpen, referralOpen]);

  const playTone = (frequency, duration, type = "triangle", volume = 0.018) => {
    const context = audioContextRef.current;
    if (!context || context.state !== "running") return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  };

  const startMusic = () => {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) {
      setFeedback("Audio playback is not supported in this browser.");
      return;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioCtor();
    }
    musicEnabledRef.current = true;
    setMusicEnabled(true);
    audioContextRef.current.resume().then(() => {
      if (musicTimeoutRef.current) return;
      let step = 0;
      const playNextNote = () => {
        if (!musicEnabledRef.current) {
          musicTimeoutRef.current = null;
          return;
        }
        const note = melody[step % melody.length];
        playTone(note, 0.3, "triangle", 0.014);
        playTone(note / 2, 0.28, "sine", 0.009);
        step += 1;
        musicTimeoutRef.current = window.setTimeout(playNextNote, 390);
      };
      playNextNote();
    }).catch((error) => {
      console.error("Could not start background music:", error);
      setFeedback("Could not start music. Check your browser audio settings.");
    });
  };

  const stopMusic = () => {
    musicEnabledRef.current = false;
    setMusicEnabled(false);
    if (musicTimeoutRef.current) {
      window.clearTimeout(musicTimeoutRef.current);
      musicTimeoutRef.current = null;
    }
    if (audioContextRef.current?.state === "running") {
      audioContextRef.current.suspend();
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext("2d");
    if (!context) return undefined;

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(bounds.width * pixelRatio);
      canvas.height = Math.round(bounds.height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };
    resizeCanvas();
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas);

    const drawFruit = (fruit) => {
      context.save();
      context.translate(fruit.x, fruit.y);
      context.rotate(fruit.rotation);
      context.shadowColor = `${fruit.color}88`;
      context.shadowBlur = 18;
      const fruitGradient = context.createRadialGradient(
        -fruit.radius * 0.35,
        -fruit.radius * 0.4,
        fruit.radius * 0.08,
        0,
        0,
        fruit.radius * 1.15
      );
      fruitGradient.addColorStop(0, "#ffffff");
      fruitGradient.addColorStop(0.18, fruit.color);
      fruitGradient.addColorStop(1, "#37243f");
      context.fillStyle = fruitGradient;
      context.beginPath();
      context.arc(0, 0, fruit.radius, 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 0;
      context.strokeStyle = "rgba(255,255,255,.55)";
      context.lineWidth = 2;
      context.stroke();
      context.fillStyle = "#764523";
      context.fillRect(-2, -fruit.radius - 6, 4, 10);
      context.fillStyle = "#8ee057";
      context.beginPath();
      context.ellipse(7, -fruit.radius - 3, 8, 4, -0.5, 0, Math.PI * 2);
      context.fill();
      context.restore();
    };

    const loop = (now) => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const delta = lastFrameRef.current
        ? Math.min((now - lastFrameRef.current) / 16.67, 2)
        : 1;
      lastFrameRef.current = now;
      const background = context.createLinearGradient(0, 0, width, height);
      background.addColorStop(0, "#10183f");
      background.addColorStop(0.55, "#202b66");
      background.addColorStop(1, "#352462");
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);

      context.strokeStyle = "rgba(255,255,255,.035)";
      context.lineWidth = 1;
      for (let x = 20; x < width; x += 44) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height);
        context.stroke();
      }

      if (gameStartedRef.current && !gameOverRef.current && now - lastSpawnRef.current > 1250) {
        fruitsRef.current.push(createFruit(width, height));
        lastSpawnRef.current = now;
      }

      fruitsRef.current = fruitsRef.current.filter((fruit) => {
        fruit.x += fruit.vx * delta;
        fruit.y += fruit.vy * delta;
        fruit.vy += 0.19 * delta;
        fruit.rotation += fruit.spin * delta;
        if (fruit.y - fruit.radius > height) {
          if (!gameOverRef.current) {
            livesRef.current = Math.max(0, livesRef.current - 1);
            setLives(livesRef.current);
            if (livesRef.current === 0) {
              gameOverRef.current = true;
              setGameOver(true);
            }
          }
          return false;
        }
        drawFruit(fruit);
        return true;
      });

      particlesRef.current = particlesRef.current.filter((particle) => {
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;
        particle.vy += 0.13 * delta;
        particle.life -= 0.025 * delta;
        if (particle.life <= 0) return false;
        context.globalAlpha = particle.life;
        context.fillStyle = particle.color;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fill();
        context.globalAlpha = 1;
        return true;
      });

      trailRef.current = trailRef.current.filter((point) => point.life > 0);
      trailRef.current.forEach((point, index, trail) => {
        point.life -= 0.12 * delta;
        if (index === 0) return;
        const previous = trail[index - 1];
        context.globalAlpha = Math.min(point.life, previous.life);
        context.strokeStyle = "#b8fff3";
        context.lineWidth = 7 * Math.max(point.life, 0.2);
        context.lineCap = "round";
        context.shadowColor = "#74f7e3";
        context.shadowBlur = 16;
        context.beginPath();
        context.moveTo(previous.x, previous.y);
        context.lineTo(point.x, point.y);
        context.stroke();
        context.globalAlpha = 1;
        context.shadowBlur = 0;
      });

      animationRef.current = window.requestAnimationFrame(loop);
    };

    animationRef.current = window.requestAnimationFrame(loop);
    return () => {
      resizeObserver.disconnect();
      if (animationRef.current) window.cancelAnimationFrame(animationRef.current);
    };
  }, []);

  useEffect(() => () => {
    musicEnabledRef.current = false;
    if (musicTimeoutRef.current) window.clearTimeout(musicTimeoutRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
    }
  }, []);

  const resetGame = () => {
    fruitsRef.current = [];
    particlesRef.current = [];
    trailRef.current = [];
    lastSpawnRef.current = performance.now();
    lastFrameRef.current = 0;
    livesRef.current = 5;
    gameOverRef.current = false;
    gameStartedRef.current = true;
    setScore(0);
    setLives(5);
    setGameOver(false);
    setGameStarted(true);
  };

  const handlePlayMusic = () => {
    setFeedback("");
    startMusic();
    setSettingsOpen(false);
    setReferralOpen(true);
  };

  const handleCloseReferral = () => {
    setReferralOpen(false);
    setSettingsOpen(true);
    setFeedback("");
    setReferralCode("");
  };

  const handleReferralSubmit = async (event) => {
    event.preventDefault();
    if (isVerifying) return;
    setIsVerifying(true);
    const result = await verifyReferralCode(referralCode);
    setIsVerifying(false);

    if (result?.success) {
      stopMusic();
      setFeedback("");
      setReferralCode("");
      setReferralOpen(false);
      navigate("/home/send");
      return;
    }

    setFeedback("Better luck next time!");
    if (!musicEnabledRef.current) startMusic();
    setReferralCode("");
  };

  const handlePointerDown = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(event.pointerId);
    const bounds = canvas.getBoundingClientRect();
    const point = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    pointerRef.current = { ...point, active: true };
    trailRef.current.push({ ...point, life: 1 });
  };

  const handlePointerMove = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    const nextPoint = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    const previousPoint = { x: pointerRef.current.x, y: pointerRef.current.y };
    if (pointerRef.current.active) {
      trailRef.current.push({ ...nextPoint, life: 1 });
      fruitsRef.current = fruitsRef.current.filter((fruit) => {
        if (distanceToSegment(fruit, previousPoint, nextPoint) > fruit.radius + 10) return true;
        for (let index = 0; index < 12; index += 1) {
          const angle = (Math.PI * 2 * index) / 12;
          const speed = 1 + Math.random() * 3;
          particlesRef.current.push({
            x: fruit.x,
            y: fruit.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: 2 + Math.random() * 3,
            life: 1,
            color: fruit.color,
          });
        }
        setScore((current) => current + 10);
        playTone(520, 0.08, "sawtooth", 0.025);
        return false;
      });
    }
    pointerRef.current.x = nextPoint.x;
    pointerRef.current.y = nextPoint.y;
  };

  return (
    <div className="fruit-page">
      <header className="fruit-topbar">
        <button className="fruit-brand" onClick={() => navigate("/")} aria-label="PhotoSafe home">
          <img src={LogoApp} alt="" />
          <span>PhotoSafe</span>
        </button>
        <div className="fruit-top-actions">
          <div className="fruit-score-chip" aria-label={`Score ${score}`}>
            <MusicalNoteIcon className="fruit-chip-icon" />
            <span>{score}</span>
          </div>
          <button className="fruit-settings-button" onClick={() => setSettingsOpen(true)}>
            <Cog6ToothIcon className="fruit-action-icon" />
            <span>Settings</span>
          </button>
          {user ? (
            <button className="fruit-profile-button" onClick={() => navigate("/home/profile")} aria-label="Open profile">
              <img src={user.Profilepic || ProfileImage} alt="" />
            </button>
          ) : (
            <button className="fruit-login-button" onClick={() => navigate("/home/createacoount")}>Log in</button>
          )}
        </div>
      </header>

      <main className="fruit-main">
        <section className="fruit-intro">
          <div>
            <p className="fruit-eyebrow">THE PHOTO SAFE ARCADE</p>
            <h1>Slice fruit. <span>Have a little fun.</span></h1>
            <p className="fruit-subtitle">Swipe through the fruit before it falls. How high can you score?</p>
          </div>
          <div className="fruit-lives" aria-label={`${lives} lives remaining`}>
            <span className="lives-label">LIVES</span>
            {[0, 1, 2, 3, 4].map((life) => (
              <span key={life} className={`life-dot ${life < lives ? "is-active" : ""}`} />
            ))}
          </div>
        </section>

        <section className="arcade-card" aria-label="Fruit slicing game">
          <div className="arcade-toolbar">
            <div className="arcade-title-wrap">
              <span className="arcade-status-dot" />
              <div>
                <p className="arcade-title">Slice Arena</p>
                <p className="arcade-caption">Best served with quick reflexes</p>
              </div>
            </div>
            <div className="arcade-score">
              <span>SCORE</span>
              <strong>{String(score).padStart(3, "0")}</strong>
            </div>
          </div>

          <div className="game-canvas-wrap">
            <canvas
              ref={canvasRef}
              className="game-canvas"
              aria-label="Swipe across the fruit to slice it"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={() => { pointerRef.current.active = false; }}
              onPointerCancel={() => { pointerRef.current.active = false; }}
              onPointerLeave={() => { pointerRef.current.active = false; }}
            />
            <div className="gesture-hint">↗ &nbsp; Swipe across the fruit to slice</div>
            {!gameStarted && (
              <div className="game-over-layer">
                <div className="game-over-card">
                  <p className="fruit-eyebrow">READY WHEN YOU ARE</p>
                  <h2>Swipe to slice</h2>
                  <p>Hold your mouse or finger and sweep through each fruit.</p>
                  <button className="fruit-primary-button" onClick={resetGame}>
                    Start slicing
                  </button>
                </div>
              </div>
            )}
            {gameOver && gameStarted && (
              <div className="game-over-layer">
                <div className="game-over-card">
                  <p className="fruit-eyebrow">ROUND COMPLETE</p>
                  <h2>Nice slicing!</h2>
                  <p>You scored <strong>{score}</strong> points.</p>
                  <button className="fruit-primary-button" onClick={resetGame}>
                    <ArrowPathIcon className="fruit-action-icon" />
                    Play again
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="arcade-footer">
            <span>Touch or mouse · Hold and swipe</span>
            <button className="fruit-reset-button" onClick={resetGame}>
              <ArrowPathIcon className="fruit-action-icon" />
              Restart
            </button>
          </div>
        </section>

        <section className="fruit-benefits" aria-label="PhotoSafe features">
          {[
            "Know who viewed your image",
            "See when it was viewed",
            "Share images with more control",
          ].map((text) => (
            <div className="fruit-benefit" key={text}>
              <CheckCircleIcon className="benefit-check" />
              <span>{text}</span>
            </div>
          ))}
        </section>
      </main>

      <AnimatePresence>
        {settingsOpen && (
          <Motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSettingsOpen(false)}
          >
            <Motion.div
              className="modal-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="settings-title"
              initial={{ y: 24, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 16, opacity: 0, scale: 0.98 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="modal-heading">
                <div>
                  <p className="fruit-eyebrow">YOUR GAME</p>
                  <h2 id="settings-title">Settings</h2>
                </div>
                <button className="modal-close-button" onClick={() => setSettingsOpen(false)} aria-label="Close settings">
                  <XMarkIcon className="fruit-action-icon" />
                </button>
              </div>
              <div className="sound-status">
                {musicEnabled ? <SpeakerWaveIcon className="fruit-action-icon" /> : <SpeakerXMarkIcon className="fruit-action-icon" />}
                <span>Game music is {musicEnabled ? "on" : "off"}</span>
                <button className="sound-toggle" onClick={musicEnabled ? stopMusic : startMusic}>
                  {musicEnabled ? "Turn off" : "Turn on"}
                </button>
              </div>
              <p className="settings-description">Ready for a tune? Start the music and enter your referral code.</p>
              <button className="fruit-primary-button full-width" onClick={handlePlayMusic}>
                <MusicalNoteIcon className="fruit-action-icon" />
                Play Music &amp; enter code
              </button>
              {feedback && !referralOpen && <p className="modal-note">{feedback}</p>}
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {referralOpen && (
          <Motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseReferral}
          >
            <Motion.div
              className="modal-card"
              role="dialog"
              aria-modal="true"
              aria-labelledby="referral-title"
              initial={{ y: 24, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 16, opacity: 0, scale: 0.98 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="modal-heading">
                <div>
                  <p className="fruit-eyebrow">MUSIC &amp; MORE</p>
                  <h2 id="referral-title">Play Music</h2>
                </div>
                <button className="modal-close-button" onClick={handleCloseReferral} aria-label="Close referral code">
                  <XMarkIcon className="fruit-action-icon" />
                </button>
              </div>
              <form className="referral-form" onSubmit={handleReferralSubmit}>
                <label htmlFor="referral-code">Enter referral code</label>
                <input
                  id="referral-code"
                  type="text"
                  value={referralCode}
                  autoComplete="off"
                  onChange={(event) => setReferralCode(event.target.value)}
                  className="referral-input"
                  placeholder="Your code"
                  autoFocus
                  disabled={isVerifying}
                />
                <button type="submit" className="fruit-primary-button full-width" disabled={isVerifying}>
                  {isVerifying ? "Checking..." : "Continue"}
                </button>
                <p className={`feedback-text ${feedback ? "has-feedback" : ""}`} role="status">{feedback}</p>
              </form>
              <p className="modal-footnote">Close this window to return to Settings.</p>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Landingpage;
