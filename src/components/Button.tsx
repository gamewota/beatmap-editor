interface ButtonProps {
  variant?: string;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

const Button = ({ variant, children, onClick, disabled = false }: ButtonProps) => {
  return (
    <button
      className={`btn ${variant} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

export default Button