interface TitleProps {
    text: string;
}


const Title = ({text}: TitleProps) => {
  return (
    <h1 className="text-4xl font-bold text-center my-4">{text}</h1>
  )
}

export default Title