import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Clock, Volume2, Check } from 'lucide-react';
import { SFX, speakText, stopSpeaking } from '../utils/audio';

interface ClockTimeGameProps {
  onBack: () => void;
  lang: 'id' | 'en';
  level: number;
  playerName: string;
  onWin: (stars: number, scoreText: string) => void;
}

interface TimeValue {
  hour: number; // 1..12
  minute: number; // 0, 15, 30, 45
}

interface ClockChallenge {
  mode: 'READ_CLOCK' | 'SET_CLOCK';
  target: TimeValue;
  activityEmoji: string;
  activityId: string;
  activityEn: string;
  choices: TimeValue[];
}

const ACTIVITIES: { hour: number; emoji: string; id: string; en: string }[] = [
  { hour: 6, emoji: '🌅', id: 'Bangun pagi', en: 'Wake up time' },
  { hour: 7, emoji: '🏫', id: 'Berangkat sekolah', en: 'School time' },
  { hour: 9, emoji: '📚', id: 'Belajar di kelas', en: 'Study time' },
  { hour: 12, emoji: '🍛', id: 'Makan siang', en: 'Lunch time' },
  { hour: 3, emoji: '⚽', id: 'Bermain sore', en: 'Playtime' },
  { hour: 6, emoji: '🍽️', id: 'Makan malam', en: 'Dinner time' },
  { hour: 8, emoji: '📖', id: 'Membaca buku', en: 'Reading time' },
  { hour: 9, emoji: '🌙', id: 'Tidur malam', en: 'Bedtime' },
];

const formatTime = (t: TimeValue): string => {
  const hh = t.hour.toString().padStart(2, '0');
  const mm = t.minute.toString().padStart(2, '0');
  return `${hh}:${mm}`;
};

const HOUR_WORDS_ID: Record<number, string> = {
  1: 'satu',
  2: 'dua',
  3: 'tiga',
  4: 'empat',
  5: 'lima',
  6: 'enam',
  7: 'tujuh',
  8: 'delapan',
  9: 'sembilan',
  10: 'sepuluh',
  11: 'sebelas',
  12: 'dua belas',
};

const speakClockPhrase = (t: TimeValue, lang: 'id' | 'en'): string => {
  if (lang === 'en') {
    if (t.minute === 0) return `${t.hour} o'clock`;
    return `${t.hour} ${t.minute}`;
  }
  const hWord = HOUR_WORDS_ID[t.hour] || `${t.hour}`;
  if (t.minute === 0) return `Jam ${hWord} tepat`;
  if (t.minute === 30) return `Jam ${hWord} lewat tiga puluh menit`;
  return `Jam ${hWord} lewat ${t.minute} menit`;
};

export const ClockTimeGame: React.FC<ClockTimeGameProps> = ({
  onBack,
  lang,
  level,
  playerName,
  onWin,
}) => {
  const totalQuestions = level === 0 ? 6 : level === 1 ? 7 : 8;

  const [qIndex, setQIndex] = useState(0);
  const [challenge, setChallenge] = useState<ClockChallenge | null>(null);
  const [userTime, setUserTime] = useState<TimeValue>({ hour: 12, minute: 0 });
  const [selectedChoiceIdx, setSelectedChoiceIdx] = useState<number | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [feedback, setFeedback] = useState('');

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildChallenge = (index: number): ClockChallenge => {
    const allowedMinutes = level === 0 ? [0] : level === 1 ? [0, 30] : [0, 15, 30, 45];
    const targetHour = Math.floor(Math.random() * 12) + 1;
    const targetMinute = allowedMinutes[Math.floor(Math.random() * allowedMinutes.length)];
    const target: TimeValue = { hour: targetHour, minute: targetMinute };

    const matchingAct =
      ACTIVITIES.find((a) => a.hour === targetHour) ||
      ACTIVITIES[Math.floor(Math.random() * ACTIVITIES.length)];

    // Alternate between guessing time and interactively setting the clock hands
    const mode: 'READ_CLOCK' | 'SET_CLOCK' = index % 2 === 0 ? 'READ_CLOCK' : 'SET_CLOCK';

    const choices: TimeValue[] = [target];
    const seen = new Set<string>([formatTime(target)]);
    while (choices.length < (level === 0 ? 3 : 4)) {
      const randH = Math.floor(Math.random() * 12) + 1;
      const randM = allowedMinutes[Math.floor(Math.random() * allowedMinutes.length)];
      const candidate = { hour: randH, minute: randM };
      const key = formatTime(candidate);
      if (!seen.has(key)) {
        seen.add(key);
        choices.push(candidate);
      }
    }

    // For SET_CLOCK, start user hands away from target
    const startHour = ((targetHour + 5) % 12) + 1;
    setUserTime({ hour: startHour, minute: 0 });

    return {
      mode,
      target,
      activityEmoji: matchingAct.emoji,
      activityId: matchingAct.id,
      activityEn: matchingAct.en,
      choices: choices.sort(() => Math.random() - 0.5),
    };
  };

  useEffect(() => {
    const next = buildChallenge(qIndex);
    setChallenge(next);
    setSelectedChoiceIdx(null);
    setIsLocked(false);
    setFeedback('');

    if (next.mode === 'SET_CLOCK') {
      speakText(
        lang === 'id'
          ? `Pasang jarum jam ke ${speakClockPhrase(next.target, 'id')}`
          : `Set the clock to ${speakClockPhrase(next.target, 'en')}`,
        lang
      );
    }
  }, [qIndex, level]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      stopSpeaking();
    };
  }, []);

  const advanceOrWin = () => {
    const displayName = playerName?.trim() || (lang === 'id' ? 'Juara' : 'Champ');
    timerRef.current = setTimeout(() => {
      if (qIndex + 1 >= totalQuestions) {
        const stars = mistakes <= 1 ? 3 : mistakes <= 3 ? 2 : 1;
        onWin(
          stars,
          lang === 'id'
            ? `Hebat ${displayName}! ${totalQuestions} soal jam tuntas!`
            : `Great job ${displayName}! All ${totalQuestions} clocks solved!`
        );
      } else {
        setQIndex((i) => i + 1);
      }
    }, 1250);
  };

  const handleSelectChoice = (idx: number, choice: TimeValue) => {
    if (isLocked || !challenge) return;
    setIsLocked(true);
    setSelectedChoiceIdx(idx);
    const displayName = playerName?.trim() || (lang === 'id' ? 'Juara' : 'Champ');

    if (choice.hour === challenge.target.hour && choice.minute === challenge.target.minute) {
      SFX.ding();
      const spoken = speakClockPhrase(challenge.target, lang);
      const praise =
        lang === 'id'
          ? `🌟 Tepat sekali, ${displayName}! ${spoken}!`
          : `🌟 Correct, ${displayName}! It is ${spoken}!`;
      setFeedback(praise);
      speakText(praise, lang);
      advanceOrWin();
    } else {
      SFX.no();
      setMistakes((m) => m + 1);
      const retry = lang === 'id' ? 'Lihat jarum pendek & panjang lagi yaa!' : 'Check the hour & minute hands again!';
      setFeedback(retry);
      speakText(lang === 'id' ? 'Coba lagi yaa!' : 'Try again!', lang);
      timerRef.current = setTimeout(() => {
        setIsLocked(false);
        setSelectedChoiceIdx(null);
      }, 850);
    }
  };

  const handleCheckSetClock = () => {
    if (isLocked || !challenge) return;
    setIsLocked(true);
    const displayName = playerName?.trim() || (lang === 'id' ? 'Juara' : 'Champ');

    if (userTime.hour === challenge.target.hour && userTime.minute === challenge.target.minute) {
      SFX.ding();
      const spoken = speakClockPhrase(challenge.target, lang);
      const praise =
        lang === 'id'
          ? `🌟 Pintar, ${displayName}! Jarum jam tepat di ${formatTime(challenge.target)}!`
          : `🌟 Great, ${displayName}! Clock set to ${formatTime(challenge.target)}!`;
      setFeedback(praise);
      speakText(`${spoken}. ${lang === 'id' ? `Hebat ${displayName}!` : `Great job ${displayName}!`}`, lang);
      advanceOrWin();
    } else {
      SFX.no();
      setMistakes((m) => m + 1);
      const hint =
        userTime.hour !== challenge.target.hour
          ? lang === 'id'
            ? `Jarum pendek masih di jam ${userTime.hour}, arahkan ke jam ${challenge.target.hour}!`
            : `Move the hour hand to ${challenge.target.hour}!`
          : lang === 'id'
          ? `Menitnya masih ${userTime.minute.toString().padStart(2, '0')}, atur ke ${challenge.target.minute.toString().padStart(2, '0')}!`
          : `Adjust the minutes to ${challenge.target.minute.toString().padStart(2, '0')}!`;
      setFeedback(hint);
      speakText(lang === 'id' ? 'Coba atur lagi yaa!' : 'Try adjusting again!', lang);
      timerRef.current = setTimeout(() => {
        setIsLocked(false);
      }, 850);
    }
  };

  const adjustHour = (delta: number) => {
    if (isLocked || !challenge || challenge.mode !== 'SET_CLOCK') return;
    SFX.bloop();
    setUserTime((prev) => {
      const nextH = ((prev.hour - 1 + delta + 12) % 12) + 1;
      return { ...prev, hour: nextH };
    });
  };

  const adjustMinute = (delta: number) => {
    if (isLocked || !challenge || challenge.mode !== 'SET_CLOCK') return;
    SFX.bloop();
    setUserTime((prev) => {
      const nextM = (prev.minute + delta + 60) % 60;
      return { ...prev, minute: nextM };
    });
  };

  if (!challenge) return null;

  const displayedTime = challenge.mode === 'READ_CLOCK' ? challenge.target : userTime;
  const hourAngle = (displayedTime.hour % 12) * 30 + displayedTime.minute * 0.5;
  const minuteAngle = displayedTime.minute * 6;

  return (
    <div className="flex flex-col flex-1 h-full w-full max-w-2xl phone-landscape:max-w-4xl mx-auto px-3 sm:px-4 py-2 phone-landscape:py-1.5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 py-2 phone-landscape:py-1.5 mb-2 bg-white/90 backdrop-blur-md px-3.5 sm:px-4 rounded-2xl border border-slate-200/80 shadow-xs shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 phone-landscape:w-8 phone-landscape:h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors cursor-pointer shrink-0"
          aria-label="Kembali"
        >
          <ArrowLeft className="w-5 h-5 phone-landscape:w-4 phone-landscape:h-4" />
        </button>

        <div className="text-sm md:text-base font-black text-slate-900 flex items-center gap-1.5 truncate">
          <Clock className="w-5 h-5 text-indigo-600 shrink-0" />
          <span className="truncate">{lang === 'id' ? 'Jam Pintar' : 'Clock Explorer'}</span>
        </div>

        <span className="text-xs font-semibold text-slate-600 tabular-nums shrink-0">
          {qIndex + 1} / {totalQuestions}
        </span>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col phone-landscape:flex-row items-center justify-center gap-3 sm:gap-5 py-1 w-full">
        {/* Analog Clock Dial */}
        <div className="flex flex-col items-center justify-center gap-2 phone-landscape:flex-1">
          <div className="text-xs sm:text-sm font-bold text-slate-600 flex items-center gap-1.5">
            <span>{challenge.activityEmoji}</span>
            <span>{lang === 'id' ? challenge.activityId : challenge.activityEn}</span>
            <span aria-hidden="true">·</span>
            <span className="text-indigo-700">
              {challenge.mode === 'READ_CLOCK'
                ? lang === 'id'
                  ? 'Tebak Jam'
                  : 'Read Clock'
                : lang === 'id'
                ? 'Setel Jam'
                : 'Set Clock'}
            </span>
          </div>

          <div className="relative bg-white rounded-full p-2 sm:p-3 border-4 border-indigo-200 shadow-md">
            <svg
              viewBox="0 0 220 220"
              className="w-44 h-44 sm:w-56 sm:h-56 phone-landscape:w-40 phone-landscape:h-40 select-none"
            >
              {/* Clock Face */}
              <circle cx="110" cy="110" r="102" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2" />

              {/* Minute tick marks */}
              {[...Array(60)].map((_, i) => {
                const rad = ((i * 6 - 90) * Math.PI) / 180;
                const isHourMark = i % 5 === 0;
                const r1 = isHourMark ? 88 : 94;
                const r2 = 98;
                return (
                  <line
                    key={i}
                    x1={110 + r1 * Math.cos(rad)}
                    y1={110 + r1 * Math.sin(rad)}
                    x2={110 + r2 * Math.cos(rad)}
                    y2={110 + r2 * Math.sin(rad)}
                    stroke={isHourMark ? '#4f46e5' : '#cbd5e1'}
                    strokeWidth={isHourMark ? 3 : 1.5}
                    strokeLinecap="round"
                  />
                );
              })}

              {/* Hour numbers 1..12 (clickable in SET_CLOCK mode!) */}
              {Array.from({ length: 12 }, (_, idx) => {
                const num = idx + 1;
                const rad = ((num * 30 - 90) * Math.PI) / 180;
                const x = 110 + 73 * Math.cos(rad);
                const y = 110 + 73 * Math.sin(rad);
                const isSelectedHour =
                  challenge.mode === 'SET_CLOCK' && userTime.hour === num;
                return (
                  <g
                    key={num}
                    onClick={() => {
                      if (challenge.mode === 'SET_CLOCK' && !isLocked) {
                        SFX.bloop();
                        setUserTime((prev) => ({ ...prev, hour: num }));
                      }
                    }}
                    className={challenge.mode === 'SET_CLOCK' ? 'cursor-pointer' : ''}
                  >
                    {isSelectedHour && (
                      <circle cx={x} cy={y} r="13" fill="#e0e7ff" stroke="#4f46e5" strokeWidth="1.5" />
                    )}
                    <text
                      x={x}
                      y={y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize="15"
                      fontWeight="800"
                      fill={isSelectedHour ? '#3730a3' : '#1e293b'}
                    >
                      {num}
                    </text>
                  </g>
                );
              })}

              {/* Hour Hand (Short, Indigo) */}
              <line
                x1="110"
                y1="110"
                x2={110 + 48 * Math.cos(((hourAngle - 90) * Math.PI) / 180)}
                y2={110 + 48 * Math.sin(((hourAngle - 90) * Math.PI) / 180)}
                stroke="#312e81"
                strokeWidth="7"
                strokeLinecap="round"
                className="transition-all duration-200"
              />

              {/* Minute Hand (Long, Rose) */}
              <line
                x1="110"
                y1="110"
                x2={110 + 74 * Math.cos(((minuteAngle - 90) * Math.PI) / 180)}
                y2={110 + 74 * Math.sin(((minuteAngle - 90) * Math.PI) / 180)}
                stroke="#e11d48"
                strokeWidth="4.5"
                strokeLinecap="round"
                className="transition-all duration-200"
              />

              {/* Center Cap */}
              <circle cx="110" cy="110" r="6" fill="#4f46e5" stroke="#ffffff" strokeWidth="2" />
            </svg>

            {challenge.mode === 'SET_CLOCK' && (
              <div className="text-center text-xs font-black text-indigo-800 bg-indigo-50 px-2.5 py-0.5 rounded-full mt-1 tabular-nums">
                {formatTime(userTime)}
              </div>
            )}
          </div>
        </div>

        {/* Question & Controls Panel */}
        <div className="flex flex-col items-center justify-center gap-3 w-full max-w-sm phone-landscape:flex-1">
          {challenge.mode === 'READ_CLOCK' ? (
            <>
              <div className="text-center">
                <h2 className="text-base sm:text-xl font-black text-slate-900">
                  {lang === 'id' ? 'Jam berapa yang ditunjukkan?' : 'What time does the clock show?'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {lang === 'id'
                    ? 'Jarum pendek = jam · Jarum panjang merah = menit'
                    : 'Short hand = hour · Long red hand = minutes'}
                </p>
              </div>

              <div className="min-h-[2rem] flex items-center justify-center">
                {feedback && (
                  <span
                    className={`px-3.5 py-1 rounded-full text-xs font-black text-center animate-scale-up ${
                      feedback.includes('Lihat') || feedback.includes('Check')
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    }`}
                  >
                    {feedback}
                  </span>
                )}
              </div>

              <div
                className={`w-full grid gap-2.5 ${
                  challenge.choices.length === 3 ? 'grid-cols-3' : 'grid-cols-2'
                }`}
              >
                {challenge.choices.map((c, idx) => {
                  const isSelected = selectedChoiceIdx === idx;
                  const isRight =
                    c.hour === challenge.target.hour && c.minute === challenge.target.minute;
                  let btnClass = 'bg-white hover:bg-slate-50 border-slate-200 text-slate-900 shadow-xs';
                  if (isSelected) {
                    btnClass = isRight
                      ? 'bg-emerald-400 text-emerald-950 border-emerald-500'
                      : 'bg-rose-200 text-rose-950 border-rose-400 animate-shake';
                  }

                  return (
                    <button
                      key={formatTime(c)}
                      type="button"
                      onClick={() => handleSelectChoice(idx, c)}
                      disabled={isLocked}
                      className={`py-3.5 sm:py-4 rounded-2xl border-3 font-black text-xl sm:text-2xl tabular-nums transition-all cursor-pointer active:scale-95 ${btnClass}`}
                    >
                      {formatTime(c)}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <div className="text-center">
                <h2 className="text-base sm:text-xl font-black text-slate-900">
                  {lang === 'id' ? 'Pasang jam berikut ini:' : 'Set the clock to:'}
                </h2>
                <div className="mt-1.5 inline-flex items-center gap-2 bg-white px-5 py-2 rounded-2xl border-2 border-indigo-200 shadow-xs">
                  <span className="text-2xl sm:text-3xl font-black text-indigo-900 tabular-nums">
                    {formatTime(challenge.target)}
                  </span>
                  <button
                    type="button"
                    onClick={() => speakText(speakClockPhrase(challenge.target, lang), lang)}
                    className="w-8 h-8 rounded-full bg-amber-300 hover:bg-amber-400 text-amber-950 flex items-center justify-center cursor-pointer"
                    aria-label="Dengarkan Jam"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="min-h-[2rem] flex items-center justify-center">
                {feedback ? (
                  <span
                    className={`px-3.5 py-1 rounded-full text-xs font-black text-center animate-scale-up ${
                      feedback.includes('masih') || feedback.includes('Move') || feedback.includes('Adjust')
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    }`}
                  >
                    {feedback}
                  </span>
                ) : (
                  <span className="text-xs text-slate-500 font-semibold text-center">
                    {lang === 'id'
                      ? 'Ketuk angka di jam atau gunakan tombol di bawah'
                      : 'Tap clock numbers or use the buttons below'}
                  </span>
                )}
              </div>

              <div className="w-full grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => adjustHour(-1)}
                  disabled={isLocked}
                  className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 border-2 border-slate-200 font-black text-xs sm:text-sm text-slate-800 cursor-pointer active:scale-95"
                >
                  −1 {lang === 'id' ? 'Jam' : 'Hr'}
                </button>
                <button
                  type="button"
                  onClick={() => adjustHour(1)}
                  disabled={isLocked}
                  className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 border-2 border-slate-200 font-black text-xs sm:text-sm text-slate-800 cursor-pointer active:scale-95"
                >
                  +1 {lang === 'id' ? 'Jam' : 'Hr'}
                </button>

                {level >= 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => adjustMinute(level === 1 ? -30 : -15)}
                      disabled={isLocked}
                      className="py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border-2 border-rose-200 font-black text-xs sm:text-sm text-rose-900 cursor-pointer active:scale-95"
                    >
                      −{level === 1 ? 30 : 15} {lang === 'id' ? 'Menit' : 'Min'}
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustMinute(level === 1 ? 30 : 15)}
                      disabled={isLocked}
                      className="py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border-2 border-rose-200 font-black text-xs sm:text-sm text-rose-900 cursor-pointer active:scale-95"
                    >
                      +{level === 1 ? 30 : 15} {lang === 'id' ? 'Menit' : 'Min'}
                    </button>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={handleCheckSetClock}
                disabled={isLocked}
                className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-95"
              >
                <Check className="w-5 h-5" />
                <span>{lang === 'id' ? 'Cek Jarum Jam!' : 'Check Clock!'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
