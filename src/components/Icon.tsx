interface IconProps {
    url: string;
    className?: string;
}

const Icon = ({ url, className }: IconProps) => {
  return (
    <img className={`w-10 ${className}`}  src={url}/>
  )
}

export default Icon