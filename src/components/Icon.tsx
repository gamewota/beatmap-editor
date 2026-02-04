interface IconProps {
    url: string;
    className?: string;
    onClick?: () => void;
}

const Icon = ({ url, className, onClick }: IconProps) => {
  return (
    <img className={`w-10 ${className}`}  src={url} onClick={onClick}/>
  )
}

export default Icon