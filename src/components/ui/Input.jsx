
export const Input = ({
  label,
  accent = 'primary',
  className = '',
  id,
  ...props
}) => {
  const accentBorder = accent === 'primary' ? 'focus:border-[#4b88ff]' : 'focus:border-[#ef8f3b]';
  return (
    <div style={{ width: '100%' }}>
      {label && (
        <label htmlFor={id} style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full px-4 py-2.5 bg-[#0f1115] border border-white/5 rounded-xl text-xs text-[#f8fafc] focus:outline-none transition-all ${accentBorder} ${className}`}
        style={{ width: '100%', boxSizing: 'border-box' }}
        {...props}
      />
    </div>
  );
};
export default Input;
