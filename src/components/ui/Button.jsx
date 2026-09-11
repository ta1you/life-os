
export const Button = ({
  variant = 'primary', // 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'header' | 'add'
  size = 'md', // 'sm' | 'md' | 'lg'
  children,
  className = '',
  ...props
}) => {
  // Base classes that look modern and premium
  let baseClass = 'inline-flex items-center justify-center font-bold rounded-xl transition-all cursor-pointer border-none';
  
  let variantClass = '';
  if (variant === 'primary') {
    variantClass = 'bg-[#4b88ff] hover:bg-[#3b78ef] text-white shadow-lg shadow-[#4b88ff]/15';
  } else if (variant === 'secondary') {
    variantClass = 'bg-[#ef8f3b] hover:bg-[#df7f2b] text-white shadow-lg shadow-[#ef8f3b]/15';
  } else if (variant === 'danger') {
    variantClass = 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20';
  } else if (variant === 'ghost') {
    variantClass = 'bg-transparent hover:bg-white/5 text-[#94a3b8] hover:text-[#f8fafc]';
  } else if (variant === 'outline') {
    variantClass = 'bg-transparent border border-white/10 hover:bg-white/5 text-[#f8fafc]';
  } else if (variant === 'header') {
    variantClass = 'bg-[#1a1d24] text-[#94a3b8] border border-white/5 rounded-full hover:text-[#f8fafc]';
  } else if (variant === 'add') {
    variantClass = 'bg-white/3 border border-[#4b88ff] border-dashed text-[#4b88ff] hover:bg-white/5';
  }

  let sizeClass = '';
  if (size === 'sm') {
    sizeClass = 'px-3 py-1.5 text-xs';
  } else if (size === 'md') {
    sizeClass = 'px-4 py-2.5 text-xs';
  } else if (size === 'lg') {
    sizeClass = 'px-6 py-3.5 text-sm';
  }

  return (
    <button
      className={`${baseClass} ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
export default Button;
