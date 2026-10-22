
import BasicExample from "./components/CardCaroursalDemo"
import Hero from "./components/Hero"
import ArchitectureSection from "./features/architecture/ArchitectureSection"
import { MinimalCardDemo } from "./components/MinimalCard"
import Navbar from "./components/Navbar"

function App() {

  return (
    <>
      <Navbar />
      <Hero />
      <ArchitectureSection />
      <BasicExample />
      <MinimalCardDemo />
    </>
  )
}

export default App
