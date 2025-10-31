import { Link } from 'react-router';

export const CustomLink = ({ to, text }: { to: string, text:string }) => {
  return <Link to={to} className="bg-gray-300 text-black p-2 rounded-lg">{text}</Link>;
};