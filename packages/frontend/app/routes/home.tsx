import { Link } from 'react-router';
import type { Route } from './+types/home';
import { CustomLink } from '~/components/buttons';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Cool Site' },
    { name: 'description', content: 'where is this even displayed lol' },
  ];
}

export default function Home() {
  return (
    <div className="p-20 max-w-1/2 mx-auto text-center">
      <h1 className="text-5xl mx-auto my-5 text-center">
        Welcome to My Cool Site
      </h1>
      <h2 className="text-lg text-gray-400 mx-auto my-5 mb-20 text-center">
        The place where all the cool shit happens
      </h2>
			<CustomLink to="/login" text="Log in"/>
      <p className="mx-auto my-5 ">or</p>
      <CustomLink to="/register" text="Create an account"/>
    </div>
  );
}
