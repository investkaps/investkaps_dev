import React, { useState, useEffect, useMemo } from 'react';
import { questionnaireAPI } from '../../services/api';
import './RiskQuestionnaire.css';

/* ─────────────────────────────────────────────────────────────────
   Colour palette — applied left-to-right as profiles are sorted by
   minPoints ascending (from safest to most aggressive).
   No name-matching; purely positional.
───────────────────────────────────────────────────────────────────*/
const PALETTE = ['#22c55e', '#84cc16', '#f59e0b', '#f97316', '#ef4444', '#dc2626'];

function getProfileColor(sortedIndex, totalProfiles) {
  const idx = Math.round((sortedIndex / Math.max(totalProfiles - 1, 1)) * (PALETTE.length - 1));
  return PALETTE[Math.min(idx, PALETTE.length - 1)];
}

/**
 * Given the user's totalScore and all thresholds (sorted by minPoints),
 * return gauge pct (0-100) based on actual score range.
 */
function scoreToPct(score, sortedThresholds) {
  if (!sortedThresholds.length) return 50;
  const globalMin = sortedThresholds[0].minPoints;
  const globalMax = sortedThresholds[sortedThresholds.length - 1].maxPoints;
  const range = globalMax - globalMin;
  if (range <= 0) return 50;
  return Math.min(100, Math.max(0, Math.round(((score - globalMin) / range) * 100)));
}

/* ─────────────────────────────────────────────────────────────────
   GaugeMeter  –  SVG semi-circle
   pct: 0-100  (0 = far left, 100 = far right)
   color: pointer & active-segment colour
───────────────────────────────────────────────────────────────────*/
const GaugeMeter = ({ pct, color, thresholds }) => {
  const R   = 80;
  const cx  = 100;
  const cy  = 100;

  // Pointer
  const angleDeg = -180 + (pct / 100) * 180;
  const angleRad = (angleDeg * Math.PI) / 180;
  const px = cx + R * Math.cos(angleRad);
  const py = cy + R * Math.sin(angleRad);

  // Build coloured arc segments for each profile zone
  const globalMin  = thresholds[0]?.minPoints ?? 0;
  const globalMax  = thresholds[thresholds.length - 1]?.maxPoints ?? 100;
  const totalRange = Math.max(globalMax - globalMin, 1);
  const arcLen     = Math.PI * R; // half-circle circumference

  // We draw each segment as a dash-offset slice of the arc
  const segments = thresholds.map((t, i) => {
    const segStart = ((t.minPoints - globalMin) / totalRange);
    const segEnd   = ((t.maxPoints - globalMin) / totalRange);
    const segLen   = (segEnd - segStart) * arcLen;
    const offset   = segStart * arcLen;
    return { color: getProfileColor(i, thresholds.length), segLen, offset };
  });

  return (
    <svg viewBox="0 0 200 110" className="rq-gauge-svg" aria-hidden="true">
      {/* Grey background track */}
      <path
        d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth="16"
        strokeLinecap="butt"
      />

      {/* Coloured zone segments */}
      {segments.map((seg, i) => (
        <path
          key={i}
          d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
          fill="none"
          stroke={seg.color}
          strokeWidth="16"
          strokeLinecap="butt"
          strokeDasharray={`${seg.segLen} ${arcLen}`}
          strokeDashoffset={-seg.offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      ))}

      {/* White gap between segments */}
      {segments.slice(0, -1).map((seg, i) => (
        <path
          key={`gap-${i}`}
          d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
          fill="none"
          stroke="#fff"
          strokeWidth="16"
          strokeLinecap="butt"
          strokeDasharray={`1.5 ${arcLen - 1.5}`}
          strokeDashoffset={-(seg.offset + seg.segLen - 0.75)}
        />
      ))}

      {/* Pointer */}
      <line
        x1={cx} y1={cy}
        x2={px}  y2={py}
        stroke="#1e1b4b"
        strokeWidth="3.5"
        strokeLinecap="round"
        style={{ transition: 'x2 1.1s cubic-bezier(0.4,0,0.2,1), y2 1.1s cubic-bezier(0.4,0,0.2,1)' }}
      />
      <circle cx={cx} cy={cy} r="5.5" fill={color} stroke="#fff" strokeWidth="1.5" />

      {/* Min / Max labels */}
      <text x="18"  y="108" fontSize="9" fill="#64748b" fontWeight="600">
        {thresholds[0]?.minPoints ?? 0}
      </text>
      <text x="182" y="108" fontSize="9" fill="#64748b" fontWeight="600" textAnchor="end">
        {thresholds[thresholds.length - 1]?.maxPoints ?? 100}
      </text>
    </svg>
  );
};

/* ─────────────────────────────────────────────────────────────────
   ResultScreen
───────────────────────────────────────────────────────────────────*/
const ResultScreen = ({ riskProfile, totalScore, riskProfileThresholds, sectionResponses, onProceed }) => {
  const [animated, setAnimated] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);

  // Sort thresholds by minPoints so colours / positions are consistent
  const sorted = useMemo(() =>
    [...(riskProfileThresholds || [])].sort((a, b) => a.minPoints - b.minPoints),
    [riskProfileThresholds]
  );

  const profileIndex = sorted.findIndex(
    t => t.profileName?.toLowerCase().trim() === riskProfile?.toLowerCase().trim()
  );
  const color   = profileIndex >= 0 ? getProfileColor(profileIndex, sorted.length) : '#6366f1';
  const gaugePct = scoreToPct(totalScore, sorted);

  // Matching threshold record for the description
  const matched = sorted[profileIndex] || null;

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="rq-result-shell">
      <div className="rq-result-header">
        <span className="rq-result-emoji">🎯</span>
        <div>
          <h2>Your Risk Profile</h2>
          <p>Based on your questionnaire responses</p>
        </div>
      </div>

      {/* Gauge */}
      {sorted.length > 0 && (
        <div className="rq-gauge-wrap">
          <GaugeMeter
            pct={animated ? gaugePct : 0}
            color={color}
            thresholds={sorted}
          />
          <div className="rq-gauge-label" style={{ color }}>
            {riskProfile}
          </div>
        </div>
      )}

      {/* Profile card */}
      <div className="rq-profile-card" style={{ borderColor: color }}>
        <div className="rq-profile-name" style={{ color }}>{riskProfile}</div>
        {matched?.description && (
          <p className="rq-profile-desc">{matched.description}</p>
        )}
      </div>

      {/* Legend */}
      {sorted.length > 0 && (
        <div className="rq-profile-legend">
          <span className="rq-legend-title">All risk profiles</span>
          <div className="rq-legend-list">
            {sorted.map((t, i) => {
              const c       = getProfileColor(i, sorted.length);
              const isActive = i === profileIndex;
              return (
                <div key={t._id || t.profileName} className={`rq-legend-item ${isActive ? 'rq-legend-active' : ''}`}>
                  <span className="rq-legend-dot" style={{ background: c }} />
                  <span className="rq-legend-name">{t.profileName}</span>
                  {isActive && <span className="rq-legend-you">← You</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Email notice */}
      <div className="rq-email-notice">
        <span className="rq-email-icon">📧</span>
        <p>A copy of your responses and risk profile has been sent to your registered email address.</p>
      </div>

      {/* Toggle Answers */}
      {sectionResponses && sectionResponses.length > 0 && (
        <div className="rq-answers-toggle">
          <button 
            type="button" 
            className="rq-btn rq-btn-ghost" 
            onClick={() => setShowAnswers(!showAnswers)}
            style={{ width: '100%', marginBottom: '20px' }}
          >
            {showAnswers ? 'Hide My Responses ↑' : 'View My Responses ↓'}
          </button>

          {showAnswers && (
            <div className="rq-review-list" style={{ textAlign: 'left', marginBottom: '24px' }}>
              {sectionResponses.map((section, sIdx) => (
                <div key={sIdx} className="rq-review-section">
                  <h4 style={{ fontSize: '13px', color: '#64748b', textTransform: 'uppercase', marginBottom: '12px' }}>{section.sectionName}</h4>
                  {section.answers.map((ans, aIdx) => (
                    <div key={aIdx} className="rq-review-item" style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', marginBottom: '8px' }}>
                      <div className="rq-review-q" style={{ marginBottom: '4px' }}>
                        <span style={{ fontWeight: 500, color: '#0f172a' }}>{ans.questionText}</span>
                      </div>
                      <div className="rq-review-a">
                        <span style={{ color: '#6366f1', fontWeight: 500 }}>{ans.selectedOptionText}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Proceed button */}
      <button className="rq-btn rq-btn-proceed" onClick={onProceed}>
        Proceed to IA Agreement →
      </button>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────────────────────────*/
const RiskQuestionnaire = ({ onComplete, onSkip }) => {
  const [questionnaire, setQuestionnaire]               = useState(null);
  const [loading, setLoading]                           = useState(true);
  const [error, setError]                               = useState(null);
  const [submitting, setSubmitting]                     = useState(false);
  const [responses, setResponses]                       = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showReview, setShowReview]                     = useState(false);
  const [result, setResult]                             = useState(null);
  const [slideDirection, setSlideDirection]             = useState('forward');
  const [animating, setAnimating]                       = useState(false);

  useEffect(() => { fetchQuestionnaire(); }, []);

  const fetchQuestionnaire = async () => {
    try {
      setLoading(true);
      const response = await questionnaireAPI.getActiveQuestionnaire();
      const data = response.data;
      setQuestionnaire(data);

      const init = {};
      (data?.sections || []).forEach(section => {
        (section?.questions || []).forEach(q => { init[q._id] = null; });
      });
      setResponses(init);
      setError(null);

      // Check if user already submitted
      try {
        const myRes = await questionnaireAPI.getMyResponse();
        if (myRes.success && myRes.data) {
          setResult({
            riskProfile: myRes.data.riskProfile,
            totalScore: myRes.data.totalScore,
            riskProfileThresholds: data.riskProfileThresholds
          });
        }
      } catch (err) {
        // No response found, continue as normal
      }

    } catch (err) {
      console.error('Error fetching questionnaire:', err);
      setError('Failed to load questionnaire. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Flatten all questions across all sections, sorted by section.order then question.order
  const allQuestions = useMemo(() => {
    if (!questionnaire?.sections) return [];
    return [...questionnaire.sections]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .flatMap(section =>
        [...(section.questions || [])]
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map(q => ({ ...q, sectionName: section.sectionName, sectionId: section._id }))
      );
  }, [questionnaire]);

  const totalQuestions  = allQuestions.length;
  const currentQuestion = allQuestions[currentQuestionIndex];
  const currentResponse = currentQuestion ? responses[currentQuestion._id] : null;
  const isLastQuestion  = currentQuestionIndex === totalQuestions - 1;
  const progressPct     = totalQuestions
    ? showReview ? 100 : Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100)
    : 0;

  /* ── Animation ─────────────────────────────────────────────── */
  const animateTransition = (direction, callback) => {
    if (animating) return;
    setSlideDirection(direction);
    setAnimating(true);
    setTimeout(() => { callback(); setAnimating(false); }, 280);
  };

  /* ── Option select ─────────────────────────────────────────── */
  const handleOptionSelect = (questionId, optionId, optionText, points) => {
    setResponses(prev => ({ ...prev, [questionId]: { optionId, optionText, points } }));
    if (currentQuestionIndex < totalQuestions - 1) {
      setTimeout(() => {
        animateTransition('forward', () =>
          setCurrentQuestionIndex(prev => Math.min(prev + 1, totalQuestions - 1))
        );
      }, 350);
    }
  };

  /* ── Navigation ────────────────────────────────────────────── */
  const handleNext = () => {
    if (isLastQuestion) { setShowReview(true); }
    else {
      animateTransition('forward', () =>
        setCurrentQuestionIndex(prev => Math.min(prev + 1, totalQuestions - 1))
      );
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      animateTransition('backward', () =>
        setCurrentQuestionIndex(prev => Math.max(prev - 1, 0))
      );
    }
  };

  /* ── Submit ────────────────────────────────────────────────── */
  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const sectionResponses = (questionnaire.sections || []).map(section => ({
        sectionId:   section._id,
        sectionName: section.sectionName,
        answers: (section.questions || [])
          .filter(q => responses[q._id])
          .map(q => ({
            questionId:         q._id,
            questionText:       q.questionText,
            selectedOptionId:   responses[q._id].optionId,
            selectedOptionText: responses[q._id].optionText,
            points:             responses[q._id].points,
          }))
      }));

      const res = await questionnaireAPI.submitResponse({
        questionnaireId: questionnaire._id,
        sectionResponses,
      });

      if (res.success) {
        // Just store result — onComplete is called only when user clicks "Proceed" in ResultScreen
        setResult({ riskProfile: res.data.riskProfile, totalScore: res.data.totalScore, sectionResponses });
      }
    } catch (err) {
      console.error('Error submitting questionnaire:', err);
      setError('Failed to submit questionnaire. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Guard screens ─────────────────────────────────────────── */
  if (loading) return (
    <div className="rq-shell"><div className="rq-loading"><div className="rq-spinner" /><p>Loading questionnaire…</p></div></div>
  );

  if (submitting) return (
    <div className="rq-shell"><div className="rq-loading"><div className="rq-spinner" /><p>Calculating your risk profile…</p></div></div>
  );

  if (error) return (
    <div className="rq-shell">
      <div className="rq-error">
        <span className="rq-error-icon">⚠️</span>
        <p>{error}</p>
        <button onClick={fetchQuestionnaire} className="rq-btn rq-btn-primary">Retry</button>
      </div>
    </div>
  );

  if (!questionnaire || totalQuestions === 0) return (
    <div className="rq-shell">
      <div className="rq-error">
        <p>No questionnaire available at this time.</p>
        {onSkip && <button onClick={onSkip} className="rq-btn rq-btn-ghost">Continue Without</button>}
      </div>
    </div>
  );

  /* ── Result screen ─────────────────────────────────────────── */
  if (result) return (
    <div className="rq-shell">
      <div className="rq-card">
        <ResultScreen
          riskProfile={result.riskProfile}
          totalScore={result.totalScore}
          riskProfileThresholds={questionnaire.riskProfileThresholds || []}
          sectionResponses={result.sectionResponses || []}
          onProceed={() => onComplete && onComplete({ totalScore: result.totalScore, riskProfile: result.riskProfile })}
        />
      </div>
    </div>
  );

  /* ── Review screen ─────────────────────────────────────────── */
  if (showReview) return (
    <div className="rq-shell">
      <div className="rq-card">
        <div className="rq-review-header">
          <span className="rq-review-icon">📋</span>
          <div>
            <h2>Review Your Answers</h2>
            <p>{questionnaire.title}</p>
          </div>
        </div>

        <div className="rq-progress-wrap">
          <div className="rq-progress-track"><div className="rq-progress-fill" style={{ width: '100%' }} /></div>
          <span className="rq-progress-label">{totalQuestions} / {totalQuestions}</span>
        </div>

        <div className="rq-notice">
          <strong>⚠ Important:</strong> Once submitted, responses are final and will determine your risk profile.
        </div>

        <div className="rq-review-list">
          {allQuestions.map((question, idx) => (
            <div key={question._id} className="rq-review-item">
              <div className="rq-review-q">
                <span className="rq-review-num">Q{idx + 1}</span>
                <span>{question.questionText}</span>
              </div>
              <div className="rq-review-a">
                {responses[question._id]
                  ? <span className="rq-review-answer">{responses[question._id].optionText}</span>
                  : <span className="rq-review-unanswered">Not answered</span>
                }
              </div>
            </div>
          ))}
        </div>

        <div className="rq-actions">
          <button className="rq-btn rq-btn-ghost" onClick={() => { setShowReview(false); setCurrentQuestionIndex(totalQuestions - 1); }}>
            ← Back to Edit
          </button>
          <button className="rq-btn rq-btn-primary" onClick={handleSubmit} disabled={submitting}>
            Submit Final Responses
          </button>
        </div>
      </div>
    </div>
  );

  /* ── Single question view ──────────────────────────────────── */
  const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  return (
    <div className="rq-shell">
      <div className="rq-card">
        <div className="rq-progress-wrap">
          <div className="rq-progress-track">
            <div className="rq-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="rq-progress-label">{currentQuestionIndex + 1} / {totalQuestions}</span>
        </div>

        <div className="rq-section-chip">{currentQuestion.sectionName}</div>

        <div className={`rq-question-card ${animating ? `rq-slide-out-${slideDirection}` : 'rq-slide-in'}`}>
          <p className="rq-question-text">
            <span className="rq-question-num">Q{currentQuestionIndex + 1}.</span>
            {currentQuestion.questionText}
            {currentQuestion.isRequired && <span className="rq-required">*</span>}
          </p>

          <div className="rq-options">
            {(currentQuestion.options || []).map((option, idx) => {
              const isSelected = currentResponse?.optionId === option._id;
              return (
                <button
                  key={option._id}
                  className={`rq-option ${isSelected ? 'rq-option-selected' : ''}`}
                  onClick={() => handleOptionSelect(currentQuestion._id, option._id, option.text, option.points)}
                >
                  <span className="rq-option-letter">{optionLetters[idx] ?? idx + 1}</span>
                  <span className="rq-option-text">{option.text}</span>
                  {isSelected && <span className="rq-option-check">✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rq-actions">
          <button className="rq-btn rq-btn-ghost" onClick={handlePrevious} disabled={currentQuestionIndex === 0}>
            ← Previous
          </button>
          <button className="rq-btn rq-btn-primary" onClick={handleNext} disabled={!currentResponse}>
            {isLastQuestion ? 'Review Answers →' : 'Next →'}
          </button>
        </div>

        <div className="rq-dots" aria-hidden="true">
          {allQuestions.map((q, idx) => (
            <span
              key={idx}
              className={[
                'rq-dot',
                idx === currentQuestionIndex ? 'rq-dot-active' : '',
                responses[q._id] ? 'rq-dot-done' : '',
              ].join(' ')}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default RiskQuestionnaire;
