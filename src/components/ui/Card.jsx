import React from 'react';

export const Card = ({
  children,
  hoverable = false,
  className = '',
  ...props
}) => {
  const hoverClass = hoverable ? 'hover:bg-[#262a33] hover:border-white/10' : '';
  return (
    <div
      className={`bg-[#1a1d24] border border-white/5 rounded-3xl p-6 shadow-xl transition-all ${hoverClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
export default Card;
