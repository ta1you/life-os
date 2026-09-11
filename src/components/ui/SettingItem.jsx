
export const SettingItem = ({
  icon,
  title,
  subtitle,
  onClick,
  className = '',
  ...props
}) => {
  return (
    <button
      onClick={onClick}
      className={`settings-item ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'transparent',
        borderLeft: 'none',
        borderRight: 'none',
        borderTop: 'none',
        width: '100%',
        cursor: 'pointer',
        fontFamily: 'inherit',
        color: '#f8fafc',
        boxSizing: 'border-box'
      }}
      {...props}
    >
      <div className="settings-item-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {icon && <span className="settings-item-icon" style={{ fontSize: '1.2rem', width: '24px', display: 'flex', justifyContent: 'center' }}>{icon}</span>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{title}</div>
          {subtitle && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{subtitle}</div>}
        </div>
      </div>
      <span className="settings-item-chevron" style={{ color: '#94a3b8', fontSize: '0.9rem' }}>&gt;</span>
    </button>
  );
};
export default SettingItem;
