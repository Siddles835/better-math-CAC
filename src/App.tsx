import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GameProvider } from "./context/GameContext";
import RocketTransition from "./components/RocketTransition";
import HomePage from "./pages/HomePage";
import SolarSystemPage from "./pages/SolarSystemPage";
// Counting planets
import CountingSun from "./pages/lessons/counting/CountingSun";
import CountingMercury from "./pages/lessons/counting/CountingMercury";
import CountingVenus from "./pages/lessons/counting/CountingVenus";
// Addition planets
import AdditionEarth from "./pages/lessons/addition/AdditionEarth";
import AdditionMars from "./pages/lessons/addition/AdditionMars";
import AdditionJupiter from "./pages/lessons/addition/AdditionJupiter";
// Subtraction planets
import SubtractionSaturn from "./pages/lessons/subtraction/SubtractionSaturn";
import SubtractionUranus from "./pages/lessons/subtraction/SubtractionUranus";
import SubtractionNeptune from "./pages/lessons/subtraction/SubtractionNeptune";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <GameProvider>
        <Toaster />
        <Sonner />
        <RocketTransition />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/solar-system" element={<SolarSystemPage />} />
            {/* Counting */}
            <Route path="/lesson/counting/sun" element={<CountingSun />} />
            <Route path="/lesson/counting/mercury" element={<CountingMercury />} />
            <Route path="/lesson/counting/venus" element={<CountingVenus />} />
            {/* Addition */}
            <Route path="/lesson/addition/earth" element={<AdditionEarth />} />
            <Route path="/lesson/addition/mars" element={<AdditionMars />} />
            <Route path="/lesson/addition/jupiter" element={<AdditionJupiter />} />
            {/* Subtraction */}
            <Route path="/lesson/subtraction/saturn" element={<SubtractionSaturn />} />
            <Route path="/lesson/subtraction/uranus" element={<SubtractionUranus />} />
            <Route path="/lesson/subtraction/neptune" element={<SubtractionNeptune />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </GameProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
