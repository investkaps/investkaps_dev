import React, { useState, useEffect, useCallback, useRef } from 'react';
import './AuditReport2.css';

const auditPages = [
  { src: '/audit.png', label: "Auditor's Report" },
  { src: '/audit2.png', label: "Auditor's Opinion" }
];

const SWIPE_THRESHOLD = 50;

const AuditReport2 = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStart = useRef(null);

  const goTo = useCallback((index) => {
    const total = auditPages.length;
    setActiveIndex(((index % total) + total) % total);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'ArrowLeft') {
        setActiveIndex((prev) => (prev - 1 + auditPages.length) % auditPages.length);
      } else if (event.key === 'ArrowRight') {
        setActiveIndex((prev) => (prev + 1) % auditPages.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleTouchStart = (event) => {
    const touch = event.changedTouches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event) => {
    if (!touchStart.current) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;
    touchStart.current = null;

    // Ignore vertical gestures so the page can still be scrolled.
    if (Math.abs(deltaX) < SWIPE_THRESHOLD || Math.abs(deltaX) < Math.abs(deltaY)) return;

    goTo(activeIndex + (deltaX < 0 ? 1 : -1));
  };

  const activePage = auditPages[activeIndex];

  return (
    <div className="audit-report-page">
      <div className="audit-report-container">
        <div className="page-header">
          <h1 className="page-title">Audit Report FY24-25</h1>
          <p className="page-subtitle">{activePage.label}</p>
        </div>

        <section className="audit-carousel">
          <div
            className="audit-image-card"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <img
              key={activePage.src}
              src={activePage.src}
              alt={`InvestKaps audit report - ${activePage.label}`}
              className="audit-image"
            />
          </div>

          <div className="audit-carousel-controls">
            <div className="audit-nav-row">
              <button
                type="button"
                className="audit-nav"
                onClick={() => goTo(activeIndex - 1)}
                aria-label="Previous page"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>

              <div className="audit-dots">
                {auditPages.map((page, index) => (
                  <button
                    type="button"
                    key={page.src}
                    className={`audit-dot ${index === activeIndex ? 'active' : ''}`}
                    onClick={() => goTo(index)}
                    aria-label={`Go to ${page.label}`}
                    aria-current={index === activeIndex}
                  />
                ))}
              </div>

              <button
                type="button"
                className="audit-nav"
                onClick={() => goTo(activeIndex + 1)}
                aria-label="Next page"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>

            <span className="audit-counter">
              Page {activeIndex + 1} of {auditPages.length}
            </span>

            <a
              href={activePage.src}
              target="_blank"
              rel="noopener noreferrer"
              className="audit-fullsize-link"
            >
              Open full size
            </a>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AuditReport2;
