import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { GameProvider } from "./context/GameContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import RequireStudentSession from "./components/RequireStudentSession";
import NativeShellBridge from "./components/NativeShellBridge";
import RocketTransition from "./components/RocketTransition";
import HomePage from "./pages/HomePage";
import StudentLoginPage from "./pages/StudentLoginPage";
import StudentRegisterPage from "./pages/StudentRegisterPage";
import TeacherLoginPage from "./pages/TeacherLoginPage";
import TeacherRegisterPage from "./pages/TeacherRegisterPage";
import TeacherDashboard from "./pages/TeacherDashboard";
import StudentHubPage from "./pages/StudentHubPage";
import CountingSun from "./pages/lessons/counting/CountingSun";
import CountingMercury from "./pages/lessons/counting/CountingMercury";
import CountingVenus from "./pages/lessons/counting/CountingVenus";
import AdditionEarth from "./pages/lessons/addition/AdditionEarth";
import AdditionMars from "./pages/lessons/addition/AdditionMars";
import AdditionJupiter from "./pages/lessons/addition/AdditionJupiter";
import SubtractionSaturn from "./pages/lessons/subtraction/SubtractionSaturn";
import SubtractionUranus from "./pages/lessons/subtraction/SubtractionUranus";
import SubtractionNeptune from "./pages/lessons/subtraction/SubtractionNeptune";
import NotFound from "./pages/NotFound";
import CookiePolicyPage from "./pages/CookiePolicyPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import SupportPage from "./pages/SupportPage";
import SettingsPage from "./pages/SettingsPage";
import HowItWorksPage from "./pages/HowItWorksPage";
import MethodsPage from "./pages/MethodsPage";
import ClassroomWalkthroughPage from "./pages/ClassroomWalkthroughPage";

const queryClient = new QueryClient();

const lesson = (element: ReactNode) => (
  <RequireStudentSession>{element}</RequireStudentSession>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <GameProvider>
          <Toaster />
          <Sonner />
          <RocketTransition />
          <BrowserRouter>
            <NativeShellBridge />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/cookie-policy" element={<CookiePolicyPage />} />
              <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
              <Route path="/support" element={<SupportPage />} />
              <Route path="/how-it-works" element={<HowItWorksPage />} />
              <Route path="/methods" element={<MethodsPage />} />
              <Route path="/classroom" element={<ClassroomWalkthroughPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/planets" element={<StudentHubPage />} />
              <Route path="/solar-system" element={<Navigate to="/planets" replace />} />
              <Route path="/planet-select" element={<Navigate to="/planets" replace />} />
              <Route path="/student-register" element={<StudentRegisterPage />} />
              <Route path="/student-login" element={<StudentLoginPage />} />
              <Route path="/teacher-register" element={<TeacherRegisterPage />} />
              <Route path="/teacher-login" element={<TeacherLoginPage />} />
              <Route path="/teacher/*" element={<TeacherDashboard />} />
              <Route path="/lesson/counting/sun" element={lesson(<CountingSun />)} />
              <Route path="/lesson/counting/mercury" element={lesson(<CountingMercury />)} />
              <Route path="/lesson/counting/venus" element={lesson(<CountingVenus />)} />
              <Route path="/lesson/addition/earth" element={lesson(<AdditionEarth />)} />
              <Route path="/lesson/addition/mars" element={lesson(<AdditionMars />)} />
              <Route path="/lesson/addition/jupiter" element={lesson(<AdditionJupiter />)} />
              <Route path="/lesson/subtraction/saturn" element={lesson(<SubtractionSaturn />)} />
              <Route path="/lesson/subtraction/uranus" element={lesson(<SubtractionUranus />)} />
              <Route path="/lesson/subtraction/neptune" element={lesson(<SubtractionNeptune />)} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </GameProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
