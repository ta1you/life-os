import { useState, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import './App.css';
import { auth, db } from './firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import {
  collection,
  doc,
  addDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  getDocs,
  writeBatch
} from 'firebase/firestore';

const SCHOOL_AND_WORK_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:5174/school-and-work'
  : 'https://ta1you.github.io/school-and-work';

function App() {
  const [user, setUser] = useState(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [authError, setAuthError] = useState('');
  const [authSuccessMessage, setAuthSuccessMessage] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [currentBottomTab, setCurrentBottomTab] = useState('calendar');
  const [activeTopTab, setActiveTopTab] = useState('schedule');

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalType, setAddModalType] = useState('schedule');

  const [isDailyDetailOpen, setIsDailyDetailOpen] = useState(false);
  const [detailTab, setDetailTab] = useState('schedule');
  const [isCategoryDetailOpen, setIsCategoryDetailOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const [isUpdateCacheOpen, setIsUpdateCacheOpen] = useState(false);
  const [updateModalStep, setUpdateModalStep] = useState(null);
  const [cacheModalStep, setCacheModalStep] = useState(null);
  const [isDataManagementOpen, setIsDataManagementOpen] = useState(false);

  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const [selectedWeekdays, setSelectedWeekdays] = useState([]);
  const [endSetting, setEndSetting] = useState('forever');
  const [endSettingDate, setEndSettingDate] = useState('');
  const [isConfirmRecurringOpen, setIsConfirmRecurringOpen] = useState(false);
  const [recurringDatesToRegister, setRecurringDatesToRegister] = useState([]);
  const [tempScheduleData, setTempScheduleData] = useState(null);

  const [memos, setMemos] = useState(() => {
    const saved = localStorage.getItem('lifeos_memos');
    return saved ? JSON.parse(saved) : [];
  });
  const [memoInput, setMemoInput] = useState('');

  const [isShareSelectOpen, setIsShareSelectOpen] = useState(false);
  const [scheduleSearchQuery, setScheduleSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    timeStart: '',
    timeEnd: '',
    color: '#3b82f6',
    amount: '',
    category: '',
    dateStr: '',
    location: '',
    recurring: 'none'
  });

  const [schedules, setSchedules] = useState(() => {
    const saved = localStorage.getItem('lifeos_schedules');
    return saved ? JSON.parse(saved) : [];
  });

  const [finances, setFinances] = useState(() => {
    const saved = localStorage.getItem('lifeos_finances');
    return saved ? JSON.parse(saved) : [];
  });

  const [timetable, setTimetable] = useState([]);
  const [schoolSyncEnabled, setSchoolSyncEnabled] = useState(false);
  const [shifts, setShifts] = useState(() => {
    const saved = localStorage.getItem('lifeos_shifts');
    return saved ? JSON.parse(saved) : [];
  });

  // Weekly Review Notification Settings
  const [weeklyReviewSettings, setWeeklyReviewSettings] = useState(() => {
    const saved = localStorage.getItem('lifeos_weekly_review_settings');
    return saved ? JSON.parse(saved) : { enabled: true, dayOfWeek: 0, reviewedWeek: '' }; // 0: 日曜日
  });
  const [isNotificationSettingsOpen, setIsNotificationSettingsOpen] = useState(false);
  const [isWeeklyReviewModalOpen, setIsWeeklyReviewModalOpen] = useState(false);
  const hasTriggeredWeeklyReview = useRef(false);

  const hourlyWage = 1180;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
        setSchedules([]);
        setFinances([]);
        setMemos([]);
        setTimetable([]);
        setShifts([]);
        hasTriggeredWeeklyReview.current = false;
        localStorage.removeItem('lifeos_schedules');
        localStorage.removeItem('lifeos_finances');
        localStorage.removeItem('lifeos_memos');
        localStorage.removeItem('lifeos_shifts');
        localStorage.removeItem('lifeos_weekly_review_settings');
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'school', user.uid, 'timetable'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setTimetable(list);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const syncRef = doc(db, 'school', user.uid, 'settings', 'lifeOsSync');
    const unsubscribe = onSnapshot(syncRef, (snapshot) => {
      setSchoolSyncEnabled(snapshot.exists() && snapshot.data().enabled === true);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'work', user.uid, 'shifts'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setShifts(list);
      localStorage.setItem('lifeos_shifts', JSON.stringify(list));
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'schedules'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setSchedules(list);
      localStorage.setItem('lifeos_schedules', JSON.stringify(list));
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'finances'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setFinances(list);
      localStorage.setItem('lifeos_finances', JSON.stringify(list));
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'memos'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setMemos(list);
      localStorage.setItem('lifeos_memos', JSON.stringify(list));
    });
    return () => unsubscribe();
  }, [user]);

  // Sync Weekly Review Settings from Firestore
  useEffect(() => {
    if (!user) return;
    const settingsRef = doc(db, 'users', user.uid, 'settings', 'weeklyReview');
    const unsubscribe = onSnapshot(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setWeeklyReviewSettings({
          enabled: data.enabled ?? true,
          dayOfWeek: data.dayOfWeek ?? 0,
          reviewedWeek: data.reviewedWeek ?? ''
        });
        localStorage.setItem('lifeos_weekly_review_settings', JSON.stringify({
          enabled: data.enabled ?? true,
          dayOfWeek: data.dayOfWeek ?? 0,
          reviewedWeek: data.reviewedWeek ?? ''
        }));
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Check if today matches review day and show modal once per session/mount
  useEffect(() => {
    if (!user || hasTriggeredWeeklyReview.current) return;
    if (!weeklyReviewSettings.enabled) return;

    const now = new Date();
    const currentDayOfWeek = now.getDay(); // 0(日) - 6(土)

    if (currentDayOfWeek === weeklyReviewSettings.dayOfWeek) {
      const daysUntilNextMonday = (8 - currentDayOfWeek) % 7 || 7;
      const nextMonday = new Date(now);
      nextMonday.setDate(now.getDate() + daysUntilNextMonday);
      const pad = (n) => String(n).padStart(2, '0');
      const targetWeekKey = `${nextMonday.getFullYear()}-${pad(nextMonday.getMonth() + 1)}-${pad(nextMonday.getDate())}`;

      if (weeklyReviewSettings.reviewedWeek !== targetWeekKey) {
        hasTriggeredWeeklyReview.current = true;
        setIsWeeklyReviewModalOpen(true);
      }
    }
  }, [user, weeklyReviewSettings]);

  const saveWeeklyReviewSettings = async (newSettings) => {
    setWeeklyReviewSettings(newSettings);
    localStorage.setItem('lifeos_weekly_review_settings', JSON.stringify(newSettings));
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'settings', 'weeklyReview'), newSettings, { merge: true });
      } catch (err) {
        console.error('Failed to save weekly review settings:', err);
      }
    }
  };

  const handleConfirmWeeklyReview = async () => {
    const now = new Date();
    const currentDayOfWeek = now.getDay();
    const daysUntilNextMonday = (8 - currentDayOfWeek) % 7 || 7;
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + daysUntilNextMonday);
    const pad = (n) => String(n).padStart(2, '0');
    const targetWeekKey = `${nextMonday.getFullYear()}-${pad(nextMonday.getMonth() + 1)}-${pad(nextMonday.getDate())}`;

    const updated = {
      ...weeklyReviewSettings,
      reviewedWeek: targetWeekKey,
      updatedAt: new Date().toISOString()
    };
    await saveWeeklyReviewSettings(updated);
    setIsWeeklyReviewModalOpen(false);
  };

  useEffect(() => {
    if (currentBottomTab === 'calendar') setActiveTopTab('schedule');
    else if (currentBottomTab === 'finance') setActiveTopTab('finance');
  }, [currentBottomTab]);

  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const today = new Date();

  const safeParseDate = (d) => {
    if (!d) return null;
    if (d instanceof Date) return d;
    if (typeof d === 'string') {
      const parts = d.split('-');
      if (parts.length === 3 && !d.includes('T')) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(day)) {
          return new Date(y, m, day, 12, 0, 0);
        }
      }
    }
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  const isSameDay = (d1, d2) => {
    const date1 = safeParseDate(d1);
    const date2 = safeParseDate(d2);
    if (!date1 || !date2) return false;
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];

    const prevMonthDays = getDaysInMonth(year, month - 1);

    for (let i = 0; i < firstDay; i++) {
      days.push({
        date: new Date(year, month - 1, prevMonthDays - firstDay + i + 1),
        isCurrentMonth: false
      });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }

    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }

    return days;
  };

  const getDayJa = (date) => {
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return days[date.getDay()];
  };

  const getTimetableSchedulesForDate = () => {
    // 時間割は school-and-work 側の「期間を選んでLife OSに登録」から
    // 指定期間分のみ実スケジュール（schedules）として登録されるため、全曜日への自動マージは行いません
    return [];
  };

  const getShiftSchedulesForDate = (date) => {
    return shifts
      .filter(s => {
        const sDate = safeParseDate(s.startTime);
        return sDate && isSameDay(sDate, date);
      })
      .map(s => {
        const sStart = safeParseDate(s.startTime);
        const sEnd = safeParseDate(s.endTime);
        const formatTime = (d) => d ? d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '';

        return {
          id: `shift-${s.id}`,
          title: `${s.store} (バイト)`,
          timeStart: formatTime(sStart),
          timeEnd: formatTime(sEnd),
          color: '#ef8f3b',
          date,
          isWork: true,
          estimatedPay: s.estimatedPay,
          workHours: s.workHours
        };
      });
  };

  const getMergedSchedulesForDate = (date) => {
    if (!user) return [];
    const local = schedules.filter(s => isSameDay(s.date, date));
    const rawSchoolEvents = getTimetableSchedulesForDate(date);
    const schoolEvents = rawSchoolEvents.filter(se => {
      const timetableId = se.id.replace('timetable-', '');
      return !local.some(l => 
        l.timetableId === timetableId || 
        (l.isSchool && l.timeStart === se.timeStart && l.title === se.title)
      );
    });
    const workEvents = getShiftSchedulesForDate(date);

    return [...local, ...schoolEvents, ...workEvents].sort((a, b) =>
      (a.timeStart || '').localeCompare(b.timeStart || '')
    );
  };

  const getNextWeekReviewData = () => {
    const now = new Date();
    const currentDayOfWeek = now.getDay();
    const daysUntilNextMonday = (8 - currentDayOfWeek) % 7 || 7;
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + daysUntilNextMonday);

    const weekDays = [];
    const dayJaList = ['月', '火', '水', '木', '金', '土', '日'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(nextMonday);
      d.setDate(nextMonday.getDate() + i);
      const daySchedules = getMergedSchedulesForDate(d);
      weekDays.push({
        date: d,
        dayJa: dayJaList[i],
        dateStr: `${d.getMonth() + 1}/${d.getDate()}`,
        schedules: daySchedules
      });
    }

    const nextSunday = new Date(nextMonday);
    nextSunday.setDate(nextMonday.getDate() + 6);

    const rangeLabel = `${nextMonday.getMonth() + 1}/${nextMonday.getDate()} 〜 ${nextSunday.getMonth() + 1}/${nextSunday.getDate()}`;
    const allSchedules = weekDays.flatMap(w => w.schedules);
    const schoolCount = allSchedules.filter(s => s.isSchool || (s.title && (s.title.includes('学校') || s.title.includes('授業')))).length;
    const workCount = allSchedules.filter(s => s.isWork || (s.title && (s.title.includes('バイト') || s.title.includes('アルバイト')))).length;
    const otherCount = allSchedules.length - schoolCount - workCount;

    return {
      rangeLabel,
      nextMonday,
      nextSunday,
      weekDays,
      schoolCount,
      workCount,
      otherCount,
      totalCount: allSchedules.length
    };
  };

  const calendarDays = generateCalendarDays();
  const selectedDateSchedules = getMergedSchedulesForDate(selectedDate);
  const selectedDateFinances = finances.filter(f => isSameDay(f.date, selectedDate));

  const parseDate = (str) => {
    if (!str) return new Date();
    const parts = str.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return new Date(y, m, d, 12, 0, 0);
      }
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const formatDateForInput = (d) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const calculateDuration = (start, end) => {
    if (!start || !end) return 0;
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);

    let diff = (endH + endM / 60) - (startH + startM / 60);
    if (diff < 0) diff += 24;
    return diff;
  };

  const generateRecurringDates = (startDate, pattern, weekdaysSelected, endType, endDateVal) => {
    const dates = [];
    const start = new Date(startDate);
    start.setHours(12, 0, 0, 0);

    let limit = 5;
    let endLimitDate = null;

    if (endType === 'date' && endDateVal) {
      endLimitDate = new Date(endDateVal);
      endLimitDate.setHours(23, 59, 59, 999);
      limit = 30;
    }

    let current = new Date(start);
    let count = 0;

    while (count < limit) {
      if (endLimitDate && current > endLimitDate) break;

      let match = false;

      if (pattern === 'daily') {
        match = true;
      } else if (pattern === 'weekly') {
        const wday = current.getDay();
        const targetDays = weekdaysSelected.length > 0 ? weekdaysSelected : [start.getDay()];
        if (targetDays.includes(wday)) match = true;
      } else if (pattern === 'monthly') {
        if (current.getDate() === start.getDate()) match = true;
      } else if (pattern === 'yearly') {
        if (current.getMonth() === start.getMonth() && current.getDate() === start.getDate()) match = true;
      }

      if (match) {
        dates.push(new Date(current));
        count++;
      }

      current.setDate(current.getDate() + 1);

      if (dates.length >= 30 || current.getFullYear() > start.getFullYear() + 5) {
        break;
      }
    }

    return dates;
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    const targetDate = formData.dateStr ? parseDate(formData.dateStr) : selectedDate;

    if (formData.recurring !== 'none') {
      const generated = generateRecurringDates(
        targetDate,
        formData.recurring,
        selectedWeekdays,
        endSetting,
        endSettingDate
      );

      if (generated.length === 0) {
        alert('該当する日付がありません。繰り返し設定を確認してください。');
        return;
      }

      setRecurringDatesToRegister(generated);
      setTempScheduleData({
        title: formData.title,
        timeStart: formData.timeStart || '',
        timeEnd: formData.timeEnd || '',
        color: formData.color,
        location: formData.location || '',
        recurring: formData.recurring
      });

      setIsConfirmRecurringOpen(true);
      return;
    }

    try {
      await addDoc(collection(db, 'users', user.uid, 'schedules'), {
        title: formData.title,
        timeStart: formData.timeStart || '',
        timeEnd: formData.timeEnd || '',
        color: formData.color,
        date: targetDate.toISOString(),
        location: formData.location || '',
        createdAt: new Date().toISOString()
      });

      const isJob =
        formData.title.includes('バイト') ||
        formData.title.includes('アルバイト');

      if (isJob) {
        const startTime = formData.timeStart || '';
        const endTime = formData.timeEnd || '';

        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);

        let workHours = 0;

        if (
          !Number.isNaN(startHour) &&
          !Number.isNaN(startMinute) &&
          !Number.isNaN(endHour) &&
          !Number.isNaN(endMinute)
        ) {
          let startMinutes = startHour * 60 + startMinute;
          let endMinutes = endHour * 60 + endMinute;

          if (endMinutes < startMinutes) {
            endMinutes += 24 * 60;
          }

          workHours = (endMinutes - startMinutes) / 60;
        }

        const estimatedPay = Math.floor(workHours * hourlyWage);

        await addDoc(collection(db, 'work', user.uid, 'shifts'), {
          store: formData.location || formData.title,
          startTime: targetDate.toISOString(),
          endTime: targetDate.toISOString(),
          timeStart: startTime,
          timeEnd: endTime,
          workHours,
          estimatedPay,
          createdAt: new Date().toISOString()
        });
      }

      setIsAddModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('予定の登録に失敗しました。');
    }
  };

  const executeRecurringRegister = async () => {
    if (!user) return;

    try {
      const batch = writeBatch(db);
      const recurringId = String(Date.now());

      recurringDatesToRegister.forEach((date) => {
        const docRef = doc(collection(db, 'users', user.uid, 'schedules'));
        batch.set(docRef, {
          title: tempScheduleData.title,
          timeStart: tempScheduleData.timeStart,
          timeEnd: tempScheduleData.timeEnd,
          color: tempScheduleData.color,
          date: date.toISOString(),
          location: tempScheduleData.location,
          recurringId,
          recurringPattern: tempScheduleData.recurring,
          createdAt: new Date().toISOString()
        });
      });

      await batch.commit();
      setIsConfirmRecurringOpen(false);
      setIsAddModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('繰り返し予定の登録に失敗しました。');
    }
  };

  const deleteSchedule = async (id) => {
    if (!user) return;

    const scheduleToDelete = schedules.find((s) => s.id === id);
    if (!scheduleToDelete) return;

    if (scheduleToDelete.recurringId) {
      const deleteAll = confirm('この予定は繰り返し予定です。すべての繰り返し予定を削除しますか？');

      if (deleteAll) {
        try {
          const batch = writeBatch(db);
          const matching = schedules.filter((s) => s.recurringId === scheduleToDelete.recurringId);

          matching.forEach((s) => {
            const docRef = doc(db, 'users', user.uid, 'schedules', s.id);
            batch.delete(docRef);
          });

          await batch.commit();
        } catch (err) {
          console.error(err);
          alert('削除に失敗しました。');
        }
      } else {
        try {
          await deleteDoc(doc(db, 'users', user.uid, 'schedules', id));
        } catch (err) {
          console.error(err);
          alert('削除に失敗しました。');
        }
      }
    } else {
      if (confirm('この予定を削除しますか？')) {
        try {
          await deleteDoc(doc(db, 'users', user.uid, 'schedules', id));
        } catch (err) {
          console.error(err);
          alert('削除に失敗しました。');
        }
      }
    }
  };
  const handleDeleteDuplicateJobs = async () => {
    if (!user || !shifts.length) {
      alert('重複しているバイトデータはありません。');
      return;
    }

    const duplicateIds = [];
    const seen = new Map();

    shifts.forEach((shift) => {
      const key = [
        String(shift.store || shift.title || '').trim(),
        safeParseDate(shift.startTime)?.toISOString?.() || String(shift.startTime || '').trim(),
        String(shift.timeStart || '').trim(),
        String(shift.timeEnd || '').trim()
      ].join('|').toLowerCase();

      if (seen.has(key)) {
        duplicateIds.push(shift.id);
      } else {
        seen.set(key, true);
      }
    });

    if (duplicateIds.length === 0) {
      alert('重複しているバイトデータはありません。');
      return;
    }

    const confirmed = window.confirm(`${duplicateIds.length}件の重複バイトを削除しますか？`);
    if (!confirmed) return;

    try {
      const batch = writeBatch(db);
      duplicateIds.forEach((id) => {
        batch.delete(doc(db, 'work', user.uid, 'shifts', id));
      });
      await batch.commit();
      alert('重複バイトを削除しました。');
    } catch (err) {
      console.error(err);
      alert('重複バイトの削除に失敗しました。');
    }
  };

  const handleDeleteThisMonthJobs = async () => {
    if (!user || !shifts.length) {
      alert('今月のバイトデータがありません。');
      return;
    }

    const idsToDelete = shifts
      .filter((shift) => {
        const d = safeParseDate(shift.startTime);
        return (
          d &&
          d.getFullYear() === currentMonth.getFullYear() &&
          d.getMonth() === currentMonth.getMonth()
        );
      })
      .map((shift) => shift.id);

    if (idsToDelete.length === 0) {
      alert('今月のバイトデータはありません。');
      return;
    }

    const confirmed = window.confirm(`${idsToDelete.length}件の今月のバイトを削除しますか？`);
    if (!confirmed) return;

    try {
      const batch = writeBatch(db);
      idsToDelete.forEach((id) => {
        batch.delete(doc(db, 'work', user.uid, 'shifts', id));
      });
      await batch.commit();
      alert('今月のバイトを削除しました。');
    } catch (err) {
      console.error(err);
      alert('今月のバイト削除に失敗しました。');
    }
  };
  const deleteFinance = async (id) => {
    if (!user) return;

    if (confirm('この家計簿データを削除しますか？')) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'finances', id));
      } catch (err) {
        console.error(err);
        alert('削除に失敗しました。');
      }
    }
  };

  const handleFinanceSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    const amountNum = parseInt(formData.amount, 10);
    if (isNaN(amountNum)) return;

    const finalAmount = addModalType === 'expense' ? -Math.abs(amountNum) : Math.abs(amountNum);
    const targetDate = formData.dateStr ? parseDate(formData.dateStr) : selectedDate;

    try {
      await addDoc(collection(db, 'users', user.uid, 'finances'), {
        title: formData.title || (addModalType === 'expense' ? '支出' : '収入'),
        category: formData.category || (addModalType === 'expense' ? '支出' : '収入'),
        amount: finalAmount,
        time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
        date: targetDate.toISOString(),
        createdAt: new Date().toISOString()
      });

      setIsAddModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('家計簿の登録に失敗しました。');
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();

    if (!authEmail || !authPassword) {
      setAuthError('メールアドレスとパスワードを入力してください。');
      return;
    }

    if (authMode === 'register') {
      if (authPassword.length < 6) {
        setAuthError('パスワードは6文字以上で入力してください。');
        return;
      }
      if (authPassword !== authConfirmPassword) {
        setAuthError('パスワードが一致しません。確認用パスワードをもう一度入力してください。');
        return;
      }
    }

    setAuthLoading(true);
    setAuthError('');

    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      } else {
        await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      }
    } catch (err) {
      console.error(err);

      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setAuthError('メールアドレスまたはパスワードが正しくありません。');
      } else if (err.code === 'auth/email-already-in-use') {
        setAuthError('このメールアドレスは既に登録されています。');
      } else if (err.code === 'auth/weak-password') {
        setAuthError('パスワードは6文字以上で入力してください。');
      } else if (err.code === 'auth/operation-not-allowed') {
        setAuthError('【重要】メール/パスワード認証がFirebaseで有効化されていません。FirebaseコンソールのAuthentication設定で「メール/パスワード」を有効にしてください。');
      } else {
        setAuthError(`認証に失敗しました。エラー原因: ${err.code || err.message}`);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handlePasswordResetSubmit = async (e) => {
    e.preventDefault();

    if (!authEmail) {
      setAuthError('メールアドレスを入力してください。');
      return;
    }

    setAuthLoading(true);
    setAuthError('');
    setAuthSuccessMessage('');

    try {
      await sendPasswordResetEmail(auth, authEmail);
      setAuthSuccessMessage('パスワード再設定用のメールを送信しました。メールをご確認ください。');
    } catch (err) {
      console.error(err);

      if (err.code === 'auth/user-not-found') {
        setAuthError('このメールアドレスは登録されていません。');
      } else if (err.code === 'auth/invalid-email') {
        setAuthError('メールアドレスの形式が正しくありません。');
      } else {
        setAuthError(`送信に失敗しました。エラー原因: ${err.code || err.message}`);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleClearSchedules = async () => {
    if (!user) return;

    if (confirm('すべての予定データを削除しますか？この操作は取り消せません。')) {
      try {
        const batch = writeBatch(db);
        const snapshot = await getDocs(collection(db, 'users', user.uid, 'schedules'));

        snapshot.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });

        await batch.commit();
        alert('予定データをすべて削除しました。');
      } catch (err) {
        console.error(err);
        alert('削除に失敗しました。');
      }
    }
  };

  const handleClearFinances = async () => {
    if (!user) return;

    if (confirm('すべての収支データを削除しますか？この操作は取り消せません。')) {
      try {
        const batch = writeBatch(db);
        const snapshot = await getDocs(collection(db, 'users', user.uid, 'finances'));

        snapshot.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });

        await batch.commit();
        alert('収支データをすべて削除しました。');
      } catch (err) {
        console.error(err);
        alert('削除に失敗しました。');
      }
    }
  };

            const handleClearAllData = async () => {
    if (!user) return;

    if (confirm('予定をすべて削除しますか？この操作は取り消せません。')) {
      try {
        const batch = writeBatch(db);

        const schedSnapshot = await getDocs(collection(db, 'users', user.uid, 'schedules'));
        schedSnapshot.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });

        const timetableSnapshot = await getDocs(collection(db, 'school', user.uid, 'timetable'));
        timetableSnapshot.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });

        const workSnapshot = await getDocs(collection(db, 'work', user.uid, 'shifts'));
        workSnapshot.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });

        await batch.commit();

        setSchedules([]);
        setTimetable([]);
        setShifts([]);
        localStorage.removeItem('lifeos_schedules');
        localStorage.removeItem('lifeos_timetable');
        alert('予定をすべて削除しました。');
      } catch (err) {
        console.error(err);
        alert('削除に失敗しました。');
      }
    }
  };  const handleExportData = () => {
    const dataStr = JSON.stringify({ schedules, finances, memos, shifts }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lifeos_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (!imported.schedules || !imported.finances) {
          alert('不正なファイル形式です。バックアップファイルを選択してください。');
          return;
        }

        if (confirm('既存のデータを上書きしてバックアップをインポートしますか？')) {
          if (user) {
            const batch = writeBatch(db);

            const existingSchedules = await getDocs(collection(db, 'users', user.uid, 'schedules'));
            existingSchedules.forEach((docSnap) => batch.delete(docSnap.ref));
            imported.schedules.forEach((s) => {
              const docRef = doc(collection(db, 'users', user.uid, 'schedules'));
              const { id, ...sData } = s;
              batch.set(docRef, sData);
            });

            const existingFinances = await getDocs(collection(db, 'users', user.uid, 'finances'));
            existingFinances.forEach((docSnap) => batch.delete(docSnap.ref));
            imported.finances.forEach((f) => {
              const docRef = doc(collection(db, 'users', user.uid, 'finances'));
              const { id, ...fData } = f;
              batch.set(docRef, fData);
            });

            if (imported.shifts) {
              const existingShifts = await getDocs(collection(db, 'work', user.uid, 'shifts'));
              existingShifts.forEach((docSnap) => batch.delete(docSnap.ref));
              imported.shifts.forEach((s) => {
                const docRef = doc(collection(db, 'work', user.uid, 'shifts'));
                const { id, ...sData } = s;
                batch.set(docRef, sData);
              });
            }

            if (imported.memos) {
              const existingMemos = await getDocs(collection(db, 'users', user.uid, 'memos'));
              existingMemos.forEach((docSnap) => batch.delete(docSnap.ref));
              imported.memos.forEach((m) => {
                const docRef = doc(collection(db, 'users', user.uid, 'memos'));
                const { id, ...mData } = m;
                batch.set(docRef, mData);
              });
            }

            await batch.commit();
            alert('データがインポートされ、Firestoreと同期されました。');
          } else {
            setSchedules(imported.schedules || []);
            setFinances(imported.finances || []);
            setShifts(imported.shifts || []);
            if (imported.memos) setMemos(imported.memos);
            localStorage.setItem('lifeos_schedules', JSON.stringify(imported.schedules || []));
            localStorage.setItem('lifeos_finances', JSON.stringify(imported.finances || []));
            if (imported.shifts) localStorage.setItem('lifeos_shifts', JSON.stringify(imported.shifts));
            if (imported.memos) localStorage.setItem('lifeos_memos', JSON.stringify(imported.memos));
            alert('ローカルストレージにインポートが完了しました。');
          }
        }
      } catch (err) {
        console.error(err);
        alert('インポートに失敗しました。ファイルを確認してください。');
      }
    };

    reader.readAsText(file);
  };

  const handleAppUpdate = () => {
    setUpdateModalStep('checking');
    setTimeout(() => {
      if (navigator.serviceWorker) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (let registration of registrations) {
            registration.update();
          }
        });
      }
      setUpdateModalStep('success');
    }, 1500);
  };

  const openAddModal = (type = 'schedule', initialCategory = '', initialTitle = '', customDate = null) => {
    setAddModalType(type);

    const targetDate = customDate || selectedDate;
    const initialDateStr = formatDateForInput(targetDate);

    setFormData({
      title: initialTitle,
      timeStart: '18:00',
      timeEnd: '22:00',
      color: '#3b82f6',
      amount: '',
      category: initialCategory,
      dateStr: initialDateStr,
      location: '',
      recurring: 'none'
    });

    setSelectedWeekdays([targetDate.getDay()]);
    setEndSetting('forever');
    setEndSettingDate(formatDateForInput(new Date(targetDate.getTime() + 30 * 24 * 60 * 60 * 1000)));
    setIsAddModalOpen(true);
  };

  const handlePrevDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
    setTouchEnd(0);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) handleNextDay();
    if (distance < -minSwipeDistance) handlePrevDay();
  };

  const monthFinances = finances.filter(f => {
    const d = safeParseDate(f.date);
    return d && d.getFullYear() === currentMonth.getFullYear() && d.getMonth() === currentMonth.getMonth();
  });

  const monthIncome = monthFinances
    .filter(f => f.amount > 0)
    .reduce((sum, f) => sum + f.amount, 0);

  const monthExpense = monthFinances
    .filter(f => f.amount < 0)
    .reduce((sum, f) => sum + Math.abs(f.amount), 0);

  const selectedDayIncome = selectedDateFinances
    .filter(f => f.amount > 0)
    .reduce((sum, f) => sum + f.amount, 0);

  const selectedDayExpense = selectedDateFinances
    .filter(f => f.amount < 0)
    .reduce((sum, f) => sum + Math.abs(f.amount), 0);

  const selectedDayTotal = selectedDateFinances.reduce((sum, f) => sum + f.amount, 0);

  const expenseByCategory = monthFinances
    .filter(f => f.amount < 0)
    .reduce((acc, f) => {
      const cat = f.category || 'その他';
      acc[cat] = (acc[cat] || 0) + Math.abs(f.amount);
      return acc;
    }, {});

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#a855f7', '#ec4899'];

  const pieData = Object.keys(expenseByCategory).map(key => ({
    name: key,
    value: expenseByCategory[key]
  }));

  const barData = Array.from({ length: getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth()) }, (_, i) => {
    const day = i + 1;
    const dayFinances = monthFinances.filter(f => {
      const d = safeParseDate(f.date);
      return d && d.getDate() === day;
    });

    const income = dayFinances.filter(f => f.amount > 0).reduce((sum, f) => sum + f.amount, 0);
    const expense = dayFinances.filter(f => f.amount < 0).reduce((sum, f) => sum + Math.abs(f.amount), 0);

    return { date: String(day), income, expense };
  }).filter(d => d.income > 0 || d.expense > 0);

  const categoryDetails = monthFinances.filter(f => f.category === selectedCategory && f.amount < 0);

  const handlePieClick = (data) => {
    if (data && data.name) {
      setSelectedCategory(data.name);
      setIsCategoryDetailOpen(true);
    }
  };

  const currentMonthShifts = shifts.filter(s => {
    const sDate = safeParseDate(s.startTime);
    return sDate && sDate.getFullYear() === currentMonth.getFullYear() && sDate.getMonth() === currentMonth.getMonth();
  });

  const monthlyJobEntries = [
    ...currentMonthShifts.map(shift => ({
      date: safeParseDate(shift.startTime),
      timeStart: shift.timeStart || '',
      timeEnd: shift.timeEnd || '',
      workHours: Number(shift.workHours) || calculateDuration(shift.timeStart, shift.timeEnd),
      estimatedPay: Number(shift.estimatedPay) || Math.floor((Number(shift.workHours) || calculateDuration(shift.timeStart, shift.timeEnd)) * hourlyWage)
    })),
    ...schedules
      .filter(schedule => {
        const scheduleDate = safeParseDate(schedule.date);
        return (
          (schedule.title || '').includes('バイト') ||
          (schedule.title || '').includes('アルバイト')
        ) && scheduleDate &&
          scheduleDate.getFullYear() === currentMonth.getFullYear() &&
          scheduleDate.getMonth() === currentMonth.getMonth() &&
          !currentMonthShifts.some(shift => {
            const shiftDate = safeParseDate(shift.startTime);
            return shiftDate && isSameDay(shiftDate, scheduleDate) &&
              (shift.timeStart || '') === (schedule.timeStart || '') &&
              (shift.timeEnd || '') === (schedule.timeEnd || '');
          });
      })
      .map(schedule => {
        const workHours = calculateDuration(schedule.timeStart, schedule.timeEnd);
        return {
          date: safeParseDate(schedule.date),
          timeStart: schedule.timeStart || '',
          timeEnd: schedule.timeEnd || '',
          workHours,
          estimatedPay: Math.floor(workHours * hourlyWage)
        };
      })
  ];

  const jobHoursMonth = monthlyJobEntries.reduce((total, entry) => total + entry.workHours, 0);
  const jobSalaryMonth = monthlyJobEntries.reduce((total, entry) => total + entry.estimatedPay, 0);

  const openShareModal = () => {
    setIsShareSelectOpen(true);
  };

  const copySchedulesForWeek = (isNextWeek) => {
    const curr = new Date(today);
    const first = curr.getDate() - curr.getDay() + (curr.getDay() === 0 ? -6 : 1);
    const startOfWeek = new Date(curr.setDate(first));

    if (isNextWeek) {
      startOfWeek.setDate(startOfWeek.getDate() + 7);
    }

    let text = isNextWeek ? '【来週の予定】\n\n' : '【今週の予定】\n\n';

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);

      const daySchedules = getMergedSchedulesForDate(d);
      if (daySchedules.length > 0) {
        text += `■ ${d.getMonth() + 1}/${d.getDate()} (${weekdays[d.getDay()]})\n`;
        daySchedules.forEach(s => {
          text += `・${s.isSchool ? '🏫 ' : s.isWork ? '💼 ' : ''}${s.timeStart ? s.timeStart + '〜' : ''}${s.timeEnd || ''} ${s.title}\n`;
        });
        text += '\n';
      }
    }

    const shareContent = text.trim();

    if (!shareContent) {
      alert(isNextWeek ? '来週の予定はありません。' : '今週の予定はありません。');
      setIsShareSelectOpen(false);
      return;
    }

    navigator.clipboard.writeText(shareContent)
      .then(() => {
        alert(isNextWeek ? '来週の予定をクリップボードにコピーしました！' : '今週の予定をクリップボードにコピーしました！');
        setIsShareSelectOpen(false);
      })
      .catch(() => {
        alert('コピーに失敗しました。');
        setIsShareSelectOpen(false);
      });
  };

  const prevMonthDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
  const prevMonthFinances = finances.filter(f => {
    const d = safeParseDate(f.date);
    return d && d.getFullYear() === prevMonthDate.getFullYear() && d.getMonth() === prevMonthDate.getMonth();
  });

  const prevMonthIncome = prevMonthFinances.filter(f => f.amount > 0).reduce((sum, f) => sum + f.amount, 0);
  const prevMonthExpense = prevMonthFinances.filter(f => f.amount < 0).reduce((sum, f) => sum + Math.abs(f.amount), 0);

  const incomeDiff = monthIncome - prevMonthIncome;
  const expenseDiff = monthExpense - prevMonthExpense;

  if (!user) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1 className="auth-title">ライフOS</h1>
          <p className="auth-subtitle">予定と収支をスマートに管理・共有</p>

          {authMode === 'forgot_password' ? (
            <form onSubmit={handlePasswordResetSubmit} className="auth-form">
              <label className="form-label">登録済みのメールアドレス</label>
              <input
                type="email"
                className="select-input"
                placeholder="your@email.com"
                required
                value={authEmail}
                onChange={e => setAuthEmail(e.target.value)}
              />

              {authError && <div className="auth-error-msg">{authError}</div>}
              {authSuccessMessage && (
                <div className="auth-success-msg" style={{ color: 'var(--color-green)', fontSize: '0.85rem', marginBottom: '16px', lineHeight: '1.4', textAlign: 'center' }}>
                  {authSuccessMessage}
                </div>
              )}

              <button type="submit" className="btn-share-action" style={{ width: '100%', marginTop: '10px' }} disabled={authLoading}>
                {authLoading ? '送信中...' : '再設定メールを送信'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleAuthSubmit} className="auth-form">
              <label className="form-label">メールアドレス</label>
              <input
                type="email"
                className="select-input"
                placeholder="your@email.com"
                required
                value={authEmail}
                onChange={e => setAuthEmail(e.target.value)}
              />

              <label className="form-label">パスワード</label>
              <input
                type="password"
                className="select-input"
                placeholder="••••••••"
                required
                value={authPassword}
                onChange={e => setAuthPassword(e.target.value)}
              />

              {authMode === 'register' && (
                <>
                  <label className="form-label">パスワード（確認用）</label>
                  <input
                    type="password"
                    className="select-input"
                    placeholder="••••••••"
                    required
                    value={authConfirmPassword}
                    onChange={e => setAuthConfirmPassword(e.target.value)}
                  />
                </>
              )}

              {authError && <div className="auth-error-msg">{authError}</div>}

              <button type="submit" className="btn-share-action" style={{ width: '100%', marginTop: '10px' }} disabled={authLoading}>
                {authLoading ? '送信中...' : authMode === 'login' ? 'ログイン' : '新規アカウント作成'}
              </button>
            </form>
          )}

          <div className="auth-toggle">
            {authMode === 'login' ? (
              <>
                <p>アカウントをお持ちでないですか？ <span onClick={() => { setAuthMode('register'); setAuthError(''); setAuthPassword(''); setAuthConfirmPassword(''); setAuthSuccessMessage(''); }}>新規登録</span></p>
                <p style={{ marginTop: '12px' }}><span style={{ color: 'var(--primary-color)', cursor: 'pointer', fontSize: '0.9rem' }} onClick={() => { setAuthMode('forgot_password'); setAuthError(''); setAuthPassword(''); setAuthConfirmPassword(''); setAuthSuccessMessage(''); }}>パスワードを忘れた場合</span></p>
              </>
            ) : authMode === 'register' ? (
              <p>既にアカウントをお持ちですか？ <span onClick={() => { setAuthMode('login'); setAuthError(''); setAuthPassword(''); setAuthConfirmPassword(''); setAuthSuccessMessage(''); }}>ログイン</span></p>
            ) : (
              <p><span style={{ color: 'var(--primary-color)', cursor: 'pointer', fontSize: '0.9rem' }} onClick={() => { setAuthMode('login'); setAuthError(''); setAuthPassword(''); setAuthConfirmPassword(''); setAuthSuccessMessage(''); }}>ログイン画面に戻る</span></p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-top">
          <h1 className="title">
            {currentBottomTab === 'memo' ? 'メモ' : currentBottomTab === 'settings' ? '設定' : 'ライフOS'}
          </h1>

          <div className="header-actions">
            {currentBottomTab !== 'settings' && currentBottomTab !== 'memo' && (
              <>
                <button className="btn-header btn-share" onClick={openShareModal}><span>📤</span> 共有</button>
                <button className="btn-header" onClick={() => signOut(auth)}>ログアウト</button>
              </>
            )}
          </div>
        </div>

        {currentBottomTab !== 'settings' && currentBottomTab !== 'memo' && (
          <div className="tabs">
            <button className={`tab-btn ${activeTopTab === 'schedule' ? 'active' : ''}`} onClick={() => { setActiveTopTab('schedule'); setCurrentBottomTab('calendar'); }}>予定</button>
            <button className={`tab-btn ${activeTopTab === 'finance' ? 'active' : ''}`} onClick={() => { setActiveTopTab('finance'); setCurrentBottomTab('finance'); }}>収支</button>
          </div>
        )}
      </header>

      <main className="content-area">
        {(currentBottomTab === 'calendar' || currentBottomTab === 'finance') && (
          <>
            {activeTopTab === 'schedule' && (
              <>
                <div
                  className="detail-list-container"
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  <div className="detail-list-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button className="btn-day-nav" onClick={handlePrevDay}>&lt;</button>
                      <div className="detail-list-title">
                        {selectedDate.getMonth() + 1}/{selectedDate.getDate()} ({weekdays[selectedDate.getDay()]})
                      </div>
                      <button className="btn-day-nav" onClick={handleNextDay}>&gt;</button>
                      {isSameDay(selectedDate, today) && (
                        <span className="today-badge" style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', marginLeft: '4px' }}>
                          今日
                        </span>
                      )}
                    </div>
                    <button className="btn-today-small" onClick={() => setSelectedDate(new Date())}>今日</button>
                  </div>

                  <div className="detail-list-subtitle">今日の予定</div>

                  <div className="detail-list">
                    {selectedDateSchedules.length > 0 ? (
                      selectedDateSchedules.map(s => {
                        const isSchool = s.isSchool || s.title.includes('学校') || s.title.includes('授業');
                        const isJob = s.title.includes('バイト') || s.title.includes('アルバイト') || s.isWork;
                        const duration = s.isWork ? s.workHours : (isJob ? calculateDuration(s.timeStart, s.timeEnd) : 0);
                        const salary = s.isWork ? s.estimatedPay : (isJob ? Math.floor(duration * hourlyWage) : 0);

                        return (
                          <div key={s.id} className="detail-item">
                            <div className="detail-item-color" style={{ backgroundColor: s.color }}></div>
                            <div className="detail-item-time">
                              <span>{s.timeStart}</span>
                              {s.timeEnd && <span style={{ opacity: 0.6 }}> - {s.timeEnd}</span>}
                            </div>
                            <div
                              className="detail-item-title"
                              style={{ cursor: 'pointer' }}
                              onClick={() => {
                                if (s.isSchool) {
                                  window.location.href = `${SCHOOL_AND_WORK_BASE}/?tab=school`;
                                } else if (s.isWork) {
                                  window.location.href = `${SCHOOL_AND_WORK_BASE}/?tab=work`;
                                } else {
                                  setSelectedDate(parseDate(s.date));
                                  setDetailTab('schedule');
                                  setIsDailyDetailOpen(true);
                                }
                              }}
                            >
                              {isSchool ? '🏫 ' : isJob ? '💼 ' : ''}{s.title}
                            </div>

                            {isJob && (
                              <div className="detail-item-inline-salary">
                                {duration.toFixed(1)}時間 / ¥{salary.toLocaleString()}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ color: 'var(--text-secondary)', padding: '10px 0', fontSize: '0.9rem' }}>
                        予定はありません
                      </div>
                    )}

                    <div className="btn-detail-add" onClick={() => openAddModal('schedule')}>
                      <span style={{ fontSize: '1.2rem', color: 'var(--primary-color)' }}>+</span> ここに予定を追加
                    </div>
                  </div>

                  <div className="detail-view-all" onClick={() => { setDetailTab('schedule'); setIsDailyDetailOpen(true); }}>
                    <span>すべての予定を見る</span>
                    <span>&gt;</span>
                  </div>
                </div>

                <div className="job-card">
                  <div className="job-card-header">
                    <div>今月のバイト合計</div>
                    <div>({currentMonth.getMonth() + 1}月)</div>
                  </div>
                  <div className="job-card-body">
                    <div className="job-card-hours">{jobHoursMonth.toFixed(1)} <span>時間</span></div>
                    <div className="job-card-salary">¥{jobSalaryMonth.toLocaleString()}</div>
                  </div>
                </div>
              </>
            )}

            <div className="calendar-container">
              <div className="calendar-header">
                <button className="nav-btn" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}>&lt;</button>
                <div className="month-title">{currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月</div>
                <button className="nav-btn" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}>&gt;</button>
              </div>

              <div className="weekdays">
                {weekdays.map((day, idx) => (
                  <div key={day} className={`weekday ${idx === 0 ? 'weekday-sun' : idx === 6 ? 'weekday-sat' : ''}`}>{day}</div>
                ))}
              </div>

              <div className="days-grid">
                {calendarDays.map((dayObj, idx) => {
                  const isSelected = isSameDay(dayObj.date, selectedDate);
                  const isToday = isSameDay(dayObj.date, today);

                  return (
                    <div
                      key={idx}
                      className={`day-cell ${!dayObj.isCurrentMonth ? 'other-month' : ''} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                      onClick={() => {
                        setSelectedDate(dayObj.date);
                        openAddModal(activeTopTab === 'finance' ? 'expense' : 'schedule', '', '', dayObj.date);
                      }}
                    >
                      <div className="date-number">{dayObj.date.getDate()}</div>

                      {activeTopTab === 'schedule' && (
                        <div className="event-chips-container">
                          {getMergedSchedulesForDate(dayObj.date).slice(0, 2).map((s, i) => {
                            const isSchool = s.isSchool || s.title.includes('学校') || s.title.includes('授業');
                            const isWork = s.isWork || s.title.includes('バイト') || s.title.includes('アルバイト');

                            return (
                              <div key={i} className="event-chip" style={{ backgroundColor: s.color }}>
                                {isSchool ? '🏫 ' : isWork ? '💼 ' : ''}{s.title}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {activeTopTab === 'finance' && (
                        <div className="event-chips-container" style={{ marginTop: 'auto' }}>
                          {(() => {
                            const dayFins = finances.filter(f => isSameDay(f.date, dayObj.date));
                            const total = dayFins.reduce((a, b) => a + b.amount, 0);

                            if (total === 0) return null;

                            return (
                              <div className={`finance-amount ${total > 0 ? 'plus' : 'minus'}`}>
                                {total > 0 ? '+' : ''}{total.toLocaleString()}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {activeTopTab === 'finance' && (
              <div className="finance-dashboard">
                <div className="calendar-header" style={{ border: 'none', background: 'transparent', padding: '0 4px', marginBottom: '16px' }}>
                  <button className="nav-btn" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}>&lt;</button>
                  <div className="month-title">{currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月</div>
                  <button className="nav-btn" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}>&gt;</button>
                </div>

                <div className="finance-summary-cards">
                  <div className="finance-card">
                    <div className="finance-card-label">収入</div>
                    <div className="finance-card-value income">¥{monthIncome.toLocaleString()}</div>
                    <div className={`finance-mom ${incomeDiff >= 0 ? 'mom-plus' : 'mom-minus'}`} style={{ fontSize: '0.75rem', marginTop: '6px', fontWeight: 'bold' }}>
                      前月比: {incomeDiff >= 0 ? '+' : ''}{incomeDiff.toLocaleString()}円
                    </div>
                  </div>

                  <div className="finance-card">
                    <div className="finance-card-label">支出</div>
                    <div className="finance-card-value expense">-¥{monthExpense.toLocaleString()}</div>
                    <div className={`finance-mom ${expenseDiff <= 0 ? 'mom-plus' : 'mom-minus'}`} style={{ fontSize: '0.75rem', marginTop: '6px', fontWeight: 'bold' }}>
                      前月比: {expenseDiff > 0 ? '+' : ''}{expenseDiff.toLocaleString()}円
                    </div>
                  </div>
                </div>

                <div className="chart-section">
                  <div className="chart-title">支出カテゴリ別割合</div>

                  <div style={{ height: 200 }}>
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" onClick={handlePieClick} style={{ cursor: 'pointer' }}>
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `¥${value.toLocaleString()}`} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                        データがありません
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '16px' }}>
                    {pieData.map((entry, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: COLORS[idx % COLORS.length], marginRight: 8 }}></div>
                        <span style={{ flex: 1 }}>{entry.name}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>¥{entry.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="chart-section">
                  <div className="chart-title">日別収支グラフ</div>

                  <div style={{ height: 200 }}>
                    {barData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData}>
                          <XAxis dataKey="date" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} />
                          <Tooltip cursor={{ fill: 'rgba(255,255,255,0.1)' }} contentStyle={{ backgroundColor: '#1a1d24', border: 'none', borderRadius: '8px' }} />
                          <Bar dataKey="income" fill="var(--primary-color)" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="expense" fill="var(--color-red)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                        データがありません
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {currentBottomTab === 'memo' && (
          <div className="memo-screen">
            <div className="memo-composer">
              <textarea
                className="memo-textarea"
                placeholder="ここにメモを入力..."
                value={memoInput}
                onChange={e => setMemoInput(e.target.value)}
              />

              <div className="memo-btn-row">
                <button
                  className="btn-share-action"
                  style={{ padding: '8px 20px', borderRadius: '10px' }}
                  onClick={async () => {
                    if (!memoInput.trim()) return;

                    if (user) {
                      try {
                        await addDoc(collection(db, 'users', user.uid, 'memos'), {
                          text: memoInput,
                          dateStr: new Date().toLocaleString('ja-JP'),
                          createdAt: new Date().toISOString()
                        });
                        setMemoInput('');
                      } catch (err) {
                        console.error(err);
                        alert('メモの保存に失敗しました。');
                      }
                    } else {
                      const newMemos = [{
                        id: Date.now(),
                        text: memoInput,
                        dateStr: new Date().toLocaleString('ja-JP')
                      }, ...memos];

                      setMemos(newMemos);
                      localStorage.setItem('lifeos_memos', JSON.stringify(newMemos));
                      setMemoInput('');
                    }
                  }}
                >
                  保存する
                </button>
              </div>
            </div>

            <div className="memo-list">
              {memos.length > 0 ? (
                memos.map(m => (
                  <div key={m.id} className="memo-card">
                    <div className="memo-card-text">{m.text}</div>
                    <div className="memo-card-footer">
                      <span>{m.dateStr}</span>
                      <button
                        className="btn-memo-delete"
                        onClick={async () => {
                          if (confirm('このメモを削除しますか？')) {
                            if (user) {
                              try {
                                await deleteDoc(doc(db, 'users', user.uid, 'memos', m.id));
                              } catch (err) {
                                console.error(err);
                                alert('削除に失敗しました。');
                              }
                            } else {
                              const newMemos = memos.filter(item => item.id !== m.id);
                              setMemos(newMemos);
                              localStorage.setItem('lifeos_memos', JSON.stringify(newMemos));
                            }
                          }
                        }}
                      >
                        削除
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px 0' }}>
                  メモはありません
                </div>
              )}
            </div>
          </div>
        )}

        {currentBottomTab === 'settings' && (
          <div className="settings-screen">
            <div className="settings-list">
              <button className="settings-item">
                <div className="settings-item-left">
                  <span className="settings-item-icon">👤</span>
                  <span>アカウント設定</span>
                </div>
                <span className="settings-item-chevron">&gt;</span>
              </button>

              <button className="settings-item" onClick={() => setIsNotificationSettingsOpen(true)}>
                <div className="settings-item-left">
                  <span className="settings-item-icon">🔔</span>
                  <span>通知設定</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.8rem', color: weeklyReviewSettings.enabled ? 'var(--primary-color)' : 'var(--text-secondary)' }}>
                    {weeklyReviewSettings.enabled ? `${['日', '月', '火', '水', '木', '金', '土'][weeklyReviewSettings.dayOfWeek]}曜日` : 'OFF'}
                  </span>
                  <span className="settings-item-chevron">&gt;</span>
                </div>
              </button>

              <button className="settings-item" onClick={() => setIsDataManagementOpen(true)}>
                <div className="settings-item-left">
                  <span className="settings-item-icon">💾</span>
                  <span>データ管理</span>
                </div>
                <span className="settings-item-chevron">&gt;</span>
              </button>

              <button className="settings-item">
                <div className="settings-item-left">
                  <span className="settings-item-icon">🎨</span>
                  <span>外観設定</span>
                </div>
                <span className="settings-item-chevron">&gt;</span>
              </button>

              <button className="settings-item">
                <div className="settings-item-left">
                  <span className="settings-item-icon">❔</span>
                  <span>サポート</span>
                </div>
                <span className="settings-item-chevron">&gt;</span>
              </button>

              <button className="settings-item" onClick={() => setIsUpdateCacheOpen(true)}>
                <div className="settings-item-left">
                  <span className="settings-item-icon">🔄</span>
                  <span>アプリ更新・キャッシュ</span>
                </div>
                <span className="settings-item-chevron">&gt;</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {currentBottomTab !== 'settings' && currentBottomTab !== 'memo' && (
        <button className="fab" onClick={() => openAddModal(activeTopTab === 'finance' ? 'expense' : 'schedule')}>＋</button>
      )}

      <nav className="bottom-nav">
        <button className={`nav-item ${currentBottomTab === 'calendar' ? 'active' : ''}`} onClick={() => setCurrentBottomTab('calendar')}>
          <div className="nav-icon">📅</div>
          <span>カレンダー</span>
        </button>

        <button className={`nav-item ${currentBottomTab === 'finance' ? 'active' : ''}`} onClick={() => setCurrentBottomTab('finance')}>
          <div className="nav-icon">💰</div>
          <span>収支</span>
        </button>

        <button className={`nav-item ${currentBottomTab === 'memo' ? 'active' : ''}`} onClick={() => setCurrentBottomTab('memo')}>
          <div className="nav-icon">📝</div>
          <span>メモ</span>
        </button>

        <button className={`nav-item ${currentBottomTab === 'settings' ? 'active' : ''}`} onClick={() => setCurrentBottomTab('settings')}>
          <div className="nav-icon">⚙️</div>
          <span>設定</span>
        </button>
      </nav>

      {isAddModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">新しく追加</div>
              <button className="btn-close" onClick={() => setIsAddModalOpen(false)}>&times;</button>
            </div>

            <div className="modal-date-picker">
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>日付</span>
              <input type="date" value={formData.dateStr} onChange={e => setFormData({ ...formData, dateStr: e.target.value })} />
              <button className="btn-modal-today" onClick={() => setFormData({ ...formData, dateStr: formatDateForInput(today) })}>今日</button>
            </div>

            <div className="tabs" style={{ marginBottom: '20px' }}>
              <button className={`tab-btn ${addModalType === 'schedule' ? 'active' : ''}`} onClick={() => setAddModalType('schedule')}>予定</button>
              <button className={`tab-btn ${addModalType === 'expense' ? 'active' : ''}`} onClick={() => setAddModalType('expense')}>支出</button>
              <button className={`tab-btn ${addModalType === 'income' ? 'active' : ''}`} onClick={() => setAddModalType('income')}>収入</button>
            </div>

            {addModalType === 'schedule' && (
              <form onSubmit={handleScheduleSubmit}>
                <label className="form-label">タイトル</label>
                <input
                  type="text"
                  className="select-input"
                  placeholder="例: バイト、ゼミ"
                  required
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                />

                <label className="form-label">場所（任意）</label>
                <input
                  type="text"
                  className="select-input"
                  placeholder="例: 101教室、店舗名など"
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                />

                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">開始時間</label>
                    <input type="time" className="select-input" value={formData.timeStart} onChange={e => setFormData({ ...formData, timeStart: e.target.value })} />
                  </div>

                  <div style={{ flex: 1 }}>
                    <label className="form-label">終了時間</label>
                    <input type="time" className="select-input" value={formData.timeEnd} onChange={e => setFormData({ ...formData, timeEnd: e.target.value })} />
                  </div>
                </div>

                <label className="form-label">繰り返し登録</label>
                <select className="select-input" value={formData.recurring} onChange={e => setFormData({ ...formData, recurring: e.target.value })}>
                  <option value="none">なし（今回のみ）</option>
                  <option value="daily">毎日</option>
                  <option value="weekly">毎週（曜日を選択）</option>
                  <option value="monthly">毎月（毎月○日）</option>
                  <option value="yearly">毎年（毎年○月○日）</option>
                </select>

                {formData.recurring === 'weekly' && (
                  <>
                    <label className="form-label">繰り返し設定</label>
                    <div className="weekday-selector">
                      {weekdays.map((day, idx) => {
                        const isActive = selectedWeekdays.includes(idx);
                        return (
                          <div
                            key={idx}
                            className={`weekday-circle ${isActive ? 'active' : ''}`}
                            onClick={() => {
                              if (isActive) {
                                setSelectedWeekdays(selectedWeekdays.filter(d => d !== idx));
                              } else {
                                setSelectedWeekdays([...selectedWeekdays, idx]);
                              }
                            }}
                          >
                            {day}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {formData.recurring !== 'none' && (
                  <>
                    <label className="form-label">終了設定</label>
                    <select className="select-input" value={endSetting} onChange={e => setEndSetting(e.target.value)}>
                      <option value="forever">終了日なし（最大5回登録）</option>
                      <option value="date">日付で指定</option>
                    </select>

                    {endSetting === 'date' && (
                      <div className="modal-date-picker" style={{ marginTop: '-8px', marginBottom: '16px' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>終了日</span>
                        <input type="date" value={endSettingDate} onChange={e => setEndSettingDate(e.target.value)} />
                      </div>
                    )}
                  </>
                )}

                <label className="form-label">色</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                  {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#a855f7'].map(color => (
                    <div
                      key={color}
                      onClick={() => setFormData({ ...formData, color })}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: color,
                        cursor: 'pointer',
                        border: formData.color === color ? '2px solid white' : 'none'
                      }}
                    />
                  ))}
                </div>

                <button type="submit" className="btn-share-action" style={{ width: '100%' }}>
                  予定を追加
                </button>
              </form>
            )}

            {(addModalType === 'expense' || addModalType === 'income') && (
              <form onSubmit={handleFinanceSubmit}>
                <label className="form-label">金額（円）</label>
                <input
                  type="number"
                  className="select-input"
                  placeholder="0"
                  required
                  value={formData.amount}
                  onChange={e => setFormData({ ...formData, amount: e.target.value })}
                />

                <label className="form-label">内容</label>
                <input
                  type="text"
                  className="select-input"
                  placeholder="例: コンビニ、給料"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                />

                <label className="form-label">カテゴリ</label>
                <select className="select-input" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                  <option value="">選択してください</option>

                  {addModalType === 'expense' ? (
                    <>
                      <option value="食費">食費</option>
                      <option value="交通費">交通費</option>
                      <option value="日用品">日用品</option>
                      <option value="娯楽">娯楽</option>
                      <option value="その他">その他</option>
                    </>
                  ) : (
                    <>
                      <option value="給料">給料</option>
                      <option value="お小遣い">お小遣い</option>
                      <option value="その他">その他</option>
                    </>
                  )}
                </select>

                <button
                  type="submit"
                  className="btn-share-action"
                  style={{ width: '100%', backgroundColor: addModalType === 'expense' ? 'var(--color-red)' : 'var(--primary-color)' }}
                >
                  {addModalType === 'expense' ? '支出を記録' : '収入を記録'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {isDailyDetailOpen && (
        <div
          className="slide-panel-overlay"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="slide-panel-header">
            <button className="btn-back" onClick={() => setIsDailyDetailOpen(false)}><span>&lt;</span></button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button className="btn-day-nav" onClick={handlePrevDay}>&lt;</button>
              <div className="slide-panel-title">
                {selectedDate.getFullYear()}年{selectedDate.getMonth() + 1}/{selectedDate.getDate()} ({weekdays[selectedDate.getDay()]})
              </div>
              <button className="btn-day-nav" onClick={handleNextDay}>&gt;</button>
            </div>

            <div style={{ width: '32px' }}></div>
          </div>

          <div className="slide-panel-content">
            <div className="detail-tab-row">
              <button className={`detail-tab-btn ${detailTab === 'schedule' ? 'active' : ''}`} onClick={() => setDetailTab('schedule')}>予定</button>
              <button className={`detail-tab-btn ${detailTab === 'finance' ? 'active' : ''}`} onClick={() => setDetailTab('finance')}>収支</button>
            </div>

            {detailTab === 'schedule' && (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <input
                    type="text"
                    placeholder="予定を検索（例: バイト）..."
                    className="select-input"
                    style={{ marginBottom: '8px' }}
                    value={scheduleSearchQuery}
                    onChange={e => setScheduleSearchQuery(e.target.value)}
                  />

                  {scheduleSearchQuery && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        検索結果: {schedules.filter(s => s.title.toLowerCase().includes(scheduleSearchQuery.toLowerCase())).length} 件
                      </span>

                      {schedules.filter(s => s.title.toLowerCase().includes(scheduleSearchQuery.toLowerCase())).length > 0 && (
                        <button
                          className="btn-memo-delete"
                          style={{ fontSize: '0.85rem', padding: '4px 10px', background: 'rgba(248, 113, 113, 0.1)', borderRadius: '6px' }}
                          onClick={() => {
                            const matching = schedules.filter(s => s.title.toLowerCase().includes(scheduleSearchQuery.toLowerCase()));
                            if (confirm(`「${scheduleSearchQuery}」を含むすべての予定（${matching.length}件）を一括削除しますか？`)) {
                              const matchingIds = matching.map(s => s.id);
                              setSchedules(schedules.filter(s => !matchingIds.includes(s.id)));
                              alert('削除が完了しました。');
                            }
                          }}
                        >
                          検索結果を一括削除
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="ledger-list" style={{ marginTop: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: 'bold' }}>
                      {scheduleSearchQuery ? `「${scheduleSearchQuery}」の検索結果` : `${currentMonth.getMonth() + 1}月の予定一覧`}
                    </div>
                  </div>

                  {(() => {
                    const listItems = scheduleSearchQuery
                      ? schedules
                          .filter(s => s.title.toLowerCase().includes(scheduleSearchQuery.toLowerCase()))
                          .sort((a, b) => a.date.localeCompare(b.date) || (a.timeStart || '').localeCompare(b.timeStart || ''))
                      : schedules
                          .filter(s => {
                            const d = safeParseDate(s.date);
                            return d && d.getFullYear() === currentMonth.getFullYear() && d.getMonth() === currentMonth.getMonth();
                          })
                          .sort((a, b) => a.date.localeCompare(b.date) || (a.timeStart || '').localeCompare(b.timeStart || ''));

                    return listItems.length > 0 ? (
                      listItems.map((s) => {
                        const sDate = safeParseDate(s.date) || new Date();
                        const isSchool = s.isSchool || s.title.includes('学校') || s.title.includes('授業');
                        const isJob = s.title.includes('バイト') || s.title.includes('アルバイト') || s.isWork;
                        const duration = isJob ? calculateDuration(s.timeStart, s.timeEnd) : 0;
                        const salary = isJob ? Math.floor(duration * hourlyWage) : 0;

                        return (
                          <div key={s.id} className="ledger-item">
                            <div className="ledger-item-left">
                              <div className="ledger-item-dot" style={{ backgroundColor: s.color }}></div>
                              <div className="ledger-item-info">
                                <div className="ledger-item-title">
                                  {isSchool ? '🏫 ' : isJob ? '💼 ' : ''}{s.title}
                                </div>
                                <div className="ledger-item-subtitle">
                                  {sDate.getMonth() + 1}/{sDate.getDate()}({weekdays[sDate.getDay()]}) • {s.timeStart}{s.timeEnd && ` - ${s.timeEnd}`}
                                  {s.location && ` • 場所: ${s.location}`}
                                  {s.recurringPattern && ` (繰り返し: ${s.recurringPattern === 'daily' ? '毎日' : s.recurringPattern === 'weekly' ? '毎週' : s.recurringPattern === 'monthly' ? '毎月' : '毎年'})`}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              {isJob && (
                                <span style={{ fontSize: '0.85rem', color: 'var(--color-green)', fontWeight: 'bold', marginRight: '4px' }}>
                                  ¥{salary.toLocaleString()}
                                </span>
                              )}
                              <button className="btn-memo-delete" onClick={() => deleteSchedule(s.id)}>削除</button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="empty-state" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        予定はありません
                      </div>
                    );
                  })()}
                </div>

                <div className="job-card" style={{ marginTop: '24px' }}>
                  <div className="job-card-header">
                    <div>今月のバイト合計 ({currentMonth.getMonth() + 1}月)</div>
                  </div>
                  <div className="job-card-body">
                    <div className="job-card-hours">{jobHoursMonth.toFixed(1)} <span>時間</span></div>
                    <div className="job-card-salary">¥{jobSalaryMonth.toLocaleString()}</div>
                  </div>
                </div>
              </>
            )}

            {detailTab === 'finance' && (
              <>
                <div className="finance-summary-cards">
                  <div className="finance-card">
                    <div className="finance-card-label">収入</div>
                    <div className="finance-card-value income">+{selectedDayIncome.toLocaleString()}</div>
                  </div>

                  <div className="finance-card">
                    <div className="finance-card-label">支出</div>
                    <div className="finance-card-value expense">{selectedDayExpense.toLocaleString()}</div>
                  </div>

                  <div className="finance-card">
                    <div className="finance-card-label">今日の収支</div>
                    <div className={`finance-card-value ${selectedDayTotal >= 0 ? 'income' : 'expense'}`}>
                      {selectedDayTotal > 0 ? '+' : ''}{selectedDayTotal.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="ledger-list" style={{ marginTop: '20px' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--primary-color)', marginBottom: '8px' }}>収入</div>

                  {selectedDateFinances.filter(f => f.amount > 0).length > 0 ? (
                    selectedDateFinances.filter(f => f.amount > 0).map((f) => (
                      <div key={f.id} className="ledger-item">
                        <div className="ledger-item-left">
                          <div className="ledger-item-dot" style={{ backgroundColor: 'var(--primary-color)' }}></div>
                          <div className="ledger-item-info">
                            <div className="ledger-item-title">{f.title}</div>
                            <div className="ledger-item-subtitle">{f.time} • {f.category}</div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span className="ledger-item-amount plus">+{f.amount.toLocaleString()}</span>
                          <button className="btn-memo-delete" onClick={() => deleteFinance(f.id)}>削除</button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      収入はありません
                    </div>
                  )}

                  <button className="btn-detail-add-inline" onClick={() => openAddModal('income', '給料', 'バイト給料')} style={{ margin: '8px 0 16px', padding: '8px' }}>
                    ＋ 収入を追加
                  </button>
                </div>

                <div className="ledger-list" style={{ marginTop: '10px' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--color-red)', marginBottom: '8px' }}>支出</div>

                  {selectedDateFinances.filter(f => f.amount < 0).length > 0 ? (
                    selectedDateFinances.filter(f => f.amount < 0).map((f) => (
                      <div key={f.id} className="ledger-item">
                        <div className="ledger-item-left">
                          <div className="ledger-item-dot" style={{ backgroundColor: 'var(--color-red)' }}></div>
                          <div className="ledger-item-info">
                            <div className="ledger-item-title">{f.title}</div>
                            <div className="ledger-item-subtitle">{f.time} • {f.category}</div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span className="ledger-item-amount minus">{f.amount.toLocaleString()}</span>
                          <button className="btn-memo-delete" onClick={() => deleteFinance(f.id)}>削除</button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      支出はありません
                    </div>
                  )}

                  <div className="quick-categories" style={{ marginTop: '12px', padding: '12px' }}>
                    <button className="cat-btn" onClick={() => openAddModal('expense', '食費', '食事')}>
                      <div className="cat-icon" style={{ color: 'var(--color-red)' }}>🍴</div>
                      <span>食費</span>
                    </button>

                    <button className="cat-btn" onClick={() => openAddModal('expense', '交通費', '電車・バス')}>
                      <div className="cat-icon" style={{ color: 'var(--primary-color)' }}>🚌</div>
                      <span>交通費</span>
                    </button>

                    <button className="cat-btn" onClick={() => openAddModal('expense', '日用品', '買い物')}>
                      <div className="cat-icon" style={{ color: 'var(--color-green)' }}>🛒</div>
                      <span>日用品</span>
                    </button>

                    <button className="cat-btn" onClick={() => openAddModal('expense', '娯楽', '遊び')}>
                      <div className="cat-icon" style={{ color: 'var(--color-purple)' }}>🎮</div>
                      <span>娯楽</span>
                    </button>
                  </div>

                  <button
                    className="btn-detail-add-inline"
                    onClick={() => openAddModal('expense', '食費', '')}
                    style={{ margin: '8px 0 16px', padding: '8px', color: 'var(--color-red)', borderColor: 'var(--color-red)', background: 'rgba(248,113,113,0.08)' }}
                  >
                    ＋ 支出を追加
                  </button>
                </div>

                <div className="cat-detail-header" style={{ marginTop: '24px', fontSize: '1.2rem', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginBottom: 0 }}>
                  <span>差額</span>
                  <span className={selectedDayTotal >= 0 ? 'income' : 'expense'}>
                    {selectedDayTotal > 0 ? '+' : ''}{selectedDayTotal.toLocaleString()}円
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {isCategoryDetailOpen && (
        <div className="slide-panel-overlay" style={{ zIndex: 3500 }}>
          <div className="slide-panel-header">
            <button className="btn-back" onClick={() => setIsCategoryDetailOpen(false)}><span>&lt;</span></button>
            <div className="slide-panel-title">{selectedCategory} の内訳</div>
            <div style={{ width: '24px' }}></div>
          </div>

          <div className="slide-panel-content">
            <div className="cat-detail-header">
              <div style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>合計</div>
              <div style={{ color: 'var(--color-red)' }}>-¥{categoryDetails.reduce((sum, f) => sum + Math.abs(f.amount), 0).toLocaleString()}</div>
            </div>

            <div>
              {categoryDetails.map((f, i) => {
                const d = safeParseDate(f.date) || new Date();
                return (
                  <div key={i} className="cat-detail-row">
                    <div className="cat-detail-date">{d.getMonth() + 1}/{d.getDate()}</div>
                    <div className="cat-detail-title">{f.title}</div>
                    <div style={{ color: 'var(--color-red)', fontWeight: 'bold' }}>{f.amount.toLocaleString()}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {isConfirmRecurringOpen && (
        <div className="modal-overlay" style={{ zIndex: 4000 }}>
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-title">繰り返し登録の確認</div>
              <button className="btn-close" onClick={() => setIsConfirmRecurringOpen(false)}>&times;</button>
            </div>

            <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '8px' }}>
              以下の日程に予定を登録します：
            </p>

            <p style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--primary-color)' }}>
              {tempScheduleData?.title} {tempScheduleData?.timeStart && `(${tempScheduleData.timeStart} - ${tempScheduleData.timeEnd})`}
            </p>

            <div className="confirm-dates-list">
              {recurringDatesToRegister.map((date, idx) => (
                <div key={idx} className="confirm-date-item">
                  • {date.getFullYear()}/{String(date.getMonth() + 1).padStart(2, '0')}/{String(date.getDate()).padStart(2, '0')} ({weekdays[date.getDay()]})
                </div>
              ))}
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
              この内容で登録しますか？
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-copy" onClick={() => setIsConfirmRecurringOpen(false)}>キャンセル</button>
              <button className="btn-share-action" onClick={executeRecurringRegister}>登録する</button>
            </div>
          </div>
        </div>
      )}

      {isUpdateCacheOpen && (
        <div className="slide-panel-overlay">
          <div className="slide-panel-header">
            <button className="btn-back" onClick={() => setIsUpdateCacheOpen(false)}><span>&lt;</span> 設定</button>
            <div className="slide-panel-title">アプリ更新・キャッシュ</div>
            <div style={{ width: '48px' }}></div>
          </div>

          <div className="slide-panel-content">
            <div className="chart-section" style={{ background: 'var(--surface-color)', padding: '20px', borderRadius: '20px', marginBottom: '24px' }}>
              <div className="chart-title" style={{ fontSize: '1.1rem', marginBottom: '8px' }}>アプリを更新</div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.4' }}>
                サービスワーカーを更新して、最新のライフOSを読み込みます。
              </p>

              <button
                className="btn-share-action"
                style={{ width: '100%', padding: '14px', borderRadius: '12px', fontWeight: 'bold' }}
                onClick={handleAppUpdate}
              >
                アプリ更新
              </button>
            </div>

            <div className="chart-section" style={{ background: 'var(--surface-color)', padding: '20px', borderRadius: '20px', marginBottom: '40px' }}>
              <div className="chart-title" style={{ fontSize: '1.1rem', marginBottom: '8px', color: 'var(--color-red)' }}>キャッシュの管理</div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.4' }}>
                ローカルに保存されたキャッシュを削除します。
              </p>

              <button
                className="btn-share-action"
                style={{ width: '100%', padding: '14px', borderRadius: '12px', fontWeight: 'bold', backgroundColor: 'var(--color-red)' }}
                onClick={() => setCacheModalStep('confirm')}
              >
                キャッシュを削除
              </button>
            </div>

            <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              現在のバージョン v1.0.0
            </div>
          </div>
        </div>
      )}

      {isDataManagementOpen && (
        <div className="slide-panel-overlay">
          <div className="slide-panel-header">
            <button className="btn-back" onClick={() => setIsDataManagementOpen(false)}><span>&lt;</span> 設定</button>
            <div className="slide-panel-title">データ管理</div>
            <div style={{ width: '48px' }}></div>
          </div>

          <div className="slide-panel-content">
            <div className="chart-section" style={{ background: 'var(--surface-color)', padding: '20px', borderRadius: '20px', marginBottom: '20px' }}>
              <div className="chart-title" style={{ fontSize: '1.1rem', marginBottom: '8px' }}>データのバックアップと復元</div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.4' }}>
                アプリ内の予定、収支、メモのデータをJSON形式でエクスポートまたはインポートします。
              </p>

              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                <button
                  className="btn-share-action"
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', fontWeight: 'bold', backgroundColor: 'var(--primary-color)' }}
                  onClick={handleExportData}
                >
                  エクスポート
                </button>

                <label
                  className="btn-share-action"
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', fontWeight: 'bold', backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid var(--border-color)', textAlign: 'center', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  インポート
                  <input type="file" accept=".json" onChange={handleImportData} style={{ display: 'none' }} />
                </label>
              </div>
            </div>

            <div className="chart-section" style={{ background: 'var(--surface-color)', padding: '20px', borderRadius: '20px', marginBottom: '20px' }}>
              <div className="chart-title" style={{ fontSize: '1.1rem', marginBottom: '8px' }}>予定データの削除</div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.4' }}>
                保存されているすべての予定データを削除します。この操作は取り消せません。
              </p>

              <button
                className="btn-share-action"
                style={{ width: '100%', padding: '14px', borderRadius: '12px', fontWeight: 'bold', backgroundColor: 'var(--color-red)' }}
                onClick={() => {
                  handleClearSchedules();
                  setIsDataManagementOpen(false);
                }}
              >
                すべての予定を削除
              </button>
            </div>

            <div className="chart-section" style={{ background: 'var(--surface-color)', padding: '20px', borderRadius: '20px', marginBottom: '20px' }}>
              <div className="chart-title" style={{ fontSize: '1.1rem', marginBottom: '8px' }}>収支データの削除</div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.4' }}>
                保存されているすべての収支データを削除します。この操作は取り消せません。
              </p>

              <button
                className="btn-share-action"
                style={{ width: '100%', padding: '14px', borderRadius: '12px', fontWeight: 'bold', backgroundColor: 'var(--color-red)' }}
                onClick={() => {
                  handleClearFinances();
                  setIsDataManagementOpen(false);
                }}
              >
                すべての収支を削除
              </button>
            </div>

            <div className="chart-section" style={{ background: 'var(--surface-color)', padding: '20px', borderRadius: '20px', marginBottom: '40px' }}>
              <div className="chart-title" style={{ fontSize: '1.1rem', marginBottom: '8px', color: 'var(--color-red)' }}>全データのリセット</div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.4' }}>
                予定と収支を含むすべてのデータを完全にリセットします。この操作は取り消せません。
              </p>

              <button
                className="btn-share-action"
                style={{ width: '100%', padding: '14px', borderRadius: '12px', fontWeight: 'bold', backgroundColor: 'var(--color-red)' }}
                onClick={() => {
                  handleClearAllData();
                  setIsDataManagementOpen(false);
                }}
              >
                すべてのデータをリセット
              </button>
            </div>
          </div>
        </div>
      )}

      {updateModalStep === 'checking' && (
        <div className="modal-overlay" style={{ zIndex: 5000 }}>
          <div className="modal-content" style={{ textAlign: 'center', maxWidth: '320px' }}>
            <div className="modal-header" style={{ justifyContent: 'center', marginBottom: '8px' }}>
              <div className="modal-title">更新の確認</div>
            </div>

            <div className="spinner-container">
              <div className="spinner"></div>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                新しいバージョンを確認しています...
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                通信環境が必要です
              </p>
            </div>

            {(() => {
              setTimeout(() => {
                if (updateModalStep === 'checking') setUpdateModalStep('success');
              }, 1500);
            })()}
          </div>
        </div>
      )}

      {updateModalStep === 'success' && (
        <div className="modal-overlay" style={{ zIndex: 5000 }}>
          <div className="modal-content" style={{ textAlign: 'center', maxWidth: '320px' }}>
            <div className="spinner-container" style={{ padding: '12px 0' }}>
              <div style={{ fontSize: '2.5rem', color: 'var(--color-green)' }}>✓</div>
              <div className="modal-title" style={{ fontSize: '1.15rem', marginTop: '8px' }}>更新が完了しました</div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>最新の状態になりました！</p>
            </div>

            <button
              className="btn-share-action"
              style={{ width: '100%', marginTop: '12px' }}
              onClick={() => {
                setUpdateModalStep(null);
                window.location.reload();
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {cacheModalStep === 'confirm' && (
        <div className="modal-overlay" style={{ zIndex: 5000 }}>
          <div className="modal-content" style={{ maxWidth: '340px' }}>
            <div className="modal-header">
              <div className="modal-title" style={{ color: 'var(--color-red)' }}>キャッシュの削除</div>
              <button className="btn-close" onClick={() => setCacheModalStep(null)}>&times;</button>
            </div>

            <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '24px', lineHeight: '1.5' }}>
              オフラインデータを含むキャッシュを削除します。よろしいですか？
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-copy" onClick={() => setCacheModalStep(null)}>キャンセル</button>
              <button
                className="btn-share-action"
                style={{ backgroundColor: 'var(--color-red)' }}
                onClick={() => {
                  if ('caches' in window) {
                    caches.keys().then((names) => {
                      for (let name of names) caches.delete(name);
                    });
                  }

                  if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistrations().then((registrations) => {
                      for (let registration of registrations) {
                        registration.unregister();
                      }
                    });
                  }

                  setCacheModalStep('success');
                }}
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}

      {cacheModalStep === 'success' && (
        <div className="modal-overlay" style={{ zIndex: 5000 }}>
          <div className="modal-content" style={{ textAlign: 'center', maxWidth: '320px' }}>
            <div className="spinner-container" style={{ padding: '12px 0' }}>
              <div style={{ fontSize: '2.5rem', color: 'var(--color-green)' }}>✓</div>
              <div className="modal-title" style={{ fontSize: '1.15rem', marginTop: '8px' }}>キャッシュを削除しました</div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>空き容量が増え、動作が軽くなります。</p>
            </div>

            <button
              className="btn-share-action"
              style={{ width: '100%', marginTop: '12px' }}
              onClick={() => setCacheModalStep(null)}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {isShareSelectOpen && (
        <div className="modal-overlay" style={{ zIndex: 4000 }} onClick={() => setIsShareSelectOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">予定の共有</div>
              <button className="btn-close" onClick={() => setIsShareSelectOpen(false)}>&times;</button>
            </div>

            <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '20px', lineHeight: '1.5' }}>
              共有したい期間を選択してください。クリップボードにコピーされます。
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button className="btn-share-action" onClick={() => copySchedulesForWeek(false)}>
                今週の予定をコピー
              </button>

              <button className="btn-share-action" style={{ backgroundColor: 'var(--primary-color)' }} onClick={() => copySchedulesForWeek(true)}>
                来週の予定をコピー
              </button>

              <button className="btn-copy" style={{ width: '100%' }} onClick={() => setIsShareSelectOpen(false)}>
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === Notification Settings Modal === */}
      {isNotificationSettingsOpen && (
        <div className="modal-overlay" style={{ zIndex: 4000 }} onClick={() => setIsNotificationSettingsOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <div className="modal-title">🔔 通知設定</div>
              <button className="btn-close" onClick={() => setIsNotificationSettingsOpen(false)}>&times;</button>
            </div>

            <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* ON/OFF Switch */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '14px 16px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>来週の予定確認リマインド</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                    アプリを開いたときに確認画面を表示
                  </div>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px', cursor: 'pointer', flexShrink: 0 }}>
                  <input
                    type="checkbox"
                    checked={weeklyReviewSettings.enabled}
                    onChange={(e) => saveWeeklyReviewSettings({ ...weeklyReviewSettings, enabled: e.target.checked })}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute', cursor: 'pointer', inset: 0,
                    backgroundColor: weeklyReviewSettings.enabled ? 'var(--primary-color)' : 'rgba(255,255,255,0.2)',
                    borderRadius: '26px', transition: '0.3s'
                  }}>
                    <span style={{
                      position: 'absolute', content: '""', height: '20px', width: '20px',
                      left: weeklyReviewSettings.enabled ? '25px' : '3px', bottom: '3px',
                      backgroundColor: 'white', borderRadius: '50%', transition: '0.3s'
                    }} />
                  </span>
                </label>
              </div>

              {/* Day of Week Select */}
              {weeklyReviewSettings.enabled && (
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px 16px', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                  <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>確認する曜日</label>
                  <select
                    className="select-input"
                    value={weeklyReviewSettings.dayOfWeek}
                    onChange={(e) => saveWeeklyReviewSettings({ ...weeklyReviewSettings, dayOfWeek: Number(e.target.value) })}
                    style={{ width: '100%', marginBottom: '6px' }}
                  >
                    <option value={0}>日曜日（おすすめ）</option>
                    <option value={1}>月曜日</option>
                    <option value={2}>火曜日</option>
                    <option value={3}>水曜日</option>
                    <option value={4}>木曜日</option>
                    <option value={5}>金曜日</option>
                    <option value={6}>土曜日</option>
                  </select>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                    💡 選択した曜日に Life OS を開いたときに、まだ確認していない場合のみ確認画面が自動で表示されます。
                  </div>
                </div>
              )}

              {/* Manual Review Button */}
              <button
                type="button"
                className="btn-share-action"
                style={{
                  width: '100%', padding: '12px', borderRadius: '12px', fontWeight: 'bold',
                  backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)', cursor: 'pointer'
                }}
                onClick={() => {
                  setIsNotificationSettingsOpen(false);
                  setIsWeeklyReviewModalOpen(true);
                }}
              >
                📅 今すぐ来週の予定を確認する
              </button>

              <button
                type="button"
                className="btn-share-action"
                style={{
                  width: '100%', padding: '12px', borderRadius: '12px', fontWeight: 'bold',
                  backgroundColor: 'var(--primary-color)', color: 'white', cursor: 'pointer'
                }}
                onClick={() => setIsNotificationSettingsOpen(false)}
              >
                完了
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === Weekly Schedule Review Modal === */}
      {isWeeklyReviewModalOpen && (() => {
        const reviewData = getNextWeekReviewData();
        return (
          <div className="modal-overlay" style={{ zIndex: 4500 }} onClick={() => setIsWeeklyReviewModalOpen(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
              <div className="modal-header" style={{ marginBottom: '8px' }}>
                <div>
                  <div className="modal-title" style={{ fontSize: '1.15rem' }}>📅 来週の予定確認</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    対象期間: {reviewData.rangeLabel}
                  </div>
                </div>
                <button className="btn-close" onClick={() => setIsWeeklyReviewModalOpen(false)}>&times;</button>
              </div>

              <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  来週の予定はこれでいいですか？授業やバイトの変更・抜けがないか確認しましょう。
                </p>

                {/* Summary Badges */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)', padding: '10px 8px', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.72rem', color: '#60a5fa', fontWeight: 'bold' }}>🏫 学校の授業</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#93c5fd', marginTop: '2px' }}>
                      {reviewData.schoolCount}<span style={{ fontSize: '0.75rem', fontWeight: 'normal' }}>コマ</span>
                    </div>
                  </div>
                  <div style={{ background: 'rgba(239, 143, 59, 0.1)', border: '1px solid rgba(239, 143, 59, 0.25)', padding: '10px 8px', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 'bold' }}>💼 バイト</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fbbf24', marginTop: '2px' }}>
                      {reviewData.workCount}<span style={{ fontSize: '0.75rem', fontWeight: 'normal' }}>件</span>
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-color)', padding: '10px 8px', borderRadius: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>📝 その他</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '2px' }}>
                      {reviewData.otherCount}<span style={{ fontSize: '0.75rem', fontWeight: 'normal' }}>件</span>
                    </div>
                  </div>
                </div>

                {/* Warning if 0 school classes */}
                {reviewData.schoolCount === 0 && (
                  <div style={{ background: 'rgba(239, 143, 59, 0.12)', border: '1px solid rgba(239, 143, 59, 0.3)', padding: '12px', borderRadius: '12px', fontSize: '0.8rem', color: '#fbbf24', lineHeight: '1.4' }}>
                    ⚠️ <strong>来週の時間割がまだ登録されていません</strong><br />
                    下の「時間割を登録・調整する」から、来週分の時間割を Life OS に登録してください。
                  </div>
                )}

                {/* Day-by-Day List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {reviewData.weekDays.map((dayObj, i) => (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '10px 12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: dayObj.schedules.length > 0 ? '6px' : '0' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '0.82rem', color: dayObj.dayJa === '日' ? '#f87171' : dayObj.dayJa === '土' ? '#60a5fa' : 'var(--text-primary)' }}>
                          {dayObj.dateStr} ({dayObj.dayJa})
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {dayObj.schedules.length > 0 ? `${dayObj.schedules.length}件` : '予定なし'}
                        </span>
                      </div>
                      {dayObj.schedules.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {dayObj.schedules.map((s, si) => {
                            const isSchool = s.isSchool || (s.title && (s.title.includes('学校') || s.title.includes('授業')));
                            const isJob = s.isWork || (s.title && (s.title.includes('バイト') || s.title.includes('アルバイト')));
                            return (
                              <div key={si} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: '8px', fontSize: '0.8rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: s.color || '#3b82f6', display: 'inline-block' }}></span>
                                  <span>{isSchool ? '🏫 ' : isJob ? '💼 ' : ''}{s.title}</span>
                                </div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                  {s.timeStart}{s.timeEnd ? ` - ${s.timeEnd}` : ''}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
                <a
                  href={`${SCHOOL_AND_WORK_BASE}/?tab=school`}
                  className="btn-share-action"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    width: '100%', padding: '12px', borderRadius: '12px', fontWeight: 'bold',
                    backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)',
                    textDecoration: 'none', textAlign: 'center', cursor: 'pointer'
                  }}
                >
                  🏫 時間割を登録・調整する (School & Work)
                </a>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn-share-action"
                    style={{
                      flex: 1, padding: '12px', borderRadius: '12px', fontWeight: 'bold',
                      backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)',
                      color: 'var(--text-secondary)', cursor: 'pointer'
                    }}
                    onClick={() => setIsWeeklyReviewModalOpen(false)}
                  >
                    あとで
                  </button>

                  <button
                    type="button"
                    className="btn-share-action"
                    style={{
                      flex: 2, padding: '12px', borderRadius: '12px', fontWeight: 'bold',
                      backgroundColor: 'var(--primary-color)', color: 'white', cursor: 'pointer'
                    }}
                    onClick={handleConfirmWeeklyReview}
                  >
                    この予定で確定 ✓
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default App;

