interface ButtonProps {
    variant?: string;
    children: React.ReactNode;
    onClick?: () => void;
}

const Button = ({ variant, children, onClick}: ButtonProps) => {
  return (
    <button className={`btn ${variant}`} onClick={onClick}>{children}</button>
  )
}

export default Button