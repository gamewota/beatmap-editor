interface ButtonProps {
    variant?: string;
    children: React.ReactNode;
}

const Button = ({ variant, children}: ButtonProps) => {
  return (
    <button className={`btn ${variant}`}>{children}</button>
  )
}

export default Button