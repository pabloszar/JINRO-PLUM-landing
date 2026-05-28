import React, { useState, useEffect } from 'react';

function App() {
  const [clicked, setClicked] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [vh, setVh] = useState(768); // Initial fallback
  const [showVideo, setShowVideo] = useState(false);
  const [btnIgnited, setBtnIgnited] = useState(false);

  // States for Cinematic Load Bloom & Video Play Spark
  const [introActive, setIntroActive] = useState(true);
  const [introFade, setIntroFade] = useState(false);
  const [videoBloomActive, setVideoBloomActive] = useState(false);
  const [videoBloomSlow, setVideoBloomSlow] = useState(false);

  useEffect(() => {
    // Set initial vh once component mounts in browser
    setVh(window.innerHeight);

    // Initial page load bloom fades out slowly after a small 200ms mount delay
    const fadeTimer = setTimeout(() => {
      setIntroFade(true);
    }, 200);

    // Remove intro overlay completely from DOM after fade out completes (1.6s transition)
    const removeTimer = setTimeout(() => {
      setIntroActive(false);
    }, 1800);

    const handleResize = () => {
      setVh(window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  const handleDiscoverClick = (e) => {
    e.preventDefault();
    setClicked(true);
    
    // Find the snap scroll container to scroll it programmatically
    const container = document.querySelector('.snap-scroll-container');
    if (container) {
      container.scrollTo({
        top: vh,
        behavior: 'smooth'
      });
    }
    setTimeout(() => setClicked(false), 1200);
  };

  const handleScroll = (e) => {
    // Capturing current scrollTop of the scrolling container
    setScrollY(e.currentTarget.scrollTop);
  };

  const handleGetJinroClick = (e) => {
    e.preventDefault();
    setBtnIgnited(true);
    setShowVideo(true);
    
    // Reset click animation flag after completion
    setTimeout(() => {
      setBtnIgnited(false);
    }, 800);
  };

  const handlePlayClick = (e) => {
    e.preventDefault();
    setVideoBloomActive(true);
    setVideoBloomSlow(true);

    // Force fade out after 550ms of full white-pink neón bloom
    setTimeout(() => {
      setVideoBloomActive(false);
    }, 550);

    // Turn off slow transition rules after the fade completes (1.8s fade + 550ms delay = 2350ms)
    setTimeout(() => {
      setVideoBloomSlow(false);
    }, 2400);
  };

  // Mathematical Scroll-Driven Bloom & Parallax Calculations across 4 Sections
  const progressSection = scrollY / vh;
  const localProgress = progressSection % 1.0;
  
  // Sine curve peaks at exactly 0.5 (halfway between sections), returning to 0 at section snaps
  const bloomOpacity = scrollY >= 3 * vh ? 0 : Math.sin(localProgress * Math.PI);
  const blurAmount = bloomOpacity * 15; // Up to 15px of progressive camera lens blur!

  // Parallax offsets (moving texts sutilly faster than background to create depth)
  // Formula: parallaxY = (sectionIndex * vh - scrollY) * 0.25
  const parallaxY1 = -scrollY * 0.25;
  const parallaxY2 = (vh - scrollY) * 0.25;
  const parallaxY3 = (2 * vh - scrollY) * 0.25;
  const parallaxY4 = (3 * vh - scrollY) * 0.25;

  return (
    <div className="snap-scroll-container" onScroll={handleScroll}>
      
      {/* Full-Screen Page Load Cinematic Intro Bloom Overlay */}
      {introActive && (
        <div className={`intro-bloom-overlay ${introFade ? 'fade-out' : ''}`}></div>
      )}
      
      {/* Full-Screen Camera Bloom & Color Burn Overlay */}
      <div 
        className={`scroll-bloom-overlay ${videoBloomSlow ? 'slow-transition' : ''}`} 
        style={{ 
          opacity: videoBloomActive ? 1.0 : bloomOpacity,
          backdropFilter: `blur(${videoBloomActive ? 20 : blurAmount}px)`,
          WebkitBackdropFilter: `blur(${videoBloomActive ? 20 : blurAmount}px)`
        }}
      ></div>

      {/* Global Fixed Header */}
      <header className="header">
        <a href="#" className="logo" aria-label="JINRO Home">
          <svg className="logo-svg" viewBox="0 -0.09999999999999964 118.9 39.1" fill="none">
            <g fill="currentColor">
              <path d="M27.3 29.6V.7h-9.9v.1c2.2 1.3 1.8 3.8 1.8 6.1v22.6h8.1zM50.2.9c1.9 1.8 1.9 3.7 1.9 6.2v11.3L38.7.9V.7h-9.1v.1C32 3.5 32.2 4.7 32.2 8v21.5h4.5v-18h.1l9.4 12.6c1.5 1.9 4.3 6.3 10.4 6.2V.7h-6.5v.2zM70.6 14.7l5.8 11.6c1.3 2.5 3 3.3 5.9 3.2h6.5c-1.7-1.2-3.3-3.6-4.5-5.5l-5.2-8.7c2.4-.7 5.2-2.1 5-7.6-.3-5.8-5.1-7-8.9-7H59.8v.1c2.1 1.3 1.8 3.8 1.8 6.1v22.5h7.9V5h3.1c2.7 0 4.3 1.4 4.3 4.3s-2 5.5-6.3 5.4M102.5 0c-8.9.1-16 6.9-15.9 15.2S94 30.1 102.9 30s16-6.9 15.9-15.2c-.1-8.2-7.4-14.9-16.3-14.8m.3 25.7c-4.3 0-7.8-4.7-7.8-10.6-.1-5.9 3.3-10.7 7.6-10.8s7.8 4.7 7.8 10.6c0 6-3.3 10.8-7.6 10.8M0 39c11.7-.9 14.2-6.3 14.2-13.2V.8H4.3v.1s1.8.8 1.8 4v21.5c0 7.2-1.6 9.8-6 11.8z" />
            </g>
          </svg>
        </a>
        <nav className="nav">
          <a href="#" className="nav-link">THE RITUAL</a>
          <a href="#ritual-section" className="nav-link">FLAVOR</a>
          <a href="#" className="nav-link">STORY</a>
          <a href="#" className="nav-link">COCKTAILS</a>
        </nav>
        <div className="header-right">
          <span className="category-tag">KOREAN PLUM SOJU</span>
          <div className="bottle-icon-wrapper" title="Soju bottle">
            <svg className="bottle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M10 2h4v3h-4V2z" strokeLinejoin="round" />
              <path d="M9 5h6l1 3v13a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V8l1-3z" strokeLinejoin="round" />
              <line x1="8" y1="12" x2="16" y2="12" />
              <line x1="8" y1="17" x2="16" y2="17" />
            </svg>
          </div>
        </div>
      </header>

      {/* Global Fixed Footer */}
      <footer className="footer">
        <div className="footer-left">
          {/* Decorative anchor or spacing */}
        </div>
        <div className="footer-right">
          <span className="taste-text">TASTE SEOUL NIGHTS</span>
          <div className="seoul-badge-wrapper">
            <img src="/Seoul Badge.png" className="seoul-badge" alt="Taste Seoul Nights" />
          </div>
        </div>
      </footer>

      {/* SECTION 1: HERO SECTION */}
      <section className="section-hero">
        <div className="bg-wrapper"></div>
        
        <div className="hero-container">
          {/* Left Column receiving vertical parallax translation */}
          <div className="hero-content-left" style={{ transform: `translateY(${parallaxY1}px)` }}>
            <h1 className="hero-title">
              <span className="title-line title-white">The</span>
              <span className="title-line title-pink">Plum</span>
              <span className="title-line title-white title-offset">Ritual</span>
            </h1>
            
            <p className="korean-subtext">자두의 부드러움. 이슬처럼 스며ld다.</p>
            
            <div className="desc-lines">
              <p className="desc-line">Born in Korea.</p>
              <p className="desc-line">Crafted with real plum.</p>
              <p className="desc-line">Smooth, fresh, unforgettable.</p>
            </div>
            
            <a 
              href="#discover" 
              className={`btn-discover ${clicked ? 'clicked' : ''}`} 
              onClick={handleDiscoverClick}
              id="btn-discover"
            >
              <div className="arrow-circle">
                <svg className="arrow-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="7" y1="17" x2="17" y2="7" />
                  <polyline points="7 7 17 7 17 17" />
                </svg>
              </div>
              <span className="btn-text">
                {clicked ? 'EXPLORING...' : 'DISCOVER THE RITUAL'}
              </span>
            </a>
          </div>

          {/* Right Column receiving sutil vertical parallax */}
          <div className="hero-content-right" style={{ transform: `translateY(${parallaxY1 * 0.5}px)` }}>
            <div className="info-badge">
              <div className="info-badge-circle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19" />
                  <path d="M12 4l3 3m-6 0l3-3M12 20l3-3m-6 0l3 3M4 12l3 3m0-6l-3 3M20 12l-3 3m0-6l3 3" />
                </svg>
              </div>
              <div className="info-badge-text">
                <span className="badge-label">ICE COLD</span>
                <span className="badge-sublabel">SMOOTH</span>
              </div>
            </div>

            <div className="info-badge">
              <div className="info-badge-circle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 6c3.5 0 6 2.5 6 6s-2.5 6-6 6-6-2.5-6-6 2.5-6 6-6z" />
                  <path d="M12 6c0-2 2-3 4-3" strokeLinecap="round" />
                  <path d="M11 6c-1.5 2-1 4.5-1 4.5" />
                </svg>
              </div>
              <div className="info-badge-text">
                <span className="badge-label">REAL</span>
                <span className="badge-sublabel">PLUM</span>
              </div>
            </div>

            <div className="info-badge">
              <div className="info-badge-circle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 3v0c-4.5 4.5-7 7.5-7 11a7 7 0 0 0 14 0c0-3.5-2.5-6.5-7-11z" />
                </svg>
              </div>
              <div className="info-badge-text">
                <span className="badge-label">CLEAN</span>
                <span className="badge-sublabel">FINISH</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: RITUAL DESCRIPTION (Editorial Minimalist, aligned all the way to the bottom) */}
      <section className="section-ritual" id="ritual-section">
        {/* Background vignette for outstanding text readability */}
        <div className="bg-wrapper-ritual"></div>
        
        <div className="ritual-container">
          {/* Top local header */}
          <div className="ritual-header">
            <span className="ritual-header-tag">THE PLUM RITUAL</span>
            <div className="ritual-header-line"></div>
          </div>

          {/* Text content container pushed down and receiving parallax translation */}
          <div className="ritual-content-wrapper ritual-content-bottom" style={{ transform: `translateY(${parallaxY2}px)` }}>
            <h2 className="ritual-title">
              Made<br />
              For Every<br />
              Ritual<span className="title-dot">.</span>
            </h2>
            
            <div className="ritual-desc-lines">
              <p className="ritual-desc-line">From good times to quiet nights.</p>
              <p className="ritual-desc-line">Jinro Plum turns every moment</p>
              <p className="ritual-desc-line">into something worth remembering.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: KEY FLAVOR FEATURES (Symmetric Split-Badge Layout framing the bottle) */}
      <section className="section-section3" id="section3-section">
        <div className="bg-wrapper-section3"></div>

        <div className="section3-container">
          
          {/* Left Column of Badges receiving vertical parallax */}
          {/* Swapped order: Text on the left, circle icon on the right! */}
          <div className="section3-left-col" style={{ transform: `translateY(${parallaxY3}px)` }}>
            
            {/* Feature 1: REAL PLUM */}
            <div className="ritual-badge ritual-badge-left-layout">
              <div className="ritual-badge-text">
                <h3 className="ritual-badge-title">REAL PLUM</h3>
                <p className="ritual-badge-desc">Juicy, natural, and irresistibly smooth.</p>
              </div>
              <div className="ritual-badge-circle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 6c3.5 0 6 2.5 6 6s-2.5 6-6 6-6-2.5-6-6 2.5-6 6-6z" />
                  <path d="M12 6c0-2 2-3 4-3" strokeLinecap="round" />
                  <path d="M11 6c-1.5 2-1 4.5-1 4.5" />
                </svg>
              </div>
            </div>

            {/* Feature 2: ICE COLD SMOOTH */}
            <div className="ritual-badge ritual-badge-left-layout">
              <div className="ritual-badge-text">
                <h3 className="ritual-badge-title">ICE COLD SMOOTH</h3>
                <p className="ritual-badge-desc">Best enjoyed straight from the fridge.</p>
              </div>
              <div className="ritual-badge-circle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19" />
                  <path d="M12 4l3 3m-6 0l3-3M12 20l3-3m-6 0l3 3M4 12l3 3m0-6l-3 3M20 12l-3 3m0-6l3 3" />
                </svg>
              </div>
            </div>

            {/* Feature 3: CLEAN FINISH */}
            <div className="ritual-badge ritual-badge-left-layout">
              <div className="ritual-badge-text">
                <h3 className="ritual-badge-title">CLEAN FINISH</h3>
                <p className="ritual-badge-desc">Crisp, light, and ultra refreshing.</p>
              </div>
              <div className="ritual-badge-circle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 3v0c-4.5 4.5-7 7.5-7 11a7 7 0 0 0 14 0c0-3.5-2.5-6.5-7-11z" />
                </svg>
              </div>
            </div>

          </div>

          {/* Middle Spacer to prevent badges from overlapping the center JINRO bottle */}
          <div className="section3-center-spacer"></div>

          {/* Right Column of Badges receiving vertical parallax */}
          {/* Keep original: circle icon on the left, text on the right! */}
          <div className="section3-right-col" style={{ transform: `translateY(${parallaxY3}px)` }}>
            
            {/* Feature 4: GOOD TIMES */}
            <div className="ritual-badge">
              <div className="ritual-badge-circle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M5 9c0-1.5 1-2.5 2-2.5h2c1 0 2 1 2 2.5v7.5c0 1-1 2-2 2H7c-1 0-2-1-2-2V9z" strokeLinejoin="round" />
                  <path d="M13 9c0-1.5 1-2.5 2-2.5h2c1 0 2 1 2 2.5v7.5c0 1-1 2-2 2h-2c-1 0-2-1-2-2V9z" strokeLinejoin="round" />
                  <path d="M9 13.5h0M15 13.5h0" strokeLinecap="round" strokeWidth="2" />
                  <path d="M12 4.5c0-1 1-1.5 1.5-1.5M10.5 3c-.5 0-1 .5-1 1M9.5 5.5l-.5-.5" strokeLinecap="round" />
                </svg>
              </div>
              <div className="ritual-badge-text">
                <h3 className="ritual-badge-title">GOOD TIMES</h3>
                <p className="ritual-badge-desc">Better with friends, perfect for any night.</p>
              </div>
            </div>

            {/* Feature 5: GOOD VIBES */}
            <div className="ritual-badge">
              <div className="ritual-badge-circle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 17V5l10 2v12" />
                  <circle cx="6" cy="17" r="3" />
                  <circle cx="16" cy="19" r="3" />
                  <path d="M9 9l10 2" />
                </svg>
              </div>
              <div className="ritual-badge-text">
                <h3 className="ritual-badge-title">GOOD VIBES</h3>
                <p className="ritual-badge-desc">From K-pop to late nights, it just fits.</p>
              </div>
            </div>

            {/* Feature 6: SEOUL SPIRIT */}
            <div className="ritual-badge">
              <div className="ritual-badge-circle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 21h18M5 21V9l4-3v15M9 21V11l4-2v10M13 21V5l4 3v13M17 21v-9h2v9" strokeLinejoin="round" />
                  <path d="M7 11v0M7 15v0M11 13v0M11 17v0M15 9v0M15 13v0" strokeLinecap="round" strokeWidth="2" />
                </svg>
              </div>
              <div className="ritual-badge-text">
                <h3 className="ritual-badge-title">SEOUL SPIRIT</h3>
                <p className="ritual-badge-desc">Inspired by the city that never sleeps.</p>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* SECTION 4: GET JINRO (Open The Ritual) */}
      <section className="section-section4" id="section4-section">
        {/* Background vignette for maximum legibility on left-aligned text */}
        <div className="bg-wrapper-section4"></div>

        <div className="section4-container">
          {/* Content block receiving dynamic vertical parallax */}
          <div className="section4-content" style={{ transform: `translateY(${parallaxY4}px)` }}>
            <span className="section4-header-tag">READY WHEN YOU ARE</span>
            
            <h2 className="section4-title">
              <span className="title-line title-white">OPEN</span>
              <span className="title-line title-pink">THE</span>
              <span className="title-line title-white">RITUAL</span>
            </h2>

            <div className="section4-desc">
              <p className="section4-desc-line">Cold. Sweet. Unforgettable.</p>
              <p className="section4-desc-line">Jinro Plum is always a good idea.</p>
            </div>

            {/* Glowing Rectangular Pill Button matching Discover style */}
            <a 
              href="#get-plum" 
              className={`btn-get-jinro ${btnIgnited ? 'ignited' : ''}`} 
              onClick={handleGetJinroClick}
              id="btn-get-jinro"
            >
              <span className="btn-get-text">GET JINRO PLUM</span>
              <div className="btn-get-arrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </div>
            </a>

          </div>

          {/* Cinematic Floating Glassmorphic HUD Video Preview */}
          <div className={`section4-video-wrapper ${showVideo ? 'video-active' : ''}`}>
            <div className="video-card-inner">
              {/* Cover background - Using Frame 2 pouring shot for ultra-premium preview feel */}
              <div className="video-cover-bg" style={{ backgroundImage: "url('/Image portada de video.png')" }}></div>
              <div className="video-overlay-glow"></div>
              
              {/* Glowing circular Play button */}
              <button className="video-play-btn" aria-label="Play video preview" onClick={handlePlayClick}>
                <div className="video-play-ring"></div>
                <svg className="video-play-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
              
              {/* Holographic scanner layout grid overlay */}
              <div className="video-hud-grid"></div>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}

export default App;
