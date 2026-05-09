import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('schedule');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // モーダルの状態
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('schedule'); // 'schedule' | 'expense' | 'income'
  
  // フォームの状態
  const [formData, setFormData] = useState({
    title: '',
    timeStart: '',
    timeEnd: '',
    color: '#3b82f6',
    amount: '',
    category: ''
  });
  
  // 予定データ（ローカルストレージから読み込み）
  const [schedules, setSchedules] = useState(() => {
    const saved = localStorage.getItem('lifeos_schedules');
    return saved ? JSON.parse(saved) : [];
  });
  
  // 収支データ（ローカルストレージから読み込み）
  const [finances, setFinances] = useState(() => {
    const saved = localStorage.getItem('lifeos_finances');
    return saved ? JSON.parse(saved) : [];
  });

  // データが更新されたらローカルストレージに保存
  useEffect(() => {
    localStorage.setItem('lifeos_schedules', JSON.stringify(schedules));
  }, [schedules]);

  useEffect(() => {
    localStorage.setItem('lifeos_finances', JSON.stringify(finances));
  }, [finances]);

  // カレンダーのロジック
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days = [];
    
    // 前月のパディング
    const prevMonthDays = getDaysInMonth(year, month - 1);
    for (let i = 0; i < firstDay; i++) {
      days.push({
        date: new Date(year, month - 1, prevMonthDays - firstDay + i + 1),
        isCurrentMonth: false
      });
    }
    
    // 当月の日付
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }
    
    // 翌月のパディング
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays();
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const isSameDay = (d1, d2) => {
    if (!d1 || !d2) return false;
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  };

  const today = new Date();

  // ====== データ処理 ======
  const selectedDateSchedules = schedules.filter(s => isSameDay(s.date, selectedDate));
  const selectedDateFinances = finances.filter(f => isSameDay(f.date, selectedDate));

  const todayExpense = finances
    .filter(f => isSameDay(f.date, today) && f.amount < 0)
    .reduce((sum, f) => sum + f.amount, 0);

  const monthExpense = finances
    .filter(f => {
      const d = new Date(f.date);
      return d.getFullYear() === currentMonth.getFullYear() && 
             d.getMonth() === currentMonth.getMonth() && 
             f.amount < 0;
    })
    .reduce((sum, f) => sum + f.amount, 0);

  const getSchedulesForDate = (date) => {
    return schedules.filter(s => isSameDay(s.date, date)).slice(0, 3);
  };

  const formatDateString = (d) => {
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 (${weekdays[d.getDay()]})`;
  };

  // ====== フォーム操作 ======
  const resetForm = () => {
    setFormData({
      title: '', timeStart: '', timeEnd: '', color: '#3b82f6', amount: '', category: ''
    });
  };

  const handleScheduleSubmit = (e) => {
    e.preventDefault();
    const newSchedule = {
      id: Date.now(),
      title: formData.title,
      timeStart: formData.timeStart,
      timeEnd: formData.timeEnd,
      color: formData.color,
      date: selectedDate.toISOString(),
      location: ''
    };
    setSchedules([...schedules, newSchedule]);
    setIsModalOpen(false);
    resetForm();
  };

  const handleFinanceSubmit = (e) => {
    e.preventDefault();
    const amountNum = parseInt(formData.amount, 10);
    if (isNaN(amountNum)) return;
    
    const finalAmount = modalType === 'expense' ? -Math.abs(amountNum) : Math.abs(amountNum);
    
    const newFinance = {
      id: Date.now(),
      title: formData.category || (modalType === 'expense' ? '支出' : '収入'),
      category: formData.category || (modalType === 'expense' ? '支出' : '収入'),
      amount: finalAmount,
      time: new Date().toLocaleTimeString('ja-JP', {hour: '2-digit', minute:'2-digit'}),
      date: selectedDate.toISOString()
    };
    setFinances([...finances, newFinance]);
    setIsModalOpen(false);
    resetForm();
  };

  const handleDeleteSchedule = (id) => {
    if(window.confirm('この予定を削除しますか？')) {
      setSchedules(schedules.filter(s => s.id !== id));
    }
  };

  const handleDeleteFinance = (id) => {
    if(window.confirm('この履歴を削除しますか？')) {
      setFinances(finances.filter(f => f.id !== id));
    }
  };

  // カレンダー描画用ヘルパー関数
  const renderCalendar = (tabType) => (
    <div className="calendar-container">
      <div className="calendar-header">
        <button className="nav-btn" onClick={prevMonth}>&lt;</button>
        <div className="month-title">
          {currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月
        </div>
        <button className="nav-btn" onClick={nextMonth}>&gt;</button>
      </div>
      
      <div className="weekdays">
        {weekdays.map((day, idx) => (
          <div key={day} className={`weekday ${idx === 0 ? 'weekday-sun' : idx === 6 ? 'weekday-sat' : ''}`}>
            {day}
          </div>
        ))}
      </div>
      
      <div className="days-grid">
        {calendarDays.map((dayObj, idx) => {
          const isSelected = isSameDay(dayObj.date, selectedDate);
          const isToday = isSameDay(dayObj.date, today);
          
          let cellContent = null;
          if (tabType === 'schedule') {
            const daySchedules = getSchedulesForDate(dayObj.date);
            cellContent = (
              <div className="event-chips-container">
                {daySchedules.map((s, i) => (
                  <div key={i} className="event-chip" style={{ backgroundColor: s.color || '#3b82f6' }}>
                    {s.title}
                  </div>
                ))}
              </div>
            );
          } else if (tabType === 'finance') {
            const dayFinances = finances.filter(f => isSameDay(f.date, dayObj.date));
            const dayTotal = dayFinances.reduce((sum, f) => sum + f.amount, 0);
            if (dayTotal !== 0) {
              cellContent = (
                <div className={`finance-daily-total ${dayTotal > 0 ? 'plus' : 'minus'}`}>
                  {dayTotal > 0 ? '+' : ''}{dayTotal.toLocaleString()}
                </div>
              );
            }
          }

          return (
            <div 
              key={idx} 
              className={`day-cell ${!dayObj.isCurrentMonth ? 'other-month' : ''} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
              onClick={() => {
                setSelectedDate(dayObj.date);
                setModalType(tabType === 'schedule' ? 'schedule' : 'expense');
                setIsModalOpen(true);
              }}
            >
              <div className="date-number">{dayObj.date.getDate()}</div>
              {cellContent}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="app-container">
      {/* ヘッダーエリア */}
      <header className="header">
        <h1 className="title">Life OS</h1>
        
        {/* タブ切り替えUI */}
        <div className="tabs">
          <button 
            className={`tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            予定
          </button>
          <button 
            className={`tab-btn ${activeTab === 'finance' ? 'active' : ''}`}
            onClick={() => setActiveTab('finance')}
          >
            収支
          </button>
        </div>
      </header>

      {/* コンテンツエリア */}
      <main className="content-area">
        
        {/* === 予定タブ === */}
        {activeTab === 'schedule' && (
          <div className="tab-content">
            
            {renderCalendar('schedule')}

            {/* 選択日のスケジュール */}
            <h2 className="selected-date-header">
              <span style={{ color: '#3b82f6' }}>•</span> {formatDateString(selectedDate)}
            </h2>
            
            <div className="schedule-list">
              {selectedDateSchedules.length > 0 ? (
                selectedDateSchedules.map(item => (
                  <div key={item.id} className="card">
                    <div className="color-dot" style={{ backgroundColor: item.color || '#3b82f6' }}></div>
                    <div className="time-column">
                      <span>{item.timeStart}</span>
                      <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>{item.timeEnd}</span>
                    </div>
                    <div className="card-content">
                      <div className="card-title">{item.title}</div>
                      {item.location && <div className="card-subtitle">📍 {item.location}</div>}
                    </div>
                    <button className="btn-delete" onClick={() => handleDeleteSchedule(item.id)}>
                      ×
                    </button>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <div style={{ fontSize: '2.5rem', margin: '0 auto 12px', opacity: 0.8 }}>☕️</div>
                  <p style={{ fontWeight: 'bold' }}>予定なし</p>
                  <p style={{ fontSize: '0.85rem', marginTop: '4px', opacity: 0.6 }}>カレンダーの日付をタップして追加</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* === 収支タブ === */}
        {activeTab === 'finance' && (
          <div className="tab-content">
            
            {renderCalendar('finance')}

            <h2 className="selected-date-header">
              <span style={{ color: '#10b981' }}>•</span> 今月の収支状況
            </h2>
            
            <div className="finance-summary">
              <div className="summary-box">
                <div className="summary-label">今日の支出</div>
                <div className="summary-amount" style={{ color: '#ef4444' }}>
                  {todayExpense === 0 ? '¥0' : `-¥${Math.abs(todayExpense).toLocaleString()}`}
                </div>
              </div>
              <div className="summary-box">
                <div className="summary-label">今月の支出合計</div>
                <div className="summary-amount">
                  {monthExpense === 0 ? '¥0' : `-¥${Math.abs(monthExpense).toLocaleString()}`}
                </div>
              </div>
            </div>

            <h3 style={{ fontSize: '1rem', marginBottom: '12px', color: '#94a3b8' }}>{selectedDate.getDate()}日の履歴</h3>
            <div className="finance-list">
              {selectedDateFinances.length > 0 ? (
                selectedDateFinances.map(item => (
                  <div key={item.id} className="card">
                    <div className="card-content">
                      <div className="card-title">{item.title}</div>
                      <div className="card-subtitle">{item.category} • {item.time}</div>
                    </div>
                    <div className={item.amount < 0 ? "expense-amount" : "income-amount"}>
                      {item.amount > 0 ? '+' : ''}{item.amount.toLocaleString()}円
                    </div>
                    <button className="btn-delete" onClick={() => handleDeleteFinance(item.id)}>
                      ×
                    </button>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <div style={{ fontSize: '2.5rem', margin: '0 auto 12px', opacity: 0.8 }}>👛</div>
                  <p style={{ fontWeight: 'bold' }}>履歴なし</p>
                  <p style={{ fontSize: '0.85rem', marginTop: '4px', opacity: 0.6 }}>カレンダーの日付をタップして追加</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ＋ボタン */}
      <button className="fab" aria-label="追加" onClick={() => setIsModalOpen(true)}>
        ＋
      </button>

      {/* 統合入力モーダル */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => { setIsModalOpen(false); resetForm(); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">新しく追加 ({selectedDate.getDate()}日)</h3>
              <button className="btn-close" onClick={() => { setIsModalOpen(false); resetForm(); }}>&times;</button>
            </div>
            
            <div className="modal-type-selector">
              <button 
                className={`type-btn ${modalType === 'schedule' ? 'active' : ''}`}
                onClick={() => setModalType('schedule')}
              >予定</button>
              <button 
                className={`type-btn ${modalType === 'expense' ? 'active' : ''}`}
                onClick={() => setModalType('expense')}
              >支出</button>
              <button 
                className={`type-btn ${modalType === 'income' ? 'active' : ''}`}
                onClick={() => setModalType('income')}
              >収入</button>
            </div>

            {/* 予定入力フォーム */}
            {modalType === 'schedule' && (
              <form onSubmit={handleScheduleSubmit}>
                <div className="input-group">
                  <label>タイトル</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="例: バイト、ゼミ" 
                    required 
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div className="input-group" style={{ flex: 1 }}>
                    <label>開始時間</label>
                    <input 
                      type="time" 
                      className="form-input"
                      value={formData.timeStart}
                      onChange={(e) => setFormData({...formData, timeStart: e.target.value})}
                    />
                  </div>
                  <div className="input-group" style={{ flex: 1 }}>
                    <label>終了時間</label>
                    <input 
                      type="time" 
                      className="form-input"
                      value={formData.timeEnd}
                      onChange={(e) => setFormData({...formData, timeEnd: e.target.value})}
                    />
                  </div>
                </div>
                <div className="input-group">
                  <label>色</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'].map(color => (
                      <div 
                        key={color}
                        onClick={() => setFormData({...formData, color})}
                        style={{
                          width: '32px', height: '32px', borderRadius: '50%', backgroundColor: color,
                          cursor: 'pointer', border: formData.color === color ? '2px solid white' : '2px solid transparent',
                          boxShadow: formData.color === color ? '0 0 0 2px var(--primary-color)' : 'none'
                        }}
                      />
                    ))}
                  </div>
                </div>
                <button type="submit" className="btn-primary">予定を追加</button>
              </form>
            )}

            {/* 支出・収入入力フォーム */}
            {(modalType === 'expense' || modalType === 'income') && (
              <form onSubmit={handleFinanceSubmit}>
                <div className="input-group">
                  <label>金額 (円)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder="0" 
                    required 
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  />
                </div>
                <div className="input-group">
                  <label>カテゴリ（任意）</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="例: 食費、給料 (空欄でOK)" 
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                  />
                </div>
                <button type="submit" className="btn-primary" style={{ backgroundColor: modalType === 'expense' ? '#ef4444' : '#10b981' }}>
                  {modalType === 'expense' ? '支出を記録' : '収入を記録'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
