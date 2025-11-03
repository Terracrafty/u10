import { Link } from 'react-router';

const buttonStyles = "bg-gray-300 text-black p-2 rounded-lg"

export const CustomLink = ({ to, text }: { to: string, text:string }) => {
  return <Link to={to} className={buttonStyles}>{text}</Link>;
};

export const CustomButton = ({ type, text }: {type: "button"|"reset"|"submit", text:string}) => {
  return <button type={type} className={buttonStyles}>{text}</button>
}