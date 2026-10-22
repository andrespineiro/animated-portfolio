// src/components/Navbar.jsx

import FlipperText from "./animate-ui/flipper-text";

const Navbar = () => {
  return (
    <nav className="bg-primary p-4 sticky top-0 z-10 text-2xl" >
      <div className="container mx-auto flex justify-between items-center">
        <a href="#" className="text-secondary ">Andrés Piñeiro</a>
        <div className="hidden md:flex space-x-6">
          <a href="#projects" className="text-gray-300 hover:text-white">Projects</a>
          <a href="#cv" className="text-gray-300 hover:text-white">CV</a>
          <FlipperText text="LinkedIn" icon="linkedin" url="https://www.linkedin.com/in/andrespineirolage/" color="[#0A66C2]" />
          <FlipperText text="GitHub" icon="github" url="https://www.github.com/andrespi97" />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;