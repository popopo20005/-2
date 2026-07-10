import { useState, useEffect } from 'react';
import { historyService, spacedRepetitionService, problemService } from '../lib/database';
import type { SpacedRepetitionCard } from '../types';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface StudyCalendarProps {
  language?: 'ja' | 'en';
  className?: string;
}

interface DayData {
  date: Date;
  count: number; // 学習時間（分）
  quizCount: number; // クイズ実施回数
  isCurrentMonth: boolean;
  reviewCount: number; // 復習予定の問題数
  reviewProblems: string[]; // 復習予定の問題名（最大5件）
}

export function StudyCalendar({ language = 'ja', className = '' }: StudyCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarData, setCalendarData] = useState<DayData[]>([]);
  const [hoveredDay, setHoveredDay] = useState<DayData | null>(null);
  const [loading, setLoading] = useState(true);

  const translations = {
    ja: {
      title: '学習カレンダー',
      subtitle: '月ごとの学習記録',
      weekdays: ['日', '月', '火', '水', '木', '金', '土'],
      noData: 'データなし',
      minutes: '分',
      quizzes: '回',
      studyTime: '学習時間',
      quizCount: 'クイズ実施',
      totalDays: '学習日数',
      longestStreak: '最長連続',
      currentStreak: '現在の連続',
      days: '日',
      reviewScheduled: '復習予定',
      problems: '問題',
    },
    en: {
      title: 'Study Calendar',
      subtitle: 'Monthly learning activity',
      weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      noData: 'No data',
      minutes: 'min',
      quizzes: 'times',
      studyTime: 'Study time',
      quizCount: 'Quizzes',
      totalDays: 'Total days',
      longestStreak: 'Longest streak',
      currentStreak: 'Current streak',
      days: 'days',
      reviewScheduled: 'Review scheduled',
      problems: 'problems',
    },
  };

  const t = translations[language];

  useEffect(() => {
    loadCalendarData();
  }, [currentMonth]);

  const loadCalendarData = async () => {
    try {
      setLoading(true);

      // 月の最初の日と最後の日
      const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      // カレンダー表示用に前月/次月の日付も含める
      const startDate = new Date(firstDay);
      startDate.setDate(startDate.getDate() - startDate.getDay()); // 週の最初（日曜日）に調整

      const endDate = new Date(lastDay);
      endDate.setDate(endDate.getDate() + (6 - endDate.getDay())); // 週の最後（土曜日）に調整

      // 各日のデータを集計
      const dailyData = new Map<string, { time: number; count: number }>();
      const reviewData = new Map<string, { count: number; problems: string[] }>();

      const allHistory = await historyService.getAll();
      const allReviewCards = await spacedRepetitionService.getAllCards();
      const allProblems = await problemService.getAll();

      // 問題IDから問題データへのマップを作成
      const problemMap = new Map(allProblems.map(p => [p.id, p]));

      allHistory.forEach((record) => {
        if (!record.timestamp) return;

        const date = new Date(record.timestamp);
        // ローカルタイムゾーンで日付キーを生成
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateKey = `${year}-${month}-${day}`;
        const existing = dailyData.get(dateKey) || { time: 0, count: 0 };

        // 1問あたり30秒と仮定
        const estimatedTime = 0.5; // 分

        dailyData.set(dateKey, {
          time: existing.time + estimatedTime,
          count: existing.count + 1,
        });
      });

      // 復習予定日のデータを集計
      allReviewCards.forEach((card: SpacedRepetitionCard) => {
        if (!card.nextReviewDate) return;

        const date = new Date(card.nextReviewDate);
        // ローカルタイムゾーンで日付キーを生成
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateKey = `${year}-${month}-${day}`;
        const existing = reviewData.get(dateKey) || { count: 0, problems: [] };

        // カード名を取得（カード名を優先表示）
        const problem = problemMap.get(card.problemId);
        const problemName = card.name || problem?.question?.substring(0, 30) + '...' || `Problem #${card.problemId}`;

        // 問題名を追加（重複チェック、最大5件まで）
        const problems = existing.problems.length < 5 && !existing.problems.includes(problemName)
          ? [...existing.problems, problemName]
          : existing.problems;

        reviewData.set(dateKey, {
          count: existing.count + 1,
          problems,
        });
      });

      // カレンダーデータを生成
      const calendar: DayData[] = [];
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        // ローカルタイムゾーンで日付キーを生成
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const dateKey = `${year}-${month}-${day}`;
        const data = dailyData.get(dateKey) || { time: 0, count: 0 };
        const review = reviewData.get(dateKey) || { count: 0, problems: [] };

        calendar.push({
          date: new Date(currentDate),
          count: Math.round(data.time),
          quizCount: data.count,
          isCurrentMonth: currentDate.getMonth() === currentMonth.getMonth(),
          reviewCount: review.count,
          reviewProblems: review.problems,
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      // カレンダーデータが7の倍数になるように調整（グリッド表示のため）
      while (calendar.length % 7 !== 0) {
        const lastDate = new Date(calendar[calendar.length - 1].date);
        lastDate.setDate(lastDate.getDate() + 1);
        calendar.push({
          date: new Date(lastDate),
          count: 0,
          quizCount: 0,
          isCurrentMonth: lastDate.getMonth() === currentMonth.getMonth(),
          reviewCount: 0,
          reviewProblems: [],
        });
      }

      setCalendarData(calendar);
    } catch (error) {
      console.error('Failed to load calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  // 統計情報の計算
  const calculateStats = () => {
    const currentMonthData = calendarData.filter((d) => d.isCurrentMonth);
    const totalDays = currentMonthData.filter((d) => d.count > 0).length;

    let longestStreak = 0;
    let currentStreakCount = 0;
    let tempStreak = 0;

    for (let i = currentMonthData.length - 1; i >= 0; i--) {
      if (currentMonthData[i].count > 0) {
        tempStreak++;
        if (i === currentMonthData.length - 1) {
          currentStreakCount = tempStreak;
        }
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        if (currentStreakCount === 0) {
          currentStreakCount = tempStreak;
        }
        tempStreak = 0;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    return { totalDays, longestStreak, currentStreak: currentStreakCount };
  };

  const stats = calculateStats();

  const getBackgroundColor = (studyTime: number, reviewCount: number) => {
    // 復習予定のみ（学習なし）
    if (studyTime === 0 && reviewCount > 0) {
      if (reviewCount < 5) return 'rgba(99,102,241,0.2)';
      if (reviewCount < 10) return 'rgba(99,102,241,0.4)';
      if (reviewCount < 20) return 'rgba(99,102,241,0.6)';
      return 'rgba(99,102,241,0.8)';
    }

    // 学習済みのみ（復習予定なし）
    if (studyTime > 0 && reviewCount === 0) {
      if (studyTime < 5) return 'rgba(16,185,129,0.2)';
      if (studyTime < 15) return 'rgba(16,185,129,0.4)';
      if (studyTime < 30) return 'rgba(16,185,129,0.6)';
      return 'rgba(16,185,129,0.8)';
    }

    // 両方（学習済み＋復習予定）- グラデーション（緑→青）
    if (studyTime > 0 && reviewCount > 0) {
      return 'rgba(16,185,129,0.5)';
    }

    // データなし
    return 'transparent';
  };

  const getBorderColor = (studyTime: number, reviewCount: number) => {
    if (studyTime === 0 && reviewCount === 0) return 'rgba(255,255,255,0.06)';

    // 復習予定がある場合は青系
    if (reviewCount > 0) {
      return 'rgba(99,102,241,0.5)';
    }

    // 学習済みのみは緑系
    return 'rgba(16,185,129,0.5)';
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    const now = new Date();
    const next = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    if (next <= now) {
      setCurrentMonth(next);
    }
  };

  const goToCurrentMonth = () => {
    setCurrentMonth(new Date());
  };

  const isCurrentMonth = () => {
    const now = new Date();
    return currentMonth.getMonth() === now.getMonth() && currentMonth.getFullYear() === now.getFullYear();
  };

  const getMonthYearText = () => {
    if (language === 'ja') {
      return `${currentMonth.getFullYear()}年${currentMonth.getMonth() + 1}月`;
    } else {
      return currentMonth.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // カレンダーを週ごとに分割
  const weeks: DayData[][] = [];
  for (let i = 0; i < calendarData.length; i += 7) {
    weeks.push(calendarData.slice(i, i + 7));
  }

  if (loading) {
    return (
      <div
        className={`rounded-2xl p-5 ${className}`}
        style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="size-6 text-[#818CF8]" />
          <div>
            <h3 className="text-lg font-bold text-[#F8FAFC]">{t.title}</h3>
            <p className="text-sm text-[#94A3B8]">{t.subtitle}</p>
          </div>
        </div>
        <div className="h-40 flex items-center justify-center">
          <div className="animate-pulse text-[#64748B]">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl p-5 ${className}`}
      style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
    >
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="size-6 text-[#818CF8]" />
          <div>
            <h3 className="text-lg font-bold text-[#F8FAFC]">{t.title}</h3>
            <p className="text-sm text-[#94A3B8]">{t.subtitle}</p>
          </div>
        </div>

        {/* 月切り替えコントロール */}
        <div className="flex items-center gap-2">
          <button
            onClick={previousMonth}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="size-5 text-[#94A3B8]" />
          </button>

          <button
            onClick={goToCurrentMonth}
            disabled={isCurrentMonth()}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${isCurrentMonth()
              ? 'bg-[#6366F1] text-white cursor-default'
              : 'bg-white/5 text-[#CBD5E1] hover:bg-white/10'
              }`}
          >
            {getMonthYearText()}
          </button>

          <button
            onClick={nextMonth}
            disabled={isCurrentMonth()}
            className={`p-2 rounded-lg transition-colors ${isCurrentMonth()
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:bg-white/10'
              }`}
            aria-label="Next month"
          >
            <ChevronRight className="size-5 text-[#94A3B8]" />
          </button>
        </div>
      </div>

      {/* 統計情報 */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
        <div
          className="text-center p-2 sm:p-3 rounded-xl"
          style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.2)' }}
        >
          <div className="text-xl sm:text-2xl font-bold text-[#818CF8]">{stats.totalDays}</div>
          <div className="text-xs text-[#94A3B8]">{t.totalDays}</div>
        </div>
        <div
          className="text-center p-2 sm:p-3 rounded-xl"
          style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.2)' }}
        >
          <div className="text-xl sm:text-2xl font-bold text-[#F59E0B]">{stats.longestStreak}</div>
          <div className="text-xs text-[#94A3B8]">{t.longestStreak}</div>
        </div>
        <div
          className="text-center p-2 sm:p-3 rounded-xl"
          style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.2)' }}
        >
          <div className="text-xl sm:text-2xl font-bold text-[#34D399]">{stats.currentStreak}</div>
          <div className="text-xs text-[#94A3B8]">{t.currentStreak}</div>
        </div>
      </div>

      {/* カレンダー */}
      <div className="p-2 rounded-xl" style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
          {t.weekdays.map((day, index) => (
            <div
              key={day}
              className={`text-center text-xs font-medium py-1 sm:py-2 rounded ${index === 0 ? 'text-[#EF4444]' : 'text-[#94A3B8]'
                }`}
              style={{ border: '1px solid rgba(255,255,255,0.06)' }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 日付グリッド */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
          {calendarData.map((day, index) => {
            const today = isToday(day.date);
            const bgColor = getBackgroundColor(day.count, day.reviewCount);
            const borderColor = getBorderColor(day.count, day.reviewCount);

            return (
              <div
                key={`${day.date.toISOString()}-${index}`}
                className={`relative aspect-square rounded ${!day.isCurrentMonth ? 'opacity-30' : ''
                  } ${today ? 'ring-2 ring-[#6366F1] ring-offset-2' : ''}
                transition-all hover:scale-105 hover:z-10 cursor-pointer`}
                style={{
                  backgroundColor: bgColor,
                  border: `1px solid ${borderColor}`,
                  ...(today ? { '--tw-ring-offset-color': '#0F172A' } as React.CSSProperties : {}),
                }}
                onMouseEnter={() => setHoveredDay(day)}
                onMouseLeave={() => setHoveredDay(null)}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center p-0.5 sm:p-1">
                  <span
                    className={`text-xs sm:text-base font-bold ${day.count > 0
                      ? 'text-white'
                      : day.isCurrentMonth
                        ? 'text-[#CBD5E1]'
                        : 'text-[#64748B]'
                      }`}
                  >
                    {day.date.getDate()}
                  </span>
                  {day.count > 0 && (
                    <span className="text-[10px] sm:text-xs font-bold text-white mt-0.5">{day.count}分</span>
                  )}
                  {/* 復習予定の問題名を表示（最初の1件のみ） */}
                  {day.reviewCount > 0 && day.reviewProblems.length > 0 && (
                    <span className="text-[10px] sm:text-xs font-medium text-[#818CF8] mt-0.5 truncate w-full text-center px-0.5">
                      {day.reviewProblems[0].substring(0, 10)}{day.reviewProblems[0].length > 10 ? '...' : ''}
                    </span>
                  )}
                  {/* 復習予定が複数ある場合、件数を表示 */}
                  {day.reviewCount > 1 && (
                    <span className="text-[10px] sm:text-xs text-[#818CF8]">
                      +{day.reviewCount - 1}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 凡例 */}
      <div className="flex items-center justify-end gap-2 mt-4 text-xs text-[#94A3B8]">
        <span>{t.noData}</span>
        <div className="flex gap-1">
          <div className="w-4 h-4 rounded-sm" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.06)' }}></div>
          <div className="w-4 h-4 rounded-sm" style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.3)' }}></div>
          <div className="w-4 h-4 rounded-sm" style={{ background: 'rgba(16,185,129,0.4)', border: '1px solid rgba(16,185,129,0.5)' }}></div>
          <div className="w-4 h-4 rounded-sm" style={{ background: 'rgba(16,185,129,0.6)', border: '1px solid rgba(16,185,129,0.7)' }}></div>
          <div className="w-4 h-4 rounded-sm" style={{ background: 'rgba(16,185,129,0.8)', border: '1px solid rgba(16,185,129,0.9)' }}></div>
        </div>
        <span className="ml-1">多い</span>
      </div>

      {/* ホバーツールチップ */}
      {hoveredDay && (hoveredDay.count > 0 || hoveredDay.reviewCount > 0) && (
        <div
          className="mt-4 p-3 rounded-xl space-y-2"
          style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <div className="text-sm font-bold text-[#F8FAFC] mb-1">
            {hoveredDay.date.toLocaleDateString(language)}
          </div>

          {/* 学習時間情報 */}
          {hoveredDay.count > 0 && (
            <div className="text-xs text-[#CBD5E1]">
              {t.studyTime}: {hoveredDay.count}
              {t.minutes} • {t.quizCount}: {hoveredDay.quizCount}
              {t.quizzes}
            </div>
          )}

          {/* 復習予定情報 */}
          {hoveredDay.reviewCount > 0 && (
            <div className="text-xs text-[#818CF8] pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="font-semibold mb-1">
                {t.reviewScheduled}: {hoveredDay.reviewCount} {t.problems}
              </div>
              {hoveredDay.reviewProblems.length > 0 && (
                <ul className="ml-2 space-y-0.5">
                  {hoveredDay.reviewProblems.map((problem, idx) => (
                    <li key={idx} className="truncate">• {problem}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
